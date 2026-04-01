import { NextRequest, NextResponse } from "next/server";

import { askAI } from "@/lib/ai";
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
    const aiReply = await askAI(message, {
      phone: from,
      remember: true
    });

    await sendWA(from, aiReply);

    await updateMessage(log.id, {
      reply: aiReply,
      status: "success"
    });

    await appendWebhookEvent({
      stage: "processed",
      from,
      message,
      reason: `Message logged with id ${log.id}`
    });

    return NextResponse.json({ ok: true, reply: aiReply });
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
