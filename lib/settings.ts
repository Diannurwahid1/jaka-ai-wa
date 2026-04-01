import { AppSettings } from "@/types";
import { prisma } from "@/lib/prisma";

const defaultPrompt = `Kamu adalah AI WhatsApp untuk bisnis.

Tugas kamu:
- Menjawab pertanyaan customer
- Memberikan info produk / layanan
- Membantu closing ringan

Style:
- Ramah, cepat, to the point
- Tidak terlalu panjang
- Gunakan emoji secukupnya
- Bahasa Indonesia santai profesional

Jika tidak tahu:
-> arahkan ke admin

Jika ditanya harga:
-> jawab + ajak lanjut.`;

const fallbackSettings: AppSettings = {
  aiApiUrl: process.env.AI_API_URL ?? "https://ai.sumopod.com/v1/chat/completions",
  aiApiKey: process.env.AI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "seed-2-0-pro",
  promptSystem: process.env.AI_SYSTEM_PROMPT ?? defaultPrompt,
  waApiUrl: process.env.WA_BLAST_API_URL ?? "https://waflash.citradigitalhotel.it.com/api/v1",
  waSessionId: process.env.WA_BLAST_SESSION_ID ?? "",
  waToken: process.env.WA_BLAST_TOKEN ?? "",
  waMasterKey: process.env.WA_BLAST_MASTER_KEY ?? "",
  mongodbUri: process.env.MONGODB_URI ?? "",
  mongodbDb: process.env.MONGODB_DB ?? "wa_ai",
  ragCollection: process.env.RAG_COLLECTION ?? "knowledge",
  ragIndexName: process.env.RAG_INDEX_NAME ?? "vector_index",
  embeddingProvider: process.env.EMBEDDING_PROVIDER ?? "mongodb",
  embeddingApiKey: process.env.EMBEDDING_API_KEY ?? "",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "voyage-4-large",
  embeddingDimensions: process.env.EMBEDDING_DIMENSIONS ?? "1024",
  embeddingBaseUrl: process.env.EMBEDDING_BASE_URL ?? "https://ai.mongodb.com/v1"
};

function sanitizeSettings(input: Partial<AppSettings>, current: AppSettings): AppSettings {
  return {
    aiApiUrl: input.aiApiUrl?.trim() ?? current.aiApiUrl,
    aiApiKey: input.aiApiKey?.trim() ?? current.aiApiKey,
    aiModel: input.aiModel?.trim() ?? current.aiModel,
    promptSystem: input.promptSystem?.trim() ?? current.promptSystem,
    waApiUrl: input.waApiUrl?.trim() ?? current.waApiUrl,
    waSessionId: input.waSessionId?.trim() ?? current.waSessionId,
    waToken: input.waToken?.trim() ?? current.waToken,
    waMasterKey: input.waMasterKey?.trim() ?? current.waMasterKey,
    mongodbUri: input.mongodbUri?.trim() ?? current.mongodbUri,
    mongodbDb: input.mongodbDb?.trim() ?? current.mongodbDb,
    ragCollection: input.ragCollection?.trim() ?? current.ragCollection,
    ragIndexName: input.ragIndexName?.trim() ?? current.ragIndexName,
    embeddingProvider: input.embeddingProvider?.trim() ?? current.embeddingProvider,
    embeddingApiKey: input.embeddingApiKey?.trim() ?? current.embeddingApiKey,
    embeddingModel: input.embeddingModel?.trim() ?? current.embeddingModel,
    embeddingDimensions: input.embeddingDimensions?.trim() ?? current.embeddingDimensions,
    embeddingBaseUrl: input.embeddingBaseUrl?.trim() ?? current.embeddingBaseUrl
  };
}

async function ensureConfigRow() {
  return prisma.appConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      ...fallbackSettings
    }
  });
}

export async function readSettings(): Promise<AppSettings> {
  const config = await ensureConfigRow();

  return sanitizeSettings(config, fallbackSettings);
}

export async function writeSettings(input: Partial<AppSettings>) {
  const current = await readSettings();
  const nextValue = sanitizeSettings(input, current);

  const updated = await prisma.appConfig.upsert({
    where: { id: 1 },
    update: nextValue,
    create: {
      id: 1,
      ...nextValue
    }
  });

  return sanitizeSettings(updated, fallbackSettings);
}
