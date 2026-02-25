# Deployment Guide — Railway + Neon

## Architecture

Two Railway services (API + optionally web), one Neon PostgreSQL database.

```
Browser
  ├── apps/web  → Vercel Project "exim-web"  (Next.js, CDN-distributed)
  └── apps/api  → Railway Service "exim-api" (NestJS, Docker container)
                        ↓
                  Neon PostgreSQL (ap-southeast-1, pooled via PgBouncer)
```

> **Region rule:** Keep Railway service region and Neon region in the same geography.
> ap-southeast-1 (Singapore) is available on both.

---

## Why Railway over Vercel for the API

| Concern | Vercel (serverless) | Railway (container) |
|---|---|---|
| NestJS compatibility | Requires webpack bundling + serverless adapter | Runs `nest build && node dist/main` as-is |
| pnpm monorepo | Needs `shamefully-hoist` workaround | Works natively |
| ESM packages | Requires bundling workarounds | No issue |
| WebSockets / SSE | Not supported | Supported |
| Persistent processes | Cold starts per request | Always-on process |
| Free tier | Function invocation limits | $5 credit/month (~500 hrs) |

---

## Step 0 — Neon Database

1. Sign up at [neon.tech](https://neon.tech) → **New Project**
2. Name: `exim-prod`
3. **Region: AWS / ap-southeast-1 (Singapore)**
4. After creation, go to **Connect** → enable **Connection pooling**
5. Copy the **pooled** connection string (hostname contains `-pooler`)

Append the required SSL param:

```
postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

- `sslmode=require` — enforces TLS
- **Do NOT add** `pgbouncer=true` or `connection_limit=1` — those are serverless-only params.
  Railway runs a persistent process; Prisma's built-in connection pool manages connections correctly.

Run migrations from your local machine (one-time):

```bash
DATABASE_URL="<pooled-url>" pnpm --filter @exim/db db:push
```

---

## Step 1 — Deploy the API (`apps/api`)

### 1.1 Create Railway project

1. Sign up at [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo** → authorise and select `exim_docs`
3. Railway will auto-detect the monorepo

### 1.2 Configure the service

In the service settings:

| Setting | Value |
|---|---|
| **Root Directory** | `apps/api` |
| **Build Command** | `pnpm install && pnpm --filter @exim/pdf build && prisma generate --schema=../../packages/db/prisma/schema.prisma && nest build` |
| **Start Command** | `node dist/main` |
| **Watch Paths** | `apps/api/**`, `packages/**` |

> Railway installs from the workspace root by default when it detects `pnpm-workspace.yaml`.

### 1.3 Environment variables

Go to **Variables** tab and add:

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string | Use `?sslmode=require` only — no `pgbouncer=true` or `connection_limit=1` |
| `JWT_SECRET` | random 64-char hex string | `openssl rand -hex 32` in terminal |
| `JWT_ACCESS_EXPIRY` | `15m` | |
| `JWT_REFRESH_EXPIRY` | `7d` | |
| `FRONTEND_URL` | `https://exim-web.vercel.app` | Add after frontend is deployed; redeploy API once set |
| `PORT` | `3001` | Railway injects `PORT` automatically; set to match NestJS |
| `NODE_ENV` | `production` | |
| `SMTP_HOST` | your SMTP provider host | e.g. `smtp.resend.com` |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | your SMTP username | |
| `SMTP_PASS` | your SMTP password | |
| `SMTP_FROM` | `noreply@yourdomain.com` | |

> **SMTP for free tier:** [Resend](https://resend.com) offers 3,000 emails/month free.

> **Note on PORT:** NestJS must listen on the `PORT` env var that Railway injects.
> Confirm `apps/api/src/main.ts` uses `process.env.PORT ?? 3001`.

### 1.4 Deploy

Railway auto-deploys on every push to the configured branch. Click **Deploy** to trigger the first one manually.

After the build succeeds, Railway assigns a public URL (e.g. `https://exim-api.up.railway.app`).

### 1.5 Verify

```bash
curl https://exim-api.up.railway.app/api
```

Should return a JSON 404 from NestJS (not a network error), confirming the server is live.

---

## Step 2 — Deploy the Frontend (`apps/web`)

The frontend (Next.js) is best kept on **Vercel** — it's purpose-built for Next.js and has a permanent free tier with no credit expiry.

### 2.1 Create Vercel project

In Vercel dashboard → **Add New Project** → import `exim_docs` repo.

| Setting | Value |
|---|---|
| **Root Directory** | `apps/web` |
| **Framework Preset** | Next.js _(auto-detected)_ |
| **Build Command** | _(leave default: `next build`)_ |

### 2.2 Environment variables

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://exim-api.up.railway.app/api` |

### 2.3 Deploy and update CORS

After the web app is deployed, go back to the **Railway API service → Variables** and set:

```
FRONTEND_URL=https://exim-web.vercel.app
```

Redeploy the API service so CORS picks up the new origin.

---

## Step 3 — Auto-deploy from `develop`

Railway auto-deploys on every push by default. To restrict to `develop` only:

**Service → Settings → Source → Branch:** set to `develop`

From then on, every merged PR into `develop` triggers a production redeploy automatically.

Recommended workflow:
```
feature branch → PR → develop  (triggers Railway + Vercel production deploy)
develop        → PR → main      (release tag / changelog only)
```

---

## Prisma Migrations in Production

Run migrations from your local machine targeting the Neon database directly (not the pooled URL):

```bash
# Use the DIRECT (non-pooled) connection URL for migrations
DATABASE_URL="<direct-url>" pnpm --filter @exim/db db:migrate
```

> Use the **direct** connection string (without `-pooler` in hostname) for `prisma migrate`.
> PgBouncer pooled connections do not support the DDL transactions that migrations require.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Build fails: `Cannot find schema.prisma` | Root Directory not set | Confirm Root Directory = `apps/api` in Railway settings |
| `PrismaClientInitializationError` | Wrong `DATABASE_URL` | Check it's the **pooled** URL with `pgbouncer=true` |
| CORS error in browser | `FRONTEND_URL` mismatch | Value must exactly match the web app URL (no trailing slash) |
| Port binding error | `PORT` not read by NestJS | Ensure `main.ts` uses `process.env.PORT ?? 3001` |
| `prepared statement already exists` | PgBouncer + Prisma conflict | Add `&pgbouncer=true` to `DATABASE_URL` |

---

## Local Development (unchanged)

```bash
docker compose up -d          # starts postgres + mailpit
pnpm --filter api dev         # NestJS on :3001
pnpm --filter web dev         # Next.js on :3000
```

`.env` in `apps/api/` uses the local Docker Postgres — no changes needed for local dev.