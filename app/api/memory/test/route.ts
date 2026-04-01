import { NextRequest, NextResponse } from "next/server";

import {
  clearHistory,
  getHistory,
  getMemorySnapshot,
  resetIfExpired,
  saveMessage,
  trimHistory
} from "@/lib/memory";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = String(body?.phone ?? "").trim();
    const message = String(body?.message ?? "").trim();
    const clear = Boolean(body?.clear);

    if (!phone) {
      return NextResponse.json({ ok: false, reason: "phone is required" }, { status: 400 });
    }

    if (clear) {
      await clearHistory(phone);
      return NextResponse.json({ ok: true, cleared: true, snapshot: await getMemorySnapshot(phone) });
    }

    if (!message) {
      return NextResponse.json({ ok: false, reason: "message is required" }, { status: 400 });
    }

    const expired = await resetIfExpired(phone);
    const historyBefore = await getHistory(phone);

    await saveMessage(phone, "user", message);
    const historyAfterSave = await trimHistory(phone, 20);
    const snapshot = await getMemorySnapshot(phone);

    return NextResponse.json({
      ok: true,
      expired,
      historyBefore,
      history: historyAfterSave,
      snapshot
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
