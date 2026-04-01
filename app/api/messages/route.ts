import { NextRequest, NextResponse } from "next/server";

import { getMessages } from "@/lib/store";

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const messages = await getMessages(Number.isFinite(limit) ? limit : undefined);

  return NextResponse.json({ ok: true, messages });
}
