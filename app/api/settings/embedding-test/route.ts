import { NextRequest, NextResponse } from "next/server";

import { readSettings, writeSettings } from "@/lib/settings";
import { testEmbeddingConnection } from "@/lib/rag";
import { AppSettings } from "@/types";

export async function POST(request: NextRequest) {
  let previousSettings: AppSettings | null = null;

  try {
    const body = (await request.json()) as Partial<AppSettings>;
    previousSettings = await readSettings();
    await writeSettings(body);

    const result = await testEmbeddingConnection();

    if (previousSettings) {
      await writeSettings(previousSettings);
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (previousSettings) {
      await writeSettings(previousSettings);
    }

    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
