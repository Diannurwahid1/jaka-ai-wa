# Zyho Store Web Team Requirements

Dokumen ini adalah brief untuk tim web `zyho.store` (`D:\citracommerce`) agar data produk, stok, harga, voucher, dan promo bisa dipakai oleh Jaka Creator untuk membuat konten Threads harian yang faktual.

Target integrasi: Jaka Creator menarik snapshot commerce yang sudah disanitasi dari `zyho.store`, lalu membuat draft Threads untuk akun `@zyhoofficial`. Web commerce tetap menjadi source of truth. Jaka Creator tidak boleh akses database commerce langsung.

## 1. Outcome

- `zyho.store` menyediakan endpoint read-only untuk snapshot katalog/promo.
- Snapshot hanya berisi data publik yang aman dipakai untuk konten sosial media.
- Data yang volatile seperti harga, stok, voucher, dan promo bisa divalidasi ulang sebelum publish.
- Admin commerce punya kontrol eksplisit produk/voucher mana yang boleh dipromosikan AI.
- Tidak ada credential produk digital, data customer, order, cart, reservasi user, atau voucher privat yang keluar dari commerce.

## 2. Endpoint Yang Dibutuhkan

Buat route baru:

```text
GET /api/integrations/creator/catalog-snapshot
Authorization: Bearer <CREATOR_INTEGRATION_SECRET>
If-None-Match: <etag-opsional>
```

Response sukses:

```text
200 OK
Content-Type: application/json
ETag: "<hash-normalized-response>"
Cache-Control: private, max-age=60
```

Jika snapshot tidak berubah:

```text
304 Not Modified
ETag: "<hash-normalized-response>"
```

Jika token salah:

```text
401 Unauthorized
```

Implementasi memakai Payload Local API server-side, bukan public collection API mentah.

## 3. Env Yang Dibutuhkan

Tambahkan ke environment production dan `.env.example`:

```text
CREATOR_INTEGRATION_SECRET=<random-secret-min-32-char>
CREATOR_INTEGRATION_ALLOWED_ORIGIN=https://jakacs.arahdigital.id
NEXT_PUBLIC_STORE_URL=https://zyho.store
```

Catatan:

- `CREATOR_INTEGRATION_SECRET` jangan sama dengan Payload secret, admin password, Meta token, atau token payment gateway.
- Secret harus dibandingkan secara aman. Minimal jangan pernah dilog.
- Jika nanti endpoint dibuka lebih luas, bisa ditambah HMAC timestamp. Untuk tahap awal Bearer secret via HTTPS cukup.

## 4. Field Payload Yang Perlu Ditambah

### Products

Tambahkan group field di collection `products`:

```text
creatorPromotion.enabled: boolean, default false
creatorPromotion.priority: number, default 0
creatorPromotion.allowedAngles: select/multi-select
creatorPromotion.claimNotes: textarea
creatorPromotion.ctaLabel: text
```

Rekomendasi opsi `allowedAngles`:

```text
promo
education
comparison
use_case
restock
low_stock
featured
```

Aturan:

- Produk hanya masuk snapshot jika `_status=published`.
- Produk boleh dipilih sebagai topik utama hanya jika `creatorPromotion.enabled=true`.
- Produk tanpa `creatorPromotion.enabled` tetap boleh muncul sebagai referensi terbatas jika dibutuhkan untuk konteks, tapi default yang paling aman adalah exclude total dari snapshot.
- `claimNotes` hanya untuk klaim marketing yang sudah disetujui admin, misalnya "cocok untuk mahasiswa yang butuh riset cepat". Jangan isi klaim yang tidak bisa dipertanggungjawabkan.

### Coupons

Tambahkan group field di collection `coupons`:

```text
publicPromotion.enabled: boolean, default false
publicPromotion.showCode: boolean, default false
publicPromotion.marketingNotes: textarea
```

Aturan:

- Default semua coupon lama harus `publicPromotion.enabled=false`.
- Voucher signup, voucher user tertentu, member-only, assigned-user, atau voucher private tidak boleh masuk snapshot.
- Kode voucher hanya boleh dikirim jika `publicPromotion.showCode=true`.
- Jika `showCode=false`, snapshot boleh mengirim benefit summary tanpa `code`.

## 5. Response Contract

Endpoint mengembalikan bentuk JSON ini:

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
      "creatorPromotion": {
        "priority": 10,
        "allowedAngles": ["promo", "education"],
        "claimNotes": "Cocok untuk mahasiswa, developer, kreator, dan profesional.",
        "ctaLabel": "Cek produk"
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
      "expiresAt": "2026-07-31T16:59:59.000Z",
      "marketingNotes": "Untuk campaign publik akhir bulan."
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

## 6. Data Product Yang Perlu Dihitung

### Available Stock

Gunakan stok aktual yang sudah memperhitungkan reservasi aktif:

```text
available = inventory - active pending reservations
```

Pakai helper existing `getAvailableStock()` jika sudah tersedia.

Status:

```text
in_stock: available > 5
low_stock: available > 0 && available <= 5
out_of_stock: available <= 0
```

Untuk variant product, berikan ringkasan aman:

```json
{
  "variantsSummary": {
    "total": 3,
    "inStock": 2,
    "priceMinIDR": 99000,
    "priceMaxIDR": 199000
  }
}
```

Jangan kirim data per-unit digital stock.

### Flash Sale

Flash sale aktif hanya jika:

```text
flashSale enabled
discountPercent > 0
flashSaleEndDate > now
product published
available stock > 0
```

Jika sudah expired, `flashSale.active=false` atau jangan kirim object flash sale.

## 7. Data Yang Wajib Diblokir

Endpoint ini tidak boleh mengirim:

- Digital stock unit email, username, password, backup code, token, license key, file private, fulfillment note, atau credential lain.
- Order, cart, checkout, customer identity, address, phone, email customer, dan payment transaction.
- Reservation identity atau cart/session yang sedang hold stock.
- Internal cost, margin, supplier, admin notes, stock ledger cost, dan modal restock.
- Unpublished product, draft page, draft promo, atau archived/deleted item.
- Voucher assigned ke user tertentu.
- Voucher signup otomatis kecuali memang dibuat public campaign dan `publicPromotion.enabled=true`.

## 8. Query Rules

Products:

- Filter `_status=published`.
- Filter `creatorPromotion.enabled=true`.
- Limit awal 50 produk.
- `depth` rendah, cukup untuk media/category yang dibutuhkan.
- Gunakan `select` agar field sensitive tidak ikut terambil.
- Sort by `creatorPromotion.priority desc`, `featured desc`, active flash sale, `soldCount desc`, `updatedAt desc`.

Coupons:

- Filter active/status valid.
- Filter `publicPromotion.enabled=true`.
- Filter date window `startsAt <= now` dan `expiresAt > now`.
- Filter usage limit jika ada, pastikan masih ada sisa global usage.
- Exclude assigned user voucher.
- Limit awal 20 voucher.

Promo banners:

- Filter published/status active.
- Filter date window.
- Sort `priority desc`.
- Limit awal 10 promo.

## 9. Security & Logging

- Log hanya status request, duration, count products/vouchers/promos, dan error code.
- Jangan log Authorization header atau isi secret.
- Jangan log full response jika ada kemungkinan mengandung data sensitif.
- Tambahkan rate limit sederhana, misalnya 60 request per menit per IP untuk endpoint integrasi.
- Endpoint harus HTTPS di production.

Contoh log aman:

```json
{
  "event": "creator.catalog_snapshot",
  "status": 200,
  "durationMs": 183,
  "products": 18,
  "vouchers": 2,
  "promos": 3
}
```

## 10. Test Yang Diminta

Tambahkan test minimal:

- Request tanpa Authorization menghasilkan `401`.
- Request dengan token salah menghasilkan `401`.
- Request dengan token benar menghasilkan `200`.
- Response tidak mengandung field credential digital stock.
- Response tidak mengandung data customer/order/cart.
- Coupon `publicPromotion.enabled=false` tidak muncul.
- Coupon assigned-user tidak muncul.
- Coupon expired tidak muncul.
- Product unpublished tidak muncul.
- Product published dan `creatorPromotion.enabled=true` muncul.
- Flash sale expired tidak dianggap aktif.
- `ETag` stabil untuk response yang sama.
- `If-None-Match` yang cocok menghasilkan `304`.

## 11. Manual Test Command

Production:

```bash
curl -i \
  -H "Authorization: Bearer $CREATOR_INTEGRATION_SECRET" \
  https://zyho.store/api/integrations/creator/catalog-snapshot
```

Local:

```bash
curl -i \
  -H "Authorization: Bearer $CREATOR_INTEGRATION_SECRET" \
  http://localhost:3000/api/integrations/creator/catalog-snapshot
```

Expected:

- HTTP `200`.
- Ada `schemaVersion`, `generatedAt`, `store`, `products`, `vouchers`, `promos`.
- Tidak ada password/token/customer/order/private voucher.

## 12. Acceptance Criteria

- Jaka Creator bisa fetch snapshot dari `https://zyho.store/api/integrations/creator/catalog-snapshot`.
- Snapshot berisi minimal produk published yang sudah ditandai `creatorPromotion.enabled=true`.
- Admin bisa memilih produk/voucher yang boleh dipromosikan dari Payload admin.
- Voucher privat tidak bisa bocor karena default public promotion `false`.
- Harga, stok tersedia, promo, dan voucher di snapshot sesuai kondisi aktual commerce.
- Endpoint mendukung `ETag` dan `304`.
- Endpoint tetap read-only dan tidak membuat perubahan data.
- Test keamanan data sensitif lewat.

## 13. Yang Tidak Perlu Dikerjakan Tim Web Di Tahap Ini

- Tidak perlu membuat generator AI.
- Tidak perlu publish ke Threads.
- Tidak perlu menyimpan token Meta/Threads.
- Tidak perlu akses Mongo `wa-ai`.
- Tidak perlu membuat scheduler konten.

Bagian tersebut dikerjakan di repo `wa-ai` setelah endpoint snapshot commerce tersedia.

