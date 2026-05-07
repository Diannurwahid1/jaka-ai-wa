import { NextRequest, NextResponse } from "next/server";

import { approveAllCreatorDrafts } from "@/lib/creator";
import { CreatorPlatform } from "@/types/creator";

function normalizePlatform(value: unknown): CreatorPlatform | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "threads" || normalized === "instagram" || normalized === "linkedin" || normalized === "facebook"
    ? normalized
    : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = String(body?.action ?? "").trim().toLowerCase();
    const platform = normalizePlatform(body?.platform);

    if (!platform) {
      return NextResponse.json({ ok: false, reason: "platform is required" }, { status: 400 });
    }

    if (action !== "approve_all") {
      return NextResponse.json({ ok: false, reason: "Unsupported bulk draft action" }, { status: 400 });
    }

    const result = await approveAllCreatorDrafts(platform);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
