# E8: GST & Compliance

**Phase:** 2 (Full Trade Cycle)
**Priority:** P0
**Primary Actors:** A3 Accountant, A2 Admin
**Dependencies:** E4 (Export Docs), E5 (Import Docs)

---

## Epic Summary

GST compliance for export-import businesses — LUT management, zero-rated export treatment, IGST credit tracking from imports, GSTR-1/3B data generation, and reconciliation.

---

## User Stories

### E8-S1: LUT Management

**As** an accountant,
**I want to** manage the Letter of Undertaking (LUT) for zero-rated exports,
**So that** I can export without paying IGST.

**Acceptance Criteria:**
- [ ] Record LUT: ARN number, filing date, financial year, validity (1 year)
- [ ] Status: Applied → Active → Expiring → Expired
- [ ] Alert: 30 days before expiry
- [ ] Active LUT required to mark invoices as "Export under LUT"
- [ ] LUT history (year-wise)
- [ ] Upload LUT acknowledgment document

**Story Points:** 3

---

### E8-S2: Export Invoice GST Treatment

**As** an accountant,
**I want to** configure GST treatment on export invoices,
**So that** invoices are compliant with GST export rules.

**Acceptance Criteria:**
- [ ] Two options per invoice: "Export under LUT" or "Export with IGST payment"
- [ ] If LUT: GST amount = 0, declaration text auto-added
- [ ] If IGST: IGST calculated on invoice value, IGST refund tracking enabled
- [ ] Default to LUT if active LUT exists
- [ ] Validation: cannot select LUT if no active LUT on file

**Story Points:** 3

---

### E8-S3: GSTR-1 Export Data (Table 6A)

**As** an accountant,
**I want to** generate GSTR-1 Table 6A data from export invoices,
**So that** I can file my GST returns accurately.

**Acceptance Criteria:**
- [ ] Generate for: month or quarter
- [ ] Data: invoice number, date, shipping bill number, shipping bill date, port code, buyer country, total invoice value, IGST amount
- [ ] Validation: all export invoices must have shipping bill number before inclusion
- [ ] Preview data before export
- [ ] Export as JSON (GST portal format) and Excel
- [ ] Mark invoices as "Included in GSTR-1" after filing

**Story Points:** 5

---

### E8-S4: Shipping Bill vs GSTR-1 Reconciliation

**As** an accountant,
**I want to** reconcile shipping bills with GSTR-1 filings,
**So that** I can identify mismatches before the tax department does.

**Acceptance Criteria:**
- [ ] Compare: EXIM shipping bills vs GSTR-1 Table 6A entries
- [ ] Identify: missing in GSTR-1, missing shipping bill reference, amount mismatch
- [ ] Mismatch reasons: amendment, cancellation, data entry error
- [ ] Resolution: link, amend, or add notes
- [ ] Reconciliation report exportable

**Story Points:** 5

---

### E8-S5: IGST Credit Tracking (Imports)

**As** an accountant,
**I want to** track IGST paid on imports and ensure it's claimed in GSTR-3B,
**So that** I don't lose input tax credit.

**Acceptance Criteria:**
- [ ] Auto-capture IGST amount from each Bill of Entry
- [ ] IGST register: BoE number, date, IGST amount, claimed (yes/no), GSTR-3B month
- [ ] Total IGST eligible for credit in current period
- [ ] Mark as "Claimed" after GSTR-3B filing
- [ ] Unclaimed IGST alert (older than 2 months)

**Story Points:** 3

---

### E8-S6: Bill of Entry vs GSTR-3B Reconciliation

**As** an accountant,
**I want to** reconcile import IGST (from BoE) with GSTR-3B claims,
**So that** all eligible credits are claimed and verified.

**Acceptance Criteria:**
- [ ] Compare: BoE IGST amounts vs GSTR-3B import credit claimed
- [ ] Identify: unclaimed BoE IGST, over-claimed amounts
- [ ] Period-wise view (monthly)
- [ ] Reconciliation report

**Story Points:** 3

---

### E8-S7: GSTR-3B Data Generation

**As** an accountant,
**I want to** generate GSTR-3B summary data from EXIM transactions,
**So that** I have accurate figures for filing.

**Acceptance Criteria:**
- [ ] Export supplies (Table 3.1): zero-rated with/without IGST
- [ ] Import IGST credit (Table 4): from Bills of Entry
- [ ] Exempt supplies (if any)
- [ ] Generate for month
- [ ] Export as Excel
- [ ] Not auto-filing (manual filing on GST portal in v1)

**Story Points:** 3

---

### E8-S8: E-Invoice Generation (for Domestic Invoices)

**As** an accountant,
**I want to** generate e-invoices for domestic transactions (if applicable),
**So that** I comply with e-invoicing mandate.

**Acceptance Criteria:**
- [ ] Generate IRN (Invoice Reference Number) via GST e-invoice API
- [ ] QR code generation from IRN
- [ ] E-invoice applicable for B2B domestic supplies (above threshold)
- [ ] Auto-retry on API failure
- [ ] IRN stored on invoice record
- [ ] Status: Pending → Generated → Cancelled

**Story Points:** 5

---

### E8-S9: GST Compliance Dashboard

**As** an accountant,
**I want to** see a compliance dashboard showing filing status and upcoming deadlines,
**So that** I never miss a filing date.

**Acceptance Criteria:**
- [ ] LUT status and expiry
- [ ] GSTR-1 filing status by month (filed/pending)
- [ ] GSTR-3B filing status by month
- [ ] Upcoming deadlines (GSTR-1: 11th, GSTR-3B: 20th)
- [ ] Pending reconciliation items count
- [ ] Unclaimed IGST credits amount

**Story Points:** 3

---

### E8-S10: IEC Annual Update & Registration Tracking

**As** a business owner,
**I want to** track my IEC annual update confirmation and other registration statuses,
**So that** my trade registrations remain active and I don't face deactivation.

**Note (domain correction):** IEC does NOT require annual renewal. As of March 2021, DGFT updated policy:
IEC is permanently linked to PAN with no expiry. However, exporters/importers must **confirm/update IEC
details once per year** on the DGFT portal (update window: April 1 – June 30) to keep IEC active.
Non-update leads to **deactivation**, not expiry.

**Acceptance Criteria:**
- [ ] IEC annual update tracking (not renewal):
  - Status: Active | Update Due | Deactivated
  - Alert: Every April 1 — "IEC annual update window open — confirm on DGFT portal before June 30"
  - Alert: Every June 15 — warning if not yet acknowledged
  - If not acknowledged by June 30 → status set to "Update Due"
  - Store: IEC number, last confirmed date (`iecLastConfirmedAt`)
- [ ] GSTIN status tracking: Active / Suspended / Cancelled
- [ ] AD Code tracking: code number, issuing bank, ports registered at
- [ ] PAN on file (read-only, from business profile)
- [ ] Upload acknowledgment documents (IEC update confirmation, GSTIN certificate)
- [ ] History of annual update confirmations (year-wise)

**Story Points:** 3

---

## Total Story Points: 35
