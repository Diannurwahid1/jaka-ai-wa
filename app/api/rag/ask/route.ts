import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { askWithRAG } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const message = String(body?.message ?? "").trim();

    if (!message) {
      return NextResponse.json({ ok: false, reason: "message is required" }, { status: 400 });
    }

    const result = await askWithRAG(session.businessId, message);

    return NextResponse.json({
      ok: true,
      answer: result.answer,
      results: result.results
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
