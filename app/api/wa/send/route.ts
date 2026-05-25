import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { createMessage, updateMessage } from "@/lib/store";
import { detectIntent } from "@/lib/utils";
import { sendWA } from "@/lib/wa";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const to = String(body?.to ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!to || !message) {
      return NextResponse.json({ ok: false, reason: "to and message are required" }, { status: 400 });
    }

    const log = await createMessage(session.businessId, {
      from: to,
      message,
      reply: message,
      source: "broadcast",
      status: "pending",
      intent: detectIntent(message)
    });

    try {
      const result = await sendWA(session.businessId, to, message);

      await updateMessage(session.businessId, log.id, {
        status: "success"
      });

      return NextResponse.json({ ok: true, result });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      await updateMessage(session.businessId, log.id, {
        status: "failed",
        error: reason
      });

      return NextResponse.json({ ok: false, reason }, { status: 500 });
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
