"use client";

import { FormEvent, useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Skeleton, SkeletonLines } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { AppSettings } from "@/types";

const initialSettings: AppSettings = {
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
  embeddingBaseUrl: "https://ai.mongodb.com/v1"
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

    loadSettings();
    loadSecurity();

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
      pushToast({ title: "Settings berhasil disimpan", tone: "success" });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal menyimpan settings",
        tone: "error"
      });
    } finally {
      setSaving(false);
    }
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

  const suggestedDimensions = isMongoAtlasEmbeddingProvider(settings.embeddingProvider)
    ? getVoyageDimensions(settings.embeddingModel)
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Simpan konfigurasi AI, WA Blast, MongoDB, dan embedding agar memory serta RAG bisa jalan dari runtime app tanpa bergantung ke env shell manual."
      />

      {loading ? <SettingsSkeleton /> : (
        <>
      <form onSubmit={handleSubmit} className="grid gap-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section data-tour="settings-ai" className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-slate-950">AI Config</h3>
              <p className="mt-1 text-sm text-slate-500">Sumopod endpoint, API key, model, dan prompt system.</p>
            </div>

            <div className="space-y-4">
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
                placeholder="Optional atau berdasarkan gateway"
                type="password"
              />
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
