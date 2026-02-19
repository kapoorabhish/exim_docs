# E5: Import Documentation

**Phase:** 2 (Full Trade Cycle)
**Priority:** P0
**Primary Actors:** A5 Import Manager, A7 Purchase Manager, A9 Data Entry Operator, A11 CHA
**Dependencies:** E1, E2, E3

---

## Epic Summary

Complete import workflow — from purchase order to supplier, customs clearance via Bill of Entry, landed cost calculation, and goods receipt.

---

## User Stories

### E5-S1: Create Purchase Order (to Supplier)

**As** a purchase manager,
**I want to** create a purchase order to a foreign supplier,
**So that** I can formally place an order with agreed terms.

**Acceptance Criteria:**
- [ ] Auto-generated PO number
- [ ] Select supplier from party master
- [ ] Delivery address (in India), port of destination
- [ ] Line items: product, description, HS code, qty, unit, unit price (supplier currency)
- [ ] Incoterm, payment terms
- [ ] Expected delivery date
- [ ] Quality and inspection requirements (free text)
- [ ] Total value in supplier currency + INR equivalent
- [ ] Save as draft → submit for approval (if workflow enabled) → finalize
- [ ] PDF generation for sending to supplier

**Story Points:** 5

---

### E5-S2: PO Approval Workflow

**As** a business owner,
**I want to** approve purchase orders above a threshold,
**So that** procurement spending is controlled.

**Acceptance Criteria:**
- [ ] Configurable approval threshold (e.g., POs above $10,000 need Admin approval)
- [ ] PO status: Draft → Pending Approval → Approved → Sent to Supplier
- [ ] Approver gets in-app notification
- [ ] Approve / reject with comments
- [ ] Rejected POs return to Purchase Manager for revision

**Story Points:** 3

---

### E5-S3: Record Supplier Commercial Invoice

**As** an import manager,
**I want to** record the commercial invoice received from the supplier,
**So that** I can proceed with customs clearance.

**Acceptance Criteria:**
- [ ] Supplier's invoice number and date
- [ ] Link to Purchase Order (auto-fill fields)
- [ ] Supplier details, buyer details (importer)
- [ ] Line items: description, HS code, qty, unit, rate, amount
- [ ] Currency, Incoterm, payment terms
- [ ] Port of loading, port of discharge
- [ ] Upload original supplier invoice (PDF/scan)
- [ ] PO vs Invoice comparison (qty, price differences highlighted)

**Story Points:** 5

---

### E5-S4: Create Bill of Entry

**As** an import manager,
**I want to** prepare a Bill of Entry for customs clearance,
**So that** the CHA can file it on ICEGATE.

**Acceptance Criteria:**
- [ ] Auto-generate from supplier invoice
- [ ] BoE type: Home Consumption, Warehousing, Ex-Bond
- [ ] Port code, IEC, GSTIN, importer details
- [ ] Supplier details, country of origin, country of consignment
- [ ] Invoice reference
- [ ] Line items: HS code (8-digit), description, qty, unit, assessable value (CIF in INR)
- [ ] Per-item duty: BCD rate%, BCD amount, SWS (10% of BCD), IGST rate%, IGST amount, cess
- [ ] Exchange rate used for conversion
- [ ] Total assessable value, total BCD, total SWS, total IGST, total duty payable
- [ ] Status: Draft → Filed → Assessed → Duty Paid → Out of Charge
- [ ] BoE number (entered by CHA after ICEGATE filing)
- [ ] Amendment support

**Story Points:** 8

---

### E5-S5: Import Duty Calculator

**As** an import manager,
**I want to** calculate the total duty payable before filing the BoE,
**So that** I can arrange funds and verify the assessment.

**Acceptance Criteria:**
- [ ] Input: CIF value (foreign currency), exchange rate, HS code
- [ ] Auto-fetch: BCD rate, IGST rate from HS code master
- [ ] Calculate: Assessable Value = CIF in INR
- [ ] BCD = Assessable Value x BCD%
- [ ] SWS = BCD x 10%
- [ ] IGST base = Assessable Value + BCD + SWS
- [ ] IGST = IGST base x IGST%
- [ ] Total duty = BCD + SWS + IGST + Cess
- [ ] Display per-item and total breakdown
- [ ] Save calculation for reference

**Story Points:** 3

---

### E5-S6: Bill of Entry Status Tracking

**As** an import manager,
**I want to** track the customs clearance status of each BoE,
**So that** I can plan warehouse receipt and avoid demurrage.

**Acceptance Criteria:**
- [ ] Status workflow: Draft → Filed → Under Assessment → Assessed → Duty Paid → Examination → Out of Charge (OOC)
- [ ] Each status change: date, time, user, notes
- [ ] CHA can update status (if assigned)
- [ ] OOC date captured (critical for demurrage calculation)
- [ ] Dashboard: pending BoEs by status
- [ ] Alert if BoE is in "Filed" for more than 5 days

**Story Points:** 3

---

### E5-S7: Landed Cost Calculator

**As** an import manager,
**I want to** calculate the total landed cost of imported goods,
**So that** I can price my products correctly and compare suppliers.

**Acceptance Criteria:**
- [ ] Components: CIF value (INR) + BCD + SWS + IGST + port charges + CHA charges + transportation + insurance (domestic)
- [ ] Input: BoE duty amounts (auto-linked) + manual charges entry
- [ ] Calculate: total landed cost, per-unit cost
- [ ] Compare: side-by-side for same product from different suppliers
- [ ] Save calculations linked to BoE/shipment
- [ ] Export to Excel

**Story Points:** 5

---

### E5-S8: Record Import B/L and Delivery Order

**As** an import manager,
**I want to** record the B/L and delivery order for an import shipment,
**So that** I can track cargo arrival and take delivery.

**Acceptance Criteria:**
- [ ] B/L details: number, date, vessel, container numbers
- [ ] Upload B/L document
- [ ] Delivery Order: number, date, shipping line, validity
- [ ] Free time tracking (days remaining before demurrage)
- [ ] Link to BoE and supplier invoice

**Story Points:** 3

---

### E5-S9: Import Document Set View

**As** an import manager,
**I want to** see all documents for an import shipment in one view,
**So that** I can track clearance completeness.

**Acceptance Criteria:**
- [ ] Shipment view: PO, Supplier Invoice, B/L, BoE, Delivery Order, Certificates, Duty Challan
- [ ] Each document: status, date, number
- [ ] Missing documents highlighted
- [ ] Timeline view of clearance progress

**Story Points:** 3

---

### E5-S10: Import Register

**As** an import manager,
**I want to** view a consolidated register of all imports,
**So that** I have a single view of all import activity.

**Acceptance Criteria:**
- [ ] Table: PO no, supplier, country, CIF value, currency, BoE no, BoE date, duty paid, OOC date, status
- [ ] Filter by: date range, supplier, country, status
- [ ] Export to Excel/CSV
- [ ] Summary: total CIF, total duty paid

**Story Points:** 3

---

### E5-S11: Demurrage & Detention Calculator

**As** an import manager,
**I want to** track free time and calculate demurrage/detention charges,
**So that** I can avoid unnecessary costs by clearing cargo on time.

**Acceptance Criteria:**
- [ ] Input: container arrival date, free time days (configurable per shipping line)
- [ ] Auto-calculate: free time remaining, demurrage start date
- [ ] Daily demurrage rate (configurable)
- [ ] Running total of estimated charges
- [ ] Alert when free time is expiring (3 days, 1 day before)
- [ ] Distinction: demurrage (at port) vs detention (outside port)

**Story Points:** 3

---

### E5-S12: Upload Import Certificates & Documents

**As** an import manager,
**I want to** upload certificates and supporting documents for an import shipment,
**So that** everything is stored centrally for compliance.

**Acceptance Criteria:**
- [ ] Document types: CoO from supplier, quality certificate, weight certificate, test report, duty payment challan, examination report
- [ ] Fields: type, number, date, issuing authority
- [ ] Upload file (PDF/image)
- [ ] Link to shipment/BoE

**Story Points:** 2

---

### E5-S13: Clone Purchase Order

**As** a purchase manager,
**I want to** clone an existing PO for repeat orders,
**So that** I can save time on recurring procurement.

**Acceptance Criteria:**
- [ ] "Clone" action on any PO
- [ ] New PO number, today's date, all other fields copied
- [ ] Opens as draft for editing

**Story Points:** 1

---

### E5-S14: PO Fulfillment Tracking

**As** a purchase manager,
**I want to** track which POs have been fully or partially fulfilled,
**So that** I can follow up with suppliers on pending deliveries.

**Acceptance Criteria:**
- [ ] PO status: Open → Partially Fulfilled → Fully Fulfilled → Closed
- [ ] Fulfilled qty from linked supplier invoices
- [ ] Pending qty = PO qty - fulfilled qty
- [ ] Dashboard: open POs, overdue POs (past expected delivery date)

**Story Points:** 3

---

## Total Story Points: 50
