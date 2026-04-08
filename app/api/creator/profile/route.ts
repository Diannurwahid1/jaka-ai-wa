import { NextRequest, NextResponse } from "next/server";

import { getCreatorProfile, updateCreatorProfile } from "@/lib/creator";

export async function GET(request: NextRequest) {
  try {
    const profile = await getCreatorProfile(request.nextUrl.searchParams.get("platform") ?? undefined);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = await updateCreatorProfile(String(body?.platform ?? ""), body);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
