import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { getExecutionLogs } from "@/lib/blast";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const campaignId = request.nextUrl.searchParams.get("campaignId");
    const limitParam = request.nextUrl.searchParams.get("limit");

    if (!campaignId) {
      return NextResponse.json(
        { ok: false, reason: "campaignId is required" },
        { status: 400 }
      );
    }

    const limit = limitParam ? Number(limitParam) : 100;
    const logs = await getExecutionLogs(
      session.businessId,
      campaignId,
      Number.isFinite(limit) ? limit : 100
    );

    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
