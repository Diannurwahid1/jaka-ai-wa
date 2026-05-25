import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { getBusinessProfileById, updateBusinessProfile } from "@/lib/business";

export async function GET() {
  try {
    const session = await requireSession();
    const business = await getBusinessProfileById(session.businessId);

    if (!business) {
      return NextResponse.json({ ok: false, reason: "Business tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, business });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const business = await updateBusinessProfile(session.businessId, {
      name: typeof body?.name === "string" ? body.name : undefined,
      slug: typeof body?.slug === "string" ? body.slug : undefined,
      niche: typeof body?.niche === "string" ? body.niche : undefined,
      brandSummary: typeof body?.brandSummary === "string" ? body.brandSummary : undefined,
      audience: typeof body?.audience === "string" ? body.audience : undefined,
      brandVisualStyle: typeof body?.brandVisualStyle === "string" ? body.brandVisualStyle : undefined
    });

    return NextResponse.json({ ok: true, business });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
