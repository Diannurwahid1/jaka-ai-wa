# Deploy to Production

Target:

- app path: `/var/www/jaka-ai-wa`
- process manager: `pm2`
- app port: `3010`
- domain: `jakacs.arahdigital.id`

## 1. Install base packages

```bash
sudo apt update
sudo apt install -y git curl nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node -v
npm -v
pm2 -v
```

## 2. Clone repository

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone https://github.com/Diannurwahid1/jaka-ai-wa.git
cd jaka-ai-wa
```

## 3. Create PostgreSQL user and database

Install PostgreSQL if needed:

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Open PostgreSQL shell:

```bash
sudo -u postgres psql
```

Create dedicated user and database:

```sql
CREATE USER wa_ai_app WITH PASSWORD 'ganti-password-yang-kuat';
CREATE DATABASE wa_ai_control_center OWNER wa_ai_app;
GRANT ALL PRIVILEGES ON DATABASE wa_ai_control_center TO wa_ai_app;
\q
```

Optional quick check:

```bash
psql "postgresql://wa_ai_app:ganti-password-yang-kuat@127.0.0.1:5432/wa_ai_control_center?schema=public" -c "\dt"
```

## 4. Create production env

Create `.env.production`:

```bash
nano .env.production
```

Example:

```env
DATABASE_URL="postgresql://wa_ai_app:ganti-password-yang-kuat@127.0.0.1:5432/wa_ai_control_center?schema=public"

AUTH_SECRET="replace-with-long-random-secret"
ADMIN_EMAIL="admin@wa-ai.local"
ADMIN_PASSWORD="replace-with-strong-password"

AI_API_URL="https://ai.sumopod.com/v1/chat/completions"
AI_API_KEY="your-ai-key"
AI_MODEL="seed-2-0-pro"

WA_BLAST_API_URL="https://waflash.citradigitalhotel.it.com/api/v1"
WA_BLAST_SESSION_ID="alphaprod"
WA_BLAST_TOKEN="your-wa-token"
WA_BLAST_MASTER_KEY="your-wa-master-key"

MONGODB_URI="your-mongodb-atlas-uri"
MONGODB_DB="wa_ai_db"
RAG_COLLECTION="knowledge"
RAG_INDEX_NAME="vector_index"

EMBEDDING_PROVIDER="mongodb"
EMBEDDING_API_KEY="your-mongodb-model-api-key"
EMBEDDING_MODEL="voyage-4-large"
EMBEDDING_DIMENSIONS="1024"
EMBEDDING_BASE_URL="https://ai.mongodb.com/v1"
```

## 5. Install and build

```bash
npm install
npx prisma generate
npx prisma db push
npm run build
```

## 6. Start with PM2

Copy env file for runtime:

```bash
cp .env.production .env
```

Start app:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Check:

```bash
pm2 status
pm2 logs wa-ai-control-center
curl http://127.0.0.1:3010
```

## 7. Configure nginx

Copy nginx config:

```bash
sudo cp deploy/nginx-jakacs.arahdigital.id.conf /etc/nginx/sites-available/jakacs.arahdigital.id
sudo ln -s /etc/nginx/sites-available/jakacs.arahdigital.id /etc/nginx/sites-enabled/jakacs.arahdigital.id
sudo nginx -t
sudo systemctl reload nginx
```

## 8. Point domain

At DNS provider:

- create `A` record
- host: `jakacs`
- value: `IP_SERVER_ANDA`

Wait until DNS resolves:

```bash
ping jakacs.arahdigital.id
```

## 9. Enable HTTPS with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d jakacs.arahdigital.id
```

## 10. Update WA webhook

Set WA Blast webhook to:

```txt
https://jakacs.arahdigital.id/api/webhook/wa
```

## 11. Deploy updates

```bash
cd /var/www/jaka-ai-wa
git pull origin main
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart wa-ai-control-center
pm2 logs wa-ai-control-center
```
