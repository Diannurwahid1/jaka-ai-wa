import { NextRequest, NextResponse } from "next/server";

import { generateCreatorDrafts } from "@/lib/creator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const drafts = await generateCreatorDrafts(body);
    return NextResponse.json({ ok: true, drafts });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
