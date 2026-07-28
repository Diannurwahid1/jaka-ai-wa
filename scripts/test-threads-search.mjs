import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const cfg = await prisma.appConfig.findFirst();
  if (!cfg) { console.error("No AppConfig found"); process.exit(1); }

  const token = cfg.threadsAccessToken;
  const base = (cfg.threadsApiBaseUrl || "https://graph.threads.net").replace(/\/$/, "");
  const version = cfg.threadsApiVersion || "v1.0";

  if (!token) { console.error("threadsAccessToken kosong di DB"); process.exit(1); }

  const keyword = process.argv[2] || "hotel";
  const url = `${base}/${version}/keyword_search?q=${encodeURIComponent(keyword)}&search_type=RECENT&media_type=TEXT&fields=id,text,username,is_reply,timestamp&limit=10&access_token=${token}`;

  console.log("Testing URL:", url.replace(token, "[TOKEN]"));
  console.log("Threads User ID:", cfg.threadsUserId);
  console.log("Keyword:", keyword);
  console.log("");

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  console.log("HTTP Status:", res.status);
  console.log("Response:", text.slice(0, 1000));

  if (res.ok) {
    const data = JSON.parse(text);
    const posts = data.data ?? [];
    console.log(`\nTotal posts returned: ${posts.length}`);
    posts.forEach((p, i) => {
      console.log(`\n[${i+1}] @${p.username} | is_reply=${p.is_reply}`);
      console.log(`    ${String(p.text ?? "").slice(0, 100)}`);
    });
  }
} finally {
  await prisma.$disconnect();
}
