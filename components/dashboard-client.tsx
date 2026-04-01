"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Skeleton, SkeletonCard, SkeletonLines } from "@/components/skeleton";
import { StatCard } from "@/components/stat-card";
import { DashboardOverview } from "@/types";
import { formatDateTime } from "@/lib/utils";

type MemorySessionSummary = {
  phone: string;
  summary: string;
  lastActive: string;
  messageCount: number;
  expired: boolean;
};

const initialState: DashboardOverview = {
  stats: {
    inbound: 0,
    replied: 0,
    success: 0,
    failed: 0
  },
  waStatus: "disconnected",
  aiStatus: "missing",
  recent: []
};

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`} />
      {label}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} rows={2} className={index === 1 ? "bg-accent/10" : undefined} />
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-slate-200/60 bg-white p-4 shadow-panel sm:rounded-[32px] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>

          <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
                <SkeletonLines rows={2} className="mt-3 sm:mt-4" />
                <div className="mt-3 rounded-2xl bg-white px-4 py-3 sm:mt-4">
                  <SkeletonLines rows={2} />
                </div>
                <Skeleton className="mt-3 h-3 w-24" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 sm:space-y-6">
          <div className="rounded-[28px] border border-slate-200/60 bg-white p-4 shadow-panel sm:rounded-[32px] sm:p-6">
            <Skeleton className="h-5 w-40" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </div>
                  <SkeletonLines rows={2} className="mt-3" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/60 bg-slate-950 p-5 text-white shadow-panel sm:rounded-[32px] sm:p-6">
            <Skeleton className="h-3.5 w-24 bg-white/15" />
            <Skeleton className="mt-3 h-6 w-40 bg-white/15" />
            <SkeletonLines rows={3} className="mt-4" />
          </div>
        </section>
      </div>
    </>
  );
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardOverview>(initialState);
  const [memorySessions, setMemorySessions] = useState<MemorySessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const [dashboardResponse, memoryResponse] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch("/api/memory?limit=6", { cache: "no-store" })
      ]);

      const dashboardPayload = await dashboardResponse.json();
      const memoryPayload = await memoryResponse.json();

      if (active && dashboardPayload.ok) {
        setData(dashboardPayload.overview);
      }

      if (active && memoryPayload.ok) {
        setMemorySessions(memoryPayload.sessions);
      }

      if (active) {
        setLoading(false);
      }
    }

    load();
    const timer = window.setInterval(load, 6000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard Admin"
        description="Pantau health sistem, volume pesan, memory aktif, dan performa auto reply AI dari satu tempat."
      />

      {loading ? <DashboardSkeleton /> : (
        <>
      <div data-tour="dashboard-stats" className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pesan Masuk"
          value={String(data.stats.inbound)}
          detail="Semua pesan yang tercatat pada log sistem."
        />
        <StatCard
          label="Reply AI"
          value={String(data.stats.replied)}
          detail="Balasan yang berhasil dihasilkan AI."
          tone="accent"
        />
        <StatCard
          label="Success"
          value={String(data.stats.success)}
          detail="Webhook dan outbound yang selesai tanpa error."
        />
        <StatCard
          label="Memory Aktif"
          value={String(memorySessions.filter((session) => !session.expired).length)}
          detail="Jumlah user dengan context AI yang masih aktif."
          tone="warn"
        />
      </div>

      <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section data-tour="dashboard-activity" className="rounded-[28px] border border-slate-200/60 bg-white p-4 shadow-panel sm:rounded-[32px] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Recent activity</h3>
              <p className="mt-1 text-sm text-slate-500">Update otomatis setiap 6 detik.</p>
            </div>
            {loading ? (
              <div className="text-sm text-slate-500">Memuat...</div>
            ) : (
              <div className="flex gap-2">
                <Badge active={data.waStatus === "connected"} label={`WA ${data.waStatus}`} />
                <Badge active={data.aiStatus === "ready"} label={`AI ${data.aiStatus}`} />
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
            {data.recent.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Belum ada log. Kirim test dari AI Chat atau panggil webhook WA.
              </div>
            ) : (
              data.recent.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.from}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {item.source} . {item.intent}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
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
                  <p className="mt-3 text-sm leading-6 text-slate-700 sm:mt-4">{item.message}</p>
                  <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-600 sm:mt-4">
                    {item.reply || item.error || "Menunggu balasan..."}
                  </div>
                  <p className="mt-3 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4 sm:space-y-6">
          <div data-tour="dashboard-memory" className="rounded-[28px] border border-slate-200/60 bg-white p-4 shadow-panel sm:rounded-[32px] sm:p-6">
            <h3 className="text-lg font-semibold text-slate-950">Top memory sessions</h3>
            <div className="mt-4 space-y-3">
              {memorySessions.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Belum ada memory aktif.
                </div>
              ) : (
                memorySessions.map((session) => (
                  <div key={session.phone} className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                      <p className="text-sm font-semibold text-slate-950">{session.phone}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${session.expired ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {session.expired ? "expired" : `${session.messageCount} msgs`}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {session.summary || "Belum ada summary. Sistem masih mengandalkan recent messages."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/60 bg-slate-950 p-5 text-white shadow-panel sm:rounded-[32px] sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Operational Notes</p>
            <h3 className="mt-3 text-lg font-semibold sm:text-xl">Memory survive restart</h3>
            <p className="mt-3 text-sm leading-6 text-white/75">
              Session AI sekarang disimpan ke file lokal sehingga context tetap ada walau server restart. Untuk skala lebih besar, store ini sudah bisa diganti ke Redis atau database lewat interface yang sama.
            </p>
          </div>
        </section>
      </div>
        </>
      )}
    </div>
  );
}
