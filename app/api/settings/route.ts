import { NextRequest, NextResponse } from "next/server";

import { readSettings, writeSettings } from "@/lib/settings";

export async function GET() {
  const settings = await readSettings();
  return NextResponse.json({ ok: true, settings });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = await writeSettings(body);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
