import { prisma } from "@/lib/prisma";
import { sendWA } from "@/lib/wa";
import { readSettings } from "@/lib/settings";
import { currentBusinessId, runInBusinessContext } from "@/lib/business-context";
import { publishDraftToPlatform } from "@/lib/social";
import {
  CreatorDraft,
  CreatorPlatform,
} from "@/types/creator";

// ── Types ──────────────────────────────────────────────

export type BlastTemplateData = {
  id: string;
  businessId: string;
  name: string;
  text: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type BlastCampaignTargetData = {
  id: string;
  campaignId: string;
  targetId: string;
  label: string;
};

export type BlastCampaignItemData = {
  id: string;
  campaignId: string;
  templateId: string;
  template?: BlastTemplateData;
  sortOrder: number;
  delayAfterMinutes: number;
};

export type BlastCampaignData = {
  id: string;
  businessId: string;
  name: string;
  status: string;
  targetType: string;
  socialPlatforms: string[];
  intervalMinutes: number;
  startAt: string | null;
  endDate: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  targets: BlastCampaignTargetData[];
  items: BlastCampaignItemData[];
};

export type BlastExecutionLogData = {
  id: string;
  campaignId: string;
  itemId: string | null;
  targetId: string | null;
  templateId: string | null;
  targetLabel: string;
  platform: string;
  status: string;
  message: string | null;
  error: string | null;
  createdAt: string;
};

// ── Template CRUD ──────────────────────────────────────

export async function listTemplates(businessId: string) {
  const templates = await prisma.blastTemplate.findMany({
    where: { businessId },
    orderBy: { updatedAt: "desc" },
  });
  return templates.map(mapTemplate);
}

export async function getTemplate(businessId: string, id: string) {
  const template = await prisma.blastTemplate.findFirst({
    where: { id, businessId },
  });
  return template ? mapTemplate(template) : null;
}

export async function createTemplate(
  businessId: string,
  data: { name: string; text: string; imageUrl?: string }
) {
  const template = await prisma.blastTemplate.create({
    data: {
      businessId,
      name: data.name.trim(),
      text: data.text.trim(),
      imageUrl: (data.imageUrl ?? "").trim(),
    },
  });
  return mapTemplate(template);
}

export async function updateTemplate(
  businessId: string,
  id: string,
  data: { name?: string; text?: string; imageUrl?: string }
) {
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.text !== undefined) patch.text = data.text.trim();
  if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl.trim();

  const template = await prisma.blastTemplate.updateMany({
    where: { id, businessId },
    data: patch,
  });

  if (template.count === 0) throw new Error("Template not found");
  return getTemplate(businessId, id);
}

export async function deleteTemplate(businessId: string, id: string) {
  const result = await prisma.blastTemplate.deleteMany({
    where: { id, businessId },
  });
  if (result.count === 0) throw new Error("Template not found");
}

// ── Campaign CRUD ──────────────────────────────────────

export async function listCampaigns(businessId: string) {
  const campaigns = await prisma.blastCampaign.findMany({
    where: { businessId },
    include: {
      targets: true,
      items: { include: { template: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return campaigns.map(mapCampaign);
}

export async function getCampaign(businessId: string, id: string) {
  const campaign = await prisma.blastCampaign.findFirst({
    where: { id, businessId },
    include: {
      targets: true,
      items: { include: { template: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  return campaign ? mapCampaign(campaign) : null;
}

export async function createCampaign(
  businessId: string,
  data: {
    name: string;
    targetType?: string;
    socialPlatforms?: string[];
    intervalMinutes?: number;
    endDate?: string | null;
    targets?: { targetId: string; label?: string }[];
    items?: { templateId: string; sortOrder?: number; delayAfterMinutes?: number }[];
  }
) {
  const campaign = await prisma.blastCampaign.create({
    data: {
      businessId,
      name: data.name.trim(),
      status: "draft",
      targetType: data.targetType ?? "whatsapp_group",
      socialPlatforms: data.socialPlatforms ?? [],
      intervalMinutes: data.intervalMinutes ?? 60,
      endDate: data.endDate ? new Date(data.endDate) : null,
      targets: {
        create: (data.targets ?? []).map((t) => ({
          targetId: t.targetId.trim(),
          label: (t.label ?? t.targetId).trim(),
        })),
      },
      items: {
        create: (data.items ?? []).map((item, idx) => ({
          templateId: item.templateId,
          sortOrder: item.sortOrder ?? idx,
          delayAfterMinutes: item.delayAfterMinutes ?? 0,
        })),
      },
    },
    include: {
      targets: true,
      items: { include: { template: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  return mapCampaign(campaign);
}

export async function updateCampaign(
  businessId: string,
  id: string,
  data: {
    name?: string;
    status?: string;
    targetType?: string;
    socialPlatforms?: string[];
    intervalMinutes?: number;
    startAt?: string | null;
    endDate?: string | null;
    nextRunAt?: string | null;
    targets?: { targetId: string; label?: string }[];
    items?: { templateId: string; sortOrder?: number; delayAfterMinutes?: number }[];
  }
) {
  // Verify ownership
  const existing = await prisma.blastCampaign.findFirst({ where: { id, businessId } });
  if (!existing) throw new Error("Campaign not found");

  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.status !== undefined) patch.status = data.status;
  if (data.targetType !== undefined) patch.targetType = data.targetType;
  if (data.socialPlatforms !== undefined) patch.socialPlatforms = data.socialPlatforms;
  if (data.intervalMinutes !== undefined) patch.intervalMinutes = data.intervalMinutes;
  if (data.startAt !== undefined) patch.startAt = data.startAt ? new Date(data.startAt) : null;
  if (data.endDate !== undefined) patch.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.nextRunAt !== undefined) patch.nextRunAt = data.nextRunAt ? new Date(data.nextRunAt) : null;

  if (Object.keys(patch).length > 0) {
    await prisma.blastCampaign.update({ where: { id }, data: patch });
  }

  // Replace targets if provided
  if (data.targets !== undefined) {
    await prisma.blastCampaignTarget.deleteMany({ where: { campaignId: id } });
    if (data.targets.length > 0) {
      await prisma.blastCampaignTarget.createMany({
        data: data.targets.map((t) => ({
          campaignId: id,
          targetId: t.targetId.trim(),
          label: (t.label ?? t.targetId).trim(),
        })),
      });
    }
  }

  // Replace items if provided
  if (data.items !== undefined) {
    await prisma.blastCampaignItem.deleteMany({ where: { campaignId: id } });
    if (data.items.length > 0) {
      await prisma.blastCampaignItem.createMany({
        data: data.items.map((item, idx) => ({
          campaignId: id,
          templateId: item.templateId,
          sortOrder: item.sortOrder ?? idx,
          delayAfterMinutes: item.delayAfterMinutes ?? 0,
        })),
      });
    }
  }

  return getCampaign(businessId, id);
}

export async function deleteCampaign(businessId: string, id: string) {
  const result = await prisma.blastCampaign.deleteMany({
    where: { id, businessId },
  });
  if (result.count === 0) throw new Error("Campaign not found");
}

// ── Execution ──────────────────────────────────────────

export async function executeCampaignNow(businessId: string, campaignId: string) {
  return runInBusinessContext(businessId, async () => {
    const campaign = await getCampaign(businessId, campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.items.length === 0) throw new Error("Campaign has no template items");

    const settings = await readSettings(businessId);
    const now = new Date();

    // Check if campaign has expired
    if (campaign.endDate && new Date(campaign.endDate) < now) {
      await prisma.blastCampaign.update({
        where: { id: campaignId },
        data: { status: "completed" },
      });
      return { ok: true, logs: [], reason: "Campaign sudah melewati tanggal akhir, status diubah ke completed." };
    }

    // Update campaign status
    await prisma.blastCampaign.update({
      where: { id: campaignId },
      data: { lastRunAt: now, status: "active" },
    });

    const logs: BlastExecutionLogData[] = [];

    // Process each template item in order
    for (const item of campaign.items) {
      let itemDelay = item.delayAfterMinutes * 60 * 1000;
      if (itemDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, itemDelay));
      }

      const template = item.template;
      if (!template) continue;

      // Send to WhatsApp targets
      for (const target of campaign.targets) {
        try {
          const hasImage = template.imageUrl && template.imageUrl.trim().length > 0;

          if (hasImage) {
            await sendWAImage(
              businessId,
              target.targetId,
              template.imageUrl,
              template.text,
              settings
            );
          } else {
            await sendWA(businessId, target.targetId, template.text);
          }

          const log = await prisma.blastExecutionLog.create({
            data: {
              campaignId,
              itemId: item.id,
              targetId: target.id,
              templateId: template.id,
              targetLabel: target.label || target.targetId,
              platform: "whatsapp",
              status: "success",
              message: template.text.slice(0, 500),
            },
          });
          logs.push(mapExecutionLog(log));
        } catch (error) {
          const reason = error instanceof Error ? error.message : "Unknown error";
          const log = await prisma.blastExecutionLog.create({
            data: {
              campaignId,
              itemId: item.id,
              targetId: target.id,
              templateId: template.id,
              targetLabel: target.label || target.targetId,
              platform: "whatsapp",
              status: "failed",
              message: template.text.slice(0, 500),
              error: reason,
            },
          });
          logs.push(mapExecutionLog(log));
        }
      }

      // Send to social platforms
      if (campaign.targetType === "social" && campaign.socialPlatforms.length > 0) {
        for (const platform of campaign.socialPlatforms) {
          try {
            await blastToSocialPlatform(
              businessId,
              platform as CreatorPlatform,
              template.text,
              template.imageUrl || undefined
            );

            const log = await prisma.blastExecutionLog.create({
              data: {
                campaignId,
                itemId: item.id,
                templateId: template.id,
                targetLabel: platform,
                platform,
                status: "success",
                message: template.text.slice(0, 500),
              },
            });
            logs.push(mapExecutionLog(log));
          } catch (error) {
            const reason = error instanceof Error ? error.message : "Unknown error";
            const log = await prisma.blastExecutionLog.create({
              data: {
                campaignId,
                itemId: item.id,
                templateId: template.id,
                targetLabel: platform,
                platform,
                status: "failed",
                message: template.text.slice(0, 500),
                error: reason,
              },
            });
            logs.push(mapExecutionLog(log));
          }
        }
      }
    }

    // Set next run based on interval
    const nextRun = new Date(now.getTime() + campaign.intervalMinutes * 60 * 1000);
    const hasExpired = campaign.endDate && nextRun > new Date(campaign.endDate);

    await prisma.blastCampaign.update({
      where: { id: campaignId },
      data: {
        nextRunAt: hasExpired ? null : nextRun,
        status: hasExpired ? "completed" : "active",
      },
    });

    return { ok: true, logs, nextRunAt: hasExpired ? null : nextRun.toISOString() };
  });
}

export async function getExecutionLogs(
  businessId: string,
  campaignId: string,
  limit = 100
) {
  const logs = await prisma.blastExecutionLog.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Verify campaign belongs to business
  if (logs.length > 0) {
    const campaign = await prisma.blastCampaign.findFirst({
      where: { id: campaignId, businessId },
    });
    if (!campaign) throw new Error("Campaign not found");
  }

  return logs.map(mapExecutionLog);
}

// ── Cron: Process due campaigns ─────────────────────────

export async function processDueBlastCampaigns(businessId: string) {
  return runInBusinessContext(businessId, async () => {
    const now = new Date();

    const dueCampaigns = await prisma.blastCampaign.findMany({
      where: {
        businessId,
        status: "active",
        OR: [
          { nextRunAt: { lte: now } },
          { nextRunAt: null, startAt: { lte: now } },
        ],
      },
    });

    // Also auto-complete campaigns that have passed their endDate
    await prisma.blastCampaign.updateMany({
      where: {
        businessId,
        status: "active",
        endDate: { lt: now },
      },
      data: { status: "completed" },
    });

    const results: Array<{ campaignId: string; name: string; logs: BlastExecutionLogData[]; error?: string }> = [];

    for (const campaign of dueCampaigns) {
      try {
        const result = await executeCampaignNow(businessId, campaign.id);
        results.push({ campaignId: campaign.id, name: campaign.name, logs: (result as any).logs ?? [] });
      } catch (error) {
        results.push({
          campaignId: campaign.id,
          name: campaign.name,
          logs: [],
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  });
}

// ── WA Image Sender ────────────────────────────────────

async function sendWAImage(
  businessId: string,
  to: string,
  imageUrl: string,
  caption: string,
  settings: Awaited<ReturnType<typeof readSettings>>
) {
  const normalizedTo = normalizeForWA(to);

  const payload = {
    recipient_type: to.includes("@g.us") ? "group" : "individual",
    to: normalizedTo,
    type: "image",
    image: {
      link: imageUrl,
      caption: caption,
    },
  };

  const url = `${settings.waApiUrl}/messages?sessionId=${encodeURIComponent(settings.waSessionId)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.waToken}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });

  const detail = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(detail);
  } catch {
    // raw text
  }

  if (!response.ok) {
    throw new Error(`WA image send HTTP ${response.status}: ${detail}`);
  }

  if (data && (data.status === false || data.error)) {
    throw new Error(`WA image send API error: ${detail}`);
  }

  if (Array.isArray(data)) {
    const firstItem = data[0];
    if (firstItem?.status === "error" || firstItem?.error) {
      throw new Error(`WA image send API error: ${firstItem.message || firstItem.error || detail}`);
    }
  }

  return { payload, apiResponse: data ?? detail, httpStatus: response.status };
}

function normalizeForWA(value: string) {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return trimmed.replace(/\s+/g, "");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

// ── Social Platform Blast ──────────────────────────────

async function blastToSocialPlatform(
  businessId: string,
  platform: CreatorPlatform,
  text: string,
  imageUrl?: string
) {
  // Build a minimal CreatorDraft structure for the social publish function
  const now = new Date().toISOString();
  const draft: CreatorDraft = {
    id: `blast-${Date.now()}`,
    draftId: `blast-draft-${Date.now()}`,
    creatorId: businessId,
    platform,
    type: "single_post",
    role: "informative",
    tone: "casual",
    objective: "awareness",
    topic: text.slice(0, 200),
    hookStyle: "",
    caption: text,
    parts: [{ index: 0, type: "hook", content: text }],
    status: "approved",
    versions: [],
    currentVersion: 1,
    visualPrompt: "",
    imageUrl: imageUrl || "",
    r2ImageUrl: imageUrl || "",
    imageError: "",
    imageAspectRatio: "1:1",
    publishAttempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  return publishDraftToPlatform(businessId, draft);
}

// ── Helpers ────────────────────────────────────────────

function mapTemplate(t: {
  id: string;
  businessId: string;
  name: string;
  text: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}): BlastTemplateData {
  return {
    id: t.id,
    businessId: t.businessId,
    name: t.name,
    text: t.text,
    imageUrl: t.imageUrl,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function mapTarget(t: {
  id: string;
  campaignId: string;
  targetId: string;
  label: string;
}): BlastCampaignTargetData {
  return {
    id: t.id,
    campaignId: t.campaignId,
    targetId: t.targetId,
    label: t.label,
  };
}

function mapCampaignItem(item: {
  id: string;
  campaignId: string;
  templateId: string;
  template?: {
    id: string;
    businessId: string;
    name: string;
    text: string;
    imageUrl: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  sortOrder: number;
  delayAfterMinutes: number;
}): BlastCampaignItemData {
  return {
    id: item.id,
    campaignId: item.campaignId,
    templateId: item.templateId,
    template: item.template ? mapTemplate(item.template) : undefined,
    sortOrder: item.sortOrder,
    delayAfterMinutes: item.delayAfterMinutes,
  };
}

function mapCampaign(c: {
  id: string;
  businessId: string;
  name: string;
  status: string;
  targetType: string;
  socialPlatforms: string[];
  intervalMinutes: number;
  startAt: Date | null;
  endDate: Date | null;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  targets: {
    id: string;
    campaignId: string;
    targetId: string;
    label: string;
  }[];
  items: {
    id: string;
    campaignId: string;
    templateId: string;
    template: {
      id: string;
      businessId: string;
      name: string;
      text: string;
      imageUrl: string;
      createdAt: Date;
      updatedAt: Date;
    } | null;
    sortOrder: number;
    delayAfterMinutes: number;
  }[];
}): BlastCampaignData {
  return {
    id: c.id,
    businessId: c.businessId,
    name: c.name,
    status: c.status,
    targetType: c.targetType,
    socialPlatforms: c.socialPlatforms,
    intervalMinutes: c.intervalMinutes,
    startAt: c.startAt?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    nextRunAt: c.nextRunAt?.toISOString() ?? null,
    lastRunAt: c.lastRunAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    targets: c.targets.map(mapTarget),
    items: c.items.map(mapCampaignItem),
  };
}

function mapExecutionLog(log: {
  id: string;
  campaignId: string;
  itemId: string | null;
  targetId: string | null;
  templateId: string | null;
  targetLabel: string;
  platform: string;
  status: string;
  message: string | null;
  error: string | null;
  createdAt: Date;
}): BlastExecutionLogData {
  return {
    ...log,
    createdAt: log.createdAt.toISOString(),
  };
}
