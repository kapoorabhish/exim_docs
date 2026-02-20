# EXIM — Technology Stack

**Version:** 1.0
**Date:** February 2026
**Status:** Active

---

## Table of Contents

1. [Overview](#1-overview)
2. [Monorepo Architecture](#2-monorepo-architecture)
3. [Frontend — Web](#3-frontend--web)
4. [Frontend — Mobile](#4-frontend--mobile)
5. [Backend](#5-backend)
6. [Database](#6-database)
7. [Infrastructure](#7-infrastructure)
8. [DevOps & Tooling](#8-devops--tooling)
9. [Third-Party Integrations](#9-third-party-integrations)
10. [Document Templating](#10-document-templating)

---

## 1. Overview

EXIM is a cloud-based, multi-tenant SaaS platform for managing export-import documentation, GST compliance, and international trade operations. The tech stack is chosen to optimize for:

- **Type safety** — TypeScript end-to-end across frontend, backend, and mobile
- **Developer velocity** — Monorepo with shared packages, hot reload, fast builds
- **Enterprise readiness** — Ant Design component library, NestJS modular backend, PostgreSQL with row-level security
- **Scalability** — Serverless containers, job queues, CDN-backed static assets

---

## 2. Monorepo Architecture

| Tool | Version | Purpose |
|---|---|---|
| Turborepo | 2.8.9 | Build orchestration, caching, task pipeline |
| pnpm | 9.15.9 | Package manager with workspace support |
| TypeScript | 5.9.3 | Shared across all packages and apps |

### Workspace Structure

```
exim_docs/
├── apps/
│   └── web/              → Next.js 15 application
├── packages/
│   ├── ui/               → Design system (@exim/ui)
│   ├── shared/           → Types, constants, schemas (@exim/shared)
│   ├── db/               → Prisma schema + migrations (planned)
│   ├── email/            → React Email templates (planned)
│   └── pdf/              → Document templates (planned)
├── turbo.json            → Build pipeline definition
├── pnpm-workspace.yaml   → Workspace configuration
└── tsconfig.json         → Base TypeScript configuration
```

### Turbo Pipelines

| Pipeline | Behavior |
|---|---|
| `build` | Depends on `^build` (topological), outputs `dist/**`, `.next/**` |
| `dev` | No cache, persistent (watch mode) |
| `storybook` | No cache, persistent |
| `build-storybook` | Depends on `^build`, outputs `storybook-static/**` |
| `lint` | Depends on `^build` |

---

## 3. Frontend — Web

### Core Framework

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15.5.12 | React framework with App Router, SSR, Turbopack |
| React | 18.3.1 | UI library |
| React DOM | 18.3.1 | DOM rendering |

### UI & Styling

| Technology | Version | Purpose |
|---|---|---|
| Ant Design (antd) | 5.29.3 | Enterprise component library — tables, forms, layouts, modals |
| @ant-design/icons | 5.6.1 | Icon set |
| Tailwind CSS | 4.1.18 | Utility CSS for custom layouts beyond antd |
| @tailwindcss/vite | 4.1.18 | Vite plugin for Tailwind |

### State & Data

| Technology | Version | Purpose |
|---|---|---|
| Zustand | — (planned) | Lightweight client state management |
| TanStack Query | — (planned) | Server state, caching, pagination, optimistic updates |
| Zod | — (planned) | Schema validation (shared with backend) |

### Design System Documentation

| Technology | Version | Purpose |
|---|---|---|
| Storybook | 8.6.16 | Component documentation, interactive playground |
| @storybook/react-vite | 8.6.16 | Vite-powered Storybook for React |
| @storybook/addon-essentials | 8.6.14 | Controls, actions, viewport, docs |
| @storybook/addon-interactions | 8.6.14 | Interaction testing |
| Vite | 6.4.1 | Build tool for Storybook |

### Charts & Visualization (Planned)

| Technology | Purpose |
|---|---|
| Apache ECharts (echarts-for-react) | Dashboard analytics — line, bar, pie, funnel charts |

### PDF Generation (Planned)

| Technology | Purpose |
|---|---|
| @react-pdf/renderer | React-component-based PDF templates (invoices, packing lists) |
| Puppeteer | Headless Chrome for government form layouts (shipping bill, BoE) |
| pdf-lib | Post-processing — watermarks, digital signatures |

---

## 4. Frontend — Mobile (Planned)

| Technology | Purpose |
|---|---|
| React Native (Expo) | Cross-platform mobile app (Android & iOS) |
| Expo Router | File-based navigation, deep linking |
| React Native Paper / Tamagui | Mobile UI components |
| Expo Camera + Google Cloud Vision | Document scanning, OCR for supplier invoices |

---

## 5. Backend (Planned)

### Core

| Technology | Purpose |
|---|---|
| Node.js (v20+) | Runtime |
| NestJS | Modular enterprise framework — guards (RBAC), interceptors, DI |
| Prisma | Type-safe ORM, migrations, multi-tenant schema support |

### API Layer

| Technology | Purpose |
|---|---|
| REST | Primary API for CRUD operations |
| GraphQL | Flexible queries for dashboards and reports |

### Authentication

| Technology | Purpose |
|---|---|
| Passport.js + JWT | Auth strategies, access/refresh tokens |

### Background Jobs

| Technology | Purpose |
|---|---|
| BullMQ (Redis-backed) | PDF generation, email dispatch, exchange rate sync, GST filing |

### Validation

| Technology | Purpose |
|---|---|
| Zod | Shared schemas between frontend and backend |

---

## 6. Database (Planned)

### Primary

| Technology | Purpose |
|---|---|
| PostgreSQL 16 | Main database — JSONB, full-text search, row-level security |
| Row-Level Security (RLS) | Multi-tenancy via `tenant_id` column |

### Cache & Queue

| Technology | Purpose |
|---|---|
| Redis | Session store, exchange rate cache, BullMQ job queue, rate limiting |

### Search

| Technology | Purpose |
|---|---|
| PostgreSQL Full-Text Search | Initial search (HS codes, documents, parties) |
| Meilisearch | Scale-up option for advanced search |

---

## 7. Infrastructure (Planned)

| Technology | Purpose |
|---|---|
| AWS (ap-south-1 Mumbai) | Cloud provider — Indian region for low latency |
| Docker + ECS Fargate | Serverless container orchestration |
| CloudFront | CDN for static assets, PDF downloads |
| Cloudflare R2 | File storage (production) — documents, certificates, B/L copies; S3-compatible, zero egress fees |
| RustFS | File storage (local development) — S3-compatible drop-in; Apache 2.0 license; runs via Docker Compose |
| AWS SES + React Email | Transactional email with styled templates |
| MSG91 | Indian SMS gateway (OTPs, payment reminders) |
| Gupshup / Twilio | WhatsApp Business API integration |

### File Storage Architecture

The same `@aws-sdk/client-s3` code runs in both environments — only env vars differ:

| Environment | Provider | Endpoint | Notes |
|---|---|---|---|
| Local dev | RustFS (Docker) | `http://localhost:9000` | `forcePathStyle: true`; web console at `:9001` |
| Production | Cloudflare R2 | `https://<account>.r2.cloudflarestorage.com` | No egress fees; S3-compatible |

**Upload flow (presigned URL pattern):**
```
Browser → POST /api/uploads/presign → backend returns presigned PUT URL
Browser → PUT {presignedUrl} → file goes directly to RustFS / R2
Browser → PATCH /api/{resource}/:id → saves objectKey to documentUrl field
Frontend → GET /api/uploads/signed-url?key={key} → 15-min signed GET URL for viewing
```

Object path structure: `/{tenantId}/{module}/{recordId}/{filename}`

> MinIO was the original recommendation but entered maintenance mode in December 2025 and
> stopped publishing Docker images. RustFS (Apache 2.0, Rust) is the actively maintained
> S3-compatible replacement.

---

## 8. DevOps & Tooling

| Tool | Purpose |
|---|---|
| GitHub Actions | CI/CD pipelines |
| Biome | Linter + formatter (replaces ESLint + Prettier) |
| Jest + ts-jest | Backend unit testing (`apps/api`) — 270+ tests, 90% coverage |
| Jest + RTL | Frontend unit testing (`apps/web`) — utility and hook tests |
| Playwright | End-to-end testing (planned) |
| RustFS (Docker) | S3-compatible local file storage (replaces defunct MinIO) |
| Husky + lint-staged | Pre-commit hooks |
| Sentry | Error tracking and monitoring |
| Better Stack | Log management |
| PostHog | Product analytics + session replay |

---

## 9. Third-Party Integrations (Planned)

### Government Portals

| Integration | Purpose |
|---|---|
| ICEGATE API | Electronic filing of shipping bills and bills of entry |
| DGFT Portal | IEC verification, license management |
| GST Portal | GSTR-1/3B filing, LUT management, e-invoice |

### Banking & Payments

| Integration | Purpose |
|---|---|
| Razorpay / Stripe | Subscription billing |
| Bank APIs | Statement fetch, payment status, SWIFT tracking |

### Shipping & Logistics

| Integration | Purpose |
|---|---|
| Shipping Line APIs | Container tracking, vessel schedules, B/L download |
| Currency Exchange APIs | Real-time exchange rates |

### Accounting

| Integration | Purpose |
|---|---|
| Tally, QuickBooks, Zoho Books | Accounting software sync |
| SAP, Oracle | ERP integration |

---

## 10. Document Templating

### Hybrid Strategy

The platform uses a two-layer approach for generating trade documents:

#### Layer 1: React-PDF (Standard Documents)

Used for: Commercial Invoice, Proforma Invoice, Packing List, Certificate of Origin, Debit/Credit Notes

- Templates are React components using `<Document>`, `<Page>`, `<View>`, `<Text>` primitives
- Composable — shared components like `<ItemsTable>`, `<CompanyHeader>` across document types
- Server-side rendering in BullMQ workers
- Type-safe with TypeScript

#### Layer 2: Puppeteer + Handlebars (Government Forms)

Used for: Shipping Bill, Bill of Entry, LC application forms

- HTML/CSS templates matching government form layouts exactly
- Rendered to PDF via headless Chrome

#### Tenant Customization

Structured configuration system (not drag-and-drop):

- **Branding** — Logo, primary color, font family
- **Layout** — Paper size, orientation, header style, visible columns
- **Content** — Declaration text, terms & conditions, footer, custom fields
- **Numbering** — Prefix, suffix, zero-padding, reset frequency

---

**Document Version:** 1.1
**Last Updated:** February 2026

---

*This document will be updated as new technologies are adopted and planned items are implemented.*
