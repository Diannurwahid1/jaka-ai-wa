import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { readSettings } from "@/lib/settings";
import { getDashboardOverview } from "@/lib/store";

export async function GET() {
  const session = await requireSession();
  const settings = await readSettings(session.businessId);
  const overview = await getDashboardOverview(session.businessId, {
    waConfigured: Boolean(settings.waApiUrl && settings.waSessionId && settings.waToken),
    aiConfigured: Boolean(settings.aiApiUrl && settings.aiApiKey && settings.aiModel)
  });

  return NextResponse.json({ ok: true, overview });
}
