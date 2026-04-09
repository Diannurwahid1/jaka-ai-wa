"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast-provider";
import { formatDateTime } from "@/lib/utils";
import {
  CreatorDraft,
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
          ? `BytePlus aktif, rasio ${overview.profile.imageAspectRatio}`
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
    objective: "engagement" as CreatorObjective,
    postsPerDay: "1",
    planningDays: "3",
    scheduleSlots: defaultScheduleSlots(platform),
    autoGenerateDrafts: false,
    draftScheduleSlots: defaultDraftScheduleSlots(platform),
    generateImages: platformMeta[platform].imageFriendly,
    imageModel: "",
    imageAspectRatio: platform === "linkedin" ? "16:9" : platform === "instagram" ? "4:5" : "1:1"
  });
  const [generateForm, setGenerateForm] = useState({
    topic: "",
    count: "1",
    role: "informative" as CreatorRole,
    tone: "sharp" as CreatorTone,
    objective: "engagement" as CreatorObjective,
    autoSend: true
  });
  const [playgroundForm, setPlaygroundForm] = useState({
    topic: "",
    count: "1",
    role: "informative" as CreatorRole,
    tone: "sharp" as CreatorTone,
    objective: "engagement" as CreatorObjective,
    simulateUpload: true
  });
  const [playgroundDrafts, setPlaygroundDrafts] = useState<CreatorDraft[]>([]);
  const [playgroundSimulations, setPlaygroundSimulations] = useState<CreatorPublishSimulation[]>([]);
  const [topicScoutForm, setTopicScoutForm] = useState({
    query: "",
    limit: "20"
  });

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
      objective: nextOverview.profile.objective
    }));
    setPlaygroundForm((current) => ({
      ...current,
      role: nextOverview.profile.defaultRole,
      tone: nextOverview.profile.defaultTone,
      objective: nextOverview.profile.objective
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
        current.draftScheduleSlots.length >= 8
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

    try {
      await postJson("/api/creator/generate", {
        platform,
        topic: generateForm.topic,
        count: Number(generateForm.count),
        role: generateForm.role,
        tone: generateForm.tone,
        objective: generateForm.objective,
        autoSend: generateForm.autoSend
      });
      await refreshOverview();
      pushToast({
        title: generateForm.autoSend ? "Draft dibuat dan dikirim ke approval" : "Draft berhasil dibuat",
        tone: "success"
      });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal generate draft",
        tone: "error"
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handlePlayground(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("playground");

    try {
      const payload = await postJson("/api/creator/playground", {
        platform,
        topic: playgroundForm.topic,
        count: Number(playgroundForm.count),
        role: playgroundForm.role,
        tone: playgroundForm.tone,
        objective: playgroundForm.objective,
        simulateUpload: playgroundForm.simulateUpload
      });

      setPlaygroundDrafts(payload.drafts as CreatorDraft[]);
      setPlaygroundSimulations((payload.simulations as CreatorPublishSimulation[]) || []);
      pushToast({ title: `Simulasi ${platformMeta[platform].label} berhasil dibuat`, tone: "success" });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal membuat simulasi",
        tone: "error"
      });
    } finally {
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

  const flowStages = overview ? buildFlowStages(overview, platform) : [];

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
                    ditandai <span className="font-medium text-slate-900">used</span> agar tidak dipakai ulang.
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
                    Tambah slot draft
                  </button>
                </div>
                {platformMeta[platform].imageFriendly ? (
                  <>
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <input type="checkbox" checked={profileForm.generateImages} onChange={(event) => setProfileForm((current) => ({ ...current, generateImages: event.target.checked }))} />
                      Generate image dengan BytePlus
                    </label>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Model gambar mengikuti root Settings pada field <span className="font-medium text-slate-900">BytePlus Image Model</span> dan harus memakai model image BytePlus seperti Seedream atau SeedEdit.
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
                <div className="mt-5 grid gap-4">
                  <input value={generateForm.topic} onChange={(event) => setGenerateForm((current) => ({ ...current, topic: event.target.value }))} placeholder="Topik opsional" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input value={generateForm.count} onChange={(event) => setGenerateForm((current) => ({ ...current, count: event.target.value }))} placeholder="Jumlah draft" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" />
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"><input type="checkbox" checked={generateForm.autoSend} onChange={(event) => setGenerateForm((current) => ({ ...current, autoSend: event.target.checked }))} />Kirim ke approval phone</label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <select value={generateForm.role} onChange={(event) => setGenerateForm((current) => ({ ...current, role: event.target.value as CreatorRole }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                    <select value={generateForm.tone} onChange={(event) => setGenerateForm((current) => ({ ...current, tone: event.target.value as CreatorTone }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{toneOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                    <select value={generateForm.objective} onChange={(event) => setGenerateForm((current) => ({ ...current, objective: event.target.value as CreatorObjective }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{objectiveOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  </div>
                </div>
                <button type="submit" disabled={busyId === "generate"} className="mt-5 rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-60">{busyId === "generate" ? "Generating..." : `Generate ${platformMeta[platform].label}`}</button>
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
                <div className="grid gap-4 md:grid-cols-3">
                  <select value={playgroundForm.role} onChange={(event) => setPlaygroundForm((current) => ({ ...current, role: event.target.value as CreatorRole }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  <select value={playgroundForm.tone} onChange={(event) => setPlaygroundForm((current) => ({ ...current, tone: event.target.value as CreatorTone }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{toneOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  <select value={playgroundForm.objective} onChange={(event) => setPlaygroundForm((current) => ({ ...current, objective: event.target.value as CreatorObjective }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{objectiveOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                </div>
              </div>
              <button type="submit" disabled={busyId === "playground"} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60">{busyId === "playground" ? "Membuat simulasi..." : "Run Playground"}</button>
            </form>

            <div className={sectionClassName}>
              <h3 className="text-lg font-semibold text-slate-950">Preview Result</h3>
              <div className="mt-5 space-y-4">
                {playgroundDrafts.length === 0 ? (
                  <div className="rounded-3xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Jalankan playground untuk melihat simulasi konten {platformMeta[platform].label}.
                  </div>
                ) : (
                  playgroundDrafts.map((draft, index) => (
                    <div key={draft.id} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                      <p className="text-sm font-semibold text-slate-950">{draft.topic}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{draft.role} . {draft.tone} . {draft.objective}</p>
                      {draft.imageUrl ? <img src={draft.imageUrl} alt={draft.topic} className="mt-4 h-56 w-full rounded-3xl object-cover" /> : null}
                      {draft.imageError ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{draft.imageError}</div> : null}
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
                <h3 className="text-lg font-semibold text-slate-950">Topic Queue</h3>
                <div className="mt-5 space-y-4">
                  {overview.topicBriefs.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      Belum ada brief topik. Jalankan Topic Scout atau kirim command <span className="font-mono">/scout {platform}</span>.
                    </div>
                  ) : (
                    overview.topicBriefs.map((item: CreatorTopicBrief) => (
                      <div key={item.id} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{item.topic}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{item.status} . {item.worker}</p>
                          </div>
                          <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">{formatDateTime(item.createdAt)}</div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-700">{item.description}</p>
                        <p className="mt-3 text-sm leading-6 text-slate-600"><span className="font-medium text-slate-900">Angle:</span> {item.angle}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600"><span className="font-medium text-slate-900">Why now:</span> {item.whyNow}</p>
                        {item.references[0] ? (
                          <a href={item.references[0].url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700">
                            Open Source
                          </a>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={sectionClassName}>
                <h3 className="text-lg font-semibold text-slate-950">Draft Queue</h3>
                <div className="mt-5 space-y-4">
                  {overview.drafts.length === 0 ? <div className="rounded-3xl bg-slate-50 px-4 py-6 text-sm text-slate-500">Belum ada draft creator.</div> : overview.drafts.map((draft) => (
                  <div key={draft.id} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{draft.draftId} . {draft.topic}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{draft.role} . {draft.tone} . {formatStatus(draft.status)} . v{draft.currentVersion}</p>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">{draft.scheduledFor ? formatDateTime(draft.scheduledFor) : "Belum dijadwalkan"}</div>
                    </div>
                    {draft.imageUrl ? <img src={draft.imageUrl} alt={draft.topic} className="mt-4 h-56 w-full rounded-3xl object-cover" /> : null}
                    {draft.imageError ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{draft.imageError}</div> : null}
                    {draft.caption ? <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">{draft.caption}</div> : null}
                    <div className="mt-4 space-y-3">{draft.parts.map((part) => <div key={`${draft.id}-${part.index}`} className="rounded-2xl bg-white px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{part.type}</p><p className="mt-2 text-sm leading-6 text-slate-700">{part.content}</p></div>)}</div>
                    {draft.visualPrompt ? <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600"><span className="font-medium text-slate-900">Visual prompt:</span> {draft.visualPrompt}</div> : null}
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
                  ))}
                </div>
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
        </div>
      )}
    </div>
  );
}

