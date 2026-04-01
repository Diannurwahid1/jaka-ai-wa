"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Skeleton, SkeletonLines } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { MessageLog } from "@/types";
import { formatDateTime } from "@/lib/utils";

type MemorySessionView = {
  phone: string;
  summary: string;
  lastActive: string;
  messageCount: number;
  expired: boolean;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
};

function WAMonitorSkeleton() {
  return (
    <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[28px] border border-slate-200/60 bg-white p-4 shadow-panel sm:rounded-[32px] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3.5 w-36" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>

        <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 sm:mt-5">
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="px-4 py-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <Skeleton className="h-3 w-16" />
                      <SkeletonLines rows={2} className="mt-2" />
                    </div>
                    <div>
                      <Skeleton className="h-3 w-24" />
                      <SkeletonLines rows={2} className="mt-2" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <section className="rounded-[28px] border border-slate-200/60 bg-white p-4 shadow-panel sm:rounded-[32px] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3.5 w-44" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>

          <div className="mt-4 space-y-4 sm:mt-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-16 rounded-full" />
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-white px-4 py-3">
                  <Skeleton className="h-3 w-16" />
                  <SkeletonLines rows={2} className="mt-2" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <Skeleton className="h-3 w-14" />
                    <SkeletonLines rows={2} className="mt-2" />
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <Skeleton className="h-3 w-20" />
                    <SkeletonLines rows={2} className="mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/60 bg-slate-950 p-5 text-white shadow-panel sm:rounded-[32px] sm:p-6">
          <Skeleton className="h-3.5 w-24 bg-white/15" />
          <Skeleton className="mt-3 h-6 w-44 bg-white/15" />
          <SkeletonLines rows={3} className="mt-4" />
        </section>
      </div>
    </div>
  );
}

export function WAMonitorClient() {
  const { pushToast } = useToast();
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [sessions, setSessions] = useState<MemorySessionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearingPhone, setClearingPhone] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const [messagesResponse, memoryResponse] = await Promise.all([
        fetch("/api/messages?limit=50", { cache: "no-store" }),
        fetch("/api/memory?limit=20", { cache: "no-store" })
      ]);

      const messagesPayload = await messagesResponse.json();
      const memoryPayload = await memoryResponse.json();

      if (active && messagesPayload.ok) {
        setMessages(messagesPayload.messages);
      }

      if (active && memoryPayload.ok) {
        setSessions(memoryPayload.sessions);
      }

      if (active) {
        setLoading(false);
      }
    }

    load();
    const timer = window.setInterval(load, 4000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  async function clearMemory(phone: string) {
    setClearingPhone(phone);

    try {
      const response = await fetch(`/api/memory?phone=${encodeURIComponent(phone)}`, {
        method: "DELETE"
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal menghapus memory");
      }

      setSessions((current) => current.filter((session) => session.phone !== phone));
      pushToast({ title: `Memory ${phone} dihapus`, tone: "success" });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal menghapus memory",
        tone: "error"
      });
    } finally {
      setClearingPhone(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Realtime"
        title="WA Monitor"
        description="Lihat semua pesan masuk, status auto reply, intent, memory aktif, dan summary context secara near realtime."
      />

      {loading ? <WAMonitorSkeleton /> : (
        <>
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div data-tour="wa-monitor-logs" className="rounded-[28px] border border-slate-200/60 bg-white p-4 shadow-panel sm:rounded-[32px] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Live logs</h3>
              <p className="mt-1 text-sm text-slate-500">Refresh otomatis setiap 4 detik.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {loading ? "Memuat..." : `${messages.length} entries`}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 sm:mt-5">
            <div className="hidden grid-cols-[1.2fr_2fr_2fr_0.8fr_0.9fr] gap-4 bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/70 md:grid">
              <div>From</div>
              <div>Message</div>
              <div>Reply / Error</div>
              <div>Status</div>
              <div>Time</div>
            </div>

            <div className="divide-y divide-slate-100">
              {messages.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  Belum ada aktivitas. Endpoint webhook siap menerima payload WA Blast.
                </div>
              ) : (
                messages.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 gap-4 px-4 py-4 text-sm md:grid-cols-[1.2fr_2fr_2fr_0.8fr_0.9fr]"
                  >
                    <div className="rounded-2xl bg-slate-50 p-4 md:contents">
                      <div className="flex flex-wrap items-start justify-between gap-3 md:block">
                        <div>
                          <p className="font-medium text-slate-950">{item.from}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            {item.source} . {item.intent}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium md:hidden ${
                            item.status === "success"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.status === "failed"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:mt-0 md:contents">
                        <div className="md:hidden">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Message</p>
                          <p className="mt-1 leading-6 text-slate-700">{item.message}</p>
                        </div>
                        <div className="md:hidden">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Reply / Error</p>
                          <p className="mt-1 leading-6 text-slate-500">{item.reply || item.error || "-"}</p>
                        </div>
                        <p className="text-xs text-slate-400 md:hidden">{formatDateTime(item.createdAt)}</p>
                      </div>
                    </div>

                    <p className="hidden leading-6 text-slate-700 md:block">{item.message}</p>
                    <p className="hidden leading-6 text-slate-500 md:block">{item.reply || item.error || "-"}</p>
                    <div className="hidden md:block">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          item.status === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "failed"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="hidden text-slate-400 md:block">{formatDateTime(item.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <section data-tour="wa-monitor-memory" className="rounded-[28px] border border-slate-200/60 bg-white p-4 shadow-panel sm:rounded-[32px] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">AI Memory</h3>
                <p className="mt-1 text-sm text-slate-500">Session aktif per nomor WA, lengkap dengan summary dan recent context.</p>
              </div>
              <div className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                {loading ? "Memuat..." : `${sessions.length} active`}
              </div>
            </div>

            <div className="mt-4 space-y-4 sm:mt-5">
              {sessions.length === 0 ? (
                <div className="rounded-3xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Belum ada memory tersimpan. Memory akan muncul setelah user chat masuk.
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.phone} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{session.phone}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                          {session.messageCount} recent messages
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            session.expired
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {session.expired ? "expired" : "active"}
                        </span>
                        <button
                          type="button"
                          onClick={() => clearMemory(session.phone)}
                          disabled={clearingPhone === session.phone}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
                        >
                          {clearingPhone === session.phone ? "Clearing..." : "Clear"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Summary</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {session.summary || "Belum ada summary. Sistem masih memakai recent messages langsung."}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      {session.messages.slice(-4).map((message, index) => (
                        <div key={`${session.phone}-${index}`} className="rounded-2xl bg-white px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {message.role}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{message.content}</p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-xs text-slate-400">Last active {formatDateTime(session.lastActive)}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200/60 bg-slate-950 p-5 text-white shadow-panel sm:rounded-[32px] sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Persistence</p>
            <h3 className="mt-3 text-lg font-semibold sm:text-xl">Memory sekarang persisten</h3>
            <p className="mt-3 text-sm leading-6 text-white/75">
              Session AI disimpan ke file lokal sehingga context tidak hilang saat server restart. Store tetap memakai interface modular supaya nanti bisa dipindah ke Redis atau database tanpa ubah flow utama.
            </p>
          </section>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
