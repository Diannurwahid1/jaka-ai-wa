import { NextRequest, NextResponse } from "next/server";

import { testAIConnection } from "@/lib/ai";
import { testEmbeddingConnection } from "@/lib/rag";
import { readSettings } from "@/lib/settings";
import { testLinkedInConnection, testMetaConnection, testThreadsConnection } from "@/lib/social";
import { testWAConnection } from "@/lib/wa";
import { DashboardConnectionCheck } from "@/types";

type ConnectionKey = DashboardConnectionCheck["key"];

const connectionMeta: Record<
  ConnectionKey,
  {
    label: string;
    affectedSettings: string[];
    validate: (settings: Awaited<ReturnType<typeof readSettings>>) => string[];
    run: () => Promise<{ summary: string }>;
  }
> = {
  ai: {
    label: "AI Provider",
    affectedSettings: ["AI API URL", "AI API Key", "Model", "Prompt System"],
    validate: (settings) => {
      const missing: string[] = [];
      if (!settings.aiApiUrl.trim()) missing.push("AI API URL");
      if (!settings.aiApiKey.trim()) missing.push("AI API Key");
      if (!settings.aiModel.trim()) missing.push("Model");
      return missing;
    },
    run: testAIConnection
  },
  wa: {
    label: "WA Blast",
    affectedSettings: ["WA API URL", "Session ID", "WA Token"],
    validate: (settings) => {
      const missing: string[] = [];
      if (!settings.waApiUrl.trim()) missing.push("WA API URL");
      if (!settings.waSessionId.trim()) missing.push("Session ID");
      if (!settings.waToken.trim()) missing.push("WA Token");
      return missing;
    },
    run: testWAConnection
  },
  embedding: {
    label: "MongoDB / Embedding",
    affectedSettings: [
      "MongoDB URI",
      "Database",
      "RAG Collection",
      "Vector Index Name",
      "Embedding Provider",
      "Embedding API Key",
      "Embedding Model",
      "Embedding Dimensions",
      "Embedding Base URL"
    ],
    validate: (settings) => {
      const missing: string[] = [];
      if (!settings.mongodbUri.trim()) missing.push("MongoDB URI");
      if (!settings.mongodbDb.trim()) missing.push("Database");
      if (!settings.ragCollection.trim()) missing.push("RAG Collection");
      if (!settings.ragIndexName.trim()) missing.push("Vector Index Name");
      if (!settings.embeddingProvider.trim()) missing.push("Embedding Provider");
      if (!settings.embeddingModel.trim()) missing.push("Embedding Model");
      if (!settings.embeddingDimensions.trim()) missing.push("Embedding Dimensions");
      if (settings.embeddingProvider.trim().toLowerCase() !== "ollama" && !settings.embeddingApiKey.trim()) {
        missing.push("Embedding API Key");
      }
      return missing;
    },
    run: async () => {
      const result = await testEmbeddingConnection();
      return {
        summary: `${result.provider} / ${result.model} OK (${result.vectorLength} dimensi).`
      };
    }
  },
  meta: {
    label: "Meta Facebook / Instagram",
    affectedSettings: [
      "Facebook Page ID",
      "Page Access Token",
      "Meta Graph Version"
    ],
    validate: (settings) => {
      const missing: string[] = [];
      if (!settings.metaFacebookPageId.trim()) missing.push("Facebook Page ID");
      if (!settings.metaPageAccessToken.trim()) missing.push("Page Access Token");
      return missing;
    },
    run: async () => {
      const result = await testMetaConnection();
      return { summary: result.summary };
    }
  },
  threads: {
    label: "Threads",
    affectedSettings: ["Threads User ID", "Threads Username", "Threads Access Token", "Threads API Version", "Threads API Base URL"],
    validate: (settings) => {
      const missing: string[] = [];
      if (!settings.threadsAccessToken.trim()) missing.push("Threads Access Token");
      return missing;
    },
    run: async () => {
      const result = await testThreadsConnection();
      return { summary: result.summary };
    }
  },
  linkedin: {
    label: "LinkedIn",
    affectedSettings: [
      "LinkedIn Access Token",
      "LinkedIn Author URN / Organization URN"
    ],
    validate: (settings) => {
      const missing: string[] = [];
      if (!settings.linkedinAccessToken.trim()) missing.push("LinkedIn Access Token");
      if (!settings.linkedinAuthorUrn.trim() && !settings.linkedinOrganizationUrn.trim()) {
        missing.push("LinkedIn Author URN / Organization URN");
      }
      return missing;
    },
    run: async () => {
      const result = await testLinkedInConnection();
      return { summary: result.summary };
    }
  }
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { key?: string };
  const key = String(body?.key ?? "").trim() as ConnectionKey;

  try {
    if (!key || !(key in connectionMeta)) {
      return NextResponse.json({ ok: false, reason: "Unknown connection key" }, { status: 400 });
    }

    const settings = await readSettings();
    const meta = connectionMeta[key];
    const missingFields = meta.validate(settings);

    if (missingFields.length > 0) {
      const payload: DashboardConnectionCheck = {
        key,
        label: meta.label,
        status: "failed",
        summary: `Setting belum lengkap: ${missingFields.join(", ")}.`,
        affectedSettings: missingFields,
        checkedAt: new Date().toISOString()
      };

      return NextResponse.json({ ok: true, check: payload });
    }

    const result = await meta.run();
    const payload: DashboardConnectionCheck = {
      key,
      label: meta.label,
      status: "healthy",
      summary: result.summary,
      affectedSettings: [],
      checkedAt: new Date().toISOString()
    };

    return NextResponse.json({ ok: true, check: payload });
  } catch (error) {
    const meta = connectionMeta[key] ?? {
      label: "Unknown",
      affectedSettings: []
    };
    const reason = error instanceof Error ? error.message : "Unknown error";
    const payload: DashboardConnectionCheck = {
      key: key || "ai",
      label: meta.label,
      status: "failed",
      summary: reason,
      affectedSettings: meta.affectedSettings,
      checkedAt: new Date().toISOString()
    };

    return NextResponse.json({ ok: true, check: payload });
  }
}
