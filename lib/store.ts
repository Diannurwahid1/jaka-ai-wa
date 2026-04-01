import { DashboardOverview, MessageLog, MessageStatus } from "@/types";
import { prisma } from "@/lib/prisma";

function mapMessage(message: {
  id: string;
  fromPhone: string;
  message: string;
  reply: string;
  source: string;
  status: string;
  intent: string;
  createdAt: Date;
  error: string | null;
}): MessageLog {
  return {
    id: message.id,
    from: message.fromPhone,
    message: message.message,
    reply: message.reply,
    source: message.source as MessageLog["source"],
    status: message.status as MessageStatus,
    intent: message.intent as MessageLog["intent"],
    createdAt: message.createdAt.toISOString(),
    error: message.error ?? undefined
  };
}

export async function getMessages(limit?: number) {
  const messages = await prisma.messageLog.findMany({
    orderBy: { createdAt: "desc" },
    take: typeof limit === "number" ? limit : undefined
  });

  return messages.map(mapMessage);
}

export async function createMessage(message: Omit<MessageLog, "id" | "createdAt">) {
  const created = await prisma.messageLog.create({
    data: {
      fromPhone: message.from,
      message: message.message,
      reply: message.reply,
      source: message.source,
      status: message.status,
      intent: message.intent,
      error: message.error ?? null
    }
  });

  return mapMessage(created);
}

export async function updateMessage(
  id: string,
  patch: Partial<Pick<MessageLog, "reply" | "status" | "error">>
) {
  const updated = await prisma.messageLog.update({
    where: { id },
    data: {
      reply: patch.reply,
      status: patch.status,
      error: patch.error === undefined ? undefined : patch.error ?? null
    }
  });

  return mapMessage(updated);
}

export async function getDashboardOverview({
  waConfigured,
  aiConfigured
}: {
  waConfigured: boolean;
  aiConfigured: boolean;
}): Promise<DashboardOverview> {
  const [inbound, replied, success, failed, recent] = await Promise.all([
    prisma.messageLog.count(),
    prisma.messageLog.count({ where: { NOT: { reply: "" } } }),
    prisma.messageLog.count({ where: { status: "success" } }),
    prisma.messageLog.count({ where: { status: "failed" } }),
    prisma.messageLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 })
  ]);

  return {
    stats: {
      inbound,
      replied,
      success,
      failed
    },
    waStatus: waConfigured ? "connected" : "disconnected",
    aiStatus: aiConfigured ? "ready" : "missing",
    recent: recent.map(mapMessage)
  };
}

export async function getStatusCounts() {
  const grouped = await prisma.messageLog.groupBy({
    by: ["status"],
    _count: { status: true }
  });

  return grouped.reduce<Record<MessageStatus, number>>(
    (accumulator, row) => {
      accumulator[row.status as MessageStatus] = row._count.status;
      return accumulator;
    },
    {
      pending: 0,
      success: 0,
      failed: 0
    }
  );
}
