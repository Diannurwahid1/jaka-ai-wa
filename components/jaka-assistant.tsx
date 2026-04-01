"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  suggestions?: string[];
};

const NAME_STORAGE_KEY = "jaka-ai-name";
const OPEN_STORAGE_KEY = "jaka-ai-opened";
const INTRO_STORAGE_KEY = "jaka-ai-intro";
const SUGGESTIONS_STORAGE_KEY = "jaka-ai-suggestions";
const HISTORY_STORAGE_KEY = "jaka-ai-history";
const MAX_STORED_MESSAGES = 14;

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseStoredSuggestions(raw: string | null) {
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function parseStoredHistory(raw: string | null) {
  if (!raw) {
    return [] as AssistantMessage[];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item): AssistantMessage => ({
        id: String(item?.id ?? makeId()),
        role: item?.role === "user" ? "user" : "assistant",
        text: String(item?.text ?? ""),
        suggestions: Array.isArray(item?.suggestions)
          ? item.suggestions.map((entry: unknown) => String(entry))
          : undefined
      }))
      .filter((item) => item.text.trim());
  } catch {
    return [];
  }
}

function persistHistory(messages: AssistantMessage[]) {
  window.localStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))
  );
}

function toApiHistory(messages: AssistantMessage[]) {
  return messages.slice(-12).map((message) => ({
    role: message.role,
    content: message.text
  }));
}

type ApiHistoryMessage = ReturnType<typeof toApiHistory>[number];

function buildTourSteps(pathname: string) {
  const common = [
    {
      element: '[data-tour="sidebar-brand"]',
      popover: {
        title: "Control Center",
        description: "Ini pusat operasi utama untuk flow AI, backend, WA Blast, memory, dan knowledge base."
      }
    },
    {
      element: '[data-tour="nav-dashboard"]',
      popover: {
        title: "Dashboard",
        description: "Halaman ringkasan statistik, status sistem, dan recent activity."
      }
    },
    {
      element: '[data-tour="nav-ai-chat"]',
      popover: {
        title: "AI Chat",
        description: "Tempat mengetes prompt dan respons AI secara manual tanpa menunggu pesan WhatsApp."
      }
    },
    {
      element: '[data-tour="nav-wa-monitor"]',
      popover: {
        title: "WA Monitor",
        description: "Dipakai untuk memantau log pesan masuk, reply AI, dan memory per nomor."
      }
    },
    {
      element: '[data-tour="nav-knowledge"]',
      popover: {
        title: "Knowledge Base",
        description: "Semua dokumen internal untuk RAG dikelola dari sini."
      }
    },
    {
      element: '[data-tour="nav-settings"]',
      popover: {
        title: "Settings",
        description: "Simpan konfigurasi AI, WA Blast, MongoDB, embedding, dan keamanan admin."
      }
    }
  ];

  const perPage =
    pathname === "/dashboard"
      ? [
          {
            element: '[data-tour="dashboard-stats"]',
            popover: {
              title: "Quick Stats",
              description: "Card statistik ini menunjukkan jumlah pesan, reply AI, success, dan memory aktif."
            }
          },
          {
            element: '[data-tour="dashboard-activity"]',
            popover: {
              title: "Recent Activity",
              description: "Semua log terbaru tampil di sini agar debugging lebih cepat."
            }
          },
          {
            element: '[data-tour="dashboard-memory"]',
            popover: {
              title: "Top Memory Sessions",
              description: "Session dengan context AI paling aktif dirangkum di panel ini."
            }
          }
        ]
      : pathname === "/ai-chat"
        ? [
            {
              element: '[data-tour="ai-chat-panel"]',
              popover: {
                title: "Manual AI Test",
                description: "Gunakan panel ini untuk uji gaya balasan AI dan simpan hasilnya ke log."
              }
            }
          ]
        : pathname === "/wa-monitor"
          ? [
              {
                element: '[data-tour="wa-monitor-logs"]',
                popover: {
                  title: "Live Logs",
                  description: "Semua inbound message dan status reply AI terlihat di sini."
                }
              },
              {
                element: '[data-tour="wa-monitor-memory"]',
                popover: {
                  title: "AI Memory",
                  description: "Panel ini menampilkan summary, recent messages, dan aksi clear memory per nomor."
                }
              }
            ]
          : pathname === "/knowledge-base"
            ? [
                {
                  element: '[data-tour="knowledge-add"]',
                  popover: {
                    title: "Tambah Knowledge",
                    description: "Masukkan informasi produk, layanan, promo, atau FAQ untuk RAG."
                  }
                },
                {
                  element: '[data-tour="knowledge-rag-test"]',
                  popover: {
                    title: "Test RAG",
                    description: "Coba pertanyaan dan lihat apakah knowledge yang diambil sudah relevan."
                  }
                },
                {
                  element: '[data-tour="knowledge-list"]',
                  popover: {
                    title: "Stored Knowledge",
                    description: "Semua dokumen knowledge yang aktif untuk retrieval ada di sini."
                  }
                }
              ]
            : pathname === "/settings"
              ? [
                  {
                    element: '[data-tour="settings-ai"]',
                    popover: {
                      title: "AI Config",
                      description: "Atur endpoint AI, API key, model, dan prompt system."
                    }
                  },
                  {
                    element: '[data-tour="settings-wa"]',
                    popover: {
                      title: "WA Blast Config",
                      description: "Atur URL gateway, session, token, dan kredensial WA."
                    }
                  },
                  {
                    element: '[data-tour="settings-security"]',
                    popover: {
                      title: "Admin Security",
                      description: "Di sini admin bisa ganti password dan mengecek keamanan credential."
                    }
                  }
                ]
              : [];

  const ending = [
    {
      element: '[data-tour="assistant-launcher"]',
      popover: {
        title: "Jaka AI",
        description: "Kalau lupa fungsi halaman, tinggal tanya saya atau mulai tour lagi dari tombol ini."
      }
    }
  ];

  return [...common, ...perPage, ...ending].filter((step) => document.querySelector(step.element));
}

function startJakaTour(pathname: string) {
  const steps = buildTourSteps(pathname);
  if (steps.length === 0) {
    return;
  }

  const tour = driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.35,
    nextBtnText: "Lanjut",
    prevBtnText: "Kembali",
    doneBtnText: "Selesai",
    popoverClass: "jaka-driver-popover",
    steps
  });

  tour.drive();
}

export function JakaAssistant() {
  const pathname = usePathname();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [launcherCue, setLauncherCue] = useState(false);
  const [name, setName] = useState("");
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Halo, aku Jaka AI. Sebelum mulai, siapa nama kamu dulu?"
    }
  ]);

  useEffect(() => {
    let active = true;
    const storedName = window.localStorage.getItem(NAME_STORAGE_KEY);
    const storedOpened = window.localStorage.getItem(OPEN_STORAGE_KEY);
    const storedIntro = window.localStorage.getItem(INTRO_STORAGE_KEY);
    const storedSuggestions = window.localStorage.getItem(SUGGESTIONS_STORAGE_KEY);
    const storedHistory = parseStoredHistory(window.localStorage.getItem(HISTORY_STORAGE_KEY));

    async function hydrateIntro(nameValue: string) {
      try {
        const response = await fetch("/api/jaka/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameValue,
            pathname,
            message:
              "Perkenalkan diri sebagai Jaka AI, sapa user berdasarkan nama yang diberikan, lalu jelaskan singkat kamu bisa membantu apa saja di web ini."
          })
        });
        const payload = await response.json();

        if (!active || !response.ok || !payload.ok) {
          return;
        }

        window.localStorage.setItem(INTRO_STORAGE_KEY, payload.answer);
        window.localStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(payload.suggestions ?? []));

        const introMessages: AssistantMessage[] = [
          {
            id: "greeted",
            role: "assistant" as const,
            text: payload.answer,
            suggestions: payload.suggestions
          }
        ];

        setMessages(introMessages);
        persistHistory(introMessages);
      } catch {
        // Keep the existing welcome prompt if intro hydration fails.
      }
    }

    if (storedName) {
      setName(storedName);
      if (storedHistory.length > 0) {
        setMessages(storedHistory);
      } else if (storedIntro) {
        const introMessages: AssistantMessage[] = [
          {
            id: "greeted",
            role: "assistant" as const,
            text: storedIntro,
            suggestions: parseStoredSuggestions(storedSuggestions)
          }
        ];

        setMessages(introMessages);
        persistHistory(introMessages);
      } else {
        void hydrateIntro(storedName);
      }
    }

    if (!storedOpened) {
      setOpen(true);
      window.localStorage.setItem(OPEN_STORAGE_KEY, "1");
    }

    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, open]);

  useEffect(() => {
    function handleStartTour() {
      startJakaTour(pathname);
    }

    window.addEventListener("jaka:start-tour", handleStartTour);
    return () => window.removeEventListener("jaka:start-tour", handleStartTour);
  }, [pathname]);

  useEffect(() => {
    function handleCelebrationComplete() {
      setOpen(false);
      setLauncherCue(true);
      window.setTimeout(() => {
        setLauncherCue(false);
      }, 2200);
    }

    window.addEventListener("jaka:celebration-complete", handleCelebrationComplete);
    return () => window.removeEventListener("jaka:celebration-complete", handleCelebrationComplete);
  }, []);

  async function submitQuestion(rawValue?: string) {
    const value = (rawValue ?? input).trim();
    if (!value || submitting) return;

    const userMessage: AssistantMessage = {
      id: makeId(),
      role: "user",
      text: value
    };

    setInput("");

    if (!name) {
      window.localStorage.setItem(NAME_STORAGE_KEY, value);
      setName(value);
      let introHistory: ApiHistoryMessage[] = [{ role: "user", content: userMessage.text }];

      setMessages((current) => {
        const next = [...current, userMessage].slice(-MAX_STORED_MESSAGES);
        persistHistory(next);
        introHistory = toApiHistory(next);
        return next;
      });
      setSubmitting(true);

      try {
        const response = await fetch("/api/jaka/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: value,
            pathname,
            history: introHistory,
            message:
              "Perkenalkan diri sebagai Jaka AI, sapa user berdasarkan nama yang diberikan, lalu jelaskan singkat kamu bisa membantu apa saja di web ini."
          })
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          throw new Error(payload.reason || "Jaka AI gagal memulai perkenalan");
        }

        window.localStorage.setItem(INTRO_STORAGE_KEY, payload.answer);
        window.localStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(payload.suggestions ?? []));

        setMessages((current) => {
          const next: AssistantMessage[] = [
            ...current,
            {
              id: makeId(),
              role: "assistant" as const,
              text: payload.answer,
              suggestions: payload.suggestions
            }
          ].slice(-MAX_STORED_MESSAGES);

          persistHistory(next);
          return next;
        });
      } catch (error) {
        setMessages((current) => {
          const next: AssistantMessage[] = [
            ...current,
            {
              id: makeId(),
              role: "assistant" as const,
              text:
                error instanceof Error
                  ? error.message
                  : "Jaka AI belum bisa memperkenalkan diri sekarang."
            }
          ].slice(-MAX_STORED_MESSAGES);

          persistHistory(next);
          return next;
        });
      } finally {
        setSubmitting(false);
      }

      return;
    }

    let requestHistory: ApiHistoryMessage[] = [{ role: "user", content: userMessage.text }];

    setMessages((current) => {
      const next = [...current, userMessage].slice(-MAX_STORED_MESSAGES);
      persistHistory(next);
      requestHistory = toApiHistory(next);
      return next;
    });

    setSubmitting(true);

    try {
      const response = await fetch("/api/jaka/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, name, pathname, history: requestHistory })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason || "Jaka AI gagal menjawab");
      }

      setMessages((current) => {
        const next: AssistantMessage[] = [
          ...current,
          {
            id: makeId(),
            role: "assistant" as const,
            text: payload.answer,
            suggestions: payload.suggestions
          }
        ].slice(-MAX_STORED_MESSAGES);

        persistHistory(next);
        window.localStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(payload.suggestions ?? []));
        return next;
      });

      if (value.toLowerCase().includes("tour")) {
        window.setTimeout(() => startJakaTour(pathname), 200);
      }
    } catch (error) {
      setMessages((current) => {
        const next: AssistantMessage[] = [
          ...current,
          {
            id: makeId(),
            role: "assistant" as const,
            text:
              error instanceof Error
                ? error.message
                : "Maaf, Jaka AI lagi tidak bisa menjawab sekarang."
          }
        ].slice(-MAX_STORED_MESSAGES);

        persistHistory(next);
        return next;
      });
    } finally {
      setSubmitting(false);
    }
  }

  const latestSuggestions = [...messages].reverse().find((message) => message.suggestions)?.suggestions ?? [];

  return (
    <>
      {!open ? (
        <button
          type="button"
          data-tour="assistant-launcher"
          onClick={() => setOpen(true)}
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-full border border-slate-200/70 bg-slate-950 px-4 py-3 text-left text-sm text-white shadow-[0_18px_60px_rgba(15,23,42,0.24)] transition hover:bg-slate-900 sm:bottom-5 sm:right-5 ${
            launcherCue ? "jaka-launcher-cue" : ""
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/95 shadow-inner">
            <Image src="/logo.png" alt="Jaka AI" width={40} height={40} className="h-10 w-10 object-cover" />
          </span>
          <span className="hidden sm:block">
            <span className="block text-xs uppercase tracking-[0.24em] text-white/60">Jaka AI</span>
            <span className="block font-medium">
              {name ? `Tanya fitur web, ${name}` : "Mulai kenalan dulu"}
            </span>
          </span>
        </button>
      ) : null}

      {open ? (
        <div className="fixed bottom-4 left-3 right-3 z-50 flex max-h-[min(82vh,760px)] flex-col overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur sm:bottom-5 sm:left-auto sm:right-5 sm:w-[min(420px,calc(100vw-2rem))]">
          <div className="flex-none bg-[radial-gradient(circle_at_top_left,_rgba(18,115,105,0.18),_transparent_45%),linear-gradient(135deg,#0f172a,#1e293b)] px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/95 shadow-inner">
                  <Image
                    src="/logo.png"
                    alt="Jaka AI"
                    width={44}
                    height={44}
                    className="h-11 w-11 object-cover"
                  />
                </span>

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.26em] text-white/60">Jaka AI Guide</p>
                  <h3 className="mt-2 text-lg font-semibold">
                    {name ? `Halo ${name}` : "Kenalan dulu ya"}
                  </h3>
                  <p className="mt-1 text-sm text-white/75">
                    Asisten pengenalan fitur dashboard, memory, RAG, WA monitor, dan settings.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 transition hover:bg-white/20"
              >
                Tutup
              </button>
            </div>
          </div>

          <div
            ref={viewportRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f8f5ef] px-4 py-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-[#d9fdd3] text-slate-900"
                      : "bg-white text-slate-700 shadow-sm"
                  }`}
                >
                  {message.text.split("\n").map((line, index) => (
                    <p key={`${message.id}-${index}`}>{line}</p>
                  ))}
                </div>
              </div>
            ))}

            {submitting ? (
              <div className="flex justify-start">
                <div className="rounded-[22px] bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  Jaka AI lagi mikir sebentar...
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex-none border-t border-slate-200 bg-white px-4 py-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => submitQuestion("Mulai Tour")}
                className="rounded-full bg-accent px-3 py-2 text-xs font-medium text-white transition hover:opacity-90"
              >
                Mulai Tour
              </button>

              {latestSuggestions.slice(0, 3).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submitQuestion(suggestion)}
                  className="max-w-full rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void submitQuestion();
              }}
              className="flex items-end gap-3"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={name ? "Tanya soal fitur web ini..." : "Ketik nama kamu dulu..."}
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={submitting}
                className="shrink-0 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Kirim
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
