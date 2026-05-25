import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { getCreatorProfile, updateCreatorProfile, withCreatorBusiness } from "@/lib/creator";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const profile = await withCreatorBusiness(session.businessId, () =>
      getCreatorProfile(request.nextUrl.searchParams.get("platform") ?? undefined)
    );
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const profile = await withCreatorBusiness(session.businessId, () =>
      updateCreatorProfile(String(body?.platform ?? ""), body)
    );
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
