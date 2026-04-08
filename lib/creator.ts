import { ObjectId } from "mongodb";

import { generateBytePlusImage, hasBytePlusImageConfig } from "@/lib/byteplus";
import { getMongoDatabase } from "@/lib/mongodb";
import { readSettings } from "@/lib/settings";
import { publishDraftToPlatform, simulatePlatformPublish } from "@/lib/social";
import { sendWA } from "@/lib/wa";
import {
  CreatorApprovalAction,
  CreatorAspectRatio,
  CreatorDraft,
  CreatorDraftType,
  CreatorKnowledgeItem,
  CreatorKnowledgeType,
  CreatorObjective,
  CreatorOverview,
  CreatorPlatform,
  CreatorPublishLog,
  CreatorPublishProvider,
  CreatorPublishSimulation,
  CreatorProfile,
  CreatorRole,
  CreatorScheduleSlot,
  CreatorThreadPart,
  CreatorTopicBrief,
  CreatorTone,
  ThreadPartType
} from "@/types/creator";

const CREATOR_ID = "jaka-ai-creator";
const creatorCollectionNames = {
  profiles: "creator_profiles",
  knowledge: "creator_knowledge",
  drafts: "creator_drafts",
  approvalLogs: "creator_approval_logs",
  publishLogs: "creator_publish_logs",
  topicBriefs: "creator_topic_briefs"
} as const;

const platformOrder: CreatorPlatform[] = ["threads", "instagram", "linkedin", "facebook"];
const publishRetryDelayMinutes = [5, 15, 60] as const;

type CreatorProfileDocument = {
  _id?: ObjectId;
  creatorId: string;
  platform: CreatorPlatform;
  name: string;
  niche: string;
  brandSummary: string;
  audience: string;
  objective: CreatorObjective;
  approvalPhone: string;
  defaultRole: CreatorRole;
  defaultTone: CreatorTone;
  postsPerDay: number;
  planningDays: number;
  scheduleSlots: CreatorScheduleSlot[];
  generateImages: boolean;
  imageModel?: string;
  imageAspectRatio: CreatorAspectRatio;
  createdAt: Date;
  updatedAt: Date;
};

type CreatorKnowledgeDocument = {
  _id?: ObjectId;
  creatorId: string;
  platform: CreatorPlatform | "all";
  type: CreatorKnowledgeType;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

type CreatorDraftVersionDocument = {
  version: number;
  instruction?: string;
  parts: CreatorThreadPart[];
  caption?: string;
  visualPrompt?: string;
  imageUrl?: string;
  imageError?: string;
  createdAt: Date;
};

type CreatorDraftDocument = {
  _id?: ObjectId;
  draftId: string;
  creatorId: string;
  platform: CreatorPlatform;
  type: CreatorDraftType;
  role: CreatorRole;
  tone: CreatorTone;
  objective: CreatorObjective;
  topic: string;
  hookStyle: string;
  visualPrompt?: string;
  imageUrl?: string;
  imageProvider?: string;
  imageError?: string;
  imageAspectRatio?: CreatorAspectRatio;
  caption?: string;
  status: CreatorDraft["status"];
  currentVersion: number;
  parts: CreatorThreadPart[];
  versions: CreatorDraftVersionDocument[];
  approvalPhone?: string;
  approvalAttempts?: number;
  approvalSentAt?: Date;
  lastApprovalError?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  scheduledFor?: Date;
  publishProvider?: CreatorPublishProvider;
  publishTargetLabel?: string;
  publishAttempts?: number;
  publishedAt?: Date;
  externalPostId?: string;
  externalPostUrl?: string;
  lastPublishError?: string;
  lastPublishSummary?: string;
  createdAt: Date;
  updatedAt: Date;
};

type CreatorApprovalLogDocument = {
  _id?: ObjectId;
  draftId: string;
  platform: CreatorPlatform;
  action: CreatorApprovalAction;
  source: "dashboard" | "whatsapp";
  phone?: string;
  detail?: string;
  createdAt: Date;
};

type CreatorPublishLogDocument = {
  _id?: ObjectId;
  draftId: string;
  platform: CreatorPlatform;
  provider: CreatorPublishProvider;
  status: "success" | "failed" | "simulated";
  simulated: boolean;
  targetLabel?: string;
  externalPostId?: string;
  externalPostUrl?: string;
  summary: string;
  error?: string;
  createdAt: Date;
};

type CreatorTopicBriefDocument = {
  _id?: ObjectId;
  creatorId: string;
  platform: CreatorPlatform;
  worker: string;
  query: string;
  topic: string;
  angle: string;
  description: string;
  whyNow: string;
  tags: string[];
  dedupeKey: string;
  status: "fresh" | "used" | "archived";
  references: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
  usedAt?: Date;
  usedByDraftId?: string;
  createdAt: Date;
  updatedAt: Date;
};

type GeneratedDraftSeed = {
  topic?: string;
  hookStyle?: string;
  type?: CreatorDraftType;
  caption?: string;
  visualPrompt?: string;
  visualHeadline?: string;
  visualSubline?: string;
  visualCta?: string;
  visualScene?: string;
  visualLayout?: string;
  visualMood?: string;
  parts?: Array<{
    type?: string;
    content?: string;
  }>;
};

type GeneratedVisualConcept = Pick<
  GeneratedDraftSeed,
  "visualPrompt" | "visualHeadline" | "visualSubline" | "visualCta" | "visualScene" | "visualLayout" | "visualMood"
>;

type PlatformMeta = {
  label: string;
  description: string;
  defaultType: CreatorDraftType;
  requiresImage: boolean;
  defaultAspectRatio: CreatorAspectRatio;
  scheduleSlots: CreatorScheduleSlot[];
  generationRules: string[];
};

const platformMeta: Record<CreatorPlatform, PlatformMeta> = {
  threads: {
    label: "Threads",
    description: "Thread bisnis hospitality yang tajam, relevan, dan mengarahkan owner ke solusi direct booking serta pertumbuhan revenue.",
    defaultType: "thread_series",
    requiresImage: false,
    defaultAspectRatio: "1:1",
    scheduleSlots: [
      { label: "Pagi", time: "08:15" },
      { label: "Siang", time: "12:15" },
      { label: "Malam", time: "19:15" }
    ],
    generationRules: [
      "Buat thread 4 sampai 5 post dengan hook keras di post pertama dan alur reply yang tetap mudah dibaca owner bisnis.",
      "Fokus pada problem bisnis dan solusi praktis: direct booking, ketergantungan OTA, lead hilang dari WhatsApp, website yang tidak konversi, dan follow-up customer yang lambat.",
      "Jangan bahas teknis coding, stack, atau jargon developer. Sudut pandang wajib seperti owner atau strategist bisnis hospitality.",
      "Setiap thread harus memberi insight yang terasa mahal, spesifik ke hotel, villa, resort, atau penginapan."
    ]
  },
  instagram: {
    label: "Instagram",
    description: "Post visual premium untuk hotel dan hospitality brand yang ingin menaikkan direct booking dan awareness.",
    defaultType: "single_post",
    requiresImage: true,
    defaultAspectRatio: "4:5",
    scheduleSlots: [
      { label: "Pagi", time: "09:00" },
      { label: "Siang", time: "13:00" },
      { label: "Sore", time: "18:30" }
    ],
    generationRules: [
      "Caption harus punya hook di baris pertama dan langsung menyorot problem bisnis hospitality yang nyata.",
      "Fokus pada solusi owner-level: direct booking, ketergantungan OTA, lead WhatsApp hilang, website hotel yang tidak konversi, dan respon tamu yang lambat.",
      "Jangan bahas teknis coding, stack, atau jargon developer. Visual wajib premium, estetik, dan terasa seperti brand hospitality-tech yang serius.",
      "Buat CTA ringan dan maksimal 5 hashtag relevan jika memang perlu."
    ]
  },
  linkedin: {
    label: "LinkedIn",
    description: "Post authority-building untuk owner dan decision maker hospitality dengan sudut pandang bisnis.",
    defaultType: "single_post",
    requiresImage: true,
    defaultAspectRatio: "16:9",
    scheduleSlots: [
      { label: "Pagi", time: "08:15" },
      { label: "Siang", time: "12:00" },
      { label: "Sore", time: "17:15" }
    ],
    generationRules: [
      "Opening 1-2 kalimat pertama harus menarik namun tetap profesional dan business-first.",
      "Isi harus membangun authority lewat insight strategis hospitality: direct booking, margin, guest journey, AI customer service, dan operational efficiency.",
      "Jangan bahas teknis coding, stack, atau implementasi developer. Sudut pandang wajib seperti owner, operator, atau strategist bisnis hospitality.",
      "Visual wajib relevan dengan tema profesional, workspace, leadership, atau hospitality operations."
    ]
  },
  facebook: {
    label: "Facebook",
    description: "Post komunitas hospitality yang ramah, relatable, dan tetap mendorong diskusi soal bisnis hotel.",
    defaultType: "single_post",
    requiresImage: true,
    defaultAspectRatio: "1:1",
    scheduleSlots: [
      { label: "Pagi", time: "08:30" },
      { label: "Siang", time: "12:45" },
      { label: "Malam", time: "19:30" }
    ],
    generationRules: [
      "Buka dengan angle yang relatable atau memancing diskusi tentang problem bisnis hotel yang sering terjadi.",
      "Caption harus lebih luwes dan human dibanding LinkedIn, tapi tetap fokus ke solusi direct booking, pelayanan tamu, dan revenue.",
      "Jangan bahas teknis coding atau stack developer. Visual perlu kuat untuk shareability, stop-scroll, dan mudah dipahami cepat."
    ]
  }
};

function now() {
  return new Date();
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function phonesMatch(left?: string, right?: string) {
  const leftDigits = digitsOnly(left ?? "");
  const rightDigits = digitsOnly(right ?? "");
  return Boolean(leftDigits) && leftDigits === rightDigits;
}

function isCreatorPlatform(value: string): value is CreatorPlatform {
  return platformOrder.includes(value as CreatorPlatform);
}

function normalizePlatform(value?: string) {
  const fallback: CreatorPlatform = "threads";
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return isCreatorPlatform(normalized) ? normalized : fallback;
}

function getPlatformMeta(platform: CreatorPlatform) {
  return platformMeta[platform];
}

function defaultProfileValues(platform: CreatorPlatform): Omit<CreatorProfileDocument, "_id" | "createdAt" | "updatedAt"> {
  const meta = getPlatformMeta(platform);
  const citraName = "Citra Digital Hotel";
  const citraNiche = "Direct booking hotel, website hotel yang konversi, AI customer service, dan digital marketing hospitality";
  const citraBrandSummary =
    "Citra Digital Hotel membantu hotel, villa, resort, dan penginapan meningkatkan direct booking lewat website yang fokus konversi, AI customer service, serta strategi digital yang praktis dan terukur.";
  const citraAudience =
    "Owner hotel, villa, resort, penginapan, dan tim marketing hospitality yang ingin menaikkan direct booking, mengurangi ketergantungan OTA, dan mempercepat closing dari WhatsApp atau website.";

  if (platform === "threads") {
    return {
      creatorId: CREATOR_ID,
      platform,
      name: citraName,
      niche: citraNiche,
      brandSummary: citraBrandSummary,
      audience: citraAudience,
      objective: "authority",
      approvalPhone: "",
      defaultRole: "owner",
      defaultTone: "sharp",
      postsPerDay: 2,
      planningDays: 3,
      scheduleSlots: meta.scheduleSlots,
      generateImages: false,
      imageModel: undefined,
      imageAspectRatio: meta.defaultAspectRatio
    };
  }

  return {
    creatorId: CREATOR_ID,
    platform,
    name: citraName,
    niche: citraNiche,
    brandSummary: citraBrandSummary,
    audience: citraAudience,
    objective: platform === "linkedin" ? "authority" : "engagement",
    approvalPhone: "",
    defaultRole: "owner",
    defaultTone: platform === "facebook" ? "warm" : "sharp",
    postsPerDay: 1,
    planningDays: 3,
    scheduleSlots: meta.scheduleSlots,
    generateImages: meta.requiresImage,
    imageModel: undefined,
    imageAspectRatio: meta.defaultAspectRatio
  };
}

function shouldUpgradeLegacyProfile(document: CreatorProfileDocument) {
  return (
    (
      document.name.trim() === "Jaka AI Creator" ||
      document.niche.trim() === "AI automation, productivity, social media growth" ||
      document.brandSummary.includes("Jaka AI Creator adalah modul pembuat konten") ||
      document.audience.includes("creator yang ingin produksi konten lebih cepat") ||
      (document.platform === "threads" && document.defaultRole !== "owner") ||
      (document.platform === "linkedin" && document.defaultRole === "personal-branding") ||
      ((document.platform === "instagram" || document.platform === "facebook") && document.defaultRole === "informative")
    )
  );
}

function normalizeThreadPartType(type: string, index: number): ThreadPartType {
  const normalized = type.trim().toLowerCase();

  if (normalized === "hook" || normalized === "context" || normalized === "insight" || normalized === "expansion" || normalized === "cta") {
    return normalized;
  }

  if (index === 0) {
    return "hook";
  }

  if (index === 1) {
    return "context";
  }

  if (index === 2) {
    return "insight";
  }

  return index >= 4 ? "cta" : "expansion";
}

function normalizeGeneratedParts(parts: GeneratedDraftSeed["parts"], type: CreatorDraftType, platform: CreatorPlatform) {
  const fallbackParts =
    platform === "threads"
      ? [
          { index: 1, type: "hook" as const, content: "Hook belum terbentuk. Coba generate ulang dengan topik yang lebih spesifik." }
        ]
      : [
          { index: 1, type: "hook" as const, content: "Hook belum terbentuk. Coba generate ulang." },
          { index: 2, type: "insight" as const, content: "Isi utama akan ditulis ulang pada generate berikutnya." },
          { index: 3, type: "cta" as const, content: "Tutup dengan CTA ringan yang relevan." }
        ];

  if (!Array.isArray(parts) || parts.length === 0) {
    return fallbackParts;
  }

  const normalized = parts
    .map((part, index) => ({
      index: index + 1,
      type: normalizeThreadPartType(String(part?.type ?? ""), index),
      content: String(part?.content ?? "").trim()
    }))
    .filter((part) => part.content);

  if (normalized.length === 0) {
    return fallbackParts;
  }

  normalized[0].type = "hook";
  return normalized.slice(0, type === "thread_series" ? 5 : 3);
}

function parseJsonPayload(raw: string) {
  const cleaned = raw.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    }

    throw new Error("AI response was not valid JSON.");
  }
}

function buildDraftIdentifier(platform: CreatorPlatform) {
  const prefixMap: Record<CreatorPlatform, string> = {
    threads: "TH",
    instagram: "IG",
    linkedin: "LI",
    facebook: "FB"
  };

  return `${prefixMap[platform]}-${Date.now().toString().slice(-6)}`;
}

type TopicScoutSearchHit = {
  title: string;
  url: string;
  snippet: string;
};

function normalizeDedupeKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);
}

function collectTopicScoutSearchHits(input: unknown, bucket: TopicScoutSearchHit[] = []) {
  if (Array.isArray(input)) {
    input.forEach((item) => collectTopicScoutSearchHits(item, bucket));
    return bucket;
  }

  if (!input || typeof input !== "object") {
    return bucket;
  }

  const record = input as Record<string, unknown>;
  const title = String(record.title ?? record.name ?? "").trim();
  const url = String(record.url ?? record.link ?? "").trim();
  const snippet = String(record.desc ?? record.snippet ?? record.summary ?? "").trim();

  if (title && url) {
    bucket.push({ title, url, snippet });
  }

  Object.values(record).forEach((value) => collectTopicScoutSearchHits(value, bucket));
  return bucket;
}

function dedupeTopicScoutSearchHits(items: TopicScoutSearchHit[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeDedupeKey(`${item.title} ${item.url}`);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function extractResponsesText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const maybeChoices = record.choices;
  if (Array.isArray(maybeChoices) && maybeChoices.length > 0) {
    const first = maybeChoices[0] as Record<string, unknown>;
    const message = first.message as Record<string, unknown> | undefined;
    if (typeof message?.content === "string" && message.content.trim()) {
      return message.content.trim();
    }
  }

  const output = record.output;
  if (Array.isArray(output)) {
    const parts = output
      .flatMap((item) => {
        if (!item || typeof item !== "object") {
          return [];
        }

        const content = (item as Record<string, unknown>).content;
        if (!Array.isArray(content)) {
          return [];
        }

        return content
          .map((contentItem) => {
            if (!contentItem || typeof contentItem !== "object") {
              return "";
            }

            const contentRecord = contentItem as Record<string, unknown>;
            if (typeof contentRecord.text === "string") {
              return contentRecord.text;
            }

            const nestedText = contentRecord.text as Record<string, unknown> | undefined;
            if (typeof nestedText?.value === "string") {
              return nestedText.value;
            }

            return "";
          })
          .filter(Boolean);
      })
      .join("\n")
      .trim();

    if (parts) {
      return parts;
    }
  }

  return "";
}

function buildTopicScoutQuery(platform: CreatorPlatform, profile: CreatorProfile, query?: string, fallbackQuery?: string) {
  const manual = query?.trim();
  if (manual) {
    return manual;
  }

  if (fallbackQuery?.trim()) {
    return fallbackQuery.trim();
  }

  const platformLabel = getPlatformMeta(platform).label.toLowerCase();
  return `${profile.name} ${profile.niche} tren terbaru hotel indonesia direct booking OTA hospitality marketing AI customer service ${platformLabel}`;
}

function buildTopicScoutPrompt(input: {
  platform: CreatorPlatform;
  profile: CreatorProfile;
  query: string;
  limit: number;
  searchHits: TopicScoutSearchHit[];
}) {
  const references = input.searchHits
    .slice(0, 10)
    .map((item, index) => `${index + 1}. ${item.title} | ${item.url} | ${item.snippet || "-"}`)
    .join("\n");

  return `
Kamu adalah Brief Strategist untuk konten hospitality brand.

Brand:
- Name: ${input.profile.name}
- Brand summary: ${input.profile.brandSummary}
- Audience: ${input.profile.audience}
- Platform target: ${getPlatformMeta(input.platform).label}

Task:
- Dari hasil web search di bawah, buat ${input.limit} brief topik konten yang paling relevan, segar, dan non-teknis.
- Fokus pada owner hotel, villa, resort, penginapan, dan marketing hospitality.
- Prioritaskan topik tentang direct booking, OTA, okupansi, website konversi, AI customer service, WhatsApp lead, guest experience, dan revenue.
- Jangan buat topik duplikat satu sama lain.
- Jangan bahas coding, stack, atau teknis implementasi developer.
- Judul topic harus singkat dan siap dipakai generator draft.

Web search results:
${references}

Return JSON:
{
  "topics": [
    {
      "topic": "judul topik singkat",
      "angle": "sudut bahasan utama",
      "description": "brief konten 1-2 kalimat",
      "whyNow": "kenapa ini relevan sekarang",
      "tags": ["hotel", "direct-booking"],
      "references": [
        {
          "title": "judul sumber",
          "url": "https://...",
          "snippet": "ringkasan pendek"
        }
      ]
    }
  ]
}`;
}

function buildDraftTopicInstruction(topicBrief: CreatorTopicBrief) {
  return `${topicBrief.topic}. Angle: ${topicBrief.angle}. Brief: ${topicBrief.description}. Why now: ${topicBrief.whyNow}.`;
}

function normalizeScheduleSlots(platform: CreatorPlatform, input?: CreatorScheduleSlot[]) {
  const fallback = getPlatformMeta(platform).scheduleSlots;

  if (!Array.isArray(input) || input.length === 0) {
    return fallback;
  }

  const normalized = input
    .map((slot) => ({
      label: String(slot.label ?? "").trim() || "Slot",
      time: String(slot.time ?? "").trim()
    }))
    .filter((slot) => /^\d{2}:\d{2}$/.test(slot.time))
    .slice(0, 8);

  return normalized.length > 0 ? normalized : fallback;
}

function buildCaptionFromParts(parts: CreatorThreadPart[]) {
  return parts.map((part) => part.content).join("\n\n").trim();
}

function compactWords(value: string, maxWords: number, fallback: string) {
  const normalized = value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!]+$/g, "");

  if (!normalized) {
    return fallback;
  }

  return normalized
    .split(" ")
    .slice(0, maxWords)
    .join(" ")
    .trim();
}

function deriveVisualHeadline(topic: string, caption: string) {
  const primary = compactWords(topic, 6, "");

  if (primary) {
    return primary;
  }

  return compactWords(caption, 6, "Direct Booking Naik");
}

function deriveVisualSubline(platform: CreatorPlatform, topic: string) {
  const fallbackMap: Record<Exclude<CreatorPlatform, "threads">, string> = {
    instagram: "Website hotel yang jualan, bukan sekadar tampil bagus",
    facebook: "Solusi digital hospitality yang langsung terasa dampaknya",
    linkedin: "Hospitality growth system yang lebih modern dan terukur"
  };

  const normalizedTopic = topic.toLowerCase();

  if (normalizedTopic.includes("ota")) {
    return "Kurangi komisi, tambah booking langsung";
  }

  if (normalizedTopic.includes("booking")) {
    return "Bikin tamu booking tanpa ribet";
  }

  if (normalizedTopic.includes("ai")) {
    return "Respon tamu lebih cepat dan rapi";
  }

  if (normalizedTopic.includes("website")) {
    return "Website hotel yang bantu closing";
  }

  if (normalizedTopic.includes("whatsapp")) {
    return "Follow up tamu lebih cepat";
  }

  return fallbackMap[platform as Exclude<CreatorPlatform, "threads">] || "Solusi hospitality premium";
}

function deriveVisualCta(platform: CreatorPlatform) {
  const defaultMap: Record<Exclude<CreatorPlatform, "threads">, string> = {
    instagram: "Lihat Demo",
    facebook: "Konsultasi Gratis",
    linkedin: "Book Demo"
  };

  return defaultMap[platform as Exclude<CreatorPlatform, "threads">] || "Lihat Demo";
}

function getBrandVisualCore(platform: CreatorPlatform) {
  const commonCore = [
    "Brand: Citra Digital Hotel.",
    "Theme: premium hospitality tech, modern, terpercaya, AI-driven, enterprise trust.",
    "Color direction: deep dark navy, electric blue, and crisp white accents.",
    "Use a premium futuristic visual language with subtle grid, glow lines, glassmorphism, restrained dashboard UI accents, and clean composition.",
    "Subject must be a real human, photorealistic, not illustration, not cartoon, not 3D render.",
    "Subject should relate to hotel operations, hotel owner, front office, hospitality staff, guest journey, or manager with laptop/tablet/phone.",
    "Add a large short headline inside the image, concise and bold.",
    "Add a smaller supporting subline and a small CTA pill/button.",
    "The text inside image must feel like a campaign headline, not a paragraph.",
    "Do not render any logo, watermark, brand wordmark, company name, app name, or signature in the image.",
    "Brand identity must come from color, styling, composition, mood, and subject direction, not from placing logos or company names on the artwork.",
    "Do not render color codes, hex values, debug labels, random symbols, fake UI annotations, or decorative code-like text anywhere in the image.",
    "Avoid red dominant colors, avoid playful retail style, avoid noisy promo poster style, avoid clutter."
  ];

  const adapterMap: Record<Exclude<CreatorPlatform, "threads">, string[]> = {
    instagram: [
      "Instagram adapter: stop-scroll editorial feed, bold campaign headline, stylish premium composition.",
      "Use stronger visual contrast, fashionable lighting, and more expressive image composition while staying premium.",
      "Portrait or close-up framing is preferred. Human subject can occupy one side with headline block on the opposite side."
    ],
    facebook: [
      "Facebook adapter: easier to digest, more relatable, warmer human energy, but still branded and premium.",
      "Use slightly more direct communication and a community-friendly layout.",
      "Composition should remain clean and readable quickly on mobile feed."
    ],
    linkedin: [
      "LinkedIn adapter: more executive, professional, strategic, polished, and authority-driven.",
      "Use cleaner composition, more subtle effects, and business-oriented body language.",
      "Scene should feel credible for decision makers in hospitality."
    ]
  };

  return [...commonCore, ...adapterMap[platform as Exclude<CreatorPlatform, "threads">]];
}

function composeBrandedVisualPrompt(
  platform: CreatorPlatform,
  profile: CreatorProfile,
  draft: {
    topic: string;
    caption: string;
  },
  concept?: GeneratedVisualConcept
) {
  if (platform === "threads") {
    return concept?.visualPrompt?.trim() || undefined;
  }

  const headline = compactWords(concept?.visualHeadline ?? "", 7, deriveVisualHeadline(draft.topic, draft.caption));
  const subline = compactWords(concept?.visualSubline ?? "", 10, deriveVisualSubline(platform, draft.topic));
  const cta = compactWords(concept?.visualCta ?? "", 4, deriveVisualCta(platform));
  const scene =
    concept?.visualScene?.trim() ||
    `real human subject in premium hotel or hospitality workspace context, using laptop, tablet, or smartphone with hotel-tech workflow`;
  const layout =
    concept?.visualLayout?.trim() ||
    `clean campaign layout with strong hierarchy, subject on one side, bold headline block, subline beneath, CTA pill, subtle UI overlays`;
  const mood =
    concept?.visualMood?.trim() ||
    `premium, futuristic, trustworthy, modern, calm, intelligent`;
  const brandCore = getBrandVisualCore(platform).join(" ");

  return [
    brandCore,
    `Platform: ${getPlatformMeta(platform).label}.`,
    `Topic: ${draft.topic}.`,
    `Scene: ${scene}.`,
    `Mood: ${mood}.`,
    `Layout: ${layout}.`,
    `Headline text inside image: "${headline}".`,
    `Supporting subline inside image: "${subline}".`,
    `CTA pill text inside image: "${cta}".`,
    "Keep the result visual-first, minimal, premium, and clearly readable.",
    "Never include logos, watermarks, company names, or brand wordmarks anywhere in the artwork."
  ]
    .filter(Boolean)
    .join(" ");
}

function aspectRatioToImageSize(aspectRatio: CreatorAspectRatio) {
  if (aspectRatio === "4:5") {
    return "1728x2160";
  }

  if (aspectRatio === "16:9") {
    return "2560x1440";
  }

  return "2048x2048";
}

function sanitizeProfileInput(platform: CreatorPlatform, input: Partial<CreatorProfile>) {
  const defaults = defaultProfileValues(platform);
  const postsPerDay = Number(input.postsPerDay ?? defaults.postsPerDay);
  const planningDays = Number(input.planningDays ?? defaults.planningDays);
  const generateImages = platform === "threads" ? false : Boolean(input.generateImages ?? defaults.generateImages);
  const imageAspectRatio = (input.imageAspectRatio ?? defaults.imageAspectRatio) as CreatorAspectRatio;

  return {
    platform,
    name: String(input.name ?? defaults.name).trim() || defaults.name,
    niche: String(input.niche ?? defaults.niche).trim() || defaults.niche,
    brandSummary: String(input.brandSummary ?? defaults.brandSummary).trim() || defaults.brandSummary,
    audience: String(input.audience ?? defaults.audience).trim() || defaults.audience,
    objective: (input.objective ?? defaults.objective) as CreatorObjective,
    approvalPhone: String(input.approvalPhone ?? defaults.approvalPhone).trim(),
    defaultRole: (input.defaultRole ?? defaults.defaultRole) as CreatorRole,
    defaultTone: (input.defaultTone ?? defaults.defaultTone) as CreatorTone,
    postsPerDay: Number.isFinite(postsPerDay) ? Math.max(1, Math.min(postsPerDay, 6)) : defaults.postsPerDay,
    planningDays: Number.isFinite(planningDays) ? Math.max(1, Math.min(planningDays, 14)) : defaults.planningDays,
    scheduleSlots: normalizeScheduleSlots(platform, input.scheduleSlots),
    generateImages,
    imageModel: generateImages ? String(input.imageModel ?? defaults.imageModel ?? "").trim() || defaults.imageModel : undefined,
    imageAspectRatio
  };
}

function sanitizeKnowledgeInput(platform: CreatorPlatform, input: Partial<CreatorKnowledgeItem>) {
  const title = String(input.title ?? "").trim();
  const content = String(input.content ?? "").trim();

  if (!title || !content) {
    throw new Error("Knowledge title and content are required.");
  }

  const itemPlatform = String(input.platform ?? platform).trim().toLowerCase();

  const normalizedPlatform: CreatorPlatform | "all" =
    itemPlatform === "all" ? "all" : normalizePlatform(itemPlatform);

  return {
    platform: normalizedPlatform,
    title,
    content,
    type: (input.type ?? "brand") as CreatorKnowledgeType,
    tags: Array.isArray(input.tags)
      ? input.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8)
      : String((input as { tags?: string }).tags ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 8)
  };
}

async function getCollections() {
  const db = await getMongoDatabase();
  return {
    profiles: db.collection<CreatorProfileDocument>(creatorCollectionNames.profiles),
    knowledge: db.collection<CreatorKnowledgeDocument>(creatorCollectionNames.knowledge),
    drafts: db.collection<CreatorDraftDocument>(creatorCollectionNames.drafts),
    approvalLogs: db.collection<CreatorApprovalLogDocument>(creatorCollectionNames.approvalLogs),
    publishLogs: db.collection<CreatorPublishLogDocument>(creatorCollectionNames.publishLogs),
    topicBriefs: db.collection<CreatorTopicBriefDocument>(creatorCollectionNames.topicBriefs)
  };
}

function mapProfile(document: CreatorProfileDocument): CreatorProfile {
  return {
    id: String(document._id ?? `${document.creatorId}-${document.platform}`),
    creatorId: document.creatorId,
    platform: document.platform,
    name: document.name,
    niche: document.niche,
    brandSummary: document.brandSummary,
    audience: document.audience,
    objective: document.objective,
    approvalPhone: document.approvalPhone,
    defaultRole: document.defaultRole,
    defaultTone: document.defaultTone,
    postsPerDay: document.postsPerDay,
    planningDays: document.planningDays,
    scheduleSlots: document.scheduleSlots,
    generateImages: document.generateImages,
    imageModel: document.imageModel,
    imageAspectRatio: document.imageAspectRatio,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

function mapKnowledge(document: CreatorKnowledgeDocument): CreatorKnowledgeItem {
  return {
    id: String(document._id),
    creatorId: document.creatorId,
    platform: document.platform,
    type: document.type,
    title: document.title,
    content: document.content,
    tags: document.tags,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

function mapDraft(document: CreatorDraftDocument): CreatorDraft {
  return {
    id: String(document._id),
    draftId: document.draftId,
    creatorId: document.creatorId,
    platform: document.platform,
    type: document.type,
    role: document.role,
    tone: document.tone,
    objective: document.objective,
    topic: document.topic,
    hookStyle: document.hookStyle,
    visualPrompt: document.visualPrompt,
    imageUrl: document.imageUrl,
    imageProvider: document.imageProvider,
    imageError: document.imageError,
    imageAspectRatio: document.imageAspectRatio,
    caption: document.caption,
    status: document.status,
    currentVersion: document.currentVersion,
    parts: document.parts,
    versions: document.versions.map((version) => ({
      version: version.version,
      instruction: version.instruction,
      parts: version.parts,
      caption: version.caption,
      visualPrompt: version.visualPrompt,
      imageUrl: version.imageUrl,
      imageError: version.imageError,
      createdAt: version.createdAt.toISOString()
    })),
    approvalPhone: document.approvalPhone,
    approvalAttempts: document.approvalAttempts ?? 0,
    approvalSentAt: document.approvalSentAt?.toISOString(),
    lastApprovalError: document.lastApprovalError,
    approvedAt: document.approvedAt?.toISOString(),
    rejectedAt: document.rejectedAt?.toISOString(),
    scheduledFor: document.scheduledFor?.toISOString(),
    publishProvider: document.publishProvider,
    publishTargetLabel: document.publishTargetLabel,
    publishAttempts: document.publishAttempts ?? 0,
    publishedAt: document.publishedAt?.toISOString(),
    externalPostId: document.externalPostId,
    externalPostUrl: document.externalPostUrl,
    lastPublishError: document.lastPublishError,
    lastPublishSummary: document.lastPublishSummary,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

function mapPublishLog(document: CreatorPublishLogDocument): CreatorPublishLog {
  return {
    id: String(document._id),
    draftId: document.draftId,
    platform: document.platform,
    provider: document.provider,
    status: document.status,
    simulated: document.simulated,
    targetLabel: document.targetLabel,
    externalPostId: document.externalPostId,
    externalPostUrl: document.externalPostUrl,
    summary: document.summary,
    error: document.error,
    createdAt: document.createdAt.toISOString()
  };
}

function mapTopicBrief(document: CreatorTopicBriefDocument): CreatorTopicBrief {
  return {
    id: String(document._id),
    creatorId: document.creatorId,
    platform: document.platform,
    worker: document.worker,
    query: document.query,
    topic: document.topic,
    angle: document.angle,
    description: document.description,
    whyNow: document.whyNow,
    tags: document.tags,
    dedupeKey: document.dedupeKey,
    status: document.status,
    references: document.references,
    usedAt: document.usedAt?.toISOString(),
    usedByDraftId: document.usedByDraftId,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

async function ensureProfileDocument(platform: CreatorPlatform) {
  const { profiles } = await getCollections();
  const existing = await profiles.findOne({ creatorId: CREATOR_ID, platform });

  if (existing) {
    if (shouldUpgradeLegacyProfile(existing)) {
      const defaults = defaultProfileValues(platform);
      const setPayload: Record<string, unknown> = {
        name: defaults.name,
        niche: defaults.niche,
        brandSummary: defaults.brandSummary,
        audience: defaults.audience,
        objective: defaults.objective,
        defaultRole: defaults.defaultRole,
        defaultTone: defaults.defaultTone,
        scheduleSlots: existing.scheduleSlots?.length ? existing.scheduleSlots : defaults.scheduleSlots,
        postsPerDay: existing.postsPerDay || defaults.postsPerDay,
        planningDays: existing.planningDays || defaults.planningDays,
        imageAspectRatio: existing.imageAspectRatio || defaults.imageAspectRatio,
        updatedAt: now()
      };
      const unsetPayload: Record<string, ""> = {};

      if (platform === "threads") {
        setPayload.generateImages = false;
        setPayload.imageAspectRatio = defaults.imageAspectRatio;
        unsetPayload.imageModel = "";
      }

      const updatePayload = {
        $set: setPayload,
        ...(Object.keys(unsetPayload).length ? { $unset: unsetPayload } : {})
      } as any;

      await profiles.updateOne({ _id: existing._id }, updatePayload);

      return (await profiles.findOne({ creatorId: CREATOR_ID, platform })) as CreatorProfileDocument;
    }

    return existing;
  }

  const createdAt = now();
  const document: CreatorProfileDocument = {
    ...defaultProfileValues(platform),
    createdAt,
    updatedAt: createdAt
  };

  await profiles.insertOne(document);
  return (await profiles.findOne({ creatorId: CREATOR_ID, platform })) as CreatorProfileDocument;
}

async function listAllCreatorProfiles() {
  await Promise.all(platformOrder.map((platform) => ensureProfileDocument(platform)));
  const { profiles } = await getCollections();
  const items = await profiles.find({ creatorId: CREATOR_ID }).toArray();
  return items.map(mapProfile);
}

async function buildStyleMemorySummary(platform: CreatorPlatform, limit = 10) {
  const { approvalLogs } = await getCollections();
  const logs = await approvalLogs.find({ platform, action: { $ne: "send" } }).sort({ createdAt: -1 }).limit(limit).toArray();

  if (logs.length === 0) {
    return "Belum ada histori approval. Utamakan hook kuat, sudut yang jelas, dan tone creator yang natural.";
  }

  return logs
    .map((log) => `- ${log.action} via ${log.source}${log.detail ? `: ${log.detail}` : ""}`)
    .join("\n");
}

function formatDraftForApproval(draft: CreatorDraft) {
  const platformLabel = getPlatformMeta(draft.platform).label;
  const lines =
    draft.platform === "threads"
      ? draft.parts.map((part) => `${part.index}. ${part.content}`)
      : [
          draft.caption || buildCaptionFromParts(draft.parts),
          draft.visualPrompt ? `\nVisual: ${draft.visualPrompt}` : "",
          draft.imageUrl ? `\nImage: ${draft.imageUrl}` : ""
        ].filter(Boolean);

  return [
    `Jaka AI Creator - ${platformLabel} Draft`,
    "",
    `ID: ${draft.draftId}`,
    `Role: ${draft.role}`,
    `Tone: ${draft.tone}`,
    `Goal: ${draft.objective}`,
    `Topic: ${draft.topic}`,
    "",
    ...lines,
    "",
    "Balas cepat:",
    `/approve ${draft.draftId}`,
    `/reject ${draft.draftId}`,
    `/regen ${draft.draftId}`,
    `/edit ${draft.draftId} buat lebih singkat dan tajam`
  ].join("\n");
}

function buildUpcomingSlots(scheduleSlots: CreatorScheduleSlot[], days = 21) {
  const upcoming: Date[] = [];
  const today = new Date();
  const slots = [...scheduleSlots].sort((left, right) => left.time.localeCompare(right.time));

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    for (const slot of slots) {
      const [hourText, minuteText] = slot.time.split(":");
      const slotDate = new Date(today);
      slotDate.setDate(today.getDate() + dayOffset);
      slotDate.setHours(Number(hourText), Number(minuteText), 0, 0);

      if (slotDate.getTime() > Date.now() + 60 * 1000) {
        upcoming.push(slotDate);
      }
    }
  }

  return upcoming;
}

function getNextPublishRetryTime(attemptNumber: number) {
  const delayMinutes = publishRetryDelayMinutes[attemptNumber - 1];

  if (!delayMinutes) {
    return null;
  }

  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

async function pickNextScheduleSlot(profile: CreatorProfile) {
  const { drafts } = await getCollections();
  const scheduledDrafts = await drafts
    .find({
      platform: profile.platform,
      status: "scheduled",
      scheduledFor: { $exists: true }
    })
    .project({ scheduledFor: 1 })
    .toArray();

  const used = new Set(
    scheduledDrafts
      .map((item) => item.scheduledFor?.toISOString())
      .filter((value): value is string => Boolean(value))
  );

  const candidates = buildUpcomingSlots(profile.scheduleSlots, Math.max(profile.planningDays + 7, 14));
  return candidates.find((candidate) => !used.has(candidate.toISOString())) ?? candidates[0] ?? now();
}

async function logApprovalAction(
  draftId: string,
  platform: CreatorPlatform,
  action: CreatorApprovalAction,
  source: "dashboard" | "whatsapp",
  detail?: string,
  phone?: string
) {
  const { approvalLogs } = await getCollections();
  await approvalLogs.insertOne({
    draftId,
    platform,
    action,
    source,
    detail,
    phone,
    createdAt: now()
  });
}

async function sendDraftToApprovalChannel(
  document: CreatorDraftDocument,
  profile: CreatorProfile,
  options?: {
    source?: "dashboard" | "whatsapp";
    phone?: string;
  }
) {
  const approvalPhone = profile.approvalPhone?.trim();

  if (!approvalPhone) {
    return {
      success: false as const,
      reason: "Approval phone is not configured."
    };
  }

  const { drafts } = await getCollections();
  const attemptNumber = (document.approvalAttempts ?? 0) + 1;
  const actionTime = now();

  try {
    await sendWA(approvalPhone, formatDraftForApproval(mapDraft(document)));

    await drafts.updateOne(
      { _id: document._id },
      {
        $set: {
          status: "pending_approval",
          approvalPhone,
          approvalAttempts: attemptNumber,
          approvalSentAt: actionTime,
          updatedAt: actionTime
        },
        $unset: {
          lastApprovalError: ""
        }
      }
    );

    await logApprovalAction(document.draftId, document.platform, "send", options?.source ?? "dashboard", "Approval draft sent", options?.phone);

    return {
      success: true as const
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Gagal mengirim approval draft.";

    await drafts.updateOne(
      { _id: document._id },
      {
        $set: {
          status: "draft",
          approvalPhone,
          approvalAttempts: attemptNumber,
          lastApprovalError: reason,
          updatedAt: actionTime
        },
        $unset: {
          approvalSentAt: ""
        }
      }
    );

    await logApprovalAction(
      document.draftId,
      document.platform,
      "send",
      options?.source ?? "dashboard",
      `Approval send failed: ${reason}`,
      options?.phone
    );

    return {
      success: false as const,
      reason
    };
  }
}

async function logPublishOutcome(input: Omit<CreatorPublishLogDocument, "_id" | "createdAt">) {
  const { publishLogs } = await getCollections();
  await publishLogs.insertOne({
    ...input,
    createdAt: now()
  });
}

async function listCreatorPublishLogs(platformInput?: string, limit = 16) {
  const platform = normalizePlatform(platformInput);
  const { publishLogs } = await getCollections();
  const documents = await publishLogs
    .find({ platform })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return documents.map(mapPublishLog);
}

async function callTopicScoutSearch(query: string, limit = 12) {
  const settings = await readSettings();

  if (!settings.topicScoutSearchUrl || !settings.topicScoutSearchApiKey) {
    throw new Error("Topic Scout search config belum lengkap di root Settings.");
  }

  const response = await fetch(settings.topicScoutSearchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.topicScoutSearchApiKey}`
    },
    body: JSON.stringify({
      search_type: "Web",
      format: "JSON",
      query
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Topic Scout search gagal (${response.status}): ${detail}`);
  }

  const payload = await response.json();
  const hits = dedupeTopicScoutSearchHits(collectTopicScoutSearchHits(payload)).slice(0, limit);

  if (hits.length === 0) {
    throw new Error("Topic Scout search tidak mengembalikan hasil yang bisa dipakai.");
  }

  return hits;
}

async function callTopicScoutModel(prompt: string) {
  const settings = await readSettings();

  if (!settings.topicScoutModelApiKey || !settings.topicScoutModelBaseUrl || !settings.topicScoutModel) {
    throw new Error("Topic Scout model config belum lengkap di root Settings.");
  }

  const response = await fetch(`${settings.topicScoutModelBaseUrl.replace(/\/$/, "")}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.topicScoutModelApiKey}`,
      "ark-beta-mcp": "true"
    },
    body: JSON.stringify({
      model: settings.topicScoutModel,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Topic Scout model gagal (${response.status}): ${detail}`);
  }

  const payload = await response.json();
  const text = extractResponsesText(payload);

  if (!text) {
    throw new Error("Topic Scout model tidak mengembalikan teks yang bisa diparse.");
  }

  return text;
}

async function listCreatorTopicBriefs(platformInput?: string, options?: { limit?: number; status?: "fresh" | "used" | "archived" }) {
  const platform = normalizePlatform(platformInput);
  const { topicBriefs } = await getCollections();
  const filter: Record<string, unknown> = {
    creatorId: CREATOR_ID,
    platform
  };

  if (options?.status) {
    filter.status = options.status;
  }

  const documents = await topicBriefs
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(Number(options?.limit ?? 20), 60)))
    .toArray();

  return documents.map(mapTopicBrief);
}

async function pickFreshTopicBriefDocuments(platform: CreatorPlatform, count: number) {
  const { topicBriefs } = await getCollections();
  return topicBriefs
    .find({
      creatorId: CREATOR_ID,
      platform,
      status: "fresh"
    })
    .sort({ createdAt: 1 })
    .limit(Math.max(1, Math.min(count, 20)))
    .toArray();
}

async function ensureTopicBriefPool(platform: CreatorPlatform, profile: CreatorProfile, needed: number) {
  const existing = await pickFreshTopicBriefDocuments(platform, needed);

  if (existing.length >= needed) {
    return existing;
  }

  await runCreatorTopicScout({
    platform,
    query: "",
    limit: Math.max(needed, 20)
  });

  return pickFreshTopicBriefDocuments(platform, needed);
}

async function markTopicBriefUsed(topicBriefId: ObjectId | undefined, draftId: string) {
  if (!topicBriefId) {
    return;
  }

  const { topicBriefs } = await getCollections();
  await topicBriefs.updateOne(
    { _id: topicBriefId },
    {
      $set: {
        status: "used",
        usedAt: now(),
        usedByDraftId: draftId,
        updatedAt: now()
      }
    }
  );
}

export async function runCreatorTopicScout(input?: {
  platform?: string;
  query?: string;
  limit?: number;
}) {
  const platform = normalizePlatform(input?.platform);
  const profile = await getCreatorProfile(platform);
  const settings = await readSettings();
  const query = buildTopicScoutQuery(platform, profile, input?.query, settings.topicScoutDefaultQuery);
  const limit = Math.max(1, Math.min(Number(input?.limit ?? 20), 30));
  const searchHits = await callTopicScoutSearch(query, Math.max(limit, 10));
  const prompt = buildTopicScoutPrompt({
    platform,
    profile,
    query,
    limit,
    searchHits
  });
  const raw = await callTopicScoutModel(prompt);
  const parsed = parseJsonPayload(raw) as {
    topics?: Array<{
      topic?: string;
      angle?: string;
      description?: string;
      whyNow?: string;
      tags?: string[];
      references?: Array<{ title?: string; url?: string; snippet?: string }>;
    }>;
  };
  const candidates = Array.isArray(parsed.topics) ? parsed.topics : [];

  if (candidates.length === 0) {
    throw new Error("Topic Scout tidak menghasilkan brief topik.");
  }

  const { topicBriefs } = await getCollections();
  const existing = await topicBriefs
    .find({
      creatorId: CREATOR_ID,
      platform
    })
    .project({ dedupeKey: 1 })
    .toArray();
  const existingKeys = new Set(existing.map((item) => item.dedupeKey));
  const createdAt = now();
  const inserted: CreatorTopicBrief[] = [];

  for (const candidate of candidates.slice(0, limit)) {
    const topic = String(candidate.topic ?? "").trim();
    if (!topic) {
      continue;
    }

    const dedupeKey = normalizeDedupeKey(topic);
    if (!dedupeKey || existingKeys.has(dedupeKey)) {
      continue;
    }

    const references = Array.isArray(candidate.references)
      ? candidate.references
          .map((reference) => ({
            title: String(reference?.title ?? "").trim(),
            url: String(reference?.url ?? "").trim(),
            snippet: String(reference?.snippet ?? "").trim() || undefined
          }))
          .filter((reference) => reference.title && reference.url)
          .slice(0, 3)
      : [];

    const document: CreatorTopicBriefDocument = {
      creatorId: CREATOR_ID,
      platform,
      worker: "Scout Web -> Brief Strategist",
      query,
      topic,
      angle: String(candidate.angle ?? "").trim() || "Angle bisnis hospitality yang relevan",
      description: String(candidate.description ?? "").trim() || topic,
      whyNow: String(candidate.whyNow ?? "").trim() || "Relevan dengan dinamika market hospitality saat ini.",
      tags: Array.isArray(candidate.tags)
        ? candidate.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8)
        : [],
      dedupeKey,
      status: "fresh",
      references,
      createdAt,
      updatedAt: createdAt
    };

    const result = await topicBriefs.insertOne(document);
    document._id = result.insertedId;
    inserted.push(mapTopicBrief(document));
    existingKeys.add(dedupeKey);
  }

  return {
    platform,
    query,
    workerFlow: ["Scout Web", "Brief Strategist", "Draft Writer"],
    found: searchHits.length,
    saved: inserted.length,
    topics: inserted
  };
}

async function callCreatorModel(prompt: string) {
  const settings = await readSettings();

  if (!settings.aiApiUrl || !settings.aiApiKey || !settings.aiModel) {
    throw new Error("AI configuration is incomplete.");
  }

  const response = await fetch(settings.aiApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.aiApiKey}`
    },
    body: JSON.stringify({
      model: settings.aiModel,
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah Jaka AI Creator, AI strategist untuk konten social media creator-first. Balas WAJIB JSON valid tanpa markdown."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 1400
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Creator AI request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  return String(data.choices?.[0]?.message?.content ?? "").trim();
}

function buildPlatformPrompt({
  platform,
  profile,
  styleMemory,
  count,
  topic,
  role,
  tone,
  objective
}: {
  platform: CreatorPlatform;
  profile: CreatorProfile;
  styleMemory: string;
  count: number;
  topic?: string;
  role: CreatorRole;
  tone: CreatorTone;
  objective: CreatorObjective;
}) {
  const meta = getPlatformMeta(platform);
  const imageInstruction =
    meta.requiresImage && profile.generateImages
      ? `- Selain caption, buat konsep visual brand-consistent untuk ${meta.label}.
- WAJIB hasilkan field: visualHeadline, visualSubline, visualCta, visualScene, visualLayout, visualMood, dan visualPrompt.
- Brand visual harus tetap satu family: premium hospitality tech, navy gelap, electric blue, white, trust, futuristik, modern.
- Subject utama harus manusia asli yang relevan dengan hotel, hospitality, owner, front office, manager, atau guest.
- Di dalam gambar harus ada headline pendek besar, subline singkat, dan CTA pill kecil.
- Jangan tampilkan logo, watermark, nama company, nama brand, wordmark, atau signature apa pun di dalam gambar.
- Jangan tampilkan kode hex warna, debug text, simbol acak, fake HUD label, atau tulisan teknis dekoratif yang tidak relevan.
- Jangan buat style retail ramai, jangan dominan merah, jangan seperti poster diskon murahan.
`
      : "";
  const trendSignals =
    platform === "threads"
      ? `
Current business problems to prioritize:
- Hotel dan penginapan makin tertekan biaya komisi OTA dan perlu direct booking yang lebih kuat.
- Lead dari WhatsApp sering hilang karena balasan lambat atau follow-up tidak konsisten.
- Banyak website hotel tampil bagus tetapi lemah dalam konversi booking.
- Tim marketing hospitality dituntut membangun first-party audience dan data sendiri, bukan hanya bergantung pada OTA atau platform pihak ketiga.
- Owner butuh solusi yang terasa cepat diterapkan, hemat biaya, dan langsung berdampak ke revenue.
`
      : "";

  return `
Platform: ${meta.label}
Platform description: ${meta.description}

Creator profile:
- Name: ${profile.name}
- Brand summary: ${profile.brandSummary}
- Audience: ${profile.audience}
- Niche: ${profile.niche}
- Role: ${role}
- Tone: ${tone}
- Objective: ${objective}

Style memory:
${styleMemory}

${trendSignals}

Platform rules:
${meta.generationRules.map((rule) => `- ${rule}`).join("\n")}
${imageInstruction}
Task:
- Buat ${count} draft ${meta.label} dalam Bahasa Indonesia.
- Topik tambahan dari user: ${topic?.trim() || "bebas tapi tetap sesuai niche dan positioning creator."}
- Caption tidak boleh generik.
- Hook harus kuat sejak kalimat awal.
- Format output harus cocok dengan karakter platform ini, bukan copywriting generik lintas platform.
- Jika platform adalah Threads, tulis dari sudut pandang owner atau advisor bisnis. Fokus pada dampak bisnis, keputusan owner, revenue, booking, biaya, dan solusi. Hindari penjelasan teknis implementasi.

Return JSON:
{
  "drafts": [
    {
      "topic": "topik singkat",
      "hookStyle": "jenis hook",
      "type": "${meta.defaultType}",
      "caption": "caption final",
      "visualHeadline": "${meta.requiresImage ? "headline visual pendek 3-7 kata" : ""}",
      "visualSubline": "${meta.requiresImage ? "subline visual singkat" : ""}",
      "visualCta": "${meta.requiresImage ? "CTA pill pendek" : ""}",
      "visualScene": "${meta.requiresImage ? "deskripsi scene manusia dan lingkungan" : ""}",
      "visualLayout": "${meta.requiresImage ? "layout komposisi visual" : ""}",
      "visualMood": "${meta.requiresImage ? "mood visual" : ""}",
      "visualPrompt": "${meta.requiresImage ? "prompt visual" : ""}",
      "parts": [
        { "type": "hook", "content": "..." },
        { "type": "context", "content": "..." },
        { "type": "insight", "content": "..." },
        { "type": "cta", "content": "..." }
      ]
    }
  ]
}`;
}

async function generateVisualIfNeeded(
  platform: CreatorPlatform,
  profile: CreatorProfile,
  draft: {
    topic: string;
    caption: string;
    visualPrompt?: string;
    visualConcept?: GeneratedVisualConcept;
  }
) {
  if (!getPlatformMeta(platform).requiresImage || !profile.generateImages) {
    return {
      imageUrl: undefined as string | undefined,
      imageProvider: undefined as string | undefined,
      imageError: undefined as string | undefined
    };
  }

  if (!(await hasBytePlusImageConfig())) {
    return {
      imageUrl: undefined as string | undefined,
      imageProvider: undefined as string | undefined,
      imageError: "BytePlus belum dikonfigurasi di root Settings."
    };
  }

  const visualPrompt =
    draft.visualPrompt?.trim() ||
    composeBrandedVisualPrompt(platform, profile, draft, draft.visualConcept)?.trim() ||
    `${draft.topic}. ${draft.caption}. Buat visual social media yang premium, relevan, dan stop-scroll untuk ${getPlatformMeta(platform).label}.`;

  try {
    const imageUrl = await generateBytePlusImage({
      prompt: visualPrompt,
      size: aspectRatioToImageSize(profile.imageAspectRatio)
    });

    return {
      imageUrl,
      imageProvider: "byteplus",
      imageError: undefined as string | undefined
    };
  } catch (error) {
    return {
      imageUrl: undefined as string | undefined,
      imageProvider: "byteplus",
      imageError: error instanceof Error ? error.message : "BytePlus image generation failed."
    };
  }
}

async function createRegeneratedDraft(
  draft: CreatorDraft,
  profile: CreatorProfile,
  instruction?: string
) {
  const meta = getPlatformMeta(draft.platform);
  const memorySummary = await buildStyleMemorySummary(draft.platform, 8);
  const prompt = `
Platform: ${meta.label}
Current draft:
${draft.parts.map((part) => `${part.index}. (${part.type}) ${part.content}`).join("\n")}
Caption:
${draft.caption || buildCaptionFromParts(draft.parts)}
Visual prompt:
${draft.visualPrompt || "-"}

Creator profile:
- Brand summary: ${profile.brandSummary}
- Audience: ${profile.audience}
- Niche: ${profile.niche}
- Role: ${draft.role}
- Tone: ${draft.tone}
- Objective: ${draft.objective}

Style memory:
${memorySummary}

Platform rules:
${meta.generationRules.map((rule) => `- ${rule}`).join("\n")}

Task:
- Perbaiki draft di atas untuk platform ${meta.label}.
- Pastikan hook lebih kuat.
- Jangan generik.
- Instruction tambahan user: ${instruction?.trim() || "buat versi lebih refined dan engaging"}

Return JSON:
{
  "topic": "topik singkat",
  "hookStyle": "jenis hook",
  "caption": "caption final",
  "visualHeadline": "${meta.requiresImage ? "headline visual pendek 3-7 kata" : ""}",
  "visualSubline": "${meta.requiresImage ? "subline visual singkat" : ""}",
  "visualCta": "${meta.requiresImage ? "CTA pill pendek" : ""}",
  "visualScene": "${meta.requiresImage ? "deskripsi scene manusia dan lingkungan" : ""}",
  "visualLayout": "${meta.requiresImage ? "layout komposisi visual" : ""}",
  "visualMood": "${meta.requiresImage ? "mood visual" : ""}",
  "visualPrompt": "${meta.requiresImage ? "prompt visual" : ""}",
  "parts": [
    { "type": "hook", "content": "..." },
    { "type": "context", "content": "..." },
    { "type": "insight", "content": "..." },
    { "type": "cta", "content": "..." }
  ]
}`;

  const raw = await callCreatorModel(prompt);
  const parsed = parseJsonPayload(raw) as GeneratedDraftSeed;
  const parts = normalizeGeneratedParts(parsed.parts, draft.type, draft.platform);
  const caption = String(parsed.caption ?? "").trim() || buildCaptionFromParts(parts);
  const visualPrompt = composeBrandedVisualPrompt(
    draft.platform,
    profile,
    {
      topic: String(parsed.topic ?? draft.topic).trim() || draft.topic,
      caption
    },
    parsed
  );
  const image = await generateVisualIfNeeded(draft.platform, profile, {
    topic: String(parsed.topic ?? draft.topic).trim() || draft.topic,
    caption,
    visualPrompt,
    visualConcept: parsed
  });

  return {
    topic: String(parsed.topic ?? draft.topic).trim() || draft.topic,
    hookStyle: String(parsed.hookStyle ?? draft.hookStyle).trim() || draft.hookStyle,
    caption,
      visualPrompt,
      imageUrl: image.imageUrl,
      imageProvider: image.imageProvider,
      imageError: image.imageError,
      parts
    };
}

function normalizeActionInstruction(message: string, action: CreatorApprovalAction) {
  const trimmed = message.trim();
  const withoutCommand = trimmed.replace(/^\/[a-z-]+/i, "").trim();

  if (!withoutCommand) {
    return { draftReference: "", instruction: "" };
  }

  const [firstToken, ...rest] = withoutCommand.split(/\s+/);
  const looksLikeId = /^(TH|IG|LI|FB)-\d+/i.test(firstToken);

  if (!looksLikeId) {
    return {
      draftReference: "",
      instruction: action === "edit" || action === "regen" ? withoutCommand : ""
    };
  }

  return {
    draftReference: firstToken.toUpperCase(),
    instruction: rest.join(" ").trim()
  };
}

function normalizeScoutInstruction(message: string, matchedPlatforms: CreatorPlatform[]) {
  const tokens = message.trim().split(/\s+/).slice(1);
  const firstToken = tokens[0]?.toLowerCase();
  const platformFromCommand = matchedPlatforms.find((platform) => platform === firstToken);

  if (platformFromCommand) {
    return {
      platform: platformFromCommand,
      query: tokens.slice(1).join(" ").trim()
    };
  }

  return {
    platform: matchedPlatforms[0],
    query: tokens.join(" ").trim()
  };
}

async function resolveDraftByReference(draftReference?: string, platforms?: CreatorPlatform[]) {
  const { drafts } = await getCollections();
  const platformFilter = platforms && platforms.length > 0 ? { platform: { $in: platforms } } : {};

  if (draftReference?.trim()) {
    return drafts.findOne({
      draftId: draftReference.trim().toUpperCase(),
      ...platformFilter
    });
  }

  return drafts
    .find({
      status: "pending_approval",
      ...platformFilter
    })
    .sort({ updatedAt: -1 })
    .limit(1)
    .next();
}

async function findDraftDocumentById(draftId: string) {
  const { drafts } = await getCollections();
  return drafts.findOne({ draftId, creatorId: CREATOR_ID });
}

export function listCreatorPlatforms() {
  return platformOrder.map((platform) => ({
    platform,
    ...getPlatformMeta(platform)
  }));
}

export async function getCreatorProfile(platformInput?: string) {
  const platform = normalizePlatform(platformInput);
  return mapProfile(await ensureProfileDocument(platform));
}

export async function updateCreatorProfile(platformInput: string | undefined, input: Partial<CreatorProfile>) {
  const platform = normalizePlatform(platformInput ?? input.platform);
  const current = await ensureProfileDocument(platform);
  const { profiles } = await getCollections();

  await profiles.updateOne(
    { creatorId: current.creatorId, platform },
    {
      $set: {
        ...sanitizeProfileInput(platform, input),
        updatedAt: now()
      }
    }
  );

  return getCreatorProfile(platform);
}

export async function listCreatorKnowledge(platformInput?: string) {
  const platform = normalizePlatform(platformInput);
  const { knowledge } = await getCollections();
  const items = await knowledge
    .find({
      creatorId: CREATOR_ID,
      platform: { $in: ["all", platform] }
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return items.map(mapKnowledge);
}

export async function createCreatorKnowledge(platformInput: string | undefined, input: Partial<CreatorKnowledgeItem>) {
  const platform = normalizePlatform(platformInput ?? input.platform);
  const { knowledge } = await getCollections();
  const sanitized = sanitizeKnowledgeInput(platform, input);
  const createdAt = now();
  const document: CreatorKnowledgeDocument = {
    creatorId: CREATOR_ID,
    platform: sanitized.platform,
    type: sanitized.type,
    title: sanitized.title,
    content: sanitized.content,
    tags: sanitized.tags,
    createdAt,
    updatedAt: createdAt
  };

  const result = await knowledge.insertOne(document);
  document._id = result.insertedId;
  return mapKnowledge(document);
}

export async function deleteCreatorKnowledge(id: string) {
  const { knowledge } = await getCollections();
  const result = await knowledge.deleteOne({ _id: new ObjectId(id), creatorId: CREATOR_ID });
  return result.deletedCount > 0;
}

export async function listCreatorDrafts(platformInput?: string, limit = 20) {
  const platform = normalizePlatform(platformInput);
  const { drafts } = await getCollections();
  const documents = await drafts
    .find({ creatorId: CREATOR_ID, platform })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();

  return documents.map(mapDraft);
}

export async function getCreatorOverview(platformInput?: string): Promise<CreatorOverview> {
  const platform = normalizePlatform(platformInput);
  const [profile, drafts, publishLogs, topicBriefs] = await Promise.all([
    getCreatorProfile(platform),
    listCreatorDrafts(platform, 18),
    listCreatorPublishLogs(platform, 10),
    listCreatorTopicBriefs(platform, { limit: 12 })
  ]);

  return {
    platform,
    profile,
    drafts,
    topicBriefs,
    stats: {
      totalDrafts: drafts.length,
      pendingApproval: drafts.filter((draft) => draft.status === "pending_approval").length,
      scheduled: drafts.filter((draft) => draft.status === "scheduled").length,
      rejected: drafts.filter((draft) => draft.status === "rejected").length,
      posted: drafts.filter((draft) => draft.status === "posted").length,
      failed: drafts.filter((draft) => draft.status === "failed").length
    },
    publishLogs,
    commandHelp: [
      "/approve TH-123",
      "/reject IG-123",
      "/regen LI-123 hook lebih tajam",
      "/edit FB-123 buat lebih singkat",
      "/scout instagram tren hotel terbaru",
      "/topics instagram"
    ]
  };
}

export async function simulateCreatorDrafts(input?: {
  platform?: string;
  count?: number;
  topic?: string;
  role?: CreatorRole;
  tone?: CreatorTone;
  objective?: CreatorObjective;
  type?: CreatorDraftType;
}) {
  const platform = normalizePlatform(input?.platform);
  const meta = getPlatformMeta(platform);
  const profile = await getCreatorProfile(platform);
  const styleMemory = await buildStyleMemorySummary(platform);
  const count = Math.max(1, Math.min(Number(input?.count ?? 1), 3));
  const role = (input?.role ?? profile.defaultRole) as CreatorRole;
  const tone = (input?.tone ?? profile.defaultTone) as CreatorTone;
  const objective = (input?.objective ?? profile.objective) as CreatorObjective;
  const type = (input?.type ?? meta.defaultType) as CreatorDraftType;
  const manualTopic = input?.topic?.trim();
  const generatedDrafts: GeneratedDraftSeed[] = [];
  const topicReferences: string[] = [];

  if (manualTopic) {
    const raw = await callCreatorModel(
      buildPlatformPrompt({
        platform,
        profile,
        styleMemory,
        count,
        topic: manualTopic,
        role,
        tone,
        objective
      })
    );
    const parsed = parseJsonPayload(raw) as { drafts?: GeneratedDraftSeed[] };
    generatedDrafts.push(...(Array.isArray(parsed.drafts) ? parsed.drafts.slice(0, count) : []));
  } else {
    const topicBriefs = await ensureTopicBriefPool(platform, profile, count);

    for (const topicBrief of topicBriefs) {
      const raw = await callCreatorModel(
        buildPlatformPrompt({
          platform,
          profile,
          styleMemory,
          count: 1,
          topic: buildDraftTopicInstruction(mapTopicBrief(topicBrief)),
          role,
          tone,
          objective
        })
      );
      const parsed = parseJsonPayload(raw) as { drafts?: GeneratedDraftSeed[] };
      const firstDraft = Array.isArray(parsed.drafts) ? parsed.drafts[0] : undefined;

      if (firstDraft) {
        generatedDrafts.push(firstDraft);
        topicReferences.push(topicBrief.topic);
      }
    }
  }

  if (generatedDrafts.length === 0) {
    throw new Error("AI did not return any preview draft.");
  }

  const previews: CreatorDraft[] = [];

  for (const [index, generatedDraft] of generatedDrafts.slice(0, count).entries()) {
    const previewTime = now();
    const parts = normalizeGeneratedParts(generatedDraft.parts, type, platform);
    const caption = String(generatedDraft.caption ?? "").trim() || buildCaptionFromParts(parts);
    const visualPrompt = composeBrandedVisualPrompt(
      platform,
      profile,
      {
        topic: String(generatedDraft.topic ?? input?.topic ?? `${meta.label} preview`).trim() || `${meta.label} preview`,
        caption
      },
      generatedDraft
    );
    const image = await generateVisualIfNeeded(platform, profile, {
      topic: String(generatedDraft.topic ?? input?.topic ?? `${meta.label} preview`).trim() || `${meta.label} preview`,
      caption,
      visualPrompt,
      visualConcept: generatedDraft
    });

    previews.push({
      id: `preview-${platform}-${index + 1}`,
      draftId: `PREVIEW-${index + 1}`,
      creatorId: CREATOR_ID,
      platform,
      type,
      role,
      tone,
      objective,
      topic:
        String(generatedDraft.topic ?? manualTopic ?? topicReferences[index] ?? `${meta.label} preview`).trim() ||
        `${meta.label} preview`,
      hookStyle: String(generatedDraft.hookStyle ?? "curiosity").trim() || "curiosity",
      visualPrompt,
      imageUrl: image.imageUrl,
      imageProvider: image.imageProvider,
      imageError: image.imageError,
      imageAspectRatio: profile.generateImages ? profile.imageAspectRatio : undefined,
      caption,
      status: "draft",
      currentVersion: 1,
      parts,
      versions: [
        {
          version: 1,
          parts,
          caption,
          visualPrompt,
          imageUrl: image.imageUrl,
          imageError: image.imageError,
          createdAt: previewTime.toISOString()
        }
      ],
      publishAttempts: 0,
      createdAt: previewTime.toISOString(),
      updatedAt: previewTime.toISOString()
    });
  }

  return previews;
}

export async function runCreatorPlayground(input?: {
  platform?: string;
  count?: number;
  topic?: string;
  role?: CreatorRole;
  tone?: CreatorTone;
  objective?: CreatorObjective;
  type?: CreatorDraftType;
  simulateUpload?: boolean;
}) {
  const drafts = await simulateCreatorDrafts(input);
  const simulations = input?.simulateUpload
    ? await Promise.all(drafts.map((draft) => simulatePlatformPublish(draft)))
    : [];

  return {
    drafts,
    simulations
  };
}

export async function generateCreatorDrafts(input?: {
  platform?: string;
  count?: number;
  topic?: string;
  role?: CreatorRole;
  tone?: CreatorTone;
  objective?: CreatorObjective;
  type?: CreatorDraftType;
  autoSend?: boolean;
}) {
  const platform = normalizePlatform(input?.platform);
  const meta = getPlatformMeta(platform);
  const profile = await getCreatorProfile(platform);
  const styleMemory = await buildStyleMemorySummary(platform);
  const count = Math.max(1, Math.min(Number(input?.count ?? profile.postsPerDay), 5));
  const role = (input?.role ?? profile.defaultRole) as CreatorRole;
  const tone = (input?.tone ?? profile.defaultTone) as CreatorTone;
  const objective = (input?.objective ?? profile.objective) as CreatorObjective;
  const type = (input?.type ?? meta.defaultType) as CreatorDraftType;
  const autoSend = input?.autoSend !== false;
  const manualTopic = input?.topic?.trim();
  const generatedDrafts: Array<{
    seed: GeneratedDraftSeed;
    topicBriefId?: ObjectId;
    fallbackTopic?: string;
  }> = [];

  if (manualTopic) {
    const raw = await callCreatorModel(
      buildPlatformPrompt({
        platform,
        profile,
        styleMemory,
        count,
        topic: manualTopic,
        role,
        tone,
        objective
      })
    );
    const parsed = parseJsonPayload(raw) as { drafts?: GeneratedDraftSeed[] };
    const draftsFromModel = Array.isArray(parsed.drafts) ? parsed.drafts.slice(0, count) : [];
    draftsFromModel.forEach((seed) => generatedDrafts.push({ seed, fallbackTopic: manualTopic }));
  } else {
    const topicBriefs = await ensureTopicBriefPool(platform, profile, count);

    for (const topicBrief of topicBriefs) {
      const mappedBrief = mapTopicBrief(topicBrief);
      const raw = await callCreatorModel(
        buildPlatformPrompt({
          platform,
          profile,
          styleMemory,
          count: 1,
          topic: buildDraftTopicInstruction(mappedBrief),
          role,
          tone,
          objective
        })
      );
      const parsed = parseJsonPayload(raw) as { drafts?: GeneratedDraftSeed[] };
      const firstDraft = Array.isArray(parsed.drafts) ? parsed.drafts[0] : undefined;

      if (firstDraft) {
        generatedDrafts.push({
          seed: firstDraft,
          topicBriefId: topicBrief._id,
          fallbackTopic: topicBrief.topic
        });
      }
    }
  }

  if (generatedDrafts.length === 0) {
    throw new Error("AI did not return any draft.");
  }

  const { drafts } = await getCollections();
  const createdDrafts: CreatorDraft[] = [];

  for (const generated of generatedDrafts.slice(0, count)) {
    const generatedDraft = generated.seed;
    const createdAt = now();
    const parts = normalizeGeneratedParts(generatedDraft.parts, type, platform);
    const caption = String(generatedDraft.caption ?? "").trim() || buildCaptionFromParts(parts);
    const visualPrompt = composeBrandedVisualPrompt(
      platform,
      profile,
      {
        topic:
          String(generatedDraft.topic ?? manualTopic ?? generated.fallbackTopic ?? `${meta.label} content`).trim() ||
          `${meta.label} content`,
        caption
      },
      generatedDraft
    );
    const image = await generateVisualIfNeeded(platform, profile, {
      topic:
        String(generatedDraft.topic ?? manualTopic ?? generated.fallbackTopic ?? `${meta.label} content`).trim() ||
        `${meta.label} content`,
      caption,
      visualPrompt,
      visualConcept: generatedDraft
    });

    const document: CreatorDraftDocument = {
      draftId: buildDraftIdentifier(platform),
      creatorId: CREATOR_ID,
      platform,
      type,
      role,
      tone,
      objective,
      topic:
        String(generatedDraft.topic ?? manualTopic ?? generated.fallbackTopic ?? `${meta.label} content`).trim() ||
        `${meta.label} content`,
      hookStyle: String(generatedDraft.hookStyle ?? "curiosity").trim() || "curiosity",
      visualPrompt,
      imageUrl: image.imageUrl,
      imageProvider: image.imageProvider,
      imageError: image.imageError,
      imageAspectRatio: profile.generateImages ? profile.imageAspectRatio : undefined,
      caption,
      status: "draft",
      currentVersion: 1,
      parts,
      versions: [
        {
          version: 1,
          parts,
          caption,
          visualPrompt,
          imageUrl: image.imageUrl,
          imageError: image.imageError,
          createdAt
        }
      ],
      approvalPhone: profile.approvalPhone || undefined,
      approvalAttempts: 0,
      publishAttempts: 0,
      createdAt,
      updatedAt: createdAt
    };

    const result = await drafts.insertOne(document);
    document._id = result.insertedId;
    const mappedDraft = mapDraft(document);
    createdDrafts.push(mappedDraft);
    await markTopicBriefUsed(generated.topicBriefId, mappedDraft.draftId);

    if (autoSend && profile.approvalPhone) {
      await sendDraftToApprovalChannel(document, profile, { source: "dashboard" });
    }
  }

  return createdDrafts;
}

export async function simulateCreatorDraftUpload(draftId: string) {
  const document = await findDraftDocumentById(draftId);

  if (!document) {
    throw new Error("Draft not found.");
  }

  const draft = mapDraft(document);
  const simulation = await simulatePlatformPublish(draft);

  await logPublishOutcome({
    draftId: draft.draftId,
    platform: draft.platform,
    provider: simulation.provider,
    status: "simulated",
    simulated: true,
    targetLabel: simulation.targetLabel,
    summary: simulation.summary,
    error: simulation.error
  });

  return simulation;
}

export async function publishCreatorDraft(
  draftId: string,
  options?: {
    force?: boolean;
    retryOnFailure?: boolean;
  }
) {
  const settings = await readSettings();
  const document = await findDraftDocumentById(draftId);

  if (!document) {
    throw new Error("Draft not found.");
  }

  if (!options?.force && !settings.autoPostEnabled) {
    throw new Error("Auto-post masih nonaktif di root Settings.");
  }

  if (document.status === "rejected") {
    throw new Error("Draft rejected tidak bisa dipublish.");
  }

  if (document.status === "pending_approval") {
    throw new Error("Draft masih menunggu approval.");
  }

  if (document.status === "posted") {
    throw new Error("Draft ini sudah dipublish.");
  }

  const { drafts } = await getCollections();
  const attemptNumber = (document.publishAttempts ?? 0) + 1;
  const actionTime = now();

  try {
    const result = await publishDraftToPlatform(mapDraft(document));

    await drafts.updateOne(
      { _id: document._id },
      {
        $set: {
          status: "posted",
          publishProvider: result.provider,
          publishTargetLabel: result.targetLabel,
          publishAttempts: attemptNumber,
          publishedAt: actionTime,
          externalPostId: result.externalPostId,
          externalPostUrl: result.externalPostUrl,
          lastPublishSummary: result.summary,
          updatedAt: actionTime
        },
        $unset: {
          lastPublishError: ""
        }
      }
    );

    await logPublishOutcome({
      draftId: document.draftId,
      platform: document.platform,
      provider: result.provider,
      status: "success",
      simulated: false,
      targetLabel: result.targetLabel,
      externalPostId: result.externalPostId,
      externalPostUrl: result.externalPostUrl,
      summary: result.summary
    });

    return {
      success: true as const,
      draft: mapDraft((await findDraftDocumentById(draftId)) as CreatorDraftDocument),
      summary: result.summary
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Publish gagal.";
    const nextRetryAt = options?.retryOnFailure ? getNextPublishRetryTime(attemptNumber) : null;
    const willRetry = Boolean(nextRetryAt);
    const failureSummary = willRetry
      ? `Publish attempt ${attemptNumber} gagal. Retry dijadwalkan untuk ${nextRetryAt?.toLocaleString("id-ID")}. ${reason}`
      : reason;

    await drafts.updateOne(
      { _id: document._id },
      {
        $set: {
          status: willRetry ? "scheduled" : "failed",
          publishAttempts: attemptNumber,
          lastPublishError: reason,
          lastPublishSummary: failureSummary,
          ...(nextRetryAt ? { scheduledFor: nextRetryAt } : {}),
          updatedAt: actionTime
        }
      }
    );

    await logPublishOutcome({
      draftId: document.draftId,
      platform: document.platform,
      provider: document.platform === "linkedin" ? "linkedin" : "meta",
      status: "failed",
      simulated: false,
      targetLabel: document.publishTargetLabel,
      summary: failureSummary,
      error: reason
    });

    return {
      success: false as const,
      retryScheduled: willRetry,
      draft: mapDraft((await findDraftDocumentById(draftId)) as CreatorDraftDocument),
      summary: failureSummary
    };
  }
}

export async function processDueCreatorDrafts(options?: {
  force?: boolean;
  limit?: number;
}) {
  const settings = await readSettings();

  if (!options?.force && !settings.autoPostEnabled) {
    return {
      processed: 0,
      posted: 0,
      failed: 0,
      skipped: 0,
      reason: "Auto-post masih nonaktif."
    };
  }

  const { drafts } = await getCollections();
  const dueDrafts = await drafts
    .find({
      creatorId: CREATOR_ID,
      status: "scheduled",
      scheduledFor: { $lte: now() }
    })
    .sort({ scheduledFor: 1 })
    .limit(Math.max(1, Math.min(Number(options?.limit ?? 12), 50)))
    .toArray();

  let posted = 0;
  let failed = 0;
  let rescheduled = 0;

  for (const document of dueDrafts) {
    const result = await publishCreatorDraft(document.draftId, { force: true, retryOnFailure: true });

    if (result.success) {
      posted += 1;
    } else if (result.retryScheduled) {
      rescheduled += 1;
    } else {
      failed += 1;
    }
  }

  return {
    processed: dueDrafts.length,
    posted,
    rescheduled,
    failed,
    skipped: 0,
    reason: dueDrafts.length === 0 ? "Tidak ada draft due untuk dipublish." : ""
  };
}

export async function sendDraftApprovalMessage(draftId: string) {
  const { drafts } = await getCollections();
  const document = await drafts.findOne({ draftId, creatorId: CREATOR_ID });

  if (!document) {
    throw new Error("Draft not found.");
  }

  const profile = await getCreatorProfile(document.platform);

  if (!profile.approvalPhone) {
    throw new Error("Approval phone is not configured.");
  }

  const result = await sendDraftToApprovalChannel(document, profile, { source: "dashboard" });

  if (!result.success) {
    throw new Error(result.reason);
  }

  return true;
}

export async function applyCreatorDraftAction(
  draftId: string,
  action: CreatorApprovalAction,
  options?: {
    source?: "dashboard" | "whatsapp";
    phone?: string;
    instruction?: string;
  }
) {
  const { drafts } = await getCollections();
  const document = await drafts.findOne({ draftId, creatorId: CREATOR_ID });

  if (!document) {
    throw new Error("Draft not found.");
  }

  const profile = await getCreatorProfile(document.platform);
  const source = options?.source ?? "dashboard";
  const actionTime = now();

  if (action === "approve") {
    const scheduledFor = await pickNextScheduleSlot(profile);
    await drafts.updateOne(
      { _id: document._id },
      {
        $set: {
          status: "scheduled",
          approvedAt: actionTime,
          scheduledFor,
          lastPublishSummary: `Scheduled for ${scheduledFor.toISOString()}`,
          updatedAt: actionTime
        },
        $unset: {
          lastApprovalError: "",
          lastPublishError: "",
          publishedAt: "",
          externalPostId: "",
          externalPostUrl: ""
        }
      }
    );

    await logApprovalAction(draftId, document.platform, action, source, `Scheduled for ${scheduledFor.toISOString()}`, options?.phone);
    return {
      draft: mapDraft((await drafts.findOne({ _id: document._id })) as CreatorDraftDocument),
      reply: `Draft ${draftId} (${getPlatformMeta(document.platform).label}) disetujui dan masuk antrean publish untuk ${scheduledFor.toLocaleString("id-ID")}.`
    };
  }

  if (action === "reject" || action === "skip") {
    await drafts.updateOne(
      { _id: document._id },
      {
        $set: {
          status: "rejected",
          rejectedAt: actionTime,
          updatedAt: actionTime
        }
      }
    );

    await logApprovalAction(draftId, document.platform, action, source, options?.instruction, options?.phone);
    return {
      draft: mapDraft((await drafts.findOne({ _id: document._id })) as CreatorDraftDocument),
      reply: `Draft ${draftId} (${getPlatformMeta(document.platform).label}) ditandai ${action === "reject" ? "rejected" : "skip"}.`
    };
  }

  if (action === "regen" || action === "edit") {
    const currentDraft = mapDraft(document);
    const nextVersion = document.currentVersion + 1;
    const nextDraft = await createRegeneratedDraft(currentDraft, profile, options?.instruction);

    await drafts.updateOne(
      { _id: document._id },
      {
        $set: {
          topic: nextDraft.topic,
          hookStyle: nextDraft.hookStyle,
          caption: nextDraft.caption,
          visualPrompt: nextDraft.visualPrompt,
          imageUrl: nextDraft.imageUrl,
          imageProvider: nextDraft.imageProvider,
          imageError: nextDraft.imageError,
          imageAspectRatio: profile.generateImages ? profile.imageAspectRatio : undefined,
          parts: nextDraft.parts,
          currentVersion: nextVersion,
          status: "draft",
          approvalPhone: profile.approvalPhone || undefined,
          updatedAt: actionTime
        },
        $unset: {
          approvalSentAt: "",
          lastApprovalError: "",
          scheduledFor: "",
          publishedAt: "",
          externalPostId: "",
          externalPostUrl: "",
          lastPublishError: "",
          lastPublishSummary: ""
        },
        $push: {
          versions: {
            version: nextVersion,
            instruction: options?.instruction,
            parts: nextDraft.parts,
            caption: nextDraft.caption,
            visualPrompt: nextDraft.visualPrompt,
            imageUrl: nextDraft.imageUrl,
            imageError: nextDraft.imageError,
            createdAt: actionTime
          }
        }
      }
    );

    await logApprovalAction(draftId, document.platform, action, source, options?.instruction, options?.phone);

    if (profile.approvalPhone) {
      const sendResult = await sendDraftToApprovalChannel(
        (await drafts.findOne({ _id: document._id })) as CreatorDraftDocument,
        profile,
        { source, phone: options?.phone }
      );

      if (!sendResult.success) {
        return {
          draft: mapDraft((await drafts.findOne({ _id: document._id })) as CreatorDraftDocument),
          reply: `Draft ${draftId} diperbarui, tapi kirim ke approval gagal: ${sendResult.reason}`
        };
      }
    }

    return {
      draft: mapDraft((await drafts.findOne({ _id: document._id })) as CreatorDraftDocument),
      reply:
        action === "edit"
          ? `Draft ${draftId} (${getPlatformMeta(document.platform).label}) sudah dirombak sesuai instruksi dan versi baru sudah dikirim.`
          : `Draft ${draftId} (${getPlatformMeta(document.platform).label}) sudah diregenerate dan versi baru sudah dikirim.`
    };
  }

  throw new Error("Unsupported draft action.");
}

export async function handleCreatorApprovalCommand(from: string, message: string) {
  const trimmed = message.trim();

  if (!trimmed.startsWith("/")) {
    return { matched: false as const };
  }

  const profiles = await listAllCreatorProfiles();
  const matchedPlatforms = profiles.filter((profile) => phonesMatch(profile.approvalPhone, from)).map((profile) => profile.platform);

  if (matchedPlatforms.length === 0) {
    return { matched: false as const };
  }

  const command = trimmed.split(/\s+/)[0].toLowerCase();
  const scoutCommands = new Set(["/scout", "/topic-scout"]);
  const topicListCommands = new Set(["/topics", "/topic-list"]);

  if (scoutCommands.has(command)) {
    const { platform, query } = normalizeScoutInstruction(trimmed, matchedPlatforms);
    const result = await runCreatorTopicScout({
      platform,
      query,
      limit: 20
    });
    const preview = result.topics.slice(0, 5).map((item, index) => `${index + 1}. ${item.topic}`).join("\n");

    return {
      matched: true as const,
      reply: [
        `Topic Scout ${getPlatformMeta(result.platform as CreatorPlatform).label} selesai.`,
        `Query: ${result.query}`,
        `Disimpan: ${result.saved} topik baru.`,
        preview ? `Preview:\n${preview}` : "",
        "",
        "Kirim generate draft tanpa isi topic agar sistem ambil dari pool topik fresh."
      ]
        .filter(Boolean)
        .join("\n")
    };
  }

  if (topicListCommands.has(command)) {
    const { platform } = normalizeScoutInstruction(trimmed, matchedPlatforms);
    const topics = await listCreatorTopicBriefs(platform, { limit: 8, status: "fresh" });

    return {
      matched: true as const,
      reply:
        topics.length === 0
          ? `Belum ada topik fresh untuk ${getPlatformMeta(platform).label}. Jalankan /scout ${platform} dulu.`
          : [
              `Topik fresh ${getPlatformMeta(platform).label}:`,
              ...topics.map((item, index) => `${index + 1}. ${item.topic}`),
              "",
              "Generate draft tanpa isi topic untuk memakai antrean ini."
            ].join("\n")
    };
  }

  const actionMap: Record<string, CreatorApprovalAction | undefined> = {
    "/approve": "approve",
    "/reject": "reject",
    "/regen": "regen",
    "/edit": "edit",
    "/skip": "skip"
  };
  const action = actionMap[command];

  if (!action) {
    return { matched: false as const };
  }

  const { draftReference, instruction } = normalizeActionInstruction(trimmed, action);
  const targetDraft = await resolveDraftByReference(draftReference, matchedPlatforms);

  if (!targetDraft) {
    return {
      matched: true as const,
      reply: draftReference
        ? `Draft ${draftReference} tidak ditemukan untuk approval.`
        : "Belum ada draft pending approval untuk nomor ini."
    };
  }

  if (action === "edit" && !instruction) {
    return {
      matched: true as const,
      reply: `Tambahkan instruksi edit, misalnya: /edit ${targetDraft.draftId} buat lebih tajam dan singkat`
    };
  }

  const result = await applyCreatorDraftAction(targetDraft.draftId, action, {
    source: "whatsapp",
    phone: from,
    instruction
  });

  return {
    matched: true as const,
    reply: result.reply
  };
}

