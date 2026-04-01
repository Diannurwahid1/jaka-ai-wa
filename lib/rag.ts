import { randomUUID } from "node:crypto";

import { MongoClient } from "mongodb";
import MongoRAG, { MongoRAGSearchResult } from "mongodb-rag";

import { readSettings } from "@/lib/settings";

type KnowledgeInput = {
  title: string;
  content: string;
  category?: string;
};

export type KnowledgeResult = {
  title: string;
  content: string;
  category?: string;
  score?: number;
  documentId?: string;
  createdAt?: string;
};

type RagRuntimeConfig = {
  mongoUrl: string;
  database: string;
  collection: string;
  indexName: string;
  embeddingFieldPath: string;
  embedding: {
    provider: string;
    apiKey?: string;
    model: string;
    baseUrl?: string;
    dimensions: number;
  };
};

const FALLBACK_ANSWER = "Maaf, informasi belum tersedia ya \uD83D\uDE4F";
const DEFAULT_MONGODB_EMBEDDING_BASE_URL = "https://ai.mongodb.com/v1";
const DEFAULT_MONGODB_EMBEDDING_MODEL = "voyage-4-large";
const DEFAULT_MONGODB_EMBEDDING_DIMENSION = 1024;
const VOYAGE_MODEL_DIMENSIONS: Record<string, number[]> = {
  "voyage-4-large": [1024, 256, 512, 2048],
  "voyage-4": [1024, 256, 512, 2048],
  "voyage-4-lite": [1024, 256, 512, 2048],
  "voyage-4-nano": [1024, 256, 512, 2048],
  "voyage-code-3": [1024, 256, 512, 2048],
  "voyage-context-3": [1024, 256, 512, 2048],
  "voyage-3-large": [1024, 256, 512, 2048],
  "voyage-3.5": [1024, 256, 512, 2048],
  "voyage-3.5-lite": [1024, 256, 512, 2048],
  "voyage-3": [1024],
  "voyage-finance-2": [1024],
  "voyage-law-2": [1024],
  "voyage-multilingual-2": [1024],
  "voyage-3-lite": [512],
  "voyage-code-2": [1536]
};

let mongoClientPromise: Promise<MongoClient> | null = null;
let ragClientPromise: Promise<MongoRAG> | null = null;
let activeConfigSignature = "";

function buildSignature(config: RagRuntimeConfig) {
  return JSON.stringify(config);
}

function normalizeProvider(provider: string) {
  return provider.trim().toLowerCase();
}

function usesAtlasEmbeddingProvider(provider: string) {
  const normalized = normalizeProvider(provider);
  return normalized === "mongodb" || normalized === "voyage" || normalized === "atlas";
}

function usesMongoRagProvider(provider: string) {
  return !usesAtlasEmbeddingProvider(provider);
}

export function getSuggestedEmbeddingDimensions(provider: string, model: string) {
  if (!usesAtlasEmbeddingProvider(provider)) {
    return [] as number[];
  }

  return VOYAGE_MODEL_DIMENSIONS[model.trim().toLowerCase()] ?? [];
}

function extractEmbedding(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Atlas embedding response is invalid.");
  }

  const data = (payload as { data?: unknown }).data;

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Atlas embedding response does not contain vectors.");
  }

  const first = data[0];

  if (!first || typeof first !== "object") {
    throw new Error("Atlas embedding vector is invalid.");
  }

  const embedding = (first as { embedding?: unknown }).embedding;

  if (!Array.isArray(embedding)) {
    throw new Error("Atlas embedding response is missing the embedding array.");
  }

  return embedding.map((value) => Number(value));
}

async function createAtlasEmbedding(
  config: RagRuntimeConfig,
  input: string
): Promise<number[]> {
  const endpoint = `${(config.embedding.baseUrl || DEFAULT_MONGODB_EMBEDDING_BASE_URL).replace(/\/$/, "")}/embeddings`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.embedding.apiKey}`
    },
    body: JSON.stringify({
      input: [input],
      model: config.embedding.model || DEFAULT_MONGODB_EMBEDDING_MODEL
    }),
    signal: AbortSignal.timeout(25000)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`MongoDB Atlas embedding request failed (${response.status}): ${detail}`);
  }

  const payload = await response.json();
  return extractEmbedding(payload);
}

async function getRuntimeConfig(): Promise<RagRuntimeConfig> {
  const settings = await readSettings();
  const provider = normalizeProvider(settings.embeddingProvider);

  if (!settings.mongodbUri.trim()) {
    throw new Error("MongoDB URI belum diisi di Settings.");
  }

  if (!provider) {
    throw new Error("Embedding provider belum diisi di Settings.");
  }

  if (provider !== "ollama" && !settings.embeddingApiKey.trim()) {
    throw new Error("Embedding API key belum diisi di Settings.");
  }

  const isAtlasProvider = usesAtlasEmbeddingProvider(provider);

  return {
    mongoUrl: settings.mongodbUri.trim(),
    database: settings.mongodbDb.trim() || "wa_ai",
    collection: settings.ragCollection.trim() || "knowledge",
    indexName: settings.ragIndexName.trim() || "vector_index",
    embeddingFieldPath: "embedding",
    embedding: {
      provider,
      apiKey: settings.embeddingApiKey.trim() || undefined,
      model: settings.embeddingModel.trim() || (isAtlasProvider ? DEFAULT_MONGODB_EMBEDDING_MODEL : "text-embedding-3-small"),
      baseUrl:
        settings.embeddingBaseUrl.trim() ||
        (isAtlasProvider ? DEFAULT_MONGODB_EMBEDDING_BASE_URL : undefined),
      dimensions: Number(settings.embeddingDimensions.trim() || String(isAtlasProvider ? DEFAULT_MONGODB_EMBEDDING_DIMENSION : 1536))
    }
  };
}

async function ensureClients() {
  const config = await getRuntimeConfig();
  const nextSignature = buildSignature(config);

  if (nextSignature === activeConfigSignature && mongoClientPromise && ragClientPromise) {
    return { config, signature: nextSignature };
  }

  mongoClientPromise = null;
  ragClientPromise = null;
  activeConfigSignature = nextSignature;

  const client = new MongoClient(config.mongoUrl);
  mongoClientPromise = client.connect().then(() => client);

  ragClientPromise = usesMongoRagProvider(config.embedding.provider)
    ? (async () => {
        const rag = new MongoRAG({
          mongoUrl: config.mongoUrl,
          database: config.database,
          collection: config.collection,
          indexName: config.indexName,
          embeddingFieldPath: config.embeddingFieldPath,
          embedding: config.embedding,
          search: {
            maxResults: 3,
            minScore: 0,
            similarityMetric: "cosine"
          }
        });

        await rag.connect();
        return rag;
      })()
    : Promise.resolve(null as unknown as MongoRAG);

  return { config, signature: nextSignature };
}

async function getMongoClient() {
  await ensureClients();

  if (!mongoClientPromise) {
    throw new Error("MongoDB client is not initialized.");
  }

  return mongoClientPromise;
}

async function getRagClient() {
  await ensureClients();

  if (!ragClientPromise) {
    throw new Error("MongoRAG client is not initialized.");
  }

  return ragClientPromise;
}

async function getRagConfig() {
  const { config } = await ensureClients();
  return config;
}

function normalizeKnowledgeResult(result: MongoRAGSearchResult): KnowledgeResult {
  const metadata = (result.metadata ?? {}) as Record<string, unknown>;

  return {
    title: String(metadata.title ?? "Untitled"),
    content: result.content,
    category: typeof metadata.category === "string" ? metadata.category : undefined,
    score: typeof result.score === "number" ? result.score : undefined,
    documentId: result.documentId,
    createdAt: typeof metadata.createdAt === "string" ? metadata.createdAt : undefined
  };
}

export async function ingestKnowledge(data: KnowledgeInput) {
  const title = data.title.trim();
  const content = data.content.trim();
  const category = data.category?.trim();

  if (!title || !content) {
    throw new Error("title and content are required");
  }

  const config = await getRagConfig();
  const createdAt = new Date().toISOString();
  const documentId = randomUUID();

  const document = {
    documentId,
    title,
    content,
    category,
    createdAt,
    metadata: {
      title,
      category,
      createdAt
    }
  };

  let result = { processed: 1, failed: 0 };

  if (usesAtlasEmbeddingProvider(config.embedding.provider)) {
    const collection = await getKnowledgeCollection();
    const embedding = await createAtlasEmbedding(config, content);

    await collection.insertOne({
      ...document,
      embedding
    });
  } else {
    const rag = await getRagClient();
    result = await rag.ingestBatch([document], {
      database: config.database,
      collection: config.collection
    });
  }

  return {
    ...document,
    processed: result.processed,
    failed: result.failed
  };
}

export async function searchKnowledge(query: string) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [] as KnowledgeResult[];
  }

  const config = await getRagConfig();
  if (usesAtlasEmbeddingProvider(config.embedding.provider)) {
    const collection = await getKnowledgeCollection();
    const embedding = await createAtlasEmbedding(config, trimmedQuery);
    const results = await collection
      .aggregate<{
        documentId?: string;
        title?: string;
        content?: string;
        category?: string;
        createdAt?: string;
        score?: number;
      }>([
        {
          $vectorSearch: {
            index: config.indexName,
            path: config.embeddingFieldPath,
            queryVector: embedding,
            numCandidates: 60,
            limit: 3
          }
        },
        {
          $project: {
            _id: 0,
            documentId: 1,
            title: 1,
            content: 1,
            category: 1,
            createdAt: 1,
            score: { $meta: "vectorSearchScore" }
          }
        }
      ])
      .toArray();

    return results.slice(0, 3).map((result) => ({
      title: result.title || "Untitled",
      content: result.content || "",
      category: result.category,
      createdAt: result.createdAt,
      documentId: result.documentId,
      score: typeof result.score === "number" ? result.score : undefined
    }));
  }

  const rag = await getRagClient();
  const results = await rag.search(trimmedQuery, {
    database: config.database,
    collection: config.collection,
    maxResults: 3,
    indexName: config.indexName
  });

  return results.slice(0, 3).map(normalizeKnowledgeResult);
}

export function buildContext(results: KnowledgeResult[]) {
  return results.map((item) => `- ${item.title}: ${item.content}`).join("\n");
}

export async function retrieveKnowledgeContext(query: string) {
  const results = await searchKnowledge(query);

  return {
    results,
    context: buildContext(results)
  };
}

export async function askWithRAG(query: string) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    throw new Error("message is required");
  }

  const { results, context } = await retrieveKnowledgeContext(trimmedQuery);

  if (results.length === 0) {
    return {
      answer: FALLBACK_ANSWER,
      results,
      context: ""
    };
  }

  const settings = await readSettings();

  if (!settings.aiApiKey || !settings.aiApiUrl) {
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
          content: `Kamu adalah AI yang menjawab hanya berdasarkan data berikut:\n${context}\n\nJika data tidak ditemukan, jawab: \"${FALLBACK_ANSWER}\"`
        },
        {
          role: "user",
          content: trimmedQuery
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    }),
    signal: AbortSignal.timeout(25000)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content?.trim() || FALLBACK_ANSWER;

  return {
    answer,
    results,
    context
  };
}

export async function listKnowledge(limit = 50) {
  const collection = await getKnowledgeCollection();
  const documents = await collection
    .find({}, { projection: { _id: 0, embedding: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return documents.map((document) => ({
    documentId: typeof document.documentId === "string" ? document.documentId : undefined,
    title: String(document.title ?? "Untitled"),
    content: String(document.content ?? ""),
    category: typeof document.category === "string" ? document.category : undefined,
    createdAt: typeof document.createdAt === "string" ? document.createdAt : undefined
  }));
}

export async function deleteKnowledge(documentId: string) {
  const collection = await getKnowledgeCollection();
  const result = await collection.deleteOne({ documentId });
  return result.deletedCount > 0;
}

export async function getKnowledgeCollection() {
  const client = await getMongoClient();
  const config = await getRagConfig();
  return client.db(config.database).collection(config.collection);
}

export async function testEmbeddingConnection() {
  const config = await getRagConfig();

  if (usesAtlasEmbeddingProvider(config.embedding.provider)) {
    const vector = await createAtlasEmbedding(
      config,
      "Tes koneksi embedding MongoDB Atlas untuk aplikasi WA AI Control Center."
    );

    return {
      provider: config.embedding.provider,
      model: config.embedding.model,
      vectorLength: vector.length,
      expectedDimensions: config.embedding.dimensions,
      baseUrl: config.embedding.baseUrl || DEFAULT_MONGODB_EMBEDDING_BASE_URL
    };
  }

  const rag = await getRagClient();
  const vector = await (rag as unknown as { getEmbedding: (input: string) => Promise<number[]> }).getEmbedding(
    "Tes koneksi embedding untuk aplikasi WA AI Control Center."
  );

  return {
    provider: config.embedding.provider,
    model: config.embedding.model,
    vectorLength: vector.length,
    expectedDimensions: config.embedding.dimensions,
    baseUrl: config.embedding.baseUrl
  };
}
