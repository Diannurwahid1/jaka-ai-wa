import { NextResponse } from "next/server";

import { testLinkedInConnection } from "@/lib/social";

export async function POST() {
  try {
    const result = await testLinkedInConnection();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
