import { NextRequest, NextResponse } from "next/server";

import { startPlaygroundCreatorJob } from "@/lib/creator-jobs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const job = startPlaygroundCreatorJob(body);
    return NextResponse.json({ ok: true, accepted: true, jobId: job.jobId, job }, { status: 202 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
