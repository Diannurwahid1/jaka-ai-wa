import "dotenv/config";
import { Client } from "pg";

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

function preview(value) {
  if (value == null) return "(null)";
  const s = String(value);
  if (s.length === 0) return "(empty)";
  if (s.length <= 28) return s;
  return s.slice(0, 24) + "...";
}

try {
  const rows = await client.query(`
    select b.slug, b.name,
           c."aiApiUrl", c."aiModel",
           c."mongodbUri", c."mongodbDb", c."ragCollection",
           c."r2Bucket", c."r2PublicUrl",
           c."bytePlusImageModel",
           c."metaAppId",
           c."waSessionId", c."waToken",
           c."metaPageAccessToken",
           c."linkedinAccessToken",
           c."schedulerSecret",
           c."topicScoutDefaultQuery",
           length(c."seoKeywordList") as seo_keyword_chars,
           length(c."promptSystem")  as prompt_chars
    from "Business" b
    join "AppConfig" c on c."businessId" = b.id
    order by b."isDefault" desc, b."createdAt"
  `);

  for (const r of rows.rows) {
    console.log(`\n[${r.name}] (${r.slug})`);
    console.log("  shared infra:");
    console.log("    aiApiUrl=" + preview(r.aiApiUrl));
    console.log("    aiModel=" + preview(r.aiModel));
    console.log("    mongodbUri=" + preview(r.mongodbUri));
    console.log("    mongodbDb=" + preview(r.mongodbDb) + "  ragCollection=" + preview(r.ragCollection));
    console.log("    r2Bucket=" + preview(r.r2Bucket) + "  r2PublicUrl=" + preview(r.r2PublicUrl));
    console.log("    bytePlusImageModel=" + preview(r.bytePlusImageModel));
    console.log("    metaAppId=" + preview(r.metaAppId));
    console.log("    schedulerSecret=" + preview(r.schedulerSecret));
    console.log("  per-business credentials:");
    console.log("    waSessionId=" + preview(r.waSessionId) + "  waToken=" + preview(r.waToken));
    console.log("    metaPageAccessToken=" + preview(r.metaPageAccessToken));
    console.log("    linkedinAccessToken=" + preview(r.linkedinAccessToken));
    console.log("  brand:");
    console.log("    promptSystem chars=" + r.prompt_chars);
    console.log("    topicScoutDefaultQuery=" + preview(r.topicScoutDefaultQuery));
    console.log("    seoKeywordList chars=" + r.seo_keyword_chars);
  }
} finally {
  await client.end();
}
