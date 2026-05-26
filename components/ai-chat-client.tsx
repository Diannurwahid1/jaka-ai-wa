"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast-provider";
import {
  CostBreakdown,
  DEFAULT_TOKEN_PRICES,
  DEFAULT_USD_TO_IDR,
  TokenPrice,
  computeCost,
  findPriceForModel,
  formatIdr,
  formatTokens,
  formatUsd
} from "@/lib/token-cost";

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: CostBreakdown;
  model?: string;
  durationMs?: number;
};

type SimulationResult = {
  totalUsers: number;
  messagesPerUser: number;
  totalMessages: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  costUsd: number;
  costIdr: number;
};

const STORAGE_KEY = "kiro.ai-chat.pricing";

export function AIChatClient() {
  const { pushToast } = useToast();
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: "intro",
      role: "assistant",
      text: "Halo, saya siap bantu test prompt AI WhatsApp bisnis kamu."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Pricing state — persisted per browser
  const [inputPerMillion, setInputPerMillion] = useState<number>(
    DEFAULT_TOKEN_PRICES["seed-2-0-mini"].inputPerMillion
  );
  const [outputPerMillion, setOutputPerMillion] = useState<number>(
    DEFAULT_TOKEN_PRICES["seed-2-0-mini"].outputPerMillion
  );
  const [usdToIdr, setUsdToIdr] = useState<number>(DEFAULT_USD_TO_IDR);
  const [activeModel, setActiveModel] = useState<string>("");

  // Simulation inputs
  const [simUsers, setSimUsers] = useState<number>(100);
  const [simMessages, setSimMessages] = useState<number>(5);
  const [simInputAvg, setSimInputAvg] = useState<number>(80);
  const [simOutputAvg, setSimOutputAvg] = useState<number>(220);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.inputPerMillion === "number") setInputPerMillion(parsed.inputPerMillion);
      if (typeof parsed?.outputPerMillion === "number") setOutputPerMillion(parsed.outputPerMillion);
      if (typeof parsed?.usdToIdr === "number") setUsdToIdr(parsed.usdToIdr);
      if (typeof parsed?.simUsers === "number") setSimUsers(parsed.simUsers);
      if (typeof parsed?.simMessages === "number") setSimMessages(parsed.simMessages);
      if (typeof parsed?.simInputAvg === "number") setSimInputAvg(parsed.simInputAvg);
      if (typeof parsed?.simOutputAvg === "number") setSimOutputAvg(parsed.simOutputAvg);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        inputPerMillion,
        outputPerMillion,
        usdToIdr,
        simUsers,
        simMessages,
        simInputAvg,
        simOutputAvg
      })
    );
  }, [inputPerMillion, outputPerMillion, usdToIdr, simUsers, simMessages, simInputAvg, simOutputAvg]);

  const currentPrice: TokenPrice = useMemo(
    () => ({
      label: activeModel ? `Custom • ${activeModel}` : "Custom pricing",
      inputPerMillion,
      outputPerMillion
    }),
    [activeModel, inputPerMillion, outputPerMillion]
  );

  const sessionTotals = useMemo(() => {
    const totals = messages.reduce(
      (acc, item) => {
        if (!item.usage) return acc;
        acc.promptTokens += item.usage.promptTokens;
        acc.completionTokens += item.usage.completionTokens;
        acc.totalTokens += item.usage.totalTokens;
        if (item.cost) {
          acc.costUsd += item.cost.costUsd;
          acc.costIdr += item.cost.costIdr;
        }
        acc.replies += 1;
        return acc;
      },
      { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, costIdr: 0, replies: 0 }
    );
    return totals;
  }, [messages]);

  const simulation = useMemo<SimulationResult>(() => {
    const users = Math.max(0, Math.floor(simUsers));
    const perUser = Math.max(0, Math.floor(simMessages));
    const totalMessages = users * perUser;
    const totalInputTokens = totalMessages * Math.max(0, simInputAvg);
    const totalOutputTokens = totalMessages * Math.max(0, simOutputAvg);
    const cost = computeCost(
      {
        promptTokens: totalInputTokens,
        completionTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens
      },
      currentPrice,
      usdToIdr
    );
    return {
      totalUsers: users,
      messagesPerUser: perUser,
      totalMessages,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      costUsd: cost.costUsd,
      costIdr: cost.costIdr
    };
  }, [simUsers, simMessages, simInputAvg, simOutputAvg, currentPrice, usdToIdr]);

  function applyModelPreset(modelKey: string) {
    const preset = DEFAULT_TOKEN_PRICES[modelKey];
    if (!preset) return;
    setInputPerMillion(preset.inputPerMillion);
    setOutputPerMillion(preset.outputPerMillion);
    setActiveModel(modelKey);
  }

  function applyAverageFromSession() {
    if (!sessionTotals.replies) {
      pushToast({ title: "Belum ada balasan AI untuk dijadikan rata-rata", tone: "error" });
      return;
    }
    setSimInputAvg(Math.round(sessionTotals.promptTokens / sessionTotals.replies));
    setSimOutputAvg(Math.round(sessionTotals.completionTokens / sessionTotals.replies));
    pushToast({ title: "Rata-rata diterapkan ke kalkulator", tone: "success" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();
    if (!message || loading) return;

    const userMessage: ChatItem = {
      id: crypto.randomUUID(),
      role: "user",
      text: message
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, from: "manual-chat" })
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "AI request failed");
      }

      const usage = payload.usage as ChatItem["usage"];
      const model: string | undefined = payload.model;
      const cost = usage
        ? computeCost(usage, currentPrice, usdToIdr)
        : undefined;

      // Auto-fill preset if we recognise this model and user hasn't picked one yet.
      if (model && !activeModel) {
        const preset = findPriceForModel(model, DEFAULT_TOKEN_PRICES);
        if (preset) {
          setInputPerMillion(preset.inputPerMillion);
          setOutputPerMillion(preset.outputPerMillion);
          setActiveModel(model);
        }
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: payload.reply,
          usage,
          cost,
          model,
          durationMs: payload.durationMs
        }
      ]);

      pushToast({ title: "AI reply berhasil dibuat", tone: "success" });
    } catch (error) {
      pushToast({
        title: error instanceof Error ? error.message : "Terjadi error saat test AI",
        tone: "error"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Testing"
        title="AI Chat"
        description="Coba prompt, cek tone jawaban, dan simpan hasilnya ke log tanpa perlu menunggu pesan WhatsApp masuk."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section data-tour="ai-chat-panel" className="rounded-[32px] border border-slate-200/60 bg-white p-5 shadow-panel">
          <div className="rounded-[28px] bg-[#efeae2] p-4">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm ${
                      message.role === "user"
                        ? "bg-[#d9fdd3] text-slate-900"
                        : "bg-white text-slate-700"
                    }`}
                  >
                    <div>{message.text}</div>
                    {message.role === "assistant" && message.usage ? (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span>
                          in <span className="font-medium text-slate-700">{formatTokens(message.usage.promptTokens)}</span>
                        </span>
                        <span>
                          out <span className="font-medium text-slate-700">{formatTokens(message.usage.completionTokens)}</span>
                        </span>
                        <span>
                          total <span className="font-medium text-slate-700">{formatTokens(message.usage.totalTokens)}</span>
                        </span>
                        {message.cost ? (
                          <span>
                            <span className="font-medium text-slate-700">{formatUsd(message.cost.costUsd)}</span> · {formatIdr(message.cost.costIdr)}
                          </span>
                        ) : null}
                        {message.durationMs ? <span>{(message.durationMs / 1000).toFixed(1)}s</span> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-[24px] bg-white px-4 py-3 text-sm text-slate-500">
                    AI sedang mengetik...
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Tulis pesan test, misalnya: ada promo hari ini?"
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[120px]"
            >
              {loading ? "Mengirim..." : "Kirim"}
            </button>
          </form>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="Replies" value={String(sessionTotals.replies)} hint="dalam sesi ini" />
            <SummaryTile label="Total tokens" value={formatTokens(sessionTotals.totalTokens)} hint={`in ${formatTokens(sessionTotals.promptTokens)} · out ${formatTokens(sessionTotals.completionTokens)}`} />
            <SummaryTile label="Cost USD" value={formatUsd(sessionTotals.costUsd)} hint="cumulative session" />
            <SummaryTile label="Cost IDR" value={formatIdr(sessionTotals.costIdr)} hint={`@ Rp ${usdToIdr.toLocaleString("id-ID")} / USD`} />
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Pricing &amp; Token Cost</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Sesuaikan harga sesuai dashboard provider. Disimpan di browser kamu.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(DEFAULT_TOKEN_PRICES).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyModelPreset(key)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    activeModel === key
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {value.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <PriceField
                label="Input / 1M tok (USD)"
                value={inputPerMillion}
                onChange={setInputPerMillion}
                step={0.01}
              />
              <PriceField
                label="Output / 1M tok (USD)"
                value={outputPerMillion}
                onChange={setOutputPerMillion}
                step={0.01}
              />
              <PriceField label="Kurs USD → IDR" value={usdToIdr} onChange={setUsdToIdr} step={50} />
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Simulasi Volume</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Estimasi total token & biaya kalau ribuan user pakai sistem ini.
                </p>
              </div>
              <button
                type="button"
                onClick={applyAverageFromSession}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-700 transition hover:border-slate-400"
              >
                Pakai rata-rata sesi
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <NumberField label="Jumlah user" value={simUsers} onChange={setSimUsers} step={50} />
              <NumberField label="Pesan / user" value={simMessages} onChange={setSimMessages} step={1} />
              <NumberField label="Input avg (tok)" value={simInputAvg} onChange={setSimInputAvg} step={10} />
              <NumberField label="Output avg (tok)" value={simOutputAvg} onChange={setSimOutputAvg} step={10} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <SummaryTile label="Total chat" value={formatTokens(simulation.totalMessages)} hint={`${simulation.totalUsers} × ${simulation.messagesPerUser}`} />
              <SummaryTile
                label="Total tokens"
                value={formatTokens(simulation.totalTokens)}
                hint={`in ${formatTokens(simulation.totalInputTokens)} · out ${formatTokens(simulation.totalOutputTokens)}`}
              />
              <SummaryTile label="Estimasi biaya" value={formatUsd(simulation.costUsd)} hint={formatIdr(simulation.costIdr)} accent />
            </div>

            <div className="mt-4 grid gap-2">
              {[
                { users: 100, label: "100 user × 5 chat" },
                { users: 500, label: "500 user × 5 chat" },
                { users: 1000, label: "1000 user × 5 chat" },
                { users: 5000, label: "5000 user × 5 chat" }
              ].map((preset) => {
                const totalMessages = preset.users * 5;
                const inTokens = totalMessages * simInputAvg;
                const outTokens = totalMessages * simOutputAvg;
                const cost = computeCost(
                  { promptTokens: inTokens, completionTokens: outTokens, totalTokens: inTokens + outTokens },
                  currentPrice,
                  usdToIdr
                );
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setSimUsers(preset.users);
                      setSimMessages(5);
                    }}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-slate-300"
                  >
                    <span className="font-medium text-slate-900">{preset.label}</span>
                    <span className="text-xs text-slate-500">
                      {formatTokens(inTokens + outTokens)} tok · {formatUsd(cost.costUsd)} · {formatIdr(cost.costIdr)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200/60 bg-accent/10 p-6 shadow-panel">
            <h3 className="text-lg font-semibold text-slate-950">Quick test ideas</h3>
            <div className="mt-4 grid gap-3">
              {[
                "Ada promo untuk paket premium?",
                "Kalau saya mau order, langkahnya gimana?",
                "Harga bulanannya berapa ya?",
                "Sistemnya error, bisa dibantu?"
              ].map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setInput(idea)}
                  className="rounded-2xl bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-950 hover:text-white"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  accent
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-3 ${
        accent ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-base font-semibold ${accent ? "text-emerald-700" : "text-slate-900"}`}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function PriceField({
  label,
  value,
  onChange,
  step
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-600">
      <span>{label}</span>
      <input
        type="number"
        step={step ?? 0.01}
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-600">
      <span>{label}</span>
      <input
        type="number"
        step={step ?? 1}
        min={0}
        value={value}
        onChange={(event) => onChange(Math.max(0, Math.floor(Number(event.target.value) || 0)))}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
      />
    </label>
  );
}
