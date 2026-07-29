import { randomUUID } from "crypto";

import { runInBusinessContext } from "@/lib/business-context";
import { generateCreatorDrafts, runCreatorPlayground } from "@/lib/creator";
import {
  CreatorDraft,
  CreatorDraftType,
  CreatorObjective,
  CreatorPlatform,
  CreatorPublishSimulation,
  CreatorRole,
  CreatorTone
} from "@/types/creator";

type GenerateJobInput = {
  platform?: string;
  topic?: string;
  count?: number;
  role?: CreatorRole;
  tone?: CreatorTone;
  objective?: CreatorObjective;
  type?: CreatorDraftType;
  autoSend?: boolean;
  autoApprove?: boolean;
  generationMode?: "manual" | "scheduled";
  generationSlotKey?: string;
  commerce?: {
    enabled?: boolean;
    focus?: string;
    productId?: string;
    voucherId?: string;
    promoId?: string;
    angle?: string;
    style?: string;
    length?: string;
    includeVoucher?: boolean;
    includePromo?: boolean;
  };
};

type PlaygroundJobInput = {
  platform?: string;
  topic?: string;
  count?: number;
  role?: CreatorRole;
  tone?: CreatorTone;
  objective?: CreatorObjective;
  type?: CreatorDraftType;
  simulateUpload?: boolean;
  commerce?: {
    enabled?: boolean;
    focus?: string;
    productId?: string;
    voucherId?: string;
    promoId?: string;
    angle?: string;
    style?: string;
    length?: string;
    includeVoucher?: boolean;
    includePromo?: boolean;
  };
};

type CreatorJobResult =
  | {
      kind: "generate";
      drafts: CreatorDraft[];
    }
  | {
      kind: "playground";
      drafts: CreatorDraft[];
      simulations: CreatorPublishSimulation[];
      commerce?: {
        enabled: boolean;
        storeName: string;
        generatedAt: string;
        counts: {
          products: number;
          vouchers: number;
          promos: number;
        };
        focus: string;
        angle: string;
        style: string;
        length: string;
        selected: {
          product?: Record<string, unknown>;
          voucher?: Record<string, unknown>;
          promo?: Record<string, unknown>;
        };
      };
    };

export type CreatorAsyncJob = {
  jobId: string;
  businessId: string;
  platform: CreatorPlatform | string;
  kind: "generate" | "playground";
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  result?: CreatorJobResult;
  reason?: string;
};

declare global {
  // Persist async jobs across Next.js dev recompiles within the same Node process.
  var creatorJobStoreGlobal: Map<string, CreatorAsyncJob> | undefined;
}

const jobStore = globalThis.creatorJobStoreGlobal ?? new Map<string, CreatorAsyncJob>();

if (!globalThis.creatorJobStoreGlobal) {
  globalThis.creatorJobStoreGlobal = jobStore;
}

const jobRetentionMs = 1000 * 60 * 60;

function nowIso() {
  return new Date().toISOString();
}

function scheduleCleanup(jobId: string) {
  setTimeout(() => {
    jobStore.delete(jobId);
  }, jobRetentionMs).unref?.();
}

function createJob(kind: CreatorAsyncJob["kind"], businessId: string, platform: CreatorPlatform | string) {
  const createdAt = nowIso();
  const job: CreatorAsyncJob = {
    jobId: randomUUID(),
    businessId,
    platform,
    kind,
    status: "queued",
    createdAt,
    updatedAt: createdAt
  };
  jobStore.set(job.jobId, job);
  scheduleCleanup(job.jobId);
  return job;
}

function patchJob(jobId: string, patch: Partial<CreatorAsyncJob>) {
  const current = jobStore.get(jobId);
  if (!current) {
    return;
  }

  jobStore.set(jobId, {
    ...current,
    ...patch,
    updatedAt: nowIso()
  });
}

export function getCreatorJob(businessId: string, jobId: string) {
  const job = jobStore.get(jobId);
  if (!job || job.businessId !== businessId) {
    return null;
  }
  return job;
}

export function startGenerateCreatorJob(businessId: string, input: GenerateJobInput) {
  const job = createJob("generate", businessId, input.platform ?? "threads");

  setImmediate(async () => {
    patchJob(job.jobId, { status: "running" });

    try {
      const drafts = await runInBusinessContext(businessId, () => generateCreatorDrafts(input));
      patchJob(job.jobId, {
        status: "completed",
        result: {
          kind: "generate",
          drafts
        }
      });
    } catch (error) {
      patchJob(job.jobId, {
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  return job;
}

export function startPlaygroundCreatorJob(businessId: string, input: PlaygroundJobInput) {
  const job = createJob("playground", businessId, input.platform ?? "threads");

  setImmediate(async () => {
    patchJob(job.jobId, { status: "running" });

    try {
      const result = await runInBusinessContext(businessId, () => runCreatorPlayground(input));
      patchJob(job.jobId, {
        status: "completed",
        result: {
          kind: "playground",
          drafts: result.drafts,
          simulations: result.simulations,
          commerce: result.commerce
        }
      });
    } catch (error) {
      patchJob(job.jobId, {
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  return job;
}
