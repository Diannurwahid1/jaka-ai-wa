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
