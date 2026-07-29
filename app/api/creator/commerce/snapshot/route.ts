import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { fetchCommerceSnapshot } from "@/lib/commerce-snapshot";

export async function GET() {
  try {
    const session = await requireSession();
    const result = await fetchCommerceSnapshot(session.businessId);

    return NextResponse.json({
      ok: true,
      status: result.status,
      notModified: result.notModified,
      etag: result.etag,
      fetchedAt: result.fetchedAt,
      counts: result.counts,
      snapshot: result.snapshot
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason: error instanceof Error ? error.message : "Commerce snapshot failed."
      },
      { status: 500 }
    );
  }
}
