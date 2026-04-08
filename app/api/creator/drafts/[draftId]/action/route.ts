import { NextRequest, NextResponse } from "next/server";

import {
  applyCreatorDraftAction,
  publishCreatorDraft,
  sendDraftApprovalMessage,
  simulateCreatorDraftUpload
} from "@/lib/creator";
import { CreatorApprovalAction } from "@/types/creator";

export async function POST(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  try {
    const body = await request.json();
    const action = String(body?.action ?? "").trim().toLowerCase() as
      | CreatorApprovalAction
      | "send"
      | "publish"
      | "simulate_publish";

    if (!params.draftId) {
      return NextResponse.json({ ok: false, reason: "draftId is required" }, { status: 400 });
    }

    if (action === "send") {
      await sendDraftApprovalMessage(params.draftId);
      return NextResponse.json({ ok: true });
    }

    if (action === "publish") {
      const result = await publishCreatorDraft(params.draftId, { force: true });
      const status = result.success ? 200 : 500;
      return NextResponse.json({ ok: result.success, result, reason: result.success ? undefined : result.summary }, { status });
    }

    if (action === "simulate_publish") {
      const simulation = await simulateCreatorDraftUpload(params.draftId);
      return NextResponse.json({ ok: true, simulation });
    }

    const result = await applyCreatorDraftAction(params.draftId, action as CreatorApprovalAction, {
      source: "dashboard",
      instruction: String(body?.instruction ?? "").trim() || undefined
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
