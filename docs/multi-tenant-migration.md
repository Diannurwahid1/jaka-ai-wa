# Migrasi Multi-Tenant (Multi-Business)

Aplikasi sekarang sudah scoped per-business. Setiap business punya data sendiri:
settings, kredensial WA, kredensial social media, knowledge base, draft creator,
profil creator, message log, memory chat, dan webhook event.

## Model

- **Business**: tabel root, satu baris per bisnis. Punya `id`, `slug`, `name`, dan
  metadata profil (`niche`, `brandSummary`, `audience`).
- **AdminUser**: punya `businessId`. Satu user di-scope ke satu business.
- **AppConfig**: 1-1 ke `Business` lewat `businessId` (unique). Kolom dan
  default tidak berubah; `id` numeric tinggal autoincrement.
- **MessageLog, MemorySession, MemoryMessage, WebhookEvent**: semua punya
  `businessId` dan composite index per-business.

## Kompatibilitas data lama (default seed)

Migration `20260523120000_multi_tenant_business`:

1. Membuat tabel `Business`.
2. Menyisipkan default business `Citra Digital Hotel` (slug
   `citra-digital-hotel`, `isDefault = true`) jika belum ada.
3. Menambah kolom `businessId` di setiap tabel existing dan mengisi semua baris
   lama dengan default business itu.
4. Menambah unique constraint `AppConfig.businessId` dan FK ke `Business` untuk
   semua tabel anak.

Semua admin existing otomatis ter-link ke `Citra Digital Hotel`. Setelah
migration berjalan, login akan tetap mengembalikan akses ke data lama.

## Memilih business untuk session login

Saat login berhasil, JWT session sekarang menyimpan `sub`, `email`, dan
`businessId` (dari kolom `AdminUser.businessId`). Setiap API route memanggil
`requireSession()` untuk memastikan session valid dan mengambil `businessId`
sebelum operasi data.

Token lama yang tidak punya `businessId` ditolak oleh `middleware.ts`, sehingga
user akan diarahkan kembali ke `/login` untuk dapat token baru. Ini hanya
memengaruhi user yang sudah login sebelum migration.

## Webhook WhatsApp

URL webhook tidak berubah (`/api/webhook/wa`). Routing per-business dilakukan
secara internal:

1. Cek `?sessionId=...` di query string.
2. Kalau tidak ada, parse body JSON dan ambil `sessionId` / `session_id` /
   `session.id`.
3. Cocokkan ke `AppConfig.waSessionId` untuk menemukan business.
4. Kalau tidak match, fallback ke business default.

Karena `AppConfig.waSessionId` sudah punya index, lookup ini cepat dan tidak
mengubah kontrak provider WA.

## Cron `/api/cron/creator-generate` & `/api/cron/creator-publish`

Endpoint cron akan iterate setiap business yang terdaftar. Permintaan cron
dianggap valid kalau header `x-scheduler-secret` (atau Authorization Bearer)
match dengan `AppConfig.schedulerSecret` salah satu business. Setiap business
diproses dengan context-nya sendiri sehingga AI, R2, MongoDB, dan kredensial
social media yang dipakai murni milik business tersebut.

## Multi-business operasional

- Saat ini setiap user di-scope 1:1 ke satu business (sesuai keputusan: 1 user
  = 1 business, tidak ada switcher).
- Untuk menambah business baru, insert row di tabel `Business` lalu buat
  `AdminUser` baru dengan `businessId` business itu. Setelah login pertama,
  `AppConfig` akan otomatis dibuat dengan default values dan dapat diatur dari
  halaman Settings.
- Endpoint baru: `GET/POST /api/business` untuk membaca dan memperbarui profil
  business yang sedang login (name, slug, niche, brand summary, audience).

## File yang berubah

Schema & migration:

- `prisma/schema.prisma` (semua tabel + relasi `Business`).
- `prisma/migrations/20260523120000_multi_tenant_business/migration.sql`.

Lib (semua tenant-aware):

- `lib/auth.ts`, `lib/auth-shared.ts` (session JWT carry `businessId`).
- `lib/business.ts` (helper baru).
- `lib/business-context.ts` (AsyncLocalStorage).
- `lib/settings.ts`, `lib/store.ts`, `lib/memory.ts`, `lib/webhook-debug.ts`.
- `lib/ai.ts`, `lib/wa.ts`, `lib/rag.ts`, `lib/jaka.ts`, `lib/r2.ts`,
  `lib/mongodb.ts`.
- `lib/social.ts`, `lib/creator.ts`, `lib/creator-jobs.ts`.

API routes: hampir semua di bawah `app/api/**` di-update untuk meneruskan
`session.businessId`. Webhook & cron mendapat resolver business sendiri.

Middleware:

- `middleware.ts` menolak token tanpa `businessId`.

UI:

- `components/sidebar.tsx` menampilkan nama business pada sidebar.
- Endpoint `app/api/business/route.ts` untuk profile management.

## Cara apply migration

```bash
npx prisma migrate deploy
```

Akan otomatis:

1. Buat tabel `Business`.
2. Seed `Citra Digital Hotel` sebagai default.
3. Backfill semua tabel existing dengan businessId default.
4. Tambahkan FK + index per-business.

Kalau Anda jalankan di production, pastikan `DATABASE_URL` di env terisi.
