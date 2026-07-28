import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { uploadBufferToR2 } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, reason: "file is required" },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, reason: "File terlalu besar. Maks 10MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = file.type || "image/jpeg";

    const result = await uploadBufferToR2(session.businessId, {
      buffer,
      contentType,
      extension: getExtension(contentType),
      contentLength: buffer.length,
    });

    return NextResponse.json({ ok: true, url: result.url, key: result.key });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}

function getExtension(contentType: string) {
  switch (contentType) {
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    default: return "jpg";
  }
}
