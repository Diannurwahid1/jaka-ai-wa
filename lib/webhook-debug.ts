import { prisma } from "@/lib/prisma";

export type WebhookDebugEvent = {
  id: string;
  createdAt: string;
  stage: "received" | "processed" | "ignored" | "failed" | "invalid_json";
  from?: string;
  message?: string;
  reason?: string;
  payload?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
};

function mapEvent(event: {
  id: string;
  createdAt: Date;
  stage: string;
  fromPhone: string | null;
  message: string | null;
  reason: string | null;
  payload: unknown;
  rawBody: string | null;
  headers: unknown;
}): WebhookDebugEvent {
  return {
    id: event.id,
    createdAt: event.createdAt.toISOString(),
    stage: event.stage as WebhookDebugEvent["stage"],
    from: event.fromPhone ?? undefined,
    message: event.message ?? undefined,
    reason: event.reason ?? undefined,
    payload: event.payload ?? undefined,
    rawBody: event.rawBody ?? undefined,
    headers: (event.headers as Record<string, string> | null) ?? undefined
  };
}

export async function appendWebhookEvent(
  event: Omit<WebhookDebugEvent, "id" | "createdAt">
) {
  const created = await prisma.webhookEvent.create({
    data: {
      stage: event.stage,
      fromPhone: event.from ?? null,
      message: event.message ?? null,
      reason: event.reason ?? null,
      payload: event.payload as object | undefined,
      rawBody: event.rawBody ?? null,
      headers: event.headers as object | undefined
    }
  });

  const count = await prisma.webhookEvent.count();

  if (count > 100) {
    const stale = await prisma.webhookEvent.findMany({
      orderBy: { createdAt: "desc" },
      skip: 100,
      select: { id: true }
    });

    if (stale.length > 0) {
      await prisma.webhookEvent.deleteMany({
        where: { id: { in: stale.map((item) => item.id) } }
      });
    }
  }

  return mapEvent(created);
}

export async function getWebhookEvents(limit = 20) {
  const events = await prisma.webhookEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return events.map(mapEvent);
}
