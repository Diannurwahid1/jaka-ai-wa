import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { getCreatorJob } from "@/lib/creator-jobs";

export async function GET(_: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await requireSession();
  const job = getCreatorJob(session.businessId, params.jobId);

  if (!job) {
    return NextResponse.json({ ok: false, reason: "Job tidak ditemukan atau sudah kedaluwarsa." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, job });
}
