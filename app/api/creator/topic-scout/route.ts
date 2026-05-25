import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { runCreatorTopicScout, withCreatorBusiness } from "@/lib/creator";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const result = await withCreatorBusiness(session.businessId, () => runCreatorTopicScout(body));
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    const status = reason.includes("dinonaktifkan") ? 503 : 500;
    return NextResponse.json({ ok: false, reason }, { status });
  }
}
