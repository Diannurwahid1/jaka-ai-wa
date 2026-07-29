import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { testCommerceSnapshotConnection } from "@/lib/commerce-snapshot";

export async function POST() {
  try {
    const session = await requireSession();
    const result = await testCommerceSnapshotConnection(session.businessId);

    return NextResponse.json({
      ok: true,
      summary: result.summary,
      status: result.status,
      notModified: result.notModified,
      etag: result.etag,
      fetchedAt: result.fetchedAt,
      counts: result.counts,
      generatedAt: result.snapshot.generatedAt,
      store: result.snapshot.store
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason: error instanceof Error ? error.message : "Commerce snapshot test failed."
      },
      { status: 500 }
    );
  }
}

