import { NextRequest, NextResponse } from "next/server";

import { askAI } from "@/lib/ai";
import { findBusinessByWaSessionId, getDefaultBusiness } from "@/lib/business";
import { handleCreatorApprovalCommandForBusiness } from "@/lib/creator";
import { matchesHeaderSecret, verifySignedPayload } from "@/lib/security";
import { readSettings } from "@/lib/settings";
import { appendWebhookEvent } from "@/lib/webhook-debug";
import { createMessage, updateMessage } from "@/lib/store";
import { detectIntent } from "@/lib/utils";
import { extractWebhookPayload, formatInboundForwardMessage, getInboundForwardTarget, sendWA } from "@/lib/wa";
import { prisma } from "@/lib/prisma";

function pickHeaders(request: NextRequest) {
  const interesting = [
    "content-type",
    "user-agent",
    "x-forwarded-for",
    "x-real-ip",
    "x-signature",
    "x-hub-signature",
    "x-hub-signature-256"
  ];

  return Object.fromEntries(
    interesting
      .map((key) => [key, request.headers.get(key) ?? ""])
      .filter(([, value]) => value)
  );
}

function extractWaSessionFromPayload(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "";
  }

  const root = body as Record<string, unknown>;
  // Try common shapes: { sessionId }, { session_id }, { session: { id } }, { metadata: { session_id } }
  const candidates: unknown[] = [
    root.sessionId,
    root.session_id,
    root.session,
    (root.metadata as Record<string, unknown> | undefined)?.session_id,
    (root.metadata as Record<string, unknown> | undefined)?.sessionId,
    (root.data as Record<string, unknown> | undefined)?.sessionId,
    (root.data as Record<string, unknown> | undefined)?.session_id
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (candidate && typeof candidate === "object") {
      const nestedId = (candidate as Record<string, unknown>).id;
      if (typeof nestedId === "string" && nestedId.trim()) {
        return nestedId.trim();
      }
    }
  }

  return "";
}

async function resolveWebhookBusinessId(rawBody: string, waSessionFromQuery: string) {
  const trimmedQuerySession = waSessionFromQuery.trim();

  if (trimmedQuerySession) {
    const business = await findBusinessByWaSessionId(trimmedQuerySession);
    if (business) {
      return business;
    }
  }

  if (!rawBody) {
    return null;
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }

  const sessionFromBody = extractWaSessionFromPayload(body);
  if (sessionFromBody) {
    const business = await findBusinessByWaSessionId(sessionFromBody);
    if (business) {
      return business;
    }
  }

  return null;
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "WA webhook route is ready" });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headers = pickHeaders(request);
  const waSessionFromQuery = request.nextUrl.searchParams.get("sessionId") ?? "";

  // Resolve which business this webhook hit belongs to.
  // Strategy: match the incoming waSessionId to a business AppConfig.
  // Falls back to the default business when nothing matches (single-tenant compatibility).
  let business = await resolveWebhookBusinessId(rawBody, waSessionFromQuery);

  if (!business) {
    business = await getDefaultBusiness();
  }

  if (!business) {
    // No business at all (fresh install, default seed missing). Reject.
    return NextResponse.json({ ok: false, reason: "Tidak ada business yang terdaftar untuk webhook" }, { status: 503 });
  }

  const businessId = business.id;
  const settings = await readSettings(businessId);
  const webhookSecret = settings.waMasterKey.trim();

  if (!webhookSecret) {
    await appendWebhookEvent(businessId, {
      stage: "rejected",
      reason: "WA webhook secret belum dikonfigurasi",
      rawBody: rawBody.slice(0, 4000),
      headers
    });

    return NextResponse.json({ ok: false, reason: "WA webhook secret belum dikonfigurasi" }, { status: 503 });
  }

  const signatureHeaders = [
    request.headers.get("x-signature"),
    request.headers.get("x-hub-signature"),
    request.headers.get("x-hub-signature-256"),
    request.headers.get("x-webhook-secret"),
    request.headers.get("x-wa-master-key"),
    request.headers.get("authorization")
  ];

  const signatureValid =
    matchesHeaderSecret(webhookSecret, signatureHeaders) ||
    verifySignedPayload(webhookSecret, rawBody, signatureHeaders);

  if (!signatureValid) {
    await appendWebhookEvent(businessId, {
      stage: "rejected",
      reason: "Invalid webhook signature",
      rawBody: rawBody.slice(0, 4000),
      headers
    });

    return NextResponse.json({ ok: false, reason: "Invalid webhook signature" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Invalid JSON";

    await appendWebhookEvent(businessId, {
      stage: "invalid_json",
      reason,
      rawBody: rawBody.slice(0, 4000),
      headers
    });

    return NextResponse.json({ ok: false, reason }, { status: 400 });
  }

  const { from, message, receivedAt, isInbound } = extractWebhookPayload(body);

  await appendWebhookEvent(businessId, {
    stage: "received",
    from,
    message,
    payload: body,
    headers
  });

  if (!isInbound) {
    await appendWebhookEvent(businessId, {
      stage: "ignored",
      from,
      message,
      reason: "Non-inbound WhatsApp event skipped",
      payload: body,
      headers
    });

    return NextResponse.json({ ok: true, ignored: true, reason: "Non-inbound event" });
  }

  if (!from || !message) {
    await appendWebhookEvent(businessId, {
      stage: "ignored",
      from,
      message,
      reason: "Missing from or message after payload extraction",
      payload: body,
      headers
    });

    return NextResponse.json({ ok: true, ignored: true, reason: "Invalid payload shape" });
  }

  const log = await createMessage(businessId, {
    from,
    message,
    reply: "",
    source: "webhook",
    status: "pending",
    intent: detectIntent(message)
  });

  const inboundForwardTarget = getInboundForwardTarget();

  if (inboundForwardTarget) {
    try {
      const forwardMessage = formatInboundForwardMessage({
        from,
        message,
        receivedAt
      });
      const forwardResult = await sendWA(businessId, inboundForwardTarget, forwardMessage);

      await appendWebhookEvent(businessId, {
        stage: "forwarded_copy",
        from,
        message,
        reason: `Forwarded inbound message to ${inboundForwardTarget}. HTTP ${forwardResult.httpStatus}.`
      });
    } catch (error) {
      const forwardReason = error instanceof Error ? error.message : "Unknown forward error";

      await appendWebhookEvent(businessId, {
        stage: "forward_failed",
        from,
        message,
        reason: `Failed forwarding inbound message to ${inboundForwardTarget}: ${forwardReason}`
      });
    }
  }

  // Silence the unused prisma import warning while keeping the lazy reference around for future audit logs.
  void prisma;

  try {
    const creatorCommand = await handleCreatorApprovalCommandForBusiness(businessId, from, message);

    if (creatorCommand.matched) {
      const sendResult = await sendWA(businessId, from, creatorCommand.reply);

      await updateMessage(businessId, log.id, {
        reply: creatorCommand.reply,
        status: "success"
      });

      await appendWebhookEvent(businessId, {
        stage: "creator_command",
        from,
        message,
        reason: creatorCommand.reply
      });

      return NextResponse.json({ ok: true, reply: creatorCommand.reply, sendResult });
    }

    if (!settings.aiAutoReplyEnabled) {
      await updateMessage(businessId, log.id, {
        status: "success"
      });

      await appendWebhookEvent(businessId, {
        stage: "ignored",
        from,
        message,
        reason: "AI auto reply disabled. No reply sent."
      });

      return NextResponse.json({ ok: true, aiDisabled: true, replySent: false });
    }

    const aiReply = await askAI(businessId, message, {
      phone: from,
      remember: true
    });

    const sendResult = await sendWA(businessId, from, aiReply);

    await updateMessage(businessId, log.id, {
      reply: aiReply,
      status: "success"
    });

    await appendWebhookEvent(businessId, {
      stage: "processed",
      from,
      message,
      reason: `Sent to WA. HTTP ${sendResult.httpStatus}. Payload: ${JSON.stringify(sendResult.sentPayload)}. Response: ${JSON.stringify(sendResult.apiResponse)}`
    });

    return NextResponse.json({ ok: true, reply: aiReply, sendResult });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";

    await updateMessage(businessId, log.id, {
      status: "failed",
      error: reason
    });

    await appendWebhookEvent(businessId, {
      stage: "failed",
      from,
      message,
      reason
    });

    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
