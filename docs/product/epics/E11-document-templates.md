# E11: Document Templates & Generation

**Phase:** 1 (Foundation)
**Priority:** P0
**Primary Actors:** A2 Admin, A4 Export Manager, A5 Import Manager
**Dependencies:** E1 (Tenant — branding), E3 (Master Data — for merge fields)

---

## Epic Summary

PDF document generation with customizable templates, company branding, merge fields, and multi-format support. Critical for producing professional trade documents that meet customs and banking requirements.

---

## User Stories

### E11-S1: Invoice PDF Template

**As** an export manager,
**I want to** generate a professional PDF of a commercial invoice,
**So that** I can share it with the buyer, bank, and customs.

**Acceptance Criteria:**
- [ ] A4 format, print-ready
- [ ] Company logo and branding (from business profile)
- [ ] All invoice fields rendered (exporter, consignee, items, totals, bank details)
- [ ] Items table with: marks & numbers, description, HS code, qty, rate, amount, weight
- [ ] Amount in words (with currency name)
- [ ] INR equivalent shown (for customs reference)
- [ ] Declaration text ("Export under LUT/Bond")
- [ ] Terms & conditions section
- [ ] Signature block with uploaded signature image
- [ ] Unique invoice styling distinguishable from other documents

**Story Points:** 5

---

### E11-S2: Proforma Invoice PDF Template

**As** a sales manager,
**I want to** generate a professional proforma invoice PDF,
**So that** I can send it to the buyer for order confirmation or LC opening.

**Acceptance Criteria:**
- [ ] Similar layout to commercial invoice but marked "PROFORMA INVOICE"
- [ ] Validity period displayed prominently
- [ ] Bank details for LC opening
- [ ] Version/revision number visible
- [ ] "This is not a tax invoice" disclaimer

**Story Points:** 3

---

### E11-S3: Packing List PDF Template

**As** an export manager,
**I want to** generate a packing list PDF with package-level details,
**So that** customs and the buyer can verify contents.

**Acceptance Criteria:**
- [ ] Package table: package no, contents, qty, net weight, gross weight, dimensions, CBM
- [ ] Totals: packages, net weight, gross weight, volume
- [ ] Shipping marks section
- [ ] Linked invoice reference
- [ ] Compact layout to fit many packages on one page

**Story Points:** 3

---

### E11-S4: Template Customization (Branding)

**As** a business owner,
**I want to** customize the look of my document templates,
**So that** documents reflect my company brand.

**Acceptance Criteria:**
- [ ] Logo placement: left, center, or full-width banner
- [ ] Primary color for headers and accents (from brand color picker)
- [ ] Font selection: 3-4 professional fonts
- [ ] Paper size: A4 / Letter
- [ ] Show/hide sections: bank details, terms, signature
- [ ] Custom header text and footer text
- [ ] Preview changes before saving
- [ ] Separate config per document type

**Story Points:** 5

---

### E11-S5: Document Number Series Configuration

**As** a business owner,
**I want to** configure auto-numbering formats for each document type,
**So that** numbers follow my company convention.

**Acceptance Criteria:**
- [ ] Per document type: prefix, separator, year format, sequence padding, suffix
- [ ] Example preview: "EXP/INV/2025-26/00042"
- [ ] Reset frequency: yearly (FY), monthly, never
- [ ] Starting number configurable
- [ ] Per-branch number series (if multi-branch)
- [ ] Next number preview before document creation

**Story Points:** 3

---

### E11-S6: Bulk PDF Generation

**As** an export manager,
**I want to** generate PDFs for multiple documents at once,
**So that** I can print or email a batch of invoices.

**Acceptance Criteria:**
- [ ] Select multiple documents from list → "Generate PDFs"
- [ ] Background job (BullMQ) processes batch
- [ ] Progress indicator
- [ ] Download as zip when complete
- [ ] Option: merged single PDF or individual files

**Story Points:** 3

---

### E11-S7: Document Watermark & Copies

**As** an export manager,
**I want to** generate documents with watermarks and copy labels,
**So that** I can distinguish originals from copies as required by banks and customs.

**Acceptance Criteria:**
- [ ] Watermark options: "ORIGINAL", "COPY", "DUPLICATE", "DRAFT", custom text
- [ ] Copy labels: "Original for Buyer", "Copy for Bank", "Office Copy"
- [ ] Generate multiple copies in one action (e.g., 3 originals + 2 copies)
- [ ] Draft documents auto-watermarked "DRAFT"

**Story Points:** 3

---

### E11-S8: QR Code on Documents

**As** a system,
**I want to** embed a QR code on generated documents,
**So that** the document can be verified for authenticity.

**Acceptance Criteria:**
- [ ] QR code contains: document URL (verification link)
- [ ] Placed in footer or designated corner
- [ ] Scanning QR opens a verification page showing: document number, date, amount, status
- [ ] Verification page is public (no login required) but shows limited info
- [ ] Configurable: enable/disable per document type

**Story Points:** 3

---

## Total Story Points: 28
