import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { startPlaygroundCreatorJob } from "@/lib/creator-jobs";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const job = startPlaygroundCreatorJob(session.businessId, body);
    return NextResponse.json({ ok: true, accepted: true, jobId: job.jobId, job }, { status: 202 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
