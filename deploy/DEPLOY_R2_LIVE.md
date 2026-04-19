# Live R2 Sync

Tujuan:
- tambah 5 kolom R2 baru ke tabel `AppConfig` di live jika belum ada
- salin nilai R2 dari local ke live
- jangan ubah field `AppConfig` lain

Field yang disentuh:
- `r2AccessKey`
- `r2SecretKey`
- `r2Bucket`
- `r2Endpoint`
- `r2PublicUrl`

## Opsi 1: script Node

Set environment:

```powershell
$env:LOCAL_DATABASE_URL="postgresql://local-user:local-pass@127.0.0.1:5432/local_db?schema=public"
$env:LIVE_DATABASE_URL="postgresql://live-user:live-pass@host:5432/live_db?schema=public"
```

Dry run:

```powershell
npm run live:r2:inject:dry
```

Execute:

```powershell
npm run live:r2:inject
```

Catatan:
- script akan `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- script hanya update 5 field R2 pada row `AppConfig.id = 1`
- field live lain tidak dihapus dan tidak diubah

## Opsi 2: SQL manual

1. Jalankan [live-r2-columns.sql](D:\wa-ai\deploy\sql\live-r2-columns.sql)
2. Isi nilai template di [live-r2-upsert-from-local-template.sql](D:\wa-ai\deploy\sql\live-r2-upsert-from-local-template.sql)
3. Jalankan ke database live
