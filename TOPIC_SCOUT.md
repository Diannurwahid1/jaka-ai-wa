# Citra Digital Hotel — Keyword Intelligence & Topic Scout System

---

## 1. Overview

Sistem ini adalah pipeline otomatis untuk:

* Mengidentifikasi keyword bernilai tinggi (high intent)
* Memvalidasi demand menggunakan Google Ads API
* Mengambil konteks dari web (search results) via **BytePlus InfoQuest Search API** (yang sudah terintegrasi di Jaka AI)
* Menghasilkan content brief berbasis data
* Mendukung SEO & lead generation untuk jasa website hotel

Sistem ini merupakan evolusi dari konsep **Topic Scout** menjadi:

> **Keyword Intelligence Engine + Content Strategy Generator**

---

## 2. Objective

Tujuan utama sistem:

1. Meningkatkan traffic organik (SEO)
2. Menghasilkan lead untuk jasa website hotel
3. Mengurangi trial-error dalam pembuatan konten
4. Menggunakan data (bukan asumsi) dalam menentukan topik

---

## 3. High-Level Architecture

```text
Keyword Generator
    ↓
Google Ads API (Keyword Metrics)
    ↓
Keyword Scoring & Filtering
    ↓
BytePlus InfoQuest Search API (SERP Context)  ← existing di Jaka AI
    ↓
Topic Scout (LLM Brief Generator via BytePlus Ark)
    ↓
Database (Topic Pool — MongoDB)
    ↓
Content / Landing Page Generator
```

---

## 4. System Components

### 4.1 Keyword Generator

Fungsi:

* Generate keyword berdasarkan:

  * Service (jasa website)
  * Property type (hotel, villa, resort)
  * Location (Bali, Jogja, dll)
  * Problem & solution

Contoh output:

```text
jasa website hotel
jasa website hotel bali
website hotel booking engine
cara meningkatkan direct booking hotel
```

---

### 4.2 Google Ads API Service

Menggunakan:

```text
KeywordPlanIdeaService.GenerateKeywordHistoricalMetrics
```

Data yang diambil:

* avgMonthlySearches
* monthlySearchVolumes
* competition
* competitionIndex

Tujuan:

* Validasi apakah keyword punya demand
* Prioritasi keyword berdasarkan volume

---

### 4.3 Keyword Scoring Engine

Formula:

```text
Score =
  40% Commercial Intent
+ 25% Search Volume
+ 15% Relevansi
+ 10% Competition
+ 10% Local Intent
```

Contoh:

| Keyword                      | Score |
| ---------------------------- | ----- |
| jasa website hotel           | 95    |
| website hotel booking engine | 88    |
| hospitality trend            | 45    |

---

### 4.4 Search Context Service (BytePlus InfoQuest — Existing di Jaka AI)

Sistem ini menggunakan **BytePlus InfoQuest Search API** yang sudah terintegrasi dan berjalan di dalam Jaka AI Creator (Topic Scout module).

#### Konfigurasi (dari Settings)

```typescript
// Konfigurasi disimpan di AppSettings dan di-manage via halaman Settings
{
  topicScoutSearchApiKey: process.env.TOPIC_SCOUT_SEARCH_API_KEY,
  topicScoutSearchUrl: process.env.TOPIC_SCOUT_SEARCH_URL
    ?? "https://search.infoquest.bytepluses.com",
}
```

#### Cara Kerja (Implementasi Aktual)

Search dilakukan via fungsi `callTopicScoutSearch()` di `lib/creator.ts`:

```typescript
// lib/creator.ts — callTopicScoutSearch()
async function callTopicScoutSearch(query: string, limit = 12) {
  const settings = await readSettings();

  if (!settings.topicScoutSearchUrl || !settings.topicScoutSearchApiKey) {
    throw new Error("Topic Scout search config belum lengkap di root Settings.");
  }

  const response = await fetch(settings.topicScoutSearchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.topicScoutSearchApiKey}`
    },
    body: JSON.stringify({
      search_type: "Web",
      format: "JSON",
      query
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Topic Scout search gagal (${response.status}): ${detail}`);
  }

  const payload = await response.json();
  const hits = dedupeTopicScoutSearchHits(
    collectTopicScoutSearchHits(payload)
  ).slice(0, limit);

  if (hits.length === 0) {
    throw new Error("Topic Scout search tidak mengembalikan hasil yang bisa dipakai.");
  }

  return hits;
}
```

#### Output Search Hit

```typescript
type TopicScoutSearchHit = {
  title: string;    // Judul halaman/artikel
  url: string;      // URL sumber
  snippet: string;  // Ringkasan pendek dari search engine
};
```

#### Fitur Tambahan yang Sudah Ada

* **Auto-collect & normalize** — `collectTopicScoutSearchHits()` secara rekursif mengekstrak title, url, dan snippet dari response JSON apapun strukturnya (mendukung field alias: `name`, `link`, `desc`, `summary`).
* **Auto-deduplication** — `dedupeTopicScoutSearchHits()` memastikan tidak ada duplikasi hasil berdasarkan normalisasi key dari `title + url`.
* **Integrated with Topic Scout Pipeline** — Hasil search otomatis disuntikkan ke LLM prompt untuk menghasilkan content brief.

#### Mengapa BytePlus InfoQuest?

1. **Sudah terintegrasi** — API key dan URL sudah dikonfigurasi di Settings Jaka AI.
2. **JSON-native** — Response langsung dalam format JSON, tidak perlu parsing HTML.
3. **Compliance-friendly** — Tidak melakukan scraping langsung ke Google, sesuai kebijakan di Section 8.
4. **Satu ecosystem** — BytePlus Ark sudah dipakai untuk LLM (Topic Scout Model) dan image generation (SeedDream), sehingga search via InfoQuest menjaga konsistensi vendor.

---

### 4.5 Topic Scout (LLM Layer — BytePlus Ark)

LLM menggunakan **BytePlus Ark Responses API** yang juga sudah terintegrasi di Jaka AI:

#### Konfigurasi

```typescript
{
  topicScoutModelApiKey: process.env.TOPIC_SCOUT_MODEL_API_KEY
    ?? process.env.ARK_API_KEY,
  topicScoutModelBaseUrl: process.env.TOPIC_SCOUT_MODEL_BASE_URL
    ?? "https://ark.ap-southeast.bytepluses.com/api/v3",
  topicScoutModel: process.env.TOPIC_SCOUT_MODEL
    ?? "seed-2-0-mini-260215",
}
```

#### Cara Kerja

```typescript
// lib/creator.ts — callTopicScoutModel()
async function callTopicScoutModel(prompt: string) {
  const settings = await readSettings();

  const response = await fetch(
    `${settings.topicScoutModelBaseUrl.replace(/\/$/, "")}/responses`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.topicScoutModelApiKey}`,
        "ark-beta-mcp": "true"
      },
      body: JSON.stringify({
        model: settings.topicScoutModel,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt
              }
            ]
          }
        ]
      })
    }
  );

  const payload = await response.json();
  return extractResponsesText(payload);
}
```

#### Output Topic Brief

Berdasarkan search result + LLM, menghasilkan:

```json
{
  "keyword": "jasa website hotel",
  "topic": "Jasa Website Hotel Profesional",
  "angle": "Direct booking & trust building",
  "description": "Halaman layanan utama untuk konversi",
  "whyNow": "Hotel butuh digital channel sendiri",
  "cta": "Konsultasi gratis"
}
```

#### Prompt Strategy (SEO Content Strategist)

```text
Kamu adalah SEO Content Strategist untuk Citra Digital Hotel.

Brand:
Citra Digital Hotel adalah layanan pembuatan website untuk hotel, villa, resort,
guest house, dan penginapan yang ingin terlihat profesional, mendapatkan direct
booking, dan meningkatkan kepercayaan calon tamu.

Target audience:
- owner hotel
- general manager hotel
- marketing hotel
- villa owner
- resort manager

Tujuan:
Buat brief konten yang bisa meningkatkan lead untuk jasa website hotel.

Prioritaskan:
1. keyword dengan commercial intent
2. problem hotel yang bisa diselesaikan dengan website
3. direct booking
4. booking engine
5. integrasi WhatsApp
6. SEO hotel
7. local SEO untuk kota wisata di Indonesia

Dari hasil web search berikut, buat daftar brief konten.

Untuk setiap brief, tentukan:
- keyword utama
- search intent
- funnel stage
- tipe konten
- judul/topik
- angle
- deskripsi
- whyNow
- CTA
- target audience
- tags
- references

Jangan membuat klaim tanpa evidence dari hasil search.
Jangan membuat topik yang terlalu umum.
Jangan membuat topik yang tidak bisa diarahkan ke jasa website hotel.

Return JSON:
{
  "topics": [
    {
      "keyword": "...",
      "keywordIntent": "commercial | informational | local | problem-aware | solution-aware",
      "funnelStage": "awareness | consideration | conversion",
      "contentType": "landing_page | blog_article | service_page | feature_page | case_study",
      "topic": "...",
      "angle": "...",
      "description": "...",
      "whyNow": "...",
      "cta": "...",
      "targetAudience": "...",
      "tags": [],
      "references": []
    }
  ]
}
```

---

### 4.6 Database Layer (MongoDB — Existing)

Database menggunakan **MongoDB** yang sudah berjalan di Jaka AI (diakses via `getMongoDatabase()` di `lib/mongodb.ts`).

#### Collection: `creator_topic_briefs` (Existing)

```typescript
// Sudah ada di lib/creator.ts
type CreatorTopicBriefDocument = {
  _id?: ObjectId;
  creatorId: string;
  platform: CreatorPlatform;
  worker: string;
  query: string;
  topic: string;
  angle: string;
  description: string;
  whyNow: string;
  tags: string[];
  dedupeKey: string;
  status: "fresh" | "used" | "archived";
  references: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
  usedAt?: Date;
  usedByDraftId?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

#### Table Baru: `keywords` (Untuk Keyword Intelligence)

```sql
CREATE TABLE keywords (
  id UUID PRIMARY KEY,
  keyword TEXT,
  avg_monthly_searches INT,
  competition TEXT,
  competition_index INT,
  score INT,
  keyword_intent TEXT,
  funnel_stage TEXT,
  monthly_search_volumes JSONB,
  created_at TIMESTAMP
);
```

#### Table Baru: `topic_briefs` (Extended untuk Keyword Intelligence)

```sql
CREATE TABLE topic_briefs (
  id UUID PRIMARY KEY,
  keyword TEXT,
  keyword_intent TEXT,
  funnel_stage TEXT,
  content_type TEXT,
  topic TEXT,
  angle TEXT,
  description TEXT,
  why_now TEXT,
  cta TEXT,
  target_audience TEXT,
  business_goal TEXT,
  tags TEXT[],
  references JSONB,
  status TEXT,
  created_at TIMESTAMP
);
```

---

### 4.7 Content Generator

Input:

```text
keyword + topic brief
```

Output:

* Landing page
* Blog article
* SEO content

---

## 5. Workflow Detail

### Step 1 — Generate Keyword

```ts
const keywords = generateKeywords();
// Menggunakan pola kombinasi:
// [service] + [property type] + [location]
// [problem] + [property type]
// [solution] + [property type]
```

---

### Step 2 — Fetch Metrics (Google Ads API)

```ts
const metrics = getKeywordMetrics(keywords);
// avgMonthlySearches, competition, competitionIndex
```

---

### Step 3 — Score & Filter Keyword

```ts
const scored = keywords.map(k => ({
  ...k,
  score: calculateScore(k) // formula 40/25/15/10/10
}));
const filtered = scored.filter(k => k.score > 70);
```

---

### Step 4 — Get Search Context (BytePlus InfoQuest — Existing)

```ts
// Menggunakan fungsi yang sudah ada di lib/creator.ts
const searchHits = await callTopicScoutSearch(keyword, 12);
// Returns: TopicScoutSearchHit[] { title, url, snippet }
```

---

### Step 5 — Generate Topic Brief (BytePlus Ark — Existing)

```ts
const prompt = buildTopicScoutPrompt({
  platform, profile, query, limit, searchHits
});
const raw = await callTopicScoutModel(prompt);
const topics = parseJsonPayload(raw);
```

---

### Step 6 — Store (MongoDB — Existing)

```ts
// Deduplicate dan simpan ke creator_topic_briefs collection
const { topicBriefs } = await getCollections();
await topicBriefs.insertOne(document);
```

---

## 6. Full Pipeline (Existing Implementation)

Pipeline lengkap sudah diimplementasikan di fungsi `runCreatorTopicScout()`:

```typescript
// lib/creator.ts
export async function runCreatorTopicScout(input?: {
  platform?: string;
  query?: string;
  limit?: number;
}) {
  const platform = normalizePlatform(input?.platform);
  const profile = await getCreatorProfile(platform);
  const settings = await readSettings();
  const query = buildTopicScoutQuery(
    platform, profile, input?.query, settings.topicScoutDefaultQuery
  );
  const limit = Math.max(1, Math.min(Number(input?.limit ?? 20), 30));

  // Step 1: Search via BytePlus InfoQuest
  const searchHits = await callTopicScoutSearch(query, Math.max(limit, 10));

  // Step 2: Build prompt untuk LLM
  const prompt = buildTopicScoutPrompt({
    platform, profile, query, limit, searchHits
  });

  // Step 3: Call LLM via BytePlus Ark
  const raw = await callTopicScoutModel(prompt);
  const parsed = parseJsonPayload(raw);

  // Step 4: Deduplicate & store ke MongoDB
  // ... insert ke creator_topic_briefs collection
}
```

---

## 7. API Design (Internal)

### Existing Endpoints (Jaka AI Creator)

```text
POST /api/creator/topic-scout     → Run Topic Scout pipeline
GET  /api/creator/topic-briefs    → List topic briefs
```

### New Endpoints (Keyword Intelligence)

```text
POST /api/keyword-scout/run       → Full pipeline: generate → score → search → brief → store
GET  /api/keywords                 → List scored keywords
GET  /api/topics                   → List topic briefs (extended)
POST /api/topics/:id/use           → Mark topic as used
```

---

## 8. Data Flow

```text
Keyword → Ads API → Score → Filter → BytePlus InfoQuest Search → BytePlus Ark LLM → MongoDB → Content
```

---

## 9. Struktur Data Lengkap

### A. Search Hit (dari BytePlus InfoQuest)

```typescript
type TopicScoutSearchHit = {
  title: string;
  url: string;
  snippet: string;
};
```

### B. Hotel Web Content Brief (Output LLM — Extended)

```typescript
type HotelWebContentBrief = {
  id: string;
  brand: "Citra Digital Hotel";
  keyword: string;
  keywordIntent: "commercial" | "informational" | "local" | "problem-aware" | "solution-aware";
  funnelStage: "awareness" | "consideration" | "conversion";
  contentType: "landing_page" | "blog_article" | "comparison_page" | "case_study" | "service_page";
  topic: string;
  angle: string;
  description: string;
  targetAudience: "owner hotel" | "general manager" | "marketing hotel" | "villa owner" | "resort manager";
  businessGoal: "lead_generation" | "seo_traffic" | "trust_building" | "conversion";
  cta: string;
  whyNow: string;
  tags: string[];
  references: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
  dedupeKey: string;
  status: "fresh" | "used" | "archived";
};
```

---

## 10. Strategi Keyword & Scoring

Pembentukan *query* untuk Search API dapat menggunakan pola kombinasi otomatis:
- `[service] + [property type] + [location]` → jasa pembuatan website villa Bali
- `[problem] + [property type]` → cara mengurangi komisi OTA hotel
- `[solution] + [property type]` → booking engine hotel

**Default Query (dari Settings):**

```text
tren terbaru hotel indonesia direct booking OTA website hotel AI customer service hospitality marketing
```

**Keyword Scoring:**

| Weight | Factor            | Deskripsi                                            |
| ------ | ----------------- | ---------------------------------------------------- |
| 40%    | Commercial Intent | Apakah keyword ini dekat dengan pembelian?           |
| 25%    | Search Volume     | Dari Google Ads API avgMonthlySearches               |
| 15%    | Relevansi         | Apakah relevan dengan jasa web hotel?                |
| 10%    | Competition       | Tingkat persaingan (inversed — low competition = ↑)  |
| 10%    | Local Intent      | Apakah mencakup lokasi wisata strategis?             |

---

## 11. Peta Struktur / Cluster Konten

Sistem tidak hanya memproduksi brief acak, tapi harus bisa membangun "Content Cluster" yang terstruktur:

1. **Cluster 1: Direct Booking** — Problem-aware, target owner yang ingin mengurangi komisi OTA
2. **Cluster 2: Website Hotel Profesional** — Edukasi pentingnya punya web sendiri
3. **Cluster 3: Booking Engine & Reservasi Online** — Solution-aware, edukasi fitur
4. **Cluster 4: Digital Marketing Hotel** — SEO, Ads, Traffic
5. **Cluster 5: Segmen Spesifik & Lokasi** — Jasa web villa, resort, local SEO untuk Bali, Jogja, dll

---

## 12. Compliance & Policy

* Data hanya digunakan internal
* Tidak ada resale data
* Tidak expose API ke publik
* Tidak scraping Google Search langsung — **menggunakan BytePlus InfoQuest sebagai search provider yang compliance-safe**

---

## 13. Tech Stack Summary (Existing di Jaka AI)

| Layer             | Teknologi                               | Status        |
| ----------------- | --------------------------------------- | ------------- |
| Search API        | BytePlus InfoQuest Search               | ✅ Existing   |
| LLM               | BytePlus Ark (seed-2-0-mini)            | ✅ Existing   |
| Image Generation  | BytePlus SeedDream                      | ✅ Existing   |
| Database          | MongoDB (creator_topic_briefs)          | ✅ Existing   |
| Settings Manager  | Prisma AppConfig                        | ✅ Existing   |
| Keyword Metrics   | Google Ads API                          | 🔧 New       |
| Keyword Scoring   | Custom scoring engine                   | 🔧 New       |
| Content Generator | Landing page / blog article generator   | 🔧 New       |

---

## 14. Future Improvement

* AI keyword clustering
* Automatic landing page generator
* Conversion tracking integration
* CRM integration (lead tracking)
* Auto-rotate search batch (commercial, problem, feature, local, trend)

---

## 15. Summary

Sistem ini mengubah:

```text
Random content → Data-driven content
```

Menjadi:

```text
Keyword Intelligence Engine → Lead Generation System
```

Dengan memanfaatkan infrastructure yang **sudah ada** di Jaka AI:
- **BytePlus InfoQuest** untuk search context
- **BytePlus Ark** untuk LLM brief generation
- **MongoDB** untuk storage
- **Settings Manager** untuk konfigurasi API keys

Yang perlu ditambahkan:
- **Google Ads API** untuk keyword metrics validation
- **Scoring Engine** untuk prioritasi keyword
- **Content Generator** untuk output akhir (landing page, blog, SEO content)

---

**End of Document**
