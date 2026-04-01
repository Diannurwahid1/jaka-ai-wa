import { NextResponse } from "next/server";

import { readSettings } from "@/lib/settings";
import { getDashboardOverview } from "@/lib/store";

export async function GET() {
  const settings = await readSettings();
  const overview = await getDashboardOverview({
    waConfigured: Boolean(settings.waApiUrl && settings.waSessionId && settings.waToken),
    aiConfigured: Boolean(settings.aiApiUrl && settings.aiApiKey && settings.aiModel)
  });

  return NextResponse.json({ ok: true, overview });
}
