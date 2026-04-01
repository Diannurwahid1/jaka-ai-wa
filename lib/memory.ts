import { summarizeConversation } from "@/lib/summarize";
import { prisma } from "@/lib/prisma";
import { MemoryMessage, MemoryRole } from "@/types/memory";

const SESSION_TTL_MS = 30 * 60 * 1000;
const DEFAULT_LIMIT = 15;
const SUMMARY_KEEP_RECENT = 6;
const MAX_IDLE_SESSIONS = 1000;

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

async function ensureSession(phone: string) {
  return prisma.memorySession.upsert({
    where: { phone },
    update: {},
    create: {
      phone,
      summary: "",
      lastActive: now()
    }
  });
}

async function touchSession(phone: string) {
  await prisma.memorySession.update({
    where: { phone },
    data: { lastActive: now() }
  });
}

async function cullIdleSessions() {
  const count = await prisma.memorySession.count();

  if (count <= MAX_IDLE_SESSIONS) {
    return;
  }

  const sessionsToDelete = await prisma.memorySession.findMany({
    orderBy: { lastActive: "asc" },
    skip: MAX_IDLE_SESSIONS,
    select: { phone: true }
  });

  if (sessionsToDelete.length > 0) {
    await prisma.memorySession.deleteMany({
      where: { phone: { in: sessionsToDelete.map((session) => session.phone) } }
    });
  }
}

export async function getHistory(phone: string) {
  await ensureSession(phone.trim());
  const messages = await prisma.memoryMessage.findMany({
    where: { phone: phone.trim() },
    orderBy: { createdAt: "asc" }
  });

  return messages.map(mapMemoryMessage);
}

export async function getSummary(phone: string) {
  const session = await prisma.memorySession.findUnique({ where: { phone: phone.trim() } });
  return session?.summary ?? "";
}

export async function getMemorySnapshot(phone: string) {
  const normalizedPhone = phone.trim();
  const session = await ensureSession(normalizedPhone);
  const messages = await getHistory(normalizedPhone);

  return {
    phone: session.phone,
    summary: session.summary,
    lastActive: session.lastActive.toISOString(),
    messages
  };
}

export async function listMemorySessions(limit = 100) {
  const sessions = await prisma.memorySession.findMany({
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

export async function saveMessage(phone: string, role: MemoryRole, content: string) {
  const normalizedPhone = phone.trim();
  await ensureSession(normalizedPhone);

  await prisma.memoryMessage.create({
    data: {
      phone: normalizedPhone,
      role,
      content
    }
  });

  await touchSession(normalizedPhone);
  await compactMemory(normalizedPhone);
  await cullIdleSessions();
}

export async function clearHistory(phone: string) {
  await prisma.memorySession.deleteMany({ where: { phone: phone.trim() } });
}

export async function trimHistory(phone: string, limit = DEFAULT_LIMIT) {
  const normalizedPhone = phone.trim();
  const messages = await prisma.memoryMessage.findMany({
    where: { phone: normalizedPhone },
    orderBy: { createdAt: "asc" }
  });

  if (messages.length > limit) {
    const toDelete = messages.slice(0, messages.length - limit).map((message) => message.id);

    await prisma.memoryMessage.deleteMany({
      where: { id: { in: toDelete } }
    });

    await touchSession(normalizedPhone);
  }

  return getHistory(normalizedPhone);
}

export async function isSessionExpired(phone: string) {
  const session = await prisma.memorySession.findUnique({ where: { phone: phone.trim() } });

  if (!session) {
    return false;
  }

  return Date.now() - session.lastActive.getTime() > SESSION_TTL_MS;
}

export async function resetIfExpired(phone: string) {
  if (await isSessionExpired(phone)) {
    await clearHistory(phone);
    return true;
  }

  return false;
}

export async function buildContextMessages(phone: string, systemPrompt: string) {
  const normalizedPhone = phone.trim();
  const session = await ensureSession(normalizedPhone);
  const history = await getHistory(normalizedPhone);
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

async function compactMemory(phone: string) {
  const session = await ensureSession(phone);
  const messages = await prisma.memoryMessage.findMany({
    where: { phone },
    orderBy: { createdAt: "asc" }
  });

  if (messages.length <= DEFAULT_LIMIT) {
    return;
  }

  const overflowCount = Math.max(1, messages.length - SUMMARY_KEEP_RECENT);
  const toSummarize = messages.slice(0, overflowCount).map(mapMemoryMessage);
  const recentMessages = messages.slice(-SUMMARY_KEEP_RECENT);
  const summary = await summarizeConversation(toSummarize, session.summary);

  await prisma.$transaction([
    prisma.memorySession.update({
      where: { phone },
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

export async function seedHistory(phone: string, messages: MemoryMessage[]) {
  const normalizedPhone = phone.trim();
  await clearHistory(normalizedPhone);
  await ensureSession(normalizedPhone);

  if (messages.length > 0) {
    await prisma.memoryMessage.createMany({
      data: messages.map((message) => ({
        phone: normalizedPhone,
        role: message.role,
        content: message.content,
        createdAt: new Date(message.createdAt)
      }))
    });
  }

  await touchSession(normalizedPhone);
}
