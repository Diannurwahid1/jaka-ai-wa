import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { readSettings, writeSettings } from "@/lib/settings";
import { testEmbeddingConnection } from "@/lib/rag";
import { AppSettings } from "@/types";

export async function POST(request: NextRequest) {
  let previousSettings: AppSettings | null = null;
  let businessId = "";

  try {
    const session = await requireSession();
    businessId = session.businessId;
    const body = (await request.json()) as Partial<AppSettings>;
    previousSettings = await readSettings(businessId);
    await writeSettings(body, businessId);

    const result = await testEmbeddingConnection(businessId);

    if (previousSettings) {
      await writeSettings(previousSettings, businessId);
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (previousSettings && businessId) {
      await writeSettings(previousSettings, businessId);
    }

    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
