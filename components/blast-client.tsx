"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton, SkeletonLines } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { BlastTemplateData, BlastCampaignData, BlastExecutionLogData } from "@/lib/blast";

type Tab = "templates" | "campaigns" | "logs";

const SOCIAL_PLATFORMS = [
  { value: "threads", label: "Threads" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
];

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
};

export function BlastClient() {
  const { pushToast } = useToast();

  // State
  const [tab, setTab] = useState<Tab>("templates");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<BlastTemplateData[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<BlastTemplateData | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", text: "", imageUrl: "" });
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Campaigns
  const [campaigns, setCampaigns] = useState<BlastCampaignData[]>([]);
  const [editingCampaign, setEditingCampaign] = useState<BlastCampaignData | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    targetType: "whatsapp_group",
    socialPlatforms: [] as string[],
    intervalMinutes: 60,
    endDate: "",
  });
  const [campaignTargets, setCampaignTargets] = useState<{ targetId: string; label: string }[]>([]);
  const [campaignItems, setCampaignItems] = useState<
    { templateId: string; sortOrder: number; delayAfterMinutes: number }[]
  >([]);
  const [newTarget, setNewTarget] = useState({ targetId: "", label: "" });

  // Logs
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [logs, setLogs] = useState<BlastExecutionLogData[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        fetch("/api/blast/templates"),
        fetch("/api/blast/campaigns"),
      ]);
      const [tData, cData] = await Promise.all([tRes.json(), cRes.json()]);
      if (tData.ok) setTemplates(tData.templates);
      if (cData.ok) setCampaigns(cData.campaigns);
    } catch {
      pushToast({ title: "Gagal memuat data", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs(campaignId: string) {
    setLogsLoading(true);
    setSelectedCampaignId(campaignId);
    try {
      const res = await fetch(`/api/blast/logs?campaignId=${campaignId}`);
      const data = await res.json();
      if (data.ok) setLogs(data.logs);
    } catch {
      pushToast({ title: "Gagal memuat log", tone: "error" });
    } finally {
      setLogsLoading(false);
    }
  }

  // ── Template Handlers ──────────────────────────────

  function openNewTemplate() {
    setEditingTemplate(null);
    setTemplateForm({ name: "", text: "", imageUrl: "" });
    setShowTemplateForm(true);
    setImagePreview(null);
  }

  function openEditTemplate(t: BlastTemplateData) {
    setEditingTemplate(t);
    setTemplateForm({ name: t.name, text: t.text, imageUrl: t.imageUrl });
    setShowTemplateForm(true);
    setImagePreview(t.imageUrl || null);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/blast/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.ok && data.url) {
        setTemplateForm((p) => ({ ...p, imageUrl: data.url }));
        setImagePreview(data.url);
        pushToast({ title: "Gambar berhasil di-upload ke CDN" });
      } else {
        pushToast({ title: data.reason || "Gagal upload gambar", tone: "error" });
      }
    } catch {
      pushToast({ title: "Gagal upload gambar", tone: "error" });
    } finally {
      setUploadingImage(false);
    }
  }

  function removeUploadedImage() {
    setTemplateForm((p) => ({ ...p, imageUrl: "" }));
    setImagePreview(null);
  }

  async function saveTemplate(e: FormEvent) {
    e.preventDefault();
    if (!templateForm.name.trim() || !templateForm.text.trim()) {
      pushToast({ title: "Nama dan teks template wajib diisi", tone: "error" });
      return;
    }
    setSaving(true);
    try {
      const method = editingTemplate ? "PUT" : "POST";
      const body = editingTemplate
        ? { id: editingTemplate.id, ...templateForm }
        : templateForm;
      const res = await fetch("/api/blast/templates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        pushToast({ title: editingTemplate ? "Template diperbarui" : "Template dibuat" });
        setTemplateForm({ name: "", text: "", imageUrl: "" });
        setEditingTemplate(null);
        setShowTemplateForm(false);
        setImagePreview(null);
        await loadData();
      } else {
        pushToast({ title: data.reason || "Gagal menyimpan template", tone: "error" });
      }
    } catch {
      pushToast({ title: "Gagal menyimpan template", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Hapus template ini?")) return;
    try {
      const res = await fetch(`/api/blast/templates?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        pushToast({ title: "Template dihapus" });
        await loadData();
      } else {
        pushToast({ title: data.reason || "Gagal menghapus", tone: "error" });
      }
    } catch {
      pushToast({ title: "Gagal menghapus template", tone: "error" });
    }
  }

  // ── Campaign Handlers ─────────────────────────────

  function openNewCampaign() {
    setEditingCampaign(null);
    setCampaignForm({ name: "", targetType: "whatsapp_group", socialPlatforms: [], intervalMinutes: 60, endDate: "" });
    setCampaignTargets([]);
    setCampaignItems([]);
    setNewTarget({ targetId: "", label: "" });
  }

  function openEditCampaign(c: BlastCampaignData) {
    setEditingCampaign(c);
    setCampaignForm({
      name: c.name,
      targetType: c.targetType,
      socialPlatforms: c.socialPlatforms,
      intervalMinutes: c.intervalMinutes,
      endDate: c.endDate ? c.endDate.slice(0, 16) : "",
    });
    setCampaignTargets(c.targets.map((t) => ({ targetId: t.targetId, label: t.label })));
    setCampaignItems(
      c.items.map((i) => ({
        templateId: i.templateId,
        sortOrder: i.sortOrder,
        delayAfterMinutes: i.delayAfterMinutes,
      }))
    );
    setNewTarget({ targetId: "", label: "" });
  }

  function addTarget() {
    if (!newTarget.targetId.trim()) return;
    setCampaignTargets((prev) => [
      ...prev,
      { targetId: newTarget.targetId.trim(), label: newTarget.label.trim() || newTarget.targetId.trim() },
    ]);
    setNewTarget({ targetId: "", label: "" });
  }

  function removeTarget(idx: number) {
    setCampaignTargets((prev) => prev.filter((_, i) => i !== idx));
  }

  function addCampaignItem() {
    setCampaignItems((prev) => [
      ...prev,
      { templateId: "", sortOrder: prev.length, delayAfterMinutes: 0 },
    ]);
  }

  function updateCampaignItem(idx: number, field: string, value: string | number) {
    setCampaignItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  function removeCampaignItem(idx: number) {
    setCampaignItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleSocialPlatform(platform: string) {
    setCampaignForm((prev) => ({
      ...prev,
      socialPlatforms: prev.socialPlatforms.includes(platform)
        ? prev.socialPlatforms.filter((p) => p !== platform)
        : [...prev.socialPlatforms, platform],
    }));
  }

  async function saveCampaign(e: FormEvent) {
    e.preventDefault();
    if (!campaignForm.name.trim()) {
      pushToast({ title: "Nama campaign wajib diisi", tone: "error" });
      return;
    }
    if (campaignForm.targetType !== "social" && campaignTargets.length === 0) {
      pushToast({ title: "Minimal 1 target harus ditambahkan", tone: "error" });
      return;
    }
    if (campaignItems.length === 0) {
      pushToast({ title: "Minimal 1 template item harus ditambahkan", tone: "error" });
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        ...campaignForm,
        targets: campaignTargets,
        items: campaignItems,
      };
      if (editingCampaign) {
        body.id = editingCampaign.id;
      }

      const method = editingCampaign ? "PUT" : "POST";
      const res = await fetch("/api/blast/campaigns", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        pushToast({ title: editingCampaign ? "Campaign diperbarui" : "Campaign dibuat" });
        openNewCampaign();
        await loadData();
      } else {
        pushToast({ title: data.reason || "Gagal menyimpan campaign", tone: "error" });
      }
    } catch {
      pushToast({ title: "Gagal menyimpan campaign", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Hapus campaign ini? Semua log juga akan terhapus.")) return;
    try {
      const res = await fetch(`/api/blast/campaigns?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        pushToast({ title: "Campaign dihapus" });
        await loadData();
      } else {
        pushToast({ title: data.reason || "Gagal menghapus", tone: "error" });
      }
    } catch {
      pushToast({ title: "Gagal menghapus campaign", tone: "error" });
    }
  }

  async function executeCampaign(campaignId: string) {
    if (!confirm("Jalankan campaign sekarang? Template akan dikirim berurutan.")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/blast/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", campaignId }),
      });
      const data = await res.json();
      if (data.ok) {
        const successCount = (data.result?.logs as any[])?.filter((l: any) => l.status === "success").length ?? 0;
        const failCount = (data.result?.logs as any[])?.filter((l: any) => l.status === "failed").length ?? 0;
        pushToast({
          title: `Blast selesai: ${successCount} sukses, ${failCount} gagal`,
          tone: failCount > 0 ? "error" : "success",
        });
        await loadData();
        if (selectedCampaignId === campaignId) await loadLogs(campaignId);
      } else {
        pushToast({ title: data.reason || "Gagal eksekusi campaign", tone: "error" });
      }
    } catch {
      pushToast({ title: "Gagal eksekusi campaign", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function updateCampaignStatus(campaignId: string, status: string) {
    try {
      const res = await fetch("/api/blast/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: campaignId, status }),
      });
      const data = await res.json();
      if (data.ok) {
        pushToast({ title: `Campaign ${status === "active" ? "diaktifkan" : status === "paused" ? "dijeda" : "diubah"}` });
        await loadData();
      } else {
        pushToast({ title: data.reason || "Gagal mengubah status", tone: "error" });
      }
    } catch {
      pushToast({ title: "Gagal mengubah status", tone: "error" });
    }
  }

  // ── Render ────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <PageHeader eyebrow="Auto Blast" title="Auto Blast Scheduler" description="Kirim template berjadwal ke WhatsApp & media sosial." />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SkeletonLines rows={6} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Auto Blast"
        title="Auto Blast Scheduler"
        description="Atur template, jadwal, dan kirim otomatis ke WhatsApp Group & media sosial secara berurutan."
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {(["templates", "campaigns", "logs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t === "templates" ? "📋 Template" : t === "campaigns" ? "📢 Campaign" : "📜 Log"}
          </button>
        ))}
      </div>

      {/* ── TEMPLATES TAB ─────────────────────────── */}
      {tab === "templates" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Template List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Daftar Template</h3>
              <button
                onClick={openNewTemplate}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition"
              >
                + Template Baru
              </button>
            </div>

            {templates.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                Belum ada template. Buat template pertama untuk memulai.
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-slate-200 p-4 hover:border-accent/40 transition cursor-pointer"
                    onClick={() => openEditTemplate(t)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{t.name}</p>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{t.text}</p>
                        {t.imageUrl && (
                          <div className="flex items-center gap-2 mt-2">
                            <img src={t.imageUrl} alt="" className="h-10 w-10 rounded object-cover border border-slate-200" />
                            <span className="text-xs text-accent truncate">🖼 CDN Image</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplate(t.id);
                        }}
                        className="text-xs text-red-500 hover:text-red-700 shrink-0"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingTemplate ? "Edit Template" : "Template Baru"}
            </h3>

            {showTemplateForm ? (
              <form onSubmit={saveTemplate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Template</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Contoh: Promo Lebaran 1"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Teks / Caption
                  </label>
                  <textarea
                    value={templateForm.text}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, text: e.target.value }))}
                    placeholder="Tulis teks template di sini... (bisa untuk Threads utas, WA blast, dsb)"
                    rows={6}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-y"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Gambar <span className="text-slate-400 font-normal">(opsional)</span>
                  </label>

                  {imagePreview ? (
                    <div className="relative group">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full max-h-48 rounded-lg object-cover border border-slate-200"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={removeUploadedImage}
                          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition shadow"
                        >
                          🗑 Hapus Gambar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-accent/60 hover:bg-accent/5 transition">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? (
                        <span className="text-sm text-accent font-medium">Uploading...</span>
                      ) : (
                        <>
                          <span className="text-2xl mb-1">📤</span>
                          <span className="text-sm text-slate-500">Klik untuk upload gambar</span>
                          <span className="text-xs text-slate-400 mt-1">JPG, PNG, WebP — maks 10MB</span>
                        </>
                      )}
                    </label>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-400">atau masukkan URL gambar:</span>
                  </div>
                  <input
                    type="url"
                    value={templateForm.imageUrl}
                    onChange={(e) => {
                      const url = e.target.value;
                      setTemplateForm((p) => ({ ...p, imageUrl: url }));
                      setImagePreview(url || null);
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Gambar akan dikirim sebagai image+text di WA, dan sebagai post gambar di sosial media. Disimpan ke CDN (R2).
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : editingTemplate ? "Update Template" : "Simpan Template"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate(null);
                      setTemplateForm({ name: "", text: "", imageUrl: "" });
                      setShowTemplateForm(false);
                    }}
                    className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-slate-500 py-12 text-center">
                Klik &quot;Template Baru&quot; atau pilih template dari daftar untuk mengedit.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── CAMPAIGNS TAB ────────────────────────── */}
      {tab === "campaigns" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Campaign List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Daftar Campaign</h3>
              <button
                onClick={openNewCampaign}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition"
              >
                + Campaign Baru
              </button>
            </div>

            {campaigns.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                Belum ada campaign. Buat campaign untuk mulai auto blast.
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-slate-200 p-4 hover:border-accent/40 transition"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>
                            {STATUS_LABELS[c.status] || c.status}
                          </span>
                          <span className="text-xs text-slate-500">
                            {c.targetType === "social" ? "📱 Sosial Media" : c.targetType === "whatsapp_group" ? "👥 WA Group" : "💬 WA Individual"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {c.items.length} template • {c.targets.length} target • {c.intervalMinutes}m interval
                          </span>
                          {c.endDate && (
                            <span className="text-xs text-amber-600">
                              ⏰ Berakhir: {new Date(c.endDate).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {c.status === "active" ? (
                        <button
                          onClick={() => updateCampaignStatus(c.id, "paused")}
                          className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition"
                        >
                          ⏸ Jeda
                        </button>
                      ) : c.status === "paused" ? (
                        <button
                          onClick={() => updateCampaignStatus(c.id, "active")}
                          className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition"
                        >
                          ▶ Lanjutkan
                        </button>
                      ) : (
                        <button
                          onClick={() => updateCampaignStatus(c.id, "active")}
                          className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition"
                        >
                          ▶ Aktifkan
                        </button>
                      )}
                      <button
                        onClick={() => executeCampaign(c.id)}
                        disabled={saving}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition disabled:opacity-60"
                      >
                        ⚡ Eksekusi
                      </button>
                      <button
                        onClick={() => openEditCampaign(c)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        ✏ Edit
                      </button>
                      <button
                        onClick={() => loadLogs(c.id)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        📜 Log
                      </button>
                      <button
                        onClick={() => deleteCampaign(c.id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                      >
                        🗑 Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campaign Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingCampaign ? "Edit Campaign" : "Campaign Baru"}
            </h3>

            {editingCampaign || campaignForm.name !== "" || campaignTargets.length > 0 || campaignItems.length > 0 ? (
              <form onSubmit={saveCampaign} className="space-y-5 max-h-[650px] overflow-y-auto pr-1">
                {/* Basic Info */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Campaign</label>
                  <input
                    type="text"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Contoh: Promo Lebaran 2026"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    required
                  />
                </div>

                {/* Target Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Target Kirim</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: "whatsapp_group", label: "👥 WA Group" },
                      { value: "whatsapp_individual", label: "💬 WA Individu" },
                      { value: "social", label: "📱 Sosial Media" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCampaignForm((p) => ({ ...p, targetType: opt.value }))}
                        className={`rounded-lg px-4 py-2 text-sm font-medium border transition ${
                          campaignForm.targetType === opt.value
                            ? "bg-accent text-white border-accent"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social Platforms - show when targetType is social */}
                {campaignForm.targetType === "social" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Platform Sosial Media</label>
                    <div className="flex gap-2 flex-wrap">
                      {SOCIAL_PLATFORMS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => toggleSocialPlatform(p.value)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium border transition ${
                            campaignForm.socialPlatforms.includes(p.value)
                              ? "bg-accent text-white border-accent"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interval */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Interval Antar Siklus Template (menit)
                  </label>
                  <input
                    type="number"
                    value={campaignForm.intervalMinutes}
                    onChange={(e) =>
                      setCampaignForm((p) => ({
                        ...p,
                        intervalMinutes: Math.max(1, Number(e.target.value) || 60),
                      }))
                    }
                    min={1}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Setelah semua template selesai dikirim, tunggu interval ini sebelum mengulang dari template pertama.
                  </p>
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tanggal Berakhir <span className="text-slate-400 font-normal">(opsional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={campaignForm.endDate}
                    onChange={(e) =>
                      setCampaignForm((p) => ({
                        ...p,
                        endDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Campaign otomatis berhenti setelah tanggal ini. Kosongkan jika tidak ada batas waktu.
                  </p>
                </div>

                {/* Targets (WA) */}
                {campaignForm.targetType !== "social" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Target {campaignForm.targetType === "whatsapp_group" ? "Group WA" : "Nomor WA"}
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newTarget.targetId}
                        onChange={(e) => setNewTarget((p) => ({ ...p, targetId: e.target.value }))}
                        placeholder={
                          campaignForm.targetType === "whatsapp_group"
                            ? "628xxx@g.us"
                            : "6281234567890"
                        }
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <input
                        type="text"
                        value={newTarget.label}
                        onChange={(e) => setNewTarget((p) => ({ ...p, label: e.target.value }))}
                        placeholder="Label (opsional)"
                        className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <button
                        type="button"
                        onClick={addTarget}
                        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition shrink-0"
                      >
                        + Tambah
                      </button>
                    </div>
                    {campaignTargets.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {campaignTargets.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <span className="truncate">
                              {t.label !== t.targetId ? `${t.label} (${t.targetId})` : t.targetId}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeTarget(idx)}
                              className="text-red-500 hover:text-red-700 text-xs ml-2 shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Template Sequence */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">Urutan Template</label>
                    <button
                      type="button"
                      onClick={addCampaignItem}
                      className="rounded-lg border border-accent px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/5 transition"
                    >
                      + Tambah Template
                    </button>
                  </div>

                  {campaignItems.length === 0 ? (
                    <p className="text-sm text-slate-400 py-3 text-center border border-dashed border-slate-300 rounded-lg">
                      Tambahkan template untuk membuat urutan pengiriman.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-52 overflow-y-auto">
                      {campaignItems.map((item, idx) => (
                        <div key={idx} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500">
                              #{idx + 1}
                              {idx > 0 && item.delayAfterMinutes > 0
                                ? ` (delay ${item.delayAfterMinutes}m setelah template sebelumnya)`
                                : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCampaignItem(idx)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              ✕ Hapus
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={item.templateId}
                              onChange={(e) => updateCampaignItem(idx, "templateId", e.target.value)}
                              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                              required
                            >
                              <option value="">Pilih template...</option>
                              {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={item.delayAfterMinutes}
                              onChange={(e) =>
                                updateCampaignItem(idx, "delayAfterMinutes", Math.max(0, Number(e.target.value) || 0))
                              }
                              min={0}
                              placeholder="Delay (mnt)"
                              className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-2">
                    Template akan dikirim sesuai urutan. Delay antar template (menit) bisa diatur per item.
                    Setelah template terakhir, sistem menunggu interval lalu mengulang dari template pertama.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : editingCampaign ? "Update Campaign" : "Simpan Campaign"}
                  </button>
                  <button
                    type="button"
                    onClick={openNewCampaign}
                    className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-slate-500 py-12 text-center">
                Klik &quot;Campaign Baru&quot; atau pilih campaign dari daftar untuk mengedit.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── LOGS TAB ──────────────────────────────── */}
      {tab === "logs" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Execution Logs</h3>
            <select
              value={selectedCampaignId}
              onChange={(e) => {
                if (e.target.value) loadLogs(e.target.value);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="">Pilih campaign...</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {!selectedCampaignId ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              Pilih campaign untuk melihat log eksekusi.
            </p>
          ) : logsLoading ? (
            <SkeletonLines rows={4} />
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              Belum ada log eksekusi untuk campaign ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-2 px-3 font-medium text-slate-600">Waktu</th>
                    <th className="py-2 px-3 font-medium text-slate-600">Target</th>
                    <th className="py-2 px-3 font-medium text-slate-600">Platform</th>
                    <th className="py-2 px-3 font-medium text-slate-600">Status</th>
                    <th className="py-2 px-3 font-medium text-slate-600">Pesan / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="py-2 px-3 text-slate-900 max-w-[150px] truncate">
                        {log.targetLabel}
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {log.platform}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                            log.status === "success"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {log.status === "success" ? "✅ Sukses" : "❌ Gagal"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 max-w-[300px] truncate">
                        {log.status === "failed" ? log.error : log.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
