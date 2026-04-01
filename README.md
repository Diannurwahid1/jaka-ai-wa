# WA AI Control Center

Control center modern untuk automasi WhatsApp berbasis AI dengan alur:

`WhatsApp -> WA Blast Webhook -> Next.js Backend -> AI / Memory / RAG -> WA Blast Send`

Project ini menggabungkan:

- dashboard admin modern
- WhatsApp auto reply
- AI memory per nomor WhatsApp
- RAG knowledge base berbasis MongoDB Atlas Vector Search
- pengujian AI manual
- monitoring log dan webhook
- admin auth dan runtime settings

## Preview

WA AI Control Center dirancang sebagai panel operasi ringan untuk tim bisnis yang ingin:

- menerima pesan WhatsApp
- memproses balasan dengan AI
- menyimpan konteks percakapan user
- mengambil jawaban dari knowledge base internal
- memantau semua flow dari satu dashboard

UI dibuat dengan gaya SaaS modern, mobile-aware, dan dilengkapi Jaka AI sebagai assistant onboarding.

## Core Flow

```mermaid
flowchart LR
  A["User WhatsApp"] --> B["WA Blast Webhook"]
  B --> C["Next.js API"]
  C --> D["AI Runtime"]
  C --> E["Memory System"]
  C --> F["RAG / MongoDB Atlas"]
  D --> C
  E --> C
  F --> C
  C --> G["WA Blast Send Message"]
  G --> A
```

## Main Features

### 1. Admin Dashboard

- statistik pesan masuk, reply AI, success, failed
- status WA dan AI
- recent activity
- top memory sessions

### 2. AI Chat Testing

- uji prompt manual seperti chat
- testing respons AI tanpa menunggu pesan WhatsApp asli
- menyimpan log hasil testing

### 3. WA Monitor

- live logs pesan
- status auto reply
- memory per nomor WhatsApp
- clear memory per user

### 4. AI Memory System

- memory per phone number
- trim history FIFO
- session expiry
- rolling summary
- context-aware reply

### 5. Knowledge Base + RAG

- tambah knowledge internal
- retrieval top 3 dokumen relevan
- ask with RAG
- MongoDB Atlas Vector Search
- embedding via MongoDB Atlas AI / Voyage

### 6. Runtime Settings

- AI config
- WA Blast config
- MongoDB config
- embedding config
- test MongoDB embedding langsung dari UI

### 7. Auth & Security

- admin login
- hashed password
- protected routes
- security headers
- password change

### 8. Jaka AI Experience

- floating assistant
- onboarding tour dengan `driver.js`
- greeting animation pasca login
- route loading animation

## Tech Stack

### Frontend

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS

### Backend

- Next.js Route Handlers
- fetch API
- jose
- bcryptjs

### Core Database

- PostgreSQL
- Prisma

### RAG Layer

- MongoDB Atlas
- MongoDB Atlas Vector Search
- `mongodb-rag`

### UI / UX

- driver.js
- custom loading overlays
- skeleton shimmer states
- animated Jaka AI video assets

## Project Structure

```txt
app/
  api/
    auth/
    webhook/
    rag/
    memory/
    settings/
  login/
  dashboard/
  ai-chat/
  wa-monitor/
  knowledge-base/
  settings/

components/
  app-shell.tsx
  sidebar.tsx
  login-client.tsx
  dashboard-client.tsx
  ai-chat-client.tsx
  wa-monitor-client.tsx
  knowledge-base-client.tsx
  settings-client.tsx
  jaka-assistant.tsx
  jaka-login-greeting.tsx
  route-loading-overlay.tsx

lib/
  ai.ts
  wa.ts
  memory.ts
  summarize.ts
  rag.ts
  settings.ts
  auth.ts
  prisma.ts

prisma/
  schema.prisma
```

## Database Design

### PostgreSQL + Prisma

Core application data disimpan di PostgreSQL:

- `AppConfig`
- `AdminUser`
- `MessageLog`
- `MemorySession`
- `MemoryMessage`
- `WebhookEvent`

### MongoDB Atlas

Knowledge base dan vector search disimpan di MongoDB Atlas:

- collection: `knowledge`
- vector field: `embedding`
- vector index: `vector_index`

## Environment

Project ini mendukung runtime settings dari UI, tetapi untuk bootstrap awal Anda tetap bisa memakai `.env` / `.env.local`.

Contoh variabel penting:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/wa_ai_control_center_local?schema=public"

AUTH_SECRET="change-me"
ADMIN_EMAIL="admin@wa-ai.local"
ADMIN_PASSWORD="Admin12345!"

AI_API_URL="https://ai.sumopod.com/v1/chat/completions"
AI_API_KEY="sk-xxxx"
AI_MODEL="seed-2-0-pro"

WA_BLAST_API_URL="https://waflash.citradigitalhotel.it.com/api/v1"
WA_BLAST_SESSION_ID="alphaprod"
WA_BLAST_TOKEN="your-token"
WA_BLAST_MASTER_KEY="your-master-key"

MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB="wa_ai_db"
RAG_COLLECTION="knowledge"
RAG_INDEX_NAME="vector_index"

EMBEDDING_PROVIDER="mongodb"
EMBEDDING_API_KEY="your-mongodb-model-api-key"
EMBEDDING_MODEL="voyage-4-large"
EMBEDDING_DIMENSIONS="1024"
EMBEDDING_BASE_URL="https://ai.mongodb.com/v1"
```

## Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Generate Prisma client

```bash
npx prisma generate
```

### 3. Push schema to PostgreSQL

```bash
npx prisma db push
```

### 4. Run development server

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Default Login

Gunakan kredensial bootstrap dari env:

- email: `admin@wa-ai.local`
- password: `Admin12345!`

Setelah login, sebaiknya langsung ganti password admin dari halaman Settings.

## WA Webhook

Endpoint utama:

```txt
POST /api/webhook/wa
```

Flow:

1. terima pesan dari WA Blast
2. cek session memory user
3. bangun context AI
4. optional retrieval dari RAG
5. kirim balasan ke WA Blast
6. simpan log dan memory

Untuk development lokal, webhook WA Blast tidak bisa diarahkan ke `localhost` secara langsung. Gunakan URL publik seperti tunnel atau deployment server.

## AI Memory

Memory system menyimpan:

- phone number
- summary percakapan
- recent messages
- last active timestamp

Behavior:

- reset jika expired
- trim FIFO
- rolling summary saat panjang history melebihi batas

## RAG Setup

### MongoDB Atlas

1. buat cluster Atlas
2. whitelist IP
3. buat database user
4. isi `MongoDB URI`

### Vector Index

Contoh index untuk `voyage-4-large` dengan dimensi `1024`:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }
  ]
}
```

### Embedding Config

Isi runtime settings:

- provider: `mongodb`
- model: `voyage-4-large`
- dimensions: `1024`
- base URL: `https://ai.mongodb.com/v1`

## Main Routes

### Pages

- `/login`
- `/dashboard`
- `/ai-chat`
- `/wa-monitor`
- `/knowledge-base`
- `/settings`

### API

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `GET /api/settings`
- `POST /api/settings`
- `POST /api/settings/embedding-test`
- `POST /api/webhook/wa`
- `GET /api/webhook/wa/debug`
- `POST /api/ai/test`
- `POST /api/wa/send`
- `POST /api/rag/add`
- `POST /api/rag/ask`
- `GET /api/rag/knowledge`
- `DELETE /api/rag/knowledge`
- `POST /api/memory/test`

## UX Highlights

- custom login experience dengan animated Jaka AI
- post-login greeting overlay
- floating Jaka AI assistant
- route loading animation
- skeleton shimmer loading
- responsive sidebar dan mobile layout

## Development Notes

- core app memakai PostgreSQL
- RAG memakai MongoDB Atlas
- runtime config bisa diatur dari halaman Settings
- video assets Jaka AI disimpan di `public/video`
- semua request menggunakan `fetch`, tanpa axios

## Verification

Command utama untuk validasi:

```bash
npx tsc --noEmit
npm run lint
```

## License

Gunakan project ini sesuai kebutuhan internal atau pengembangan lanjutan Anda.

## Credits

Built with Next.js, Prisma, MongoDB Atlas, dan WA Blast integration.

Developed by [diannurwahid.com](https://diannurwahid.com)
