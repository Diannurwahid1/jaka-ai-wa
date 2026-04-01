import { NextRequest, NextResponse } from "next/server";

import { clearHistory, isSessionExpired, listMemorySessions } from "@/lib/memory";

export async function GET(request: NextRequest) {
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const baseSessions = await listMemorySessions(Number.isFinite(limitParam) ? limitParam : 50);
  const sessions = await Promise.all(
    baseSessions.map(async (session) => ({
      ...session,
      expired: await isSessionExpired(session.phone)
    }))
  );

  return NextResponse.json({ ok: true, sessions });
}

export async function DELETE(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone")?.trim() ?? "";

  if (!phone) {
    return NextResponse.json({ ok: false, reason: "phone is required" }, { status: 400 });
  }

  await clearHistory(phone);
  return NextResponse.json({ ok: true, cleared: true, phone });
}
