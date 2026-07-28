/**
 * Threads Scout — Keyword scraping + AI-powered natural reply engine
 *
 * Flow:
 * 1. Search Threads posts by keyword via Threads Search API
 * 2. Filter posts that haven't been replied yet (tracked in DB)
 * 3. Generate a natural, casual Indonesian reply using AI
 * 4. Post the reply to Threads via Graph API
 * 5. Record the replied post ID to avoid duplicate replies
 */

import { postChatCompletion } from "@/lib/ai-client";
import { prisma } from "@/lib/prisma";
import { readSettings } from "@/lib/settings";
import { AppSettings } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThreadsPost = {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  permalink?: string;
};

export type ScoutReplyResult = {
  postId: string;
  username: string;
  postText: string;
  reply: string;
  replyId?: string;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
};

export type ScoutRunResult = {
  keyword: string;
  found: number;
  replied: number;
  skipped: number;
  errors: number;
  results: ScoutReplyResult[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function threadsBaseUrl(settings: AppSettings) {
  const base = settings.threadsApiBaseUrl.trim() || "https://graph.threads.net";
  const version = settings.threadsApiVersion.trim() || "v1.0";
  return `${base.replace(/\/$/, "")}/${version.replace(/^v/i, "v")}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000), ...init });
  const raw = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${raw.slice(0, 400)}`);
  return JSON.parse(raw) as T;
}

// ---------------------------------------------------------------------------
// Threads API calls
// ---------------------------------------------------------------------------

/**
 * Search Threads posts by keyword.
 * Uses the Threads Search API: GET /threads/search?q=<keyword>&fields=...
 * Requires threads_basic + threads_read_replies scope.
 */
async function searchThreadsPosts(
  keyword: string,
  settings: AppSettings,
  limit = 20
): Promise<ThreadsPost[]> {
  const base = threadsBaseUrl(settings);
  const token = settings.threadsAccessToken.trim();

  if (!token) throw new Error("Threads access token belum diisi.");

  // Correct endpoint: GET /keyword_search
  // Docs: https://developers.facebook.com/docs/threads/keyword-search
  // NOTE: search_type=TOP returns results; RECENT returns 0 without app approval
  // NOTE: Without threads_keyword_search app approval, only searches own posts
  const url = new URL(`${base}/keyword_search`);
  url.searchParams.set("q", keyword);
  url.searchParams.set("search_type", "TOP");
  url.searchParams.set("fields", "id,text,username,timestamp,permalink,has_replies,is_reply,is_quote_post");
  url.searchParams.set("limit", String(Math.min(limit, 100)));
  url.searchParams.set("access_token", token);

  const data = await fetchJson<{
    data?: Array<{
      id?: string;
      text?: string;
      username?: string;
      timestamp?: string;
      permalink?: string;
      has_replies?: boolean;
      is_reply?: boolean;
      is_quote_post?: boolean;
    }>;
  }>(url.toString());

  const raw = data.data ?? [];
  console.log(`[threads-scout] keyword="${keyword}" raw=${raw.length} posts from API`);
  if (raw.length > 0) {
    console.log(`[threads-scout] sample:`, JSON.stringify(raw[0]).slice(0, 200));
  }

  // NOTE: Without threads_keyword_search app approval, API only returns the
  // authenticated user's own posts. Public search requires Meta app review.
  const filtered = raw.filter((p) => p.id && p.text && !p.is_reply);
  console.log(`[threads-scout] after filter (non-reply root posts): ${filtered.length}`);

  return filtered.map((p) => ({
    id: String(p.id),
    text: String(p.text ?? ""),
    username: String(p.username ?? "unknown"),
    timestamp: String(p.timestamp ?? ""),
    permalink: p.permalink ? String(p.permalink) : undefined
  }));
}

/**
 * Post a reply to a Threads post.
 * Step 1: Create a reply container
 * Step 2: Publish the reply container
 */
async function replyToThreadsPost(
  parentPostId: string,
  replyText: string,
  settings: AppSettings
): Promise<string> {
  const base = threadsBaseUrl(settings);
  const token = settings.threadsAccessToken.trim();
  const userId = settings.threadsUserId.trim() || "me";

  // Step 1: Create reply container
  const createUrl = `${base}/${userId}/threads`;
  const createParams = new URLSearchParams({
    media_type: "TEXT",
    text: replyText,
    reply_to_id: parentPostId,
    access_token: token
  });

  const createData = await fetchJson<{ id?: string }>(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createParams.toString()
  });

  const creationId = String(createData.id ?? "");
  if (!creationId) throw new Error("Threads tidak mengembalikan creation_id saat buat reply.");

  // Step 2: Publish reply
  const publishUrl = `${base}/${userId}/threads_publish`;
  const publishParams = new URLSearchParams({
    creation_id: creationId,
    access_token: token
  });

  const publishData = await fetchJson<{ id?: string }>(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishParams.toString()
  });

  return String(publishData.id ?? creationId);
}

// ---------------------------------------------------------------------------
// AI reply generation
// ---------------------------------------------------------------------------

const DEFAULT_PERSONA = `Kamu adalah orang biasa yang aktif di Threads, bukan bot.
Gaya bahasa: santai, natural, kayak orang Indonesia asli ngetik di sosmed.
Boleh pakai singkatan (gw, lo, yg, bgt, dll), emoji secukupnya (jangan lebay).
Jangan terlalu formal. Jangan keliatan jualan. Jangan pake hashtag.
Maksimal 2-3 kalimat. Langsung to the point.`;

async function generateNaturalReply(
  postText: string,
  keyword: string,
  settings: AppSettings,
  persona: string,
  sellAngle: string
): Promise<string> {
  const systemPrompt = `${persona || DEFAULT_PERSONA}

${
  sellAngle.trim()
    ? `Konteks produk/layanan yang bisa kamu selipkan secara natural jika relevan (jangan dipaksain):
${sellAngle}`
    : ""
}`;

  const userPrompt = `Ada orang posting di Threads tentang "${keyword}":

"${postText.slice(0, 500)}"

Buat reply yang natural, kayak orang biasa yang relate sama topik ini. Jangan keliatan bot atau jualan. Kalau ada kesempatan natural untuk nyebut produk/layanan, selipkan dengan halus — kalau nggak relevan, skip aja.`;

  const response = await postChatCompletion({
    apiUrl: settings.aiApiUrl,
    apiKey: settings.aiApiKey,
    model: settings.aiModel || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.85,
    maxTokens: 200,
    timeoutMs: 30000
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!reply) throw new Error("AI tidak menghasilkan reply.");
  return reply;
}

// ---------------------------------------------------------------------------
// Dedup tracking via DB — stored in threadsScoutRepliedIds column
// ---------------------------------------------------------------------------

async function getRepliedIds(businessId: string): Promise<Set<string>> {
  try {
    const row = await prisma.appConfig.findUnique({ where: { businessId } });
    if (!row) return new Set();
    const raw = row.threadsScoutRepliedIds ?? "";
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      return new Set(Array.isArray(parsed) ? parsed : []);
    }
  } catch {
    // ignore
  }
  return new Set();
}

async function markReplied(businessId: string, postId: string, currentSet: Set<string>): Promise<void> {
  currentSet.add(postId);
  // Keep only last 2000 IDs to avoid unbounded growth
  const arr = Array.from(currentSet).slice(-2000);
  try {
    await prisma.appConfig.update({
      where: { businessId },
      data: { threadsScoutRepliedIds: JSON.stringify(arr) }
    });
  } catch {
    // Silently skip if column doesn't exist yet (pre-migration)
  }
}

// ---------------------------------------------------------------------------
// Main scout runner
// ---------------------------------------------------------------------------

export type ScoutOptions = {
  /** Keyword to search for */
  keyword: string;
  /** Max posts to fetch per run (default 20) */
  limit?: number;
  /** Max replies to post per run (default 5, to avoid spam) */
  maxReplies?: number;
  /** Dry run — generate replies but don't post */
  dryRun?: boolean;
  /** AI persona override */
  persona?: string;
  /** Sell angle / product context */
  sellAngle?: string;
  /** Min post length to consider (skip very short posts) */
  minPostLength?: number;
};

export async function runThreadsScout(
  businessId: string,
  options: ScoutOptions
): Promise<ScoutRunResult> {
  const settings = await readSettings(businessId);
  const {
    keyword,
    limit = 20,
    maxReplies = 5,
    dryRun = false,
    persona = settings.threadsScoutPersona ?? "",
    sellAngle = settings.threadsScoutSellAngle ?? "",
    minPostLength = 20
  } = options;

  const result: ScoutRunResult = {
    keyword,
    found: 0,
    replied: 0,
    skipped: 0,
    errors: 0,
    results: []
  };

  // 1. Search posts
  const posts = await searchThreadsPosts(keyword, settings, limit);
  result.found = posts.length;

  if (posts.length === 0) return result;

  // 2. Load already-replied IDs
  const repliedIds = await getRepliedIds(businessId);

  // 3. Process each post
  for (const post of posts) {
    if (result.replied >= maxReplies) break;

    // Skip if already replied
    if (repliedIds.has(post.id)) {
      result.skipped++;
      result.results.push({
        postId: post.id,
        username: post.username,
        postText: post.text,
        reply: "",
        skipped: true,
        skipReason: "already_replied"
      });
      continue;
    }

    // Skip very short posts
    if (post.text.trim().length < minPostLength) {
      result.skipped++;
      result.results.push({
        postId: post.id,
        username: post.username,
        postText: post.text,
        reply: "",
        skipped: true,
        skipReason: "too_short"
      });
      continue;
    }

    // Skip our own posts
    const ourUsername = settings.threadsUsername.trim().toLowerCase();
    if (ourUsername && post.username.toLowerCase() === ourUsername) {
      result.skipped++;
      result.results.push({
        postId: post.id,
        username: post.username,
        postText: post.text,
        reply: "",
        skipped: true,
        skipReason: "own_post"
      });
      continue;
    }

    try {
      // 4. Generate AI reply
      const reply = await generateNaturalReply(post.text, keyword, settings, persona, sellAngle);

      let replyId: string | undefined;

      if (!dryRun) {
        // 5. Post reply
        replyId = await replyToThreadsPost(post.id, reply, settings);
        // 6. Mark as replied
        await markReplied(businessId, post.id, repliedIds);
      }

      result.replied++;
      result.results.push({
        postId: post.id,
        username: post.username,
        postText: post.text,
        reply,
        replyId
      });

      // Small delay between replies to be respectful
      if (!dryRun && result.replied < maxReplies) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (error) {
      result.errors++;
      result.results.push({
        postId: post.id,
        username: post.username,
        postText: post.text,
        reply: "",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Multi-keyword runner (reads keywords from settings)
// ---------------------------------------------------------------------------

export async function runThreadsScoutAllKeywords(
  businessId: string,
  options?: Partial<Omit<ScoutOptions, "keyword">>
): Promise<ScoutRunResult[]> {
  const settings = await readSettings(businessId);

  if (!settings.threadsScoutEnabled) {
    return [];
  }

  const rawKeywords = settings.threadsScoutKeywords ?? "";
  const keywords = rawKeywords
    .split("\n")
    .map((k) => k.trim())
    .filter(Boolean);

  if (keywords.length === 0) return [];

  const results: ScoutRunResult[] = [];

  for (const keyword of keywords) {
    try {
      const result = await runThreadsScout(businessId, {
        keyword,
        limit: Number(settings.threadsScoutLimitPerKeyword) || 20,
        maxReplies: Number(settings.threadsScoutMaxRepliesPerRun) || 5,
        persona: settings.threadsScoutPersona ?? "",
        sellAngle: settings.threadsScoutSellAngle ?? "",
        ...options
      });
      results.push(result);
    } catch (error) {
      results.push({
        keyword,
        found: 0,
        replied: 0,
        skipped: 0,
        errors: 1,
        results: [
          {
            postId: "",
            username: "",
            postText: "",
            reply: "",
            error: error instanceof Error ? error.message : "Unknown error"
          }
        ]
      });
    }

    // Delay between keywords
    await new Promise((r) => setTimeout(r, 1500));
  }

  return results;
}
