# UX/UI Gap Analysis — EXIM Platform

**Date:** February 2026
**Status:** Partially resolved — P0/P2/P3/P4 items addressed; P1 items deferred to Sprint 2
**Scope:** Sprint 1 implementation review

---

## What's Working Well

### Design System — Strong Foundation
- Token-driven architecture (colors, spacing, typography, shadows) in `packages/ui/src/tokens/` is clean and maintainable
- Module accent colors (Export=Emerald, Import=Orange, Finance=Violet, Shipping=Cyan) give instant visual context
- Ant Design choice is correct for this domain — tables, complex forms, enterprise components are built-in
- 8 components + Storybook stories are well-structured for the 10 personas defined

### Auth Flow — Clean and Complete
- Login, Signup, Verify Email, Forgot/Reset Password, Accept Invite are all built
- Suspense boundaries, loading states, error toasts handled correctly
- Zustand auth store + Axios interceptor with auto-refresh is solid architecture

---

## Gaps & Issues

### P0 — Must Fix Immediately

#### 1. Root Redirect Loop
**File:** `apps/web/app/page.tsx`
**Issue:** When a token exists, the page redirects to `/` — which is itself, causing an infinite loop.
```ts
// Bug
if (token) router.replace('/');  // redirects back to itself!

// Fix
if (token) router.replace('/dashboard');  // or any named dashboard route
```

#### 2. No `apps/web/.env.example`
**Issue:** `NEXT_PUBLIC_API_URL` env variable has no documented default or example for local dev.
**Fix:** Create `apps/web/.env.example` with:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

### P1 — Core UX Flows Missing

#### 3. No Onboarding Wizard After Signup
**Issue:** Per E1-S1, after email verification users should land on a guided business profile setup wizard. Currently `verify-email` redirects to `/settings/profile` — a flat, unsectioned form with no progress indicator or guidance for first-time users.

**Recommended multi-step wizard flow:**
```
Step 1 → Company Info (name, registered address, communication address)
Step 2 → Trade Registrations (IEC, GSTIN, PAN) — with format validation hints
Step 3 → Bank Account (at least one required)
Step 4 → Invite Team Members (optional, skippable)
         ↓
       Dashboard (with real data or empty state)
```

**Files to create/modify:**
- `apps/web/app/(onboarding)/layout.tsx`
- `apps/web/app/(onboarding)/setup/page.tsx` (multi-step wizard)
- Or implement as a multi-step form in `apps/web/app/(dashboard)/settings/profile/page.tsx` with a `isFirstTime` query param

#### 4. Dashboard Shows Hardcoded Mock Data
**File:** `apps/web/app/(dashboard)/page.tsx`
**Issue:** All KPI values (`"$2.4M"`, `"23"`) and document cards are static strings. A new tenant with zero data sees fabricated numbers — this is misleading and erodes trust.

**Fix:**
- Connect StatCards to a real `/api/dashboard/stats` API endpoint
- Replace DocumentCard hardcoded data with `/api/documents/recent`
- Show EmptyState when a new tenant has no documents yet

#### 5. No Notification / Feedback System
**Issue:** `message.error()` toasts exist, but no:
- Persistent notification center (bell icon in AppHeader)
- In-app alerts for expiring LUTs, pending documents, overdue payments
- Success toasts on save (profile, bank accounts, etc.)

**Required for actors:** Accountant (E2-S7 compliance alerts), Export Manager (LUT/certificate expiry), Admin (subscription/user events)

---

### P2 — Design System Gaps

#### 6. Missing Components for Document Workflows

| Component | Purpose | Priority |
|---|---|---|
| `LineItemTable` | Invoice/PO line items — add/remove rows, auto-calc totals | High |
| `DrawerForm` | Side drawer for add/edit (bank accounts, users, line items) | High |
| `ConfirmationModal` | Delete/deactivate with impact summary (E2-S5 requirement) | High |
| `StatusTimeline` | Document lifecycle: Draft → Filed → Assessed → Cleared → Shipped | Medium |
| `SkeletonCard` | Loading state for StatCard and DocumentCard | Medium |
| `FormSection` | Sectioned form wrapper with title + divider (Business Profile has 4 sections) | Medium |
| `FilterBar` | Search + status filter + date range for tables | Medium |

#### 7. EmptyState Is Too Generic
**File:** `packages/ui/src/components/EmptyState.tsx`
**Issue:** Single variant used for all empty conditions. Needs distinct types.

**Fix — add `type` prop:**
```tsx
type: 'no-data'       → InboxOutlined,            "No items yet",          CTA button
type: 'no-results'    → SearchOutlined,            "No matching results",   "Clear filters" action
type: 'no-permission' → LockOutlined,              "You don't have access to this"
type: 'error'         → ExclamationCircleOutlined, "Something went wrong",  Retry button
```

#### 8. StatCard Has No Loading / Skeleton State
**File:** `packages/ui/src/components/StatCard.tsx`
**Issue:** When dashboard API call is in-flight, 4 blank StatCards flash in. Jarring for users.
**Fix:** Add a `loading?: boolean` prop that renders an `antd Skeleton` inside the card.

---

### P3 — Accessibility & Responsiveness

#### 9. Icon-Only Buttons Missing `aria-label`
**File:** `apps/web/app/(dashboard)/settings/users/page.tsx`, `settings/bank-accounts/page.tsx`
**Issue:** `<Button icon={<DeleteOutlined />} />` and `<Button icon={<EditOutlined />} />` have no accessible label. Screen readers announce "button" with no context.
**Fix:** Add `aria-label` to all icon-only buttons:
```tsx
<Button icon={<DeleteOutlined />} aria-label="Delete bank account" />
```

#### 10. Dashboard Not Responsive on Mobile
**File:** `apps/web/app/(dashboard)/page.tsx`
**Issue:** `<Col span={6}>` for StatCards = 4 equal columns. On screens < 768px these become unusably narrow.
**Fix:** Use Ant Design responsive breakpoints:
```tsx
<Col xs={24} sm={12} lg={6}>  {/* Full → 2-col → 4-col */}
```
Same pattern needed for the 3-column DocumentCards row.

#### 11. Sidebar Active State — Exact Match Only
**File:** `apps/web/components/sidebar.tsx`
**Issue:** `selectedKeys={[pathname]}` only matches exact paths. Visiting `/exports/invoices/42` won't highlight the Invoices menu item in the sidebar.
**Fix:** Compute selected key by matching the longest prefix:
```ts
const selectedKey = menuKeys.find(k => pathname.startsWith(k)) || pathname;
```

#### 12. Sidebar Has No Mobile Behavior
**File:** `apps/web/components/sidebar.tsx`
**Issue:** Sidebar uses `position: fixed, width: 240px`. On screens < 768px this overlays the content area with no way to close it on mobile.
**Fix:** Use Ant Design `Drawer` on mobile, `Sider` on desktop. Toggle via hamburger icon in `AppHeader`.

---

### P4 — UX Polish

#### 13. Role Change in Users Table Is Risky
**File:** `apps/web/app/(dashboard)/settings/users/page.tsx`
**Issue:** Role change `<Select>` fires the API immediately on change with no confirmation. A mis-click changes a user's permissions silently.
**Fix:** Either:
- Add a confirmation modal: "Change Anil's role from Export Manager to Admin?"
- Or move role editing into a user detail drawer with explicit Save button

#### 14. Business Profile — No Field Format Guidance
**File:** `apps/web/app/(dashboard)/settings/profile/page.tsx`
**Issue:** IEC (10 digits), GSTIN (15 chars, specific format), PAN (ABCDE1234F) have complex formats. Currently just placeholder text. Users won't know if they've entered it correctly until they hit save.
**Fix:**
- Add format hint below each field: *Format: AABCE1234D*
- Real-time validation as user types (regex check)
- GSTIN checksum validation (algorithm is publicly documented)
- Visual ✓ or ✗ icon at field end when valid/invalid

#### 15. Permission Matrix Should Not Call API
**File:** `apps/web/app/(dashboard)/settings/users/permissions/page.tsx`
**Issue:** This page fetches `GET /api/users/permissions` on every visit, but the data is a static hardcoded constant on the backend. Unnecessary network round-trip.
**Fix:** Import the permission matrix directly from `@exim/shared` constants — no API call needed. Move the `PERMISSION_MATRIX` constant to `packages/shared/src/constants/permissions.ts`.

#### 16. Settings > Bank Accounts Uses Modal, Users Page Uses Modal
**Issue:** Both pages open add/edit in a Modal. For complex forms, a right-side Drawer is better UX — keeps context visible.
**Fix:** Standardize on `DrawerForm` component (see item #6) for all add/edit flows in settings.

---

## Component Improvements Backlog

| Component | Improvement |
|---|---|
| `Button` | Add `size="large"` variant story in Storybook |
| `CurrencyDisplay` | Add `compact` prop for K/M/L/Cr notation (`$2.4M`, `₹45.2L`) |
| `StatusBadge` | Add `dot` variant (small colored dot, no text) for compact table views |
| `DocumentCard` | Add `skeleton` loading variant |
| `StatCard` | Add `loading` prop with Skeleton |
| `DataTable` | Add `FilterBar` slot above table |
| `PageHeader` | Add `tabs` prop for tabbed page navigation (needed for invoice detail pages) |
| `EmptyState` | Add `type` variants (see item #7) |

---

## Information Architecture Notes

### URL Structure (as implemented)
```
/                         → Redirect to /login or dashboard
/(auth)/
  login/                  → Login page
  signup/                 → Signup page
  verify-email/           → Email verification
  forgot-password/        → Request reset link
  reset-password/         → Set new password
  accept-invite/          → Accept team invitation
/(dashboard)/
  page.tsx                → Dashboard (hardcoded data — needs API)
  exports/
    invoices/             → Coming soon
    proforma/             → Coming soon
    shipping-bills/       → Coming soon
  imports/
    purchase-orders/      → Coming soon
    bills-of-entry/       → Coming soon
  payments/
    receivables/          → Coming soon
    payables/             → Coming soon
  reports/                → Coming soon
  settings/
    profile/              → Business profile form (implemented)
    users/                → Users table (implemented)
    users/permissions/    → Permission matrix (implemented, needs refactor)
    bank-accounts/        → Bank accounts CRUD (implemented)
    templates/            → Coming soon
```

### Missing Routes
- `/profile` — User's own profile (name, phone, avatar, change password, own sessions)
- `/notifications` — Notification center
- `/dashboard` — Named route (to fix redirect loop)

---

## Priority Matrix

Legend: ✅ Fixed | 🔲 Pending

| ID | Issue | Priority | Effort | Impact | Status |
|---|---|---|---|---|---|
| 1 | Root redirect loop | P0 | XS | High | ✅ Fixed — `/` → `/dashboard`; named route created |
| 2 | `.env.example` missing | P0 | XS | Medium | ✅ Fixed — `apps/web/.env.example` created |
| 3 | Onboarding wizard | P1 | L | Very High | 🔲 Sprint 2 |
| 4 | Dashboard mock data → real API | P1 | M | High | 🔲 Sprint 2 |
| 5 | Notification system | P1 | L | High | 🔲 Sprint 3 |
| 6 | Missing components (DrawerForm, ConfirmationModal, etc.) | P2 | L | High | 🔲 Sprint 2 |
| 7 | EmptyState type variants | P2 | S | Medium | ✅ Fixed — `type` prop: `no-data`, `no-results`, `no-permission`, `error` |
| 8 | StatCard skeleton loading | P2 | S | Medium | ✅ Fixed — `loading` prop with `antd Skeleton` |
| 9 | `aria-label` on icon buttons | P3 | XS | Medium | ✅ Fixed — bank accounts + users pages |
| 10 | Dashboard mobile responsiveness | P3 | S | High | ✅ Fixed — `xs/sm/lg` breakpoints on all Col components |
| 11 | Sidebar active state prefix match | P3 | S | Medium | ✅ Fixed — `findSelectedKey` uses longest-prefix match |
| 12 | Sidebar mobile drawer behavior | P3 | M | High | 🔲 Sprint 2 |
| 13 | Role change confirmation | P4 | S | High | ✅ Fixed — confirmation Modal before API call fires |
| 14 | IEC/GSTIN/PAN format validation | P4 | S | Medium | ✅ Fixed — regex validators + format hints + AD Code added |
| 15 | Permission matrix — remove API call | P4 | XS | Low | ✅ Fixed — imports `PERMISSION_MATRIX` from `@exim/shared` |
| 16 | Modal → Drawer for settings forms | P4 | S | Medium | 🔲 Sprint 2 (needs `DrawerForm` component) |

**Effort key:** XS = <1h, S = 1–4h, M = 4–8h, L = >8h

### Files Modified in This Pass

| File | Change |
|---|---|
| `apps/web/app/page.tsx` | Fixed redirect loop: `/` → `/dashboard` |
| `apps/web/app/(dashboard)/page.tsx` | Converted to server-side redirect to `/dashboard` |
| `apps/web/app/(dashboard)/dashboard/page.tsx` | New named dashboard route with responsive Col breakpoints |
| `apps/web/.env.example` | Created with `NEXT_PUBLIC_API_URL` |
| `apps/web/components/sidebar.tsx` | Dashboard key → `/dashboard`; prefix-match active state |
| `apps/web/app/(dashboard)/settings/bank-accounts/page.tsx` | `aria-label` on Edit/Delete icon buttons |
| `apps/web/app/(dashboard)/settings/users/page.tsx` | `aria-label` on Remove button; role change confirmation Modal |
| `apps/web/app/(dashboard)/settings/profile/page.tsx` | IEC/GSTIN/PAN/AD Code validators + format hints |
| `apps/web/app/(dashboard)/settings/users/permissions/page.tsx` | Removed API call; imports directly from `@exim/shared` |
| `packages/ui/src/components/EmptyState.tsx` | Added `type` prop with 4 variants and semantic icon/colors |
| `packages/ui/src/components/StatCard.tsx` | Added `loading` prop with `antd Skeleton` |
| `packages/shared/src/constants/permissions.ts` | New file — `PERMISSION_MATRIX`, `ALL_ROLES`, `ALL_MODULES` |
| `packages/shared/src/index.ts` | Exports `permissions.ts` constants |

---

## When to Revisit

- **Before Sprint 2:** Fix all P0 items and design the onboarding wizard (P1 #3)
- **During Sprint 2:** Implement real dashboard APIs, missing components, responsive fixes
- **Sprint 3+:** Notification system, accessibility audit, mobile behavior

---

*Generated from UX/UI review — February 2026*