import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { testLinkedInConnection } from "@/lib/social";

export async function POST() {
  try {
    const session = await requireSession();
    const result = await testLinkedInConnection(session.businessId);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
