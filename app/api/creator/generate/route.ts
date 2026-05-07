import { NextRequest, NextResponse } from "next/server";

import { startGenerateCreatorJob } from "@/lib/creator-jobs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const job = startGenerateCreatorJob(body);
    return NextResponse.json({ ok: true, accepted: true, jobId: job.jobId, job }, { status: 202 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    const status = reason.includes("dinonaktifkan") ? 503 : 500;
    return NextResponse.json({ ok: false, reason }, { status });
  }
}
