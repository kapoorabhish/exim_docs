# E4: Export Documentation

**Phase:** 1 (Foundation)
**Priority:** P0
**Primary Actors:** A4 Export Manager, A6 Sales Manager, A9 Data Entry Operator, A11 CHA
**Dependencies:** E1 (Tenant), E2 (RBAC), E3 (Master Data), E11 (Document Templates)

---

## Epic Summary

The core export workflow — from proforma invoice to bank realization certificate. Covers the complete document chain with traceability, status tracking, and PDF generation.

---

## User Stories

### E4-S1: Create Proforma Invoice

**As** a sales manager,
**I want to** create a proforma invoice for a buyer,
**So that** the buyer can confirm the order, open an LC, or arrange advance payment.

**Acceptance Criteria:**
- [ ] Auto-generated PI number (configurable format: prefix/year/sequence)
- [ ] Select buyer from party master (or create inline)
- [ ] Seller details auto-populated from business profile
- [ ] Validity period (days)
- [ ] Line items: product (from master), description, HS code, qty, unit, unit price, total
- [ ] Multi-currency: price in buyer's currency
- [ ] Incoterm selection → conditionally show freight/insurance fields
- [ ] Payment terms (Advance, LC, DP, DA, Open Account)
- [ ] Port of loading, port of discharge (from port master)
- [ ] Delivery timeline
- [ ] Bank details (for LC opening)
- [ ] Special instructions (free text)
- [ ] Terms & conditions (from template or custom)
- [ ] Save as draft, or finalize
- [ ] PI total auto-calculated

**Story Points:** 8

---

### E4-S2: PI Version Control & Amendment

**As** a sales manager,
**I want to** create revised versions of a proforma invoice,
**So that** I can track changes requested by the buyer.

**Acceptance Criteria:**
- [ ] "Revise" action creates a new version (v2, v3, etc.)
- [ ] Previous versions retained and viewable
- [ ] Amendment notes field (what changed and why)
- [ ] Version comparison view (diff)
- [ ] Only the latest version is active
- [ ] Buyer sees revision number on the document

**Story Points:** 3

---

### E4-S3: Convert PI to Commercial Invoice

**As** an export manager,
**I want to** convert an approved proforma invoice into a commercial invoice,
**So that** I don't re-enter the same data for the final invoice.

**Acceptance Criteria:**
- [ ] "Convert to Invoice" action on finalized PI
- [ ] All fields carried forward (items, pricing, party, terms)
- [ ] New invoice number auto-generated
- [ ] User can edit any field before saving the invoice
- [ ] PI is linked to the CI (bidirectional reference)
- [ ] PI status changes to "Converted"

**Story Points:** 3

---

### E4-S4: Create Commercial Invoice (Export Invoice)

**As** an export manager,
**I want to** create a commercial invoice with all customs-required fields,
**So that** the document is compliant for customs filing and payment collection.

**Acceptance Criteria:**
- [ ] Auto-generated invoice number
- [ ] Exporter details: name, address, IEC, GSTIN, PAN (from profile)
- [ ] Consignee (buyer), Notify Party (if different)
- [ ] Shipping details: pre-carriage, place of receipt, vessel/flight, port of loading, port of discharge, final destination
- [ ] Country of origin, country of final destination
- [ ] Incoterm, payment terms
- [ ] Line items: marks & numbers, description (customs), HS code (8-digit), qty, unit, rate, amount
- [ ] Per-item: net weight, gross weight
- [ ] Totals: subtotal (FOB), freight (if CFR/CIF), insurance (if CIF), total invoice value
- [ ] Amount in words (with currency)
- [ ] INR equivalent display (using current exchange rate)
- [ ] Bank details
- [ ] Declaration: "Export under LUT" or "Export under Bond/IGST"
- [ ] Terms & conditions
- [ ] Save as draft → finalize → lock (no edit after SB filing)

**Story Points:** 8

---

### E4-S5: Record Buyer Purchase Order

**As** an export manager,
**I want to** record the buyer's purchase order and link it to our PI,
**So that** I can track order confirmation and compare PO vs PI.

**Acceptance Criteria:**
- [ ] PO number (buyer's reference), PO date
- [ ] Link to PI (optional)
- [ ] Expected delivery date
- [ ] Items with quantities (should match PI)
- [ ] PO vs PI comparison view (quantity, price differences highlighted)
- [ ] Upload PO document (PDF)
- [ ] Acceptance/Rejection status

**Story Points:** 3

---

### E4-S6: Create Packing List

**As** an export manager,
**I want to** create a packing list with carton-level detail,
**So that** the customs and buyer know exact package contents.

**Acceptance Criteria:**
- [ ] Auto-generate from linked invoice (pre-fill items)
- [ ] Packing list number, date, invoice reference
- [ ] Exporter and consignee details
- [ ] Shipping marks (configurable per shipment)
- [ ] Package table: package no (1/10, 2/10), contents, qty, net weight, gross weight, dimensions (LxWxH cm), volume (CBM)
- [ ] Auto-calculated totals: total packages, total net weight, total gross weight, total CBM
- [ ] CBM auto-calculated from dimensions
- [ ] Add/remove/reorder packages
- [ ] Link to invoice (bidirectional)

**Story Points:** 5

---

### E4-S7: Create Shipping Bill

**As** an export manager,
**I want to** prepare a shipping bill for customs filing,
**So that** the CHA can file it on ICEGATE.

**Acceptance Criteria:**
- [ ] Auto-generate from linked commercial invoice
- [ ] SB type: Free, Drawback, RoDTEP, EPCG
  - Free Shipping Bill — no export incentive claim
  - Drawback Shipping Bill — claiming duty drawback (AIR or Brand Rate)
  - RoDTEP Shipping Bill — Remission of Duties and Taxes on Exported Products (replaced MEIS from Jan 2021; replaced DEPB which was discontinued Sep 2011)
  - EPCG Shipping Bill — against EPCG licence
- [ ] Port code, IEC, GSTIN, exporter details
- [ ] Consignee details, invoice reference
- [ ] Line items: HS code (8-digit), description, qty, unit, unit price (INR), FOB value (INR)
- [ ] Exchange rate used for conversion
- [ ] Freight, insurance amounts (INR)
- [ ] Drawback rate and amount per item (if Drawback SB)
- [ ] Country of destination, mode of shipment (sea/air/road)
- [ ] Expected date of shipment
- [ ] Status tracking: Draft → Filed → Assessed → LEO → Shipped
- [ ] SB number field (entered by CHA after ICEGATE filing)
- [ ] Amendment support (reason + new values)

**Story Points:** 8

---

### E4-S8: Shipping Bill Status Tracking

**As** an export manager,
**I want to** track the status of each shipping bill,
**So that** I know where each shipment is in the customs clearance process.

**Acceptance Criteria:**
- [ ] Status workflow: Draft → Filed → Under Assessment → Assessed → Let Export Order (LEO) → Shipped
- [ ] Each status change records: date, time, user, notes
- [ ] Status change can be done by CHA (if assigned) or Export Manager
- [ ] LEO number and date captured
- [ ] Dashboard widget: pending SBs by status
- [ ] Alert if SB is in "Filed" status for more than 3 days

**Story Points:** 3

---

### E4-S9: Certificate of Origin

**As** an export manager,
**I want to** generate a Certificate of Origin from an invoice,
**So that** the buyer can claim preferential duty in their country.

**Acceptance Criteria:**
- [ ] Auto-populate from linked invoice
- [ ] CoO number, issue date
- [ ] Exporter and consignee details
- [ ] Invoice reference
- [ ] Item description, HS code, quantity, gross weight, packages
- [ ] Country of origin
- [ ] Type: Non-Preferential or Preferential (FTA-specific)
- [ ] Issuing authority: Chamber of Commerce
- [ ] Status: Draft → Submitted to Chamber → Issued
- [ ] Upload scanned CoO after Chamber issues it

**Story Points:** 3

---

### E4-S10: Record Bill of Lading / Airway Bill

**As** an export manager,
**I want to** record the B/L or AWB details received from the shipping line,
**So that** I can complete the document set for the buyer/bank.

**Acceptance Criteria:**
- [ ] B/L number, B/L date (from shipping line)
- [ ] B/L type: Original, Telex Release, Sea Waybill, House B/L, Master B/L
- [ ] Shipper, consignee, notify party
- [ ] Vessel name, voyage number
- [ ] Port of loading, port of discharge
- [ ] Container number(s), seal number(s)
- [ ] Packages, description, gross weight, measurement (CBM)
- [ ] Freight terms: Prepaid / Collect
- [ ] Number of originals issued
- [ ] Upload B/L document (PDF/image)
- [ ] Status: Issued → Surrendered / Telex Released
- [ ] Link to invoice and shipping bill

**Story Points:** 3

---

### E4-S11: Record Insurance Certificate

**As** an export manager,
**I want to** record cargo insurance details,
**So that** CIF shipments have complete documentation.

**Acceptance Criteria:**
- [ ] Policy number, insurance company, policy date
- [ ] Insured party, voyage details
- [ ] Sum insured (auto-suggest: 110% of CIF value)
- [ ] Coverage type: Institute Cargo Clause A/B/C
- [ ] Premium amount
- [ ] Validity period
- [ ] Upload insurance document
- [ ] Link to invoice

**Story Points:** 2

---

### E4-S12: Upload Inspection & Other Certificates

**As** an export manager,
**I want to** upload inspection, phytosanitary, fumigation, and other certificates,
**So that** the complete document set is available in one place.

**Acceptance Criteria:**
- [ ] Certificate types: Pre-Shipment Inspection, Phytosanitary, Health, Fumigation, Weight, Quality, Other
- [ ] Fields: type, certificate number, issue date, expiry date, issuing authority
- [ ] Upload document (PDF/image)
- [ ] Link to invoice/shipment
- [ ] Alert for missing required certificates (based on product/destination rules)
- [ ] Expiry alerts (30 days before)

**Story Points:** 3

---

### E4-S13: Export Document Set View

**As** an export manager,
**I want to** see all documents for a shipment in one view,
**So that** I can verify completeness before sending to the bank or buyer.

**Acceptance Criteria:**
- [ ] Shipment-level view showing: PI, PO, CI, PL, SB, B/L, CoO, Insurance, Certificates
- [ ] Each document shows: status, date, number
- [ ] Missing documents highlighted
- [ ] Checklist mode: tick off documents as they are ready
- [ ] "Send to Bank" or "Send to Buyer" action (triggers email with attachments)
- [ ] Link between related documents (click to navigate)

**Story Points:** 5

---

### E4-S14: Record Bank Realization Certificate (BRC)

**As** an export manager,
**I want to** record the BRC after payment is received,
**So that** I can close the shipment cycle and claim duty drawback.

**Acceptance Criteria:**
- [ ] BRC number, bank name, date of realization
- [ ] Link to shipping bill and invoice
- [ ] Foreign currency received, INR equivalent, exchange rate
- [ ] Upload BRC document
- [ ] Match: BRC amount vs invoice amount (flag discrepancies)
- [ ] Status: Pending → Received
- [ ] Dashboard: pending BRCs report

**Story Points:** 3

---

### E4-S15: Duty Drawback Tracking

**As** an export manager,
**I want to** track duty drawback claims for each shipping bill,
**So that** I don't miss any entitled refunds.

**Acceptance Criteria:**
- [ ] Drawback eligible only for "Drawback" type SBs
- [ ] Per-item drawback rate and amount (from SB)
- [ ] Total drawback amount per SB
- [ ] Status: Eligible → BRC Received → Claimed → Disbursed
- [ ] Claim requires: SB + BRC (both must exist)
- [ ] Report: pending drawback claims, total amount

**Story Points:** 3

---

### E4-S16: Export Register

**As** an export manager,
**I want to** view a consolidated register of all export shipments,
**So that** I have a single view of all my export activity.

**Acceptance Criteria:**
- [ ] Table: invoice no, date, buyer, country, FOB value, currency, SB no, SB date, B/L no, status, BRC status
- [ ] Filter by: date range, buyer, country, status, BRC status
- [ ] Sort by any column
- [ ] Export to Excel/CSV
- [ ] Summary row: total FOB value, count of shipments

**Story Points:** 3

---

### E4-S17: Share Document via Email

**As** an export manager,
**I want to** email a document (invoice, PI, PL) as a PDF to the buyer,
**So that** I can communicate documents without leaving the platform.

**Acceptance Criteria:**
- [ ] "Share via Email" action on any finalized document
- [ ] Pre-filled: buyer's email, subject line, body template
- [ ] PDF auto-attached
- [ ] CC/BCC support
- [ ] Email sent via configured SMTP or platform email service
- [ ] Email delivery status tracked (sent/failed)
- [ ] Communication history stored on the document

**Story Points:** 3

---

### E4-S18: Clone/Duplicate Document

**As** an export manager,
**I want to** clone an existing invoice to create a similar one,
**So that** I can speed up document creation for repeat shipments.

**Acceptance Criteria:**
- [ ] "Clone" action on CI, PI, PL
- [ ] Copies all fields except: number (new auto-generated), date (today)
- [ ] Opens as a new draft for editing
- [ ] Original reference maintained (cloned from)

**Story Points:** 2

---

## Total Story Points: 73
