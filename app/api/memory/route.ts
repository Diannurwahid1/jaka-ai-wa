import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { clearHistory, isSessionExpired, listMemorySessions } from "@/lib/memory";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const baseSessions = await listMemorySessions(session.businessId, Number.isFinite(limitParam) ? limitParam : 50);
  const sessions = await Promise.all(
    baseSessions.map(async (memorySession) => ({
      ...memorySession,
      expired: await isSessionExpired(session.businessId, memorySession.phone)
    }))
  );

  return NextResponse.json({ ok: true, sessions });
}

export async function DELETE(request: NextRequest) {
  const session = await requireSession();
  const phone = request.nextUrl.searchParams.get("phone")?.trim() ?? "";

  if (!phone) {
    return NextResponse.json({ ok: false, reason: "phone is required" }, { status: 400 });
  }

  await clearHistory(session.businessId, phone);
  return NextResponse.json({ ok: true, cleared: true, phone });
}
