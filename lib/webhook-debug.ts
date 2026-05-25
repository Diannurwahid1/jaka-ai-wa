import { prisma } from "@/lib/prisma";

export type WebhookDebugEvent = {
  id: string;
  createdAt: string;
  stage:
    | "received"
    | "processed"
    | "ignored"
    | "failed"
    | "invalid_json"
    | "creator_command"
    | "rejected"
    | "forwarded_copy"
    | "forward_failed";
  from?: string;
  message?: string;
  reason?: string;
  payload?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
};

const PER_BUSINESS_RETENTION = 100;

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
  businessId: string,
  event: Omit<WebhookDebugEvent, "id" | "createdAt">
) {
  const created = await prisma.webhookEvent.create({
    data: {
      businessId,
      stage: event.stage,
      fromPhone: event.from ?? null,
      message: event.message ?? null,
      reason: event.reason ?? null,
      payload: event.payload as object | undefined,
      rawBody: event.rawBody ?? null,
      headers: event.headers as object | undefined
    }
  });

  const count = await prisma.webhookEvent.count({ where: { businessId } });

  if (count > PER_BUSINESS_RETENTION) {
    const stale = await prisma.webhookEvent.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      skip: PER_BUSINESS_RETENTION,
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

export async function getWebhookEvents(businessId: string, limit = 20) {
  const events = await prisma.webhookEvent.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return events.map(mapEvent);
}
