"use client";

import { FormEvent, useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Skeleton, SkeletonLines } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { formatDateTime } from "@/lib/utils";

type KnowledgeItem = {
  documentId?: string;
  title: string;
  content: string;
  category?: string;
  createdAt?: string;
};

type RagResult = {
  title: string;
  content: string;
  category?: string;
  score?: number;
  documentId?: string;
};

function KnowledgeBaseSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <Skeleton className="h-5 w-36" />
            <div className="mt-5 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-12 w-36" />
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-44" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>

        <div className="mt-5 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-7 w-16 rounded-full" />
              </div>
              <SkeletonLines rows={3} className="mt-3" />
              <Skeleton className="mt-3 h-3 w-24" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function KnowledgeBaseClient() {
  const { pushToast } = useToast();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "" });
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<RagResult[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await fetch("/api/rag/knowledge?limit=50", { cache: "no-store" });
      const payload = await response.json();

      if (active && payload.ok) {
        setItems(payload.knowledge);
      }

      if (active) {
        setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/rag/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal menambah knowledge");
      }

      setItems((current) => [payload.knowledge, ...current]);
      setForm({ title: "", content: "", category: "" });
      pushToast({ title: "Knowledge berhasil ditambahkan", tone: "success" });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal menambah knowledge",
        tone: "error"
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAsking(true);

    try {
      const response = await fetch("/api/rag/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal menjalankan RAG test");
      }

      setAnswer(payload.answer);
      setResults(payload.results ?? []);
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal menjalankan RAG test",
        tone: "error"
      });
    } finally {
      setAsking(false);
    }
  }

  async function handleDelete(documentId?: string) {
    if (!documentId) {
      pushToast({ title: "documentId tidak tersedia", tone: "error" });
      return;
    }

    setDeletingId(documentId);

    try {
      const response = await fetch(`/api/rag/knowledge?documentId=${encodeURIComponent(documentId)}`, {
        method: "DELETE"
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Gagal menghapus knowledge");
      }

      setItems((current) => current.filter((item) => item.documentId !== documentId));
      pushToast({ title: "Knowledge dihapus", tone: "success" });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Gagal menghapus knowledge",
        tone: "error"
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Knowledge"
        title="Knowledge Base"
        description="Kelola data internal untuk RAG, lalu test retrieval dan jawaban grounded tanpa mengganggu memory percakapan user."
      />

      {loading ? <KnowledgeBaseSkeleton /> : (
        <>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-6">
          <form data-tour="knowledge-add" onSubmit={handleAdd} className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <h3 className="text-lg font-semibold text-slate-950">Tambah knowledge</h3>
            <div className="mt-5 space-y-4">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Judul knowledge"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
              <input
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="Kategori, misalnya produk"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
              <textarea
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                rows={8}
                placeholder="Isi knowledge, misalnya detail paket, harga, benefit, policy, atau FAQ"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Tambah Knowledge"}
              </button>
            </div>
          </form>

          <form data-tour="knowledge-rag-test" onSubmit={handleAsk} className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <h3 className="text-lg font-semibold text-slate-950">Test RAG</h3>
            <div className="mt-5 space-y-4">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Contoh: paket premium ada apa saja?"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
              <button
                type="submit"
                disabled={asking}
                className="rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {asking ? "Mencari..." : "Ask with RAG"}
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Answer</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{answer || "Belum ada hasil."}</p>
              </div>

              <div className="space-y-3">
                {results.map((result, index) => (
                  <div key={`${result.documentId ?? result.title}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
                    <p className="text-sm font-semibold text-slate-950">{result.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{result.content}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {result.category || "tanpa kategori"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </section>

        <section data-tour="knowledge-list" className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Stored knowledge</h3>
              <p className="mt-1 text-sm text-slate-500">Digunakan oleh retrieval, max 3 hasil per query.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {loading ? "Memuat..." : `${items.length} docs`}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {items.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Belum ada knowledge tersimpan.
              </div>
            ) : (
              items.map((item) => (
                <div key={item.documentId ?? item.title} className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {item.category || "tanpa kategori"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.documentId)}
                      disabled={deletingId === item.documentId}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
                    >
                      {deletingId === item.documentId ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{item.content}</p>
                  <p className="mt-3 text-xs text-slate-400">
                    {item.createdAt ? formatDateTime(item.createdAt) : "Tanpa timestamp"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
        </>
      )}
    </div>
  );
}
