declare module "mongodb-rag" {
  export type MongoRAGConfig = {
    mongoUrl: string;
    database?: string;
    collection?: string;
    indexName?: string;
    embeddingFieldPath?: string;
    embedding: {
      provider: string;
      apiKey?: string;
      model?: string;
      baseUrl?: string;
      batchSize?: number;
      dimensions?: number;
    };
    search?: {
      similarityMetric?: string;
      minScore?: number;
      maxResults?: number;
    };
  };

  export type MongoRAGSearchResult = {
    content: string;
    documentId?: string;
    metadata?: Record<string, unknown>;
    score?: number;
  };

  export class MongoRAG {
    constructor(config: MongoRAGConfig);
    connect(): Promise<void>;
    close(): Promise<void>;
    ingestBatch(
      documents: Array<Record<string, unknown>>,
      options?: { database?: string; collection?: string }
    ): Promise<{ processed: number; failed: number }>;
    search(
      query: string,
      options?: { database?: string; collection?: string; maxResults?: number; skip?: number; indexName?: string }
    ): Promise<MongoRAGSearchResult[]>;
  }

  export default MongoRAG;
}
