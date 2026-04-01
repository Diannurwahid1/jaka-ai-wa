"use client";

import { FormEvent, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast-provider";

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

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

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: payload.reply
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
                    {message.text}
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
        </section>

        <section className="space-y-6">
          <div className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-panel">
            <h3 className="text-lg font-semibold text-slate-950">Prompt checklist</h3>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>Jawaban harus singkat, sopan, dan tetap terasa seperti CS bisnis.</p>
              <p>Kalau user tanya harga, AI sebaiknya jawab plus ajakan lanjut.</p>
              <p>Kalau AI tidak yakin, arahkan ke admin agar tidak halusinasi.</p>
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
