import { NextRequest, NextResponse } from "next/server";

import { askJakaAI, JakaHistoryItem } from "@/lib/jaka";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = String(body?.message ?? "");
    const name = String(body?.name ?? "");
    const pathname = String(body?.pathname ?? "");
    const history = Array.isArray(body?.history)
      ? body.history
          .map((item: unknown) => {
            const candidate = item as Partial<JakaHistoryItem>;
            return {
              role: candidate.role === "assistant" ? "assistant" : "user",
              content: String(candidate.content ?? "")
            } satisfies JakaHistoryItem;
          })
          .filter((item: JakaHistoryItem) => item.content.trim())
      : [];

    const result = await askJakaAI(question, name, pathname, history);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
