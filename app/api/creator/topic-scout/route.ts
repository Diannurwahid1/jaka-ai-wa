import { NextRequest, NextResponse } from "next/server";

import { runCreatorTopicScout } from "@/lib/creator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await runCreatorTopicScout(body);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    const status = reason.includes("dinonaktifkan") ? 503 : 500;
    return NextResponse.json({ ok: false, reason }, { status });
  }
}
