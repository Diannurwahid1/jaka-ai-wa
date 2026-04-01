"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BrandWatermark } from "@/components/brand-watermark";
import { SiteFooter } from "@/components/site-footer";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Login gagal");
      }

      window.sessionStorage.setItem("jaka-post-login-greeting", "1");
      window.localStorage.setItem("jaka-ai-opened", "1");
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas bg-glow px-4 py-6 text-ink sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-4%] h-64 w-64 rounded-full bg-[#127369]/10 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute bottom-[-8%] right-[-5%] h-72 w-72 rounded-full bg-[#f0c36b]/15 blur-3xl sm:h-[28rem] sm:w-[28rem]" />
      </div>

      <div className="pointer-events-none fixed bottom-[-3.75rem] left-[-6.25rem] z-0 hidden h-[34.5rem] w-[23rem] -rotate-[14deg] lg:block xl:left-[-5rem] xl:h-[39rem] xl:w-[25rem]">
        <div className="absolute inset-0 rounded-[40px] bg-slate-950/92 shadow-[0_30px_80px_rgba(15,23,42,0.22)]" />
        <div className="absolute inset-0 rounded-[40px] border border-white/8" />
        <div className="absolute -right-[4.75rem] bottom-[-2.75rem] h-[35.5rem] w-[24rem] rotate-[14deg] xl:-right-[4.5rem] xl:h-[40rem] xl:w-[26rem]">
          <div className="absolute bottom-5 left-10 h-16 w-44 rounded-full bg-slate-950/18 blur-3xl" />
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-contain object-left-bottom drop-shadow-[0_28px_60px_rgba(15,23,42,0.24)]"
          >
            <source src="/video/shootwatergun-jakaai.webm" type="video/webm" />
          </video>
        </div>
      </div>

      <div className="pointer-events-none absolute left-[-3.25rem] top-2 z-0 h-72 w-72 lg:hidden">
        <div className="absolute inset-0 -rotate-[10deg] rounded-[34px] bg-slate-950/92 shadow-[0_24px_60px_rgba(15,23,42,0.16)]" />
        <div className="absolute inset-0 -rotate-[10deg] rounded-[34px] border border-white/8" />
        <div className="absolute left-10 top-4 h-24 w-36 rounded-full bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.52),_transparent_72%)]" />
        <div className="absolute bottom-6 left-12 h-14 w-32 rounded-full bg-slate-950/12 blur-2xl" />
        <div className="absolute inset-0 rotate-[10deg]">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute bottom-[-0.5rem] left-[-1rem] h-[19rem] w-[19rem] object-contain object-left-bottom drop-shadow-[0_20px_40px_rgba(15,23,42,0.18)]"
          >
            <source src="/video/shootwatergun-jakaai.webm" type="video/webm" />
          </video>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center justify-end">
        <div className="w-full max-w-xl px-1 py-8 sm:px-4 lg:max-w-[560px] lg:px-0">
          <div className="rounded-[36px] border border-white/80 bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur-none sm:bg-white/58 sm:p-8 sm:backdrop-blur">
            <div>
              <span className="inline-flex rounded-full bg-white/88 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-accent shadow-sm">
                WA AI Ops
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.03]">
                Masuk ke control center dengan Jaka AI.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Satu panel untuk auto reply WhatsApp, memory session, RAG knowledge base, monitoring log, dan pengujian AI
                secara real-time.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {["AI Reply", "WA Blast", "MongoDB RAG", "Admin Security"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/80 bg-white/85 px-4 py-2 text-xs font-medium text-slate-700 shadow-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-[30px] border border-white/80 bg-white/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:bg-white/52 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                  placeholder="admin@example.com"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
                  placeholder="Masukkan password"
                />
              </label>

              {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? "Masuk..." : "Login"}
              </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10">
        <SiteFooter />
      </div>
      <BrandWatermark className="left-auto right-4 bottom-4 z-20" />
    </div>
  );
}
