import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { getWebhookEvents } from "@/lib/webhook-debug";

export async function GET() {
  const session = await requireSession();
  const events = await getWebhookEvents(session.businessId, 30);
  return NextResponse.json({ ok: true, events });
}
