# Zyho Commerce x Jaka Creator: Threads Integration Plan

## 1. Outcome

Zyho's Threads account publishes one grounded single post per day by default. Content rotates between:

- Promo: active discounts, flash sales, public vouchers, restocks, and featured products.
- Informative: product availability, plan differences, included benefits, and buying guidance.
- Educational: practical AI tool workflows linked to products currently sold by Zyho.

Every factual claim must come from a recent Zyho Commerce snapshot. Price, stock, voucher, promo, and URL claims are revalidated immediately before publishing.

Thread series remains available as an optional mode, but it is not the default for Zyho.

## 2. Current-State Findings

### Jaka Creator (`D:\wa-ai`)

- `CreatorDraftType` already supports `single_post` and `thread_series`.
- Playground and manual generation already accept an optional draft `type`.
- Threads platform metadata currently hardcodes `thread_series` as the default.
- Creator profiles do not persist a preferred draft type.
- Threads publishing loops through all draft parts and applies `reply_to_id` after the first post.
- Topic generation primarily uses web scout and creator knowledge; there is no live commerce source.
- Drafts store generated copy but do not store the factual source snapshot used to create it.

### Zyho Commerce (`D:\citracommerce`)

- Payload CMS/Postgres is the source of truth.
- Products include publication status, title, description, slug, IDR/USD price, inventory, variants, sold count, badge, featured status, flash-sale percentage, and flash-sale end time.
- Available stock is `inventory - active pending reservations`, not raw inventory.
- Vouchers include status, validity window, limits, audience tiers, product scope, minimum spend, and usage.
- Promo banners include publication status, priority, validity window, image, and link.
- Digital stock units contain credentials and delivery secrets. These must never be sent to Jaka Creator or an AI model.

## 3. Target Architecture

```text
Zyho Commerce (source of truth)
  |
  | GET /api/integrations/creator/catalog-snapshot
  | authenticated, sanitized, cacheable
  v
Commerce Snapshot Client (wa-ai)
  |
  +--> snapshot cache + health/staleness state
  |
  v
Fact Candidate Builder
  |
  +--> products
  +--> active promos
  +--> publishable vouchers
  +--> restock / low-stock signals
  v
Daily Content Planner
  |
  +--> content mix and deduplication
  +--> select one grounded topic
  v
AI Draft Generator
  |
  +--> single post by default
  +--> returns factRefs and claims
  v
Deterministic Claim Validator
  |
  v
Approval / Schedule
  |
  v
Pre-publish Revalidation
  |
  +--> unchanged: publish
  +--> changed: regenerate or hold
  v
Threads API
```

The services communicate through a narrow HTTP contract. `wa-ai` must not connect directly to the commerce database.

## 4. Threads Single-Post Setting

Add `defaultDraftType` to each Creator profile:

```ts
type CreatorDraftType = "single_post" | "thread_series";
```

Recommended Zyho defaults:

```json
{
  "platform": "threads",
  "defaultDraftType": "single_post",
  "postsPerDay": 1
}
```

Required behavior:

- Creator profile UI shows `Single post` and `Thread series`.
- Scheduled generation uses `profile.defaultDraftType`.
- Manual/playground generation may override the profile for one run.
- A `single_post` draft produces one final caption and one publish container.
- A `thread_series` draft produces multiple parts and nested self-replies.
- Publisher branches on `draft.type`; `reply_to_id` is never sent for `single_post`.
- OAuth requests reply-management permission only when thread-series/reply features are enabled.

Migration behavior:

- Existing non-Threads profiles default to `single_post`.
- Existing Threads profiles retain `thread_series` to avoid changing other tenants silently.
- Zyho's Threads profile is explicitly seeded/updated to `single_post`.

## 5. Commerce Snapshot API

Add a dedicated route in Zyho Commerce:

```text
GET /api/integrations/creator/catalog-snapshot
Authorization: Bearer <integration-secret>
If-None-Match: <previous-etag>
```

The route uses Payload Local API server-side and returns only explicitly selected safe fields.

### Response contract

```json
{
  "schemaVersion": "1",
  "generatedAt": "2026-07-29T01:00:00.000Z",
  "timezone": "Asia/Jakarta",
  "store": {
    "name": "Zyho Store",
    "baseUrl": "https://zyho.store"
  },
  "products": [
    {
      "id": "7",
      "slug": "chatgpt-plus",
      "title": "ChatGPT Plus",
      "shortDescription": "Ringkasan storefront",
      "url": "https://zyho.store/chatgpt-plus",
      "categories": ["AI Assistant"],
      "price": {
        "IDR": 149000,
        "USD": null
      },
      "availability": {
        "status": "in_stock",
        "available": 12,
        "label": "Tersedia"
      },
      "badge": "best_seller",
      "isFeatured": true,
      "soldCount": 120,
      "flashSale": {
        "active": true,
        "discountPercent": 20,
        "endsAt": "2026-07-31T16:59:59.000Z"
      },
      "imageUrl": "https://zyho.store/api/media/file/example.webp",
      "updatedAt": "2026-07-29T00:30:00.000Z"
    }
  ],
  "vouchers": [
    {
      "id": "21",
      "title": "Promo Akhir Bulan",
      "description": "Syarat singkat",
      "benefitSummary": "Diskon 10%",
      "code": "ZYHO10",
      "discountType": "percentage",
      "amount": 10,
      "minimumSpend": 100000,
      "appliesTo": "all",
      "productIds": [],
      "allowedTiers": [],
      "remainingUses": 40,
      "startsAt": "2026-07-29T00:00:00.000Z",
      "expiresAt": "2026-07-31T16:59:59.000Z"
    }
  ],
  "promos": [
    {
      "id": "8",
      "title": "AI Tools Week",
      "link": "https://zyho.store/promo",
      "imageUrl": "https://zyho.store/api/media/file/promo.webp",
      "startsAt": "2026-07-29T00:00:00.000Z",
      "endsAt": "2026-08-02T16:59:59.000Z",
      "priority": 10
    }
  ]
}
```

### Snapshot rules

- Products: only `_status=published` and not deleted.
- Stock: use the existing `getAvailableStock()` result, including active reservations.
- Variants: expose a summarized range and availability, never internal delivery data.
- Flash sale: active only if enabled and end time is still in the future.
- Vouchers: active status, within date window, remaining global usage, and explicitly approved for public promotion.
- Assigned-user vouchers are always excluded.
- Promo banners: only published and inside their active date window.
- Use `select`, low relationship depth, bounded limits, and parallel queries.
- Return `ETag` derived from the normalized response and support `304 Not Modified`.

## 6. Commerce Schema Guardrails

Do not let the AI infer whether a voucher or product should be advertised. Add explicit editorial controls.

Recommended fields:

### Products

```text
creatorPromotion.enabled
creatorPromotion.priority
creatorPromotion.allowedAngles[]
creatorPromotion.claimNotes
creatorPromotion.ctaLabel
```

### Coupons

```text
publicPromotion.enabled
publicPromotion.showCode
publicPromotion.marketingNotes
```

Default all existing vouchers to `publicPromotion.enabled=false`. This prevents private, member-only, signup, or manually assigned vouchers from leaking into public posts.

## 7. Tenant Integration Settings

Add tenant-scoped settings in `wa-ai`:

```text
commerceIntegrationEnabled
commerceBaseUrl
commerceSnapshotPath
commerceIntegrationSecret
commerceSnapshotMaxAgeMinutes
commercePrePublishRevalidation
commerceStaleDataBehavior
```

Recommended production values:

```text
commerceIntegrationEnabled=true
commerceBaseUrl=https://zyho.store
commerceSnapshotPath=/api/integrations/creator/catalog-snapshot
commerceSnapshotMaxAgeMinutes=30
commercePrePublishRevalidation=true
commerceStaleDataBehavior=hold
```

Secrets stay masked in the UI and encrypted at rest if the current settings storage supports it. They must never be included in logs, prompts, Mongo documents, or API responses to the browser.

## 8. Grounded Content Pipeline

### Step A: Fetch and normalize

- Fetch snapshot at generation time.
- Validate `schemaVersion`, timestamps, URLs, prices, stock, and promo windows.
- Cache by tenant and ETag for 5-15 minutes.
- Reject snapshots older than the configured maximum age.

### Step B: Build fact candidates

Create deterministic candidates before calling AI:

```text
product_education
product_comparison
active_flash_sale
public_voucher
restock
low_stock
featured_product
use_case_education
```

Every candidate contains:

```text
factId
kind
productIds
allowedClaims
forbiddenClaims
validUntil
ctaUrl
priority
```

### Step C: Daily planning

Use a configurable seven-day mix rather than random topic choice:

```text
Promo: 3 posts/week
Educational: 2 posts/week
Informative: 2 posts/week
```

Ranking considers:

- Active promo urgency.
- Stock availability.
- Product promotion priority.
- Content type balance.
- Product and topic recency.
- Previous post history and duplicate claim avoidance.

Never promote an out-of-stock item unless the selected angle is explicitly a waitlist or restock notice.

### Step D: Generate with grounded facts

The AI receives only:

- Brand/profile instructions.
- One selected candidate.
- Its `allowedClaims`.
- Safe product/voucher/promo fields.
- Required CTA URL.

The response must include:

```json
{
  "type": "single_post",
  "topic": "string",
  "caption": "string",
  "factRefs": ["product:7", "voucher:21"],
  "claims": [
    {
      "field": "product:7.price.IDR",
      "value": 149000
    }
  ],
  "validUntil": "2026-07-31T16:59:59.000Z"
}
```

### Step E: Deterministic validation

Before saving a draft:

- Every `factRef` must exist in the snapshot.
- Numeric price, discount, stock, and sold-count claims must exactly match source data.
- Voucher code must be marked `showCode=true`.
- CTA host must match `zyho.store`.
- Expired promos and vouchers fail validation.
- Unsupported superlatives such as "termurah", "pasti", or invented guarantees fail unless present in approved claim notes.

AI is used for writing, not for deciding factual truth.

## 9. Draft Provenance and Revalidation

Extend Creator drafts with:

```text
contentSource: "commerce" | "web_scout" | "manual"
commerceSnapshotVersion
commerceSnapshotGeneratedAt
commerceFactRefs[]
commerceClaims[]
contentValidUntil
```

At publish time:

1. Fetch the latest snapshot.
2. Resolve all saved fact references.
3. Compare saved claims with current values.
4. Confirm `contentValidUntil` has not passed.
5. Publish only if all claims remain valid.

If values changed:

- Price, discount, voucher status, or stock changed: set draft to `needs_refresh` or `failed_validation`, regenerate, and require approval again.
- Commerce endpoint unavailable: hold the post; never publish stale commercial claims.
- Educational copy with no volatile claims may publish if its referenced products still exist and remain published.

## 10. Scheduling and Failure Policy

Recommended Zyho schedule:

```text
Draft generation: 07:30 Asia/Jakarta
Approval window: until 11:30
Publish: 12:15
Fallback publish slot: 19:15
Frequency: 1 post/day
```

Operational rules:

- Do not create another daily draft if an equivalent `generationSlotKey` exists.
- Do not reuse the same primary product within a configurable cooldown, for example three days.
- Retry commerce fetch with short exponential backoff.
- Do not retry factual validation failures; refresh the draft instead.
- Keep Threads publish retries separate from commerce snapshot retries.

## 11. Security

- Use a dedicated integration secret, not Payload admin credentials.
- Prefer HTTPS. If both apps run on one VPS, an internal/private URL may be used behind the reverse proxy.
- Compare secrets in constant time.
- Add timestamped HMAC requests later if the endpoint must be exposed broadly; a rotated bearer secret is sufficient for the first same-owner deployment over HTTPS.
- Apply rate limiting and log request metadata without secrets.
- Never expose:
  - Digital stock account email, username, password, content, reference code, or files.
  - Customer, order, cart, checkout, or reservation identity.
  - Assigned-user vouchers.
  - Internal cost, margin, admin notes, or unpublished products.
- Treat product descriptions and marketing notes as untrusted content in prompts and delimit them as data, not instructions.

## 12. Observability

Add structured events:

```text
commerce.snapshot.fetch
commerce.snapshot.not_modified
commerce.snapshot.stale
commerce.snapshot.invalid
creator.topic.selected
creator.claim.validation_failed
creator.prepublish.changed
creator.prepublish.passed
threads.single.publish
threads.series.publish
```

Creator overview should display:

- Commerce connection health.
- Last successful sync.
- Snapshot age.
- Fact source on each draft.
- Reason a draft was held or refreshed.
- Link to the referenced commerce product/promo.

## 13. Implementation Phases

### Phase 1: Threads single post

- Add `defaultDraftType` to profile type/document/UI.
- Branch prompt rules for single vs series.
- Branch publisher by draft type.
- Set Zyho to `single_post`, one post per day.
- Add unit tests for one-container single post and reply-chain series.

### Phase 2: Safe commerce snapshot

- Add explicit public-promotion fields to products/coupons.
- Add authenticated snapshot endpoint in `citracommerce`.
- Add response validation, ETag, field allowlist, and integration tests.
- Verify no secret digital-stock or customer fields appear.

### Phase 3: Commerce client and settings

- Add tenant-scoped commerce settings in `wa-ai`.
- Add connection test and snapshot health indicator.
- Add typed snapshot client, cache, timeout, retry, and stale-data policy.

### Phase 4: Grounded planning and generation

- Add fact candidate builder and weekly content mix.
- Add commerce-aware prompt.
- Store provenance, claims, and validity on drafts.
- Add deterministic claim validation and deduplication.

### Phase 5: Pre-publish safety

- Revalidate volatile facts before publish.
- Hold/regenerate changed drafts.
- Add audit logs and dashboard status.
- Test expiry, stock changes, price changes, deleted products, and endpoint outages.

### Phase 6: Production rollout

- Deploy commerce endpoint first.
- Test with non-publish dry runs against production data.
- Deploy `wa-ai` settings/client/generator changes.
- Enable Zyho with manual approval for at least seven days.
- Review claim accuracy, repetition, and conversion links.
- Enable automatic publishing only after the review period passes.

## 14. Acceptance Criteria

- Zyho can choose `Single post` in Creator profile Settings.
- A Zyho Threads draft publishes exactly one post and creates no reply.
- Thread series still works for tenants that use it.
- Daily topics are selected from current Zyho products, promos, stock, and public vouchers.
- Every commercial draft shows its source facts and snapshot time.
- A changed price, ended promo, exhausted voucher, unpublished product, or unavailable stock blocks stale publishing.
- No private voucher, customer data, order data, or digital-stock credential reaches `wa-ai`, MongoDB, logs, or AI prompts.
- Duplicate topic/product rules prevent repetitive daily output.
- Commerce outages hold commercial posts instead of falling back to invented or stale claims.

## 15. Recommended First Slice

Implement Phase 1 and Phase 2 together:

1. Make Zyho Threads `single_post` by profile setting.
2. Build the read-only sanitized commerce snapshot endpoint.
3. Add a connection test that displays real product/promo counts.

This creates a verifiable foundation before AI topic selection and automatic publishing are connected.
