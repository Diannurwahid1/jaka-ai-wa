import { summarizeConversation } from "@/lib/summarize";
import { prisma } from "@/lib/prisma";
import { MemoryMessage, MemoryRole } from "@/types/memory";

const SESSION_TTL_MS = 30 * 60 * 1000;
const DEFAULT_LIMIT = 15;
const SUMMARY_KEEP_RECENT = 6;
const MAX_IDLE_SESSIONS_PER_BUSINESS = 1000;

function now() {
  return new Date();
}

function mapMemoryMessage(message: { role: string; content: string; createdAt: Date }): MemoryMessage {
  return {
    role: message.role as MemoryRole,
    content: message.content,
    createdAt: message.createdAt.toISOString()
  };
}

async function ensureSession(businessId: string, phone: string) {
  return prisma.memorySession.upsert({
    where: { businessId_phone: { businessId, phone } },
    update: {},
    create: {
      businessId,
      phone,
      summary: "",
      lastActive: now()
    }
  });
}

async function touchSession(businessId: string, phone: string) {
  await prisma.memorySession.update({
    where: { businessId_phone: { businessId, phone } },
    data: { lastActive: now() }
  });
}

async function cullIdleSessions(businessId: string) {
  const count = await prisma.memorySession.count({ where: { businessId } });

  if (count <= MAX_IDLE_SESSIONS_PER_BUSINESS) {
    return;
  }

  const sessionsToDelete = await prisma.memorySession.findMany({
    where: { businessId },
    orderBy: { lastActive: "asc" },
    skip: MAX_IDLE_SESSIONS_PER_BUSINESS,
    select: { phone: true }
  });

  if (sessionsToDelete.length > 0) {
    await prisma.memorySession.deleteMany({
      where: {
        businessId,
        phone: { in: sessionsToDelete.map((session) => session.phone) }
      }
    });
  }
}

export async function getHistory(businessId: string, phone: string) {
  const normalizedPhone = phone.trim();
  await ensureSession(businessId, normalizedPhone);
  const messages = await prisma.memoryMessage.findMany({
    where: { businessId, phone: normalizedPhone },
    orderBy: { createdAt: "asc" }
  });

  return messages.map(mapMemoryMessage);
}

export async function getSummary(businessId: string, phone: string) {
  const session = await prisma.memorySession.findUnique({
    where: { businessId_phone: { businessId, phone: phone.trim() } }
  });
  return session?.summary ?? "";
}

export async function getMemorySnapshot(businessId: string, phone: string) {
  const normalizedPhone = phone.trim();
  const session = await ensureSession(businessId, normalizedPhone);
  const messages = await getHistory(businessId, normalizedPhone);

  return {
    phone: session.phone,
    summary: session.summary,
    lastActive: session.lastActive.toISOString(),
    messages
  };
}

export async function listMemorySessions(businessId: string, limit = 100) {
  const sessions = await prisma.memorySession.findMany({
    where: { businessId },
    orderBy: { lastActive: "desc" },
    take: limit,
    include: {
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  return sessions.map((session) => ({
    phone: session.phone,
    summary: session.summary,
    lastActive: session.lastActive.toISOString(),
    messageCount: session.messages.length,
    messages: session.messages.map(mapMemoryMessage)
  }));
}

export async function saveMessage(businessId: string, phone: string, role: MemoryRole, content: string) {
  const normalizedPhone = phone.trim();
  await ensureSession(businessId, normalizedPhone);

  await prisma.memoryMessage.create({
    data: {
      businessId,
      phone: normalizedPhone,
      role,
      content
    }
  });

  await touchSession(businessId, normalizedPhone);
  await compactMemory(businessId, normalizedPhone);
  await cullIdleSessions(businessId);
}

export async function clearHistory(businessId: string, phone: string) {
  await prisma.memorySession.deleteMany({
    where: { businessId, phone: phone.trim() }
  });
}

export async function trimHistory(businessId: string, phone: string, limit = DEFAULT_LIMIT) {
  const normalizedPhone = phone.trim();
  const messages = await prisma.memoryMessage.findMany({
    where: { businessId, phone: normalizedPhone },
    orderBy: { createdAt: "asc" }
  });

  if (messages.length > limit) {
    const toDelete = messages.slice(0, messages.length - limit).map((message) => message.id);

    await prisma.memoryMessage.deleteMany({
      where: { id: { in: toDelete } }
    });

    await touchSession(businessId, normalizedPhone);
  }

  return getHistory(businessId, normalizedPhone);
}

export async function isSessionExpired(businessId: string, phone: string) {
  const session = await prisma.memorySession.findUnique({
    where: { businessId_phone: { businessId, phone: phone.trim() } }
  });

  if (!session) {
    return false;
  }

  return Date.now() - session.lastActive.getTime() > SESSION_TTL_MS;
}

export async function resetIfExpired(businessId: string, phone: string) {
  if (await isSessionExpired(businessId, phone)) {
    await clearHistory(businessId, phone);
    return true;
  }

  return false;
}

export async function buildContextMessages(businessId: string, phone: string, systemPrompt: string) {
  const normalizedPhone = phone.trim();
  const session = await ensureSession(businessId, normalizedPhone);
  const history = await getHistory(businessId, normalizedPhone);
  const messages: Array<{ role: "system" | MemoryRole; content: string }> = [
    { role: "system", content: systemPrompt }
  ];

  if (session.summary.trim()) {
    messages.push({
      role: "system",
      content: `Context sebelumnya user: ${session.summary.trim()}`
    });
  }

  messages.push(
    ...history.map((message) => ({
      role: message.role,
      content: message.content
    }))
  );

  return messages;
}

async function compactMemory(businessId: string, phone: string) {
  const session = await ensureSession(businessId, phone);
  const messages = await prisma.memoryMessage.findMany({
    where: { businessId, phone },
    orderBy: { createdAt: "asc" }
  });

  if (messages.length <= DEFAULT_LIMIT) {
    return;
  }

  const overflowCount = Math.max(1, messages.length - SUMMARY_KEEP_RECENT);
  const toSummarize = messages.slice(0, overflowCount).map(mapMemoryMessage);
  const recentMessages = messages.slice(-SUMMARY_KEEP_RECENT);
  const summary = await summarizeConversation(businessId, toSummarize, session.summary);

  await prisma.$transaction([
    prisma.memorySession.update({
      where: { businessId_phone: { businessId, phone } },
      data: {
        summary,
        lastActive: now()
      }
    }),
    prisma.memoryMessage.deleteMany({
      where: {
        id: {
          in: messages.slice(0, messages.length - SUMMARY_KEEP_RECENT).map((message) => message.id)
        }
      }
    })
  ]);

  void recentMessages;
}

export async function seedHistory(businessId: string, phone: string, messages: MemoryMessage[]) {
  const normalizedPhone = phone.trim();
  await clearHistory(businessId, normalizedPhone);
  await ensureSession(businessId, normalizedPhone);

  if (messages.length > 0) {
    await prisma.memoryMessage.createMany({
      data: messages.map((message) => ({
        businessId,
        phone: normalizedPhone,
        role: message.role,
        content: message.content,
        createdAt: new Date(message.createdAt)
      }))
    });
  }

  await touchSession(businessId, normalizedPhone);
}
