import { NextRequest, NextResponse } from "next/server";

import { processDueCreatorDraftGenerations } from "@/lib/creator";
import { matchesHeaderSecret } from "@/lib/security";
import { readSettings } from "@/lib/settings";

function readPresentedSecret(request: NextRequest) {
  return [request.headers.get("x-scheduler-secret"), request.headers.get("authorization")];
}

export async function POST(request: NextRequest) {
  const settings = await readSettings();
  const expectedSecret = settings.schedulerSecret.trim();
  const presentedSecret = readPresentedSecret(request);

  if (!expectedSecret) {
    return NextResponse.json({ ok: false, reason: "Scheduler secret belum dikonfigurasi" }, { status: 503 });
  }

  if (!matchesHeaderSecret(expectedSecret, presentedSecret)) {
    return NextResponse.json({ ok: false, reason: "Invalid scheduler secret" }, { status: 401 });
  }

  try {
    const result = await processDueCreatorDraftGenerations();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
