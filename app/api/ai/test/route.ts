import { NextRequest, NextResponse } from "next/server";

import { askAI } from "@/lib/ai";
import { createMessage, updateMessage } from "@/lib/store";
import { detectIntent } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = String(body?.message ?? "").trim();
    const from = String(body?.from ?? "manual-chat").trim();

    if (!message) {
      return NextResponse.json({ ok: false, reason: "Message is required" }, { status: 400 });
    }

    const log = await createMessage({
      from,
      message,
      reply: "",
      source: "manual",
      status: "pending",
      intent: detectIntent(message)
    });

    try {
      const reply = await askAI(message, {
        phone: from,
        remember: true
      });

      await updateMessage(log.id, {
        reply,
        status: "success"
      });

      return NextResponse.json({ ok: true, reply, id: log.id });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";

      await updateMessage(log.id, {
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
