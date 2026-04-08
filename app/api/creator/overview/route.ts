import { NextRequest, NextResponse } from "next/server";

import { getCreatorOverview } from "@/lib/creator";

export async function GET(request: NextRequest) {
  try {
    const overview = await getCreatorOverview(request.nextUrl.searchParams.get("platform") ?? undefined);
    return NextResponse.json({ ok: true, overview });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
