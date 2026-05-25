import "dotenv/config";
import { hash } from "bcryptjs";
import { Client } from "pg";
import { randomUUID } from "node:crypto";

// Per-business prompts. Each business has its own brand voice so leave Citra's
// hospitality-specific prompt untouched on Citra.
const pilotGymPrompt = `Kamu adalah AI WhatsApp untuk Pilot Gym.

Tugas kamu:
- Menjawab tanya seputar paket member, kelas, jam operasional, dan trial.
- Membantu calon member booking trial atau konsultasi dengan coach.
- Reminder dan follow-up ringan ke member yang sudah lama tidak hadir.

Style:
- Energik, ramah, motivasional tapi tidak pushy.
- Singkat, padat, gunakan bullet pendek bila perlu.
- Bahasa Indonesia santai dan profesional, boleh sedikit emoji 💪.

Jika tidak tahu detail teknis (jadwal coach spesifik, harga promo terbaru):
-> arahkan ke admin / front desk.

Jika ditanya harga:
-> jelaskan paket umum dan ajak datang trial.`;

const klikPijatPrompt = `Kamu adalah AI WhatsApp untuk Klik Pijat.

Tugas kamu:
- Menerima inquiry layanan pijat panggilan: jenis, durasi, area, jam.
- Menjelaskan paket yang tersedia dan estimasi waktu terapis sampai.
- Membantu booking dan konfirmasi alamat customer dengan jelas.

Style:
- Sopan, hangat, dan profesional. Tetap to the point.
- Konfirmasi detail booking sebelum eskalasi ke admin.
- Bahasa Indonesia santai profesional, hindari humor yang ambigu.

Jika tidak tahu (terapis tersedia, ETA pasti):
-> minta nomor & area, lalu arahkan ke admin untuk follow-up.

Jika ditanya harga:
-> kirim daftar paket, lalu ajak booking dengan menyebut area dan jam.`;

const pilotGymTopicQuery =
  "tren gym indonesia 2026 personal trainer member retention transformasi tubuh kelas grup fitness coaching wellness";

const klikPijatTopicQuery =
  "tren pijat panggilan indonesia 2026 layanan terapis on-demand wellness home spa relaxation booking online";

// Light per-brand SEO keyword starters. Admin bisa edit dari halaman Settings.
const pilotGymSeoKeywords = [
  '"pilot gym"',
  '"gym terdekat"',
  '"gym murah"',
  '"paket member gym"',
  '"personal trainer"',
  '"jasa personal trainer"',
  '"gym 24 jam"',
  '"kelas yoga gym"',
  '"kelas pilates"',
  '"transformasi tubuh"',
  '"diet program"',
  '"fitness coaching"'
].join("\n");

const klikPijatSeoKeywords = [
  '"klik pijat"',
  '"pijat panggilan"',
  '"pijat di rumah"',
  '"pijat panggilan terdekat"',
  '"pijat refleksi"',
  '"pijat tradisional"',
  '"pijat tradisional panggilan"',
  '"jasa pijat panggilan"',
  '"home spa"',
  '"terapis pijat"',
  '"booking pijat online"',
  '"pijat 24 jam"'
].join("\n");

const businesses = [
  {
    slug: "pilot-gym",
    name: "Pilot Gym",
    niche: "Gym, fitness coaching, member retention, dan komunitas latihan",
    brandSummary:
      "Pilot Gym adalah gym lokal yang membantu member mencapai goal kebugaran lewat program latihan terstruktur, coaching, dan komunitas yang suportif.",
    audience:
      "Owner gym, manajer membership, dan calon member yang ingin program latihan jelas, follow-up rutin, dan support coach yang responsif.",
    promptSystem: pilotGymPrompt,
    topicScoutDefaultQuery: pilotGymTopicQuery,
    seoKeywordList: pilotGymSeoKeywords,
    admin: { email: "admin@pilotgym.local", password: "Admin12345!" }
  },
  {
    slug: "klik-pijat",
    name: "Klik Pijat",
    niche: "Layanan pijat panggilan on-demand, terapis profesional, dan booking cepat lewat WhatsApp",
    brandSummary:
      "Klik Pijat menyediakan layanan pijat panggilan on-demand dengan terapis profesional, booking cepat lewat WhatsApp, dan jadwal fleksibel sesuai kebutuhan customer.",
    audience:
      "Customer kota besar yang ingin pijat di rumah/kantor tanpa repot, plus owner spa/terapis freelance yang ingin manajemen booking dan follow-up otomatis.",
    promptSystem: klikPijatPrompt,
    topicScoutDefaultQuery: klikPijatTopicQuery,
    seoKeywordList: klikPijatSeoKeywords,
    admin: { email: "admin@klikpijat.local", password: "Admin12345!" }
  }
];

// Fields to copy from Citra's AppConfig as "shared infrastructure" defaults
// for every new business. These are values that don't break tenant isolation
// because they describe shared services (AI provider, Mongo cluster, R2 bucket,
// embedding model, BytePlus image gen, Topic Scout search, Meta App OAuth,
// LinkedIn OAuth client, scheduler secret).
const SHARED_FIELDS = [
  "aiApiUrl",
  "aiApiKey",
  "aiModel",
  "waApiUrl", // same WA Blast deployment, sessionId differs per tenant
  "mongodbUri",
  "mongodbDb",
  "ragCollection",
  "ragIndexName",
  "embeddingProvider",
  "embeddingApiKey",
  "embeddingModel",
  "embeddingDimensions",
  "embeddingBaseUrl",
  "bytePlusApiKey",
  "bytePlusBaseUrl",
  "bytePlusImageModel",
  "r2AccessKey",
  "r2SecretKey",
  "r2Bucket",
  "r2Endpoint",
  "r2PublicUrl",
  "topicScoutSearchApiKey",
  "topicScoutSearchUrl",
  "topicScoutModelApiKey",
  "topicScoutModelBaseUrl",
  "topicScoutModel",
  "metaAppId",
  "metaAppSecret",
  "metaGraphVersion",
  "linkedinClientId",
  "linkedinClientSecret",
  "linkedinRedirectUri",
  "linkedinApiVersion",
  "threadsApiVersion",
  "threadsApiBaseUrl",
  "schedulerSecret"
];

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  // Pull Citra's shared infra values once. If Citra's AppConfig is missing
  // we fall back to empty strings so the new business AppConfigs still get
  // valid (NOT NULL) inserts.
  const citra = await client.query(
    `select c.*
     from "AppConfig" c
     join "Business" b on b.id = c."businessId"
     where b."isDefault" = true
     limit 1`
  );

  const sharedDefaults = {};
  if (citra.rows.length > 0) {
    for (const f of SHARED_FIELDS) {
      sharedDefaults[f] = citra.rows[0][f] ?? "";
    }
    console.log(`Loaded ${SHARED_FIELDS.length} shared fields from Citra Digital Hotel.`);
  } else {
    for (const f of SHARED_FIELDS) sharedDefaults[f] = "";
    console.warn("Citra AppConfig not found. Falling back to empty defaults.");
  }

  for (const b of businesses) {
    const existing = await client.query('select id from "Business" where "slug" = $1', [b.slug]);
    let businessId;

    if (existing.rows.length > 0) {
      businessId = existing.rows[0].id;
      console.log(`Business "${b.name}" already exists (id=${businessId}). Updating profile fields.`);
      await client.query(
        `update "Business"
         set "name" = $2, "niche" = $3, "brandSummary" = $4, "audience" = $5, "updatedAt" = NOW()
         where "id" = $1`,
        [businessId, b.name, b.niche, b.brandSummary, b.audience]
      );
    } else {
      businessId = randomUUID();
      await client.query(
        `insert into "Business" ("id", "slug", "name", "niche", "brandSummary", "audience", "isDefault", "createdAt", "updatedAt")
         values ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())`,
        [businessId, b.slug, b.name, b.niche, b.brandSummary, b.audience]
      );
      console.log(`Created Business "${b.name}" (id=${businessId})`);
    }

    const appCfg = await client.query('select id from "AppConfig" where "businessId" = $1', [businessId]);

    if (appCfg.rows.length === 0) {
      // Build INSERT dynamically from shared defaults + per-business overrides.
      const cols = [
        "businessId",
        "aiAutoReplyEnabled",
        "creatorGenerationEnabled",
        "promptSystem",
        // Per-business credentials always start empty so cron + webhook router
        // do not accidentally route to the wrong WA / Meta / LinkedIn account.
        "waSessionId",
        "waToken",
        "waMasterKey",
        "metaFacebookPageId",
        "metaFacebookPageName",
        "metaInstagramBusinessId",
        "metaInstagramUsername",
        "metaPageAccessToken",
        "metaPageTokenExpiresAt",
        "threadsUserId",
        "threadsUsername",
        "threadsAccessToken",
        "threadsTokenExpiresAt",
        "linkedinAccessToken",
        "linkedinRefreshToken",
        "linkedinTokenExpiresAt",
        "linkedinAuthorUrn",
        "linkedinOrganizationUrn",
        "autoPostEnabled",
        "seoKeywordEnabled",
        "topicScoutDefaultQuery",
        "seoKeywordList",
        ...SHARED_FIELDS,
        "createdAt",
        "updatedAt"
      ];

      const values = [
        businessId,
        true, // aiAutoReplyEnabled
        true, // creatorGenerationEnabled
        b.promptSystem,
        "", "", "",                         // waSessionId, waToken, waMasterKey
        "", "", "", "", "", "",             // meta page id/name/ig id/ig username/page token/exp
        "", "", "", "",                     // threads user/username/token/exp
        "", "", "", "", "",                 // linkedin access/refresh/exp/author/org
        false, // autoPostEnabled
        true,  // seoKeywordEnabled
        b.topicScoutDefaultQuery,
        b.seoKeywordList,
        ...SHARED_FIELDS.map((f) => sharedDefaults[f] ?? ""),
        new Date(),
        new Date()
      ];

      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const colIdent = cols.map((c) => `"${c}"`).join(", ");
      await client.query(`insert into "AppConfig" (${colIdent}) values (${placeholders})`, values);
      console.log(`  -> AppConfig created with shared infra + brand prompt + brand topic/SEO`);
    } else {
      console.log(`  -> AppConfig already exists, leaving as-is`);
    }

    const email = b.admin.email.toLowerCase();
    const passwordHash = await hash(b.admin.password, 12);
    const existingAdmin = await client.query('select id, "businessId" from "AdminUser" where email = $1', [email]);

    if (existingAdmin.rows.length > 0) {
      const admin = existingAdmin.rows[0];
      if (admin.businessId !== businessId) {
        console.warn(
          `  ! Admin ${email} exists but belongs to a different business (${admin.businessId}). Skipping reassignment for safety.`
        );
      } else {
        await client.query(
          'update "AdminUser" set "passwordHash" = $1, "updatedAt" = NOW() where "id" = $2',
          [passwordHash, admin.id]
        );
        console.log(`  -> Admin ${email} password refreshed`);
      }
    } else {
      await client.query(
        `insert into "AdminUser" ("id", "businessId", "email", "passwordHash", "createdAt", "updatedAt")
         values ($1, $2, $3, $4, NOW(), NOW())`,
        [randomUUID(), businessId, email, passwordHash]
      );
      console.log(`  -> Admin ${email} created (password: ${b.admin.password})`);
    }
  }

  console.log("\nSeed complete. Login credentials:");
  for (const b of businesses) {
    console.log(`  ${b.name}: ${b.admin.email} / ${b.admin.password}`);
  }
} finally {
  await client.end();
}
