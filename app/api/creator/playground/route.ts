import { NextRequest, NextResponse } from "next/server";

import { runCreatorPlayground } from "@/lib/creator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await runCreatorPlayground(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
