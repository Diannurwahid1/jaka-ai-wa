export type CreatorRole =
  | "owner"
  | "informative"
  | "educational"
  | "storytelling"
  | "personal-branding"
  | "opinion"
  | "viral";

export type CreatorTone = "sharp" | "casual" | "confident" | "warm" | "bold";
export type CreatorObjective = "engagement" | "authority" | "awareness" | "soft-selling";
export type CreatorPlatform = "threads" | "instagram" | "linkedin" | "facebook";
export type CreatorDraftStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "scheduled"
  | "posted"
  | "failed";
export type CreatorDraftType = "thread_series" | "single_post";
export type CreatorKnowledgeType =
  | "brand"
  | "audience"
  | "offer"
  | "faq"
  | "style"
  | "idea-bank"
  | "proof";
export type ThreadPartType = "hook" | "context" | "insight" | "expansion" | "cta";
export type CreatorApprovalAction = "approve" | "reject" | "regen" | "edit" | "skip" | "send";
export type CreatorAspectRatio = "1:1" | "4:5" | "16:9";
export type CreatorPublishProvider = "meta" | "linkedin" | "unsupported";
export type CreatorPublishOutcomeStatus = "success" | "failed" | "simulated";
export type CreatorTopicBriefStatus = "fresh" | "used" | "archived";

export type CreatorScheduleSlot = {
  label: string;
  time: string;
};

export type CreatorProfile = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

export type CreatorKnowledgeItem = {
  id: string;
  creatorId: string;
  platform: CreatorPlatform | "all";
  type: CreatorKnowledgeType;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreatorThreadPart = {
  index: number;
  type: ThreadPartType;
  content: string;
};

export type CreatorDraftVersion = {
  version: number;
  instruction?: string;
  parts: CreatorThreadPart[];
  caption?: string;
  visualPrompt?: string;
  imageUrl?: string;
  imageError?: string;
  createdAt: string;
};

export type CreatorDraft = {
  id: string;
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
  status: CreatorDraftStatus;
  currentVersion: number;
  parts: CreatorThreadPart[];
  versions: CreatorDraftVersion[];
  approvalPhone?: string;
  approvalAttempts?: number;
  approvalSentAt?: string;
  lastApprovalError?: string;
  approvedAt?: string;
  rejectedAt?: string;
  scheduledFor?: string;
  publishProvider?: CreatorPublishProvider;
  publishTargetLabel?: string;
  publishAttempts: number;
  publishedAt?: string;
  externalPostId?: string;
  externalPostUrl?: string;
  lastPublishError?: string;
  lastPublishSummary?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatorTopicBriefReference = {
  title: string;
  url: string;
  snippet?: string;
};

export type CreatorTopicBrief = {
  id: string;
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
  status: CreatorTopicBriefStatus;
  references: CreatorTopicBriefReference[];
  usedAt?: string;
  usedByDraftId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatorPublishSimulation = {
  draftId: string;
  platform: CreatorPlatform;
  provider: CreatorPublishProvider;
  supported: boolean;
  simulated: boolean;
  targetLabel: string;
  mode: "text" | "image";
  summary: string;
  steps: string[];
  warnings: string[];
  requestPreview: Record<string, unknown>;
  error?: string;
};

export type CreatorPublishLog = {
  id: string;
  draftId: string;
  platform: CreatorPlatform;
  provider: CreatorPublishProvider;
  status: CreatorPublishOutcomeStatus;
  simulated: boolean;
  targetLabel?: string;
  externalPostId?: string;
  externalPostUrl?: string;
  summary: string;
  error?: string;
  createdAt: string;
};

export type CreatorApprovalLog = {
  id: string;
  draftId: string;
  action: CreatorApprovalAction;
  source: "dashboard" | "whatsapp";
  phone?: string;
  detail?: string;
  createdAt: string;
};

export type CreatorOverview = {
  profile: CreatorProfile;
  drafts: CreatorDraft[];
  topicBriefs: CreatorTopicBrief[];
  platform: CreatorPlatform;
  stats: {
    totalDrafts: number;
    pendingApproval: number;
    scheduled: number;
    rejected: number;
    posted: number;
    failed: number;
  };
  publishLogs: CreatorPublishLog[];
  commandHelp: string[];
};
