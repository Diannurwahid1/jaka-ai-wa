import { randomUUID } from "crypto";

import { generateCreatorDrafts, runCreatorPlayground } from "@/lib/creator";
import { CreatorDraft, CreatorObjective, CreatorPlatform, CreatorPublishSimulation, CreatorRole, CreatorTone } from "@/types/creator";

type GenerateJobInput = {
  platform?: string;
  topic?: string;
  count?: number;
  role?: CreatorRole;
  tone?: CreatorTone;
  objective?: CreatorObjective;
  autoSend?: boolean;
};

type PlaygroundJobInput = {
  platform?: string;
  topic?: string;
  count?: number;
  role?: CreatorRole;
  tone?: CreatorTone;
  objective?: CreatorObjective;
  simulateUpload?: boolean;
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
    };

export type CreatorAsyncJob = {
  jobId: string;
  platform: CreatorPlatform | string;
  kind: "generate" | "playground";
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  result?: CreatorJobResult;
  reason?: string;
};

const jobStore = new Map<string, CreatorAsyncJob>();
const jobRetentionMs = 1000 * 60 * 60;

function nowIso() {
  return new Date().toISOString();
}

function scheduleCleanup(jobId: string) {
  setTimeout(() => {
    jobStore.delete(jobId);
  }, jobRetentionMs).unref?.();
}

function createJob(kind: CreatorAsyncJob["kind"], platform: CreatorPlatform | string) {
  const createdAt = nowIso();
  const job: CreatorAsyncJob = {
    jobId: randomUUID(),
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

export function getCreatorJob(jobId: string) {
  return jobStore.get(jobId) ?? null;
}

export function startGenerateCreatorJob(input: GenerateJobInput) {
  const job = createJob("generate", input.platform ?? "threads");

  setImmediate(async () => {
    patchJob(job.jobId, { status: "running" });

    try {
      const drafts = await generateCreatorDrafts(input);
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

export function startPlaygroundCreatorJob(input: PlaygroundJobInput) {
  const job = createJob("playground", input.platform ?? "threads");

  setImmediate(async () => {
    patchJob(job.jobId, { status: "running" });

    try {
      const result = await runCreatorPlayground(input);
      patchJob(job.jobId, {
        status: "completed",
        result: {
          kind: "playground",
          drafts: result.drafts,
          simulations: result.simulations
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
