import { NextResponse } from "next/server";

import { processDueCreatorDrafts } from "@/lib/creator";

export async function POST() {
  try {
    const result = await processDueCreatorDrafts({ force: true });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
