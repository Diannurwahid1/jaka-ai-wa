import { NextRequest, NextResponse } from "next/server";

import { createBytePlusVideoTask, retrieveBytePlusVideoTask } from "@/lib/byteplus";
import { persistGeneratedVideoToR2 } from "@/lib/r2";

function buildTaskVideoKey(taskId: string, sourceUrl: string) {
  const extensionMatch = sourceUrl.match(/\.([a-zA-Z0-9]+)(?:[\?#].*)?$/);
  const extension = extensionMatch?.[1]?.toLowerCase() || "mp4";
  return `ai-videos/tasks/${taskId}.${extension}`;
}

function normalizeReferenceImageUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

export async function GET(request: NextRequest) {
  try {
    const taskId = request.nextUrl.searchParams.get("taskId")?.trim() || "";
    const model = request.nextUrl.searchParams.get("model")?.trim() || "";

    if (!taskId) {
      return NextResponse.json({ ok: false, reason: "Task ID wajib diisi." }, { status: 400 });
    }

    const task = await retrieveBytePlusVideoTask(taskId, model || undefined);
    let r2VideoUrl = "";

    if (task.videoUrl && ["completed", "succeeded", "success", "finished"].includes(task.status.toLowerCase())) {
      const stored = await persistGeneratedVideoToR2(task.videoUrl, {
        key: buildTaskVideoKey(task.taskId, task.videoUrl)
      });
      r2VideoUrl = stored.url;
    }

    return NextResponse.json({
      ok: true,
      task: {
        ...task,
        r2VideoUrl: r2VideoUrl || undefined
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = String(body.prompt ?? "").trim();
    const model = String(body.model ?? "").trim();
    const ratio = String(body.ratio ?? "16:9").trim() || "16:9";
    const duration = Number(body.duration ?? 11);
    const generateAudio = Boolean(body.generateAudio ?? true);
    const referenceImageUrls = normalizeReferenceImageUrls(body.referenceImageUrls);
    const referenceVideoUrl = String(body.referenceVideoUrl ?? "").trim();
    const referenceAudioUrl = String(body.referenceAudioUrl ?? "").trim();

    if (!prompt) {
      return NextResponse.json({ ok: false, reason: "Prompt video wajib diisi." }, { status: 400 });
    }

    const task = await createBytePlusVideoTask({
      prompt,
      model: model || undefined,
      ratio,
      duration,
      generateAudio,
      references: [
        ...referenceImageUrls.map((url) => ({
          type: "image_url" as const,
          role: "reference_image" as const,
          url
        })),
        ...(referenceVideoUrl
          ? [
              {
                type: "video_url" as const,
                role: "reference_video" as const,
                url: referenceVideoUrl
              }
            ]
          : []),
        ...(referenceAudioUrl
          ? [
              {
                type: "audio_url" as const,
                role: "reference_audio" as const,
                url: referenceAudioUrl
              }
            ]
          : [])
      ]
    });

    return NextResponse.json({ ok: true, task });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
