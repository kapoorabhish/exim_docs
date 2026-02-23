# Sprint 7: Payments & Banking (E7) + PO Type Enhancement + Business Profile

**Sprint Goal:** Implement the core Payments & Banking module (E7-S1–S3, E7-S5–S7, E7-S11) covering export receivables, import payables, advance payments, outstanding reports, and the payment dashboard. Also deliver two user-requested enhancements: PO type differentiation (Service vs Goods) and TAN/CIN fields in the business profile.

**Branch:** `sprint-07` (from `develop`)
**Date:** February 2026

**Stories Covered:** E7-S1, E7-S2, E7-S3, E7-S5, E7-S6, E7-S7, E7-S11

**Deferred to Sprint 8:** E7-S4 (payment reminders), E7-S8 (bank statement import), E7-S9 (bank reconciliation), E7-S10 (forex gain/loss report), E7-S12 (Tally export)

---

## Sprint Outcome

By the end of this sprint, the following works end-to-end:

```
1.  Add poType (GOODS / SERVICE) to Supplier POs and Buyer POs — HS code optional for Service POs
2.  Add TAN + CIN fields to Tenant business profile (schema + settings page)
3.  Record an export payment received from a buyer — linked to one or more invoices
4.  Record an import payment made to a supplier — linked to supplier invoices / POs
5.  Record an advance payment (buyer or supplier) and adjust it against invoices
6.  View outstanding export receivables report — age buckets, buyer filter, export CSV
7.  View outstanding import payables report — age buckets, supplier filter, export CSV
8.  View Party Ledger — chronological invoices + payments + advances + running balance
9.  View Payment Dashboard — KPIs (total receivables, payables, net, overdue), trend charts
10. All new services ship with co-located *.spec.ts unit tests (≥70% coverage gate)
```

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| PO type field | `poType` enum (GOODS \| SERVICE) on both `SupplierPurchaseOrder` and `BuyerPurchaseOrder` | Simplest extension; shares existing line item table; HS code optional for SERVICE |
| Service PO line items | Same `PoLineItem` table — `hsCode` nullable, `uomCode` defaults to "HOURS" | No new model needed; service descriptions stored in existing `description` field |
| TAN / CIN | Optional `String?` fields on `Tenant` model | Both are identifiers that not all entities need (sole proprietors, LLPs may not have CIN) |
| Payment model split | Separate `ExportPayment` (receivable) and `ImportPayment` (payable) | Different fields (BRC link, TDS), different parties (buyer vs supplier) |
| Payment allocation | `PaymentInvoiceAllocation` join table | Supports partial payments across multiple invoices |
| Advance payments | Separate `AdvancePayment` model with `type` (RECEIVED/MADE) and `adjustedAmount` | Tracks unadjusted balance independently |
| Outstanding reports | Computed at query time from payment allocations | No caching needed at this scale; date-filter joins handle age bucket math |
| Party ledger | Combines invoices + payments + advances in a single chronological view | Running balance = cumulative debit - credit |
| Payment dashboard | Aggregation queries in `PaymentDashboardService` | KPIs from DB aggregates; no separate reporting table |
| Forex gain/loss | Deferred to Sprint 8 | Requires rate-at-invoice vs rate-at-payment comparison — more complex, lower urgency |

---

## Task 0: Prisma Schema

**File:** `packages/db/prisma/schema.prisma`

### New Enums

```prisma
enum PoType {
  GOODS
  SERVICE
}

enum PaymentMode {
  WIRE_TRANSFER
  LC
  TT
  CHEQUE
  CASH
  OTHER
}

enum ExportPaymentStatus {
  PENDING_CLEARANCE
  CLEARED
  BOUNCED
}

enum ImportPaymentStatus {
  PENDING
  COMPLETED
  CANCELLED
}

enum AdvanceType {
  RECEIVED   // from buyer
  MADE       // to supplier
}

enum AdvanceStatus {
  OPEN
  PARTIALLY_ADJUSTED
  FULLY_ADJUSTED
}
```

### Modified Models

```prisma
// Add poType to existing PO models
model BuyerPurchaseOrder {
  // existing fields...
  poType     PoType   @default(GOODS)
}

model SupplierPurchaseOrder {
  // existing fields...
  poType     PoType   @default(GOODS)
}

// Add TAN and CIN to Tenant
model Tenant {
  // existing fields...
  tan        String?   // Tax Deduction Account Number (e.g. AAAA12345A)
  cin        String?   // Corporate Identity Number (e.g. L12345MH2000PLC123456)
}
```

### New Models

```prisma
model ExportPayment {
  id                 String                      @id @default(cuid())
  tenant             Tenant                      @relation(fields: [tenantId], references: [id])
  tenantId           String
  paymentNumber      String
  paymentDate        DateTime
  referenceNumber    String?
  buyerPartyId       String
  buyer              Party                       @relation("ExportPaymentBuyer", fields: [buyerPartyId], references: [id])
  currency           String
  foreignAmount      Decimal                     @db.Decimal(18, 4)
  exchangeRate       Decimal                     @db.Decimal(18, 6)
  inrAmount          Decimal                     @db.Decimal(18, 2)  // auto-calculated
  bankAccountId      String?
  paymentMode        PaymentMode
  bankCharges        Decimal                     @db.Decimal(18, 2)  @default(0)
  status             ExportPaymentStatus         @default(PENDING_CLEARANCE)
  notes              String?
  allocations        PaymentInvoiceAllocation[]
  advanceAdjustments AdvancePaymentAdjustment[]
  createdAt          DateTime                    @default(now())
  updatedAt          DateTime                    @updatedAt
}

model ImportPayment {
  id                 String                      @id @default(cuid())
  tenant             Tenant                      @relation(fields: [tenantId], references: [id])
  tenantId           String
  paymentNumber      String
  paymentDate        DateTime
  referenceNumber    String?
  supplierPartyId    String
  supplier           Party                       @relation("ImportPaymentSupplier", fields: [supplierPartyId], references: [id])
  currency           String
  foreignAmount      Decimal                     @db.Decimal(18, 4)
  exchangeRate       Decimal                     @db.Decimal(18, 6)
  inrAmount          Decimal                     @db.Decimal(18, 2)
  bankAccountId      String?
  paymentMode        PaymentMode
  bankCharges        Decimal                     @db.Decimal(18, 2)  @default(0)
  tdsAmount          Decimal                     @db.Decimal(18, 2)  @default(0)
  status             ImportPaymentStatus         @default(PENDING)
  notes              String?
  allocations        SupplierPaymentAllocation[]
  advanceAdjustments AdvancePaymentAdjustment[]
  createdAt          DateTime                    @default(now())
  updatedAt          DateTime                    @updatedAt
}

model PaymentInvoiceAllocation {
  id              String         @id @default(cuid())
  paymentId       String
  payment         ExportPayment  @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  invoiceId       String
  invoice         Invoice        @relation(fields: [invoiceId], references: [id])
  allocatedAmount Decimal        @db.Decimal(18, 4)
}

model SupplierPaymentAllocation {
  id              String         @id @default(cuid())
  paymentId       String
  payment         ImportPayment  @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  invoiceId       String
  invoice         SupplierInvoice @relation(fields: [invoiceId], references: [id])
  allocatedAmount Decimal        @db.Decimal(18, 4)
}

model AdvancePayment {
  id              String                     @id @default(cuid())
  tenant          Tenant                     @relation(fields: [tenantId], references: [id])
  tenantId        String
  advanceNumber   String
  advanceDate     DateTime
  type            AdvanceType
  partyId         String
  party           Party                      @relation("AdvancePaymentParty", fields: [partyId], references: [id])
  currency        String
  foreignAmount   Decimal                    @db.Decimal(18, 4)
  exchangeRate    Decimal                    @db.Decimal(18, 6)
  inrAmount       Decimal                    @db.Decimal(18, 2)
  adjustedAmount  Decimal                    @db.Decimal(18, 2)  @default(0)
  status          AdvanceStatus              @default(OPEN)
  purpose         String?
  notes           String?
  adjustments     AdvancePaymentAdjustment[]
  createdAt       DateTime                   @default(now())
  updatedAt       DateTime                   @updatedAt
}

model AdvancePaymentAdjustment {
  id               String          @id @default(cuid())
  advanceId        String
  advance          AdvancePayment  @relation(fields: [advanceId], references: [id], onDelete: Cascade)
  exportPaymentId  String?
  exportPayment    ExportPayment?  @relation(fields: [exportPaymentId], references: [id])
  importPaymentId  String?
  importPayment    ImportPayment?  @relation(fields: [importPaymentId], references: [id])
  adjustedAmount   Decimal         @db.Decimal(18, 4)
  adjustmentDate   DateTime
  notes            String?
}
```

### Tenant relations to add
```prisma
exportPayments    ExportPayment[]
importPayments    ImportPayment[]
advancePayments   AdvancePayment[]
```

### Party relations to add
```prisma
exportPaymentsReceived  ExportPayment[]   @relation("ExportPaymentBuyer")
importPaymentsMade      ImportPayment[]   @relation("ImportPaymentSupplier")
advancePayments         AdvancePayment[]  @relation("AdvancePaymentParty")
```

---

## Task 1: DocNumber Service — new prefixes

**File:** `apps/api/src/common/services/doc-number.service.ts`

Add to `PREFIXES` map:
```ts
EPAY: 'EPAY',   // Export Payment
IPAY: 'IPAY',   // Import Payment
ADV:  'ADV',    // Advance Payment
```

---

## Task 2: PO Type Enhancement — Backend

**Files to modify:**
- `apps/api/src/modules/exports/buyer-po/buyer-po.service.ts` — accept `poType` in create/update; default `GOODS`
- `apps/api/src/modules/imports/supplier-po/supplier-po.service.ts` — same
- Spec files updated for new field

---

## Task 3: TAN / CIN — Backend

**Files to modify:**
- `packages/db/prisma/schema.prisma` — `tan String?`, `cin String?` on Tenant (part of Task 0)
- `apps/api/src/modules/tenant/tenant.service.ts` — expose `tan`, `cin` in update and get responses
- `tenant.service.spec.ts` — add tests for TAN/CIN update

---

## Task 4: PaymentsModule Scaffold

**New directory:** `apps/api/src/modules/payments/`

Structure:
```
payments/
  export-payment/
    export-payment.service.ts
    export-payment.controller.ts
    export-payment.service.spec.ts
  import-payment/
    import-payment.service.ts
    import-payment.controller.ts
    import-payment.service.spec.ts
  advance-payment/
    advance-payment.service.ts
    advance-payment.controller.ts
    advance-payment.service.spec.ts
  dashboard/
    payment-dashboard.service.ts
    payment-dashboard.controller.ts
    payment-dashboard.service.spec.ts
  payments.module.ts
```

---

## Task 5: ExportPaymentService

**File:** `apps/api/src/modules/payments/export-payment/export-payment.service.ts`

Key methods:
- `list(tenantId, { page, pageSize, status, buyerPartyId, dateFrom, dateTo })` — paginated
- `getById(tenantId, id)` — with allocations
- `create(tenantId, userId, dto)` — auto-calc `inrAmount = foreignAmount × exchangeRate`; generate EPAY number; create allocations
- `updateStatus(tenantId, id, status)` — PENDING_CLEARANCE → CLEARED → BOUNCED
- `delete(tenantId, id)` — only PENDING_CLEARANCE
- `getOutstandingReceivables(tenantId, { dateFrom, dateTo, buyerPartyId })` — invoices with outstanding balance, age buckets

**Controller routes:**
```
GET    /export-payments
POST   /export-payments
GET    /export-payments/outstanding-receivables
GET    /export-payments/:id
PUT    /export-payments/:id/status
DELETE /export-payments/:id
```

---

## Task 6: ImportPaymentService

**File:** `apps/api/src/modules/payments/import-payment/import-payment.service.ts`

Key methods:
- `list(tenantId, { page, pageSize, status, supplierPartyId })` — paginated
- `getById(tenantId, id)` — with allocations
- `create(tenantId, userId, dto)` — auto-calc `inrAmount`; generate IPAY number; TDS deduction
- `updateStatus(tenantId, id, status)`
- `delete(tenantId, id)`
- `getOutstandingPayables(tenantId, { dateFrom, dateTo, supplierPartyId })` — with age buckets

**Controller routes:**
```
GET    /import-payments
POST   /import-payments
GET    /import-payments/outstanding-payables
GET    /import-payments/:id
PUT    /import-payments/:id/status
DELETE /import-payments/:id
```

---

## Task 7: AdvancePaymentService

**File:** `apps/api/src/modules/payments/advance-payment/advance-payment.service.ts`

Key methods:
- `list(tenantId, { type, partyId, status })` — filter by RECEIVED/MADE
- `getById(tenantId, id)`
- `create(tenantId, userId, dto)` — generate ADV number; status = OPEN
- `adjustAdvance(tenantId, advanceId, { paymentId, adjustedAmount, paymentType })` — link to export or import payment; update `adjustedAmount`; update status (PARTIALLY_ADJUSTED / FULLY_ADJUSTED)
- `delete(tenantId, id)` — only OPEN advances

**Controller routes:**
```
GET    /advance-payments
POST   /advance-payments
GET    /advance-payments/:id
POST   /advance-payments/:id/adjust
DELETE /advance-payments/:id
```

---

## Task 8: PaymentDashboardService + Party Ledger

**File:** `apps/api/src/modules/payments/dashboard/payment-dashboard.service.ts`

Key methods:
- `getDashboard(tenantId)` — KPIs:
  - `totalReceivables` — sum of unallocated invoice amounts (export)
  - `totalPayables` — sum of unallocated supplier invoice amounts
  - `netPosition` — receivables - payables
  - `overdueReceivables` — receivables past due date
  - `collectionsThisMonth` — export payments this calendar month
  - `paymentsThisMonth` — import payments this calendar month
  - `upcomingPayments` — supplier invoices due in next 30 days
  - `topOverdueBuyers` — top 5 buyers by overdue amount
- `getPartyLedger(tenantId, partyId, { dateFrom, dateTo })` — chronological entries (invoices + payments + advances) with running balance

**Controller routes:**
```
GET    /payments/dashboard
GET    /payments/party-ledger/:partyId
```

---

## Task 9: Frontend — TAN/CIN in Business Profile

**File:** `apps/web/app/(dashboard)/settings/profile/page.tsx`

- Add "Tax Information" section to the business profile form
- Fields: TAN (format hint: AAAA12345A), CIN (format hint: L/U + 5 digits + state code + year + entity type + 6 digits)
- Both optional fields
- Validate format client-side with regex on blur

---

## Task 10: Frontend — PO Type on PO Drawers

**Files:**
- `apps/web/app/(dashboard)/imports/purchase-orders/page.tsx` — add PO Type toggle (Goods / Service) at top of drawer; hide HS Code column when SERVICE
- `apps/web/app/(dashboard)/exports/buyer-pos/page.tsx` — same pattern (backlog #11)

UI behaviour:
- Default: `GOODS` — shows HS Code field in line items
- `SERVICE` — hides HS Code, sets UOM default to "HOURS", label changes to "Service Description"
- StatusBadge + intent follow existing patterns

---

## Task 11: Frontend — Export Payments page

**New file:** `apps/web/app/(dashboard)/payments/export-payments/page.tsx`

- List table: Payment No, Buyer, Date, Currency, Amount, INR Equiv, Mode, Status
- Filters: status, buyer, date range
- "New Export Payment" → 640px drawer
  - Buyer select, payment date, reference no, currency, amount, exchange rate (live INR calc)
  - Payment mode, bank charges
  - Allocations: select invoices, enter allocated amounts (total must ≤ payment amount)
- Row actions: View allocations, Mark Cleared (Popconfirm), Delete (PENDING only)
- `intent="finance"` on primary CTAs

---

## Task 12: Frontend — Import Payments page

**New file:** `apps/web/app/(dashboard)/payments/import-payments/page.tsx`

- Same pattern as export payments but for suppliers
- Additional: TDS amount field in drawer
- Allocate to supplier invoices

---

## Task 13: Frontend — Advances, Receivables, Payables, Ledger, Dashboard

**New files:**
- `apps/web/app/(dashboard)/payments/advances/page.tsx` — list + drawer + "Adjust" action
- `apps/web/app/(dashboard)/payments/receivables/page.tsx` — read-only aging report (no drawer needed)
- `apps/web/app/(dashboard)/payments/payables/page.tsx` — read-only aging report
- `apps/web/app/(dashboard)/payments/party-ledger/page.tsx` — party select + chronological table
- `apps/web/app/(dashboard)/payments/page.tsx` — payment dashboard with KPI stat cards

**Sidebar update:** Add Payments nav group with sub-items:
- Dashboard, Export Payments, Import Payments, Advances, Receivables, Payables, Party Ledger

---

## Task 14: Backend Spec Files

**Files to create/update:**

| File | New Tests |
|---|---|
| `export-payment.service.spec.ts` | list (filters), create (inrAmount auto-calc, EPAY number, allocation), updateStatus (valid/invalid), getOutstandingReceivables (age buckets), delete (non-PENDING throws) |
| `import-payment.service.spec.ts` | list, create (TDS deduction, inrAmount), updateStatus, getOutstandingPayables, delete |
| `advance-payment.service.spec.ts` | list, create (ADV number), adjustAdvance (partial/full, throws on over-adjust), delete (non-OPEN throws) |
| `payment-dashboard.service.spec.ts` | getDashboard (KPI totals), getPartyLedger (sorted, running balance) |
| `tenant.service.spec.ts` | update with TAN/CIN (valid/invalid format), get returns TAN/CIN |
| `buyer-po.service.spec.ts` | create with SERVICE type (no hsCode required), GOODS type (hsCode required) |
| `supplier-po.service.spec.ts` | same as above |

**Target:** ≥70% coverage maintained. Estimated ~80 new tests.

---

## Task 15: Frontend Utility Tests

**New files in `apps/web/src/lib/`:**
- `payment-calculator.ts` — pure functions:
  - `calculateInrAmount(foreignAmount, exchangeRate)` → INR equivalent
  - `calculateAgeBucket(dueDate)` → `'current' | '1-30' | '31-60' | '61-90' | '90+'`
  - `calculateOutstandingBalance(invoiceAmount, allocations)` → unallocated amount
- `payment-calculator.spec.ts` — unit tests for all 3 functions

---

## Sidebar Navigation Update

```ts
// Add Payments group to sidebar.tsx
{
  key: 'payments',
  icon: <BankOutlined />,
  label: 'Payments',
  children: [
    { key: '/payments', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/payments/export-payments', icon: <ArrowUpOutlined />, label: 'Export Payments' },
    { key: '/payments/import-payments', icon: <ArrowDownOutlined />, label: 'Import Payments' },
    { key: '/payments/advances', icon: <SwapOutlined />, label: 'Advances' },
    { key: '/payments/receivables', icon: <RiseOutlined />, label: 'Receivables' },
    { key: '/payments/payables', icon: <FallOutlined />, label: 'Payables' },
    { key: '/payments/party-ledger', icon: <BookOutlined />, label: 'Party Ledger' },
  ],
}
```

---

## New Shared Statuses

Add to `packages/shared/src/constants/documentStatuses.ts`:
```ts
PENDING_CLEARANCE:  { label: 'Pending Clearance', color: 'warning' }
CLEARED:            { label: 'Cleared',            color: 'success' }
BOUNCED:            { label: 'Bounced',            color: 'error' }
PENDING:            { label: 'Pending',            color: 'default' }  // if not already present
COMPLETED:          { label: 'Completed',          color: 'success' }
CANCELLED:          { label: 'Cancelled',          color: 'error' }
OPEN:               { label: 'Open',               color: 'processing' }
PARTIALLY_ADJUSTED: { label: 'Partially Adjusted', color: 'warning' }
FULLY_ADJUSTED:     { label: 'Fully Adjusted',     color: 'success' }
```

---

## Definition of Done

- [ ] `pnpm --filter db db:generate && pnpm --filter db db:push` — passes
- [ ] `pnpm --filter api build` — no TypeScript errors
- [ ] `pnpm --filter api test:cov` — all tests pass, ≥70% statement coverage
- [ ] `pnpm --filter web build` — no TypeScript errors
- [ ] `pnpm --filter web test` — all utility tests pass
- [ ] Business profile page shows TAN and CIN fields
- [ ] PO drawers (Supplier + Buyer) show PO Type toggle; Service PO hides HS Code
- [ ] All new pages use `StatusBadge`, `EmptyState`, `intent="finance"` CTAs
- [ ] All irreversible actions wrapped in `Popconfirm`
- [ ] Commit to `sprint-07` branch, PR to `develop`

---

## Task Summary

| # | Task | Type | Complexity |
|---|---|---|---|
| 0 | Prisma schema — 6 enums, 7 models, Tenant TAN/CIN | Schema | High |
| 1 | DocNumberService — EPAY, IPAY, ADV prefixes | Backend | Low |
| 2 | PO Type (GOODS/SERVICE) — backend services + specs | Backend | Medium |
| 3 | TAN/CIN — tenant service + spec | Backend | Low |
| 4 | PaymentsModule scaffold | Backend | Low |
| 5 | ExportPaymentService + Controller | Backend | High |
| 6 | ImportPaymentService + Controller | Backend | High |
| 7 | AdvancePaymentService + Controller | Backend | Medium |
| 8 | PaymentDashboardService + Party Ledger | Backend | High |
| 9 | Frontend — TAN/CIN in profile page | Frontend | Low |
| 10 | Frontend — PO Type on PO drawers | Frontend | Medium |
| 11 | Frontend — Export Payments page | Frontend | High |
| 12 | Frontend — Import Payments page | Frontend | Medium |
| 13 | Frontend — Advances, Reports, Ledger, Dashboard | Frontend | High |
| 14 | Backend spec files (4 services + 3 updated) | Testing | High |
| 15 | Frontend utility tests (payment-calculator) | Testing | Low |