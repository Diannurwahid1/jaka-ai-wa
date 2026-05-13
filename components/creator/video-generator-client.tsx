"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast-provider";

type VideoTaskState = {
  taskId: string;
  model: string;
  status: string;
  videoUrl?: string;
  r2VideoUrl?: string;
  coverImageUrl?: string;
  error?: string;
};

const storageKey = "jaka-ai-video-generator-task";
const terminalStatuses = new Set(["completed", "succeeded", "success", "finished", "failed", "error", "cancelled", "canceled"]);
const successStatuses = new Set(["completed", "succeeded", "success", "finished"]);

function parseUrls(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function VideoGeneratorClient() {
  const { pushToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({
    model: "dreamina-seedance-2-0-260128",
    prompt: "",
    ratio: "16:9",
    duration: "11",
    generateAudio: true,
    referenceImages: "",
    referenceVideoUrl: "",
    referenceAudioUrl: ""
  });
  const [task, setTask] = useState<VideoTaskState | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }

      const storedTask = JSON.parse(raw) as VideoTaskState | null;
      return storedTask?.taskId && storedTask.model ? storedTask : null;
    } catch {
      window.localStorage.removeItem(storageKey);
      return null;
    }
  });

  const isTaskTerminal = useMemo(() => (task ? terminalStatuses.has(task.status.toLowerCase()) : true), [task]);
  const isTaskSuccess = useMemo(() => (task ? successStatuses.has(task.status.toLowerCase()) : false), [task]);
  const isTaskRunning = Boolean(task) && !isTaskTerminal;

  const refreshTask = useCallback(async (taskId: string, model: string, options?: { silent?: boolean }) => {
    const nextRefreshing = !options?.silent;

    if (nextRefreshing) {
      setRefreshing(true);
    }

    try {
      const response = await fetch(
        `/api/creator/video-generator?taskId=${encodeURIComponent(taskId)}&model=${encodeURIComponent(model)}`,
        {
          cache: "no-store"
        }
      );
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal membaca status task video");
      }

      const nextTask = payload.task as VideoTaskState;
      setTask(nextTask);
      return nextTask;
    } catch (error) {
      if (!options?.silent) {
        pushToast({
          title: error instanceof Error ? error.message : "Gagal membaca status task video",
          tone: "error"
        });
      }

      throw error;
    } finally {
      if (nextRefreshing) {
        setRefreshing(false);
      }
    }
  }, [pushToast]);

  useEffect(() => {
    if (!task || terminalStatuses.has(task.status.toLowerCase())) {
      return;
    }

    void refreshTask(task.taskId, task.model, { silent: true }).catch(() => undefined);
  }, [refreshTask, task]);

  useEffect(() => {
    if (!task) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(task));
  }, [task]);

  useEffect(() => {
    if (!task || isTaskTerminal) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshTask(task.taskId, task.model, { silent: true }).catch(() => undefined);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isTaskTerminal, refreshTask, task]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/creator/video-generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: form.model,
          prompt: form.prompt,
          ratio: form.ratio,
          duration: Number(form.duration),
          generateAudio: form.generateAudio,
          referenceImageUrls: parseUrls(form.referenceImages),
          referenceVideoUrl: form.referenceVideoUrl.trim(),
          referenceAudioUrl: form.referenceAudioUrl.trim()
        })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal membuat task video");
      }

      const nextTask = payload.task as VideoTaskState;
      setTask(nextTask);
      pushToast({ title: `Task video ${nextTask.taskId} dibuat`, tone: "success" });
      void refreshTask(nextTask.taskId, nextTask.model, { silent: true }).catch(() => undefined);
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal membuat task video",
        tone: "error"
      });
    } finally {
      setSubmitting(false);
    }
  }

  const previewUrl = task?.r2VideoUrl?.trim() || task?.videoUrl?.trim() || "";

  return (
    <div>
      <PageHeader
        eyebrow="Jaka Creator"
        title="AI Video Generator"
        description="Playground untuk generate video BytePlus ModelArk, pantau status task, lalu simpan output final ke Cloudflare R2."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleSubmit} className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Playground</h3>
              <p className="mt-1 text-sm text-slate-500">
                API key dan base URL mengikuti root <Link href="/settings" className="font-medium text-slate-900 underline">Settings</Link>. Nilainya tidak tercampur:
                field API Key tetap untuk token `ark-...`, field Base URL tetap untuk endpoint `https://ark.ap-southeast.bytepluses.com/api/v3`.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
              Output final otomatis dipersist ke R2 saat task selesai.
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Model</span>
              <input
                value={form.model}
                onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
                placeholder="dreamina-seedance-2-0-260128"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Prompt</span>
              <textarea
                value={form.prompt}
                onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
                placeholder="Tulis scene video, movement, style, dan detail audio yang diinginkan."
                rows={10}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Ratio</span>
                <select
                  value={form.ratio}
                  onChange={(event) => setForm((current) => ({ ...current, ratio: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                >
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Duration (detik)</span>
                <input
                  type="number"
                  min={4}
                  max={15}
                  value={form.duration}
                  onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.generateAudio}
                  onChange={(event) => setForm((current) => ({ ...current, generateAudio: event.target.checked }))}
                />
                Generate audio
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Reference image URLs</span>
              <textarea
                value={form.referenceImages}
                onChange={(event) => setForm((current) => ({ ...current, referenceImages: event.target.value }))}
                placeholder={"Satu URL per baris\nhttps://...\nhttps://..."}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Reference video URL</span>
                <input
                  value={form.referenceVideoUrl}
                  onChange={(event) => setForm((current) => ({ ...current, referenceVideoUrl: event.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Reference audio URL</span>
                <input
                  value={form.referenceAudioUrl}
                  onChange={(event) => setForm((current) => ({ ...current, referenceAudioUrl: event.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting || isTaskRunning}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Membuat task..." : isTaskRunning ? "Task sedang berjalan..." : "Generate Video"}
            </button>

            {task ? (
              <button
                type="button"
                onClick={() => void refreshTask(task.taskId, task.model)}
                disabled={refreshing}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-800 disabled:opacity-60"
              >
                {refreshing ? "Refresh..." : "Refresh Status"}
              </button>
            ) : null}

            {task ? (
              <button
                type="button"
                onClick={() => setTask(null)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700"
              >
                Clear Task
              </button>
            ) : null}
          </div>
        </form>

        <div className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Result</h3>
              <p className="mt-1 text-sm text-slate-500">
                Status task, video final, dan URL CDN R2 muncul di sini.
              </p>
            </div>
            {task ? (
              <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                {normalizeStatusLabel(task.status)}
              </div>
            ) : null}
          </div>

          {!task ? (
            <div className="mt-5 rounded-3xl bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-500">
              Jalankan generator untuk membuat task video baru.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-950">Task {task.taskId}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Model: {task.model}</p>

                {isTaskRunning ? (
                  <div className="mt-4 space-y-3">
                    <div className="overflow-hidden rounded-full bg-slate-200">
                      <div className="h-2 w-1/2 animate-pulse rounded-full bg-slate-950" />
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                      Task sedang diproses di BytePlus. State ini disimpan di browser, jadi setelah refresh halaman task tetap muncul dan polling lanjut.
                    </div>
                  </div>
                ) : null}

                {task.error ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
                    {task.error}
                  </div>
                ) : null}

                {isTaskSuccess && !previewUrl ? (
                  <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
                    Task sudah sukses, tapi URL video belum terbaca dari response retrieve. Saya sudah buat parser lebih toleran. Klik <span className="font-medium">Refresh Status</span> sekali lagi untuk tarik ulang hasil task lama.
                  </div>
                ) : null}
              </div>

              {previewUrl ? (
                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-950">
                  <video src={previewUrl} controls className="aspect-video w-full" />
                </div>
              ) : null}

              <div className="grid gap-4">
                {task.r2VideoUrl ? (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
                    <p className="font-medium">R2 CDN URL</p>
                    <a href={task.r2VideoUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all underline">
                      {task.r2VideoUrl}
                    </a>
                  </div>
                ) : null}

                {task.videoUrl ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                    <p className="font-medium text-slate-900">BytePlus source URL</p>
                    <a href={task.videoUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all underline">
                      {task.videoUrl}
                    </a>
                  </div>
                ) : null}

                {task.coverImageUrl ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                    <p className="font-medium text-slate-900">Cover image</p>
                    <a href={task.coverImageUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all underline">
                      {task.coverImageUrl}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
