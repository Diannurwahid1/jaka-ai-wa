"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast-provider";
import { formatDateTime } from "@/lib/utils";
import {
  CreatorAsyncJob,
  CreatorDraft,
  CreatorDraftType,
  CreatorObjective,
  CreatorOverview,
  CreatorPlatform,
  CreatorPublishSimulation,
  CreatorRole,
  CreatorScheduleSlot,
  CreatorTopicBrief,
  CreatorTone
} from "@/types/creator";

const roleOptions: Array<{ value: CreatorRole; label: string }> = [
  { value: "owner", label: "Owner" },
  { value: "informative", label: "Informative" },
  { value: "educational", label: "Educational" },
  { value: "storytelling", label: "Storytelling" },
  { value: "personal-branding", label: "Personal Branding" },
  { value: "opinion", label: "Opinion" },
  { value: "viral", label: "Viral" }
];

const toneOptions: Array<{ value: CreatorTone; label: string }> = [
  { value: "sharp", label: "Sharp" },
  { value: "casual", label: "Casual" },
  { value: "confident", label: "Confident" },
  { value: "warm", label: "Warm" },
  { value: "bold", label: "Bold" }
];

const objectiveOptions: Array<{ value: CreatorObjective; label: string }> = [
  { value: "engagement", label: "Engagement" },
  { value: "authority", label: "Authority" },
  { value: "awareness", label: "Awareness" },
  { value: "soft-selling", label: "Soft Selling" }
];

const draftTypeOptions: Array<{ value: CreatorDraftType; label: string }> = [
  { value: "single_post", label: "Single post" },
  { value: "thread_series", label: "Thread series" }
];

type CommerceSnapshotPreview = {
  schemaVersion: string;
  generatedAt: string;
  store?: {
    name?: string;
    baseUrl?: string;
  };
  products?: Array<Record<string, unknown>>;
  vouchers?: Array<Record<string, unknown>>;
  promos?: Array<Record<string, unknown>>;
};

const commerceFocusOptions = [
  { value: "auto", label: "Auto pilih peluang terbaik" },
  { value: "product", label: "Produk spesifik" },
  { value: "voucher", label: "Voucher / diskon" },
  { value: "promo", label: "Promo campaign" },
  { value: "bundle", label: "Bundle offer" },
  { value: "education", label: "Edukasi soft-sell" }
];

const commerceAngleOptions = [
  { value: "promo informatif", label: "Promo informatif" },
  { value: "problem-solution", label: "Problem-solution" },
  { value: "student productivity", label: "Mahasiswa produktif" },
  { value: "developer workflow", label: "Developer workflow" },
  { value: "creator workflow", label: "Creator workflow" },
  { value: "urgency tanpa hard selling", label: "Urgency halus" }
];

const commerceStyleOptions = [
  { value: "auto", label: "Auto style" },
  { value: "deal-alert", label: "Deal alert" },
  { value: "casual-restock", label: "Casual restock" },
  { value: "founder-note", label: "Founder note" },
  { value: "mini-story", label: "Mini story" },
  { value: "workflow-tip", label: "Workflow tip" },
  { value: "comparison", label: "Comparison" },
  { value: "faq", label: "FAQ singkat" }
];

const commerceLengthOptions = [
  { value: "short", label: "Short 280-420" },
  { value: "medium", label: "Medium 420-650" },
  { value: "long", label: "Long 650-850" },
  { value: "auto", label: "Auto length" }
];

const platformMeta: Record<CreatorPlatform, { label: string; description: string; imageFriendly: boolean }> = {
  threads: {
    label: "Threads",
    description: "Hook-first thread berantai untuk percakapan dan retention.",
    imageFriendly: false
  },
  instagram: {
    label: "Instagram",
    description: "Caption feed + visual image generation untuk creator aesthetic.",
    imageFriendly: true
  },
  linkedin: {
    label: "LinkedIn",
    description: "Authority post + visual profesional untuk thought leadership.",
    imageFriendly: true
  },
  facebook: {
    label: "Facebook",
    description: "Post komunitas dengan visual yang mudah di-share.",
    imageFriendly: true
  }
};

const sectionClassName = "rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel";

function defaultScheduleSlots(platform: CreatorPlatform): CreatorScheduleSlot[] {
  if (platform === "instagram") {
    return [
      { label: "Pagi", time: "09:00" },
      { label: "Siang", time: "13:00" },
      { label: "Sore", time: "18:30" }
    ];
  }

  if (platform === "linkedin") {
    return [
      { label: "Pagi", time: "08:15" },
      { label: "Siang", time: "12:00" },
      { label: "Sore", time: "17:15" }
    ];
  }

  if (platform === "facebook") {
    return [
      { label: "Pagi", time: "08:30" },
      { label: "Siang", time: "12:45" },
      { label: "Malam", time: "19:30" }
    ];
  }

  return [
    { label: "Pagi", time: "08:00" },
    { label: "Siang", time: "12:30" },
    { label: "Malam", time: "19:00" }
  ];
}

function defaultDraftScheduleSlots(platform: CreatorPlatform): CreatorScheduleSlot[] {
  if (platform === "instagram") {
    return [
      { label: "Pagi", time: "08:00" },
      { label: "Siang", time: "12:00" },
      { label: "Sore", time: "17:00" }
    ];
  }

  if (platform === "linkedin") {
    return [
      { label: "Pagi", time: "07:45" },
      { label: "Siang", time: "11:15" },
      { label: "Sore", time: "16:00" }
    ];
  }

  if (platform === "facebook") {
    return [
      { label: "Pagi", time: "08:00" },
      { label: "Siang", time: "12:00" },
      { label: "Malam", time: "18:30" }
    ];
  }

  return [
    { label: "Pagi", time: "07:30" },
    { label: "Siang", time: "11:30" },
    { label: "Sore", time: "16:30" }
  ];
}

function formatStatus(status: CreatorDraft["status"]) {
  return status.replace(/_/g, " ");
}

const draftStatusSortPriority: Record<CreatorDraft["status"], number> = {
  failed: 0,
  pending_approval: 1,
  draft: 2,
  approved: 3,
  scheduled: 4,
  rejected: 5,
  posted: 6
};

function compareDraftsByStatus(left: CreatorDraft, right: CreatorDraft) {
  const leftPriority = draftStatusSortPriority[left.status];
  const rightPriority = draftStatusSortPriority[right.status];

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

function formatJobStatus(status: CreatorAsyncJob["status"]) {
  if (status === "queued") {
    return "Masuk antrean";
  }

  if (status === "running") {
    return "Sedang diproses";
  }

  if (status === "completed") {
    return "Selesai";
  }

  return "Gagal";
}

function commerceItemValue(item: Record<string, unknown>) {
  return String(item.id ?? item.slug ?? item.title ?? item.name ?? "").trim();
}

function commerceItemLabel(item: Record<string, unknown>, fallback: string) {
  const title = String(item.title ?? item.name ?? item.slug ?? item.id ?? fallback).trim();
  const code = String(item.code ?? "").trim();
  const discount = String(item.discount ?? item.discountValue ?? "").trim();

  return [title, code || discount].filter(Boolean).join(" . ");
}

function getDisplayImageUrl(draft: CreatorDraft) {
  return draft.r2ImageUrl?.trim() || "";
}

function buildFlowStages(overview: CreatorOverview, platform: CreatorPlatform) {
  const isImagePlatform = platformMeta[platform].imageFriendly;
  const freshTopics = overview.topicBriefs.filter((item) => item.status === "fresh").length;
  const usedTopics = overview.topicBriefs.filter((item) => item.status === "used").length;
  const pendingDrafts = overview.drafts.filter((draft) => draft.status === "pending_approval").length;

  return [
    {
      worker: "Scout Web",
      role: "Cari sinyal topik dan trend hospitality terbaru dari web.",
      state: freshTopics > 0 ? "ready" : "idle",
      detail: freshTopics > 0 ? `${freshTopics} topik fresh tersedia` : "Belum ada hasil scout baru"
    },
    {
      worker: "Brief Strategist",
      role: "Ubah hasil search menjadi brief konten yang hemat token dan siap dipakai.",
      state: overview.topicBriefs.length > 0 ? "ready" : "idle",
      detail:
        overview.topicBriefs.length > 0
          ? `${overview.topicBriefs.length} brief tersimpan, ${usedTopics} sudah dipakai`
          : "Belum ada brief topik"
    },
    {
      worker: "Draft Writer",
      role: "Tulis hook, caption, CTA, dan struktur konten platform.",
      state: overview.drafts.length > 0 ? "ready" : "idle",
      detail: overview.drafts.length > 0 ? `${overview.drafts.length} draft di queue` : "Belum ada draft"
    },
    {
      worker: "Visual Director",
      role: isImagePlatform
        ? "Jaga visual prompt tetap sesuai brand dan konteks platform."
        : "Tidak aktif di platform text-only.",
      state: isImagePlatform ? "ready" : "optional",
      detail: isImagePlatform ? "Aktif untuk visual concept dan prompt akhir" : "Threads tidak memakai gambar"
    },
    {
      worker: "Image Maker",
      role: isImagePlatform
        ? "Render gambar final dari visual prompt yang sudah dirapikan."
        : "Tidak aktif di platform text-only.",
      state: isImagePlatform && overview.profile.generateImages ? "ready" : isImagePlatform ? "idle" : "optional",
      detail: isImagePlatform
        ? overview.profile.generateImages
          ? `Image generator aktif, rasio ${overview.profile.imageAspectRatio}`
          : "Generate image dimatikan di profile"
        : "Tidak diperlukan"
    },
    {
      worker: "Approval Guard",
      role: "Kirim draft ke WhatsApp atau dashboard untuk approval manusia.",
      state: overview.profile.approvalPhone ? "ready" : "idle",
      detail: overview.profile.approvalPhone
        ? `${pendingDrafts} draft menunggu approval`
        : "Approval phone belum diatur"
    },
    {
      worker: "Schedule Planner",
      role: "Masukkan draft approved ke slot publish terdekat yang kosong.",
      state: overview.stats.scheduled > 0 ? "ready" : "idle",
      detail:
        overview.stats.scheduled > 0
          ? `${overview.stats.scheduled} draft masuk antrean schedule`
          : "Belum ada draft terjadwal"
    },
    {
      worker: "Publisher",
      role: "Publish draft scheduled ke Threads, Meta, atau LinkedIn.",
      state: overview.stats.posted > 0 ? "ready" : "idle",
      detail:
        overview.stats.posted > 0
          ? `${overview.stats.posted} draft sudah tayang`
          : "Belum ada publish sukses"
    },
    {
      worker: "Log Keeper",
      role: "Simpan hasil upload, error, simulasi, dan histori publish.",
      state: overview.publishLogs.length > 0 ? "ready" : "idle",
      detail:
        overview.publishLogs.length > 0
          ? `${overview.publishLogs.length} log publish terbaru tersedia`
          : "Belum ada log publish"
    }
  ] as const;
}

export function CreatorClient({ platform }: { platform: CreatorPlatform }) {
  const { pushToast } = useToast();
  const isImagePlatform = platformMeta[platform].imageFriendly;
  const [overview, setOverview] = useState<CreatorOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    niche: "",
    brandSummary: "",
    audience: "",
    approvalPhone: "",
    defaultRole: "informative" as CreatorRole,
    defaultTone: "sharp" as CreatorTone,
    defaultDraftType: platform === "threads" ? "thread_series" as CreatorDraftType : "single_post" as CreatorDraftType,
    objective: "engagement" as CreatorObjective,
    postsPerDay: "1",
    planningDays: "3",
    scheduleSlots: defaultScheduleSlots(platform),
    autoGenerateDrafts: false,
    draftScheduleSlots: defaultDraftScheduleSlots(platform),
    generateImages: isImagePlatform,
    imageModel: "",
    imageAspectRatio: platform === "linkedin" ? "16:9" : platform === "instagram" ? "4:5" : "1:1"
  });
  const [generateForm, setGenerateForm] = useState({
    topic: "",
    count: "1",
    role: "informative" as CreatorRole,
    tone: "sharp" as CreatorTone,
    objective: "engagement" as CreatorObjective,
    type: platform === "threads" ? "thread_series" as CreatorDraftType : "single_post" as CreatorDraftType,
    autoSend: true
  });
  const [playgroundForm, setPlaygroundForm] = useState({
    topic: "",
    count: "1",
    role: "informative" as CreatorRole,
    tone: "sharp" as CreatorTone,
    objective: "engagement" as CreatorObjective,
    type: platform === "threads" ? "thread_series" as CreatorDraftType : "single_post" as CreatorDraftType,
    simulateUpload: true,
    commerceEnabled: platform === "threads",
    commerceFocus: "auto",
    commerceProductId: "",
    commerceVoucherId: "",
    commercePromoId: "",
    commerceAngle: "promo informatif",
    commerceStyle: "auto",
    commerceLength: "short",
    commerceIncludeVoucher: true,
    commerceIncludePromo: true
  });
  const [playgroundDrafts, setPlaygroundDrafts] = useState<CreatorDraft[]>([]);
  const [playgroundSimulations, setPlaygroundSimulations] = useState<CreatorPublishSimulation[]>([]);
  const [commerceSnapshot, setCommerceSnapshot] = useState<CommerceSnapshotPreview | null>(null);
  const [playgroundCommerceContext, setPlaygroundCommerceContext] = useState<NonNullable<Extract<CreatorAsyncJob, { kind: "playground" }>["result"]>["commerce"] | null>(null);
  const [activeJob, setActiveJob] = useState<CreatorAsyncJob | null>(null);
  const [topicScoutForm, setTopicScoutForm] = useState({
    query: "",
    limit: "20"
  });

  // Threads Scout state
  const [scoutForm, setScoutForm] = useState({
    keyword: "",
    limit: "20",
    maxReplies: "5",
    persona: "",
    sellAngle: ""
  });
  const [scoutResults, setScoutResults] = useState<Array<{
    postId: string;
    username: string;
    postText: string;
    reply: string;
    replyId?: string;
    skipped?: boolean;
    skipReason?: string;
    error?: string;
  }> | null>(null);
  const [scoutMeta, setScoutMeta] = useState<{ keyword: string; found: number; replied: number; skipped: number; errors: number; dryRun: boolean } | null>(null);

  const [topicPage, setTopicPage] = useState(1);
  const [topicLimit, setTopicLimit] = useState<number | "all">(5);
  const [topicStatusFilter, setTopicStatusFilter] = useState<string>("all");
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const [draftPage, setDraftPage] = useState(1);
  const [draftLimit, setDraftLimit] = useState<number | "all">(5);
  const [draftStatusFilter, setDraftStatusFilter] = useState<string>("all");
  const [draftSortBy, setDraftSortBy] = useState<"latest" | "status_asc" | "status_desc">("latest");
  const [expandedDrafts, setExpandedDrafts] = useState<Record<string, boolean>>({});

  const refreshOverview = useCallback(async () => {
    const response = await fetch(`/api/creator/overview?platform=${encodeURIComponent(platform)}`, {
      cache: "no-store"
    });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.reason || "Gagal memuat creator studio");
    }

    const nextOverview = payload.overview as CreatorOverview;
    setOverview(nextOverview);
    setProfileForm({
      name: nextOverview.profile.name,
      niche: nextOverview.profile.niche,
      brandSummary: nextOverview.profile.brandSummary,
      audience: nextOverview.profile.audience,
      approvalPhone: nextOverview.profile.approvalPhone,
      defaultRole: nextOverview.profile.defaultRole,
      defaultTone: nextOverview.profile.defaultTone,
      defaultDraftType: nextOverview.profile.defaultDraftType,
      objective: nextOverview.profile.objective,
      postsPerDay: String(nextOverview.profile.postsPerDay),
      planningDays: String(nextOverview.profile.planningDays),
      scheduleSlots: nextOverview.profile.scheduleSlots,
      autoGenerateDrafts: nextOverview.profile.autoGenerateDrafts,
      draftScheduleSlots: nextOverview.profile.draftScheduleSlots,
      generateImages: nextOverview.profile.generateImages,
      imageModel: nextOverview.profile.imageModel || "",
      imageAspectRatio: nextOverview.profile.imageAspectRatio
    });
    setGenerateForm((current) => ({
      ...current,
      count: String(nextOverview.profile.postsPerDay),
      role: nextOverview.profile.defaultRole,
      tone: nextOverview.profile.defaultTone,
      objective: nextOverview.profile.objective,
      type: nextOverview.profile.defaultDraftType
    }));
    setPlaygroundForm((current) => ({
      ...current,
      role: nextOverview.profile.defaultRole,
      tone: nextOverview.profile.defaultTone,
      objective: nextOverview.profile.objective,
      type: nextOverview.profile.defaultDraftType
    }));
  }, [platform]);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        await refreshOverview();
      } catch (error) {
        if (active) {
          pushToast({
            title: error instanceof Error ? error.message : "Gagal memuat creator studio",
            tone: "error"
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [pushToast, refreshOverview]);

  function updateScheduleSlot(index: number, patch: Partial<CreatorScheduleSlot>) {
    setProfileForm((current) => ({
      ...current,
      scheduleSlots: current.scheduleSlots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...patch } : slot
      )
    }));
  }

  function updateDraftScheduleSlot(index: number, patch: Partial<CreatorScheduleSlot>) {
    setProfileForm((current) => ({
      ...current,
      draftScheduleSlots: current.draftScheduleSlots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...patch } : slot
      )
    }));
  }

  function addDraftScheduleSlot() {
    setProfileForm((current) => ({
      ...current,
      draftScheduleSlots:
        current.draftScheduleSlots.length >= 24
          ? current.draftScheduleSlots
          : [...current.draftScheduleSlots, { label: `Slot ${current.draftScheduleSlots.length + 1}`, time: "09:00" }]
    }));
  }

  function removeDraftScheduleSlot(index: number) {
    setProfileForm((current) => ({
      ...current,
      draftScheduleSlots:
        current.draftScheduleSlots.length <= 1
          ? current.draftScheduleSlots
          : current.draftScheduleSlots.filter((_, slotIndex) => slotIndex !== index)
    }));
  }

  function parseScheduleSlots() {
    return profileForm.scheduleSlots
      .map((slot) => ({
        label: slot.label.trim() || "Slot",
        time: slot.time.trim()
      }))
      .filter((slot) => slot.time);
  }

  function parseDraftScheduleSlots() {
    return profileForm.draftScheduleSlots
      .map((slot) => ({
        label: slot.label.trim() || "Slot Draft",
        time: slot.time.trim()
      }))
      .filter((slot) => slot.time);
  }

  async function postJson(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.reason || "Request gagal");
    }

    return payload;
  }

  async function handleLoadCommerceSnapshot() {
    setBusyId("commerce-snapshot");

    try {
      const response = await fetch("/api/creator/commerce/snapshot", {
        cache: "no-store"
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal load snapshot Zyho Store");
      }

      setCommerceSnapshot(payload.snapshot as CommerceSnapshotPreview);
      pushToast({
        title: `Snapshot Zyho loaded: ${payload.counts.products} produk, ${payload.counts.vouchers} voucher, ${payload.counts.promos} promo`,
        tone: "success"
      });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal load snapshot Zyho Store",
        tone: "error"
      });
    } finally {
      setBusyId(null);
    }
  }

  async function pollCreatorJob(jobId: string) {
    while (true) {
      const response = await fetch(`/api/creator/jobs/${encodeURIComponent(jobId)}`, {
        cache: "no-store"
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal membaca status job");
      }

      const job = payload.job as CreatorAsyncJob;
      setActiveJob(job);

      if (job.status === "completed") {
        return job;
      }

      if (job.status === "failed") {
        throw new Error(job.reason || "Job gagal diproses");
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("profile");

    try {
      await postJson("/api/creator/profile", {
        platform,
        ...profileForm,
        postsPerDay: Number(profileForm.postsPerDay),
        planningDays: Number(profileForm.planningDays),
        scheduleSlots: parseScheduleSlots(),
        draftScheduleSlots: parseDraftScheduleSlots()
      });
      await refreshOverview();
      pushToast({ title: `Profile ${platformMeta[platform].label} tersimpan`, tone: "success" });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal menyimpan profile creator",
        tone: "error"
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("generate");
    setActiveJob(null);

    try {
      const payload = await postJson("/api/creator/generate", {
        platform,
        topic: generateForm.topic,
        count: Number(generateForm.count),
        role: generateForm.role,
        tone: generateForm.tone,
        objective: generateForm.objective,
        type: generateForm.type,
        autoSend: generateForm.autoSend
      });
      const job = await pollCreatorJob(String(payload.jobId));
      await refreshOverview();
      pushToast({
        title:
          generateForm.autoSend
            ? `Draft selesai dibuat (${job.result?.kind === "generate" ? job.result.drafts.length : 0}) dan dikirim ke approval`
            : `Draft selesai dibuat (${job.result?.kind === "generate" ? job.result.drafts.length : 0})`,
        tone: "success"
      });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal generate draft",
        tone: "error"
      });
    } finally {
      setActiveJob(null);
      setBusyId(null);
    }
  }

  async function handlePlayground(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("playground");
    setActiveJob(null);
    setPlaygroundCommerceContext(null);

    try {
      const payload = await postJson("/api/creator/playground", {
        platform,
        topic: playgroundForm.topic,
        count: Number(playgroundForm.count),
        role: playgroundForm.role,
        tone: playgroundForm.tone,
        objective: playgroundForm.objective,
        type: playgroundForm.type,
        simulateUpload: playgroundForm.simulateUpload,
        commerce:
          platform === "threads" && playgroundForm.commerceEnabled
            ? {
                enabled: true,
                focus: playgroundForm.commerceFocus,
                productId: playgroundForm.commerceProductId,
                voucherId: playgroundForm.commerceVoucherId,
                promoId: playgroundForm.commercePromoId,
                angle: playgroundForm.commerceAngle,
                style: playgroundForm.commerceStyle,
                length: playgroundForm.commerceLength,
                includeVoucher: playgroundForm.commerceIncludeVoucher,
                includePromo: playgroundForm.commerceIncludePromo
              }
            : { enabled: false }
      });
      const job = await pollCreatorJob(String(payload.jobId));

      if (job.result?.kind === "playground") {
        setPlaygroundDrafts(job.result.drafts);
        setPlaygroundSimulations(job.result.simulations || []);
        setPlaygroundCommerceContext(job.result.commerce || null);
      }
      pushToast({ title: `Simulasi ${platformMeta[platform].label} berhasil dibuat`, tone: "success" });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal membuat simulasi",
        tone: "error"
      });
    } finally {
      setActiveJob(null);
      setBusyId(null);
    }
  }

  async function handleDraftAction(
    draft: CreatorDraft,
    action: "approve" | "reject" | "regen" | "edit" | "send" | "publish" | "simulate_publish"
  ) {
    setBusyId(draft.draftId);

    try {
      let instruction = "";

      if (action === "edit") {
        instruction = window.prompt("Instruksi edit draft:", "buat lebih singkat dan tajam") ?? "";
        if (!instruction.trim()) {
          setBusyId(null);
          return;
        }
      }

      if (action === "regen") {
        instruction = window.prompt("Arahan regenerate opsional:", "hook lebih tajam") ?? "";
      }

      const payload = await postJson(`/api/creator/drafts/${draft.draftId}/action`, {
        action,
        instruction
      });

      await refreshOverview();
      pushToast({
        title:
          action === "send"
            ? "Draft dikirim ke nomor approval"
            : action === "simulate_publish"
              ? payload.simulation?.summary || "Simulasi upload selesai"
              : payload.result?.reply || payload.result?.summary || "Aksi draft berhasil",
        tone: "success"
      });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal menjalankan aksi draft",
        tone: "error"
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleTopicScout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("topic-scout");

    try {
      const payload = await postJson("/api/creator/topic-scout", {
        platform,
        query: topicScoutForm.query,
        limit: Number(topicScoutForm.limit)
      });

      await refreshOverview();
      const result = payload.result as { saved: number };
      pushToast({
        title: `Topic Scout selesai. ${result.saved} topik baru disimpan.`,
        tone: "success"
      });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal menjalankan Topic Scout",
        tone: "error"
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleThreadsScout(dryRun: boolean) {
    const keyword = scoutForm.keyword.trim();
    if (!keyword) {
      pushToast({ title: "Keyword wajib diisi.", tone: "error" });
      return;
    }
    setBusyId(dryRun ? "scout-sim" : "scout-run");
    setScoutResults(null);
    setScoutMeta(null);
    try {
      const response = await fetch("/api/social/threads/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          limit: Number(scoutForm.limit) || 20,
          maxReplies: Number(scoutForm.maxReplies) || 5,
          dryRun,
          persona: scoutForm.persona || undefined,
          sellAngle: scoutForm.sellAngle || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.reason || "Scout gagal");
      const result = payload.result as { keyword: string; found: number; replied: number; skipped: number; errors: number; results: Array<{ postId: string; username: string; postText: string; reply: string; replyId?: string; skipped?: boolean; skipReason?: string; error?: string }> };
      setScoutResults(result.results ?? []);
      setScoutMeta({ keyword: result.keyword, found: result.found, replied: result.replied, skipped: result.skipped, errors: result.errors, dryRun });
      pushToast({
        title: dryRun
          ? `Simulasi selesai. ${result.found} post ditemukan, ${result.replied} reply di-generate.`
          : `Scout selesai. ${result.replied} reply berhasil diposting.`,
        tone: "success"
      });
    } catch (error) {
      pushToast({ title: error instanceof Error ? error.message : "Scout gagal", tone: "error" });
    } finally {
      setBusyId(null);
    }
  }

  const flowStages = overview ? buildFlowStages(overview, platform) : [];

  const filteredTopics = overview?.topicBriefs.filter((t) => topicStatusFilter === "all" || t.status === topicStatusFilter) || [];
  const displayedTopics = topicLimit === "all" ? filteredTopics : filteredTopics.slice((topicPage - 1) * topicLimit, topicPage * topicLimit);
  const totalTopicPages = topicLimit === "all" ? 1 : Math.ceil(filteredTopics.length / topicLimit);

  const filteredDrafts = overview?.drafts.filter((d) => draftStatusFilter === "all" || d.status === draftStatusFilter) || [];
  const sortedDrafts = [...filteredDrafts].sort((left, right) => {
    if (draftSortBy === "status_asc") {
      return compareDraftsByStatus(left, right);
    }

    if (draftSortBy === "status_desc") {
      return compareDraftsByStatus(right, left);
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
  const displayedDrafts = draftLimit === "all" ? sortedDrafts : sortedDrafts.slice((draftPage - 1) * draftLimit, draftPage * draftLimit);
  const totalDraftPages = draftLimit === "all" ? 1 : Math.ceil(sortedDrafts.length / draftLimit);
  const loadedDraftItemsReadyToApprove = overview?.drafts.filter((draft) => draft.status === "draft" || draft.status === "pending_approval") || [];
  const draftItemsReadyToApproveCount = overview ? overview.stats.draft + overview.stats.pendingApproval : loadedDraftItemsReadyToApprove.length;
  const showApproveAllDraftsButton =
    draftItemsReadyToApproveCount > 0 || draftStatusFilter === "draft" || draftStatusFilter === "pending_approval";

  async function handleApproveAllDrafts() {
    setBusyId("approve-all-drafts");

    try {
      const payload = await postJson("/api/creator/drafts/action", {
        action: "approve_all",
        platform
      });

      await refreshOverview();
      pushToast({
        title: payload.result?.reply || "Semua draft berhasil di-approve",
        tone: "success"
      });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal approve semua draft",
        tone: "error"
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Jaka AI Creator"
        title={`${platformMeta[platform].label} Studio`}
        description={platformMeta[platform].description}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(platformMeta).map(([key, value]) => (
          <Link
            key={key}
            href={`/jaka-creator/${key}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              key === platform ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {value.label}
          </Link>
        ))}
      </div>

      {loading || !overview ? (
        <div className={sectionClassName}>Memuat creator studio...</div>
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className={sectionClassName}><p className="text-sm text-slate-500">Total Draft</p><p className="mt-3 text-3xl font-semibold text-slate-950">{overview.stats.totalDrafts}</p></div>
            <div className={sectionClassName}><p className="text-sm text-slate-500">Pending Approval</p><p className="mt-3 text-3xl font-semibold text-slate-950">{overview.stats.pendingApproval}</p></div>
            <div className={sectionClassName}><p className="text-sm text-slate-500">Scheduled</p><p className="mt-3 text-3xl font-semibold text-slate-950">{overview.stats.scheduled}</p></div>
            <div className={sectionClassName}><p className="text-sm text-slate-500">Approval Phone</p><p className="mt-3 text-lg font-semibold text-slate-950">{overview.profile.approvalPhone || "Belum diset"}</p></div>
            <div className={sectionClassName}><p className="text-sm text-slate-500">Posted</p><p className="mt-3 text-3xl font-semibold text-slate-950">{overview.stats.posted}</p></div>
            <div className={sectionClassName}><p className="text-sm text-slate-500">Failed</p><p className="mt-3 text-3xl font-semibold text-slate-950">{overview.stats.failed}</p></div>
          </div>

          <div className={sectionClassName}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Flow Jaka Creator</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Visualisasi worker pipeline dari pencarian topik sampai publish. Flow ini menyesuaikan status data di platform {platformMeta[platform].label}.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {platformMeta[platform].label} Pipeline
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              {flowStages.map((stage, index) => (
                <div key={stage.worker} className="relative rounded-3xl border border-slate-200/70 bg-slate-50/90 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</p>
                      <p className="mt-2 text-base font-semibold text-slate-950">{stage.worker}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        stage.state === "ready"
                          ? "bg-emerald-100 text-emerald-700"
                          : stage.state === "optional"
                            ? "bg-slate-200 text-slate-600"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {stage.state}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{stage.role}</p>
                  <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-600">{stage.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <form onSubmit={handleProfileSubmit} className={sectionClassName}>
              <h3 className="text-lg font-semibold text-slate-950">Profile dan Schedule</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nama creator" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
                <input value={profileForm.approvalPhone} onChange={(event) => setProfileForm((current) => ({ ...current, approvalPhone: event.target.value }))} placeholder="Nomor approval WhatsApp" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
                <input value={profileForm.niche} onChange={(event) => setProfileForm((current) => ({ ...current, niche: event.target.value }))} placeholder="Niche creator" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 md:col-span-2" />
                <textarea value={profileForm.brandSummary} onChange={(event) => setProfileForm((current) => ({ ...current, brandSummary: event.target.value }))} rows={3} placeholder="Ringkasan brand / positioning" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 md:col-span-2" />
                <textarea value={profileForm.audience} onChange={(event) => setProfileForm((current) => ({ ...current, audience: event.target.value }))} rows={3} placeholder="Target audience" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 md:col-span-2" />
                <select value={profileForm.defaultRole} onChange={(event) => setProfileForm((current) => ({ ...current, defaultRole: event.target.value as CreatorRole }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                <select value={profileForm.defaultTone} onChange={(event) => setProfileForm((current) => ({ ...current, defaultTone: event.target.value as CreatorTone }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{toneOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                <select value={profileForm.defaultDraftType} onChange={(event) => setProfileForm((current) => ({ ...current, defaultDraftType: event.target.value as CreatorDraftType }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{draftTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                <select value={profileForm.objective} onChange={(event) => setProfileForm((current) => ({ ...current, objective: event.target.value as CreatorObjective }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{objectiveOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                <input value={profileForm.postsPerDay} onChange={(event) => setProfileForm((current) => ({ ...current, postsPerDay: event.target.value }))} placeholder="Posts per day" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
                <input value={profileForm.planningDays} onChange={(event) => setProfileForm((current) => ({ ...current, planningDays: event.target.value }))} placeholder="Planning days" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <p className="text-sm font-medium text-slate-900">Schedule Slots</p>
                  <div className="mt-4 space-y-3">
                    {profileForm.scheduleSlots.map((slot, index) => (
                      <div key={`${slot.label}-${index}`} className="grid gap-3 sm:grid-cols-[1fr_180px]">
                        <input value={slot.label} onChange={(event) => updateScheduleSlot(index, { label: event.target.value })} placeholder="Label slot" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" />
                        <input type="time" value={slot.time} onChange={(event) => updateScheduleSlot(index, { time: event.target.value })} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={profileForm.autoGenerateDrafts}
                      onChange={(event) => setProfileForm((current) => ({ ...current, autoGenerateDrafts: event.target.checked }))}
                    />
                    Auto-generate draft dari pool topik fresh
                  </label>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Saat aktif, cron draft akan membuat 1 draft baru per slot waktu di bawah. Topic brief yang dipakai langsung
                    ditandai <span className="font-medium text-slate-900">used</span> agar tidak dipakai ulang. Jika AI error,
                    slot akan retry otomatis sampai berhasil dengan jeda bertahap.
                  </p>
                  <div className="mt-4 space-y-3">
                    {profileForm.draftScheduleSlots.map((slot, index) => (
                      <div key={`${slot.label}-${slot.time}-${index}`} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                        <input
                          value={slot.label}
                          onChange={(event) => updateDraftScheduleSlot(index, { label: event.target.value })}
                          placeholder="Label slot draft"
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                        />
                        <input
                          type="time"
                          value={slot.time}
                          onChange={(event) => updateDraftScheduleSlot(index, { time: event.target.value })}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => removeDraftScheduleSlot(index)}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addDraftScheduleSlot}
                    className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    Tambah slot draft ({profileForm.draftScheduleSlots.length}/24)
                  </button>
                </div>
                {isImagePlatform ? (
                  <>
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <input type="checkbox" checked={profileForm.generateImages} onChange={(event) => setProfileForm((current) => ({ ...current, generateImages: event.target.checked }))} />
                      Generate image dengan provider aktif
                    </label>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Model gambar mengikuti root Settings pada field <span className="font-medium text-slate-900">Image Model</span>. Jika provider aktif BytePlus, gunakan model image seperti Seedream atau SeedEdit. Jika provider aktif NaraRouter, gunakan model seperti <span className="font-medium text-slate-900">gpt-image-2</span>.
                    </div>
                    <select value={profileForm.imageAspectRatio} onChange={(event) => setProfileForm((current) => ({ ...current, imageAspectRatio: event.target.value as "1:1" | "4:5" | "16:9" }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                      <option value="1:1">1:1</option>
                      <option value="4:5">4:5</option>
                      <option value="16:9">16:9</option>
                    </select>
                  </>
                ) : null}
              </div>
              <button type="submit" disabled={busyId === "profile"} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60">{busyId === "profile" ? "Menyimpan..." : "Simpan Profile"}</button>
            </form>

            <div className="grid gap-6">
              <form onSubmit={handleGenerate} className={sectionClassName}>
                <h3 className="text-lg font-semibold text-slate-950">Generate Draft</h3>
                {activeJob?.kind === "generate" && busyId === "generate" ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Job {formatJobStatus(activeJob.status)}. ID: <span className="font-mono">{activeJob.jobId}</span>
                  </div>
                ) : null}
                <div className="mt-5 grid gap-4">
                  <input value={generateForm.topic} onChange={(event) => setGenerateForm((current) => ({ ...current, topic: event.target.value }))} placeholder="Topik opsional" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input value={generateForm.count} onChange={(event) => setGenerateForm((current) => ({ ...current, count: event.target.value }))} placeholder="Jumlah draft" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"><input type="checkbox" checked={generateForm.autoSend} onChange={(event) => setGenerateForm((current) => ({ ...current, autoSend: event.target.checked }))} />Kirim ke approval phone</label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-4">
                    <select value={generateForm.role} onChange={(event) => setGenerateForm((current) => ({ ...current, role: event.target.value as CreatorRole }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                    <select value={generateForm.tone} onChange={(event) => setGenerateForm((current) => ({ ...current, tone: event.target.value as CreatorTone }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{toneOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                    <select value={generateForm.objective} onChange={(event) => setGenerateForm((current) => ({ ...current, objective: event.target.value as CreatorObjective }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{objectiveOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                    <select value={generateForm.type} onChange={(event) => setGenerateForm((current) => ({ ...current, type: event.target.value as CreatorDraftType }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{draftTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  </div>
                </div>
                <button type="submit" disabled={busyId === "generate"} className="mt-5 rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-60">{busyId === "generate" ? "Memproses job..." : `Generate ${platformMeta[platform].label}`}</button>
              </form>

              <form onSubmit={handleTopicScout} className={sectionClassName}>
                <h3 className="text-lg font-semibold text-slate-950">Topic Scout</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Worker flow: <span className="font-medium text-slate-900">Scout Web</span> mencari trend terbaru, <span className="font-medium text-slate-900">Brief Strategist</span> merangkum 20 brief, lalu <span className="font-medium text-slate-900">Draft Writer</span> memakai antrean topik fresh saat field topic dikosongkan.
                </p>
                <div className="mt-5 grid gap-4">
                  <input
                    value={topicScoutForm.query}
                    onChange={(event) => setTopicScoutForm((current) => ({ ...current, query: event.target.value }))}
                    placeholder="Query opsional, misalnya: tren hotel terbaru direct booking indonesia"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={topicScoutForm.limit}
                      onChange={(event) => setTopicScoutForm((current) => ({ ...current, limit: event.target.value }))}
                      placeholder="Jumlah brief"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                    />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      Kalau field topic di form generate kosong, sistem akan ambil topik fresh dari antrean ini secara berurutan dan tidak repeat.
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={busyId === "topic-scout"} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
                  {busyId === "topic-scout" ? "Mencari topik..." : "Scout 20 Topik Baru"}
                </button>
              </form>

              <div className={sectionClassName}>
                <h3 className="text-lg font-semibold text-slate-950">Command Approval</h3>
                <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{overview.commandHelp.map((command) => <p key={command} className="font-mono">{command}</p>)}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={handlePlayground} className={sectionClassName}>
              <h3 className="text-lg font-semibold text-slate-950">Playground / Simulator</h3>
              <p className="mt-1 text-sm text-slate-500">
                Uji karakter konten {platformMeta[platform].label} tanpa menyimpan draft ke queue utama.
              </p>
              {activeJob?.kind === "playground" && busyId === "playground" ? (
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  Job {formatJobStatus(activeJob.status)}. ID: <span className="font-mono">{activeJob.jobId}</span>
                </div>
              ) : null}
              <div className="mt-5 grid gap-4">
                <input
                  value={playgroundForm.topic}
                  onChange={(event) => setPlaygroundForm((current) => ({ ...current, topic: event.target.value }))}
                  placeholder={`Simulasi topik ${platformMeta[platform].label}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={playgroundForm.count}
                      onChange={(event) => setPlaygroundForm((current) => ({ ...current, count: event.target.value }))}
                      placeholder="Jumlah preview"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                    />
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={playgroundForm.simulateUpload}
                      onChange={(event) =>
                        setPlaygroundForm((current) => ({ ...current, simulateUpload: event.target.checked }))
                      }
                    />
                    Simulasikan upload ke platform
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <select value={playgroundForm.role} onChange={(event) => setPlaygroundForm((current) => ({ ...current, role: event.target.value as CreatorRole }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  <select value={playgroundForm.tone} onChange={(event) => setPlaygroundForm((current) => ({ ...current, tone: event.target.value as CreatorTone }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{toneOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  <select value={playgroundForm.objective} onChange={(event) => setPlaygroundForm((current) => ({ ...current, objective: event.target.value as CreatorObjective }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{objectiveOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  <select value={playgroundForm.type} onChange={(event) => setPlaygroundForm((current) => ({ ...current, type: event.target.value as CreatorDraftType }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{draftTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                </div>
                {platform === "threads" ? (
                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-950">Zyho Store Commerce Playground</h4>
                        <p className="mt-1 text-xs leading-5 text-emerald-800">
                          Ambil snapshot produk, voucher, dan promo live dari zyho.store untuk membuat Threads single post yang faktual.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleLoadCommerceSnapshot()}
                        disabled={busyId === "commerce-snapshot"}
                        className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-900 disabled:opacity-60"
                      >
                        {busyId === "commerce-snapshot" ? "Loading snapshot..." : "Load Live Snapshot"}
                      </button>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-emerald-900">
                        <input
                          type="checkbox"
                          checked={playgroundForm.commerceEnabled}
                          onChange={(event) =>
                            setPlaygroundForm((current) => ({
                              ...current,
                              commerceEnabled: event.target.checked,
                              type: event.target.checked ? "single_post" : current.type
                            }))
                          }
                        />
                        Pakai data commerce Zyho
                      </label>
                      <select
                        value={playgroundForm.commerceFocus}
                        onChange={(event) => setPlaygroundForm((current) => ({ ...current, commerceFocus: event.target.value }))}
                        className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-emerald-950"
                      >
                        {commerceFocusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <select
                        value={playgroundForm.commerceAngle}
                        onChange={(event) => setPlaygroundForm((current) => ({ ...current, commerceAngle: event.target.value }))}
                        className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-emerald-950"
                      >
                        {commerceAngleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <select
                        value={playgroundForm.commerceStyle}
                        onChange={(event) => setPlaygroundForm((current) => ({ ...current, commerceStyle: event.target.value }))}
                        className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-emerald-950"
                      >
                        {commerceStyleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <select
                        value={playgroundForm.commerceLength}
                        onChange={(event) => setPlaygroundForm((current) => ({ ...current, commerceLength: event.target.value }))}
                        className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-emerald-950"
                      >
                        {commerceLengthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <select
                        value={playgroundForm.commerceProductId}
                        onChange={(event) => setPlaygroundForm((current) => ({ ...current, commerceProductId: event.target.value }))}
                        className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-emerald-950"
                      >
                        <option value="">Auto produk terbaik</option>
                        {(commerceSnapshot?.products || []).map((item, index) => {
                          const value = commerceItemValue(item);
                          return value ? <option key={value} value={value}>{commerceItemLabel(item, `Produk ${index + 1}`)}</option> : null;
                        })}
                      </select>
                      <select
                        value={playgroundForm.commerceVoucherId}
                        onChange={(event) => setPlaygroundForm((current) => ({ ...current, commerceVoucherId: event.target.value }))}
                        className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-emerald-950"
                      >
                        <option value="">Auto voucher relevan</option>
                        {(commerceSnapshot?.vouchers || []).map((item, index) => {
                          const value = commerceItemValue(item);
                          return value ? <option key={value} value={value}>{commerceItemLabel(item, `Voucher ${index + 1}`)}</option> : null;
                        })}
                      </select>
                      <select
                        value={playgroundForm.commercePromoId}
                        onChange={(event) => setPlaygroundForm((current) => ({ ...current, commercePromoId: event.target.value }))}
                        className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-emerald-950"
                      >
                        <option value="">Auto promo aktif</option>
                        {(commerceSnapshot?.promos || []).map((item, index) => {
                          const value = commerceItemValue(item);
                          return value ? <option key={value} value={value}>{commerceItemLabel(item, `Promo ${index + 1}`)}</option> : null;
                        })}
                      </select>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-emerald-900">
                        <input
                          type="checkbox"
                          checked={playgroundForm.commerceIncludeVoucher}
                          onChange={(event) => setPlaygroundForm((current) => ({ ...current, commerceIncludeVoucher: event.target.checked }))}
                        />
                        Sertakan voucher publik
                      </label>
                      <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-emerald-900">
                        <input
                          type="checkbox"
                          checked={playgroundForm.commerceIncludePromo}
                          onChange={(event) => setPlaygroundForm((current) => ({ ...current, commerceIncludePromo: event.target.checked }))}
                        />
                        Sertakan promo aktif
                      </label>
                    </div>
                    {commerceSnapshot ? (
                      <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-xs leading-5 text-emerald-900">
                        <p className="font-semibold">{commerceSnapshot.store?.name || "Zyho Store"} snapshot loaded</p>
                        <p>
                          Generated: {formatDateTime(commerceSnapshot.generatedAt)} . Produk {(commerceSnapshot.products || []).length} . Voucher {(commerceSnapshot.vouchers || []).length} . Promo {(commerceSnapshot.promos || []).length}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <button type="submit" disabled={busyId === "playground"} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60">{busyId === "playground" ? "Memproses simulasi..." : "Run Playground"}</button>
            </form>

            <div className={sectionClassName}>
              <h3 className="text-lg font-semibold text-slate-950">Preview Result</h3>
              {playgroundCommerceContext ? (
                <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
                  <p className="font-semibold">{playgroundCommerceContext.storeName} commerce context dipakai</p>
                  <p className="text-xs text-emerald-800">
                    Snapshot {formatDateTime(playgroundCommerceContext.generatedAt)} . Fokus {playgroundCommerceContext.focus} . Angle {playgroundCommerceContext.angle}
                    {" "} . Style {playgroundCommerceContext.style} . Length {playgroundCommerceContext.length}
                  </p>
                  <p className="text-xs text-emerald-800">
                    Produk {playgroundCommerceContext.counts.products} . Voucher {playgroundCommerceContext.counts.vouchers} . Promo {playgroundCommerceContext.counts.promos}
                  </p>
                  {Object.values(playgroundCommerceContext.selected).some(Boolean) ? (
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-white px-3 py-3 text-xs text-emerald-900">
                      {JSON.stringify(playgroundCommerceContext.selected, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-5 space-y-4">
                {playgroundDrafts.length === 0 ? (
                  <div className="rounded-3xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Jalankan playground untuk melihat simulasi konten {platformMeta[platform].label}.
                  </div>
                ) : (
                  playgroundDrafts.map((draft, index) => (
                    <div key={draft.id} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                      {(() => {
                        const displayImageUrl = getDisplayImageUrl(draft);
                        return (
                          <>
                      <p className="text-sm font-semibold text-slate-950">{draft.topic}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{draft.role} . {draft.tone} . {draft.objective}</p>
                      {isImagePlatform && displayImageUrl ? <img src={displayImageUrl} alt={draft.topic} className="mt-4 h-56 w-full rounded-3xl object-cover" /> : null}
                      {isImagePlatform && draft.imageError ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{draft.imageError}</div> : null}
                      {isImagePlatform && !draft.r2ImageUrl && draft.imageUrl ? (
                        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
                          Draft ini masih punya URL Ark sementara. `r2ImageUrl` belum tersimpan, jadi image permanen belum siap.
                        </div>
                      ) : null}
                      {draft.caption ? <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">{draft.caption}</div> : null}
                      <div className="mt-4 space-y-3">{draft.parts.map((part) => <div key={`${draft.id}-${part.index}`} className="rounded-2xl bg-white px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{part.type}</p><p className="mt-2 text-sm leading-6 text-slate-700">{part.content}</p></div>)}</div>
                      {playgroundSimulations[index] ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                          <p className="font-medium text-slate-900">Upload Simulator</p>
                          <p className="mt-2">{playgroundSimulations[index].summary}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                            {playgroundSimulations[index].provider} . {playgroundSimulations[index].targetLabel}
                          </p>
                          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-600">{JSON.stringify(playgroundSimulations[index].requestPreview, null, 2)}</pre>
                        </div>
                      ) : null}
                          </>
                        );
                      })()}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <div className={sectionClassName}>
                <h3 className="text-lg font-semibold text-slate-950">Topic Source</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Knowledge manual sudah dihilangkan. Sekarang konteks ide utama datang dari Topic Scout agar prompt lebih hemat token dan topik lebih dinamis.
                </p>
                <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  <p className="font-medium text-slate-900">Sumber konteks aktif:</p>
                  <p className="mt-2">1. Profile brand dan audience</p>
                  <p>2. Topic Queue hasil Scout Web + Brief Strategist</p>
                  <p>3. Style memory dari histori approval</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className={sectionClassName}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-slate-950">Topic Queue</h3>
                  <div className="flex items-center gap-2">
                    <select value={topicStatusFilter} onChange={(e) => { setTopicStatusFilter(e.target.value); setTopicPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
                      <option value="all">All Status</option>
                      <option value="fresh">Fresh</option>
                      <option value="used">Used</option>
                      <option value="archived">Archived</option>
                    </select>
                    <select value={String(topicLimit)} onChange={(e) => { setTopicLimit(e.target.value === "all" ? "all" : Number(e.target.value)); setTopicPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
                      <option value="5">Tampil 5</option>
                      <option value="10">Tampil 10</option>
                      <option value="20">Tampil 20</option>
                      <option value="all">Tampil Semua</option>
                    </select>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  {displayedTopics.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      {overview?.topicBriefs.length === 0 ? `Belum ada brief topik. Jalankan Topic Scout atau kirim command /scout ${platform}.` : "Tidak ada topik yang sesuai filter."}
                    </div>
                  ) : (
                    displayedTopics.map((item: CreatorTopicBrief) => {
                      const isExpanded = expandedTopics[item.id];
                      return (
                      <div key={item.id} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                        <div 
                          className="flex flex-wrap items-start justify-between gap-3 cursor-pointer group"
                          onClick={() => setExpandedTopics(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-950 group-hover:text-indigo-600 transition-colors">{item.topic}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{item.status} . {item.worker}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">{formatDateTime(item.createdAt)}</div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              {isExpanded ? "Tutup ▲" : "Buka ▼"}
                            </span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-4 border-t border-slate-200/60 pt-4">
                            <p className="text-sm leading-6 text-slate-700">{item.description}</p>
                            <p className="mt-3 text-sm leading-6 text-slate-600"><span className="font-medium text-slate-900">Angle:</span> {item.angle}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600"><span className="font-medium text-slate-900">Why now:</span> {item.whyNow}</p>
                            {item.references[0] ? (
                              <a href={item.references[0].url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700">
                                Open Source
                              </a>
                            ) : null}
                          </div>
                        )}
                      </div>
                      );
                    })
                  )}
                </div>
                {totalTopicPages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <button disabled={topicPage <= 1} onClick={() => setTopicPage((p) => Math.max(1, p - 1))} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 disabled:opacity-50">Prev</button>
                    <span className="text-xs text-slate-500">Halaman {topicPage} dari {totalTopicPages}</span>
                    <button disabled={topicPage >= totalTopicPages} onClick={() => setTopicPage((p) => Math.min(totalTopicPages, p + 1))} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 disabled:opacity-50">Next</button>
                  </div>
                )}
              </div>

              <div className={sectionClassName}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-slate-950">Draft Queue</h3>
                  <div className="flex items-center gap-2">
                    {showApproveAllDraftsButton ? (
                      <button
                        type="button"
                        disabled={busyId === "approve-all-drafts" || draftItemsReadyToApproveCount === 0}
                        onClick={() => void handleApproveAllDrafts()}
                        className="rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white disabled:opacity-60"
                      >
                        Approve All Draft ({draftItemsReadyToApproveCount})
                      </button>
                    ) : null}
                    <select value={draftStatusFilter} onChange={(e) => { setDraftStatusFilter(e.target.value); setDraftPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
                      <option value="all">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="pending_approval">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="rejected">Rejected</option>
                      <option value="posted">Posted</option>
                      <option value="failed">Failed</option>
                    </select>
                    <select value={draftSortBy} onChange={(e) => { setDraftSortBy(e.target.value as "latest" | "status_asc" | "status_desc"); setDraftPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
                      <option value="latest">Sort: Terbaru</option>
                      <option value="status_asc">Sort: Status Prioritas</option>
                      <option value="status_desc">Sort: Status Terendah</option>
                    </select>
                    <select value={String(draftLimit)} onChange={(e) => { setDraftLimit(e.target.value === "all" ? "all" : Number(e.target.value)); setDraftPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
                      <option value="5">Tampil 5</option>
                      <option value="10">Tampil 10</option>
                      <option value="20">Tampil 20</option>
                      <option value="all">Tampil Semua</option>
                    </select>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  {displayedDrafts.length === 0 ? <div className="rounded-3xl bg-slate-50 px-4 py-6 text-sm text-slate-500">{overview?.drafts.length === 0 ? "Belum ada draft creator." : "Tidak ada draft yang sesuai filter."}</div> : displayedDrafts.map((draft) => {
                  const isExpanded = expandedDrafts[draft.id];
                  return (
                  <div key={draft.id} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                    {(() => {
                      const displayImageUrl = getDisplayImageUrl(draft);
                      return (
                        <>
                    <div 
                      className="flex flex-wrap items-start justify-between gap-3 cursor-pointer group"
                      onClick={() => setExpandedDrafts(prev => ({ ...prev, [draft.id]: !prev[draft.id] }))}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-950 group-hover:text-indigo-600 transition-colors">{draft.draftId} . {draft.topic}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{draft.role} . {draft.tone} . {formatStatus(draft.status)} . v{draft.currentVersion}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">{draft.scheduledFor ? formatDateTime(draft.scheduledFor) : "Belum dijadwalkan"}</div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {isExpanded ? "Tutup ▲" : "Buka ▼"}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 border-t border-slate-200/60 pt-4">
                        {isImagePlatform && displayImageUrl ? <img src={displayImageUrl} alt={draft.topic} className="mt-4 h-56 w-full rounded-3xl object-cover" /> : null}
                        {isImagePlatform && draft.imageError ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{draft.imageError}</div> : null}
                        {isImagePlatform && !draft.r2ImageUrl && draft.imageUrl ? (
                          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
                            Draft ini masih punya URL Ark sementara. `r2ImageUrl` belum tersimpan, jadi image permanen belum siap.
                          </div>
                        ) : null}
                        {isImagePlatform && draft.r2ImageUrl ? (
                          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                            <span className="font-medium">Image source:</span> Cloudflare R2
                          </div>
                        ) : null}
                        {draft.caption ? <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">{draft.caption}</div> : null}
                        <div className="mt-4 space-y-3">{draft.parts.map((part) => <div key={`${draft.id}-${part.index}`} className="rounded-2xl bg-white px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{part.type}</p><p className="mt-2 text-sm leading-6 text-slate-700">{part.content}</p></div>)}</div>
                        {isImagePlatform && draft.visualPrompt ? <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600"><span className="font-medium text-slate-900">Visual prompt:</span> {draft.visualPrompt}</div> : null}
                        {draft.lastApprovalError ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><span className="font-medium">Approval:</span> {draft.lastApprovalError}</div> : null}
                        {draft.lastPublishSummary ? <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600"><span className="font-medium text-slate-900">Publish:</span> {draft.lastPublishSummary}</div> : null}
                        {draft.externalPostUrl ? <a href={draft.externalPostUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-emerald-200 px-4 py-2 text-xs font-medium text-emerald-700">Open Published Post</a> : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                           <button type="button" disabled={busyId === draft.draftId} onClick={() => void handleDraftAction(draft, "approve")} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white disabled:opacity-60">Approve</button>
                           <button type="button" disabled={busyId === draft.draftId} onClick={() => void handleDraftAction(draft, "regen")} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 disabled:opacity-60">Regen</button>
                           <button type="button" disabled={busyId === draft.draftId} onClick={() => void handleDraftAction(draft, "edit")} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 disabled:opacity-60">Edit</button>
                           <button type="button" disabled={busyId === draft.draftId} onClick={() => void handleDraftAction(draft, "reject")} className="rounded-full border border-rose-200 px-4 py-2 text-xs font-medium text-rose-600 disabled:opacity-60">Reject</button>
                           <button type="button" disabled={busyId === draft.draftId} onClick={() => void handleDraftAction(draft, "send")} className="rounded-full border border-emerald-200 px-4 py-2 text-xs font-medium text-emerald-700 disabled:opacity-60">Send Approval</button>
                           <button type="button" disabled={busyId === draft.draftId} onClick={() => void handleDraftAction(draft, "simulate_publish")} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 disabled:opacity-60">Simulate Upload</button>
                           <button type="button" disabled={busyId === draft.draftId} onClick={() => void handleDraftAction(draft, "publish")} className="rounded-full border border-indigo-200 px-4 py-2 text-xs font-medium text-indigo-700 disabled:opacity-60">Publish Now</button>
                        </div>
                      </div>
                    )}
                        </>
                      );
                    })()}
                  </div>
                  );
                  })}
                </div>
                {totalDraftPages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <button disabled={draftPage <= 1} onClick={() => setDraftPage((p) => Math.max(1, p - 1))} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 disabled:opacity-50">Prev</button>
                    <span className="text-xs text-slate-500">Halaman {draftPage} dari {totalDraftPages}</span>
                    <button disabled={draftPage >= totalDraftPages} onClick={() => setDraftPage((p) => Math.min(totalDraftPages, p + 1))} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 disabled:opacity-50">Next</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={sectionClassName}>
            <h3 className="text-lg font-semibold text-slate-950">Publish Logs</h3>
            <div className="mt-5 space-y-4">
              {overview.publishLogs.length === 0 ? <div className="rounded-3xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Belum ada log publish.</div> : overview.publishLogs.map((log) => (
                <div key={log.id} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{log.draftId} . {log.summary}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{log.provider} . {log.status} . {formatDateTime(log.createdAt)}</p>
                    </div>
                    {log.externalPostUrl ? <a href={log.externalPostUrl} target="_blank" rel="noreferrer" className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">Open</a> : null}
                  </div>
                  {log.error ? <p className="mt-3 text-sm leading-6 text-rose-600">{log.error}</p> : null}
                </div>
              ))}
            </div>
          </div>

          {/* ── Threads Scout Panel — only on Threads platform ── */}
          {platform === "threads" ? (
            <div className={sectionClassName}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Threads Scout — Auto Reply</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Cari postingan Threads berdasarkan keyword, generate reply natural pakai AI, lalu posting langsung. Simulasi dulu sebelum jalankan beneran.
                  </p>
                </div>
                <div className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                  Threads Only
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
                {/* Form */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Keyword</label>
                    <input
                      value={scoutForm.keyword}
                      onChange={(e) => setScoutForm((c) => ({ ...c, keyword: e.target.value }))}
                      placeholder="contoh: gpt plus, chatgpt, ai tools"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Limit Post</label>
                      <input
                        value={scoutForm.limit}
                        onChange={(e) => setScoutForm((c) => ({ ...c, limit: e.target.value }))}
                        placeholder="20"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Max Reply</label>
                      <input
                        value={scoutForm.maxReplies}
                        onChange={(e) => setScoutForm((c) => ({ ...c, maxReplies: e.target.value }))}
                        placeholder="5"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Persona AI <span className="font-normal text-slate-400">(opsional)</span>
                    </label>
                    <textarea
                      value={scoutForm.persona}
                      onChange={(e) => setScoutForm((c) => ({ ...c, persona: e.target.value }))}
                      rows={3}
                      placeholder="Kamu orang biasa yang suka teknologi. Gaya santai, pakai gw/lo/bgt. Jangan keliatan jualan."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Sell Angle <span className="font-normal text-slate-400">(opsional, selipkan natural)</span>
                    </label>
                    <textarea
                      value={scoutForm.sellAngle}
                      onChange={(e) => setScoutForm((c) => ({ ...c, sellAngle: e.target.value }))}
                      rows={3}
                      placeholder="Kami punya layanan AI WhatsApp untuk bisnis. Auto-reply 24 jam, mulai 299rb/bulan."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={busyId === "scout-sim" || busyId === "scout-run"}
                      onClick={() => void handleThreadsScout(true)}
                      className="flex-1 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700 transition hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === "scout-sim" ? "Mensimulasikan..." : "🔍 Simulasi (Dry Run)"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === "scout-sim" || busyId === "scout-run"}
                      onClick={() => void handleThreadsScout(false)}
                      className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === "scout-run" ? "Menjalankan..." : "🚀 Jalankan Sekarang"}
                    </button>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
                    <span className="font-medium text-slate-700">Simulasi</span> — generate reply AI tapi tidak posting ke Threads. Cocok untuk preview sebelum live.
                    <br />
                    <span className="font-medium text-slate-700">Jalankan</span> — scrape + generate + posting reply langsung. Post yang sudah direply tidak akan diulang.
                  </div>
                </div>

                {/* Results */}
                <div>
                  {scoutMeta ? (
                    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                          {scoutMeta.dryRun ? "DRY RUN" : "LIVE"}
                        </span>
                        <span className="text-sm text-slate-600">
                          Keyword: <span className="font-medium text-slate-900">{scoutMeta.keyword}</span>
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-xl bg-white px-2 py-2">
                          <p className="text-lg font-semibold text-slate-950">{scoutMeta.found}</p>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Ditemukan</p>
                        </div>
                        <div className="rounded-xl bg-white px-2 py-2">
                          <p className="text-lg font-semibold text-emerald-600">{scoutMeta.replied}</p>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Reply</p>
                        </div>
                        <div className="rounded-xl bg-white px-2 py-2">
                          <p className="text-lg font-semibold text-slate-400">{scoutMeta.skipped}</p>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Skip</p>
                        </div>
                        <div className="rounded-xl bg-white px-2 py-2">
                          <p className="text-lg font-semibold text-rose-500">{scoutMeta.errors}</p>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Error</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {scoutResults === null ? (
                      <div className="rounded-3xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                        Hasil simulasi atau run akan muncul di sini.
                      </div>
                    ) : scoutResults.length === 0 ? (
                      <div className="rounded-3xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                        Tidak ada post yang ditemukan untuk keyword ini.
                      </div>
                    ) : (
                      scoutResults.map((item, index) => (
                        <div
                          key={item.postId || index}
                          className={`rounded-3xl border p-4 ${
                            item.error
                              ? "border-rose-200 bg-rose-50"
                              : item.skipped
                                ? "border-slate-100 bg-slate-50/60 opacity-60"
                                : "border-emerald-100 bg-emerald-50/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              @{item.username}
                            </p>
                            {item.skipped ? (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                SKIP · {item.skipReason}
                              </span>
                            ) : item.error ? (
                              <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                                ERROR
                              </span>
                            ) : item.replyId ? (
                              <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                POSTED · {item.replyId}
                              </span>
                            ) : (
                              <span className="rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                SIMULATED
                              </span>
                            )}
                          </div>

                          {/* Original post */}
                          <div className="mt-2 rounded-2xl bg-white/80 px-3 py-2 text-sm leading-6 text-slate-600">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Post asli</p>
                            {item.postText.slice(0, 200)}{item.postText.length > 200 ? "..." : ""}
                          </div>

                          {/* AI Reply */}
                          {item.reply ? (
                            <div className="mt-2 rounded-2xl bg-white px-3 py-2 text-sm leading-6 text-slate-800">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500 mb-1">Reply AI</p>
                              {item.reply}
                            </div>
                          ) : null}

                          {/* Error */}
                          {item.error ? (
                            <p className="mt-2 text-sm leading-6 text-rose-600">{item.error}</p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
