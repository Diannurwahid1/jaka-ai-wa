import { NextRequest, NextResponse } from "next/server";

import { askAIWithUsage } from "@/lib/ai";
import { requireSession } from "@/lib/auth";
import { createMessage, updateMessage } from "@/lib/store";
import { detectIntent } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const message = String(body?.message ?? "").trim();
    const from = String(body?.from ?? "manual-chat").trim();

    if (!message) {
      return NextResponse.json({ ok: false, reason: "Message is required" }, { status: 400 });
    }

    const log = await createMessage(session.businessId, {
      from,
      message,
      reply: "",
      source: "manual",
      status: "pending",
      intent: detectIntent(message)
    });

    try {
      const result = await askAIWithUsage(session.businessId, message, {
        phone: from,
        remember: true
      });

      await updateMessage(session.businessId, log.id, {
        reply: result.reply,
        status: "success"
      });

      return NextResponse.json({
        ok: true,
        reply: result.reply,
        id: log.id,
        usage: result.usage,
        model: result.model,
        durationMs: result.durationMs
      });
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
