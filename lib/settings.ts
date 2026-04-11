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
  aiAutoReplyEnabled: (process.env.AI_AUTO_REPLY_ENABLED ?? "true").trim().toLowerCase() !== "false",
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
  embeddingBaseUrl: process.env.EMBEDDING_BASE_URL ?? "https://ai.mongodb.com/v1",
  bytePlusApiKey: process.env.ARK_API_KEY ?? "",
  bytePlusBaseUrl: process.env.ARK_BASE_URL ?? "https://ark.ap-southeast.bytepluses.com/api/v3",
  bytePlusImageModel: process.env.ARK_IMAGE_MODEL ?? "seedream-4-5-251128",
  topicScoutSearchApiKey: process.env.TOPIC_SCOUT_SEARCH_API_KEY ?? "",
  topicScoutSearchUrl: process.env.TOPIC_SCOUT_SEARCH_URL ?? "https://search.infoquest.bytepluses.com",
  topicScoutModelApiKey: process.env.TOPIC_SCOUT_MODEL_API_KEY ?? process.env.ARK_API_KEY ?? "",
  topicScoutModelBaseUrl:
    process.env.TOPIC_SCOUT_MODEL_BASE_URL ??
    process.env.ARK_BASE_URL ??
    "https://ark.ap-southeast.bytepluses.com/api/v3",
  topicScoutModel: process.env.TOPIC_SCOUT_MODEL ?? "seed-2-0-mini-260215",
  topicScoutDefaultQuery:
    process.env.TOPIC_SCOUT_DEFAULT_QUERY ??
    "tren terbaru hotel indonesia direct booking OTA website hotel AI customer service hospitality marketing",
  metaAppId: process.env.META_APP_ID ?? "",
  metaAppSecret: process.env.META_APP_SECRET ?? "",
  metaGraphVersion: process.env.META_GRAPH_VERSION ?? "v23.0",
  metaFacebookPageId: process.env.META_FACEBOOK_PAGE_ID ?? "",
  metaFacebookPageName: process.env.META_FACEBOOK_PAGE_NAME ?? "",
  metaInstagramBusinessId: process.env.META_INSTAGRAM_BUSINESS_ID ?? "",
  metaInstagramUsername: process.env.META_INSTAGRAM_USERNAME ?? "",
  metaPageAccessToken: process.env.META_PAGE_ACCESS_TOKEN ?? "",
  metaPageTokenExpiresAt: process.env.META_PAGE_TOKEN_EXPIRES_AT ?? "",
  threadsUserId: process.env.THREADS_USER_ID ?? "",
  threadsUsername: process.env.THREADS_USERNAME ?? "",
  threadsAccessToken: process.env.THREADS_ACCESS_TOKEN ?? "",
  threadsTokenExpiresAt: process.env.THREADS_TOKEN_EXPIRES_AT ?? "",
  threadsApiVersion: process.env.THREADS_API_VERSION ?? "v1.0",
  threadsApiBaseUrl: process.env.THREADS_API_BASE_URL ?? "https://graph.threads.net",
  linkedinClientId: process.env.LINKEDIN_CLIENT_ID ?? "",
  linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
  linkedinRedirectUri: process.env.LINKEDIN_REDIRECT_URI ?? "",
  linkedinAccessToken: process.env.LINKEDIN_ACCESS_TOKEN ?? "",
  linkedinRefreshToken: process.env.LINKEDIN_REFRESH_TOKEN ?? "",
  linkedinTokenExpiresAt: process.env.LINKEDIN_TOKEN_EXPIRES_AT ?? "",
  linkedinAuthorUrn: process.env.LINKEDIN_AUTHOR_URN ?? "",
  linkedinOrganizationUrn: process.env.LINKEDIN_ORGANIZATION_URN ?? "",
  linkedinApiVersion: process.env.LINKEDIN_API_VERSION ?? "202504",
  autoPostEnabled: (process.env.AUTO_POST_ENABLED ?? "").trim().toLowerCase() === "true",
  schedulerSecret: process.env.SCHEDULER_SECRET ?? ""
};

function sanitizeSettings(input: Partial<AppSettings>, current: AppSettings): AppSettings {
  const nextBytePlusImageModel = input.bytePlusImageModel?.trim() ?? current.bytePlusImageModel;
  const nextMetaGraphVersion = input.metaGraphVersion?.trim() ?? current.metaGraphVersion;
  const nextThreadsApiVersion = input.threadsApiVersion?.trim() ?? current.threadsApiVersion;
  const nextThreadsApiBaseUrl = input.threadsApiBaseUrl?.trim() ?? current.threadsApiBaseUrl;
  const nextLinkedinApiVersion = input.linkedinApiVersion?.trim() ?? current.linkedinApiVersion;

  return {
    aiAutoReplyEnabled:
      typeof input.aiAutoReplyEnabled === "boolean" ? input.aiAutoReplyEnabled : current.aiAutoReplyEnabled,
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
    embeddingBaseUrl: input.embeddingBaseUrl?.trim() ?? current.embeddingBaseUrl,
    bytePlusApiKey: input.bytePlusApiKey?.trim() ?? current.bytePlusApiKey,
    bytePlusBaseUrl: input.bytePlusBaseUrl?.trim() ?? current.bytePlusBaseUrl,
    bytePlusImageModel: nextBytePlusImageModel,
    topicScoutSearchApiKey: input.topicScoutSearchApiKey?.trim() ?? current.topicScoutSearchApiKey,
    topicScoutSearchUrl: input.topicScoutSearchUrl?.trim() ?? current.topicScoutSearchUrl,
    topicScoutModelApiKey: input.topicScoutModelApiKey?.trim() ?? current.topicScoutModelApiKey,
    topicScoutModelBaseUrl: input.topicScoutModelBaseUrl?.trim() ?? current.topicScoutModelBaseUrl,
    topicScoutModel: input.topicScoutModel?.trim() ?? current.topicScoutModel,
    topicScoutDefaultQuery: input.topicScoutDefaultQuery?.trim() ?? current.topicScoutDefaultQuery,
    metaAppId: input.metaAppId?.trim() ?? current.metaAppId,
    metaAppSecret: input.metaAppSecret?.trim() ?? current.metaAppSecret,
    metaGraphVersion: nextMetaGraphVersion || fallbackSettings.metaGraphVersion,
    metaFacebookPageId: input.metaFacebookPageId?.trim() ?? current.metaFacebookPageId,
    metaFacebookPageName: input.metaFacebookPageName?.trim() ?? current.metaFacebookPageName,
    metaInstagramBusinessId: input.metaInstagramBusinessId?.trim() ?? current.metaInstagramBusinessId,
    metaInstagramUsername: input.metaInstagramUsername?.trim() ?? current.metaInstagramUsername,
    metaPageAccessToken: input.metaPageAccessToken?.trim() ?? current.metaPageAccessToken,
    metaPageTokenExpiresAt: input.metaPageTokenExpiresAt?.trim() ?? current.metaPageTokenExpiresAt,
    threadsUserId: input.threadsUserId?.trim() ?? current.threadsUserId,
    threadsUsername: input.threadsUsername?.trim() ?? current.threadsUsername,
    threadsAccessToken: input.threadsAccessToken?.trim() ?? current.threadsAccessToken,
    threadsTokenExpiresAt: input.threadsTokenExpiresAt?.trim() ?? current.threadsTokenExpiresAt,
    threadsApiVersion: nextThreadsApiVersion || fallbackSettings.threadsApiVersion,
    threadsApiBaseUrl: nextThreadsApiBaseUrl || fallbackSettings.threadsApiBaseUrl,
    linkedinClientId: input.linkedinClientId?.trim() ?? current.linkedinClientId,
    linkedinClientSecret: input.linkedinClientSecret?.trim() ?? current.linkedinClientSecret,
    linkedinRedirectUri: input.linkedinRedirectUri?.trim() ?? current.linkedinRedirectUri,
    linkedinAccessToken: input.linkedinAccessToken?.trim() ?? current.linkedinAccessToken,
    linkedinRefreshToken: input.linkedinRefreshToken?.trim() ?? current.linkedinRefreshToken,
    linkedinTokenExpiresAt: input.linkedinTokenExpiresAt?.trim() ?? current.linkedinTokenExpiresAt,
    linkedinAuthorUrn: input.linkedinAuthorUrn?.trim() ?? current.linkedinAuthorUrn,
    linkedinOrganizationUrn: input.linkedinOrganizationUrn?.trim() ?? current.linkedinOrganizationUrn,
    linkedinApiVersion: nextLinkedinApiVersion || fallbackSettings.linkedinApiVersion,
    autoPostEnabled: typeof input.autoPostEnabled === "boolean" ? input.autoPostEnabled : current.autoPostEnabled,
    schedulerSecret: input.schedulerSecret?.trim() ?? current.schedulerSecret
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
