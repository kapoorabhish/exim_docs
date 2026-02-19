# Sprint 1: Foundation — Auth, Tenant, App Shell

**Sprint Goal:** A user can sign up, configure their business profile, log in, and see a working app shell with sidebar navigation and RBAC-protected routes.

**Scope:** Backend API (NestJS) + Database (Prisma/PostgreSQL) + Frontend app shell (Next.js) — fully wired end-to-end.

**Stories Included:** E1-S1, E1-S2, E1-S8, E2-S1, E2-S2, E2-S3, E2-S4, E2-S5, E2-S6, E2-S7, E2-S10

---

## Sprint Outcome

By the end of this sprint, the following works end-to-end:

```
1. Visit /signup → register organization → email verified → redirected to business profile setup
2. Fill business profile (company name, IEC, GSTIN, logo, bank details) → saved
3. Configure financial year → saved
4. Log in with email/password → receive JWT → land on dashboard (empty shell)
5. Navigate sidebar: Dashboard, Exports, Imports, Payments, Reports, Settings
6. Settings > Users → invite user via email → invited user signs up with assigned role
7. Settings > Users → view permission matrix → change role → deactivate user
8. RBAC enforced: Export Manager cannot access Settings, Data Entry cannot delete, Viewer is read-only
9. Profile page: edit name, phone, avatar, change password
10. Forgot password flow: email → reset link → new password
```

---

## Implementation Tasks

### Task 1: Backend Project Setup

**Description:** Initialize the NestJS backend in `apps/api/` with project structure, configuration, and database connection.

**Subtasks:**
- [ ] 1.1 Scaffold NestJS app in `apps/api/` with TypeScript, ESLint
- [ ] 1.2 Add to Turborepo pipeline (`turbo.json`, `pnpm-workspace.yaml`)
- [ ] 1.3 Set up environment config module (`.env` → `ConfigModule`)
  - `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRY`, `SMTP_*`, `APP_URL`
- [ ] 1.4 Set up Prisma in `packages/db/`
  - Prisma client, migration scripts, seed command
- [ ] 1.5 Docker Compose for local PostgreSQL + Redis
  - `docker-compose.yml` at repo root
  - PostgreSQL 16, Redis 7
- [ ] 1.6 Health check endpoint: `GET /api/health`
- [ ] 1.7 Global exception filter, response interceptor (standardized API responses)
- [ ] 1.8 Request validation pipe (class-validator or Zod)

**Files to create:**
```
apps/api/
  src/
    main.ts
    app.module.ts
    app.controller.ts
    common/
      filters/http-exception.filter.ts
      interceptors/response.interceptor.ts
      pipes/validation.pipe.ts
      decorators/
  nest-cli.json
  tsconfig.json
  .env.example
packages/db/
  prisma/
    schema.prisma
    seed.ts
  package.json
docker-compose.yml
```

**Depends on:** Nothing (foundational)

---

### Task 2: Database Schema — Auth & Tenant

**Description:** Design and create the Prisma schema for multi-tenant auth, users, roles, and business profiles.

**Subtasks:**
- [ ] 2.1 Design schema for the following models:

```prisma
model Tenant {
  id             String   @id @default(cuid())
  name           String
  slug           String   @unique
  status         TenantStatus @default(TRIAL)
  plan           Plan     @default(STARTER)
  trialEndsAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  businessProfile BusinessProfile?
  users           User[]
  invitations     Invitation[]
}

model BusinessProfile {
  id              String   @id @default(cuid())
  tenantId        String   @unique
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  companyName     String
  registeredAddress String?
  communicationAddress String?
  iecNumber       String?
  gstin           String?
  pan             String?
  logoUrl         String?
  signatureUrl    String?
  signatoryName   String?
  signatoryDesignation String?
  financialYearStartMonth Int @default(4)  // April
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model BankAccount {
  id          String   @id @default(cuid())
  tenantId    String
  bankName    String
  branch      String?
  accountNumber String
  ifscCode    String?
  swiftCode   String?
  accountType AccountType @default(CURRENT)
  currency    String   @default("INR")
  isDefaultExport Boolean @default(false)
  isDefaultImport Boolean @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model User {
  id           String   @id @default(cuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  email        String   @unique
  passwordHash String
  displayName  String
  phone        String?
  avatarUrl    String?
  role         UserRole @default(VIEWER)
  status       UserStatus @default(ACTIVE)
  lastLoginAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Invitation {
  id        String   @id @default(cuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  email     String
  role      UserRole
  token     String   @unique
  expiresAt DateTime
  status    InvitationStatus @default(PENDING)
  invitedBy String
  createdAt DateTime @default(now())
}

model Session {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  refreshToken String  @unique
  device      String?
  ip          String?
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String?
  action    String      // CREATE, UPDATE, DELETE, LOGIN, LOGOUT
  module    String      // AUTH, USER, SETTINGS, etc.
  entity    String?     // "Invoice #42"
  details   Json?
  ip        String?
  createdAt DateTime @default(now())
}

enum TenantStatus { TRIAL, ACTIVE, EXPIRED, SUSPENDED }
enum Plan { STARTER, PROFESSIONAL, ENTERPRISE }
enum UserRole { ADMIN, ACCOUNTANT, EXPORT_MANAGER, IMPORT_MANAGER, SALES_MANAGER, PURCHASE_MANAGER, INVENTORY_MANAGER, DATA_ENTRY, VIEWER }
enum UserStatus { ACTIVE, INACTIVE }
enum InvitationStatus { PENDING, ACCEPTED, EXPIRED }
enum AccountType { CURRENT, SAVINGS }
```

- [ ] 2.2 Create initial migration: `pnpm --filter @exim/db migrate dev --name init`
- [ ] 2.3 Seed script: create a Super Admin user, seed Incoterms, seed UOMs
- [ ] 2.4 Multi-tenant middleware: extract `tenantId` from JWT, inject into all queries

**Depends on:** Task 1

---

### Task 3: Authentication Module

**Description:** Implement signup, login, JWT tokens, password reset — the complete auth flow.

**Subtasks:**
- [ ] 3.1 **Auth module** (`apps/api/src/modules/auth/`)
  - `auth.module.ts`, `auth.controller.ts`, `auth.service.ts`

- [ ] 3.2 **POST /api/auth/signup** — Tenant registration
  - Input: `{ companyName, email, password, phone }`
  - Creates: Tenant (status=TRIAL, trialEndsAt=+14 days) + User (role=ADMIN)
  - Sends: verification email with OTP
  - Returns: `{ message: "Verification email sent" }`

- [ ] 3.3 **POST /api/auth/verify-email** — Email OTP verification
  - Input: `{ email, otp }`
  - Marks user as verified
  - Returns: JWT access + refresh tokens

- [ ] 3.4 **POST /api/auth/login** — Login
  - Input: `{ email, password }`
  - Validates credentials, checks account status
  - Account lockout after 5 failed attempts (15 min cooldown)
  - Creates Session record
  - Returns: `{ accessToken, refreshToken, user, tenant }`

- [ ] 3.5 **POST /api/auth/refresh** — Refresh token
  - Input: `{ refreshToken }`
  - Validates refresh token, checks Session
  - Returns: new `{ accessToken, refreshToken }`

- [ ] 3.6 **POST /api/auth/forgot-password** — Request password reset
  - Input: `{ email }`
  - Sends reset link (token valid 1 hour, single-use)
  - Returns: `{ message: "Reset link sent" }`

- [ ] 3.7 **POST /api/auth/reset-password** — Reset password
  - Input: `{ token, newPassword }`
  - Validates token, updates password, invalidates all sessions
  - Returns: `{ message: "Password reset successful" }`

- [ ] 3.8 **JWT Guard** — `@UseGuards(JwtAuthGuard)` for protected routes
  - Extracts user + tenantId from token
  - Attaches to `request.user`

- [ ] 3.9 **Roles Guard** — `@Roles(UserRole.ADMIN)` decorator + guard
  - Checks `request.user.role` against allowed roles
  - Returns 403 if unauthorized

- [ ] 3.10 Password hashing with bcrypt (12 rounds)

**API Contracts:**
```
POST /api/auth/signup         → 201 { message }
POST /api/auth/verify-email   → 200 { accessToken, refreshToken, user }
POST /api/auth/login          → 200 { accessToken, refreshToken, user, tenant }
POST /api/auth/refresh        → 200 { accessToken, refreshToken }
POST /api/auth/forgot-password → 200 { message }
POST /api/auth/reset-password  → 200 { message }
POST /api/auth/logout          → 200 { message }
```

**Depends on:** Task 2

---

### Task 4: Tenant & Business Profile Module

**Description:** API for business profile setup, financial year config, and tenant settings.

**Subtasks:**
- [ ] 4.1 **Tenant module** (`apps/api/src/modules/tenant/`)

- [ ] 4.2 **GET /api/tenant/profile** — Get business profile
  - Returns current tenant's business profile
  - Includes bank accounts

- [ ] 4.3 **PUT /api/tenant/profile** — Update business profile
  - Input: all business profile fields (partial update)
  - Validates: IEC (10 digits), GSTIN (15 chars + checksum), PAN format
  - Audit log entry

- [ ] 4.4 **POST /api/tenant/profile/logo** — Upload logo
  - Accept PNG/JPG, max 2MB
  - Store in local filesystem (S3 in production)
  - Returns URL

- [ ] 4.5 **POST /api/tenant/profile/signature** — Upload signature
  - Same as logo upload

- [ ] 4.6 **PUT /api/tenant/settings** — Update financial year and other settings
  - Input: `{ financialYearStartMonth }`
  - Restricted to ADMIN role

- [ ] 4.7 **CRUD for bank accounts**
  ```
  GET    /api/tenant/bank-accounts
  POST   /api/tenant/bank-accounts
  PUT    /api/tenant/bank-accounts/:id
  DELETE /api/tenant/bank-accounts/:id
  ```

**Depends on:** Task 3 (needs auth)

---

### Task 5: User Management Module

**Description:** User CRUD, invitation flow, role management, session management, and audit logs.

**Subtasks:**
- [ ] 5.1 **Users module** (`apps/api/src/modules/users/`)

- [ ] 5.2 **GET /api/users** — List tenant users
  - Returns: users with role, status, last login
  - Restricted to ADMIN role

- [ ] 5.3 **POST /api/users/invite** — Invite user
  - Input: `{ email, role }`
  - Generates invitation token (UUID)
  - Sends invitation email with signup link
  - Creates Invitation record (expires 7 days)
  - Duplicate check: same email within tenant
  - Restricted to ADMIN role

- [ ] 5.4 **POST /api/auth/accept-invite** — Accept invitation
  - Input: `{ token, displayName, password }`
  - Validates token (not expired, not used)
  - Creates User with assigned role
  - Marks invitation as ACCEPTED
  - Returns: JWT tokens

- [ ] 5.5 **PUT /api/users/:id/role** — Change user role
  - Input: `{ role }`
  - Cannot change own role
  - Restricted to ADMIN
  - Audit log entry

- [ ] 5.6 **PUT /api/users/:id/status** — Activate/deactivate user
  - Input: `{ status: ACTIVE | INACTIVE }`
  - Cannot deactivate self
  - Cannot deactivate last ADMIN
  - Deactivated user's sessions invalidated
  - Audit log entry

- [ ] 5.7 **DELETE /api/users/:id** — Remove user
  - Cannot delete self or last ADMIN
  - Soft-delete (or hard delete user, retain audit logs)
  - Restricted to ADMIN

- [ ] 5.8 **GET /api/users/me** — Get current user profile
- [ ] 5.9 **PUT /api/users/me** — Update own profile (name, phone, avatar)
- [ ] 5.10 **PUT /api/users/me/password** — Change own password
  - Input: `{ currentPassword, newPassword }`
  - Validates current password

- [ ] 5.11 **GET /api/users/permissions** — Get permission matrix
  - Returns: roles × modules matrix (read-only in v1)
  - Hardcoded permission matrix served from constant

- [ ] 5.12 **GET /api/sessions** — List active sessions (ADMIN)
- [ ] 5.13 **DELETE /api/sessions/:id** — Force logout a session (ADMIN)

- [ ] 5.14 **GET /api/audit-logs** — Query audit logs
  - Filters: userId, module, action, dateRange
  - Paginated
  - Restricted to ADMIN and VIEWER roles

**Depends on:** Task 3

---

### Task 6: Frontend — App Shell & Layout

**Description:** Build the main application layout with sidebar navigation, header, and route structure in Next.js.

**Subtasks:**
- [ ] 6.1 **App layout** (`apps/web/app/(dashboard)/layout.tsx`)
  - Ant Design `Layout` with `Sider` + `Header` + `Content`
  - Sidebar: logo, navigation menu, collapse toggle
  - Header: breadcrumbs, user avatar dropdown (profile, logout)
  - Responsive: sidebar collapses to icons on small screens

- [ ] 6.2 **Sidebar navigation**
  - Menu items with icons:
    - Dashboard (`DashboardOutlined`)
    - Exports (`ExportOutlined`) → submenu: Invoices, Proforma, Shipping Bills, Certificates
    - Imports (`ImportOutlined`) → submenu: Purchase Orders, Bills of Entry, Suppliers
    - Payments (`DollarOutlined`) → submenu: Receivables, Payables, Bank Reconciliation
    - Reports (`BarChartOutlined`)
    - Settings (`SettingOutlined`) → submenu: Business Profile, Users, Templates, Bank Accounts
  - Active item highlighted using route matching
  - Role-based visibility: Settings only for ADMIN, etc.

- [ ] 6.3 **Route structure**
  ```
  app/
    (auth)/
      login/page.tsx
      signup/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx
      accept-invite/page.tsx
    (dashboard)/
      layout.tsx              ← App shell (sidebar, header)
      page.tsx                ← Dashboard
      exports/
        invoices/page.tsx
        proforma/page.tsx
        shipping-bills/page.tsx
      imports/
        purchase-orders/page.tsx
        bills-of-entry/page.tsx
      payments/
        receivables/page.tsx
        payables/page.tsx
      reports/page.tsx
      settings/
        profile/page.tsx
        users/page.tsx
        templates/page.tsx
        bank-accounts/page.tsx
  ```

- [ ] 6.4 **Auth context/store** (Zustand)
  - State: `user`, `tenant`, `accessToken`, `isAuthenticated`
  - Actions: `login()`, `logout()`, `refreshToken()`
  - Persist tokens in `localStorage` (access) and `httpOnly cookie` (refresh)
  - Auto-refresh before token expiry

- [ ] 6.5 **Auth middleware** (Next.js middleware)
  - Redirect unauthenticated users to `/login`
  - Redirect authenticated users away from `/login`, `/signup`
  - Check role for protected routes (e.g., `/settings/*` → ADMIN only)

- [ ] 6.6 **API client** (`packages/ui/` or `apps/web/lib/`)
  - Axios or fetch wrapper with:
    - Base URL from env
    - Auto-attach JWT Authorization header
    - Auto-refresh on 401
    - Standardized error handling

- [ ] 6.7 **Loading and error states**
  - Global loading spinner (on route transitions)
  - Error boundary with fallback UI
  - 404 page, 403 (unauthorized) page

**Depends on:** Task 1 (for API types)

---

### Task 7: Frontend — Auth Pages

**Description:** Implement signup, login, forgot password, reset password, and invitation acceptance pages.

**Subtasks:**
- [ ] 7.1 **Signup page** (`/signup`)
  - Form: company name, email, phone, password, confirm password
  - Password strength indicator
  - "Already have an account? Log in" link
  - Submit → call `POST /api/auth/signup` → redirect to OTP verification

- [ ] 7.2 **Email verification page** (`/verify`)
  - OTP input (6 digits)
  - Resend OTP link (60 second cooldown)
  - Submit → call `POST /api/auth/verify-email` → store tokens → redirect to `/settings/profile` (setup wizard)

- [ ] 7.3 **Login page** (`/login`)
  - Form: email, password, "Remember me" checkbox
  - "Forgot password?" link
  - Submit → call `POST /api/auth/login` → store tokens → redirect to dashboard
  - Error handling: invalid credentials, account locked, account inactive

- [ ] 7.4 **Forgot password page** (`/forgot-password`)
  - Form: email
  - Submit → call `POST /api/auth/forgot-password` → show success message

- [ ] 7.5 **Reset password page** (`/reset-password?token=xxx`)
  - Form: new password, confirm password
  - Token validation on page load
  - Submit → call `POST /api/auth/reset-password` → redirect to login

- [ ] 7.6 **Accept invitation page** (`/accept-invite?token=xxx`)
  - Show: organization name, assigned role
  - Form: display name, password, confirm password
  - Submit → call `POST /api/auth/accept-invite` → store tokens → redirect to dashboard

**Depends on:** Task 3 (API), Task 6 (layout)

---

### Task 8: Frontend — Settings Pages (Business Profile, Users)

**Description:** Settings pages for business profile setup and user management.

**Subtasks:**
- [ ] 8.1 **Business profile page** (`/settings/profile`)
  - Form sections:
    - Company Information: name, registered address, communication address
    - Trade Registrations: IEC, GSTIN, PAN (with format validation + visual feedback)
    - Branding: logo upload (drag-drop), signature upload
    - Signatory: name, designation
    - Financial Year: start month selector, year format preview
  - Auto-save on field blur (debounced) or explicit "Save" button
  - Success/error toast notifications

- [ ] 8.2 **Bank accounts page** (`/settings/bank-accounts`)
  - Table: bank name, account number, IFSC, SWIFT, type, currency, default flags
  - Add/edit via drawer form
  - Delete with confirmation
  - "Set as default for exports" / "Set as default for imports" toggle

- [ ] 8.3 **Users page** (`/settings/users`)
  - Table: name, email, role, status, last login, actions
  - "Invite User" button → modal: email, role selector
  - Row actions: change role (dropdown), deactivate/activate (toggle), remove (with confirmation)
  - Pending invitations section: email, role, sent date, status, resend/cancel actions
  - ADMIN only (enforced by middleware + API)

- [ ] 8.4 **Permission matrix page** (`/settings/users/permissions`)
  - Read-only matrix table
  - Rows: modules (Dashboard, Exports, Imports, Payments, Reports, Settings, Users)
  - Columns: roles (Admin through Viewer)
  - Cells: Full / Create-Edit / View / No Access (color-coded)
  - Link from Users page: "View permission matrix"

- [ ] 8.5 **User profile page** (`/profile`)
  - Form: display name, phone, avatar upload
  - Change password section (current + new + confirm)
  - Session list: device, IP, last active (own sessions)

**Depends on:** Task 4, Task 5 (APIs), Task 6 (layout)

---

### Task 9: Email Service Setup

**Description:** Set up transactional email for auth flows (verification, invitation, password reset).

**Subtasks:**
- [ ] 9.1 **Email module** (`apps/api/src/modules/email/`)
  - Nodemailer with SMTP config (or AWS SES)
  - Queue emails via BullMQ (non-blocking)

- [ ] 9.2 **Email templates** (HTML)
  - Verification OTP email
  - User invitation email (with accept link)
  - Password reset email (with reset link)
  - Welcome email (after signup complete)

- [ ] 9.3 **Email templates** use React Email (in `packages/email/`)
  - Branded with EXIM logo
  - Responsive HTML

**Depends on:** Task 1 (Redis for BullMQ)

---

### Task 10: Testing & Verification

**Description:** Verify the entire sprint works end-to-end.

**Subtasks:**
- [ ] 10.1 **API tests** (Vitest or Jest)
  - Auth flow: signup → verify → login → refresh → logout
  - User management: invite → accept → role change → deactivate
  - Business profile: create → update → upload logo
  - RBAC: verify 403 for unauthorized routes

- [ ] 10.2 **E2E smoke test** (manual or Playwright)
  - Full signup flow in browser
  - Login, navigate sidebar, check route protection
  - Invite user, accept invitation
  - Business profile setup

- [ ] 10.3 **Verify the following work:**
  - [ ] Docker Compose: `docker compose up` starts PostgreSQL + Redis
  - [ ] Backend: `pnpm --filter api dev` starts NestJS on port 3001
  - [ ] Database: `pnpm --filter @exim/db migrate dev` runs migrations
  - [ ] Frontend: `pnpm --filter web dev` starts Next.js on port 3000
  - [ ] Storybook: `pnpm storybook` still works with new components
  - [ ] Build: `pnpm build` succeeds for all packages

---

## Dependency Graph

```
Task 1: Backend Setup
  │
  ├──→ Task 2: Database Schema
  │      │
  │      ├──→ Task 3: Auth Module ──→ Task 5: User Management
  │      │      │
  │      │      └──→ Task 4: Tenant/Profile Module
  │      │
  │      └──→ Task 9: Email Service
  │
  └──→ Task 6: App Shell & Layout
         │
         ├──→ Task 7: Auth Pages
         │
         └──→ Task 8: Settings Pages
                │
                └──→ Task 10: Testing & Verification
```

## Execution Order for AI Coding Assistant

The recommended sequence to execute these tasks:

| Order | Task | Rationale |
|---|---|---|
| 1 | Task 1: Backend Setup | Foundation — everything depends on this |
| 2 | Task 2: Database Schema | Schema must exist before any API code |
| 3 | Task 9: Email Service | Needed by auth (can be stubbed initially) |
| 4 | Task 3: Auth Module | Core API — signup, login, JWT |
| 5 | Task 4: Tenant Module | Business profile API |
| 6 | Task 5: User Management | Invite, RBAC, sessions, audit |
| 7 | Task 6: App Shell | Frontend layout, routing, auth state |
| 8 | Task 7: Auth Pages | Signup, login, reset password UI |
| 9 | Task 8: Settings Pages | Profile, users, permissions UI |
| 10 | Task 10: Testing | Verify everything works |

**Note:** Tasks 6-8 (frontend) can be started in parallel with Tasks 3-5 (backend) if API contracts are defined upfront. The AI assistant should generate TypeScript API types in `packages/shared/` first, then implement backend and frontend against those types.

---

## Stories Covered

| Story | Description | Epic | Covered by Task |
|---|---|---|---|
| E1-S1 | Tenant Registration | E1 | Task 2, 3, 7 |
| E1-S2 | Business Profile Setup | E1 | Task 2, 4, 8 |
| E1-S8 | Financial Year Configuration | E1 | Task 4, 8 |
| E2-S1 | Invite User via Email | E2 | Task 5, 8, 9 |
| E2-S2 | Role Assignment | E2 | Task 5, 8 |
| E2-S3 | Permission Matrix View | E2 | Task 5, 8 |
| E2-S4 | User Profile Management | E2 | Task 5, 8 |
| E2-S5 | Deactivate / Remove User | E2 | Task 5, 8 |
| E2-S6 | Authentication — Login | E2 | Task 3, 7 |
| E2-S7 | Authentication — Forgot Password | E2 | Task 3, 7, 9 |
| E2-S10 | Settings Access Control | E2 | Task 3, 6 |

---

## Not in Sprint 1 (Deferred)

| Story | Reason |
|---|---|
| E1-S3 Multi-Branch | Nice-to-have, adds complexity to schema |
| E1-S4 Subscription Plans | Payment gateway integration, not needed for dev |
| E1-S5 Subscription Management | Depends on E1-S4 |
| E1-S6 Platform Admin Dashboard | Super Admin scope, not MVP-critical |
| E1-S7 Platform Admin Analytics | Super Admin scope |
| E2-S8 Session Management | Lower priority, basic sessions exist |
| E2-S9 User Activity Log | Audit log infra in place, UI deferred |

---

## Definition of Done

- [ ] All APIs return correct responses (200/201/400/401/403)
- [ ] JWT auth works with access + refresh token flow
- [ ] RBAC guards enforced on backend (not just UI hiding)
- [ ] Frontend routes protected by auth middleware
- [ ] Business profile form saves and loads data
- [ ] User invitation sends email and accept flow works
- [ ] Sidebar navigation renders based on user role
- [ ] Database migrations run cleanly on fresh PostgreSQL
- [ ] `pnpm build` succeeds for all packages
- [ ] No TypeScript errors across the monorepo

---

**Document Version:** 1.0
**Last Updated:** February 2026
