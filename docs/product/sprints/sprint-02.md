# Sprint 2: Master Data Management

**Sprint Goal:** All master data is in place so that Sprint 3 (export documents) can reference parties, products, ports, and currencies without manual entry.

**Scope:** Backend API (NestJS) + Prisma schema + Seed data + Frontend CRUD pages

**Stories Covered:** E3-S1, E3-S2, E3-S3, E3-S4, E3-S5, E3-S6, E3-S7, E3-S8, E3-S9, E3-S10, E3-S12, E3-S13, E3-S14
*(E3-S11 Bank Accounts — already done in Sprint 1)*

---

## Sprint Outcome

By the end of this sprint, the following works end-to-end:

```
1. Create a buyer (party) with address, tax IDs, bank details, contact persons
2. Bulk import buyers/suppliers from CSV template
3. Create a product with HS code, UOM, weight, duty rates
4. Search HS codes by keyword or code, select → auto-fill on product
5. Bulk import products from CSV template
6. Search ports (by name or LOCODE) and countries (ISO codes, FTA status)
7. View and manually override exchange rates for major currencies
8. Admin presses "Sync Rates" → fetches latest RBI/CBIC rates into the system
9. Create terms & conditions templates, set default per document type
10. View Incoterms 2020 reference with tooltips (EXW → DDP)
```

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Seed data delivery | Prisma `seed.ts` script | Clean, version-controlled, re-runnable |
| HS Code source | Public dataset (curated top ~2000 codes) | Full 12,000+ Indian tariff is premature; covers all major export categories |
| HS Code structure | 6-digit international + 2-digit Indian subheading where available | Practical for Sprint 2; full tariff in Phase 4 |
| Exchange rate sync | Manual button → calls RBI public XML API | Cron job deferred; super admin controls timing |
| CSV import | Multer (file upload) + csv-parse library | Standard, no external dependencies |
| Rich text for Terms | Store as plain HTML string | Simple; WYSIWYG editor (TipTap/Quill) on frontend |
| Port data | Pre-loaded ~300 Indian ports + ~500 major international ports | UN/LOCODE dataset, trimmed to relevant ports |

---

## Implementation Tasks

### Task 1: Prisma Schema — Master Data Models

**New models to add to `packages/db/prisma/schema.prisma`:**

```prisma
// Party (Buyer / Supplier)
model Party {
  id                  String      @id @default(cuid())
  tenantId            String
  type                PartyType   // CUSTOMER, VENDOR, BOTH
  name                String
  address             String?
  city                String?
  state               String?
  zip                 String?
  country             String      // ISO 2-letter code
  vatNumber           String?
  iecNumber           String?
  gstin               String?
  bankName            String?
  swiftCode           String?
  accountNumber       String?
  iban                String?
  defaultIncoterm     String?
  defaultPaymentTerms String?
  creditLimit         Decimal?    @db.Decimal(15, 2)
  preferredPortCode   String?
  isActive            Boolean     @default(true)
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  tenant   Tenant         @relation(...)
  contacts PartyContact[]
}

model PartyContact {
  id          String   @id @default(cuid())
  partyId     String
  name        String
  designation String?
  email       String?
  phone       String?
  isPrimary   Boolean  @default(false)
  createdAt   DateTime @default(now())

  party Party @relation(...)
}

// Product / Item Master
model Product {
  id                 String   @id @default(cuid())
  tenantId           String
  sku                String
  name               String
  customsDescription String?
  hsCode             String?
  countryOfOrigin    String?
  uomCode            String
  netWeightPerUnit   Decimal? @db.Decimal(10, 4)
  grossWeightPerUnit Decimal? @db.Decimal(10, 4)
  dimensionL         Decimal? @db.Decimal(10, 2)
  dimensionW         Decimal? @db.Decimal(10, 2)
  dimensionH         Decimal? @db.Decimal(10, 2)
  dimensionUnit      String?  // CM, INCH
  bcdRate            Decimal? @db.Decimal(6, 2)
  igstRate           Decimal? @db.Decimal(6, 2)
  gstHsnCode         String?
  gstRate            Decimal? @db.Decimal(6, 2)
  category           String?
  imageUrl           String?
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  tenant Tenant @relation(...)

  @@unique([tenantId, sku])
}

// Port (pre-loaded system data)
model Port {
  id       String   @id @default(cuid())
  name     String
  code     String   @unique  // UN/LOCODE (e.g. "INBOM", "USLAX")
  country  String   // ISO 2-letter
  portType PortType // SEA, AIR, ICD, LAND
  isActive Boolean  @default(true)
}

// Country (pre-loaded system data)
model Country {
  code         String  @id  // ISO 2-letter (e.g. "IN", "US")
  code3        String  @unique  // ISO 3-letter (e.g. "IND", "USA")
  name         String
  currencyCode String?
  ftaWithIndia Boolean @default(false)
}

// Unit of Measurement
model Uom {
  code     String  @id  // PCS, KG, MT, LTR, etc.
  name     String
  isSystem Boolean @default(true)
  tenantId String? // null = system-wide; set = tenant custom UOM
}

// HS Code (pre-loaded tariff database)
model HsCode {
  code        String  @id  // 6 or 8 digit
  description String
  chapter     String  // first 2 digits
  heading     String  // first 4 digits
  bcdRate     Decimal? @db.Decimal(6, 2)
  igstRate    Decimal? @db.Decimal(6, 2)
}

// Incoterms 2020 (pre-loaded)
model Incoterm {
  code              String  @id  // FOB, CIF, etc.
  name              String
  riskTransferPoint String
  costDescription   String
  applicableModes   String  // "ALL", "SEA_ONLY"
}

// Terms & Conditions Templates
model TermsTemplate {
  id           String   @id @default(cuid())
  tenantId     String
  name         String
  documentType String   // INVOICE, PROFORMA, PURCHASE_ORDER, etc.
  content      String   // HTML content
  isDefault    Boolean  @default(false)
  version      Int      @default(1)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant Tenant @relation(...)
}

enum PartyType { CUSTOMER VENDOR BOTH }
enum PortType  { SEA AIR ICD LAND }
```

**New relations on Tenant:**
```prisma
parties        Party[]
products       Product[]
termsTemplates TermsTemplate[]
```

---

### Task 2: Seed Data

**Files to create in `packages/db/prisma/seed/`:**

| File | Records | Source |
|---|---|---|
| `countries.ts` | ~250 countries | ISO 3166-1 + FTA flags |
| `ports.ts` | ~800 ports | UN/LOCODE (Indian + major global) |
| `uoms.ts` | 15 UOMs | Standard trade UOMs |
| `incoterms.ts` | 11 Incoterms | Incoterms 2020 |
| `hs-codes.ts` | ~2000 HS codes | Public dataset (top Indian export/import categories) |
| `currencies.ts` | Already in `@exim/shared` | Ensure all in DB too if needed |

**Seed execution order:**
```
Countries → Currencies (already in shared) → Ports → UOMs → Incoterms → HS Codes
```

---

### Task 3: Backend — Party Module

**Module:** `apps/api/src/modules/master-data/party/`

**Endpoints:**
```
GET    /api/parties              → list (paginated, filterable)
POST   /api/parties              → create
GET    /api/parties/:id          → get by id
PUT    /api/parties/:id          → update
DELETE /api/parties/:id          → soft delete (isActive = false)
POST   /api/parties/import       → bulk CSV import (multipart)
GET    /api/parties/import/template → download CSV template
```

---

### Task 4: Backend — Product Module

**Module:** `apps/api/src/modules/master-data/product/`

**Endpoints:**
```
GET    /api/products             → list (paginated, filterable)
POST   /api/products             → create
GET    /api/products/:id         → get by id
PUT    /api/products/:id         → update
DELETE /api/products/:id         → soft delete
POST   /api/products/import      → bulk CSV import
GET    /api/products/import/template → download CSV template
```

---

### Task 5: Backend — Reference Data APIs

**Module:** `apps/api/src/modules/master-data/reference/`

**Endpoints:**
```
GET /api/reference/ports         → search ports (q=, country=, type=)
GET /api/reference/countries     → list/search countries
GET /api/reference/hs-codes      → search HS codes (q=keyword or code prefix)
GET /api/reference/uoms          → list UOMs (system + tenant custom)
GET /api/reference/incoterms     → list Incoterms with descriptions
```

---

### Task 6: Backend — Exchange Rate Sync

**Extends existing:** `apps/api/src/modules/master-data/exchange-rate/`

**Endpoints:**
```
GET    /api/exchange-rates        → list current rates (latest per currency/type)
GET    /api/exchange-rates/history → history (currency, dateFrom, dateTo)
POST   /api/exchange-rates/sync   → trigger RBI rate fetch (ADMIN only)
PUT    /api/exchange-rates/manual → manual override for a date (ADMIN only)
```

**RBI sync logic:** Fetch from RBI public XML API → parse → upsert into `ExchangeRate` table with `rateType=RBI`.

---

### Task 7: Backend — Terms Templates Module

**Module:** `apps/api/src/modules/master-data/terms/`

**Endpoints:**
```
GET    /api/terms-templates       → list by tenant
POST   /api/terms-templates       → create
PUT    /api/terms-templates/:id   → update
DELETE /api/terms-templates/:id   → delete
PUT    /api/terms-templates/:id/default → set as default for document type
```

---

### Task 8: Frontend — Navigation & Routes

**Add to sidebar:**
```
Master Data (DatabaseOutlined)
  ├── Parties        → /master-data/parties
  └── Products       → /master-data/products

Settings (existing)
  ├── Business Profile
  ├── Bank Accounts
  ├── Users
  ├── Exchange Rates → /settings/exchange-rates   (NEW)
  └── Templates      → /settings/templates        (NEW)
```

**New routes:**
```
app/(dashboard)/
  master-data/
    parties/
      page.tsx          ← Party list
    products/
      page.tsx          ← Product list
  settings/
    exchange-rates/
      page.tsx          ← Exchange rates view + sync
    templates/
      page.tsx          ← Terms & conditions templates
```

---

### Task 9: Frontend — Parties Pages

**`/master-data/parties`:**
- `DataTable` with columns: name, type badge, country, GSTIN, last transaction, status
- Search bar (name, country, tax ID), filter by type + active/inactive
- "Add Party" button → drawer form
- Row click → quick-view side panel (not full page)
- Row actions: edit, deactivate, delete

**Party drawer form sections:**
1. Basic Info (name, type, country, address, city, state, zip)
2. Tax Identifiers (VAT, IEC, GSTIN — conditional on country)
3. Bank Details (bank name, SWIFT, account/IBAN)
4. Trade Terms (default Incoterm, payment terms, credit limit, preferred port)
5. Contact Persons (repeatable: name, designation, email, phone)

**Import flow:**
- "Import CSV" button → modal: download template → upload file → preview table → confirm

---

### Task 10: Frontend — Products Pages

**`/master-data/products`:**
- `DataTable`: SKU, name, HS code, UOM, category, status
- Search by name/SKU/HS code, filter by category, active/inactive
- "Add Product" → drawer form
- Row actions: edit, deactivate, delete

**Product drawer form sections:**
1. Basic Info (SKU, name, category, country of origin)
2. HS Code (search input with live lookup → shows description, BCD%, IGST%)
3. Customs (customs description, UOM)
4. Weight & Dimensions
5. Tax Rates (BCD, IGST, GST HSN, GST rate — auto-filled from HS code)

---

### Task 11: Frontend — Settings: Exchange Rates

**`/settings/exchange-rates`:**
- Table: currency, RBI rate, CBIC rate, Bank rate, effective date, last updated
- "Sync RBI Rates" button (ADMIN only) → calls `POST /api/exchange-rates/sync`
- "Override Rate" action per row → inline date + rate input
- History tab: line chart of rate over last 12 months (per selected currency)

---

### Task 12: Frontend — Settings: Terms Templates

**`/settings/templates`:**
- List of templates with: name, document type badge, version, default status
- "New Template" → drawer with: name, document type selector, rich text editor (TipTap or textarea for now), set-as-default toggle
- Edit / Delete / Set Default actions

---

## Dependency Graph

```
Task 1: Schema
  │
  ├──→ Task 2: Seed Data
  │
  ├──→ Task 3: Party API ──→ Task 9: Parties UI
  ├──→ Task 4: Product API ──→ Task 10: Products UI
  ├──→ Task 5: Reference APIs (used by Tasks 9 & 10)
  ├──→ Task 6: Exchange Rate API ──→ Task 11: Exchange Rates UI
  └──→ Task 7: Terms API ──→ Task 12: Templates UI
         │
         └──→ Task 8: Navigation (ties all pages together)
```

## Execution Order

| Order | Task | Notes |
|---|---|---|
| 1 | Task 1: Schema | Foundation |
| 2 | Task 2: Seed Data | After schema pushed |
| 3 | Task 5: Reference APIs | Needed by party/product forms |
| 4 | Task 3: Party API | |
| 5 | Task 4: Product API | |
| 6 | Task 6: Exchange Rate API | |
| 7 | Task 7: Terms API | |
| 8 | Task 8: Navigation | Add routes to sidebar |
| 9 | Task 9: Parties UI | |
| 10 | Task 10: Products UI | |
| 11 | Task 11: Exchange Rates UI | |
| 12 | Task 12: Templates UI | |

---

## Definition of Done

- [ ] All master data entities have CRUD APIs returning correct responses
- [ ] Seed data loads cleanly on fresh DB: countries, ports, UOMs, Incoterms, HS codes
- [ ] Party CSV import: template download + upload + validation + summary
- [ ] Product CSV import: same
- [ ] Exchange rate sync button fetches from RBI XML API + stores in DB
- [ ] HS code search returns results within 200ms for keyword queries
- [ ] All pages render correctly, drawers open/close, forms validate
- [ ] No TypeScript errors across the monorepo
- [ ] `pnpm build` succeeds

---

**Document Version:** 1.0
**Last Updated:** February 2026