# Sprint 3: Export Documentation

**Sprint Goal:** A complete export document chain — Proforma Invoice → Commercial Invoice → Packing List → Shipping Bill — so an exporter can create and track a full shipment end-to-end in the system.

**Scope:** Backend API (NestJS) + Prisma schema + Frontend pages

**Stories Covered:** E4-S1, E4-S2, E4-S3, E4-S4, E4-S5, E4-S6, E4-S7, E4-S8, E4-S9
**Bonus:** Reference Data Browser (admin visibility into seed data — ports, countries, HS codes, UOMs, Incoterms)

---

## Sprint Outcome

By the end of this sprint, the following works end-to-end:

```
1. Create a Proforma Invoice (PI) — select buyer, add line items, set Incoterm & payment terms
2. Revise a PI (version control — v1, v2, v3 retained)
3. Convert a finalized PI to a Commercial Invoice in one click
4. Create a standalone Commercial Invoice with full customs detail
5. Finalize → Lock an invoice (locked after SB filing)
6. Record a buyer's Purchase Order and link it to a PI
7. Create a Packing List from an invoice with package-level detail
8. Create a Shipping Bill (FREE, DRAWBACK, RODTEP, or EPCG)
9. Track Shipping Bill status: Draft → Filed → Assessed → LEO → Shipped
10. Generate a Certificate of Origin and track its issuance status
11. Browse reference data (ports, countries, HS codes, UOMs, Incoterms) in admin UI
```

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Document hierarchy | Invoice is the master; PI, PL, SB, CoO all link to it | Invoice is the legally binding document; others are derived from or reference it |
| Document numbering | `{PREFIX}/{FY}/{SEQ}` e.g. `PI/2025-26/001` | Standard Indian trade document format; financial year (Apr–Mar) based |
| Sequence tracking | `DocumentSequence` table per tenant per type per year | Atomic, DB-level sequence with no race conditions |
| Line item storage | Separate line item table per document type | Clear schema, no polymorphic joins; easier to add document-specific columns later |
| PI → CI conversion | Copy all fields to new CI, link `piId` on CI, set PI status to CONVERTED | Clean lineage tracking; CI can still be edited after conversion |
| PI revisions | New row with `parentId` = original PI id, version incremented | Simple; all versions retained and queryable; only latest is active |
| Exchange rate snapshot | Captured at CI creation time from `ExchangeRate` table | Rates change daily; snapshot ensures auditability of INR equivalents |
| SB status machine | Enum transitions with `SbStatusHistory` audit log | Traceable for customs compliance; supports CHA workflow |
| No PDF generation | Deferred to Sprint 4 (E11) | PDF templates need dedicated design; data model comes first |
| Buyer PO | Simple form + optional link to PI | Don't over-engineer; PO reconciliation is Sprint 4+ |
| Reference Data Browser | Read-only admin page, tabbed by entity | Quick verification tool; no edit needed (data is system-managed) |

---

## Task 1: Prisma Schema — Export Document Models

**New models to add to `packages/db/prisma/schema.prisma`:**

```prisma
// ─── Document Sequence ────────────────────────────────────────────────────────

model DocumentSequence {
  id           String @id @default(cuid())
  tenantId     String
  documentType String  // PI, INV, PL, SB, COO, BPO
  year         Int     // Financial year start, e.g. 2025 for FY 2025-26
  lastSequence Int     @default(0)

  @@unique([tenantId, documentType, year])
  @@map("document_sequences")
}

// ─── Proforma Invoice ─────────────────────────────────────────────────────────

model ProformaInvoice {
  id                  String    @id @default(cuid())
  tenantId            String
  piNumber            String    // PI/2025-26/001
  version             Int       @default(1)
  parentId            String?   // set on revisions; points to id of v1
  status              PiStatus  @default(DRAFT)
  date                DateTime
  validUntil          DateTime?
  buyerPartyId        String
  incoterm            String
  portOfLoading       String?
  portOfDischarge     String?
  paymentTerms        String?
  currency            String    @default("USD")
  freightAmount       Decimal?  @db.Decimal(15, 2)
  insuranceAmount     Decimal?  @db.Decimal(15, 2)
  totalAmount         Decimal   @db.Decimal(15, 2)
  deliveryTimeline    String?
  bankAccountId       String?
  termsContent        String?
  specialInstructions String?
  amendmentNotes      String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  tenant      Tenant              @relation(fields: [tenantId], references: [id])
  buyer       Party               @relation("PiBuyer", fields: [buyerPartyId], references: [id])
  lineItems   ProformaLineItem[]
  invoices    CommercialInvoice[]
  buyerPOs    BuyerPurchaseOrder[]

  @@index([tenantId, status])
  @@map("proforma_invoices")
}

model ProformaLineItem {
  id          String  @id @default(cuid())
  piId        String
  lineNumber  Int
  productId   String?
  description String
  hsCode      String?
  quantity    Decimal @db.Decimal(12, 4)
  uomCode     String
  unitPrice   Decimal @db.Decimal(15, 4)
  amount      Decimal @db.Decimal(15, 2)

  pi          ProformaInvoice @relation(fields: [piId], references: [id], onDelete: Cascade)

  @@map("proforma_line_items")
}

// ─── Commercial Invoice ───────────────────────────────────────────────────────

model CommercialInvoice {
  id               String        @id @default(cuid())
  tenantId         String
  invoiceNumber    String        // INV/2025-26/001
  status           InvoiceStatus @default(DRAFT)
  date             DateTime
  piId             String?       // set if converted from PI
  buyerPartyId     String
  notifyPartyId    String?
  incoterm         String
  portOfLoading    String?
  portOfDischarge  String?
  countryOfOrigin  String?
  finalDestination String?
  vesselFlight     String?
  preCarriage      String?
  placeOfReceipt   String?
  paymentTerms     String?
  currency         String        @default("USD")
  exchangeRate     Decimal?      @db.Decimal(12, 6) // INR per 1 unit of currency, snapshotted at creation
  subtotalAmount   Decimal       @db.Decimal(15, 2) // FOB value in invoice currency
  freightAmount    Decimal?      @db.Decimal(15, 2)
  insuranceAmount  Decimal?      @db.Decimal(15, 2)
  totalAmount      Decimal       @db.Decimal(15, 2)
  exportType       String        @default("LUT")    // LUT, BOND_IGST, PAID_IGST
  bankAccountId    String?
  termsContent     String?
  notes            String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  tenant               Tenant              @relation(fields: [tenantId], references: [id])
  buyer                Party               @relation("InvoiceBuyer", fields: [buyerPartyId], references: [id])
  proformaInvoice      ProformaInvoice?    @relation(fields: [piId], references: [id])
  lineItems            InvoiceLineItem[]
  packingLists         PackingList[]
  shippingBills        ShippingBill[]
  certificatesOfOrigin CertificateOfOrigin[]

  @@index([tenantId, status])
  @@map("commercial_invoices")
}

model InvoiceLineItem {
  id              String   @id @default(cuid())
  invoiceId       String
  lineNumber      Int
  productId       String?
  description     String
  hsCode          String?
  countryOfOrigin String?
  marksNumbers    String?
  quantity        Decimal  @db.Decimal(12, 4)
  uomCode         String
  unitPrice       Decimal  @db.Decimal(15, 4)
  amount          Decimal  @db.Decimal(15, 2)
  netWeight       Decimal? @db.Decimal(10, 4)
  grossWeight     Decimal? @db.Decimal(10, 4)

  invoice         CommercialInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@map("invoice_line_items")
}

// ─── Buyer Purchase Order ─────────────────────────────────────────────────────

model BuyerPurchaseOrder {
  id                   String    @id @default(cuid())
  tenantId             String
  poNumber             String
  poDate               DateTime
  piId                 String?
  buyerPartyId         String
  expectedDeliveryDate DateTime?
  status               PoStatus  @default(PENDING)
  documentUrl          String?
  notes                String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  tenant    Tenant           @relation(fields: [tenantId], references: [id])
  buyer     Party            @relation("PosBuyer", fields: [buyerPartyId], references: [id])
  pi        ProformaInvoice? @relation(fields: [piId], references: [id])
  lineItems BuyerPoLineItem[]

  @@map("buyer_purchase_orders")
}

model BuyerPoLineItem {
  id          String  @id @default(cuid())
  poId        String
  productId   String?
  description String
  quantity    Decimal @db.Decimal(12, 4)
  uomCode     String
  unitPrice   Decimal @db.Decimal(15, 4)

  po          BuyerPurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)

  @@map("buyer_po_line_items")
}

// ─── Packing List ─────────────────────────────────────────────────────────────

model PackingList {
  id               String   @id @default(cuid())
  tenantId         String
  plNumber         String   // PL/2025-26/001
  status           PlStatus @default(DRAFT)
  date             DateTime
  invoiceId        String
  shippingMarks    String?
  totalPackages    Int?
  totalNetWeight   Decimal? @db.Decimal(10, 3)
  totalGrossWeight Decimal? @db.Decimal(10, 3)
  totalCbm         Decimal? @db.Decimal(10, 4)
  notes            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  tenant   Tenant            @relation(fields: [tenantId], references: [id])
  invoice  CommercialInvoice @relation(fields: [invoiceId], references: [id])
  packages PackingItem[]

  @@map("packing_lists")
}

model PackingItem {
  id          String   @id @default(cuid())
  plId        String
  packageNo   String   // "1/10", "2/10"
  contents    String?
  quantity    Decimal  @db.Decimal(12, 4)
  netWeight   Decimal  @db.Decimal(10, 3)
  grossWeight Decimal  @db.Decimal(10, 3)
  dimensionL  Decimal? @db.Decimal(8, 2)  // cm
  dimensionW  Decimal? @db.Decimal(8, 2)
  dimensionH  Decimal? @db.Decimal(8, 2)
  cbm         Decimal? @db.Decimal(10, 4) // auto-calculated: L×W×H / 1,000,000

  packingList PackingList @relation(fields: [plId], references: [id], onDelete: Cascade)

  @@map("packing_items")
}

// ─── Shipping Bill ────────────────────────────────────────────────────────────

model ShippingBill {
  id                   String   @id @default(cuid())
  tenantId             String
  sbNumber             String?  // entered by CHA after ICEGATE filing
  sbType               SbType   @default(FREE)
  status               SbStatus @default(DRAFT)
  date                 DateTime
  invoiceId            String
  portCode             String
  modeOfShipment       String   // SEA, AIR, ROAD, RAIL
  countryOfDestination String
  exchangeRate         Decimal  @db.Decimal(12, 6)
  totalFobInr          Decimal  @db.Decimal(15, 2)
  freightInr           Decimal? @db.Decimal(15, 2)
  insuranceInr         Decimal? @db.Decimal(15, 2)
  leoNumber            String?
  leoDate              DateTime?
  notes                String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  tenant        Tenant            @relation(fields: [tenantId], references: [id])
  invoice       CommercialInvoice @relation(fields: [invoiceId], references: [id])
  lineItems     SbLineItem[]
  statusHistory SbStatusHistory[]

  @@index([tenantId, status])
  @@map("shipping_bills")
}

model SbLineItem {
  id             String   @id @default(cuid())
  sbId           String
  lineNumber     Int
  description    String
  hsCode         String
  quantity       Decimal  @db.Decimal(12, 4)
  uomCode        String
  unitPriceInr   Decimal  @db.Decimal(15, 4)
  fobValueInr    Decimal  @db.Decimal(15, 2)
  drawbackRate   Decimal? @db.Decimal(6, 2)   // only for DRAWBACK type SBs
  drawbackAmount Decimal? @db.Decimal(15, 2)

  shippingBill   ShippingBill @relation(fields: [sbId], references: [id], onDelete: Cascade)

  @@map("sb_line_items")
}

model SbStatusHistory {
  id        String   @id @default(cuid())
  sbId      String
  status    SbStatus
  changedAt DateTime @default(now())
  changedBy String   // userId
  notes     String?

  shippingBill ShippingBill @relation(fields: [sbId], references: [id], onDelete: Cascade)

  @@map("sb_status_history")
}

// ─── Certificate of Origin ────────────────────────────────────────────────────

model CertificateOfOrigin {
  id               String    @id @default(cuid())
  tenantId         String
  cooNumber        String    // COO/2025-26/001
  issueDate        DateTime
  invoiceId        String
  cooType          String    // NON_PREFERENTIAL, PREFERENTIAL_ASEAN, PREFERENTIAL_SAFTA, etc.
  issuingAuthority String    // e.g. FIEO, MCCI, Chamber of Commerce
  status           CooStatus @default(DRAFT)
  documentUrl      String?   // uploaded scanned copy after issuance
  notes            String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  tenant  Tenant            @relation(fields: [tenantId], references: [id])
  invoice CommercialInvoice @relation(fields: [invoiceId], references: [id])

  @@map("certificates_of_origin")
}

// ─── New Enums ────────────────────────────────────────────────────────────────

enum PiStatus      { DRAFT FINALIZED CONVERTED CANCELLED }
enum InvoiceStatus { DRAFT FINALIZED LOCKED }
enum PlStatus      { DRAFT FINALIZED }
enum PoStatus      { PENDING ACCEPTED REJECTED }
enum SbType        { FREE DRAWBACK RODTEP EPCG }
enum SbStatus      { DRAFT FILED UNDER_ASSESSMENT ASSESSED LEO SHIPPED }
enum CooStatus     { DRAFT SUBMITTED ISSUED }
```

**New relations to add on `Tenant` model:**
```prisma
proformaInvoices     ProformaInvoice[]
commercialInvoices   CommercialInvoice[]
buyerPurchaseOrders  BuyerPurchaseOrder[]
packingLists         PackingList[]
shippingBills        ShippingBill[]
certificatesOfOrigin CertificateOfOrigin[]
documentSequences    DocumentSequence[]
```

**New relations to add on `Party` model:**
```prisma
piAsBuyer            ProformaInvoice[]      @relation("PiBuyer")
invoicesAsBuyer      CommercialInvoice[]    @relation("InvoiceBuyer")
buyerPurchaseOrders  BuyerPurchaseOrder[]   @relation("PosBuyer")
```

---

## Task 2: Document Number Generator Service

**File:** `apps/api/src/common/services/doc-number.service.ts`

**Logic:**
```
getNextNumber(tenantId, documentType) → string

1. Determine financial year start:
   - If current month >= 4 (April+): fyYear = current year
   - Else: fyYear = current year - 1
   - FY label: "2025-26" (fyYear + "-" + (fyYear+1).toString().slice(2))

2. Upsert DocumentSequence for (tenantId, documentType, fyYear)
   - Increment lastSequence atomically via Prisma $transaction

3. Return: "{PREFIX}/{FY_LABEL}/{SEQ padded to 3 digits}"
```

**Prefix map:**
| documentType | Prefix | Example |
|---|---|---|
| PI | PI | PI/2025-26/001 |
| INV | INV | INV/2025-26/001 |
| PL | PL | PL/2025-26/001 |
| SB | SB | SB/2025-26/001 |
| COO | COO | COO/2025-26/001 |
| BPO | PO | PO/2025-26/001 |

---

## Task 3: Backend — Proforma Invoice Module

**Module:** `apps/api/src/modules/exports/proforma/`

**Endpoints:**
```
GET    /api/proforma-invoices                → list (paginated; filter: status, buyerPartyId, dateFrom, dateTo)
POST   /api/proforma-invoices                → create (auto-generate PI number)
GET    /api/proforma-invoices/:id            → get by id (with line items)
PUT    /api/proforma-invoices/:id            → update (DRAFT only)
POST   /api/proforma-invoices/:id/finalize   → DRAFT → FINALIZED
POST   /api/proforma-invoices/:id/revise     → FINALIZED → creates new version with parentId
POST   /api/proforma-invoices/:id/convert    → FINALIZED → creates CommercialInvoice, sets PI to CONVERTED
DELETE /api/proforma-invoices/:id            → soft cancel (DRAFT only)
```

**Key behaviours:**
- Line items replaced on every PUT (deleteMany + createMany)
- `revise`: copies PI into new row with `version + 1`, `parentId = original id`, original marked CANCELLED
- `convert`: copies PI fields → new CI (auto-generates INV number), links `piId`, returns new CI; PI status → CONVERTED
- Total auto-calculated: sum of line item amounts + freight + insurance

---

## Task 4: Backend — Commercial Invoice Module

**Module:** `apps/api/src/modules/exports/invoice/`

**Endpoints:**
```
GET    /api/invoices                → list (paginated; filter: status, buyerPartyId, dateFrom, dateTo)
POST   /api/invoices                → create standalone
GET    /api/invoices/:id            → get with line items
PUT    /api/invoices/:id            → update (DRAFT only)
POST   /api/invoices/:id/finalize   → DRAFT → FINALIZED
POST   /api/invoices/:id/lock       → FINALIZED → LOCKED (called when SB is filed)
DELETE /api/invoices/:id            → delete (DRAFT only)
```

**Key behaviours:**
- On `create`: look up current RBI exchange rate for `currency` from `ExchangeRate` table; snapshot into `exchangeRate` field
- LOCKED status blocks all edits; returns 409 if attempted
- INR equivalent (for display) = `totalAmount × exchangeRate`

---

## Task 5: Backend — Buyer Purchase Order Module

**Module:** `apps/api/src/modules/exports/buyer-po/`

**Endpoints:**
```
GET    /api/buyer-pos               → list
POST   /api/buyer-pos               → create
GET    /api/buyer-pos/:id           → get with line items
PUT    /api/buyer-pos/:id           → update
PUT    /api/buyer-pos/:id/status    → set ACCEPTED / REJECTED (body: { status })
DELETE /api/buyer-pos/:id           → delete
```

---

## Task 6: Backend — Packing List Module

**Module:** `apps/api/src/modules/exports/packing-list/`

**Endpoints:**
```
GET    /api/packing-lists               → list
POST   /api/packing-lists               → create (pass invoiceId to pre-fill packages)
GET    /api/packing-lists/:id           → get with packages
PUT    /api/packing-lists/:id           → update
POST   /api/packing-lists/:id/finalize  → DRAFT → FINALIZED
DELETE /api/packing-lists/:id           → delete (DRAFT only)
```

**Key behaviours:**
- `POST` with `invoiceId`: pre-populates one package per invoice line item as default
- CBM auto-calculated on save: `round(L × W × H / 1_000_000, 4)` (dimensions in cm)
- Header totals (totalPackages, totalNetWeight, totalGrossWeight, totalCbm) auto-summed from packages on every save

---

## Task 7: Backend — Shipping Bill Module

**Module:** `apps/api/src/modules/exports/shipping-bill/`

**Endpoints:**
```
GET    /api/shipping-bills               → list (filter: status, sbType, dateFrom, dateTo)
POST   /api/shipping-bills               → create (pass invoiceId to pre-fill line items)
GET    /api/shipping-bills/:id           → get with line items + status history
PUT    /api/shipping-bills/:id           → update (DRAFT only)
POST   /api/shipping-bills/:id/status    → transition status (body: { status, notes, leoNumber?, leoDate? })
DELETE /api/shipping-bills/:id           → delete (DRAFT only)
```

**Status transition rules (enforced in service):**
```
DRAFT            → FILED
FILED            → UNDER_ASSESSMENT
UNDER_ASSESSMENT → ASSESSED
ASSESSED         → LEO          (requires leoNumber + leoDate in body)
LEO              → SHIPPED
```
Each transition appends to `SbStatusHistory` with `changedBy = req.user.sub`.

When SB transitions to FILED → also call `invoice.lock()` on the linked CI.

---

## Task 8: Backend — Certificate of Origin Module

**Module:** `apps/api/src/modules/exports/coo/`

**Endpoints:**
```
GET    /api/coo                     → list
POST   /api/coo                     → create (invoiceId required; auto-populate exporter/consignee)
GET    /api/coo/:id                 → get by id
PUT    /api/coo/:id                 → update (DRAFT only)
POST   /api/coo/:id/status          → DRAFT → SUBMITTED → ISSUED
DELETE /api/coo/:id                 → delete (DRAFT only)
```

---

## Task 9: Backend — Exports Module Registration

**File:** `apps/api/src/modules/exports/exports.module.ts`

Register: `ProformaModule`, `InvoiceModule`, `BuyerPoModule`, `PackingListModule`, `ShippingBillModule`, `CooModule`.

Add `DocNumberService` to `CommonModule` (or inline in each module — simpler for now).

Register `ExportsModule` in `AppModule`.

---

## Task 10: Frontend — Navigation Update

Expand the existing **Exports** section in sidebar:

```
Exports (ExportOutlined)
  ├── Proforma Invoices  → /exports/proforma-invoices
  ├── Invoices           → /exports/invoices
  ├── Packing Lists      → /exports/packing-lists
  └── Shipping Bills     → /exports/shipping-bills
```

Add to **Settings** section (admin only):
```
Settings
  ├── ...existing items...
  └── Reference Data     → /settings/reference-data   ← NEW
```

Buyer POs and CoO are accessed from within the PI/Invoice detail view, not as top-level nav items.

**New route directories:**
```
app/(dashboard)/
  exports/
    proforma-invoices/page.tsx
    invoices/page.tsx
    packing-lists/page.tsx
    shipping-bills/page.tsx
  settings/
    reference-data/page.tsx
```

---

## Task 11: Frontend — Proforma Invoices Page

**`/exports/proforma-invoices`:**
- `DataTable`: PI number, version, buyer, date, valid until, currency, total, status badge
- Filters: status, date range
- Row actions: Edit (DRAFT), Finalize, Revise (FINALIZED), Convert to Invoice (FINALIZED), Cancel

**PI Drawer form sections:**
1. **Header** — buyer (searchable select from parties), date, valid until, PI number (read-only, auto-generated)
2. **Shipping** — Incoterm, port of loading, port of discharge, delivery timeline
3. **Payment** — currency, payment terms, bank account
4. **Line Items** — add/remove rows: product search → auto-fill description/HS code, qty, UOM, unit price, amount (auto-calc)
5. **Totals** — freight (optional), insurance (optional), total (auto-summed)
6. **Terms** — terms template select or free text

---

## Task 12: Frontend — Commercial Invoices Page

**`/exports/invoices`:**
- `DataTable`: invoice number, buyer, date, FOB value, currency, INR equivalent, status
- "New Invoice" and "From PI" → same form, pre-filled if from PI

**Invoice Drawer form sections:**
1. **Header** — buyer, notify party, date, invoice number, link to PI (optional)
2. **Shipping Details** — pre-carriage, place of receipt, vessel/flight, port of loading, port of discharge, country of origin, final destination
3. **Trade Terms** — Incoterm, currency, exchange rate (auto-filled, editable), payment terms
4. **Line Items** — same as PI plus: marks & numbers, net weight, gross weight per item
5. **Totals** — subtotal (FOB), freight, insurance, total; INR equivalent row (auto-calc)
6. **Export Declaration** — LUT / Bond+IGST / Paid IGST
7. **Bank & Terms** — bank account, terms template

---

## Task 13: Frontend — Packing Lists Page

**`/exports/packing-lists`:**
- `DataTable`: PL number, invoice ref, date, total packages, total weight, CBM, status
- "New PL" → select linked invoice → auto-pre-fill or blank

**PL form sections:**
1. **Header** — date, PL number (auto), invoice select, shipping marks
2. **Packages table** — package no, contents, qty, net weight, gross weight, L×W×H (cm), CBM (auto-calc)
3. **Totals** — auto-summed from packages

---

## Task 14: Frontend — Shipping Bills Page

**`/exports/shipping-bills`:**
- `DataTable`: SB number (or "Pending"), invoice ref, SB type badge, port, mode, FOB (INR), status badge
- Filters: status, SB type, date range
- "New SB" → select invoice → auto-fill

**SB form sections:**
1. **Header** — SB type, date, SB number (blank until filed), port, mode, country of destination
2. **Invoice Link** — invoice select, exchange rate (auto-filled)
3. **Line Items** — description, HS code, qty, UOM, unit price (INR), FOB value (INR); drawback fields visible if type = DRAWBACK
4. **Totals** — total FOB, freight, insurance (all INR)

**Status Timeline** (below the form, read-only):
- Visual step indicator: DRAFT → FILED → UNDER ASSESSMENT → ASSESSED → LEO → SHIPPED
- History table: status, date, user, notes
- "Update Status" button → modal with next-state options + notes field + LEO number/date if transitioning to LEO

---

## Task 15: Frontend — Reference Data Browser (Bonus)

**`/settings/reference-data`** (admin only)

A tabbed read-only page with 5 tabs, each calling the existing `/api/reference/*` endpoints:

| Tab | API | Columns |
|---|---|---|
| Ports | `/api/reference/ports` | Code, Name, Country, Type |
| Countries | `/api/reference/countries` | Code, 3-letter, Name, Currency, FTA ✓/✗ |
| HS Codes | `/api/reference/hs-codes` | Code, Chapter, Description, BCD%, IGST% |
| UOMs | `/api/reference/uoms` | Code, Name |
| Incoterms | `/api/reference/incoterms` | Code, Full Name, Risk Transfer Point, Mode |

Each tab: search box → debounced query → table results. No pagination for UOMs/Incoterms (small sets), server-side search for Ports/Countries/HS Codes.

---

## Dependency Graph

```
Task 1: Schema
  │
  ├──→ Task 2: Doc Number Service
  │      │
  │      ├──→ Task 3: Proforma API  ──→ Task 11: PI UI
  │      ├──→ Task 4: Invoice API   ──→ Task 12: Invoice UI
  │      │      │
  │      │      ├──→ Task 6: Packing List API ──→ Task 13: PL UI
  │      │      └──→ Task 7: Shipping Bill API ──→ Task 14: SB UI
  │      ├──→ Task 5: Buyer PO API
  │      └──→ Task 8: CoO API
  │
  └──→ Task 9: Exports Module Registration
         └──→ Task 10: Navigation ──→ Tasks 11–15
```

## Execution Order

| Order | Task | Notes |
|---|---|---|
| 1 | Task 1: Schema | Foundation |
| 2 | Task 2: Doc Number Service | Shared by all export modules |
| 3 | Task 3: Proforma Invoice API | |
| 4 | Task 4: Commercial Invoice API | Depends on Task 3 (convert flow) |
| 5 | Task 5: Buyer PO API | Independent |
| 6 | Task 6: Packing List API | Depends on Task 4 |
| 7 | Task 7: Shipping Bill API | Depends on Task 4 |
| 8 | Task 8: CoO API | Depends on Task 4 |
| 9 | Task 9: Exports Module Registration | Wire everything |
| 10 | Task 10: Frontend Navigation | |
| 11 | Task 11: PI Frontend | |
| 12 | Task 12: Invoice Frontend | Most complex form |
| 13 | Task 13: Packing List Frontend | |
| 14 | Task 14: Shipping Bill Frontend | Includes status timeline |
| 15 | Task 15: Reference Data Browser | Independent |

---

## Definition of Done

- [ ] All export document APIs return correct responses with proper status codes
- [ ] PI → CI conversion: all fields carried forward, PI marked CONVERTED, new CI has `piId` set
- [ ] PI revision: creates v2 with `parentId`, v1 marked CANCELLED, version number incremented
- [ ] Document numbers follow `{PREFIX}/{FY}/{SEQ}` format, sequence is per-tenant per financial year
- [ ] Exchange rate is snapshotted at CI creation time (not fetched dynamically on read)
- [ ] SB status transitions enforced — cannot skip states or go backwards
- [ ] SB status history records every transition with timestamp and user
- [ ] When SB is FILED, the linked CI status changes to LOCKED
- [ ] Packing list CBM auto-calculates from L×W×H dimensions
- [ ] All list pages have pagination, search, and status filters
- [ ] Reference data browser shows all 5 tabs with correct seed data
- [ ] No TypeScript errors across the monorepo
- [ ] `pnpm build` succeeds

---

**Document Version:** 1.0
**Last Updated:** February 2026