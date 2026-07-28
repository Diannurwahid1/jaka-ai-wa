/**
 * Test Threads keyword_search API directly.
 * Usage: node scripts/test-threads-search2.mjs <keyword> <access_token> <user_id>
 * Or set THREADS_TOKEN and THREADS_USER_ID env vars.
 */

const keyword = process.argv[2] || "hotel";
const token = process.argv[3] || process.env.THREADS_TOKEN || "";
const userId = process.argv[4] || process.env.THREADS_USER_ID || "me";

if (!token) {
  console.error("Usage: node scripts/test-threads-search2.mjs <keyword> <access_token> [user_id]");
  process.exit(1);
}

const base = "https://graph.threads.net/v1.0";

// Test 1: keyword_search
console.log("=== TEST 1: /keyword_search ===");
const url1 = `${base}/keyword_search?q=${encodeURIComponent(keyword)}&search_type=RECENT&media_type=TEXT&fields=id,text,username,is_reply,timestamp&limit=10&access_token=${token}`;
console.log("URL:", url1.replace(token, "[TOKEN]"));

const r1 = await fetch(url1, { signal: AbortSignal.timeout(15000) });
const t1 = await r1.text();
console.log("Status:", r1.status);
console.log("Response:", t1.slice(0, 600));

// Test 2: user's own threads (to verify token works)
console.log("\n=== TEST 2: /{user-id}/threads (own posts) ===");
const url2 = `${base}/${userId}/threads?fields=id,text,username,is_reply&limit=5&access_token=${token}`;
console.log("URL:", url2.replace(token, "[TOKEN]"));

const r2 = await fetch(url2, { signal: AbortSignal.timeout(15000) });
const t2 = await r2.text();
console.log("Status:", r2.status);
console.log("Response:", t2.slice(0, 600));
