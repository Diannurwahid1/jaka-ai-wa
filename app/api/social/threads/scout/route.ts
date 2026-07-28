import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { runThreadsScout } from "@/lib/threads-scout";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as {
      keyword?: string;
      limit?: number;
      maxReplies?: number;
      dryRun?: boolean;
      persona?: string;
      sellAngle?: string;
    };

    const keyword = body.keyword?.trim();
    if (!keyword) {
      return NextResponse.json({ ok: false, reason: "keyword wajib diisi." }, { status: 400 });
    }

    const result = await runThreadsScout(session.businessId, {
      keyword,
      limit: body.limit ?? 20,
      maxReplies: body.maxReplies ?? 5,
      dryRun: body.dryRun ?? false,
      persona: body.persona,
      sellAngle: body.sellAngle
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[threads-scout] ERROR:", reason, error);
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
