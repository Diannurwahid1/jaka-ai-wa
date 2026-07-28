import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/blast";

export async function GET() {
  const session = await requireSession();
  const templates = await listTemplates(session.businessId);
  return NextResponse.json({ ok: true, templates });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { name, text, imageUrl } = body;

    if (!name?.trim() || !text?.trim()) {
      return NextResponse.json(
        { ok: false, reason: "name and text are required" },
        { status: 400 }
      );
    }

    const template = await createTemplate(session.businessId, { name, text, imageUrl });
    return NextResponse.json({ ok: true, template });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { id, name, text, imageUrl } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, reason: "id is required" },
        { status: 400 }
      );
    }

    const template = await updateTemplate(session.businessId, id, { name, text, imageUrl });
    return NextResponse.json({ ok: true, template });
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
      return NextResponse.json(
        { ok: false, reason: "id is required" },
        { status: 400 }
      );
    }

    await deleteTemplate(session.businessId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
