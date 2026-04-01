import { NextRequest, NextResponse } from "next/server";

import { changeAdminPassword, getCurrentSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const currentPassword = String(body?.currentPassword ?? "");
    const nextPassword = String(body?.nextPassword ?? "");

    if (!currentPassword || !nextPassword) {
      return NextResponse.json(
        { ok: false, reason: "currentPassword dan nextPassword wajib diisi" },
        { status: 400 }
      );
    }

    const result = await changeAdminPassword(session.sub, session.email, currentPassword, nextPassword);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
