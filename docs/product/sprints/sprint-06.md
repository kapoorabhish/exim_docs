# Sprint 6: Import Documentation (E5)

**Sprint Goal:** Build the complete import documentation module from scratch — Prisma schema → NestJS API → Next.js UI — covering all 14 E5 stories. Every new service ships with a co-located `*.spec.ts` unit test, and the frontend gets its first-ever Jest + React Testing Library test suite targeting the import calculation utilities.

**Scope:** Prisma schema + NestJS API (`apps/api/`) + Next.js frontend (`apps/web/`) + backend spec files + frontend test infrastructure + frontend utility tests

**Stories Covered:** E5-S1–S14 (all 14 import documentation stories)

**Deferred to Sprint 7:** E7 (Payments & Banking) — depends on this sprint's supplier invoice models being in place

---

## Sprint Outcome

By the end of this sprint, the following works end-to-end:

```
1. Create a Supplier Purchase Order (with line items, expected delivery, currency)
2. Submit PO for approval → Approve or Reject (approval workflow)
3. Record a Supplier Invoice and link it to the approved PO
4. Create a Bill of Entry — duty fields (BCD, SWS, IGST) calculated live in the UI
5. Track BoE through status transitions: DRAFT → FILED → EXAMINED → OUT_OF_CHARGE → DUTY_PAID
6. Calculate Landed Cost (CIF + customs duty + clearing + handling + transport charges)
7. Record Import B/L (vessel, containers, free days) and calculate demurrage estimates
8. View Import Document Set — all documents for one shipment in a single drawer
9. View Import Register — consolidated table of all imports with CIF value, duty, OOC date
10. Upload import certificates (CoO, quality cert, duty challan, etc.) linked to a BoE
11. Clone a PO for repeat orders (new number, today's date, DRAFT status)
12. Track PO fulfillment — status auto-updates as supplier invoices are received
13. Run frontend utility tests (duty calculator, demurrage, landed cost) via Jest + RTL
14. Run backend unit tests for all 5 new import services (≥70% coverage maintained)
```

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Import B/L model | Separate `ImportBillOfLading` (not reuse export `BillOfLading`) | Import B/L has different fields (delivery order, free days, demurrage rate) vs export B/L |
| Duty calculator | Pure function `calculateImportDuty()` in `duty-calculator.ts` | Shared by backend service and frontend UI; easy to unit test without DB |
| Demurrage calculator | Pure function `calculateDemurrage()` | Same rationale — `asOfDate` param allows deterministic testing |
| Document set | `GET /supplier-invoices/:id/document-set` | Supplier Invoice is the hub for imports (mirrors export CI document set endpoint) |
| Import Register | `GET /bills-of-entry/register` (not `/invoices/register`) | BoE is the source of truth for CIF value and duty — the two key register columns |
| PO fulfillment | Auto-update status in `SupplierInvoiceService.create()` | Single trigger point; fulfilled qty = sum of all linked invoice line item quantities |
| Frontend tests | Jest + RTL — utilities only (not page components) | Ant Design + Next.js App Router makes page-level rendering tests fragile and low-value; utility functions are pure and highly testable |
| Doc numbers | SPO/SINV/BOE prefixes added to `DocNumberService.PREFIXES` | Follows existing pattern; `BoE number` is optional (assigned only after FILED) |
| Approval flow storage | `approvedBy` + `approvedAt` on `SupplierPurchaseOrder` | Simple audit trail; no separate approval-request model needed at this scale |

---

## Task 0: Prisma Schema — 6 new models, 5 new enums

**File to modify:** `packages/db/prisma/schema.prisma`

### New Enums

```prisma
enum PoStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED
  PARTIALLY_FULFILLED
  FULLY_FULFILLED
  CLOSED
}

enum SupplierInvoiceStatus {
  DRAFT
  RECEIVED
  CLEARED
}

enum BoeStatus {
  DRAFT
  FILED
  EXAMINED
  OUT_OF_CHARGE
  DUTY_PAID
}

enum ImportBlStatus {
  RECEIVED
  DELIVERY_ORDER_ISSUED
  CARGO_PICKED_UP
}

enum ImportDocumentType {
  COO
  QUALITY_CERT
  WEIGHT_CERT
  TEST_REPORT
  DUTY_CHALLAN
  EXAMINATION_REPORT
  OTHER
}
```

### New Models

```prisma
// ─── Supplier Purchase Order ───────────────────────────────────────────────────

model SupplierPurchaseOrder {
  id                   String    @id @default(cuid())
  tenantId             String
  poNumber             String
  supplierPartyId      String
  currency             String    @default("USD")
  expectedDeliveryDate DateTime?
  status               PoStatus  @default(DRAFT)
  totalAmount          Decimal   @db.Decimal(15, 2)
  approvedBy           String?
  approvedAt           DateTime?
  notes                String?
  createdBy            String
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  tenant           Tenant                 @relation(fields: [tenantId], references: [id])
  supplier         Party                  @relation("SupplierPoSupplier", fields: [supplierPartyId], references: [id])
  lineItems        SupplierPoLineItem[]
  supplierInvoices SupplierInvoice[]

  @@unique([tenantId, poNumber])
  @@index([tenantId, status])
  @@map("supplier_purchase_orders")
}

model SupplierPoLineItem {
  id          String  @id @default(cuid())
  poId        String
  lineNumber  Int
  description String
  hsCode      String?
  quantity    Decimal @db.Decimal(12, 3)
  uomCode     String  @default("PCS")
  unitPrice   Decimal @db.Decimal(12, 4)
  totalPrice  Decimal @db.Decimal(15, 2)

  po SupplierPurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)

  @@map("supplier_po_line_items")
}

// ─── Supplier Invoice ──────────────────────────────────────────────────────────

model SupplierInvoice {
  id               String                @id @default(cuid())
  tenantId         String
  invoiceNumber    String
  supplierPartyId  String
  poId             String?
  currency         String                @default("USD")
  exchangeRate     Decimal               @db.Decimal(12, 6)
  exchangeRateDate DateTime?
  invoiceDate      DateTime
  dueDate          DateTime?
  totalAmount      Decimal               @db.Decimal(15, 2)
  status           SupplierInvoiceStatus @default(DRAFT)
  notes            String?
  createdBy        String
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  tenant       Tenant                    @relation(fields: [tenantId], references: [id])
  supplier     Party                     @relation("SupplierInvoiceSupplier", fields: [supplierPartyId], references: [id])
  po           SupplierPurchaseOrder?    @relation(fields: [poId], references: [id])
  lineItems    SupplierInvoiceLineItem[]
  billsOfEntry BillOfEntry[]
  importBls    ImportBillOfLading[]

  @@unique([tenantId, invoiceNumber])
  @@index([tenantId, status])
  @@map("supplier_invoices")
}

model SupplierInvoiceLineItem {
  id          String  @id @default(cuid())
  invoiceId   String
  lineNumber  Int
  description String
  hsCode      String?
  quantity    Decimal @db.Decimal(12, 3)
  uomCode     String  @default("PCS")
  unitPrice   Decimal @db.Decimal(12, 4)
  totalPrice  Decimal @db.Decimal(15, 2)

  invoice SupplierInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@map("supplier_invoice_line_items")
}

// ─── Bill of Entry ─────────────────────────────────────────────────────────────

model BillOfEntry {
  id                     String    @id @default(cuid())
  tenantId               String
  boeNumber              String?   // assigned only after filing
  invoiceId              String
  portOfEntry            String?
  assessedValue          Decimal   @db.Decimal(15, 2) // CIF value in INR
  basicDuty              Decimal   @db.Decimal(12, 2)
  socialWelfareSurcharge Decimal   @db.Decimal(12, 2)
  igst                   Decimal   @db.Decimal(12, 2)
  compensationCess       Decimal   @db.Decimal(12, 2) @default(0)
  totalDuty              Decimal   @db.Decimal(12, 2)
  status                 BoeStatus @default(DRAFT)
  filingDate             DateTime?
  examinationDate        DateTime?
  outOfChargeDate        DateTime?
  dutyPaidDate           DateTime?
  notes                  String?
  createdBy              String
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  tenant      Tenant                @relation(fields: [tenantId], references: [id])
  invoice     SupplierInvoice       @relation(fields: [invoiceId], references: [id])
  landedCosts LandedCost[]
  importDocs  ImportDocument[]

  @@index([tenantId, status])
  @@map("bills_of_entry")
}

// ─── Landed Cost ───────────────────────────────────────────────────────────────

model LandedCost {
  id               String   @id @default(cuid())
  tenantId         String
  boeId            String
  cifValue         Decimal  @db.Decimal(15, 2)
  customsDuty      Decimal  @db.Decimal(12, 2)
  clearingCharges  Decimal  @db.Decimal(12, 2) @default(0)
  handlingCharges  Decimal  @db.Decimal(12, 2) @default(0)
  transportCharges Decimal  @db.Decimal(12, 2) @default(0)
  otherCharges     Decimal  @db.Decimal(12, 2) @default(0)
  totalLandedCost  Decimal  @db.Decimal(15, 2)
  totalQuantity    Decimal  @db.Decimal(12, 3)
  costPerUnit      Decimal  @db.Decimal(12, 4)
  notes            String?
  createdBy        String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  tenant Tenant      @relation(fields: [tenantId], references: [id])
  boe    BillOfEntry @relation(fields: [boeId], references: [id])

  @@map("landed_costs")
}

// ─── Import Bill of Lading ─────────────────────────────────────────────────────

model ImportBillOfLading {
  id                  String         @id @default(cuid())
  tenantId            String
  invoiceId           String
  blNumber            String
  blDate              DateTime
  shippingLine        String?
  vesselName          String?
  containerNumbers    String?        // comma-separated
  portOfLoading       String?
  portOfDischarge     String?
  arrivalDate         DateTime?
  freeDays            Int            @default(14)
  dailyDemurrageRate  Decimal?       @db.Decimal(10, 2)
  deliveryOrderNumber String?
  deliveryOrderDate   DateTime?
  status              ImportBlStatus @default(RECEIVED)
  documentUrl         String?
  notes               String?
  createdBy           String
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  tenant  Tenant          @relation(fields: [tenantId], references: [id])
  invoice SupplierInvoice @relation(fields: [invoiceId], references: [id])

  @@index([tenantId, invoiceId])
  @@map("import_bills_of_lading")
}

// ─── Import Document (supplier certificates) ──────────────────────────────────

model ImportDocument {
  id               String             @id @default(cuid())
  tenantId         String
  boeId            String
  documentType     ImportDocumentType
  documentNumber   String?
  documentDate     DateTime?
  issuingAuthority String?
  documentUrl      String?
  notes            String?
  createdBy        String
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  tenant Tenant      @relation(fields: [tenantId], references: [id])
  boe    BillOfEntry @relation(fields: [boeId], references: [id])

  @@map("import_documents")
}
```

**New relations to add on `Party`:**
```prisma
supplierPurchaseOrders SupplierPurchaseOrder[] @relation("SupplierPoSupplier")
supplierInvoices       SupplierInvoice[]       @relation("SupplierInvoiceSupplier")
```

**New relations to add on `Tenant`:**
```prisma
supplierPurchaseOrders SupplierPurchaseOrder[]
supplierInvoices       SupplierInvoice[]
billsOfEntry           BillOfEntry[]
landedCosts            LandedCost[]
importBillsOfLading    ImportBillOfLading[]
importDocuments        ImportDocument[]
```

**After schema changes:**
```bash
pnpm --filter db db:generate   # regenerate Prisma client
pnpm --filter db db:push       # push to dev DB
```

---

## Task 1: DocNumberService — add import prefixes

**File:** `apps/api/src/common/services/doc-number.service.ts`

Add to the `PREFIXES` record:
```ts
SPO:  'SPO',   // Supplier Purchase Order  → SPO/2025-26/001
SINV: 'SINV',  // Supplier Invoice         → SINV/2025-26/001
BOE:  'BOE',   // Bill of Entry            → BOE/2025-26/001
```

> Note: BoE number is optional on creation (assigned by customs after filing). The `boeNumber` field is
> set manually by the user when transitioning to `FILED`, not via `DocNumberService`.

---

## Task 2: NestJS — ImportsModule scaffold

**Create:** `apps/api/src/modules/imports/imports.module.ts`

Mirrors the structure of `ExportsModule` exactly.

```ts
@Module({
  imports: [PrismaModule],
  controllers: [
    SupplierPoController,
    SupplierInvoiceController,
    BillOfEntryController,
    LandedCostController,
    ImportBlController,
  ],
  providers: [
    DocNumberService,
    SupplierPoService,
    SupplierInvoiceService,
    BillOfEntryService,
    LandedCostService,
    ImportBlService,
  ],
})
export class ImportsModule {}
```

**Register in `apps/api/src/app.module.ts`:**
```ts
import { ImportsModule } from './modules/imports/imports.module';
// add ImportsModule to @Module({ imports: [...] })
```

**Module directory structure:**
```
apps/api/src/modules/imports/
├── imports.module.ts
├── supplier-po/
│   ├── supplier-po.service.ts
│   ├── supplier-po.controller.ts
│   └── supplier-po.service.spec.ts
├── supplier-invoice/
│   ├── supplier-invoice.service.ts
│   ├── supplier-invoice.controller.ts
│   └── supplier-invoice.service.spec.ts
├── bill-of-entry/
│   ├── bill-of-entry.service.ts
│   ├── bill-of-entry.controller.ts
│   ├── duty-calculator.ts
│   ├── duty-calculator.spec.ts
│   └── bill-of-entry.service.spec.ts
├── landed-cost/
│   ├── landed-cost.service.ts
│   ├── landed-cost.controller.ts
│   └── landed-cost.service.spec.ts
└── import-bl/
    ├── import-bl.service.ts
    ├── import-bl.controller.ts
    └── import-bl.service.spec.ts
```

---

## Task 3: Supplier PO Module (E5-S1, S2, S13, S14)

**Service:** `apps/api/src/modules/imports/supplier-po/supplier-po.service.ts`

### API Endpoints

```
GET    /api/supplier-pos                  → list
POST   /api/supplier-pos                  → create
GET    /api/supplier-pos/:id              → getById
PUT    /api/supplier-pos/:id              → update (DRAFT only)
PUT    /api/supplier-pos/:id/submit       → DRAFT → PENDING_APPROVAL (E5-S2)
PUT    /api/supplier-pos/:id/approve      → PENDING_APPROVAL → APPROVED (E5-S2)
PUT    /api/supplier-pos/:id/reject       → PENDING_APPROVAL → REJECTED (E5-S2)
POST   /api/supplier-pos/:id/clone        → clone as new DRAFT (E5-S13)
DELETE /api/supplier-pos/:id              → delete (DRAFT only)
```

### Key Behaviours

| Method | Logic |
|---|---|
| `create()` | `getNextNumber(tenantId, 'SPO')` → `SPO/2025-26/001`; `totalAmount = Σ(qty × unitPrice)` across line items |
| `update()` | Non-DRAFT → `BadRequestException`; deletes all old line items, recreates from DTO |
| `submit()` | DRAFT → `PENDING_APPROVAL`; other status → `BadRequestException` |
| `approve(userId)` | `PENDING_APPROVAL` only → `APPROVED`; sets `approvedBy`, `approvedAt` |
| `reject()` | `PENDING_APPROVAL` only → `REJECTED` |
| `clone()` | Copies all fields + line items; new SPO number via `getNextNumber`; `status = DRAFT`; `date = today` |
| `delete()` | DRAFT only |
| `updateFulfillmentStatus(poId)` | Called by `SupplierInvoiceService` after invoice create/update; computes fulfilled qty vs PO qty; sets `PARTIALLY_FULFILLED` or `FULLY_FULFILLED` |

### Fulfillment Status Logic (E5-S14)

```ts
async updateFulfillmentStatus(poId: string) {
  const po = await this.prisma.supplierPurchaseOrder.findUnique({
    where: { id: poId },
    include: {
      lineItems: true,
      supplierInvoices: { include: { lineItems: true } },
    },
  });
  const poQty = po.lineItems.reduce((sum, l) => sum + Number(l.quantity), 0);
  const fulfilledQty = po.supplierInvoices
    .flatMap(inv => inv.lineItems)
    .reduce((sum, l) => sum + Number(l.quantity), 0);

  const status =
    fulfilledQty === 0 ? 'APPROVED' :
    fulfilledQty < poQty ? 'PARTIALLY_FULFILLED' :
    'FULLY_FULFILLED';

  await this.prisma.supplierPurchaseOrder.update({ where: { id: poId }, data: { status } });
}
```

### Spec: `supplier-po.service.spec.ts`

| Test | Expected |
|---|---|
| `list()` — paginated | returns `{ data, total }` |
| `list()` — status filter | `findMany` called with `where.status` |
| `list()` — supplierPartyId filter | `where.supplierPartyId` applied |
| `getById()` — not found | `NotFoundException` |
| `getById()` — found | returns PO with lineItems |
| `create()` — success | calls `getNextNumber('SPO')`; `totalAmount = 1100` for qty=10×100 + qty=5×20 |
| `create()` — no line items | `totalAmount = 0` |
| `update()` — non-DRAFT | `BadRequestException` |
| `update()` — DRAFT | `deleteMany` line items then `update` called |
| `submit()` — DRAFT | status → `PENDING_APPROVAL` |
| `submit()` — non-DRAFT | `BadRequestException` |
| `approve()` — non-PENDING | `BadRequestException` |
| `approve()` — PENDING | status → `APPROVED`; `approvedBy` set |
| `reject()` — non-PENDING | `BadRequestException` |
| `reject()` — PENDING | status → `REJECTED` |
| `clone()` — not found | `NotFoundException` |
| `clone()` — success | new SPO number; status=`DRAFT` |
| `delete()` — non-DRAFT | `BadRequestException` |
| `delete()` — DRAFT | `delete` called |

---

## Task 4: Supplier Invoice Module (E5-S3, S9, S14)

**Service:** `apps/api/src/modules/imports/supplier-invoice/supplier-invoice.service.ts`

### API Endpoints

```
GET    /api/supplier-invoices                  → list (filters: status, supplierPartyId, poId)
POST   /api/supplier-invoices                  → create
GET    /api/supplier-invoices/:id              → getById (with lineItems, supplier, po, billsOfEntry)
PUT    /api/supplier-invoices/:id              → update (DRAFT only)
PUT    /api/supplier-invoices/:id/receive      → DRAFT → RECEIVED
GET    /api/supplier-invoices/:id/document-set → import document set view (E5-S9)
DELETE /api/supplier-invoices/:id              → delete (DRAFT only)
```

### Key Behaviours

| Method | Logic |
|---|---|
| `create()` | `getNextNumber(tenantId, 'SINV')`; if `poId` provided → validates PO exists + same tenant; calculates `totalAmount`; calls `SupplierPoService.updateFulfillmentStatus(poId)` |
| `receive()` | DRAFT → `RECEIVED`; other status → `BadRequestException` |
| `getDocumentSet()` (E5-S9) | Returns `{ invoice, po, billsOfEntry, importBls, landedCosts, importDocuments }` — single endpoint for document set drawer |
| `update()` | DRAFT only; deletes + recreates line items; recalculates `totalAmount` |
| `delete()` | DRAFT only |

### Spec: `supplier-invoice.service.spec.ts`

| Test | Expected |
|---|---|
| `list()` — filters | status, supplierPartyId, poId filters applied |
| `getById()` — not found | `NotFoundException` |
| `create()` — with PO | PO not found → `NotFoundException`; success → calls `updateFulfillmentStatus` |
| `create()` — no PO | creates standalone; no fulfillment update |
| `create()` — calculates totalAmount | 3 line items summed correctly |
| `receive()` — non-DRAFT | `BadRequestException` |
| `receive()` — DRAFT | status → `RECEIVED` |
| `getDocumentSet()` | aggregates invoice + PO + BoEs + importBls + landedCosts |
| `delete()` — non-DRAFT | `BadRequestException` |

---

## Task 5: Bill of Entry Module (E5-S4, S5, S6, S10)

**Service:** `apps/api/src/modules/imports/bill-of-entry/bill-of-entry.service.ts`

### API Endpoints

```
GET    /api/bills-of-entry             → list (filters: status, invoiceId, page, pageSize)
POST   /api/bills-of-entry             → create (duty auto-calculated)
GET    /api/bills-of-entry/register    → import register (E5-S10) ← must be BEFORE /:id
GET    /api/bills-of-entry/:id         → getById (with invoice, supplier, landedCosts, importDocs)
PUT    /api/bills-of-entry/:id         → update (DRAFT only)
PUT    /api/bills-of-entry/:id/status  → status transition (E5-S6)
DELETE /api/bills-of-entry/:id         → delete (DRAFT only)
```

### Duty Calculator Utility (E5-S5)

**File:** `apps/api/src/modules/imports/bill-of-entry/duty-calculator.ts`

Indian import duty structure:
- **BCD** (Basic Customs Duty) = CIF value × BCD rate
- **SWS** (Social Welfare Surcharge) = BCD × 10% _(always 10% of BCD, no exceptions)_
- **IGST** = (CIF + BCD + SWS) × IGST rate
- **Compensation Cess** = CIF × cess rate _(defaults to 0)_
- **Total Duty** = BCD + SWS + IGST + Compensation Cess

```ts
export interface DutyInput {
  cifValueInr: number;
  bcdRate: number;             // decimal: 0.10 = 10%
  igstRate: number;            // decimal: 0.18 = 18%
  compensationCessRate?: number;
}

export interface DutyResult {
  bcd: number;
  sws: number;
  igst: number;
  compensationCess: number;
  totalDuty: number;
}

export function calculateImportDuty(input: DutyInput): DutyResult {
  const bcd = input.cifValueInr * input.bcdRate;
  const sws = bcd * 0.10;
  const igstBase = input.cifValueInr + bcd + sws;
  const igst = igstBase * input.igstRate;
  const compensationCess = input.cifValueInr * (input.compensationCessRate ?? 0);
  const totalDuty = bcd + sws + igst + compensationCess;
  return { bcd, sws, igst, compensationCess, totalDuty };
}
```

### Status Transition Table (E5-S6)

```
DRAFT → FILED        (sets filingDate = now, accepts boeNumber from user)
FILED → EXAMINED     (sets examinationDate = now)
EXAMINED → OUT_OF_CHARGE  (sets outOfChargeDate = now)
OUT_OF_CHARGE → DUTY_PAID (sets dutyPaidDate = now)
```

Invalid transitions (e.g. DRAFT → EXAMINED) → `BadRequestException`.

### Import Register Endpoint (E5-S10)

```
GET /api/bills-of-entry/register
Query: dateFrom?, dateTo?, supplierPartyId?, status?, format? (json|csv)
Returns:
  {
    data: [ { boeNumber, status, outOfChargeDate, assessedValue, totalDuty,
              invoice: { invoiceNumber, currency, totalAmount },
              supplier: { name, country } } ],
    total: number,
    summary: { totalAssessedValue: number, totalDuty: number }
  }
```

CSV format: triggers `Content-Disposition: attachment; filename="import-register.csv"`.

### Spec: `bill-of-entry.service.spec.ts`

| Test | Expected |
|---|---|
| `list()` — status filter | `where.status` applied |
| `getById()` — not found | `NotFoundException` |
| `create()` — invoice not found | `NotFoundException` |
| `create()` — success | calls `calculateImportDuty()`; stores all 5 duty fields |
| `update()` — non-DRAFT | `BadRequestException` |
| `transitionStatus()` — invalid next | `BadRequestException` |
| `transitionStatus()` — DRAFT → FILED | sets `filingDate`, stores `boeNumber` |
| `transitionStatus()` — FILED → EXAMINED | sets `examinationDate` |
| `transitionStatus()` — EXAMINED → OOC | sets `outOfChargeDate` |
| `transitionStatus()` — OOC → DUTY_PAID | sets `dutyPaidDate` |
| `getRegister()` — returns join | invoice + supplier included |
| `delete()` — non-DRAFT | `BadRequestException` |

### Spec: `duty-calculator.spec.ts` (co-located pure function tests)

```ts
describe('calculateImportDuty', () => {
  it('calculates BCD as cifValue × bcdRate')
  it('calculates SWS as 10% of BCD always')
  it('calculates IGST on CIF + BCD + SWS base')
  it('compensationCess defaults to 0 when not provided')
  it('totalDuty = BCD + SWS + IGST + compensationCess')
  it('handles 0% BCD correctly (SWS and IGST still calculated)')
  it('full example: CIF=100000, BCD=10%, IGST=18% → totalDuty=29800')
})
```

---

## Task 6: Landed Cost Module (E5-S7)

**Service:** `apps/api/src/modules/imports/landed-cost/landed-cost.service.ts`

### API Endpoints

```
GET    /api/landed-costs        → list (filter: boeId, tenantId)
POST   /api/landed-costs        → create
GET    /api/landed-costs/:id    → getById
PUT    /api/landed-costs/:id    → update (recalculates totals)
DELETE /api/landed-costs/:id    → delete
```

### Key Behaviours

`totalLandedCost = cifValue + customsDuty + clearingCharges + handlingCharges + transportCharges + otherCharges`

`costPerUnit = totalLandedCost / totalQuantity`

### Spec: `landed-cost.service.spec.ts`

| Test | Expected |
|---|---|
| `getById()` — not found | `NotFoundException` |
| `create()` — BoE not found | `NotFoundException` |
| `create()` — success | `totalLandedCost` = sum of all charges |
| `create()` — `costPerUnit` | `totalLandedCost / totalQuantity` rounded to 4 dp |
| `update()` — not found | `NotFoundException` |
| `update()` — recalculates | new charges reflected in `totalLandedCost` and `costPerUnit` |
| `delete()` — success | `delete` called |

---

## Task 7: Import B/L Module (E5-S8, S11, S12)

**Service:** `apps/api/src/modules/imports/import-bl/import-bl.service.ts`

### API Endpoints

```
GET    /api/import-bls              → list (filter: invoiceId, status)
POST   /api/import-bls              → create
GET    /api/import-bls/:id          → getById
PUT    /api/import-bls/:id          → update
PUT    /api/import-bls/:id/status   → status transition (E5-S8)
GET    /api/import-bls/:id/demurrage → demurrage calculation (E5-S11)
DELETE /api/import-bls/:id          → delete

GET    /api/import-documents        → list (filter: boeId, documentType)
POST   /api/import-documents        → create certificate/document (E5-S12)
GET    /api/import-documents/:id    → getById
DELETE /api/import-documents/:id    → delete
```

### Status Transitions (E5-S8)
```
RECEIVED → DELIVERY_ORDER_ISSUED
DELIVERY_ORDER_ISSUED → CARGO_PICKED_UP
```

### Demurrage Calculator (E5-S11)

```ts
export function calculateDemurrage(input: {
  arrivalDate: Date;
  freeDays: number;
  dailyRate: number;
  asOfDate?: Date;
}): {
  freeDaysRemaining: number;
  billableDays: number;
  estimatedCharges: number;
  demurrageStartDate: Date;
} {
  const today = input.asOfDate ?? new Date();
  const demurrageStart = new Date(input.arrivalDate);
  demurrageStart.setDate(demurrageStart.getDate() + input.freeDays);

  const msDiff = today.getTime() - demurrageStart.getTime();
  const billableDays = Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));
  const freeDaysRemaining = Math.max(0, Math.ceil(-msDiff / (1000 * 60 * 60 * 24)));

  return {
    freeDaysRemaining,
    billableDays,
    estimatedCharges: billableDays * input.dailyRate,
    demurrageStartDate: demurrageStart,
  };
}
```

`GET /api/import-bls/:id/demurrage` calls this function with the BL's `arrivalDate`, `freeDays`, `dailyDemurrageRate`, and today's date.

### Spec: `import-bl.service.spec.ts`

| Test | Expected |
|---|---|
| `getById()` — not found | `NotFoundException` |
| `create()` — invoice not found | `NotFoundException` |
| `create()` — success | record created with `status: RECEIVED` |
| `updateStatus()` — invalid | `BadRequestException` |
| `updateStatus()` — RECEIVED → DO_ISSUED | success |
| `getDemurrage()` — within free period | `billableDays = 0`, `estimatedCharges = 0` |
| `getDemurrage()` — past free period | `billableDays > 0`, `estimatedCharges = billableDays × rate` |
| `getDemurrage()` — demurrageStartDate | correct: `arrivalDate + freeDays` |
| `createDocument()` — BoE not found | `NotFoundException` |
| `createDocument()` — success | document stored with `documentType` |
| `deleteDocument()` — success | `delete` called |

---

## Task 8: Frontend — Supplier PO Page (E5-S1, S2, S13, S14)

**File:** `apps/web/app/(dashboard)/imports/purchase-orders/page.tsx`
Replace `ComingSoon` stub with a fully functional page.

### List Table Columns

| Column | Source | Notes |
|---|---|---|
| PO Number | `poNumber` | |
| Supplier | `supplier.name` | |
| Expected Delivery | `expectedDeliveryDate` | Highlighted red if past due + status not CLOSED |
| Currency | `currency` | |
| Total Amount | `totalAmount` | Right-aligned; `CurrencyDisplay` component |
| Status | `status` | `<StatusBadge>` (never raw `<Tag>`) |
| Actions | — | Dropdown |

Filters: Status (select), Supplier (searchable select from `/parties?type=VENDOR`)

### Drawer Form (640px)

- Supplier (required, searchable select from `/parties?type=VENDOR`)
- Currency (select)
- Expected Delivery Date (DatePicker)
- Notes
- Line items table (dynamic, same pattern as PI form): Description, HS Code, Qty, UOM, Unit Price → auto-calculates Total

### Row Actions

| Action | Condition | Confirmation |
|---|---|---|
| Edit | DRAFT | No |
| Submit for Approval | DRAFT | `Popconfirm` |
| Approve | PENDING_APPROVAL | `Popconfirm` |
| Reject | PENDING_APPROVAL | `Popconfirm` |
| Clone | Any | No |
| Delete | DRAFT | `Popconfirm` |

### Fulfillment Display (E5-S14)

On PARTIALLY_FULFILLED / FULLY_FULFILLED rows: show a progress indicator in the status column area showing fulfilled quantity vs total.

### EmptyState

- First-run (no filter, no data): `EmptyState` with CTA "Create Purchase Order"
- Filtered empty: `EmptyState` without CTA

---

## Task 9: Frontend — Supplier Invoices Page (E5-S3)

**New file:** `apps/web/app/(dashboard)/imports/supplier-invoices/page.tsx`

### List Table Columns

| Column | Source |
|---|---|
| Invoice Number | `invoiceNumber` |
| Supplier | `supplier.name` |
| Linked PO | `po.poNumber` (if linked) |
| Invoice Date | `invoiceDate` |
| Due Date | `dueDate` (highlighted red if past + not CLEARED) |
| Currency | `currency` |
| Total Amount | `totalAmount` |
| Status | `<StatusBadge>` |
| Actions | Dropdown |

### Drawer Form (640px)

- Supplier (required)
- Link to PO (optional — shows only APPROVED POs for selected supplier)
- Invoice Number (manual entry)
- Invoice Date + Due Date
- Currency + Exchange Rate (auto-populated from `/exchange-rates?currency=X`)
- Notes
- Line items (dynamic)

### Row Actions

| Action | Condition |
|---|---|
| Edit | DRAFT |
| Mark Received | DRAFT |
| View Document Set | Any → opens 960px drawer |
| Delete | DRAFT |

### Document Set Drawer (E5-S9)

960px drawer opened from "View Document Set" row action. Shows:

```
Supplier Invoice: SINV/2025-26/001 — Acme Supplier — USD 45,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 [✓] Purchase Order     SPO/2025-26/001   APPROVED              12 Jan 2026
 [✓] Supplier Invoice   SINV/2025-26/001  RECEIVED              20 Jan 2026
 [✓] Bill of Entry      BOE/2025-26/001   OUT_OF_CHARGE  Duty: ₹12,300
 [✓] Landed Cost        Total: ₹3,45,200  Cost/unit: ₹345.20
 [✓] Import B/L         MSCUABCD          CARGO_PICKED_UP       25 Jan 2026
 [ ] Import Certificates —                Missing
```

API: `GET /api/supplier-invoices/:id/document-set`

---

## Task 10: Frontend — Bill of Entry Page (E5-S4, S5, S6)

**File:** `apps/web/app/(dashboard)/imports/bills-of-entry/page.tsx`
Replace `ComingSoon` stub.

### List Table Columns

| Column | Source |
|---|---|
| BoE Number | `boeNumber` (dash if not filed) |
| Supplier Invoice | `invoice.invoiceNumber` |
| Port of Entry | `portOfEntry` |
| CIF Value (INR) | `assessedValue` |
| Total Duty | `totalDuty` |
| Status | `<StatusBadge>` |
| OOC Date | `outOfChargeDate` |
| Actions | Dropdown |

### Drawer Form (640px) — Live Duty Calculator

```
Supplier Invoice: [select]
Port of Entry: [text]
CIF Value in INR: [number] ← key input

BCD Rate %: [number]  →  ┌─────────────────────────────┐
IGST Rate %: [number] →  │ Duty Breakdown              │
Comp Cess %: [number] →  │ BCD:        ₹10,000         │
                          │ SWS (10%):  ₹1,000          │
                          │ IGST:       ₹19,980         │
                          │ ─────────────────────────── │
                          │ Total Duty: ₹30,980         │
                          └─────────────────────────────┘
Notes: [textarea]
```

Duty fields update live (client-side) whenever CIF Value or rate inputs change, using the `calculateImportDuty()` utility function from `apps/web/src/lib/import-duty-calculator.ts`.

### Status Transition Buttons

Each available next-status displayed as a button below the row details. All transitions wrapped in `Popconfirm`.

FILED transition: shows an additional field "BoE Number" (required, the number assigned by customs).

### Row Actions

| Action | Condition |
|---|---|
| Edit | DRAFT |
| File | DRAFT |
| Examine / OOC / Duty Paid | Per current status |
| Add Landed Cost | Any → opens landed cost drawer |
| Add Certificate | Any → opens certificate upload drawer (E5-S12) |
| Delete | DRAFT |

---

## Task 11: Frontend — Import B/L + Import Register (E5-S8, S10, S11)

### Import B/L Page

**New file:** `apps/web/app/(dashboard)/imports/import-bl/page.tsx`

**Table columns:** B/L Number, Supplier Invoice, Shipping Line, Vessel, Arrival Date, Free Days Remaining _(computed: `arrivalDate + freeDays - today`, highlighted red ≤ 3)_, Status, Actions

**Row actions:** Edit, Status transition (RECEIVED → DO Issued → Cargo Picked Up), View Demurrage, Delete

**Demurrage modal:** Shows `freeDaysRemaining`, `billableDays`, `estimatedCharges` (read from `GET /api/import-bls/:id/demurrage`).

### Import Register Page (E5-S10)

**New file:** `apps/web/app/(dashboard)/imports/register/page.tsx`

**Table columns:**

| Column | Source |
|---|---|
| PO Number | linked PO |
| Supplier | supplier.name |
| Country | supplier.country |
| CIF Value | assessedValue (INR) |
| Currency | invoice.currency |
| BoE Number | boeNumber |
| BoE Date | filingDate |
| Total Duty | totalDuty |
| OOC Date | outOfChargeDate |
| Status | `<StatusBadge>` |

**Filters:** Date range (filingDate), Supplier (searchable select), Status

**Footer summary:** Total shipments: N | Total CIF: ₹X | Total Duty Paid: ₹Y

**CSV Export:** `GET /api/bills-of-entry/register?format=csv` → triggers browser download

### Sidebar Update

Update `apps/web/components/sidebar.tsx` (or sidebar config file):

```
Imports
  ├── Purchase Orders         (existing — now functional)
  ├── Supplier Invoices       (NEW)
  ├── Bills of Entry          (existing — now functional)
  ├── Import B/L              (NEW)
  └── Import Register         (NEW)
```

---

## Task 12: Frontend Test Infrastructure

### New devDependencies in `apps/web/package.json`

```json
"jest": "^30.0.0",
"jest-environment-jsdom": "^30.0.0",
"ts-jest": "^29.0.0",
"@types/jest": "^30.0.0",
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.0.0",
"@testing-library/user-event": "^14.0.0"
```

### New file: `apps/web/jest.config.ts`

```ts
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  testRegex: '.*\\.spec\\.(ts|tsx)$',
  moduleNameMapper: {
    '^@exim/ui(.*)$': '<rootDir>/../../packages/ui/src$1',
    '^@exim/shared(.*)$': '<rootDir>/../../packages/shared/src$1',
  },
  collectCoverageFrom: ['src/lib/**/*.ts'],
  coverageThreshold: { global: { statements: 70 } },
};

export default createJestConfig(config);
```

### New file: `apps/web/jest.setup.ts`

```ts
import '@testing-library/jest-dom';
```

### New scripts in `apps/web/package.json`

```json
"test": "jest",
"test:watch": "jest --watch",
"test:cov": "jest --coverage"
```

---

## Task 13: Backend Unit Tests — 5 new spec files

All follow the Sprint 5 pattern: NestJS `TestingModule` + `createPrismaMock()` + `jest.clearAllMocks()` in `beforeEach`.

### New fixtures to add to `apps/api/src/test/fixtures.ts`

```ts
export const makeSupplierPo = (overrides: Record<string, unknown> = {}) => ({
  id: 'spo-id', tenantId: TENANT_ID, poNumber: 'SPO/2025-26/001',
  supplierPartyId: PARTY_ID, currency: 'USD', status: 'DRAFT',
  totalAmount: 1000, approvedBy: null, approvedAt: null,
  notes: null, createdBy: USER_ID, lineItems: [],
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

export const makeSupplierInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: 'sinv-id', tenantId: TENANT_ID, invoiceNumber: 'SINV/2025-26/001',
  supplierPartyId: PARTY_ID, poId: null, currency: 'USD',
  exchangeRate: 84.5, invoiceDate: new Date(), dueDate: null,
  totalAmount: 45000, status: 'DRAFT',
  notes: null, createdBy: USER_ID, lineItems: [],
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

export const makeBoe = (overrides: Record<string, unknown> = {}) => ({
  id: 'boe-id', tenantId: TENANT_ID, boeNumber: null,
  invoiceId: 'sinv-id', portOfEntry: 'INNSA', assessedValue: 3800000,
  basicDuty: 380000, socialWelfareSurcharge: 38000, igst: 758840,
  compensationCess: 0, totalDuty: 1176840, status: 'DRAFT',
  filingDate: null, examinationDate: null, outOfChargeDate: null, dutyPaidDate: null,
  notes: null, createdBy: USER_ID, createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

export const makeLandedCost = (overrides: Record<string, unknown> = {}) => ({
  id: 'lc-id', tenantId: TENANT_ID, boeId: 'boe-id',
  cifValue: 3800000, customsDuty: 1176840, clearingCharges: 15000,
  handlingCharges: 5000, transportCharges: 12000, otherCharges: 0,
  totalLandedCost: 5008840, totalQuantity: 100, costPerUnit: 50088.4,
  notes: null, createdBy: USER_ID, createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

export const makeImportBl = (overrides: Record<string, unknown> = {}) => ({
  id: 'ibl-id', tenantId: TENANT_ID, invoiceId: 'sinv-id',
  blNumber: 'MSCUABCD12345', blDate: new Date(), shippingLine: 'MSC',
  vesselName: 'MSC MAYA', containerNumbers: 'MSCU1234567',
  arrivalDate: new Date(), freeDays: 14, dailyDemurrageRate: 8000,
  deliveryOrderNumber: null, deliveryOrderDate: null, status: 'RECEIVED',
  documentUrl: null, notes: null, createdBy: USER_ID,
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});
```

### Spec file summary

| File | Service | Key coverage |
|---|---|---|
| `supplier-po.service.spec.ts` | `SupplierPoService` | list, CRUD, approval workflow, clone, fulfillment update |
| `supplier-invoice.service.spec.ts` | `SupplierInvoiceService` | list, CRUD, receive, document set aggregation, PO fulfillment trigger |
| `bill-of-entry.service.spec.ts` | `BillOfEntryService` | list, CRUD, duty auto-calc, status transitions, register |
| `duty-calculator.spec.ts` | `calculateImportDuty` | all 7 pure function cases |
| `landed-cost.service.spec.ts` | `LandedCostService` | list, CRUD, totalLandedCost + costPerUnit calculation |
| `import-bl.service.spec.ts` | `ImportBlService` | list, CRUD, status transitions, demurrage calc, import documents CRUD |

**Run after completion:**
```bash
pnpm --filter api test:cov
# Expected: all 270 existing + ~80 new tests pass
# Coverage: ≥70% on modules/**/*.service.ts (maintained)
```

---

## Task 14: Frontend Utility Tests

Pure calculation functions extracted to `apps/web/src/lib/`:

### `src/lib/import-duty-calculator.ts` + spec

```ts
// spec tests
it('BCD = cifValue × bcdRate')
it('SWS = BCD × 0.10 always')
it('IGST base = CIF + BCD + SWS')
it('compensationCess = 0 when not provided')
it('totalDuty = BCD + SWS + IGST + cess')
it('full example: CIF=100000, BCD=10%, IGST=18% → BCD=10000, SWS=1000, IGST=19980, total=30980')
it('0% BCD → SWS=0, IGST on CIF only')
```

### `src/lib/demurrage-calculator.ts` + spec

```ts
it('within free period → billableDays=0, estimatedCharges=0')
it('freeDaysRemaining = freeDays - days since arrival (when within free period)')
it('past free period → billableDays > 0, charges = billableDays × dailyRate')
it('demurrageStartDate = arrivalDate + freeDays')
it('asOfDate parameter makes result deterministic for testing')
```

### `src/lib/landed-cost-calculator.ts` + spec

```ts
it('totalLandedCost = cifValue + customsDuty + all charges')
it('costPerUnit = totalLandedCost / totalQuantity')
it('zero additional charges → landed cost = cifValue + customsDuty')
it('rounding: costPerUnit rounded to 4 decimal places')
```

**Run after completion:**
```bash
pnpm --filter web test:cov
# Expected: all utility spec tests pass
# Coverage: ≥70% on src/lib/**
```

---

## Dependency Graph

```
Task 0: Schema
  │
  ├──→ Task 1: DocNumber (SPO, SINV, BOE prefixes)
  ├──→ Task 2: ImportsModule scaffold
  │       │
  │       ├──→ Task 3: Supplier PO ───────→ Task 8:  PO page (frontend)
  │       ├──→ Task 4: Supplier Invoice ──→ Task 9:  Supplier Invoice page
  │       ├──→ Task 5: Bill of Entry ─────→ Task 10: BoE page
  │       ├──→ Task 6: Landed Cost ───────→ Task 10: (Landed Cost drawer on BoE page)
  │       └──→ Task 7: Import B/L ────────→ Task 11: Import B/L + Register page
  │
  ├──→ Task 13: Backend spec files (parallel with Tasks 3–7)
  │
Task 12: Frontend test infra
  └──→ Task 14: Frontend utility tests
```

---

## Execution Order

| Order | Task | Blocker | Notes |
|---|---|---|---|
| 1 | Task 0: Schema | — | Foundation |
| 2 | Task 1: DocNumber | Task 0 | Quick 3-line change |
| 3 | Task 2: ImportsModule scaffold | Task 0 | Wire-up only |
| 4 | Task 3: Supplier PO | Task 2 | Core flow entry point |
| 5 | Task 4: Supplier Invoice | Task 3 | Depends on PO model |
| 6 | Task 5: Bill of Entry | Task 4 | Depends on SupplierInvoice |
| 7 | Task 6: Landed Cost | Task 5 | Depends on BoE |
| 8 | Task 7: Import B/L + Docs | Tasks 4, 5 | Depends on both SupplierInvoice + BoE |
| 9 | Task 13: Backend specs | Task 0 | Parallel after schema; one spec per service |
| 10 | Task 8: Frontend PO page | Task 3 | Replaces ComingSoon |
| 11 | Task 9: Frontend Supplier Invoice | Task 4 | New route |
| 12 | Task 10: Frontend BoE page | Tasks 5, 6 | Replaces ComingSoon; includes landed cost drawer |
| 13 | Task 11: Frontend B/L + Register | Tasks 7 | New routes |
| 14 | Task 12: Frontend test infra | — | Independent — run alongside |
| 15 | Task 14: Frontend utility tests | Task 12 | After infra + utilities extracted |

---

## Definition of Done

- [ ] `pnpm --filter db db:generate && pnpm --filter db db:push` — 6 new models, 5 new enums migrated
- [ ] `pnpm --filter api test:cov` — all existing 270 + ~80 new tests pass; ≥ 70% statement coverage on `modules/**/*.service.ts` maintained
- [ ] `pnpm --filter web test:cov` — 3 utility spec files pass; ≥ 70% on `src/lib/**`
- [ ] Purchase Orders page: list, create, submit, approve, reject, clone all work end-to-end
- [ ] Supplier Invoices page: list, create, mark received, document set drawer works
- [ ] Bill of Entry page: duty calculator updates live in drawer; all 4 status transitions work
- [ ] Import B/L page: free days countdown visible; demurrage modal shows estimated charges
- [ ] Import Register page: filters work; CSV export downloads a file
- [ ] Import Document Set drawer shows all 6 document types with correct status
- [ ] PO fulfillment status auto-updates when a supplier invoice is created for that PO
- [ ] Clone PO creates a new DRAFT with a new number and today's date
- [ ] `StatusBadge` used for all status columns — no raw `<Tag>` for statuses
- [ ] `EmptyState` used in all 5 new list tables
- [ ] All destructive actions (Submit, Approve, Delete) wrapped in `Popconfirm`
- [ ] Sidebar has 3 new import navigation items (Supplier Invoices, Import B/L, Import Register)
- [ ] `pnpm build` succeeds across the monorepo with no TypeScript errors

---

**Document Version:** 1.0
**Last Updated:** February 2026