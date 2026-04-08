import { readSettings } from "@/lib/settings";

export type AskJakaResult = {
  answer: string;
  suggestions: string[];
};

export type JakaHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

const femaleHints = [
  "ayu",
  "putri",
  "dewi",
  "indah",
  "sari",
  "nisa",
  "nabila",
  "zahra",
  "amel",
  "amelia",
  "laila",
  "nayla",
  "syifa",
  "tiara",
  "dinda",
  "bunga",
  "melati",
  "ratna",
  "wulan",
  "intan",
  "mutia",
  "safira",
  "cinta",
  "icha",
  "fitri"
];

const appContext = {
  appName: "WA AI Control Center",
  routes: [
    {
      path: "/dashboard",
      name: "Dashboard",
      description: "Ringkasan statistik, health sistem, recent activity, dan memory session."
    },
    {
      path: "/jaka-creator",
      name: "Jaka Creator",
      description: "Hub modul creator dengan submenu platform untuk Threads, Instagram, LinkedIn, dan Facebook."
    },
    {
      path: "/jaka-creator/threads",
      name: "Creator Threads",
      description: "Studio creator khusus Threads dengan hook-first thread workflow."
    },
    {
      path: "/jaka-creator/instagram",
      name: "Creator Instagram",
      description: "Studio creator Instagram untuk caption dan image generation."
    },
    {
      path: "/jaka-creator/linkedin",
      name: "Creator LinkedIn",
      description: "Studio creator LinkedIn untuk authority post dan visual profesional."
    },
    {
      path: "/jaka-creator/facebook",
      name: "Creator Facebook",
      description: "Studio creator Facebook untuk post komunitas dan visual shareable."
    },
    {
      path: "/ai-chat",
      name: "AI Chat",
      description: "Tempat test AI secara manual tanpa menunggu pesan WhatsApp masuk."
    },
    {
      path: "/wa-monitor",
      name: "WA Monitor",
      description: "Live logs pesan WhatsApp, status auto reply, dan panel AI Memory per nomor."
    },
    {
      path: "/knowledge-base",
      name: "Knowledge Base",
      description: "Kelola dokumen knowledge dan test RAG berbasis MongoDB."
    },
    {
      path: "/settings",
      name: "Settings",
      description: "Atur runtime AI, WA Blast, MongoDB, embedding, dan admin security."
    }
  ],
  capabilities: [
    "WA auto reply via webhook",
    "Jaka AI Creator multi-platform dengan approval workflow",
    "AI manual testing",
    "AI memory per nomor WhatsApp",
    "RAG dengan MongoDB",
    "Auth dan keamanan admin",
    "Driver.js feature tour",
    "Floating Jaka AI assistant"
  ],
  rules: [
    "Kalau user minta tour, arahkan untuk tekan tombol Mulai Tour.",
    "Jawab hanya tentang fitur dan alur web ini.",
    "Jangan jawab seolah kamu AI customer service WhatsApp bisnis utama.",
    "Jangan mengarang fitur yang tidak ada."
  ]
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function looksLikeFemaleName(name: string) {
  const tokens = tokenize(name);
  return tokens.some((token) => femaleHints.includes(token));
}

function buildJakaSystemPrompt(name?: string) {
  const romanticMode = looksLikeFemaleName(name ?? "");

  return `Kamu adalah Jaka AI, asisten interaktif untuk menjelaskan web admin ${appContext.appName}.

Peran:
- Menjawab pertanyaan user tentang halaman, fitur, dan alur web ini.
- Membantu user memahami fungsi tiap menu.
- Mengarahkan user memakai tombol "Mulai Tour" bila ingin dipandu keliling UI.

Aturan:
- Jawab HANYA berdasarkan context aplikasi yang diberikan.
- Jangan menjawab topik di luar web ini.
- Jangan mengambil peran AI WhatsApp bisnis utama.
- Jika ada informasi yang tidak jelas, jawab jujur dan arahkan user ke halaman paling relevan.
- Gunakan bahasa Indonesia.
- Buat jawaban singkat, padat, jelas, dan modern.
- Berikan maksimal 3 saran lanjutan yang relevan.

Gaya personal:
- Nama user: ${name || "belum disebut"}.
- ${romanticMode ? "Kalau menyapa user, gunakan tone lebih manis, hangat, dan sedikit romantis dengan emoji bunga secukupnya." : "Gunakan tone ramah profesional santai."}

Format keluaran WAJIB JSON valid dengan bentuk:
{
  "answer": "jawaban ke user",
  "suggestions": ["saran 1", "saran 2", "saran 3"]
}`;
}

function safeParseJakaResponse(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Partial<AskJakaResult>;
    return {
      answer: String(parsed.answer ?? "").trim(),
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
        : []
    };
  } catch {
    return null;
  }
}

export async function askJakaAI(
  question: string,
  name?: string,
  pathname?: string,
  history: JakaHistoryItem[] = []
): Promise<AskJakaResult> {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    return {
      answer: "Jaka AI belum menerima pertanyaan.",
      suggestions: []
    };
  }

  const settings = await readSettings();

  if (!settings.aiApiKey || !settings.aiApiUrl) {
    return {
      answer: "Konfigurasi AI untuk Jaka AI belum lengkap.",
      suggestions: []
    };
  }

  const response = await fetch(settings.aiApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.aiApiKey}`
    },
    body: JSON.stringify({
      model: settings.aiModel,
      messages: [
        {
          role: "system",
          content: buildJakaSystemPrompt(name)
        },
        {
          role: "system",
          content: `Context aplikasi:\n${JSON.stringify(
            {
              currentPath: pathname || "/dashboard",
              ...appContext
            },
            null,
            2
          )}`
        },
        ...history.slice(-12).map((item) => ({
          role: item.role,
          content: item.content
        })),
        {
          role: "user",
          content: trimmedQuestion
        }
      ],
      temperature: 0.7,
      max_tokens: 320
    }),
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Jaka AI request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const raw = String(data.choices?.[0]?.message?.content ?? "").trim();
  const parsed = safeParseJakaResponse(raw);

  if (parsed?.answer) {
    return parsed;
  }

  return {
    answer: raw || "Jaka AI belum bisa menjawab saat ini.",
    suggestions: []
  };
}
