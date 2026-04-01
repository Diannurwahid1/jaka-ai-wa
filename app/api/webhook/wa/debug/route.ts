import { NextResponse } from "next/server";

import { getWebhookEvents } from "@/lib/webhook-debug";

export async function GET() {
  const events = await getWebhookEvents(30);
  return NextResponse.json({ ok: true, events });
}
