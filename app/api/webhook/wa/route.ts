import { NextRequest, NextResponse } from "next/server";

import { askAI } from "@/lib/ai";
import { handleCreatorApprovalCommand } from "@/lib/creator";
import { matchesHeaderSecret, verifySignedPayload } from "@/lib/security";
import { readSettings } from "@/lib/settings";
import { appendWebhookEvent } from "@/lib/webhook-debug";
import { createMessage, updateMessage } from "@/lib/store";
import { detectIntent } from "@/lib/utils";
import { extractWebhookPayload, sendWA } from "@/lib/wa";

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

export async function GET() {
  return NextResponse.json({ ok: true, message: "WA webhook route is ready" });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headers = pickHeaders(request);
  const settings = await readSettings();
  const webhookSecret = settings.waMasterKey.trim();

  if (!webhookSecret) {
    await appendWebhookEvent({
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
    await appendWebhookEvent({
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

    await appendWebhookEvent({
      stage: "invalid_json",
      reason,
      rawBody: rawBody.slice(0, 4000),
      headers
    });

    return NextResponse.json({ ok: false, reason }, { status: 400 });
  }

  const { from, message } = extractWebhookPayload(body);

  await appendWebhookEvent({
    stage: "received",
    from,
    message,
    payload: body,
    headers
  });

  if (!from || !message) {
    await appendWebhookEvent({
      stage: "ignored",
      from,
      message,
      reason: "Missing from or message after payload extraction",
      payload: body,
      headers
    });

    return NextResponse.json({ ok: true, ignored: true, reason: "Invalid payload shape" });
  }

  const log = await createMessage({
    from,
    message,
    reply: "",
    source: "webhook",
    status: "pending",
    intent: detectIntent(message)
  });

  try {
    const creatorCommand = await handleCreatorApprovalCommand(from, message);

    if (creatorCommand.matched) {
      const sendResult = await sendWA(from, creatorCommand.reply);

      await updateMessage(log.id, {
        reply: creatorCommand.reply,
        status: "success"
      });

      await appendWebhookEvent({
        stage: "creator_command",
        from,
        message,
        reason: creatorCommand.reply
      });

      return NextResponse.json({ ok: true, reply: creatorCommand.reply, sendResult });
    }

    if (!settings.aiAutoReplyEnabled) {
      const disabledReply = "Auto-reply AI sedang dimatikan. Pesan Anda diterima dan akan ditangani admin.";
      const sendResult = await sendWA(from, disabledReply);

      await updateMessage(log.id, {
        reply: disabledReply,
        status: "success"
      });

      await appendWebhookEvent({
        stage: "ignored",
        from,
        message,
        reason: "AI auto reply disabled. Sent static admin handoff reply."
      });

      return NextResponse.json({ ok: true, reply: disabledReply, sendResult, aiDisabled: true });
    }

    const aiReply = await askAI(message, {
      phone: from,
      remember: true
    });

    const sendResult = await sendWA(from, aiReply);

    await updateMessage(log.id, {
      reply: aiReply,
      status: "success"
    });

    await appendWebhookEvent({
      stage: "processed",
      from,
      message,
      reason: `Sent to WA. HTTP ${sendResult.httpStatus}. Payload: ${JSON.stringify(sendResult.sentPayload)}. Response: ${JSON.stringify(sendResult.apiResponse)}`
    });

    return NextResponse.json({ ok: true, reply: aiReply, sendResult });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";

    await updateMessage(log.id, {
      status: "failed",
      error: reason
    });

    await appendWebhookEvent({
      stage: "failed",
      from,
      message,
      reason
    });

    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
