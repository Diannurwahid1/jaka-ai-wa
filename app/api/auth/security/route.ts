import { NextResponse } from "next/server";

import { getAdminSecurityState, getCurrentSession } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }

  const security = await getAdminSecurityState();

  return NextResponse.json({
    ok: true,
    security
  });
}
