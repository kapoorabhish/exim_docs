# Deployment Guide — Vercel + Neon

## Architecture

Two separate Vercel projects, one Neon PostgreSQL database, all in **Singapore (ap-southeast-1 / sin1)**.

```
Browser
  ├── apps/web  → Vercel Project "exim-web"  (Next.js, CDN-distributed)
  └── apps/api  → Vercel Project "exim-api"  (NestJS serverless, sin1)
                        ↓
                  Neon PostgreSQL (ap-southeast-1, pooled via PgBouncer)
```

> **Region rule:** Always keep the Vercel function region and Neon region in the same geography.
> Function → DB round trips happen on every request; cross-region latency compounds fast.

---

## Step 0 — Neon Database

1. Sign up at [neon.tech](https://neon.tech) → **New Project**
2. Name: `exim-prod`
3. **Region: AWS / ap-southeast-1 (Singapore)**
4. After creation, go to **Connect** → enable **Connection pooling**
5. Copy the **pooled** connection string (hostname contains `-pooler`)

Append Prisma-required params to the URL:

```
postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1
```

- `pgbouncer=true` — disables prepared statements (required for PgBouncer compatibility)
- `connection_limit=1` — prevents each serverless instance from opening multiple connections
- `sslmode=require` — enforces TLS

6. Run migrations against Neon from your local machine (one-time):

```bash
DATABASE_URL="<pooled-url>" pnpm --filter @exim/db db:push
```

---

## Step 1 — Deploy the API (`apps/api`)

### 1.1 Create Vercel project

In Vercel dashboard → **Add New Project** → import `exim_docs` repo.

| Setting | Value |
|---|---|
| **Root Directory** | `apps/api` |
| **Framework Preset** | Other |
| **Build Command** | `pnpm run vercel-build` |
| **Output Directory** | `dist` |
| **Install Command** | _(leave blank — Vercel auto-detects pnpm workspace and installs from repo root)_ |

The `vercel-build` script (`prisma generate --schema=../../packages/db/prisma/schema.prisma && nest build`)
and the `vercel.json` routing config are already committed to the repo.

### 1.2 Environment variables

Go to **Settings → Environment Variables** and add:

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string | Include `?pgbouncer=true&connection_limit=1&sslmode=require` |
| `JWT_SECRET` | random 64-char hex string | `openssl rand -hex 32` in terminal |
| `JWT_ACCESS_EXPIRY` | `15m` | |
| `JWT_REFRESH_EXPIRY` | `7d` | |
| `FRONTEND_URL` | `https://exim-web.vercel.app` | Add after Step 2; redeploy API once set |
| `SMTP_HOST` | your SMTP provider host | e.g. `smtp.resend.com` |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | your SMTP username | |
| `SMTP_PASS` | your SMTP password | |
| `SMTP_FROM` | `noreply@yourdomain.com` | |

> **SMTP for free tier:** [Resend](https://resend.com) offers 3,000 emails/month free.

### 1.3 Deploy

Click **Deploy**. After the build succeeds, note the assigned URL (e.g. `https://exim-api.vercel.app`).

### 1.4 Verify

```
GET https://exim-api.vercel.app/api
```

Should return a JSON 404 (not a network error), confirming the serverless handler is live.

---

## Step 2 — Deploy the Frontend (`apps/web`)

### 2.1 Create Vercel project

In Vercel dashboard → **Add New Project** → import same `exim_docs` repo.

| Setting | Value |
|---|---|
| **Root Directory** | `apps/web` |
| **Framework Preset** | Next.js _(auto-detected)_ |
| **Build Command** | _(leave default: `next build`)_ |
| **Install Command** | _(leave blank)_ |

### 2.2 Environment variables

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://exim-api.vercel.app/api` |

### 2.3 Deploy

Click **Deploy**. Note the assigned URL (e.g. `https://exim-web.vercel.app`).

### 2.4 Update API's FRONTEND_URL

Go back to the **API project** → Settings → Environment Variables → update `FRONTEND_URL` to the web app URL → **Redeploy** the API (Deployments tab → ⋯ → Redeploy).

---

## Step 3 — Auto-deploy from `develop` (when ready)

Currently deployments trigger on pushes to `sprint-08`. To switch to `develop`:

**For each Vercel project → Settings → Git:**
- **Production Branch:** change to `develop`

From then on, every merged PR into `develop` triggers a production redeploy automatically.
Preview deployments (one per PR) are enabled by default at no extra cost.

Recommended final workflow:
```
feature branch → PR → develop  (triggers production deploy)
develop        → PR → main      (release tag / changelog only)
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Build fails: `Cannot find schema.prisma` | Wrong root directory | Confirm Root Directory = `apps/api` in Vercel settings |
| `PrismaClientInitializationError` at runtime | Wrong `DATABASE_URL` | Check it's the **pooled** URL with `pgbouncer=true` |
| CORS error in browser | `FRONTEND_URL` mismatch | Value must exactly match the web app URL (no trailing slash) |
| First request slow (~2–3s) | Serverless cold start | Expected on Hobby plan; subsequent requests are fast |
| `prepared statement already exists` | PgBouncer + Prisma conflict | Add `&pgbouncer=true` to `DATABASE_URL` |

---

## Local Development (unchanged)

```bash
docker compose up -d          # starts postgres + mailpit
pnpm --filter api dev         # NestJS on :3001
pnpm --filter web dev         # Next.js on :3000
```

`.env` in `apps/api/` uses the local Docker Postgres — no changes needed for local dev.