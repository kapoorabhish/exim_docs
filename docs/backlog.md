# Backlog

Tracks open issues across frontend UX, testing debt, and product gaps.
Immediate fixes (#1, #2, #4, #6, #9) have already been applied.

---

## Testing Debt

> **Process mandate (from Sprint 5 onward):** Every new service, utility, or non-trivial function added in a sprint must include a corresponding `*.spec.ts` unit test file as part of the task's Definition of Done. A task is not complete without passing tests.

### #15 — Unit Test Suite: Infrastructure Setup + Sprints 1–4 Coverage

**Priority:** 🔴 High — must be completed before Sprint 5 feature work begins
**Scope:** Backend API (`apps/api`) and shared utilities (`packages/pdf/src/utils`)
**Sprint assignment:** Sprint 5, Task 0 (prerequisite block)

---

#### Part A — Test Infrastructure Setup

Install and configure the test toolchain in `apps/api`:

```bash
pnpm --filter api add -D jest @types/jest ts-jest @nestjs/testing jest-mock-extended
```

**`apps/api/jest.config.ts`:**
```ts
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@exim/db$': '<rootDir>/../../packages/db/src/index.ts',
    '^@prisma/client$': '<rootDir>/../../node_modules/.prisma/client',
  },
};
export default config;
```

**`apps/api/package.json` — add scripts:**
```json
"test": "jest",
"test:watch": "jest --watch",
"test:cov": "jest --coverage"
```

**Shared test helper** — `src/common/test/prisma-mock.ts`:
```ts
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type PrismaMock = DeepMockProxy<PrismaClient>;

export function createPrismaMock(): PrismaMock {
  return mockDeep<PrismaClient>();
}
```

**Shared fixtures** — `src/common/test/fixtures.ts`:
```ts
// Reusable stub objects for tests (tenantId, userId, sample PI, sample Invoice, etc.)
export const TENANT_ID = 'tenant-001';
export const USER_ID = 'user-001';
export const stubParty = { id: 'party-001', name: 'Test Buyer', country: 'US', ... };
// ... one stub per major entity
```

---

#### Part B — Utility Tests

**File:** `packages/pdf/src/utils/amountToWords.spec.ts`

| Test case | Input | Expected output |
|---|---|---|
| Zero | `0` | `"ZERO US DOLLARS ONLY"` |
| Whole number | `1000` | `"ONE THOUSAND US DOLLARS ONLY"` |
| With cents | `12500.50` | `"TWELVE THOUSAND FIVE HUNDRED US DOLLARS AND FIFTY CENTS ONLY"` |
| Large amount | `1250000.99` | `"ONE MILLION TWO HUNDRED FIFTY THOUSAND US DOLLARS AND NINETY NINE CENTS ONLY"` |
| EUR currency | `500` | `"FIVE HUNDRED EUROS ONLY"` |
| Rounding | `99.999` | rounds to 2 decimal places |

---

#### Part C — `DocNumberService` Unit Tests

**File:** `src/common/services/doc-number.service.spec.ts`

| Method | Test cases |
|---|---|
| `nextPiNumber(tenantId)` | Returns `PI/YYYY-YY/001` on first call; increments to `002` on second |
| `nextInvoiceNumber(tenantId)` | Returns `INV/YYYY-YY/001` on first call |
| `nextPlNumber(tenantId)` | Returns `PL/YYYY-YY/001` |
| Financial year boundary | April = new FY; March = same FY; Dec = same FY as previous April |
| Concurrent safety | Two calls with same tenant get different numbers (mock DB locks) |

---

#### Part D — Auth Service Unit Tests

**File:** `src/modules/auth/auth.service.spec.ts`

| Method | Test cases |
|---|---|
| `register` | Creates tenant + admin user; returns JWT; throws on duplicate email |
| `login` | Returns token on valid credentials; throws `UnauthorizedException` on wrong password |
| `validateUser` | Returns user on valid creds; returns `null` on invalid |
| `verifyEmail` | Marks user `emailVerified = true`; throws on expired/invalid token |
| `forgotPassword` | Sends reset email; throws if email not found |
| `resetPassword` | Updates hashed password; invalidates reset token; throws on expired token |

---

#### Part E — Export Document Service Unit Tests

**File:** `src/modules/exports/proforma/proforma.service.spec.ts`

| Method | Test cases |
|---|---|
| `create` | Creates PI with status `DRAFT`; assigns correct PI number |
| `finalize` | Changes status `DRAFT → FINALIZED`; throws if already FINALIZED |
| `revise` | Creates new version with `version = n+1`, `parentId` set; original stays FINALIZED |
| `convert` | Changes status to `CONVERTED`; creates linked CommercialInvoice (mock) |
| `clone` | Creates new PI with `status = DRAFT`, new piNumber, `date = today`, `version = 1` |
| `delete` | Deletes DRAFT; throws on FINALIZED |

**File:** `src/modules/exports/invoice/invoice.service.spec.ts`

| Method | Test cases |
|---|---|
| `create` | Creates with `DRAFT` status; tenant isolation enforced |
| `finalize` | `DRAFT → FINALIZED`; throws on wrong tenant |
| `lock` | `FINALIZED → LOCKED` |
| `clone` | New invoice with new number, `date = today`, `DRAFT` status; line items copied |
| `documentSet` | Returns aggregated PI, PLs, SBs, BRCs for invoice |
| `register` | Returns paginated list; date range filter applied; status filter applied |
| Tenant isolation | `getById` with wrong tenantId returns null, not another tenant's data |

**File:** `src/modules/exports/packing-list/packing-list.service.spec.ts`

| Method | Test cases |
|---|---|
| `create` | Linked to invoice; status `DRAFT` |
| `finalize` | `DRAFT → FINALIZED` |
| `delete` | Only allowed on `DRAFT` |

**File:** `src/modules/exports/shipping-bill/shipping-bill.service.spec.ts`

| Method | Test cases |
|---|---|
| `create` | Links to invoice |
| `progressStatus` | Valid transitions only: `FILED → UNDER_ASSESSMENT → ASSESSED → LEO → SHIPPED` |
| `progressStatus` | Throws on invalid transition (e.g., `FILED → SHIPPED`) |

---

#### Part F — Sprint 4 Service Unit Tests

**File:** `src/modules/exports/brc/brc.service.spec.ts`

| Method | Test cases |
|---|---|
| `create` | Auto-calculates `inrAmount = foreignAmount × exchangeRate` |
| `markReceived` | Sets `status = RECEIVED`; records `realizationDate` and `brcNumber` |
| Discrepancy check | `foreignAmount` differs from `invoice.totalAmount` by >1% → `discrepancyNotes` set |
| `delete` | Only allowed on `PENDING`; throws on `RECEIVED` |

**File:** `src/modules/exports/bill-of-lading/bill-of-lading.service.spec.ts`

| Method | Test cases |
|---|---|
| `create` | Links to invoice; optional `shippingBillId` |
| `updateStatus` | `ISSUED → SURRENDERED` allowed; `ISSUED → TELEX_RELEASED` allowed |
| `updateStatus` | `SURRENDERED → ISSUED` throws (terminal state) |

**File:** `src/modules/exports/insurance/insurance.service.spec.ts`

| Method | Test cases |
|---|---|
| `create` | Links to invoice; stores `policyNumber`, `sumInsured` |
| `getById` | Throws `NotFoundException` for wrong tenant |

---

#### Part G — Master Data Service Unit Tests

**File:** `src/modules/master-data/party/party.service.spec.ts`

| Method | Test cases |
|---|---|
| `list` | Returns only records for requesting tenantId |
| `create` | Creates with correct tenantId |
| `update` | Updates only own tenant's record |
| `delete` | Removes record; throws if not found or wrong tenant |

**File:** `src/modules/master-data/product/product.service.spec.ts`

| Method | Test cases |
|---|---|
| `list` | Tenant-scoped |
| `create` | Stores HS code, UOM |
| `delete` | Removes only own record |

---

#### Part H — PDF Service Integration Test

**File:** `src/modules/pdf/pdf.service.spec.ts`

These are lightweight integration tests (not full PDF render — just verifying the render pipeline doesn't throw and returns a Buffer):

| Method | Test cases |
|---|---|
| `renderProforma` | Returns a `Buffer` with non-zero length; `content-type` is `application/pdf` |
| `renderInvoice` | Same as above |
| `renderPackingList` | Same as above |
| Error path | Throws `NotFoundException` for unknown `id` |

> Note: Full visual regression testing of PDF output is out of scope for now.

---

#### Summary Table

| # | File | Sprint Source | Priority |
|---|---|---|---|
| 15a | Infrastructure setup | — | Must-have |
| 15b | `amountToWords.spec.ts` | Sprint 4 | Must-have |
| 15c | `doc-number.service.spec.ts` | Sprint 1 | Must-have |
| 15d | `auth.service.spec.ts` | Sprint 1 | Must-have |
| 15e | `proforma.service.spec.ts` | Sprint 3 | Must-have |
| 15e | `invoice.service.spec.ts` | Sprint 3 | Must-have |
| 15e | `packing-list.service.spec.ts` | Sprint 3 | Should-have |
| 15e | `shipping-bill.service.spec.ts` | Sprint 3 | Should-have |
| 15f | `brc.service.spec.ts` | Sprint 4 | Must-have |
| 15f | `bill-of-lading.service.spec.ts` | Sprint 4 | Should-have |
| 15f | `insurance.service.spec.ts` | Sprint 4 | Nice-to-have |
| 15g | `party.service.spec.ts` | Sprint 2 | Should-have |
| 15g | `product.service.spec.ts` | Sprint 2 | Nice-to-have |
| 15h | `pdf.service.spec.ts` (integration) | Sprint 4 | Should-have |

**Target coverage gate:** ≥ 70% statement coverage on `src/modules/**/*.service.ts` before Sprint 5 feature work merges.

---

---

## 🔴 High Priority

### #3 — Replace raw `<Tag>` with `<StatusBadge>` design system component
**Files affected:** All 5 export pages, master-data/parties, master-data/products, admin/tenants
**Problem:** Every page rolls its own `STATUS_COLOR` map and uses raw Ant Design `<Tag color="...">` with hardcoded strings. The design system exports `StatusBadge` from `@exim/ui` which reads from `DocumentStatusConfig` in `@exim/shared`. Any future status color change requires updating 8+ files separately.
**Fix:**
1. Extend `DocumentStatusConfig` in `packages/shared/src/constants/documentStatuses.ts` to cover all document statuses: `DRAFT`, `FINALIZED`, `LOCKED`, `CONVERTED`, `CANCELLED`, `FILED`, `UNDER_ASSESSMENT`, `ASSESSED`, `LEO`, `SHIPPED`, `SUBMITTED`, `ISSUED`
2. Replace every `<Tag color={STATUS_COLOR[s]}>{STATUS_LABELS[s]}</Tag>` with `<StatusBadge status={s} />`
3. Remove all local `STATUS_COLOR` and `STATUS_LABELS` maps

---

### #5 — Add `EmptyState` to all data tables
**Files affected:** All list pages (proforma-invoices, invoices, packing-lists, shipping-bills, parties, products, admin/tenants)
**Problem:** When a table has no data, Ant Design renders a generic empty graphic with no context, CTA, or guidance. This is a major onboarding friction point — first-time users see a blank table with no direction.
**Fix:**
Add `locale.emptyText` to every `<Table>` pointing to the `EmptyState` component from `@exim/ui`:
```tsx
locale={{
  emptyText: (
    <EmptyState
      message="No packing lists yet"
      description="Create your first packing list to get started."
      action={
        <Button intent="export" icon={<PlusOutlined />} onClick={() => openDrawer()}>
          Create First
        </Button>
      }
    />
  ),
}}
```
Each page should have contextually relevant copy. Filter-active empty states should say "No results match your filters" without a create CTA.

---

## 🟡 Medium Priority

### #7 — Replace hardcoded color strings with design tokens
**Files affected:** `admin/layout.tsx`, `admin/admin/page.tsx`, `components/app-header.tsx`, `components/sidebar.tsx`, all export pages
**Problem:** The `colors` token object from `@exim/ui` is available but bypassed throughout the app with magic strings like `'#888'`, `'#bbb'`, `'#4F46E5'`, `'#f5f5f5'`.
**Fix:** Import `colors` from `@exim/ui` and replace each hardcoded value:

| Hardcoded | Replace With |
|---|---|
| `'#888'`, `'#8c8c8c'` | `colors.neutral[400]` |
| `'#bbb'` | `colors.neutral[300]` |
| `'#4F46E5'`, `'#4338CA'` | `colors.primary[600]` / `colors.primary[700]` |
| `'#f5f5f5'` | `colors.neutral[100]` |
| `'#1e1b4b'` | `colors.primary[950]` |
| `'rgba(255,255,255,0.65)'` | Use `colors.white` with opacity |

---

### #8 — Standardize drawer widths to a consistent scale
**Files affected:** All drawers across export pages and admin
**Problem:** Drawer widths are arbitrary — 560, 760, 800, 860, 900px — with no consistent scale.
**Fix:** Adopt a 3-tier drawer width system:
- **Narrow** (480px): Simple forms ≤ 10 fields (e.g., Invite User modal → use Modal instead)
- **Standard** (640px): Medium forms, party/user drawers
- **Wide** (960px): Complex forms with inline tables (invoices, packing lists, shipping bills)

Update:
- Parties drawer: 560 → 640
- Proforma drawer: 760 → 640 (no inline table) or 960 (with line items)
- Invoices drawer: 800 → 960
- Packing Lists drawer: 900 → 960
- Shipping Bills drawer: 860 → 960
- Admin Tenants drawer: 560 → 640

---

### #10 — Standardize search input pattern across pages
**Files affected:** `master-data/parties`, `admin/admin/tenants`, `settings/reference-data`
**Problem:** Three different search patterns exist:
- Parties: `Input.Search` with `onSearch` (fires on Enter or button click)
- Admin Tenants: `Input` with `onChange` and no debounce (fires on every keystroke)
- Reference Data: `Input` with manual `setTimeout` debounce

**Fix:** Create a shared `useDebounce` hook in `apps/web/lib/use-debounce.ts` and standardize all search inputs:
```tsx
// Use Input.Search everywhere, with a shared 350ms debounce
const [searchValue, setSearchValue] = useState('');
const debouncedSearch = useDebounce(searchValue, 350);

<Input.Search
  placeholder="Search..."
  value={searchValue}
  onChange={(e) => setSearchValue(e.target.value)}
  allowClear
  style={{ width: 280 }}
/>
```

---

## 🟢 Low Priority

### #13 — Organization logo upload
**Files affected:** `apps/web/app/(dashboard)/settings/profile/page.tsx` (or a dedicated `settings/organization/page.tsx`); backend: `apps/api/src/organization/` module
**Problem:** There is no way for a tenant admin to upload their company logo. The logo is needed for PDF document headers (invoices, packing lists, shipping bills) and potentially the sidebar branding area.
**Fix:**

**Backend:**
1. Add `logoUrl` field to the `Tenant` / `Organization` entity in the Prisma schema
2. Create a `POST /organization/logo` endpoint that:
   - Accepts `multipart/form-data` with a single `logo` file field
   - Validates file type (PNG, JPG, SVG) and size (max 2 MB)
   - Stores the file (local disk for dev, S3-compatible in prod) and saves the public URL to the DB
3. Return `logoUrl` in the `GET /organization` response

**Frontend:**
1. In `settings/profile/page.tsx` (or a new `settings/organization/page.tsx`), add an "Organization Logo" section:
   - Display current logo (or a placeholder avatar) at 120×60px
   - `Upload` component (`beforeUpload` + manual `api.post`) — accept `.png,.jpg,.jpeg,.svg`, max 2 MB
   - Show upload progress; on success refresh the displayed logo
2. Store `logoUrl` in a global organization context / Zustand slice so the sidebar and document previews can consume it
3. Show the logo in the sidebar header (replacing or alongside the app name text)

**Acceptance criteria:**
- Tenant admin can upload a PNG/JPG/SVG logo ≤ 2 MB
- Logo appears in the sidebar immediately after upload (no page reload)
- Logo is embedded in generated PDF documents
- Invalid file type or oversized file shows a clear error message

---

### #14 — Admin: Global Masters management UI
**Files affected:** `apps/web/app/(admin)/admin/masters/` (new); `apps/web/app/(admin)/layout.tsx`
**Problem:** The super admin has no UI to manage platform-level reference data. Countries, Ports, HS Codes, Incoterms, system UOMs, and platform Exchange Rates are currently only accessible via Prisma Studio or the seed script.
**Fix:**
1. Add a "Masters" group to the admin sidebar in `layout.tsx`:
   ```ts
   { key: '/admin/masters/hs-codes', icon: <FileSearchOutlined />, label: 'HS Codes' },
   { key: '/admin/masters/ports', icon: <GlobalOutlined />, label: 'Ports' },
   { key: '/admin/masters/countries', icon: <FlagOutlined />, label: 'Countries' },
   { key: '/admin/masters/incoterms', icon: <SwapOutlined />, label: 'Incoterms' },
   { key: '/admin/masters/uoms', icon: <CalculatorOutlined />, label: 'UOMs' },
   { key: '/admin/masters/exchange-rates', icon: <DollarOutlined />, label: 'Exchange Rates' },
   ```
2. Create pages under `apps/web/app/(admin)/admin/masters/`:
   - `hs-codes/page.tsx` — searchable table, add/edit HS code with BCD/IGST rates
   - `ports/page.tsx` — CRUD for ports (UN/LOCODE, country, type)
   - `countries/page.tsx` — read-only list with FTA flag toggle
   - `incoterms/page.tsx` — read-only reference table
   - `uoms/page.tsx` — manage system UOMs (add new, toggle active)
   - `exchange-rates/page.tsx` — view/seed RBI & CBIC platform rates
3. All pages follow existing admin page pattern (PageHeader + Card + Table + Drawer)
4. Backend: verify `/reference/*` endpoints are accessible to `SUPER_ADMIN` without tenant scope

---

### #16 — File Upload Infrastructure (RustFS local / Cloudflare R2 production)

**Priority:** 🟢 Low — `documentUrl` fields are URL-string placeholders until this is implemented
**Scope:** Backend (`apps/api/`) + Frontend (`apps/web/`) + `docker-compose.yml`
**Prerequisite for:** Logo upload (#13), Import certificates (E5-S12), B/L document upload (E4-S10, E5-S8)

**Context:**
All document models (`ImportBillOfLading`, `ImportDocument`, `BillOfLading`, `InsuranceCertificate`, etc.) have a `documentUrl String?` field. Currently this accepts any URL string typed manually by the user. This backlog item adds real file upload with presigned URLs.

MinIO was the original plan but entered maintenance mode in December 2025 and stopped publishing Docker images. **RustFS** (Apache 2.0, Rust-based, S3-compatible) is the replacement for local development. Production uses **Cloudflare R2**.

**Backend:**
1. Add `docker-compose.yml` with RustFS service:
```yaml
services:
  rustfs:
    image: rustfs/rustfs:latest
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # Web console
    environment:
      RUSTFS_ROOT_USER: rustfsadmin
      RUSTFS_ROOT_PASSWORD: rustfsadmin
    volumes:
      - rustfs_data:/data
volumes:
  rustfs_data:
```

2. Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` in `apps/api`

3. Create `apps/api/src/modules/upload/upload.module.ts` with `UploadService`:
   - `getPresignedPutUrl(tenantId, module, recordId, filename, contentType)` → returns 5-min presigned PUT URL
   - `getSignedGetUrl(objectKey)` → returns 15-min signed GET URL
   - Object path: `/{tenantId}/{module}/{recordId}/{filename}`

4. Endpoints:
   ```
   POST /api/uploads/presign   → { uploadUrl, objectKey }
   GET  /api/uploads/signed-url?key={key} → { url }
   ```

5. Env vars:
   ```
   S3_ENDPOINT=http://localhost:9000        # local: RustFS, prod: R2 URL
   S3_REGION=auto
   S3_ACCESS_KEY=rustfsadmin
   S3_SECRET_KEY=rustfsadmin
   S3_BUCKET=exim-docs
   S3_FORCE_PATH_STYLE=true                 # required for RustFS; false for R2
   ```

**Frontend:**
1. Create `apps/web/src/lib/upload.ts` — `uploadFile(file, module, recordId)`:
   - `POST /api/uploads/presign` → get presigned URL
   - `PUT presignedUrl` → upload file directly from browser
   - Returns `objectKey` to save to the record

2. Add `Upload` (Ant Design) component to relevant drawers: Import B/L, Import Certificates, Export B/L, Insurance, Logo settings

**Acceptance criteria:**
- Files upload directly from browser to RustFS (local) or R2 (prod) — backend never buffers the binary
- `documentUrl` field on relevant models stores the object key (not the signed URL)
- Signed GET URL fetched on-demand for viewing/download (15-min expiry)
- Max file size: 10 MB; accepted types: PDF, PNG, JPG, JPEG
- Works identically in local dev (RustFS) and production (R2) — only env vars differ

---

### #11 — Build Buyer PO frontend page
**Files affected:** New file needed: `apps/web/app/(dashboard)/exports/buyer-pos/page.tsx`; `components/sidebar.tsx`
**Problem:** The `BuyerPO` backend module (CRUD + finalize) is fully implemented but there is no frontend page or sidebar navigation entry for it.
**Fix:**
1. Add sidebar entry under Exports: `{ key: '/exports/buyer-pos', icon: <FileProtectOutlined />, label: 'Buyer POs' }`
2. Create `apps/web/app/(dashboard)/exports/buyer-pos/page.tsx` following the proforma-invoices page pattern (list table + drawer form + finalize action)

---

### #12 — Consistent debounce on all search/filter inputs
**Covered by #10 above.** Admin Tenants additionally needs its `search` state to not trigger a fetch on every character — add the `useDebounce` hook so the API is only called after the user stops typing.

---

### #17 — PO Type: Service PO vs Goods/Parts PO
**Priority:** 🔴 High — assigned to Sprint 7
**Sprint assignment:** Sprint 7, Task 2 & 10
**Scope:** Both `SupplierPurchaseOrder` and `BuyerPurchaseOrder`

**Problem:** All POs are currently treated as goods orders. Service purchases (consulting, freight, clearing charges, etc.) do not require HS codes or UOM in the traditional sense but need to be tracked as POs for payment purposes.

**Fix:**
1. Add `poType PoType @default(GOODS)` to both PO models in Prisma schema (`PoType` enum: `GOODS | SERVICE`)
2. Backend: `hsCode` optional for SERVICE type POs; `uomCode` defaults to `"HOURS"` for service line items
3. Frontend: PO drawer shows a **PO Type** toggle (Goods / Service) at the top; when SERVICE is selected:
   - HS Code column hidden from line items table
   - UOM defaults to HOURS
   - Column header changes from "Description" to "Service Description"

---

### #18 — TAN and CIN in Business Profile
**Priority:** 🔴 High — assigned to Sprint 7
**Sprint assignment:** Sprint 7, Task 3 & 9
**Scope:** `Tenant` model + Settings > Profile page

**Problem:** The business profile currently stores GSTIN, IEC, and PAN. Two additional Indian tax identifiers are missing:
- **TAN** (Tax Deduction and Collection Account Number) — required for TDS deduction on domestic supplier payments
- **CIN** (Corporate Identity Number) — required for Pvt Ltd / Public Ltd companies under Companies Act 2013; LLPs use LLPIN instead

**Fix:**
1. Add `tan String?` and `cin String?` to the `Tenant` Prisma model
2. Expose in `GET /tenant` and `PATCH /tenant` API endpoints
3. Frontend: Add a "Tax Identifiers" section in `settings/profile/page.tsx` with:
   - TAN field (format: 4 letters + 5 digits + 1 letter, e.g. MUMA12345A)
   - CIN field (21-char alphanumeric, e.g. L12345MH2000PLC123456)
   - Client-side format validation on blur
   - Both fields optional (not all entity types require both)

---

## Already Fixed (reference)

| # | Issue | Fixed In |
|---|---|---|
| #1 | Button default intent — all non-primary buttons lacked `intent="default"` | 2026-02-20 |
| #2 | Wrong icon (`PlusOutlined`) on Edit button in Packing Lists | 2026-02-20 |
| #4 | Export module page CTAs used `intent="primary"` instead of `intent="export"` | 2026-02-20 |
| #6 | Finalize action had no confirmation dialog (`Popconfirm`) | 2026-02-20 |
| #9 | Icon-only buttons missing `aria-label` (WCAG 2.1 AA) | 2026-02-20 |