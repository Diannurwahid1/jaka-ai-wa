import { NextResponse } from "next/server";

import { testR2Connection } from "@/lib/r2";

export async function POST() {
  try {
    const result = await testR2Connection();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : error && typeof error === "object"
          ? JSON.stringify(error)
          : String(error || "Unknown error");
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
