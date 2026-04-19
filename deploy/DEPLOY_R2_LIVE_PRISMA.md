# Live R2 Sync With Prisma

Flow Prisma-only:

1. jalankan migration Prisma ke live agar kolom R2 ada
2. salin nilai R2 dari local `AppConfig.id = 1` ke live `AppConfig.id = 1`
3. update hanya 5 field R2, field live lain tetap utuh

Field yang disentuh oleh inject:
- `r2AccessKey`
- `r2SecretKey`
- `r2Bucket`
- `r2Endpoint`
- `r2PublicUrl`

## 1. Deploy migration ke live

```powershell
$env:DATABASE_URL="postgresql://live-user:live-pass@host:5432/live_db?schema=public"
npm run prisma:migrate:deploy
```

Migration file:
- [migration.sql](D:\wa-ai\prisma\migrations\20260419173000_add_r2_appconfig_fields\migration.sql)

## 2. Dry run inject dari local ke live

```powershell
$env:LOCAL_DATABASE_URL="postgresql://local-user:local-pass@127.0.0.1:5432/local_db?schema=public"
$env:LIVE_DATABASE_URL="postgresql://live-user:live-pass@host:5432/live_db?schema=public"
npm run live:r2:inject:prisma:dry
```

## 3. Execute inject

```powershell
npm run live:r2:inject:prisma
```

Script:
- [inject-r2-settings-live-prisma.mjs](D:\wa-ai\scripts\inject-r2-settings-live-prisma.mjs)

## Safety

- migration hanya menambah kolom baru
- inject hanya `update` 5 field R2
- tidak menghapus row
- tidak overwrite field AppConfig lain
- jika `AppConfig.id = 1` belum ada di live, script akan stop dan tidak membuat row dummy
