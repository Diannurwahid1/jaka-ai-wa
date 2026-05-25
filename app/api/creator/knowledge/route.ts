import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import {
  createCreatorKnowledge,
  deleteCreatorKnowledge,
  listCreatorKnowledge,
  withCreatorBusiness
} from "@/lib/creator";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const knowledge = await withCreatorBusiness(session.businessId, () =>
      listCreatorKnowledge(request.nextUrl.searchParams.get("platform") ?? undefined)
    );
    return NextResponse.json({ ok: true, knowledge });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const knowledge = await withCreatorBusiness(session.businessId, () =>
      createCreatorKnowledge(String(body?.platform ?? ""), {
        platform: body?.platform,
        title: body?.title,
        content: body?.content,
        type: body?.type,
        tags: Array.isArray(body?.tags) ? body.tags : String(body?.tags ?? "").split(",")
      })
    );

    return NextResponse.json({ ok: true, knowledge });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, reason: "id is required" }, { status: 400 });
    }

    const deleted = await withCreatorBusiness(session.businessId, () => deleteCreatorKnowledge(id));
    return NextResponse.json({ ok: deleted });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
