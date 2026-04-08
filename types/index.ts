export type MessageSource = "webhook" | "manual" | "broadcast";
export type MessageStatus = "success" | "failed" | "pending";
export type MessageIntent = "order" | "question" | "complaint" | "general";

export type MessageLog = {
  id: string;
  from: string;
  message: string;
  reply: string;
  source: MessageSource;
  status: MessageStatus;
  intent: MessageIntent;
  createdAt: string;
  error?: string;
};

export type AppSettings = {
  aiApiUrl: string;
  aiApiKey: string;
  aiModel: string;
  promptSystem: string;
  waApiUrl: string;
  waSessionId: string;
  waToken: string;
  waMasterKey: string;
  mongodbUri: string;
  mongodbDb: string;
  ragCollection: string;
  ragIndexName: string;
  embeddingProvider: string;
  embeddingApiKey: string;
  embeddingModel: string;
  embeddingDimensions: string;
  embeddingBaseUrl: string;
  bytePlusApiKey: string;
  bytePlusBaseUrl: string;
  bytePlusImageModel: string;
  topicScoutSearchApiKey: string;
  topicScoutSearchUrl: string;
  topicScoutModelApiKey: string;
  topicScoutModelBaseUrl: string;
  topicScoutModel: string;
  topicScoutDefaultQuery: string;
  metaAppId: string;
  metaAppSecret: string;
  metaGraphVersion: string;
  metaFacebookPageId: string;
  metaFacebookPageName: string;
  metaInstagramBusinessId: string;
  metaInstagramUsername: string;
  metaPageAccessToken: string;
  metaPageTokenExpiresAt: string;
  threadsUserId: string;
  threadsUsername: string;
  threadsAccessToken: string;
  threadsTokenExpiresAt: string;
  threadsApiVersion: string;
  threadsApiBaseUrl: string;
  linkedinClientId: string;
  linkedinClientSecret: string;
  linkedinRedirectUri: string;
  linkedinAccessToken: string;
  linkedinRefreshToken: string;
  linkedinTokenExpiresAt: string;
  linkedinAuthorUrn: string;
  linkedinOrganizationUrn: string;
  linkedinApiVersion: string;
  autoPostEnabled: boolean;
  schedulerSecret: string;
};

export type DashboardOverview = {
  stats: {
    inbound: number;
    replied: number;
    success: number;
    failed: number;
  };
  waStatus: "connected" | "disconnected";
  aiStatus: "ready" | "missing";
  recent: MessageLog[];
};

