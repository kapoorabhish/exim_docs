# Sprint 8: Payments Completion + GST & Compliance + LC Management

**Sprint Goal:** Complete the Payments module (E7 deferred stories), implement the full GST & Compliance module (E8-S1–S10), and deliver the Letter of Credit lifecycle core (E6-S1–S5). Also clear four UX/debt backlog items.

**Branch:** `sprint-08` (from `develop`)
**Date:** February 2026

**Stories Covered:** E7-S4, E7-S8, E7-S9, E7-S10, E7-S12, E8-S1–S10, E6-S1–S5
**Backlog Items:** #3 (StatusBadge), #5 (EmptyState), #10 (search debounce), #11 (Buyer PO page)

---

## Sprint Outcome

By the end of this sprint, the following works end-to-end:

```
Payments (E7 completion):
1.  View payment due dates on a calendar; overdue buckets highlighted
2.  Manually trigger payment reminders to parties
3.  Import bank statement CSV/Excel; preview and map columns
4.  Reconcile bank entries with recorded payments (auto + manual match)
5.  View realized forex gain/loss per payment; summary report by period
6.  Export payments as Tally-compatible XML

GST & Compliance (E8 — all 10 stories):
7.  Record and track LUT ARN; expiry alerts at 30 days
8.  Set GST treatment on export invoices (LUT / with IGST)
9.  Generate GSTR-1 Table 6A data from export invoices; export JSON + Excel
10. Reconcile shipping bills with GSTR-1 Table 6A entries; identify mismatches
11. IGST credit register from Bills of Entry; mark as claimed in GSTR-3B
12. Reconcile BoE IGST with GSTR-3B claimed amounts
13. Generate GSTR-3B export/import summary data; export Excel
14. Generate e-invoice IRN + QR code for domestic B2B invoices
15. GST Compliance Dashboard — filing status, deadlines, unclaimed credits
16. IEC annual update status tracking; AD Code register

Letter of Credit (E6-S1–S5):
17. Record export LC details (terms, expiry, shipment date, link to PI)
18. Configure required document checklist from LC terms; track readiness
19. Auto-compare invoice vs LC terms; highlight blocking discrepancies
20. Track document submission to advising bank; bank response
21. Log and resolve LC discrepancies raised by bank

UX / Backlog debt:
22. All pages use StatusBadge (never raw Tag) — backlog #3
23. All tables have EmptyState in locale.emptyText — backlog #5
24. Buyer PO frontend page — backlog #11
25. useDebounce hook; standardized search across all pages — backlog #10
```

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| LC module location | `apps/api/src/modules/lc/` (top-level, not under exports or imports) | LCs span both export and import; separate module avoids circular deps |
| GST module location | `apps/api/src/modules/gst/` with sub-services per story area | Mirrors E8 structure; keeps GST logic independent of export/import |
| E-Invoice IRP client | Pluggable adapter: `MockIrpClient` (dev) / `GovIrpClient` (prod) | IRP requires GST portal credentials; mock enables full test without API access |
| Payment reminders | Manual trigger only in Sprint 8; auto-scheduling is Sprint 9+ | Scheduler (BullMQ) adds infra complexity; manual covers immediate need |
| Bank statement import | papaparse (CSV) + SheetJS/xlsx (Excel); multer for file upload | Both libraries are small, well-maintained, run in Node without native deps |
| Bank reconciliation matching | Auto-match: amount ± 0 + date ± 2 days + UTR/reference fuzzy match | Deterministic enough for most Indian bank formats |
| GSTR-1 Table 6A | Read-only generation from existing SB + CI data; no separate table | All source data exists; query-time computation avoids sync issues |
| GST treatment on CI | `gstTreatment GstTreatment @default(LUT)` on CommercialInvoice | Simple enum field; LUT is default since most exporters use LUT |
| IGST credit tracking | `igstCreditStatus` + `gstr3bMonth` on BillOfEntry (two new fields) | BoE already holds IGST amount; two fields are enough to track claim status |
| IEC annual update | `iecLastConfirmedAt DateTime?` + `iecStatus IecStatus` on Tenant | No separate model needed; only one IEC per tenant |
| LUT records | Separate `LutRecord` model (multiple per tenant, year-wise) | Tenants file LUT each FY; need history |
| LC document checklist | `LcRequiredDocument` model linked to LC | Configurable per LC; tracks readiness per document type |
| LC discrepancies | `LcDiscrepancy` model linked to LC submission | Each discrepancy is an independent item with its own lifecycle |
| Tally XML export | `application/xml` response from a dedicated endpoint | Standard Tally import format; no new model needed — just query + transform |
| Forex gain/loss | Computed at query time: `(paymentRate - invoiceRate) × foreignAmount` | No stored column; always fresh from source data |

---

## Task 0: Prisma Schema

**File:** `packages/db/prisma/schema.prisma`

### New Enums

```prisma
enum GstTreatment {
  LUT
  WITH_IGST
}

enum LutStatus {
  APPLIED
  ACTIVE
  EXPIRING    // within 30 days of expiry
  EXPIRED
}

enum IgstCreditStatus {
  UNCLAIMED
  CLAIMED
}

enum IecStatus {
  ACTIVE
  UPDATE_DUE
  DEACTIVATED
}

enum LcType {
  SIGHT
  USANCE_30
  USANCE_60
  USANCE_90
  USANCE_120
}

enum LcStatus {
  DRAFT
  ACTIVE
  SUBMITTED
  UNDER_REVIEW
  ACCEPTED
  PAYMENT_RELEASED
  CLOSED
  EXPIRED
}

enum LcDocumentStatus {
  NOT_STARTED
  IN_PROGRESS
  READY
}

enum LcDiscrepancyStatus {
  OPEN
  RESOLVED
  WAIVED
}

enum LcDiscrepancySeverity {
  BLOCKING
  NON_BLOCKING
}

enum BankEntryType {
  CREDIT
  DEBIT
}

enum ReconciliationStatus {
  UNRECONCILED
  MATCHED
  MANUALLY_MATCHED
  EXCLUDED
}
```

### Modified Models

```prisma
// CommercialInvoice — add GST treatment + e-invoice fields
model CommercialInvoice {
  // ... existing fields ...
  gstTreatment   GstTreatment  @default(LUT)
  gstr1Filed     Boolean       @default(false)
  gstr1Month     String?       // "2026-01" format
  irn            String?       // e-invoice IRN (64 hex chars)
  qrCode         String?       // base64 QR code for e-invoice
}

// BillOfEntry — add IGST credit tracking
model BillOfEntry {
  // ... existing fields ...
  igstCreditStatus IgstCreditStatus @default(UNCLAIMED)
  gstr3bMonth      String?          // "2026-01" format when claimed
}

// Tenant — add IEC tracking fields
model Tenant {
  // ... existing fields ...
  iecStatus           IecStatus @default(ACTIVE)
  iecLastConfirmedAt  DateTime?
  adCode              String?
  adCodeBank          String?
  adCodePorts         String?   // comma-separated port codes
}
```

### New Models

```prisma
// ─── LUT Record ────────────────────────────────────────────────────────────────

model LutRecord {
  id           String    @id @default(cuid())
  tenantId     String
  arnNumber    String                          // GST ARN
  filingDate   DateTime
  financialYear String                         // "2025-26"
  expiryDate   DateTime                        // filing date + 1 year
  status       LutStatus @default(APPLIED)
  documentUrl  String?
  notes        String?
  createdBy    String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, financialYear])
  @@index([tenantId, status])
  @@map("lut_records")
}

// ─── Letter of Credit ──────────────────────────────────────────────────────────

model LetterOfCredit {
  id                    String    @id @default(cuid())
  tenantId              String
  lcNumber              String
  lcDate                DateTime
  lcType                LcType    @default(SIGHT)
  isIrrevocable         Boolean   @default(true)
  isConfirmed           Boolean   @default(false)
  // Parties
  issuingBank           String
  advisingBank          String?
  buyerPartyId          String
  // Amounts
  currency              String
  amount                Decimal   @db.Decimal(18, 2)
  // Dates
  expiryDate            DateTime
  latestShipmentDate    DateTime?
  // Terms
  portOfLoading         String?
  portOfDischarge       String?
  partialShipmentAllowed Boolean  @default(false)
  transhipmentAllowed   Boolean   @default(false)
  // Status
  status                LcStatus  @default(DRAFT)
  // Links
  proformaInvoiceId     String?
  // Tracking
  submissionDate        DateTime?
  bankReferenceNumber   String?
  documentUrl           String?
  notes                 String?
  createdBy             String
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  tenant          Tenant              @relation(fields: [tenantId], references: [id])
  buyer           Party               @relation("LcBuyer", fields: [buyerPartyId], references: [id])
  requiredDocs    LcRequiredDocument[]
  discrepancies   LcDiscrepancy[]

  @@unique([tenantId, lcNumber])
  @@index([tenantId, status])
  @@map("letters_of_credit")
}

model LcRequiredDocument {
  id                  String           @id @default(cuid())
  lcId                String
  documentType        String           // e.g. "Commercial Invoice", "B/L", "Certificate of Origin"
  originalsRequired   Int              @default(1)
  copiesRequired      Int              @default(0)
  specialInstructions String?
  status              LcDocumentStatus @default(NOT_STARTED)

  lc LetterOfCredit @relation(fields: [lcId], references: [id], onDelete: Cascade)

  @@map("lc_required_documents")
}

model LcDiscrepancy {
  id              String                @id @default(cuid())
  lcId            String
  description     String
  severity        LcDiscrepancySeverity @default(BLOCKING)
  documentAffected String?
  resolution      String?
  bankCharges     Decimal?              @db.Decimal(12, 2)
  status          LcDiscrepancyStatus   @default(OPEN)
  raisedAt        DateTime              @default(now())
  resolvedAt      DateTime?
  createdBy       String

  lc LetterOfCredit @relation(fields: [lcId], references: [id], onDelete: Cascade)

  @@map("lc_discrepancies")
}

// ─── Bank Statement ────────────────────────────────────────────────────────────

model BankStatement {
  id              String              @id @default(cuid())
  tenantId        String
  bankName        String
  accountNumber   String?
  statementDate   DateTime
  openingBalance  Decimal             @db.Decimal(18, 2)
  closingBalance  Decimal             @db.Decimal(18, 2)
  entryCount      Int
  uploadedBy      String
  createdAt       DateTime            @default(now())

  tenant  Tenant               @relation(fields: [tenantId], references: [id])
  entries BankStatementEntry[]

  @@index([tenantId])
  @@map("bank_statements")
}

model BankStatementEntry {
  id                   String               @id @default(cuid())
  statementId          String
  entryDate            DateTime
  valueDate            DateTime?
  description          String
  reference            String?
  entryType            BankEntryType
  amount               Decimal              @db.Decimal(18, 2)
  balance              Decimal              @db.Decimal(18, 2)
  reconciliationStatus ReconciliationStatus @default(UNRECONCILED)
  exportPaymentId      String?
  importPaymentId      String?
  advancePaymentId     String?
  matchedAt            DateTime?
  matchedBy            String?

  statement BankStatementEntry @relation(fields: [statementId], references: [id], onDelete: Cascade)

  @@index([statementId, reconciliationStatus])
  @@map("bank_statement_entries")
}
```

**Tenant relations to add:**
```prisma
lutRecords          LutRecord[]
lettersOfCredit     LetterOfCredit[]
bankStatements      BankStatement[]
```

**Party relations to add:**
```prisma
lettersOfCredit     LetterOfCredit[]  @relation("LcBuyer")
```

After schema changes:
```bash
pnpm --filter db db:generate
pnpm --filter db db:push
```

---

## Task 1: DocNumberService — new prefixes

**File:** `apps/api/src/common/services/doc-number.service.ts`

Add to `PREFIXES` map:
```ts
LC:   'LC',   // Letter of Credit
LUT:  'LUT',  // LUT Record (optional — ARN is the natural identifier)
```

---

## Task 2: GSTModule scaffold

**New directory:** `apps/api/src/modules/gst/`

```
gst/
  lut/
    lut.service.ts
    lut.controller.ts
    lut.service.spec.ts
  invoice-gst/
    invoice-gst.service.ts
    invoice-gst.controller.ts
    invoice-gst.service.spec.ts
  gstr1/
    gstr1.service.ts
    gstr1.controller.ts
    gstr1.service.spec.ts
  igst-credit/
    igst-credit.service.ts
    igst-credit.controller.ts
    igst-credit.service.spec.ts
  gstr3b/
    gstr3b.service.ts
    gstr3b.controller.ts
    gstr3b.service.spec.ts
  einvoice/
    einvoice.service.ts
    einvoice.controller.ts
    irp-client.ts            ← pluggable IRP adapter
    irp-client.mock.ts       ← mock adapter for dev/test
    einvoice.service.spec.ts
  compliance-dashboard/
    compliance-dashboard.service.ts
    compliance-dashboard.controller.ts
    compliance-dashboard.service.spec.ts
  iec-tracking/
    iec-tracking.service.ts
    iec-tracking.controller.ts
    iec-tracking.service.spec.ts
  gst.module.ts
```

Register `GSTModule` in `apps/api/src/app.module.ts`.

---

## Task 3: LCModule scaffold

**New directory:** `apps/api/src/modules/lc/`

```
lc/
  lc/
    lc.service.ts
    lc.controller.ts
    lc.service.spec.ts
  lc-compliance/
    lc-compliance.service.ts
    lc-compliance.controller.ts
    lc-compliance.service.spec.ts
  lc.module.ts
```

Register `LCModule` in `apps/api/src/app.module.ts`.

---

## Task 4: Payments — Remaining Stories

**Extend** `apps/api/src/modules/payments/` with:

```
payments/
  reminders/
    payment-reminders.service.ts
    payment-reminders.controller.ts
    payment-reminders.service.spec.ts
  bank-statement/
    bank-statement.service.ts
    bank-statement.controller.ts
    bank-statement.service.spec.ts
  reconciliation/
    reconciliation.service.ts
    reconciliation.controller.ts
    reconciliation.service.spec.ts
  forex/
    forex.service.ts
    forex.controller.ts
    forex.service.spec.ts
  tally-export/
    tally-export.service.ts
    tally-export.controller.ts
    tally-export.service.spec.ts
```

---

## Task 5: LUT Management Service (E8-S1)

**File:** `apps/api/src/modules/gst/lut/lut.service.ts`

**Endpoints:**
```
GET    /gst/lut                → list (all LUT records for tenant)
POST   /gst/lut                → create (ARN, filing date, FY, expiry auto = filing + 1 year)
GET    /gst/lut/:id            → getById
PUT    /gst/lut/:id            → update (documentUrl, notes)
PUT    /gst/lut/:id/activate   → APPLIED → ACTIVE
DELETE /gst/lut/:id            → delete (APPLIED only)
GET    /gst/lut/active         → get current active LUT (for use in invoice creation)
```

**Key behaviours:**
- `create()`: `expiryDate = filingDate + 365 days`; status = APPLIED
- `activate()`: APPLIED → ACTIVE; if another ACTIVE LUT exists for same FY → `BadRequestException`
- **Status auto-computation** on `list()`: if `expiryDate` within 30 days → EXPIRING; if past → EXPIRED
- `getActiveLut()`: returns the ACTIVE or EXPIRING LUT for current FY, or null

**Spec test cases:**
- `create()`: calculates expiryDate correctly; rejects duplicate FY + tenant
- `activate()`: non-APPLIED → throws; duplicate ACTIVE → throws; success
- `getActiveLut()`: returns ACTIVE LUT; returns EXPIRING if within 30 days; returns null if none

---

## Task 6: Invoice GST Treatment (E8-S2)

**File:** `apps/api/src/modules/gst/invoice-gst/invoice-gst.service.ts`

**Endpoints:**
```
PUT    /gst/invoices/:id/gst-treatment   → set gstTreatment (LUT | WITH_IGST)
```

**Key behaviours:**
- If `LUT`: validate that an active LUT exists for the current FY; if none → `BadRequestException('No active LUT on file')`
- Updates `CommercialInvoice.gstTreatment`

**Spec test cases:**
- Set LUT: no active LUT → throws; with active LUT → success
- Set WITH_IGST: always succeeds
- Invoice not found → `NotFoundException`

---

## Task 7: GSTR-1 Table 6A Service (E8-S3)

**File:** `apps/api/src/modules/gst/gstr1/gstr1.service.ts`

**Endpoints:**
```
GET    /gst/gstr1/table6a?month=2026-01   → generate Table 6A data
POST   /gst/gstr1/mark-filed              → mark invoices as gstr1Filed=true, set gstr1Month
GET    /gst/gstr1/export?month=2026-01&format=json|excel → download
```

**Table 6A row structure:**
```ts
{
  invoiceNumber: string;
  invoiceDate: string;
  buyerGstin?: string;        // buyer country = IN only
  invoiceValue: number;
  igstAmount: number;         // 0 if gstTreatment=LUT
  currency: string;
  exchangeRate: number;
  shippingBillNumber?: string;
  shippingBillDate?: string;
  portCode?: string;
}
```

**Validation:**
- Invoices with `status=LOCKED` but no linked ShippingBill are flagged as "missing SB" — included with warning, not excluded
- Only `FINALIZED` and `LOCKED` invoices included

**Spec test cases:**
- `generateTable6a(tenantId, month)`: returns invoices for that month's invoice dates
- LUT invoices → igstAmount = 0; WITH_IGST → igstAmount calculated
- Missing SB → row included with `shippingBillNumber: null`

---

## Task 8: IGST Credit Tracking (E8-S5)

**File:** `apps/api/src/modules/gst/igst-credit/igst-credit.service.ts`

**Endpoints:**
```
GET    /gst/igst-credit                   → IGST register (all BoEs with credit status)
PUT    /gst/igst-credit/:boeId/claim      → mark CLAIMED, set gstr3bMonth
GET    /gst/igst-credit/summary?month=    → total IGST eligible/claimed for period
```

**Spec test cases:**
- `claimCredit()`: BoE not found → throws; already CLAIMED → `BadRequestException`; success
- `getSummary(month)`: returns total eligible, claimed, unclaimed

---

## Task 9: GSTR-3B Data Generation (E8-S7)

**File:** `apps/api/src/modules/gst/gstr3b/gstr3b.service.ts`

**Endpoints:**
```
GET    /gst/gstr3b?month=2026-01          → GSTR-3B summary data
GET    /gst/gstr3b/export?month=2026-01   → Excel download
```

**GSTR-3B output structure:**
```ts
{
  month: string;
  table3_1: {                          // Outward supplies
    zeroRatedWithoutIgst: number;      // LUT invoices
    zeroRatedWithIgst: number;         // WITH_IGST invoices
    totalValue: number;
  };
  table4: {                            // ITC from imports
    igstFromImports: number;           // sum of BoE IGST for month
    claimedInThisReturn: number;
  };
}
```

---

## Task 10: SB vs GSTR-1 Reconciliation (E8-S4) & BoE vs GSTR-3B (E8-S6)

These are query-only services — no new models.

**Endpoints:**
```
GET    /gst/reconciliation/gstr1?month=   → SB vs GSTR-1 mismatch report
GET    /gst/reconciliation/gstr3b?month=  → BoE IGST vs GSTR-3B mismatch report
```

**GSTR-1 mismatch logic:**
- Export invoices with SBs for the month: check `gstr1Filed=true`; not filed = missing from GSTR-1
- Compare `invoice.totalAmount` vs `SB.fobValueInr` — flag if difference > 1%

**GSTR-3B mismatch logic:**
- BoEs for the month: sum `igst`; compare with `claimed` BoEs; unclaimed = mismatch

---

## Task 11: E-Invoice IRN Service (E8-S8)

**File:** `apps/api/src/modules/gst/einvoice/einvoice.service.ts`
**IRP Client:** `apps/api/src/modules/gst/einvoice/irp-client.ts`

```ts
// irp-client.ts
export interface IrpClient {
  generateIrn(payload: EInvoicePayload): Promise<{ irn: string; qrCode: string; signedInvoice: string }>;
  cancelIrn(irn: string, reason: string): Promise<void>;
}

// irp-client.mock.ts — used in non-production
export class MockIrpClient implements IrpClient {
  async generateIrn(payload): Promise<{ irn: string; qrCode: string; signedInvoice: string }> {
    // Deterministic mock: SHA256 of payload JSON → fake IRN
    const irn = createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 64);
    return { irn, qrCode: `data:image/png;base64,MOCK_QR_${irn.slice(0, 8)}`, signedInvoice: '' };
  }
  async cancelIrn(irn: string) { /* no-op */ }
}
```

**Endpoints:**
```
POST   /gst/einvoice/:invoiceId/generate   → generate IRN + QR code; store on invoice
POST   /gst/einvoice/:invoiceId/cancel     → cancel IRN (sets irn=null, qrCode=null)
GET    /gst/einvoice/:invoiceId            → get IRN status for invoice
```

**Key behaviours:**
- Only applicable to `FINALIZED` or `LOCKED` invoices
- IRN already generated → `BadRequestException`
- Uses `IRP_CLIENT=mock|gov` env var to select client; defaults to `mock`

**Spec test cases:**
- `generateIrn()`: invoice not found → throws; already has IRN → throws; success stores IRN and QR
- `cancelIrn()`: no IRN → throws; success
- MockIrpClient returns deterministic output for same payload

---

## Task 12: GST Compliance Dashboard (E8-S9)

**File:** `apps/api/src/modules/gst/compliance-dashboard/compliance-dashboard.service.ts`

**Endpoint:**
```
GET    /gst/compliance-dashboard
```

**Response:**
```ts
{
  lut: { status: LutStatus; expiryDate: Date | null; daysToExpiry: number | null };
  gstr1: { monthlyStatus: { month: string; invoiceCount: number; filed: boolean }[] };
  igstCredit: { totalUnclaimed: number; unclaimedCount: number; oldestUnclaimedMonth: string | null };
  upcomingDeadlines: { type: 'GSTR-1' | 'GSTR-3B'; dueDate: Date; month: string }[];
  pendingReconciliationItems: number;
}
```

---

## Task 13: IEC Annual Update Tracking (E8-S10)

**File:** `apps/api/src/modules/gst/iec-tracking/iec-tracking.service.ts`

**Endpoints:**
```
GET    /gst/iec-tracking             → get current IEC status + AD codes
PUT    /gst/iec-tracking/confirm     → set iecLastConfirmedAt = now(), update status = ACTIVE
PUT    /gst/iec-tracking/ad-code     → update adCode, adCodeBank, adCodePorts
```

**Key behaviour:**
- `getStatus()`: compute alert state based on current date (April 1–June 30 = update window; July 1+ without confirmation = UPDATE_DUE)

---

## Task 14: Letter of Credit Service (E6-S1–S5)

**File:** `apps/api/src/modules/lc/lc/lc.service.ts`

**Endpoints:**
```
GET    /lc                           → list (filter: status, buyerPartyId)
POST   /lc                           → create
GET    /lc/:id                       → getById (with requiredDocs, discrepancies)
PUT    /lc/:id                       → update (DRAFT only)
PUT    /lc/:id/status                → status transition
DELETE /lc/:id                       → delete (DRAFT only)

GET    /lc/:id/documents             → get document checklist (E6-S2)
PUT    /lc/:id/documents/:docId      → update document status (E6-S2)

POST   /lc/:id/submit                → mark as submitted to bank (E6-S4)
PUT    /lc/:id/bank-response         → record bank response: accepted | discrepancies (E6-S4)

GET    /lc/:id/discrepancies         → list discrepancies (E6-S5)
POST   /lc/:id/discrepancies         → log a discrepancy (E6-S5)
PUT    /lc/:id/discrepancies/:discId → resolve or waive a discrepancy (E6-S5)
```

**Key behaviours:**
- `create()`: populates a default checklist of common LC documents (CI, PL, B/L, CoO, Insurance) based on LC type
- `getReadinessPercentage()`: sum of READY docs / total docs × 100

---

## Task 15: LC Compliance Service (E6-S3)

**File:** `apps/api/src/modules/lc/lc-compliance/lc-compliance.service.ts`

**Endpoints:**
```
GET    /lc/:id/compliance-check      → compare LC terms vs linked invoice
```

**Compliance check fields:**
```ts
{
  checks: [
    { field: 'amount', lcValue: number; invoiceValue: number; match: boolean; severity: 'BLOCKING' | 'NON_BLOCKING' },
    { field: 'latestShipmentDate', lcValue: Date; shippingDate: Date; match: boolean; severity: 'BLOCKING' },
    { field: 'portOfLoading', lcValue: string; invoiceValue: string; match: boolean; severity: 'BLOCKING' },
    { field: 'portOfDischarge', lcValue: string; invoiceValue: string; match: boolean; severity: 'BLOCKING' },
    { field: 'partialShipment', allowed: boolean; invoiceCount: number; match: boolean; severity: 'BLOCKING' },
  ];
  blockingCount: number;
  nonBlockingCount: number;
  complianceStatus: 'COMPLIANT' | 'HAS_DISCREPANCIES';
}
```

**Amount tolerance:** ±0.5% allowed (LC standard practice).

---

## Task 16: Payment Reminders (E7-S4)

**File:** `apps/api/src/modules/payments/reminders/payment-reminders.service.ts`

**Endpoints:**
```
GET    /payments/reminders/upcoming?days=30   → invoices due within N days (export + import)
GET    /payments/reminders/overdue            → overdue invoices with age bucket
POST   /payments/reminders/:invoiceType/:id/remind  → manual reminder trigger (logs action; email in Sprint 9)
```

**Age bucket logic (pure function — extract to utility for testing):**
```ts
export function getAgeBucket(dueDate: Date): 'CURRENT' | '1-30' | '31-60' | '61-90' | '90+' {
  const days = differenceInDays(new Date(), dueDate);
  if (days <= 0) return 'CURRENT';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}
```

---

## Task 17: Bank Statement Import (E7-S8)

**File:** `apps/api/src/modules/payments/bank-statement/bank-statement.service.ts`

**Endpoints:**
```
POST   /bank-statements/upload        → multipart upload of CSV or Excel file
GET    /bank-statements               → list uploaded statements
GET    /bank-statements/:id           → get statement with entries
DELETE /bank-statements/:id           → delete statement + entries
```

**Parsing:**
- CSV: `papaparse` — auto-detect headers
- Excel: `xlsx` (SheetJS) — first sheet, first row = headers
- Column mapping (passed from client): `{ date: 'Value Date', description: 'Narration', debit: 'Withdrawal', credit: 'Deposit', balance: 'Balance' }`

---

## Task 18: Bank Reconciliation (E7-S9)

**File:** `apps/api/src/modules/payments/reconciliation/reconciliation.service.ts`

**Endpoints:**
```
POST   /bank-reconciliation/auto-match?statementId=   → run auto-match on all UNRECONCILED entries
GET    /bank-reconciliation/status?statementId=       → matched/unmatched counts
POST   /bank-reconciliation/manual-match              → body: { entryId, paymentId, paymentType }
POST   /bank-reconciliation/exclude/:entryId          → mark as EXCLUDED (bank fees, etc.)
```

**Auto-match algorithm:**
1. For each UNRECONCILED CREDIT entry: find ExportPayments where `inrAmount` within ±1% of entry.amount AND `paymentDate` within ±2 days
2. For each UNRECONCILED DEBIT entry: find ImportPayments and AdvancePayments (MADE type)
3. If exactly one match: auto-link (status = MATCHED)
4. If multiple matches: skip (requires manual)

---

## Task 19: Forex Gain/Loss Service (E7-S10)

**File:** `apps/api/src/modules/payments/forex/forex.service.ts`

**Endpoints:**
```
GET    /payments/forex/realized?dateFrom=&dateTo=&currency=   → realized gain/loss report
GET    /payments/forex/unrealized?asOfDate=                   → unrealized on outstanding invoices
```

**Gain/loss calculation (pure function):**
```ts
export function calculateForexGainLoss(
  foreignAmount: number,
  invoiceRate: number,
  paymentRate: number
): number {
  // Positive = gain (payment rate > invoice rate for receivables)
  return (paymentRate - invoiceRate) * foreignAmount;
}
```

**Realized report:** For each ExportPayment allocation — join invoice exchange rate vs payment exchange rate.

---

## Task 20: Tally XML Export (E7-S12)

**File:** `apps/api/src/modules/payments/tally-export/tally-export.service.ts`

**Endpoints:**
```
GET    /payments/tally-export?dateFrom=&dateTo=   → returns XML (Content-Type: application/xml)
```

**Tally XML format:**
```xml
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>
      <REQUESTDATA>
        <!-- One TALLYMESSAGE per payment -->
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Receipt" ACTION="Create">
            <DATE>20260115</DATE>
            <PARTYLEDGERNAME>Global Traders</PARTYLEDGERNAME>
            <AMOUNT>-500000</AMOUNT>
            <NARRATION>EPAY/2025-26/001 - Wire USD 7500</NARRATION>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
```

---

## Task 21: Frontend — GST Compliance Pages

**New directory:** `apps/web/app/(dashboard)/gst/`

```
gst/
  page.tsx                           ← GST Compliance Dashboard
  lut/page.tsx                       ← LUT Management
  gstr1/page.tsx                     ← GSTR-1 Table 6A + filing
  igst-credit/page.tsx               ← IGST Credit Register
  gstr3b/page.tsx                    ← GSTR-3B Data Generation
  reconciliation/page.tsx            ← SB vs GSTR-1 + BoE vs GSTR-3B tabs
  iec-tracking/page.tsx              ← IEC Status + AD Codes
```

**Sidebar group: GST & Compliance**
```ts
{
  key: 'gst',
  icon: <AuditOutlined />,
  label: 'GST & Compliance',
  children: [
    { key: '/gst', label: 'Dashboard' },
    { key: '/gst/lut', label: 'LUT Management' },
    { key: '/gst/gstr1', label: 'GSTR-1 (Table 6A)' },
    { key: '/gst/igst-credit', label: 'IGST Credit' },
    { key: '/gst/gstr3b', label: 'GSTR-3B Data' },
    { key: '/gst/reconciliation', label: 'Reconciliation' },
    { key: '/gst/iec-tracking', label: 'IEC Tracking' },
  ],
}
```

**Key UI notes:**
- LUT page: status badge (ACTIVE = success, EXPIRING = warning, EXPIRED = error); expiry countdown chip
- GSTR-1 page: table of invoices for selected month; "Mark as Filed" Popconfirm for batch action; JSON + Excel download buttons
- IGST Credit: table of BoEs; "Mark Claimed" action per row; summary stat cards at top
- Dashboard: StatCards for LUT expiry, GSTR-1 pending, unclaimed IGST; upcoming deadlines table

---

## Task 22: Frontend — LC Management Pages

**New directory:** `apps/web/app/(dashboard)/lc/`

```
lc/
  page.tsx                           ← LC Register (list all LCs)
  [id]/page.tsx                      ← LC Detail view (checklist, compliance, discrepancies)
```

**Sidebar group: Letter of Credit** (under Exports or top-level Finance)
```ts
{ key: '/lc', icon: <SafetyCertificateOutlined />, label: 'Letter of Credit' }
```

**LC Register page:**
- Columns: LC No, Buyer, Type, Amount/Currency, Expiry Date, Status, Actions
- Filters: status, buyer
- "New LC" → 960px drawer (many fields + document checklist config)
- Expiry date highlighted red if expired or within 30 days

**LC Detail page (960px drawer or dedicated page):**
- 3 tabs: Details | Document Checklist | Discrepancies
- Details tab: all LC fields + LC Compliance Check panel (auto-fetched)
- Compliance panel: each check shown as pass/fail badge; blocking discrepancies highlighted
- Document Checklist tab: table of required docs; update status per row
- Discrepancies tab: list + "Log Discrepancy" drawer + Resolve/Waive actions

---

## Task 23: Frontend — Payments Completion Pages

**New pages in `apps/web/app/(dashboard)/payments/`:**

```
payments/
  reminders/page.tsx                 ← Payment calendar + overdue aging
  bank-statements/page.tsx           ← Upload + list statements
  reconciliation/page.tsx            ← Reconciliation workspace
  forex/page.tsx                     ← Forex gain/loss report
  tally-export/page.tsx              ← Tally XML export
```

**Add to Payments sidebar:**
```ts
{ key: '/payments/reminders', label: 'Reminders' },
{ key: '/payments/bank-statements', label: 'Bank Statements' },
{ key: '/payments/reconciliation', label: 'Reconciliation' },
{ key: '/payments/forex', label: 'Forex Gain/Loss' },
{ key: '/payments/tally-export', label: 'Tally Export' },
```

**Reminders page:**
- Ant Design `Calendar` component with overdue invoices as events
- Age bucket table below calendar: CURRENT, 1-30, 31-60, 61-90, 90+
- "Send Reminder" button per row → `Popconfirm`

**Bank Statements page:**
- Upload area (Ant Design `Upload.Dragger`) accepting CSV, XLS, XLSX
- After upload: column mapping step (select date/description/debit/credit/balance columns)
- Parsed preview table → "Confirm Import" button
- List of past statements with entry count and reconciliation status

**Reconciliation workspace:**
- Left panel: bank statement entries (unreconciled highlighted)
- Right panel: unmatched payments
- "Auto-Match" button → runs the auto-match algorithm
- Manual match: click entry + click payment → "Link" button
- Summary: matched %, remaining unreconciled amount

**Forex page:**
- Date range filter + currency filter
- Table: Payment No, Party, Invoice Rate, Payment Rate, Foreign Amount, Gain/Loss INR
- Footer: total realized gain, total realized loss, net
- Unrealized section below (outstanding invoices at current rate vs invoice rate)

**Tally Export page:**
- Date range picker
- Preview: table of payments to be exported (payment no, party, amount, voucher type)
- "Export XML" button → downloads file

---

## Task 24: Backlog #3 — Replace `<Tag>` with `<StatusBadge>`

**Files:** All export pages, import pages, payment pages, admin pages

1. Extend `packages/shared/src/constants/documentStatuses.ts` to cover all new statuses:
   - LC statuses, LUT statuses, AdvanceStatus, ReconciliationStatus, IgstCreditStatus
2. Replace every `<Tag color={...}>` with `<StatusBadge status={s} />`
3. Remove all local `STATUS_COLOR` and `STATUS_LABELS` maps

**Acceptance:** `grep -r "<Tag color=" apps/web/app` returns 0 results.

---

## Task 25: Backlog #5 — Add `EmptyState` to all tables

**Files:** All list pages (both existing and new in this sprint)

For existing pages that were missed — add `locale.emptyText` pointing to `<EmptyState>`:
- First-run empty state: with CTA button
- Filter-active empty state: "No results match your filters" — no CTA

---

## Task 26: Backlog #11 — Buyer PO Frontend Page

**New file:** `apps/web/app/(dashboard)/exports/buyer-pos/page.tsx`

Follows the Supplier POs page pattern exactly:
- List table: PO No, Buyer, Date, Currency, Total, Status, Actions
- "New Buyer PO" → 640px drawer; PO Type toggle (Goods/Service)
- Status transitions: DRAFT → PENDING_APPROVAL → APPROVED
- Clone, Delete (DRAFT only) actions with `Popconfirm`

**Sidebar:** Add under Exports:
```ts
{ key: '/exports/buyer-pos', icon: <FileProtectOutlined />, label: 'Buyer POs' }
```

---

## Task 27: Backlog #10 — `useDebounce` Hook + Search Standardization

**New file:** `apps/web/src/lib/use-debounce.ts`
```ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
```

**Apply to:** parties/page.tsx, admin/tenants/page.tsx, settings/reference-data/page.tsx, and all new Sprint 8 list pages.
**Add spec:** `apps/web/src/lib/use-debounce.spec.ts` — test with fake timers.

---

## Task 28: Backend Spec Files (all new services)

Add fixtures to `apps/api/src/test/fixtures.ts`:
- `makeLutRecord(overrides?)` — status: APPLIED, financialYear: '2025-26'
- `makeLc(overrides?)` — status: DRAFT, lcType: SIGHT
- `makeLcDoc(overrides?)` — status: NOT_STARTED
- `makeBankStatement(overrides?)` — with 3 entries
- `makeBankStatementEntry(overrides?)` — UNRECONCILED, CREDIT

**Spec files to create (16 new):**

| File | Key tests |
|---|---|
| `lut.service.spec.ts` | create + expiryDate calc, activate (duplicate throws), getActiveLut |
| `invoice-gst.service.spec.ts` | set LUT (no active LUT throws), set WITH_IGST (always ok) |
| `gstr1.service.spec.ts` | generateTable6a (correct month filter, LUT invoices = 0 IGST), markFiled |
| `igst-credit.service.spec.ts` | claimCredit (already claimed throws), getSummary |
| `gstr3b.service.spec.ts` | generate (correct Table 3.1 + Table 4 values) |
| `gstr1-reconciliation.service.spec.ts` | identifies unfiled invoices, amount mismatch |
| `gstr3b-reconciliation.service.spec.ts` | identifies unclaimed BoE IGST |
| `einvoice.service.spec.ts` | generate (already has IRN throws), MockIrpClient deterministic output |
| `compliance-dashboard.service.spec.ts` | LUT expiry calc, upcoming deadlines |
| `iec-tracking.service.spec.ts` | confirm (sets iecLastConfirmedAt), update window alert |
| `lc.service.spec.ts` | create (auto-populates checklist), status transitions, delete (non-DRAFT throws) |
| `lc-compliance.service.spec.ts` | amount match (within tolerance), date check, port check |
| `payment-reminders.service.spec.ts` | getUpcoming (correct day filter), getOverdue (age buckets) |
| `bank-statement.service.spec.ts` | upload (CSV parsed correctly), delete |
| `reconciliation.service.spec.ts` | autoMatch (finds match by amount + date), manualMatch, exclude |
| `forex.service.spec.ts` | calculateForexGainLoss (gain, loss, zero), realized report |

**Also add unit tests for pure functions:**
- `apps/web/src/lib/use-debounce.spec.ts`
- `apps/api/src/modules/payments/reminders/age-bucket.spec.ts` (ageBucket utility)
- `apps/api/src/modules/payments/forex/forex-calculator.spec.ts` (calculateForexGainLoss)
- `apps/api/src/modules/payments/tally-export/tally-xml.spec.ts` (XML generation snapshot)

---

## New Shared Statuses

Add to `packages/shared/src/constants/documentStatuses.ts`:
```ts
// LUT
APPLIED:           { label: 'Applied',            color: 'processing' },
EXPIRING:          { label: 'Expiring Soon',      color: 'warning' },
// IgstCredit
UNCLAIMED:         { label: 'Unclaimed',          color: 'warning' },
CLAIMED:           { label: 'Claimed',            color: 'success' },
// IEC
UPDATE_DUE:        { label: 'Update Due',         color: 'error' },
DEACTIVATED:       { label: 'Deactivated',        color: 'error' },
// LC
SUBMITTED:         { label: 'Submitted',          color: 'processing' },
UNDER_REVIEW:      { label: 'Under Review',       color: 'processing' },
ACCEPTED:          { label: 'Accepted',           color: 'success' },
PAYMENT_RELEASED:  { label: 'Payment Released',   color: 'success' },
EXPIRED:           { label: 'Expired',            color: 'error' },
// Reconciliation
MATCHED:           { label: 'Matched',            color: 'success' },
MANUALLY_MATCHED:  { label: 'Manually Matched',   color: 'success' },
EXCLUDED:          { label: 'Excluded',           color: 'default' },
// LC Document
NOT_STARTED:       { label: 'Not Started',        color: 'default' },
IN_PROGRESS:       { label: 'In Progress',        color: 'processing' },
READY:             { label: 'Ready',              color: 'success' },
// LC Discrepancy
WAIVED:            { label: 'Waived',             color: 'warning' },
```

---

## Definition of Done

- [ ] `pnpm --filter db db:generate && pnpm --filter db db:push` — passes; 3 new models, 10 new enums
- [ ] `pnpm --filter api build` — no TypeScript errors
- [ ] `pnpm --filter api test:cov` — all tests pass; 16 new spec files; ≥70% statement coverage
- [ ] `pnpm --filter web build` — no TypeScript errors
- [ ] `pnpm --filter web test:cov` — `use-debounce.spec.ts` passes; ≥70% coverage on `src/lib/**`
- [ ] LUT: create, activate, expiry shown on GST Dashboard
- [ ] GSTR-1 Table 6A: generates correct rows for selected month; JSON + Excel download work
- [ ] IGST Credit: BoEs listed with claimed/unclaimed status; mark-claimed updates status
- [ ] E-Invoice: `POST /gst/einvoice/:id/generate` stores IRN and QR code on invoice
- [ ] LC: create LC with document checklist; compliance check highlights mismatches
- [ ] LC: log discrepancy; resolve/waive discrepancy
- [ ] Bank Statement: CSV upload parsed and displayed; auto-match finds exact-amount matches
- [ ] Forex report: gain/loss computed correctly vs invoice rate
- [ ] Tally XML export: valid XML downloaded with correct payment vouchers
- [ ] Buyer PO page (backlog #11): list + create + submit + approve work end-to-end
- [ ] No raw `<Tag>` components in any page (`grep -r "<Tag color=" apps/web/app` = 0)
- [ ] All tables have `EmptyState` in `locale.emptyText`
- [ ] All irreversible actions (Finalize, Mark Filed, Mark Claimed, Delete, Cancel IRN) in `Popconfirm`
- [ ] `pnpm build` across monorepo — no errors
- [ ] Commit to `sprint-08` branch, PR to `develop`

---

## Task Summary

| # | Task | Type | Stories |
|---|---|---|---|
| 0 | Prisma schema — 9 enums, 7 models, 3 modified models | Schema | All |
| 1 | DocNumberService — LC prefix | Backend | E6 |
| 2 | GSTModule scaffold | Backend | E8 |
| 3 | LCModule scaffold | Backend | E6 |
| 4 | Payments — remaining sub-module scaffold | Backend | E7 |
| 5 | LUT Management service (E8-S1) | Backend | E8-S1 |
| 6 | Invoice GST Treatment service (E8-S2) | Backend | E8-S2 |
| 7 | GSTR-1 Table 6A service (E8-S3) | Backend | E8-S3 |
| 8 | IGST Credit Tracking service (E8-S5) | Backend | E8-S5 |
| 9 | GSTR-3B Data Generation service (E8-S7) | Backend | E8-S7 |
| 10 | GST Reconciliation services (E8-S4, E8-S6) | Backend | E8-S4, E8-S6 |
| 11 | E-Invoice IRN service + IRP adapter (E8-S8) | Backend | E8-S8 |
| 12 | GST Compliance Dashboard service (E8-S9) | Backend | E8-S9 |
| 13 | IEC Annual Update Tracking service (E8-S10) | Backend | E8-S10 |
| 14 | Letter of Credit service (E6-S1, S2, S4, S5) | Backend | E6-S1–S5 |
| 15 | LC Compliance Check service (E6-S3) | Backend | E6-S3 |
| 16 | Payment Reminders service (E7-S4) | Backend | E7-S4 |
| 17 | Bank Statement Import service (E7-S8) | Backend | E7-S8 |
| 18 | Bank Reconciliation service (E7-S9) | Backend | E7-S9 |
| 19 | Forex Gain/Loss service (E7-S10) | Backend | E7-S10 |
| 20 | Tally XML Export service (E7-S12) | Backend | E7-S12 |
| 21 | Frontend — GST Compliance pages (7 pages) | Frontend | E8 |
| 22 | Frontend — LC Management pages (register + detail) | Frontend | E6 |
| 23 | Frontend — Payments completion pages (5 pages) | Frontend | E7 |
| 24 | Backlog #3 — StatusBadge across all pages | UX Debt | #3 |
| 25 | Backlog #5 — EmptyState in all tables | UX Debt | #5 |
| 26 | Backlog #11 — Buyer PO frontend page | UX Debt | #11 |
| 27 | Backlog #10 — useDebounce hook + search standardization | UX Debt | #10 |
| 28 | Backend spec files (16 new services) | Testing | All |

---

**Document Version:** 1.0
**Last Updated:** February 2026