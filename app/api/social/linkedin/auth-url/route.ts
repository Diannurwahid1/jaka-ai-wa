import { NextResponse } from "next/server";

import { getLinkedInAuthorizationUrl } from "@/lib/social";

export async function POST() {
  try {
    const url = await getLinkedInAuthorizationUrl();
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
