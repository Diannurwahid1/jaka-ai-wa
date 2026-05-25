import { NextRequest, NextResponse } from "next/server";

import { listBusinesses } from "@/lib/business";
import { processDueCreatorDraftsForBusiness } from "@/lib/creator";
import { matchesHeaderSecret } from "@/lib/security";
import { readSettings } from "@/lib/settings";

function readPresentedSecret(request: NextRequest) {
  return [request.headers.get("x-scheduler-secret"), request.headers.get("authorization")];
}

export async function POST(request: NextRequest) {
  const businesses = await listBusinesses();
  if (businesses.length === 0) {
    return NextResponse.json({ ok: false, reason: "Belum ada business yang terdaftar" }, { status: 503 });
  }

  const presentedSecret = readPresentedSecret(request);
  let authorized = false;

  for (const business of businesses) {
    const settings = await readSettings(business.id);
    const expected = settings.schedulerSecret.trim();
    if (expected && matchesHeaderSecret(expected, presentedSecret)) {
      authorized = true;
      break;
    }
  }

  if (!authorized) {
    return NextResponse.json({ ok: false, reason: "Invalid scheduler secret" }, { status: 401 });
  }

  const results: Array<{ businessId: string; businessName: string; result: unknown; error?: string }> = [];

  for (const business of businesses) {
    try {
      const result = await processDueCreatorDraftsForBusiness(business.id);
      results.push({ businessId: business.id, businessName: business.name, result });
    } catch (error) {
      results.push({
        businessId: business.id,
        businessName: business.name,
        result: null,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
