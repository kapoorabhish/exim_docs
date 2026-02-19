# Exim Docs — Export-Import Documentation Platform

> End-to-end document management for Indian exporters and importers.
> From Proforma Invoice to Bank Realization Certificate — in one place.

---

## What is Exim Docs?

Exim Docs is a multi-tenant SaaS platform that digitises the complete export-import documentation workflow for Indian businesses. It handles the full document chain — PI → CI → Packing List → Shipping Bill → CoO → BRC — with built-in GST/customs compliance, master data management, and role-based access for your entire trade team.

**Target users:** Export managers, sales managers, CHAs, accountants, and data entry operators at Indian trading companies.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 15, Ant Design 5, Tailwind CSS 4 |
| Backend | NestJS, Prisma ORM |
| Database | PostgreSQL |
| Cache / Queue | Redis |
| Design System | `@exim/ui` — 8 components, Storybook 8 |
| Language | TypeScript throughout |
| Infrastructure | Docker Compose (local) |

---

## Project Structure

```
exim_docs/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── ui/           # Design system (@exim/ui) + Storybook
│   ├── shared/       # Shared types, constants, enums
│   └── db/           # Prisma schema + migrations + seed data
├── docs/
│   ├── product/
│   │   ├── epics/    # E01–E12 user stories
│   │   ├── sprints/  # Sprint plans + backlog
│   │   └── roadmap.md
│   └── git-workflow.md
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/kapoorabhish/exim_docs.git
cd exim_docs
pnpm install
```

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/api/.env` with your database credentials (defaults work with Docker below).

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Mailpit (email dev UI) on `localhost:8025`

### 4. Set up the database

```bash
pnpm --filter @exim/db db:migrate   # run migrations
pnpm --filter @exim/db db:seed      # seed reference data
```

### 5. Start development servers

```bash
pnpm dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001/api |
| Storybook | http://localhost:6006 |
| Mailpit | http://localhost:8025 |
| Prisma Studio | `pnpm --filter @exim/db studio` → http://localhost:5555 |

---

## Sprint Progress

| Sprint | Focus | Status |
|---|---|---|
| Sprint 1 | Foundation — Auth, RBAC, Tenant setup, Design system | ✅ Complete |
| Sprint 2 | Master Data — Parties, Products, Exchange Rates, Templates | ✅ Complete |
| Sprint 3 | Export Docs — PI, CI, Packing List, Shipping Bill, CoO | 🔄 In progress |
| Sprint 4+ | Import docs, Payments, GST compliance, Reports | 📋 Planned |

Full roadmap: [`docs/product/roadmap.md`](docs/product/roadmap.md)

---

## Git Workflow

```
main  ←── develop  ←── sprint-XX  ←── feat/...
```

- All sprint work happens on `sprint-XX`
- PR `sprint-XX → develop` at end of sprint
- PR `develop → main` for releases

See [`docs/git-workflow.md`](docs/git-workflow.md) for commit conventions and PR checklist.

---

## Documentation

| Doc | Description |
|---|---|
| [`docs/export-import-product-documentation.md`](docs/export-import-product-documentation.md) | Full product requirements |
| [`docs/product/actors-and-personas.md`](docs/product/actors-and-personas.md) | 13 user personas |
| [`docs/product/epics/`](docs/product/epics/) | E01–E12 epics with user stories |
| [`docs/product/sprints/`](docs/product/sprints/) | Sprint plans |
| [`docs/product/sprints/backlog.md`](docs/product/sprints/backlog.md) | Deferred items and known issues |
| [`docs/techstack.md`](docs/techstack.md) | Technology decisions |