import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { processDueCreatorDraftsForBusiness } from "@/lib/creator";

export async function POST() {
  try {
    const session = await requireSession();
    const result = await processDueCreatorDraftsForBusiness(session.businessId, { force: true });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
