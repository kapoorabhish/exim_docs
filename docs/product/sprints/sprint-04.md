# Sprint 4: Export Completion + PDF Generation

**Sprint Goal:** Close the full export cycle — record B/L, insurance, and BRC; add a Document Set View so the exporter can see all shipment documents in one place; and generate print-ready PDFs for Commercial Invoice, Proforma Invoice, and Packing List.

**Scope:** Prisma schema + NestJS API + `packages/pdf` templates + Frontend

**Stories Covered:** E4-S10, E4-S11, E4-S13, E4-S14, E4-S16, E4-S18, E11-S1, E11-S2, E11-S3

**Deferred to Sprint 5+:** E4-S12 (Other Certificates), E4-S15 (Duty Drawback), E4-S17 (Email share), E11-S4 (Template Customization), E11-S5 (Number Series Config)

---

## Sprint Outcome

By the end of this sprint, the following works end-to-end:

```
1. Download a print-ready PDF of a Commercial Invoice, Proforma Invoice, or Packing List
2. Record Bill of Lading / Airway Bill details from the shipping line and link to invoice + SB
3. Record cargo insurance details for CIF/CIP shipments
4. Record Bank Realization Certificate (BRC) once payment arrives — close the shipment cycle
5. Clone an existing CI, PI, or PL as a new draft (speed up repeat shipments)
6. Document Set View on an invoice — see all linked documents (PI, PL, SB, B/L, CoO, BRC) with status
7. Export Register — consolidated table of all shipments with FOB values, SB number, BRC status
```

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| PDF renderer | `@react-pdf/renderer` (server-side) | Outputs real PDF from React components; runs in Node.js without a browser |
| PDF package | `packages/pdf` — shared templates imported into `apps/api` | Templates are pure React; can be tested independently; reusable for future email attachments |
| PDF delivery | `GET /api/{resource}/:id/pdf` → streams PDF buffer | Browser triggers download directly; no async queue needed at this scale |
| PDF base components | `CompanyHeader`, `ItemsTable`, `SignatureBlock`, `TotalsBlock`, `TermsBlock` | Shared across all document types; single source of truth for layout |
| Amount in words | Utility function `amountToWords(amount, currency)` in `packages/pdf` | Mandatory on Indian export invoices |
| B/L storage | DB record only — no file binary in DB | Upload field is a URL placeholder; actual file storage (S3) is Sprint 5+ |
| Insurance Certificate | Separate model linked to `CommercialInvoice` | Mirrors B/L pattern; needed for CIF/CIP shipment docs |
| BRC | Model linked to `CommercialInvoice` + `ShippingBill` | BRC closes the payment cycle for a shipment; must reference both |
| Clone | Server-side copy via `POST /:id/clone` → returns new DRAFT | All fields copied except: number (new auto-generated), date (today), status (DRAFT) |
| Document Set View | Drawer on Invoice detail (not a new route) | Avoids dynamic routing complexity; invoice is the natural hub |
| Export Register | New page `/exports/register` | Read-only report table; owned by Export Manager/Admin |
| No duty drawback UI | Deferred — drawback needs own workflow with BRC matching | Complex enough to warrant its own sprint task |

---

## Task 1: Prisma Schema — B/L, Insurance, BRC

**New models to add to `packages/db/prisma/schema.prisma`:**

```prisma
// ─── Bill of Lading / Airway Bill ─────────────────────────────────────────────

enum BlType {
  ORIGINAL
  TELEX_RELEASE
  SEA_WAYBILL
  HOUSE_BL
  MASTER_BL
}

enum BlStatus {
  ISSUED
  SURRENDERED
  TELEX_RELEASED
}

model BillOfLading {
  id                String   @id @default(cuid())
  tenantId          String
  blNumber          String
  blDate            DateTime
  blType            BlType   @default(ORIGINAL)
  status            BlStatus @default(ISSUED)
  invoiceId         String
  shippingBillId    String?
  shipper           String?
  consignee         String?
  notifyParty       String?
  vesselName        String?
  voyageNumber      String?
  portOfLoading     String?
  portOfDischarge   String?
  containers        String?  // comma-separated container/seal numbers
  packages          Int?
  grossWeight       Decimal? @db.Decimal(10, 3)
  cbm               Decimal? @db.Decimal(10, 4)
  freightTerms      String?  // PREPAID / COLLECT
  originalsIssued   Int?     @default(3)
  documentUrl       String?  // uploaded B/L PDF (URL placeholder for S3)
  notes             String?
  createdBy         String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  tenant       Tenant            @relation(fields: [tenantId], references: [id])
  invoice      CommercialInvoice @relation(fields: [invoiceId], references: [id])
  shippingBill ShippingBill?     @relation(fields: [shippingBillId], references: [id])

  @@index([tenantId, invoiceId])
  @@map("bills_of_lading")
}

// ─── Insurance Certificate ─────────────────────────────────────────────────────

model InsuranceCertificate {
  id              String   @id @default(cuid())
  tenantId        String
  policyNumber    String
  insurer         String
  policyDate      DateTime
  invoiceId       String
  insuredParty    String?
  voyageFrom      String?
  voyageTo        String?
  sumInsured      Decimal  @db.Decimal(15, 2)
  currency        String   @default("USD")
  coverageType    String?  // Institute Cargo Clause A / B / C
  premium         Decimal? @db.Decimal(10, 2)
  validUntil      DateTime?
  documentUrl     String?
  notes           String?
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant  Tenant            @relation(fields: [tenantId], references: [id])
  invoice CommercialInvoice @relation(fields: [invoiceId], references: [id])

  @@index([tenantId, invoiceId])
  @@map("insurance_certificates")
}

// ─── Bank Realization Certificate ─────────────────────────────────────────────

enum BrcStatus {
  PENDING
  RECEIVED
}

model BankRealizationCertificate {
  id               String    @id @default(cuid())
  tenantId         String
  brcNumber        String?
  bankName         String
  realizationDate  DateTime
  invoiceId        String
  shippingBillId   String?
  foreignCurrency  String    // ISO code, e.g. "USD"
  foreignAmount    Decimal   @db.Decimal(15, 2)
  exchangeRate     Decimal   @db.Decimal(12, 6)
  inrAmount        Decimal   @db.Decimal(15, 2)   // foreignAmount × exchangeRate
  status           BrcStatus @default(PENDING)
  discrepancyNotes String?   // if BRC amount ≠ invoice amount
  documentUrl      String?
  notes            String?
  createdBy        String
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  tenant       Tenant            @relation(fields: [tenantId], references: [id])
  invoice      CommercialInvoice @relation(fields: [invoiceId], references: [id])
  shippingBill ShippingBill?     @relation(fields: [shippingBillId], references: [id])

  @@index([tenantId, invoiceId])
  @@index([tenantId, status])
  @@map("bank_realization_certificates")
}
```

**New relations on `CommercialInvoice`:**
```prisma
billsOfLading              BillOfLading[]
insuranceCertificates      InsuranceCertificate[]
bankRealizationCertificates BankRealizationCertificate[]
```

**New relations on `ShippingBill`:**
```prisma
billsOfLading              BillOfLading[]
bankRealizationCertificates BankRealizationCertificate[]
```

**New relations on `Tenant`:**
```prisma
billsOfLading              BillOfLading[]
insuranceCertificates      InsuranceCertificate[]
bankRealizationCertificates BankRealizationCertificate[]
```

---

## Task 2: `packages/pdf` — Setup + Base Components

**Create `packages/pdf/` as a new monorepo package.**

**`packages/pdf/package.json`:**
```json
{
  "name": "@exim/pdf",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@react-pdf/renderer": "^4.2.0",
    "react": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.7.0"
  }
}
```

**`packages/pdf/src/utils/amountToWords.ts`:**
Converts a number to Indian English words, e.g. `12500.50` → `"TWELVE THOUSAND FIVE HUNDRED AND FIFTY CENTS ONLY"`.
- Handle Indian number system (Lakh, Crore is NOT used on export invoices — use international: thousand, million)
- Currency suffix map: USD → "US DOLLARS", EUR → "EUROS", GBP → "POUNDS STERLING", etc.
- Format: `"{AMOUNT IN WORDS} ONLY"`

**`packages/pdf/src/components/`** — Shared React-PDF components (all use `@react-pdf/renderer` primitives):

| Component | Props | Purpose |
|---|---|---|
| `CompanyHeader` | `profile`, `logo?` | Exporter name, address, IEC, GSTIN, PAN, logo |
| `PartyBlock` | `label`, `party` | Consignee / Notify Party box |
| `ItemsTable` | `lineItems`, `currency`, `includeWeight?` | Line items table; optional weight columns |
| `TotalsBlock` | `subtotal`, `freight?`, `insurance?`, `total`, `currency`, `exchangeRate?` | Totals section with INR equivalent row |
| `SignatureBlock` | `signatoryName`, `designation`, `signatureUrl?` | "For [Company]" with signature image |
| `TermsBlock` | `content` | Terms & conditions section |
| `DocumentFooter` | `docNumber`, `date` | Page number + document reference in footer |

**`packages/pdf/src/index.ts`:** Export all templates and utilities.

---

## Task 3: Commercial Invoice PDF Template (E11-S1)

**File:** `packages/pdf/src/templates/CommercialInvoicePdf.tsx`

**Props interface:**
```ts
interface CommercialInvoicePdfProps {
  invoice: {
    invoiceNumber: string;
    date: string;
    currency: string;
    exchangeRate: number;
    incoterm: string;
    paymentTerms: string;
    portOfLoading: string;
    portOfDischarge: string;
    countryOfOrigin: string;
    finalDestination: string;
    vesselFlight: string;
    preCarriage: string;
    placeOfReceipt: string;
    shippingMarks: string;
    exportDeclaration: string;
    subtotalAmount: number;
    freight: number;
    insurance: number;
    totalAmount: number;
    termsContent: string;
    notes: string;
    lineItems: InvoiceLineItem[];
    buyer: Party;
    notifyParty: string;
    bankAccount: BankAccount;
  };
  profile: BusinessProfile;
}
```

**Layout (A4 portrait):**
```
┌─────────────────────────────────────────────────────────┐
│  [LOGO]      COMMERCIAL INVOICE                          │
│  Company name, address, IEC, GSTIN                       │
├──────────────────┬──────────────────────────────────────┤
│ Consignee        │ Invoice No: INV/2025-26/001           │
│ Name, Address    │ Date: 20 Jan 2026                     │
│                  │ Payment Terms: T/T 30 days            │
├──────────────────┤ Incoterm: FOB Mumbai                  │
│ Notify Party     │ Port of Loading: INNSA                │
│                  │ Port of Discharge: USNYK              │
│                  │ Country of Origin: India              │
├──────────────────┴──────────────────────────────────────┤
│ Marks & Nos │ Description │ HS Code │ Qty │ Rate │ Amt  │
│             │             │         │     │      │      │
├─────────────────────────────────────────────────────────┤
│                                      Subtotal (FOB):    │
│                                      Freight:           │
│                                      Insurance:         │
│                                      TOTAL USD:         │
│                                      INR Equivalent:    │
├─────────────────────────────────────────────────────────┤
│ Amount in Words: TWELVE THOUSAND FIVE HUNDRED USD ONLY  │
├─────────────────────────────────────────────────────────┤
│ Bank Details: HDFC Bank, A/C 50200012345678, SWIFT ...  │
├─────────────────────────────────────────────────────────┤
│ Declaration: Exported under LUT vide ARN: ...           │
├─────────────────────────────────────────────────────────┤
│ Terms & Conditions                                      │
├─────────────────────────────────────────────────────────┤
│ For SUNRISE EXPORTS PVT LTD         [Signature]         │
│                                     Authorised Signatory│
└─────────────────────────────────────────────────────────┘
```

**API endpoint:** `GET /api/invoices/:id/pdf`
- Fetch invoice with all relations (lineItems, buyer, bankAccount, profile)
- Call `renderToBuffer(<CommercialInvoicePdf ... />)`
- Return response with headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="INV-2025-26-001.pdf"`

---

## Task 4: Proforma Invoice PDF Template (E11-S2)

**File:** `packages/pdf/src/templates/ProformaInvoicePdf.tsx`

Same layout as Commercial Invoice with these differences:
- Header: **"PROFORMA INVOICE"** (not Commercial Invoice)
- Validity period row: "Valid Until: 10 Feb 2026"
- Version shown: "Version: v1"
- Footer disclaimer: **"This is not a Tax Invoice. Subject to final confirmation."**
- No "Export Declaration" section
- No LEO/SB reference section

**API endpoint:** `GET /api/proforma-invoices/:id/pdf`

---

## Task 5: Packing List PDF Template (E11-S3)

**File:** `packages/pdf/src/templates/PackingListPdf.tsx`

**Layout (A4 portrait):**
```
┌─────────────────────────────────────────────────────────┐
│  [LOGO]          PACKING LIST                            │
│  Company name, address                                   │
├──────────────────┬──────────────────────────────────────┤
│ Consignee        │ PL No:    PL/2025-26/001              │
│                  │ Date:     20 Jan 2026                 │
│                  │ Inv Ref:  INV/2025-26/001             │
│                  │ Incoterm: FOB                         │
├──────────────────┴──────────────────────────────────────┤
│ Shipping Marks: SUNRISE/NY/2601                         │
├─────────────────────────────────────────────────────────┤
│ Pkg No │ Contents │ Qty │ Net Wt │ Gross Wt │ L×W×H │CBM│
│        │          │     │  (kg)  │   (kg)   │  (cm) │   │
├─────────────────────────────────────────────────────────┤
│ TOTAL  │          │     │ 155 kg │  174 kg  │       │0.50│
└─────────────────────────────────────────────────────────┘
│ For SUNRISE EXPORTS PVT LTD         [Signature]         │
└─────────────────────────────────────────────────────────┘
```

**API endpoint:** `GET /api/packing-lists/:id/pdf`

---

## Task 6: PDF Module in NestJS

**File:** `apps/api/src/modules/pdf/pdf.module.ts`

- Import `@exim/pdf` package
- `PdfService` — wraps `renderToBuffer` calls, fetches data from relevant services
- No HTTP controller needed: each document module adds its own `/pdf` GET endpoint internally
  - `InvoiceController`: `GET :id/pdf` → `pdfService.renderInvoice(id, tenantId)`
  - `ProformaController`: `GET :id/pdf` → `pdfService.renderProforma(id, tenantId)`
  - `PackingListController`: `GET :id/pdf` → `pdfService.renderPackingList(id, tenantId)`

**PdfService methods:**
```ts
renderInvoice(id: string, tenantId: string): Promise<Buffer>
renderProforma(id: string, tenantId: string): Promise<Buffer>
renderPackingList(id: string, tenantId: string): Promise<Buffer>
```

Each method:
1. Fetches record with all required relations (buyer, lineItems, bankAccount, tenant.businessProfile)
2. Calls `renderToBuffer(<Template data={...} />)`
3. Returns Buffer — controller sets response headers and pipes buffer

---

## Task 7: Backend — Bill of Lading Module (E4-S10)

**Module:** `apps/api/src/modules/exports/bill-of-lading/`

**Endpoints:**
```
GET    /api/bills-of-lading              → list (filter: invoiceId, shippingBillId)
POST   /api/bills-of-lading              → create
GET    /api/bills-of-lading/:id          → get by id
PUT    /api/bills-of-lading/:id          → update
PUT    /api/bills-of-lading/:id/status   → update status (ISSUED → SURRENDERED / TELEX_RELEASED)
DELETE /api/bills-of-lading/:id          → delete
```

**Key behaviours:**
- `invoiceId` required on create; `shippingBillId` optional
- status transition: ISSUED → SURRENDERED or ISSUED → TELEX_RELEASED (both terminal states)
- Register in `ExportsModule`

---

## Task 8: Backend — Insurance Certificate Module (E4-S11)

**Module:** `apps/api/src/modules/exports/insurance/`

**Endpoints:**
```
GET    /api/insurance-certificates              → list (filter: invoiceId)
POST   /api/insurance-certificates              → create
GET    /api/insurance-certificates/:id          → get
PUT    /api/insurance-certificates/:id          → update
DELETE /api/insurance-certificates/:id          → delete
```

**Key behaviours:**
- `invoiceId` required; one invoice can have at most one insurance cert (validated in service)
- `sumInsured` auto-suggested as 110% of invoice `totalAmount` if not provided (hint in API response)
- Register in `ExportsModule`

---

## Task 9: Backend — BRC Module (E4-S14)

**Module:** `apps/api/src/modules/exports/brc/`

**Endpoints:**
```
GET    /api/brcs                → list (filter: invoiceId, status)
POST   /api/brcs                → create
GET    /api/brcs/:id            → get
PUT    /api/brcs/:id            → update
PUT    /api/brcs/:id/receive    → mark RECEIVED (body: { realizationDate, brcNumber })
DELETE /api/brcs/:id            → delete (PENDING only)
```

**Key behaviours:**
- On create: auto-calculate `inrAmount = foreignAmount × exchangeRate`
- On `receive`: set `status = RECEIVED`, record `realizationDate` and `brcNumber`
- Discrepancy check: if `foreignAmount ≠ invoice.totalAmount` (within 1%), flag `discrepancyNotes`
- Register in `ExportsModule`

---

## Task 10: Backend — Clone Endpoints (E4-S18)

Add clone actions to three existing modules:

**`POST /api/proforma-invoices/:id/clone`**
- Copy all PI fields (buyerPartyId, incoterm, currency, lineItems, etc.)
- New `piNumber` via `DocNumberService`
- `status = DRAFT`, `version = 1`, `parentId = null`, `date = today`
- Returns the new PI

**`POST /api/invoices/:id/clone`**
- Copy all CI fields
- New `invoiceNumber` via `DocNumberService`
- `status = DRAFT`, `date = today`
- Fresh exchange rate snapshot from `ExchangeRate` table
- Returns the new CI

**`POST /api/packing-lists/:id/clone`**
- Copy PL header + all packages
- New `plNumber` via `DocNumberService`
- `status = DRAFT`, `date = today`
- Returns the new PL

---

## Task 11: Frontend — PDF Download Buttons

Add a **"Download PDF"** button to three existing pages. Pattern is identical on each:

```tsx
const downloadPdf = async (id: string, docNumber: string, type: string) => {
  const res = await api.get(`/${type}/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${docNumber.replace(/\//g, '-')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
```

**Pages to update:**

| Page | Button placement | API path |
|---|---|---|
| `/exports/proforma-invoices` | Row action: "Download PDF" (all statuses) | `/proforma-invoices/:id/pdf` |
| `/exports/invoices` | Row action: "Download PDF" (FINALIZED + LOCKED) | `/invoices/:id/pdf` |
| `/exports/packing-lists` | Row action: "Download PDF" (FINALIZED) | `/packing-lists/:id/pdf` |

Also add a **"Clone"** row action to PI (FINALIZED/CONVERTED) and CI (FINALIZED) pages:
- Calls clone endpoint → success message + refresh list

---

## Task 12: Frontend — Document Set View (E4-S13)

**Where:** A "View Documents" button on the Invoices list → opens a right-side `Drawer` (960px wide)

**Component:** `InvoiceDocSetDrawer`

Drawer shows a single invoice's complete document set:

```
Invoice: INV/2025-26/001 — Global Traders LLC — USD 12,500
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 [✓] Proforma Invoice   PI/2025-26/001  CONVERTED  10 Jan 2026
 [✓] Invoice            INV/2025-26/001 LOCKED     20 Jan 2026
 [✓] Packing List       PL/2025-26/001  FINALIZED  20 Jan 2026
 [✓] Shipping Bill      SB/2025-26/001  FILED      22 Jan 2026  SB# 8765432
 [✓] Certificate of Origin  COO/2025-26/001  ISSUED   23 Jan 2026
 [ ] Bill of Lading      —              Missing    —
 [ ] Insurance Cert      —              Missing    —
 [ ] BRC                 —              Pending    —
```

- Green tick = exists + finalized/issued; grey dash = missing
- Each row: document type icon, number, status badge, date, optional action link
- "Download PDF" icon on CI, PI, PL rows
- API: `GET /api/invoices/:id/document-set` → returns all linked documents in one call

**New endpoint in Invoice module:**
```
GET /api/invoices/:id/document-set
→ {
    invoice: { id, invoiceNumber, status, totalAmount, currency, buyer },
    proformaInvoice: { id, piNumber, status } | null,
    packingLists: [{ id, plNumber, status }],
    shippingBills: [{ id, sbNumber, status }],
    certificatesOfOrigin: [{ id, cooNumber, status }],
    billsOfLading: [{ id, blNumber, status }],
    insuranceCertificates: [{ id, policyNumber }],
    bankRealizationCertificates: [{ id, brcNumber, status }]
  }
```

---

## Task 13: Frontend — Export Register (E4-S16)

**New page:** `apps/web/app/(dashboard)/exports/register/page.tsx`

**API endpoint:** `GET /api/invoices/register`
```
Query params: dateFrom, dateTo, buyerPartyId, status, brcStatus
Returns: paginated list of invoices joined with: sbNumber, sbDate, blNumber, brcStatus, totalAmount (FOB), currency
```

**Add to Invoice controller:**
```
GET /api/invoices/register → register query (before /:id routes to avoid conflict)
```

**Table columns:**

| Column | Source |
|---|---|
| Invoice No | invoiceNumber |
| Date | invoice.date |
| Buyer | buyer.name |
| Country | buyer.country |
| FOB Value | totalAmount + currency |
| INR Equiv | totalAmount × exchangeRate |
| SB Number | shippingBill.sbNumber |
| SB Date | shippingBill.date |
| B/L Number | billOfLading.blNumber |
| BRC Status | bankRealizationCertificate.status |
| Invoice Status | status badge |

Filters: Date range, Buyer (searchable select), Invoice status, BRC status

Footer summary row: count of shipments + total FOB (grouped by currency)

CSV export: button triggers `GET /api/invoices/register?format=csv`

**Navigation:** Add to sidebar under Exports:
```
Exports
  ├── Proforma Invoices
  ├── Invoices
  ├── Packing Lists
  ├── Shipping Bills
  └── Export Register   ← NEW  (BarChartOutlined)
```

---

## Task 14: Frontend — B/L and BRC Forms

Add document recording forms as **drawers on the Shipping Bills page** and **Invoice Document Set Drawer**.

### B/L Form (on Shipping Bills page)

Add row action: **"Record B/L"** → opens a drawer with:
- B/L Number, B/L Date, B/L Type (select)
- Vessel Name, Voyage Number
- Containers / Seal Numbers (text)
- Packages, Gross Weight (kg), CBM
- Freight Terms (Prepaid / Collect)
- Originals Issued (number, default 3)
- Notes
- Save → `POST /api/bills-of-lading`

If B/L already exists for SB: show "View / Edit B/L" instead.

### BRC Form (on Invoices page)

Add row action: **"Record BRC"** → opens a drawer with:
- Bank Name, Realization Date
- BRC Number (optional at creation)
- Foreign Currency (auto-filled from invoice currency), Foreign Amount
- Exchange Rate (auto-filled from invoice exchange rate, editable)
- INR Amount (auto-calculated: foreignAmount × exchangeRate)
- Discrepancy Notes (shown if amount mismatch)
- Save → `POST /api/brcs`

If BRC already exists: show "View BRC" with status badge and "Mark Received" button.

---

## Dependency Graph

```
Task 1: Schema
  │
  ├──→ Task 7: B/L Module       ──→ Task 14: B/L Form
  ├──→ Task 8: Insurance Module  ──→ (Task 12: DocSet shows it)
  ├──→ Task 9: BRC Module        ──→ Task 14: BRC Form
  │
Task 2: packages/pdf Setup
  │
  ├──→ Task 3: CI PDF Template   ──→ Task 11: Download Buttons
  ├──→ Task 4: PI PDF Template   ──→ Task 11: Download Buttons
  └──→ Task 5: PL PDF Template   ──→ Task 11: Download Buttons
         │
         └──→ Task 6: PDF Module in NestJS
                │
                └──→ Task 11: Download Buttons

Task 10: Clone Endpoints         ──→ Task 11: Clone Actions (UI)

Tasks 7, 8, 9                    ──→ Task 12: DocSet Drawer
Tasks 7, 8, 9, existing invoice  ──→ Task 13: Export Register
```

## Execution Order

| Order | Task | Notes |
|---|---|---|
| 1 | Task 1: Schema | Foundation |
| 2 | Task 2: packages/pdf setup | Independent |
| 3 | Task 3: CI PDF | Depends on Task 2 |
| 4 | Task 4: PI PDF | Depends on Task 2 |
| 5 | Task 5: PL PDF | Depends on Task 2 |
| 6 | Task 6: PDF NestJS Module | Depends on Tasks 3–5 |
| 7 | Task 7: B/L Module | Depends on Task 1 |
| 8 | Task 8: Insurance Module | Depends on Task 1 |
| 9 | Task 9: BRC Module | Depends on Task 1 |
| 10 | Task 10: Clone Endpoints | Independent (no schema changes) |
| 11 | Task 11: PDF Buttons + Clone UI | Depends on Tasks 6, 10 |
| 12 | Task 12: DocSet Drawer | Depends on Tasks 7, 8, 9 |
| 13 | Task 13: Export Register | Depends on Tasks 7, 9 |
| 14 | Task 14: B/L & BRC Forms | Depends on Tasks 7, 9 |

---

## Definition of Done

- [ ] `GET /api/invoices/:id/pdf` returns a valid, printable A4 PDF with all fields
- [ ] `GET /api/proforma-invoices/:id/pdf` returns PI PDF marked "PROFORMA INVOICE" with validity date
- [ ] `GET /api/packing-lists/:id/pdf` returns PL PDF with package table and CBM totals
- [ ] Amount in words renders correctly for USD, EUR, GBP amounts
- [ ] "Download PDF" button on Invoices, PI, PL pages triggers browser file download
- [ ] Bill of Lading can be created and linked to an invoice + optional SB
- [ ] Insurance Certificate can be created and linked to an invoice
- [ ] BRC can be created → marked RECEIVED → discrepancy flagged if amounts differ
- [ ] Clone creates a new DRAFT with a new document number and today's date
- [ ] Document Set View shows all 8 document types with correct status indicators
- [ ] Export Register shows all invoices with SB, B/L, BRC columns; CSV export works
- [ ] B/L form and BRC form accessible from Shipping Bills and Invoices pages respectively
- [ ] All new API endpoints enforce tenant isolation (`tenantId` from JWT)
- [ ] No TypeScript errors across the monorepo
- [ ] `pnpm build` succeeds

---

**Document Version:** 1.0
**Last Updated:** February 2026