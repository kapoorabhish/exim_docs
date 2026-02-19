# E3: Master Data Management

**Phase:** 1 (Foundation)
**Priority:** P0
**Primary Actors:** A2 Admin, A4 Export Manager, A5 Import Manager, A6 Sales Manager, A7 Purchase Manager, A8 Inventory Manager, A9 Data Entry Operator
**Dependencies:** E1 (Tenant), E2 (RBAC)

---

## Epic Summary

Central master data that all modules depend on — parties (buyers/suppliers), products with HS codes, ports, currencies, bank accounts, and terms & conditions templates.

---

## User Stories

### E3-S1: Create Party (Buyer/Supplier)

**As** a sales manager,
**I want to** add a new buyer with all trade-relevant details,
**So that** their information auto-populates on invoices and shipping documents.

**Acceptance Criteria:**
- [ ] Party type: Customer, Vendor, or Both
- [ ] Fields: name, address (multi-line), country, city, zip
- [ ] Tax identifiers: VAT/TIN/EIN (based on country), IEC (if Indian), GSTIN (if Indian)
- [ ] Bank details: bank name, SWIFT code, IBAN/account number
- [ ] Contact persons: name, designation, email, phone (multiple)
- [ ] Default payment terms, default Incoterm
- [ ] Credit limit
- [ ] Port preference
- [ ] Duplicate detection: warn if party with same name+country exists
- [ ] Active/Inactive toggle

**Story Points:** 5

---

### E3-S2: Party List & Search

**As** an export manager,
**I want to** search and filter my buyer list,
**So that** I can quickly find a party when creating documents.

**Acceptance Criteria:**
- [ ] List view with: name, type, country, last transaction, outstanding
- [ ] Search by name, country, or tax ID
- [ ] Filter by: type (customer/vendor/both), country, active/inactive
- [ ] Sort by name, country, outstanding amount, last activity
- [ ] Pagination (20 per page, configurable)
- [ ] Quick-view panel on row click (without leaving the list)

**Story Points:** 3

---

### E3-S3: Import Parties from CSV/Excel

**As** a business owner,
**I want to** bulk import my existing buyer/supplier database from a spreadsheet,
**So that** I don't have to re-enter hundreds of parties manually.

**Acceptance Criteria:**
- [ ] Download template CSV/Excel with required columns
- [ ] Upload file → preview parsed data → confirm import
- [ ] Validation: required fields, format checks (GSTIN, email)
- [ ] Show error rows with reasons, allow fix and re-import
- [ ] Skip duplicates option or merge with existing
- [ ] Import summary: X created, Y skipped, Z errors

**Story Points:** 5

---

### E3-S4: Create Product / Item Master

**As** an inventory manager,
**I want to** add a product with HS code and customs description,
**So that** the correct duty rates and descriptions appear on documents.

**Acceptance Criteria:**
- [ ] Product code (SKU), product name
- [ ] Description for customs (detailed, as required by customs)
- [ ] HS code (8-digit for India, with lookup/search)
- [ ] Country of origin
- [ ] Unit of measurement (PCS, KG, MT, LTR, CBM, SET, DOZ)
- [ ] Net weight per unit, gross weight per unit
- [ ] Dimensions (L x W x H in CM)
- [ ] Import duty rates: BCD%, IGST% (auto-fill from HS code if available)
- [ ] GST HSN code (for domestic), GST rate%
- [ ] Category/Group
- [ ] Product image upload
- [ ] Active/Inactive toggle

**Story Points:** 5

---

### E3-S5: HS Code Lookup

**As** an export manager,
**I want to** search for the correct HS code by keyword or code,
**So that** I classify my product correctly for customs.

**Acceptance Criteria:**
- [ ] Search by HS code (partial match) or keyword in description
- [ ] Display: HS code, description, chapter, BCD rate, IGST rate
- [ ] Hierarchical browsing: Chapter → Heading → Subheading
- [ ] Pre-loaded Indian customs tariff database (latest)
- [ ] Select HS code → auto-populate on product master

**Story Points:** 5

---

### E3-S6: Product List & Search

**As** a user,
**I want to** search and filter products,
**So that** I can quickly find items when creating documents.

**Acceptance Criteria:**
- [ ] List with: SKU, name, HS code, UOM, category, stock (if inventory enabled)
- [ ] Search by name, SKU, or HS code
- [ ] Filter by category, UOM, active/inactive
- [ ] Sort by name, SKU, last used

**Story Points:** 2

---

### E3-S7: Import Products from CSV/Excel

**As** a business owner,
**I want to** bulk import my product catalog,
**So that** I can get started quickly with existing data.

**Acceptance Criteria:**
- [ ] Template download with all fields
- [ ] Upload → preview → validate → import
- [ ] HS code validation (check if exists in tariff database)
- [ ] Error report for invalid rows
- [ ] Import summary

**Story Points:** 3

---

### E3-S8: Port Master (Pre-loaded)

**As** a system,
**I want to** provide a pre-loaded database of ports,
**So that** users can select ports from a dropdown without manual entry.

**Acceptance Criteria:**
- [ ] Pre-loaded: all Indian ports (200+) and major international ports (500+)
- [ ] Fields: port name, port code (UN/LOCODE, 6-digit), country, port type (sea/air/ICD/land)
- [ ] Search by name or code
- [ ] Filter by country or type
- [ ] Admin can add custom ports if needed

**Story Points:** 3

---

### E3-S9: Country Master (Pre-loaded)

**As** a system,
**I want to** provide a pre-loaded country database,
**So that** country selection is standardized across the platform.

**Acceptance Criteria:**
- [ ] Pre-loaded: all countries with ISO 2-digit and 3-digit codes
- [ ] Currency for each country
- [ ] FTA status with India (for preferential duty)
- [ ] Search by name or code

**Story Points:** 2

---

### E3-S10: Currency Master & Exchange Rates

**As** an accountant,
**I want to** view current exchange rates and set a base currency,
**So that** multi-currency transactions are valued correctly.

**Acceptance Criteria:**
- [ ] Pre-loaded: 15+ major currencies (USD, EUR, GBP, AED, JPY, CNY, etc.)
- [ ] Daily exchange rate update via API (RBI reference rate or open exchange API)
- [ ] Exchange rate history (last 12 months)
- [ ] Manual override option for a specific date
- [ ] Base currency configurable (default INR)
- [ ] Last updated timestamp visible

**Story Points:** 5

---

### E3-S11: Bank Account Master

**As** a business owner,
**I want to** manage my company bank accounts,
**So that** the correct bank details appear on invoices and for payment tracking.

**Acceptance Criteria:**
- [ ] Fields: bank name, branch, account number, IFSC, SWIFT code, account type, currency
- [ ] Mark one as default for exports, one for imports
- [ ] Used in: invoice bank details, payment recording, LC advising bank
- [ ] Multiple accounts supported

**Story Points:** 2

---

### E3-S12: Unit of Measurement Master

**As** a system,
**I want to** provide standardized UOMs with conversion support,
**So that** quantities are consistent across documents.

**Acceptance Criteria:**
- [ ] Pre-loaded: PCS, KG, MT, LTR, CBM, SET, DOZ, BOX, CTN, PAIR, SQM
- [ ] Custom UOM creation by admin
- [ ] Unit conversion rules (e.g., 1 MT = 1000 KG, 1 DOZ = 12 PCS)
- [ ] Used in product master, invoice line items, packing lists

**Story Points:** 2

---

### E3-S13: Terms & Conditions Templates

**As** a business owner,
**I want to** create reusable terms & conditions templates,
**So that** I don't re-type them for every document.

**Acceptance Criteria:**
- [ ] Template name, document type (invoice, PI, PO, etc.), content (rich text)
- [ ] Mark one as default per document type
- [ ] Can be selected during document creation
- [ ] Version history

**Story Points:** 3

---

### E3-S14: Incoterms Reference (Pre-loaded)

**As** a system,
**I want to** provide Incoterms 2020 as a reference,
**So that** users select the correct trade term with understanding.

**Acceptance Criteria:**
- [ ] Pre-loaded: EXW, FCA, FAS, FOB, CFR, CIF, CPT, CIP, DAP, DPU, DDP
- [ ] Each with: abbreviation, full name, risk transfer point, cost responsibility
- [ ] Tooltip/info panel when selecting Incoterm in documents
- [ ] Affects which fields are required on invoice (freight, insurance)

**Story Points:** 2

---

## Total Story Points: 47
