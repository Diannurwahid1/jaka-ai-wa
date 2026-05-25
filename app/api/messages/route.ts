import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { getMessages } from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  const messages = await getMessages(session.businessId, Number.isFinite(limit) ? limit : undefined);

  return NextResponse.json({ ok: true, messages });
}
