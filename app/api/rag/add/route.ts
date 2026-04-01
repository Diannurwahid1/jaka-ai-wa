import { NextRequest, NextResponse } from "next/server";

import { ingestKnowledge } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = String(body?.title ?? "").trim();
    const content = String(body?.content ?? "").trim();
    const category = typeof body?.category === "string" ? body.category.trim() : undefined;

    if (!title || !content) {
      return NextResponse.json({ ok: false, reason: "title and content are required" }, { status: 400 });
    }

    const knowledge = await ingestKnowledge({ title, content, category });

    return NextResponse.json({
      ok: true,
      knowledge
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
