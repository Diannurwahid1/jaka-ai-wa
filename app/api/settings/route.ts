import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { readSettings, writeSettings } from "@/lib/settings";

export async function GET() {
  const session = await requireSession();
  const settings = await readSettings(session.businessId);
  return NextResponse.json({ ok: true, settings });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const settings = await writeSettings(body, session.businessId);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
