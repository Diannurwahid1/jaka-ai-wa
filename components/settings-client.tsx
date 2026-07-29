"use client";

import { FormEvent, useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Skeleton, SkeletonLines } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { AppSettings } from "@/types";

const initialSettings: AppSettings = {
  aiAutoReplyEnabled: true,
  creatorGenerationEnabled: true,
  aiApiUrl: "https://ai.sumopod.com/v1/chat/completions",
  aiApiKey: "",
  aiModel: "seed-2-0-pro",
  promptSystem: "",
  waApiUrl: "https://waflash.citradigitalhotel.it.com/api/v1",
  waSessionId: "",
  waToken: "",
  waMasterKey: "",
  mongodbUri: "",
  mongodbDb: "wa_ai",
  ragCollection: "knowledge",
  ragIndexName: "vector_index",
  embeddingProvider: "mongodb",
  embeddingApiKey: "",
  embeddingModel: "voyage-4-large",
  embeddingDimensions: "1024",
  embeddingBaseUrl: "https://ai.mongodb.com/v1",
  imageProvider: "byteplus",
  bytePlusApiKey: "",
  bytePlusBaseUrl: "https://ark.ap-southeast.bytepluses.com/api/v3",
  bytePlusImageModel: "seedream-4-5-251128",
  r2AccessKey: "",
  r2SecretKey: "",
  r2Bucket: "",
  r2Endpoint: "",
  r2PublicUrl: "",
  topicScoutSearchApiKey: "",
  topicScoutSearchUrl: "https://search.infoquest.bytepluses.com",
  topicScoutModelApiKey: "",
  topicScoutModelBaseUrl: "https://ark.ap-southeast.bytepluses.com/api/v3",
  topicScoutModel: "seed-2-0-mini-260215",
  topicScoutDefaultQuery: "tren terbaru hotel indonesia direct booking OTA website hotel AI customer service hospitality marketing",
  metaAppId: "",
  metaAppSecret: "",
  metaGraphVersion: "v23.0",
  metaFacebookPageId: "",
  metaFacebookPageName: "",
  metaInstagramBusinessId: "",
  metaInstagramUsername: "",
  metaPageAccessToken: "",
  metaPageTokenExpiresAt: "",
  threadsAppId: "",
  threadsAppSecret: "",
  threadsUserId: "",
  threadsUsername: "",
  threadsAccessToken: "",
  threadsTokenExpiresAt: "",
  threadsApiVersion: "v1.0",
  threadsApiBaseUrl: "https://graph.threads.net",
  linkedinClientId: "",
  linkedinClientSecret: "",
  linkedinRedirectUri: "",
  linkedinAccessToken: "",
  linkedinRefreshToken: "",
  linkedinTokenExpiresAt: "",
  linkedinAuthorUrn: "",
  linkedinOrganizationUrn: "",
  linkedinApiVersion: "202504",
  autoPostEnabled: false,
  schedulerSecret: "",
  seoKeywordEnabled: true,
  seoKeywordList: "",
  commerceIntegrationEnabled: false,
  commerceBaseUrl: "",
  commerceSnapshotPath: "/api/integrations/creator/catalog-snapshot",
  commerceIntegrationSecret: "",
  commerceSnapshotMaxAgeMinutes: "30",
  commercePrePublishRevalidation: true,
  commerceStaleDataBehavior: "hold",
  // Threads Scout
  threadsScoutEnabled: false,
  threadsScoutKeywords: "",
  threadsScoutPersona: "",
  threadsScoutSellAngle: "",
  threadsScoutLimitPerKeyword: "20",
  threadsScoutMaxRepliesPerRun: "5"
};

const voyageDimensionMap: Record<string, number[]> = {
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

function isMongoAtlasEmbeddingProvider(provider: string) {
  const normalized = provider.trim().toLowerCase();
  return normalized === "mongodb" || normalized === "voyage" || normalized === "atlas";
}

function getVoyageDimensions(model: string) {
  return voyageDimensionMap[model.trim().toLowerCase()] ?? [];
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
  description
}: {
  label: string;
  checked: boolean;
  onChange: (nextValue: boolean) => void;
  description: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1"
      />
      <span>
        <span className="block font-medium text-slate-900">{label}</span>
        <span className="mt-1 block leading-6 text-slate-600">{description}</span>
      </span>
    </label>
  );
}

function SettingsSkeleton() {
  return (
    <form className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {Array.from({ length: 2 }).map((_, index) => (
          <section key={index} className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3.5 w-44" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {Array.from({ length: 2 }).map((_, index) => (
          <section key={index} className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5 space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3.5 w-48" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
        <div className="rounded-3xl bg-slate-50 p-4">
          <SkeletonLines rows={3} />
        </div>
        <Skeleton className="mt-6 h-12 w-40" />
      </section>

      <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
        <div className="mb-5 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-52" />
        </div>
        <div className="rounded-3xl p-4">
          <SkeletonLines rows={2} />
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </section>
    </form>
  );
}

export function SettingsClient() {
  const { pushToast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testingEmbedding, setTestingEmbedding] = useState(false);
  const [embeddingTestResult, setEmbeddingTestResult] = useState<string | null>(null);
  const [testingMeta, setTestingMeta] = useState(false);
  const [testingThreads, setTestingThreads] = useState(false);
  const [testingLinkedIn, setTestingLinkedIn] = useState(false);
  const [testingR2, setTestingR2] = useState(false);
  const [runningPublisher, setRunningPublisher] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<string | null>(null);
  const [threadsTestResult, setThreadsTestResult] = useState<string | null>(null);
  const [linkedinTestResult, setLinkedinTestResult] = useState<string | null>(null);
  const [r2TestResult, setR2TestResult] = useState<string | null>(null);
  const [securityLoading, setSecurityLoading] = useState(true);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [security, setSecurity] = useState<{
    email: string | null;
    hasAdmin: boolean;
    passwordSource: "database";
    hasCustomPassword: boolean;
  } | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: ""
  });

  const [businessProfile, setBusinessProfile] = useState<{
    name: string;
    niche: string;
    brandSummary: string;
    audience: string;
    brandVisualStyle: string;
  }>({ name: "", niche: "", brandSummary: "", audience: "", brandVisualStyle: "" });
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessSaving, setBusinessSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const payload = await response.json();

      if (active && payload.ok) {
        setSettings(payload.settings);
      }

      if (active) {
        setLoading(false);
      }
    }

    async function loadSecurity() {
      const response = await fetch("/api/auth/security", { cache: "no-store" });
      const payload = await response.json();

      if (active && payload.ok) {
        setSecurity(payload.security);
      }

      if (active) {
        setSecurityLoading(false);
      }
    }

    async function loadBusiness() {
      const response = await fetch("/api/business", { cache: "no-store" });
      const payload = await response.json();

      if (active && payload.ok && payload.business) {
        setBusinessProfile({
          name: payload.business.name ?? "",
          niche: payload.business.niche ?? "",
          brandSummary: payload.business.brandSummary ?? "",
          audience: payload.business.audience ?? "",
          brandVisualStyle: payload.business.brandVisualStyle ?? ""
        });
      }

      if (active) {
        setBusinessLoading(false);
      }
    }

    loadSettings();
    loadSecurity();
    loadBusiness();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isMongoAtlasEmbeddingProvider(settings.embeddingProvider)) {
      return;
    }

    const suggestedDimensions = getVoyageDimensions(settings.embeddingModel);
    if (suggestedDimensions.length === 0) {
      return;
    }

    const currentDimension = settings.embeddingDimensions.trim();
    if (!currentDimension || !suggestedDimensions.includes(Number(currentDimension))) {
      setSettings((current) => ({
        ...current,
        embeddingDimensions: String(suggestedDimensions[0])
      }));
    }
  }, [settings.embeddingProvider, settings.embeddingModel, settings.embeddingDimensions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistSettings({ notify: true });
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      pushToast({ title: "Konfirmasi password baru tidak sama", tone: "error" });
      return;
    }

    setSecuritySaving(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          nextPassword: passwordForm.nextPassword
        })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal mengganti password");
      }

      setPasswordForm({
        currentPassword: "",
        nextPassword: "",
        confirmPassword: ""
      });

      const securityResponse = await fetch("/api/auth/security", { cache: "no-store" });
      const securityPayload = await securityResponse.json();

      if (securityResponse.ok && securityPayload.ok) {
        setSecurity(securityPayload.security);
      }

      pushToast({ title: "Password admin berhasil diperbarui", tone: "success" });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal mengganti password",
        tone: "error"
      });
    } finally {
      setSecuritySaving(false);
    }
  }

  async function handleTestEmbedding() {
    setTestingEmbedding(true);
    setEmbeddingTestResult(null);

    try {
      const response = await fetch("/api/settings/embedding-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal mengetes embedding");
      }

      const result = payload.result as {
        provider: string;
        model: string;
        vectorLength: number;
        expectedDimensions: number;
      };

      const matches = result.vectorLength === result.expectedDimensions;
      const summary = `${result.provider} / ${result.model} menghasilkan vector ${result.vectorLength} dimensi${matches ? " dan cocok dengan settings." : `, tapi settings sekarang ${result.expectedDimensions}.`}`;

      setEmbeddingTestResult(summary);
      pushToast({
        title: matches ? "Embedding berhasil diuji" : "Embedding berjalan, tapi dimensinya tidak cocok",
        tone: matches ? "success" : "error"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengetes embedding";
      setEmbeddingTestResult(message);
      pushToast({ title: message, tone: "error" });
    } finally {
      setTestingEmbedding(false);
    }
  }

  async function handleTestMetaConnection() {
    setTestingMeta(true);
    setMetaTestResult(null);

    try {
      await persistSettings();
      const response = await fetch("/api/social/meta/test", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal mengetes koneksi Meta");
      }

      const details = payload.result?.details ?? {};
      const summary = `${payload.result?.summary || "Meta tersambung"} Page: ${String(details.pageName ?? details.pageId ?? "-")}${details.instagramUsername ? ` | Instagram: @${String(details.instagramUsername)}` : ""}`;
      setMetaTestResult(summary);
      pushToast({ title: "Koneksi Meta valid", tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengetes koneksi Meta";
      setMetaTestResult(message);
      pushToast({ title: message, tone: "error" });
    } finally {
      setTestingMeta(false);
    }
  }

  async function handleTestLinkedInConnection() {
    setTestingLinkedIn(true);
    setLinkedinTestResult(null);

    try {
      await persistSettings();
      const response = await fetch("/api/social/linkedin/test", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal mengetes koneksi LinkedIn");
      }

      setLinkedinTestResult(String(payload.result?.summary || "LinkedIn connected"));
      pushToast({ title: "Koneksi LinkedIn valid", tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengetes koneksi LinkedIn";
      setLinkedinTestResult(message);
      pushToast({ title: message, tone: "error" });
    } finally {
      setTestingLinkedIn(false);
    }
  }

  async function handleTestR2Connection() {
    setTestingR2(true);
    setR2TestResult(null);

    try {
      await persistSettings();
      const response = await fetch("/api/settings/r2-test", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal mengetes koneksi R2");
      }

      const result = payload.result as {
        summary: string;
        bucket: string;
        publicUrl: string;
      };

      const summary = `${result.summary} Bucket: ${result.bucket} | Public URL: ${result.publicUrl}`;
      setR2TestResult(summary);
      pushToast({ title: "Koneksi R2 valid", tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengetes koneksi R2";
      setR2TestResult(message);
      pushToast({ title: message, tone: "error" });
    } finally {
      setTestingR2(false);
    }
  }

  async function handleTestThreadsConnection() {
    setTestingThreads(true);
    setThreadsTestResult(null);

    try {
      await persistSettings();
      const response = await fetch("/api/social/threads/test", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal mengetes koneksi Threads");
      }

      const details = payload.result?.details ?? {};
      const summary = `${payload.result?.summary || "Threads connected"} User: ${String(details.username ?? details.id ?? "-")}`;
      setThreadsTestResult(summary);
      pushToast({ title: "Koneksi Threads valid", tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengetes koneksi Threads";
      setThreadsTestResult(message);
      pushToast({ title: message, tone: "error" });
    } finally {
      setTestingThreads(false);
    }
  }

  async function handleTestCommerceConnection() {
    try {
      await persistSettings();
      const response = await fetch("/api/creator/commerce/test", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal test commerce snapshot");
      }

      pushToast({
        title: payload.summary || "Commerce snapshot berhasil diakses",
        tone: "success"
      });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal test commerce snapshot",
        tone: "error"
      });
    }
  }

  async function handleConnectLinkedIn() {
    try {
      await persistSettings();
      const response = await fetch("/api/social/linkedin/auth-url", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload.ok || !payload.url) {
        throw new Error(payload.reason || "Gagal membuat LinkedIn OAuth URL");
      }

      window.location.href = String(payload.url);
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal membuka LinkedIn OAuth",
        tone: "error"
      });
    }
  }

  async function handleConnectThreads() {
    try {
      await persistSettings();
      const response = await fetch("/api/social/threads/auth-url", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload.ok || !payload.url) {
        throw new Error(payload.reason || "Gagal membuat Threads OAuth URL");
      }

      window.location.href = String(payload.url);
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal membuka Threads OAuth",
        tone: "error"
      });
    }
  }

  async function handleRunPublisher() {
    setRunningPublisher(true);

    try {
      const response = await fetch("/api/creator/publish", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal menjalankan scheduler publisher");
      }

      const result = payload.result as {
        processed: number;
        posted: number;
        failed: number;
        reason?: string;
      };

      pushToast({
        title: result.reason || `Publisher jalan. Posted ${result.posted}, failed ${result.failed}.`,
        tone: result.failed > 0 ? "error" : "success"
      });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal menjalankan scheduler publisher",
        tone: "error"
      });
    } finally {
      setRunningPublisher(false);
    }
  }

  async function persistSettings(options?: { notify?: boolean }) {
    setSaving(true);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal menyimpan settings");
      }

      setSettings(payload.settings);

      if (options?.notify) {
        pushToast({ title: "Settings berhasil disimpan", tone: "success" });
      }

      return payload.settings as AppSettings;
    } catch (error) {
      if (options?.notify) {
        pushToast({
          title: error instanceof Error ? error.message : "Gagal menyimpan settings",
          tone: "error"
        });
      }

      throw error;
    } finally {
      setSaving(false);
    }
  }

  const suggestedDimensions = isMongoAtlasEmbeddingProvider(settings.embeddingProvider)
    ? getVoyageDimensions(settings.embeddingModel)
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Simpan konfigurasi AI, WA Blast, MongoDB, embedding, dan storage runtime ke database agar modul app jalan tanpa bergantung ke env shell manual."
      />

      {loading ? <SettingsSkeleton /> : (
        <>
      <form onSubmit={handleSubmit} className="grid gap-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section data-tour="settings-ai" className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-950">AI Config</h3>
              <p className="mt-1 text-sm text-slate-500">Provider AI utama untuk chat/completions, API key, model, dan prompt system.</p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      aiApiUrl: "https://ai.sumopod.com/v1/chat/completions",
                      aiModel: current.aiModel.trim() || "seed-2-0-pro"
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950"
                >
                  Pakai preset Sumopod
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      aiApiUrl: "https://router.bynara.id/v1/chat/completions",
                      aiModel: current.aiModel.trim() || "gpt-4.1-mini"
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950"
                >
                  Pakai preset NaraRouter
                </button>
              </div>
              <CheckboxField
                label="Aktifkan AI Auto Reply WA"
                checked={settings.aiAutoReplyEnabled}
                onChange={(nextValue) => setSettings((current) => ({ ...current, aiAutoReplyEnabled: nextValue }))}
                description="Jika dimatikan, pesan WhatsApp biasa tidak akan diproses askAI. Command action seperti /approve tetap jalan dan pesan non-command akan dibalas dengan teks handoff admin."
              />
              <InputField
                label="AI API URL"
                value={settings.aiApiUrl}
                onChange={(nextValue) => setSettings((current) => ({ ...current, aiApiUrl: nextValue }))}
                placeholder="https://ai.sumopod.com/v1/chat/completions"
              />
              <InputField
                label="AI API Key"
                value={settings.aiApiKey}
                onChange={(nextValue) => setSettings((current) => ({ ...current, aiApiKey: nextValue }))}
                placeholder="sk-xxxx"
                type="password"
              />
              <InputField
                label="Model"
                value={settings.aiModel}
                onChange={(nextValue) => setSettings((current) => ({ ...current, aiModel: nextValue }))}
                placeholder="seed-2-0-pro"
              />

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Prompt System</span>
                <textarea
                  value={settings.promptSystem}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, promptSystem: event.target.value }))
                  }
                  rows={12}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
                  placeholder="Masukkan prompt AI utama untuk customer service."
                />
              </label>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                Untuk <span className="font-medium text-slate-900">NaraRouter</span>, isi endpoint OpenAI-compatible seperti{" "}
                <span className="font-medium text-slate-900">https://router.bynara.id/v1/chat/completions</span>,
                masukkan API key Nara, lalu pilih model chat yang tersedia di akun Anda.
              </div>
            </div>
          </section>

          <section data-tour="settings-wa" className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-950">WA Blast Config</h3>
              <p className="mt-1 text-sm text-slate-500">Gateway sender, session id, token, dan master key.</p>
            </div>

            <div className="space-y-4">
              <InputField
                label="WA API URL"
                value={settings.waApiUrl}
                onChange={(nextValue) => setSettings((current) => ({ ...current, waApiUrl: nextValue }))}
                placeholder="https://waflash.citradigitalhotel.it.com/api/v1"
              />
              <InputField
                label="Session ID"
                value={settings.waSessionId}
                onChange={(nextValue) =>
                  setSettings((current) => ({ ...current, waSessionId: nextValue }))
                }
                placeholder="alphaprod"
              />
              <InputField
                label="WA Token"
                value={settings.waToken}
                onChange={(nextValue) => setSettings((current) => ({ ...current, waToken: nextValue }))}
                placeholder="Bearer token"
                type="password"
              />
              <InputField
                label="Master Key"
                value={settings.waMasterKey}
                onChange={(nextValue) =>
                  setSettings((current) => ({ ...current, waMasterKey: nextValue }))
                }
                placeholder="Secret untuk validasi webhook WA"
                type="password"
              />
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                Dipakai untuk memvalidasi request masuk ke <span className="font-medium text-slate-900">/api/webhook/wa</span>.
                Gateway WA sebaiknya mengirim secret ini lewat header seperti <span className="font-medium text-slate-900">Authorization</span>,
                <span className="font-medium text-slate-900"> x-signature</span>, atau <span className="font-medium text-slate-900">x-wa-master-key</span>.
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section data-tour="settings-mongo" className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-950">MongoDB Config</h3>
              <p className="mt-1 text-sm text-slate-500">Runtime config untuk knowledge base dan retrieval MongoDB Atlas.</p>
            </div>

            <div className="space-y-4">
              <InputField
                label="MongoDB URI"
                value={settings.mongodbUri}
                onChange={(nextValue) => setSettings((current) => ({ ...current, mongodbUri: nextValue }))}
                placeholder="mongodb+srv://user:pass@cluster.mongodb.net/"
                type="password"
              />
              <InputField
                label="Database"
                value={settings.mongodbDb}
                onChange={(nextValue) => setSettings((current) => ({ ...current, mongodbDb: nextValue }))}
                placeholder="wa_ai"
              />
              <InputField
                label="RAG Collection"
                value={settings.ragCollection}
                onChange={(nextValue) => setSettings((current) => ({ ...current, ragCollection: nextValue }))}
                placeholder="knowledge"
              />
              <InputField
                label="Vector Index Name"
                value={settings.ragIndexName}
                onChange={(nextValue) => setSettings((current) => ({ ...current, ragIndexName: nextValue }))}
                placeholder="vector_index"
              />
            </div>
          </section>

          <section data-tour="settings-embedding" className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-950">Embedding Config</h3>
              <p className="mt-1 text-sm text-slate-500">
                Digunakan untuk membuat vector embedding. Bisa pakai MongoDB Atlas Voyage AI, OpenAI, atau Ollama.
              </p>
            </div>

            <div className="space-y-4">
              <InputField
                label="Embedding Provider"
                value={settings.embeddingProvider}
                onChange={(nextValue) => {
                  setEmbeddingTestResult(null);
                  setSettings((current) => ({ ...current, embeddingProvider: nextValue }));
                }}
                placeholder="mongodb, openai, atau ollama"
              />
              <InputField
                label="Embedding API Key"
                value={settings.embeddingApiKey}
                onChange={(nextValue) => {
                  setEmbeddingTestResult(null);
                  setSettings((current) => ({ ...current, embeddingApiKey: nextValue }));
                }}
                placeholder="Model API key MongoDB Atlas / sk-embedding-key"
                type="password"
              />
              <InputField
                label="Embedding Model"
                value={settings.embeddingModel}
                onChange={(nextValue) => {
                  setEmbeddingTestResult(null);
                  setSettings((current) => ({ ...current, embeddingModel: nextValue }));
                }}
                placeholder="voyage-4-large atau text-embedding-3-small"
              />
              <InputField
                label="Embedding Dimensions"
                value={settings.embeddingDimensions}
                onChange={(nextValue) => {
                  setEmbeddingTestResult(null);
                  setSettings((current) => ({ ...current, embeddingDimensions: nextValue }));
                }}
                placeholder="1536"
              />
              <InputField
                label="Embedding Base URL"
                value={settings.embeddingBaseUrl}
                onChange={(nextValue) => {
                  setEmbeddingTestResult(null);
                  setSettings((current) => ({ ...current, embeddingBaseUrl: nextValue }));
                }}
                placeholder="https://ai.mongodb.com/v1 atau kosong jika default cloud"
              />

              {suggestedDimensions.length > 0 ? (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                  Model <span className="font-medium">{settings.embeddingModel || "-"}</span> biasanya cocok dengan dimensi{" "}
                  <span className="font-medium">{suggestedDimensions.join(", ")}</span>.
                  {suggestedDimensions.includes(Number(settings.embeddingDimensions.trim()))
                    ? " Nilai saat ini sudah sinkron."
                    : " Saya sarankan samakan field Dimensions dengan salah satu nilai itu."}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void handleTestEmbedding()}
                  disabled={testingEmbedding || saving || loading}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {testingEmbedding ? "Testing..." : "Test MongoDB Embedding"}
                </button>

                {embeddingTestResult ? (
                  <p className="text-sm leading-6 text-slate-600">{embeddingTestResult}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-950">Image Generation Config</h3>
              <p className="mt-1 text-sm text-slate-500">
                Dipakai oleh Jaka Creator untuk image generation Instagram, LinkedIn, dan Facebook. Saat ini mendukung BytePlus dan NaraRouter.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      imageProvider: "byteplus",
                      bytePlusBaseUrl: "https://ark.ap-southeast.bytepluses.com/api/v3",
                      bytePlusImageModel: current.bytePlusImageModel.trim() || "seedream-4-5-251128"
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950"
                >
                  Preset BytePlus
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      imageProvider: "nararouter",
                      bytePlusBaseUrl: "https://api-images.bynara.id/v1",
                      bytePlusImageModel: "gpt-image-2"
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950"
                >
                  Preset NaraRouter
                </button>
              </div>
              <SelectField
                label="Image Provider"
                value={settings.imageProvider}
                onChange={(nextValue) => setSettings((current) => ({ ...current, imageProvider: nextValue }))}
                options={[
                  { label: "BytePlus", value: "byteplus" },
                  { label: "NaraRouter", value: "nararouter" }
                ]}
              />
              <InputField
                label={settings.imageProvider === "nararouter" ? "NaraRouter API Key" : "BytePlus API Key"}
                value={settings.bytePlusApiKey}
                onChange={(nextValue) => setSettings((current) => ({ ...current, bytePlusApiKey: nextValue }))}
                placeholder={settings.imageProvider === "nararouter" ? "Nara API key" : "ARK API key"}
                type="password"
              />
              <InputField
                label={settings.imageProvider === "nararouter" ? "NaraRouter Base URL" : "BytePlus Base URL"}
                value={settings.bytePlusBaseUrl}
                onChange={(nextValue) => setSettings((current) => ({ ...current, bytePlusBaseUrl: nextValue }))}
                placeholder={
                  settings.imageProvider === "nararouter"
                    ? "https://api-images.bynara.id/v1"
                    : "https://ark.ap-southeast.bytepluses.com/api/v3"
                }
              />
              <InputField
                label={settings.imageProvider === "nararouter" ? "NaraRouter Image Model" : "BytePlus Image Model"}
                value={settings.bytePlusImageModel}
                onChange={(nextValue) => setSettings((current) => ({ ...current, bytePlusImageModel: nextValue }))}
                placeholder={settings.imageProvider === "nararouter" ? "gpt-image-2" : "seedream-4-5-251128"}
              />
              {settings.imageProvider === "nararouter" ? (
                <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                  NaraRouter image akan memanggil endpoint <span className="font-medium">/images/generations</span> dengan{" "}
                  <span className="font-medium">response_format=b64_json</span>. Default model yang dipasang adalah{" "}
                  <span className="font-medium">gpt-image-2</span>. Size yang didukung provider ini hanya{" "}
                  <span className="font-medium">1024x1024</span>, <span className="font-medium">2048x2048</span>, atau{" "}
                  <span className="font-medium">3840x2160</span>, jadi rasio seperti Instagram 4:5 akan otomatis dipetakan ke size square terdekat.
                </div>
              ) : (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                  Contoh valid untuk BytePlus image generation: <span className="font-medium">seedream-4-5-251128</span> atau{" "}
                  <span className="font-medium">seededit-3-0-i2i-250628</span>. Model seperti{" "}
                  <span className="font-medium">seed-2-0-pro-260328</span> hanya cocok untuk responses/chat dan akan ditolak oleh endpoint gambar.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-950">Topic Scout Config</h3>
              <p className="mt-1 text-sm text-slate-500">
                Worker pencari topik dinamis. Search API dipakai khusus untuk web search, lalu model API dipakai untuk merangkum hasil search menjadi brief konten yang disimpan ke Mongo.
              </p>
            </div>

            <div className="space-y-4">
              <InputField
                label="Search API Key"
                value={settings.topicScoutSearchApiKey}
                onChange={(nextValue) => setSettings((current) => ({ ...current, topicScoutSearchApiKey: nextValue }))}
                placeholder="Bearer search key"
                type="password"
              />
              <InputField
                label="Search URL"
                value={settings.topicScoutSearchUrl}
                onChange={(nextValue) => setSettings((current) => ({ ...current, topicScoutSearchUrl: nextValue }))}
                placeholder="https://search.infoquest.bytepluses.com"
              />
              <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                Provider auto-detect berdasarkan host. Untuk <span className="font-medium">Tavily</span> isi URL{" "}
                <span className="font-medium">https://api.tavily.com</span> dan API key <span className="font-medium">tvly-...</span>.
                Untuk <span className="font-medium">Serper</span> isi URL{" "}
                <span className="font-medium">https://google.serper.dev</span> dan API key dari Serper.
                Untuk <span className="font-medium">BytePlus InfoQuest</span> pakai{" "}
                <span className="font-medium">https://search.infoquest.bytepluses.com</span> dengan bearer key bawaan.
              </div>
              <InputField
                label="Scout Model API Key"
                value={settings.topicScoutModelApiKey}
                onChange={(nextValue) => setSettings((current) => ({ ...current, topicScoutModelApiKey: nextValue }))}
                placeholder="Bearer ARK model key"
                type="password"
              />
              <InputField
                label="Scout Model Base URL"
                value={settings.topicScoutModelBaseUrl}
                onChange={(nextValue) => setSettings((current) => ({ ...current, topicScoutModelBaseUrl: nextValue }))}
                placeholder="https://ark.ap-southeast.bytepluses.com/api/v3"
              />
              <InputField
                label="Scout Model"
                value={settings.topicScoutModel}
                onChange={(nextValue) => setSettings((current) => ({ ...current, topicScoutModel: nextValue }))}
                placeholder="seed-2-0-mini-260215"
              />
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                Ringkasnya: <span className="font-medium text-slate-900">Search API</span> untuk ambil hasil web terbaru,{" "}
                <span className="font-medium text-slate-900">Scout Model API</span> untuk chat/responses yang merangkum hasil tadi,
                dan <span className="font-medium text-slate-900">Image Generation Config</span> di atas tetap khusus image generation.
              </div>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Default Query</span>
                <textarea
                  value={settings.topicScoutDefaultQuery}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, topicScoutDefaultQuery: event.target.value }))
                  }
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
                  placeholder="tren terbaru hotel indonesia direct booking OTA hospitality marketing"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-950">Cloudflare R2 Config</h3>
              <p className="mt-1 text-sm text-slate-500">
                Dipakai untuk menyimpan image hasil BytePlus ke storage permanen sebelum draft disimpan dan dipublish.
              </p>
            </div>

            <div className="space-y-4">
              <InputField
                label="R2 Access Key"
                value={settings.r2AccessKey}
                onChange={(nextValue) => setSettings((current) => ({ ...current, r2AccessKey: nextValue }))}
                placeholder="Cloudflare R2 access key"
                type="password"
              />
              <InputField
                label="R2 Secret Key"
                value={settings.r2SecretKey}
                onChange={(nextValue) => setSettings((current) => ({ ...current, r2SecretKey: nextValue }))}
                placeholder="Cloudflare R2 secret key"
                type="password"
              />
              <InputField
                label="R2 Bucket"
                value={settings.r2Bucket}
                onChange={(nextValue) => setSettings((current) => ({ ...current, r2Bucket: nextValue }))}
                placeholder="nama-bucket"
              />
              <InputField
                label="R2 Endpoint"
                value={settings.r2Endpoint}
                onChange={(nextValue) => setSettings((current) => ({ ...current, r2Endpoint: nextValue }))}
                placeholder="https://<accountid>.r2.cloudflarestorage.com"
              />
              <InputField
                label="R2 Public URL"
                value={settings.r2PublicUrl}
                onChange={(nextValue) => setSettings((current) => ({ ...current, r2PublicUrl: nextValue }))}
                placeholder="https://cdn.example.com"
              />
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                Draft image yang akan dipublish harus berasal dari prefix <span className="font-medium text-slate-900">R2 Public URL</span>.
                URL Ark asli tetap opsional dan hanya disimpan untuk debug/source trace.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void handleTestR2Connection()}
                  disabled={testingR2 || saving || loading}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {testingR2 ? "Testing..." : "Test R2 Connection"}
                </button>

                {r2TestResult ? <p className="text-sm leading-6 text-slate-600">{r2TestResult}</p> : null}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-950">Meta Social Config</h3>
              <p className="mt-1 text-sm text-slate-500">
                Root config untuk publish Facebook Page dan Instagram Business via Meta Graph API.
              </p>
            </div>

            <div className="space-y-4">
              <InputField
                label="Meta App ID"
                value={settings.metaAppId}
                onChange={(nextValue) => setSettings((current) => ({ ...current, metaAppId: nextValue }))}
                placeholder="Meta app id"
              />
              <InputField
                label="Meta App Secret"
                value={settings.metaAppSecret}
                onChange={(nextValue) => setSettings((current) => ({ ...current, metaAppSecret: nextValue }))}
                placeholder="Meta app secret"
                type="password"
              />
              <InputField
                label="Graph Version"
                value={settings.metaGraphVersion}
                onChange={(nextValue) => setSettings((current) => ({ ...current, metaGraphVersion: nextValue }))}
                placeholder="v23.0"
              />
              <InputField
                label="Facebook Page ID"
                value={settings.metaFacebookPageId}
                onChange={(nextValue) => setSettings((current) => ({ ...current, metaFacebookPageId: nextValue }))}
                placeholder="Page ID"
              />
              <InputField
                label="Facebook Page Name"
                value={settings.metaFacebookPageName}
                onChange={(nextValue) => setSettings((current) => ({ ...current, metaFacebookPageName: nextValue }))}
                placeholder="Nama page untuk monitoring"
              />
              <InputField
                label="Instagram Business ID"
                value={settings.metaInstagramBusinessId}
                onChange={(nextValue) => setSettings((current) => ({ ...current, metaInstagramBusinessId: nextValue }))}
                placeholder="IG business account id"
              />
              <InputField
                label="Instagram Username"
                value={settings.metaInstagramUsername}
                onChange={(nextValue) => setSettings((current) => ({ ...current, metaInstagramUsername: nextValue }))}
                placeholder="username untuk display"
              />
              <InputField
                label="Meta Access Token"
                value={settings.metaPageAccessToken}
                onChange={(nextValue) => setSettings((current) => ({ ...current, metaPageAccessToken: nextValue }))}
                placeholder="User token dengan pages_show_list atau Page token"
                type="password"
              />
              <p className="text-xs leading-5 text-slate-500">
                Jika diisi user token, sistem akan mencoba mengambil Page access token otomatis untuk Facebook Page yang dipilih.
                Untuk auto-post Facebook Page, app tetap butuh scope <span className="font-medium text-slate-700">pages_manage_posts</span>,
                <span className="font-medium text-slate-700"> pages_read_engagement</span>, dan
                <span className="font-medium text-slate-700"> pages_show_list</span>.
              </p>
              <InputField
                label="Token Expires At"
                value={settings.metaPageTokenExpiresAt}
                onChange={(nextValue) => setSettings((current) => ({ ...current, metaPageTokenExpiresAt: nextValue }))}
                placeholder="2026-04-30T12:00:00.000Z"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void handleTestMetaConnection()}
                  disabled={testingMeta || saving || loading}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {testingMeta ? "Testing..." : "Test Meta Connection"}
                </button>

                {metaTestResult ? <p className="text-sm leading-6 text-slate-600">{metaTestResult}</p> : null}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-950">LinkedIn Config</h3>
              <p className="mt-1 text-sm text-slate-500">
                Root config LinkedIn OAuth 2.0, actor URN, dan token publish untuk personal atau organization.
              </p>
            </div>

            <div className="space-y-4">
              <InputField
                label="Client ID"
                value={settings.linkedinClientId}
                onChange={(nextValue) => setSettings((current) => ({ ...current, linkedinClientId: nextValue }))}
                placeholder="LinkedIn client id"
              />
              <InputField
                label="Client Secret"
                value={settings.linkedinClientSecret}
                onChange={(nextValue) => setSettings((current) => ({ ...current, linkedinClientSecret: nextValue }))}
                placeholder="LinkedIn client secret"
                type="password"
              />
              <InputField
                label="Redirect URI"
                value={settings.linkedinRedirectUri}
                onChange={(nextValue) => setSettings((current) => ({ ...current, linkedinRedirectUri: nextValue }))}
                placeholder="https://domain.com/api/social/linkedin/callback"
              />
              <InputField
                label="Access Token"
                value={settings.linkedinAccessToken}
                onChange={(nextValue) => setSettings((current) => ({ ...current, linkedinAccessToken: nextValue }))}
                placeholder="LinkedIn access token"
                type="password"
              />
              <InputField
                label="Refresh Token"
                value={settings.linkedinRefreshToken}
                onChange={(nextValue) => setSettings((current) => ({ ...current, linkedinRefreshToken: nextValue }))}
                placeholder="LinkedIn refresh token"
                type="password"
              />
              <InputField
                label="Token Expires At"
                value={settings.linkedinTokenExpiresAt}
                onChange={(nextValue) => setSettings((current) => ({ ...current, linkedinTokenExpiresAt: nextValue }))}
                placeholder="2026-04-30T12:00:00.000Z"
              />
              <InputField
                label="Author URN"
                value={settings.linkedinAuthorUrn}
                onChange={(nextValue) => setSettings((current) => ({ ...current, linkedinAuthorUrn: nextValue }))}
                placeholder="urn:li:person:xxxx"
              />
              <InputField
                label="Organization URN"
                value={settings.linkedinOrganizationUrn}
                onChange={(nextValue) => setSettings((current) => ({ ...current, linkedinOrganizationUrn: nextValue }))}
                placeholder="urn:li:organization:xxxx"
              />
              <InputField
                label="LinkedIn API Version"
                value={settings.linkedinApiVersion}
                onChange={(nextValue) => setSettings((current) => ({ ...current, linkedinApiVersion: nextValue }))}
                placeholder="202504"
              />

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => void handleConnectLinkedIn()}
                    disabled={saving || loading}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Connect LinkedIn OAuth
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleTestLinkedInConnection()}
                    disabled={testingLinkedIn || saving || loading}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {testingLinkedIn ? "Testing..." : "Test LinkedIn Connection"}
                  </button>
                </div>

                {linkedinTestResult ? <p className="text-sm leading-6 text-slate-600">{linkedinTestResult}</p> : null}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-950">Threads Config</h3>
              <p className="mt-1 text-sm text-slate-500">
                Root config untuk publish Threads chain memakai Threads API dengan nested self-replies.
              </p>
            </div>

              <div className="space-y-4">
                <InputField
                  label="Threads App ID"
                  value={settings.threadsAppId}
                  onChange={(nextValue) => setSettings((current) => ({ ...current, threadsAppId: nextValue }))}
                  placeholder="Threads OAuth app id"
                />
                <InputField
                  label="Threads App Secret"
                  value={settings.threadsAppSecret}
                  onChange={(nextValue) => setSettings((current) => ({ ...current, threadsAppSecret: nextValue }))}
                  placeholder="Threads OAuth app secret"
                  type="password"
                />
                <InputField
                  label="Threads User ID"
                  value={settings.threadsUserId}
                  onChange={(nextValue) => setSettings((current) => ({ ...current, threadsUserId: nextValue }))}
                  placeholder="threads user id atau kosong untuk me"
              />
              <InputField
                label="Threads Username"
                value={settings.threadsUsername}
                onChange={(nextValue) => setSettings((current) => ({ ...current, threadsUsername: nextValue }))}
                placeholder="username untuk display"
              />
              <InputField
                label="Threads Access Token"
                value={settings.threadsAccessToken}
                onChange={(nextValue) => setSettings((current) => ({ ...current, threadsAccessToken: nextValue }))}
                placeholder="threads access token"
                type="password"
              />
              <InputField
                label="Threads Token Expires At"
                value={settings.threadsTokenExpiresAt}
                onChange={(nextValue) => setSettings((current) => ({ ...current, threadsTokenExpiresAt: nextValue }))}
                placeholder="2026-04-30T12:00:00.000Z"
              />
              <InputField
                label="Threads API Version"
                value={settings.threadsApiVersion}
                onChange={(nextValue) => setSettings((current) => ({ ...current, threadsApiVersion: nextValue }))}
                placeholder="v1.0"
              />
              <InputField
                label="Threads API Base URL"
                value={settings.threadsApiBaseUrl}
                onChange={(nextValue) => setSettings((current) => ({ ...current, threadsApiBaseUrl: nextValue }))}
                placeholder="https://graph.threads.net"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void handleConnectThreads()}
                  disabled={saving || loading}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Connect Threads OAuth
                </button>
                <button
                  type="button"
                  onClick={() => void handleTestThreadsConnection()}
                  disabled={testingThreads || saving || loading}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {testingThreads ? "Testing..." : "Test Threads Connection"}
                </button>

                {threadsTestResult ? <p className="text-sm leading-6 text-slate-600">{threadsTestResult}</p> : null}
              </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  Isi kredensial OAuth di sini bila app Threads berbeda dari app Meta utama. Jika dikosongkan, sistem fallback ke Meta App ID dan Meta App Secret. Untuk thread series, app akan membuat main post lalu self-reply berantai memakai `reply_to_id`.
                </div>
              </div>
            </section>

          {/* ── Threads Scout ── */}
          <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-950">Threads Scout — Auto Reply Keyword</h3>
              <p className="mt-1 text-sm text-slate-500">
                Scrape postingan Threads berdasarkan keyword, lalu auto-reply dengan gaya bahasa natural AI. Cocok untuk engagement organik dan soft-selling.
              </p>
            </div>

            <div className="space-y-4">
              <CheckboxField
                label="Aktifkan Threads Scout"
                checked={settings.threadsScoutEnabled}
                onChange={(nextValue) => setSettings((current) => ({ ...current, threadsScoutEnabled: nextValue }))}
                description="Saat aktif, cron job /api/cron/threads-scout akan scrape keyword dan auto-reply ke postingan yang ditemukan."
              />

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Keywords (satu per baris)</span>
                <textarea
                  value={settings.threadsScoutKeywords}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, threadsScoutKeywords: event.target.value }))
                  }
                  rows={6}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
                  placeholder={"gpt plus\nchatgpt\nai tools\nai untuk bisnis"}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Persona AI (opsional)</span>
                <textarea
                  value={settings.threadsScoutPersona}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, threadsScoutPersona: event.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
                  placeholder={"Kamu orang biasa yang suka teknologi. Gaya bahasa santai, pakai singkatan kayak gw/lo/bgt. Jangan keliatan jualan."}
                />
                <p className="text-xs text-slate-400">Kosongkan untuk pakai persona default (casual Indonesian).</p>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Sell Angle / Konteks Produk</span>
                <textarea
                  value={settings.threadsScoutSellAngle}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, threadsScoutSellAngle: event.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
                  placeholder={"Kami punya layanan AI WhatsApp untuk bisnis. Bisa auto-reply customer 24 jam, hemat waktu, dan meningkatkan closing. Harga mulai 299rb/bulan."}
                />
                <p className="text-xs text-slate-400">AI akan selipkan ini secara natural jika relevan. Jika tidak relevan, AI akan skip.</p>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Limit Post per Keyword"
                  value={settings.threadsScoutLimitPerKeyword}
                  onChange={(nextValue) =>
                    setSettings((current) => ({ ...current, threadsScoutLimitPerKeyword: nextValue }))
                  }
                  placeholder="20"
                />
                <InputField
                  label="Max Reply per Run"
                  value={settings.threadsScoutMaxRepliesPerRun}
                  onChange={(nextValue) =>
                    setSettings((current) => ({ ...current, threadsScoutMaxRepliesPerRun: nextValue }))
                  }
                  placeholder="5"
                />
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                Cron: <code className="rounded bg-slate-200 px-1">POST /api/cron/threads-scout</code> dengan header{" "}
                <code className="rounded bg-slate-200 px-1">x-scheduler-secret</code>. Sistem otomatis skip post yang sudah pernah direply (dedup by post ID).
              </div>
            </div>
          </section>

        </div>

        <section data-tour="settings-security" className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
          <div className="rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            {loading
              ? "Memuat konfigurasi..."
              : "Semua konfigurasi runtime disimpan ke database inti aplikasi. Setelah nilai MongoDB dan embedding diisi di sini, modul RAG akan membaca settings ini langsung tanpa perlu restart shell atau mengandalkan env manual."}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan Settings"}
          </button>
        </section>

        <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-950">Scheduling dan Automation</h3>
            <p className="mt-1 text-sm text-slate-500">
              Root switch untuk auto-post scheduler. Cron publik memakai endpoint `/api/cron/creator-publish` dengan header `x-scheduler-secret`.
            </p>
          </div>

          <div className="space-y-4">
            <CheckboxField
              label="Aktifkan Generator Jaka Creator"
              checked={settings.creatorGenerationEnabled}
              onChange={(nextValue) =>
                setSettings((current) => ({ ...current, creatorGenerationEnabled: nextValue }))
              }
              description="Mengontrol pembuatan draft dan topic generation Jaka Creator. Jika dimatikan, generate draft manual, generate terjadwal, dan Topic Scout akan ditolak."
            />
            <CheckboxField
              label="Aktifkan Auto Post"
              checked={settings.autoPostEnabled}
              onChange={(nextValue) => setSettings((current) => ({ ...current, autoPostEnabled: nextValue }))}
              description="Saat aktif, draft `scheduled` yang sudah due bisa diproses oleh cron publisher."
            />
            <InputField
              label="Scheduler Secret"
              value={settings.schedulerSecret}
              onChange={(nextValue) => setSettings((current) => ({ ...current, schedulerSecret: nextValue }))}
              placeholder="secret untuk cron publisher"
              type="password"
            />
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              Contoh cron: `POST /api/cron/creator-publish` dengan header `x-scheduler-secret: ...`.
              Draft due juga bisa dipaksa jalan dari dashboard lewat tombol manual run.
            </div>
            <button
              type="button"
              onClick={() => void handleRunPublisher()}
              disabled={runningPublisher || saving || loading}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningPublisher ? "Menjalankan..." : "Run Publisher Now"}
            </button>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-950">Commerce Snapshot</h3>
            <p className="mt-1 text-sm text-slate-500">
              Koneksi read-only ke katalog Zyho Store untuk draft Creator berbasis produk, stok, voucher, dan promo aktual.
            </p>
          </div>

          <div className="space-y-4">
            <CheckboxField
              label="Aktifkan Commerce Snapshot"
              checked={settings.commerceIntegrationEnabled}
              onChange={(nextValue) =>
                setSettings((current) => ({ ...current, commerceIntegrationEnabled: nextValue }))
              }
              description="Saat aktif, Jaka Creator boleh mengambil snapshot commerce yang sudah disanitasi dari endpoint Zyho Store."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Commerce Base URL"
                value={settings.commerceBaseUrl}
                onChange={(nextValue) => setSettings((current) => ({ ...current, commerceBaseUrl: nextValue }))}
                placeholder="https://zyho.store atau http://localhost:3001"
              />
              <InputField
                label="Snapshot Path"
                value={settings.commerceSnapshotPath}
                onChange={(nextValue) => setSettings((current) => ({ ...current, commerceSnapshotPath: nextValue }))}
                placeholder="/api/integrations/creator/catalog-snapshot"
              />
            </div>
            <InputField
              label="Integration Secret"
              value={settings.commerceIntegrationSecret}
              onChange={(nextValue) => setSettings((current) => ({ ...current, commerceIntegrationSecret: nextValue }))}
              placeholder="CREATOR_INTEGRATION_SECRET"
              type="password"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Max Snapshot Age Minutes"
                value={settings.commerceSnapshotMaxAgeMinutes}
                onChange={(nextValue) =>
                  setSettings((current) => ({ ...current, commerceSnapshotMaxAgeMinutes: nextValue }))
                }
                placeholder="30"
              />
              <SelectField
                label="Stale Data Behavior"
                value={settings.commerceStaleDataBehavior}
                onChange={(nextValue) =>
                  setSettings((current) => ({ ...current, commerceStaleDataBehavior: nextValue }))
                }
                options={[
                  { label: "Hold post", value: "hold" },
                  { label: "Fallback non-commerce", value: "fallback" }
                ]}
              />
            </div>
            <CheckboxField
              label="Revalidasi Sebelum Publish"
              checked={settings.commercePrePublishRevalidation}
              onChange={(nextValue) =>
                setSettings((current) => ({ ...current, commercePrePublishRevalidation: nextValue }))
              }
              description="Draft commerce akan dicek ulang sebelum publish agar harga, stok, promo, dan voucher tidak basi."
            />
            <button
              type="button"
              onClick={() => void handleTestCommerceConnection()}
              disabled={saving || loading}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Test Commerce Snapshot
            </button>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-950">SEO Keyword</h3>
            <p className="mt-1 text-sm text-slate-500">
              Berlaku untuk semua media sosial Jaka Creator. Sistem akan memilih 6-7 keyword yang paling relevan lalu memastikan caption mengandung keyword tersebut.
            </p>
          </div>

          <div className="space-y-4">
            <CheckboxField
              label="Aktifkan SEO Keyword"
              checked={settings.seoKeywordEnabled}
              onChange={(nextValue) => setSettings((current) => ({ ...current, seoKeywordEnabled: nextValue }))}
              description="Saat aktif, generator caption Threads, Instagram, Facebook, dan LinkedIn akan dipaksa menyisipkan minimal 6 keyword dari daftar ini, dan bila masih natural bisa menjadi 7 keyword."
            />

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Daftar Keyword</span>
              <textarea
                value={settings.seoKeywordList}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, seoKeywordList: event.target.value }))
                }
                rows={16}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
                placeholder={'"website hotel"\n"jasa website hotel"\n"booking engine hotel"'}
              />
            </label>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              Format bebas. Boleh pakai heading, tanda kutip, atau bracket seperti daftar Google Ads. Sistem akan membersihkan format itu, memilih keyword acak sesuai konteks, lalu menaruhnya natural di caption atau di penutup &quot;Pencarian terkait&quot;.
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-950">Brand Visual Style</h3>
            <p className="mt-1 text-sm text-slate-500">
              Atur gaya visual untuk image generation Jaka Creator. Deskripsi ini menentukan warna, mood, dan style gambar yang dihasilkan AI untuk bisnis ini.
            </p>
          </div>

          <div className="space-y-4">
            <InputField
              label="Nama Bisnis"
              value={businessProfile.name}
              onChange={(nextValue) => setBusinessProfile((current) => ({ ...current, name: nextValue }))}
              placeholder="Nama brand/bisnis"
            />
            <InputField
              label="Niche"
              value={businessProfile.niche}
              onChange={(nextValue) => setBusinessProfile((current) => ({ ...current, niche: nextValue }))}
              placeholder="Contoh: Fitness, gym management, personal training"
            />

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Brand Summary</span>
              <textarea
                value={businessProfile.brandSummary}
                onChange={(event) =>
                  setBusinessProfile((current) => ({ ...current, brandSummary: event.target.value }))
                }
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
                placeholder="Deskripsi singkat tentang brand dan value proposition"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Target Audience</span>
              <textarea
                value={businessProfile.audience}
                onChange={(event) =>
                  setBusinessProfile((current) => ({ ...current, audience: event.target.value }))
                }
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
                placeholder="Siapa target audience brand ini"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Visual Style (Image Generation)</span>
              <textarea
                value={businessProfile.brandVisualStyle}
                onChange={(event) =>
                  setBusinessProfile((current) => ({ ...current, brandVisualStyle: event.target.value }))
                }
                rows={6}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
                placeholder={"Contoh:\nTheme: energetic fitness, modern gym, motivational.\nColor direction: bold orange, dark charcoal, white accents.\nMood: powerful, energetic, motivational, clean.\nSubject: real gym members, trainers, fitness equipment, workout scenes."}
              />
            </label>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              Tulis instruksi visual dalam bahasa Inggris. Jelaskan tema, warna dominan, mood, dan jenis subject yang diinginkan.
              Jika kosong, AI akan menggunakan style generic premium. Contoh untuk gym:{" "}
              <span className="font-medium text-slate-900">
                &quot;Theme: energetic fitness. Color: bold orange, dark charcoal. Subject: real gym members working out.&quot;
              </span>
            </div>

            <button
              type="button"
              onClick={async () => {
                setBusinessSaving(true);
                try {
                  const response = await fetch("/api/business", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(businessProfile)
                  });
                  const payload = await response.json();
                  if (!response.ok || !payload.ok) {
                    throw new Error(payload.reason || "Gagal menyimpan profil bisnis");
                  }
                  pushToast({ title: "Profil bisnis dan visual style berhasil disimpan", tone: "success" });
                } catch (error) {
                  pushToast({
                    title: error instanceof Error ? error.message : "Gagal menyimpan profil bisnis",
                    tone: "error"
                  });
                } finally {
                  setBusinessSaving(false);
                }
              }}
              disabled={businessSaving || businessLoading}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {businessSaving ? "Menyimpan..." : "Simpan Brand Profile"}
            </button>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-slate-950">Admin Security</h3>
            <p className="mt-1 text-sm text-slate-500">Kelola password admin. Password aktif selalu dibaca dari database aplikasi.</p>
          </div>

          <div
            className={`rounded-3xl p-4 text-sm leading-6 ${
              security?.hasAdmin
                ? "bg-emerald-50 text-emerald-800"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {securityLoading
              ? "Memeriksa status keamanan admin..."
              : security?.hasAdmin
                ? `Admin aktif: ${security?.email ?? "-"}. Password login diambil dari database.`
                : "Belum ada user admin di database."}
          </div>

          <form onSubmit={handlePasswordSubmit} className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_1fr_auto]">
            <InputField
              label="Password Saat Ini"
              value={passwordForm.currentPassword}
              onChange={(nextValue) =>
                setPasswordForm((current) => ({ ...current, currentPassword: nextValue }))
              }
              placeholder="Masukkan password saat ini"
              type="password"
            />
            <InputField
              label="Password Baru"
              value={passwordForm.nextPassword}
              onChange={(nextValue) =>
                setPasswordForm((current) => ({ ...current, nextPassword: nextValue }))
              }
              placeholder="Minimal 10 karakter"
              type="password"
            />
            <InputField
              label="Konfirmasi Password Baru"
              value={passwordForm.confirmPassword}
              onChange={(nextValue) =>
                setPasswordForm((current) => ({ ...current, confirmPassword: nextValue }))
              }
              placeholder="Ulangi password baru"
              type="password"
            />

            <div className="flex items-end">
              <button
                type="submit"
                disabled={securitySaving || securityLoading}
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {securitySaving ? "Memperbarui..." : "Ganti Password"}
              </button>
            </div>
          </form>
        </section>
      </form>
        </>
      )}
    </div>
  );
}
