import { NextRequest, NextResponse } from "next/server";

import { getCreatorJob } from "@/lib/creator-jobs";

export async function GET(_: NextRequest, { params }: { params: { jobId: string } }) {
  const job = getCreatorJob(params.jobId);

  if (!job) {
    return NextResponse.json({ ok: false, reason: "Job tidak ditemukan atau sudah kedaluwarsa." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, job });
}
