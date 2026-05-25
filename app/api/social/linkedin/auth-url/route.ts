import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { getLinkedInAuthorizationUrl } from "@/lib/social";

export async function POST() {
  try {
    const session = await requireSession();
    const url = await getLinkedInAuthorizationUrl(session.businessId);
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
