import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { deleteKnowledge, listKnowledge } from "@/lib/rag";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
    const knowledge = await listKnowledge(session.businessId, Number.isFinite(limit) ? limit : 50);
    return NextResponse.json({ ok: true, knowledge });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    const documentId = request.nextUrl.searchParams.get("documentId")?.trim() ?? "";

    if (!documentId) {
      return NextResponse.json({ ok: false, reason: "documentId is required" }, { status: 400 });
    }

    const deleted = await deleteKnowledge(session.businessId, documentId);
    return NextResponse.json({ ok: true, deleted, documentId });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
