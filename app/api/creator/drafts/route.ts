import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { listCreatorDrafts, withCreatorBusiness } from "@/lib/creator";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const drafts = await withCreatorBusiness(session.businessId, () =>
      listCreatorDrafts(request.nextUrl.searchParams.get("platform") ?? undefined, 24)
    );
    return NextResponse.json({ ok: true, drafts });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
