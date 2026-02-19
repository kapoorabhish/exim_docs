# E6: Letter of Credit & Trade Finance

**Phase:** 2 (Full Trade Cycle)
**Priority:** P1
**Primary Actors:** A3 Accountant, A4 Export Manager, A5 Import Manager, A2 Admin
**Dependencies:** E4 (Export Docs), E5 (Import Docs), E7 (Payments)

---

## Epic Summary

Manage the full LC lifecycle — from opening to document submission to payment. Track LC terms, document compliance, discrepancies, and expiry dates.

---

## User Stories

### E6-S1: Record LC Details (Export — Received from Buyer's Bank)

**As** an export manager,
**I want to** record the LC details received from the buyer's bank,
**So that** I can ensure my shipment and documents comply with LC terms.

**Acceptance Criteria:**
- [ ] LC number, LC date
- [ ] Issuing bank (buyer's bank), advising bank (our bank)
- [ ] Beneficiary (exporter), applicant (buyer)
- [ ] LC amount, currency
- [ ] LC type: Sight / Usance (30/60/90/120 days), Irrevocable, Confirmed/Unconfirmed
- [ ] Expiry date, latest shipment date
- [ ] Port of loading, port of discharge
- [ ] Partial shipments: allowed / not allowed
- [ ] Transhipment: allowed / not allowed
- [ ] Upload LC document (PDF/SWIFT message)
- [ ] Link to proforma invoice

**Story Points:** 5

---

### E6-S2: LC Required Documents Checklist

**As** an export manager,
**I want to** capture the documents required by the LC,
**So that** I can prepare a compliant document set.

**Acceptance Criteria:**
- [ ] Configurable checklist from LC terms: Commercial Invoice (originals, copies), Packing List, B/L (full set), CoO, Insurance, Inspection Certificate, others
- [ ] Each item: required count (originals + copies), specific clause requirements
- [ ] Status per document: Not Started → In Progress → Ready
- [ ] Overall readiness percentage
- [ ] Alert for documents not yet prepared as shipment date approaches

**Story Points:** 3

---

### E6-S3: LC vs Invoice Compliance Check

**As** an export manager,
**I want to** compare my commercial invoice against the LC terms,
**So that** I can catch discrepancies before submitting to the bank.

**Acceptance Criteria:**
- [ ] Auto-compare: LC amount vs invoice total (tolerance check)
- [ ] Verify: latest shipment date vs actual shipment date
- [ ] Check: port of loading/discharge match
- [ ] Check: goods description matches (keyword comparison)
- [ ] Check: partial shipment rules respected
- [ ] Highlight discrepancies with severity (blocking vs non-blocking)
- [ ] Discrepancy resolution notes

**Story Points:** 5

---

### E6-S4: LC Document Submission to Bank

**As** an accountant,
**I want to** track the submission of documents to the advising bank,
**So that** I can follow up on payment.

**Acceptance Criteria:**
- [ ] Mark document set as "Submitted to Bank"
- [ ] Submission date, bank reference number
- [ ] Document presentation period check (usually 21 days from B/L date)
- [ ] Bank response tracking: Accepted / Discrepancies found
- [ ] Status: Submitted → Under Review → Accepted → Payment Released

**Story Points:** 3

---

### E6-S5: LC Discrepancy Management

**As** an accountant,
**I want to** record and resolve LC discrepancies raised by the bank,
**So that** payment is not delayed.

**Acceptance Criteria:**
- [ ] Log discrepancies: description, severity, document affected
- [ ] Resolution options: amend document, buyer accepts discrepancy, LC amendment
- [ ] Status per discrepancy: Open → Resolved / Waived
- [ ] Bank charges for discrepancy handling
- [ ] Communication log with bank

**Story Points:** 3

---

### E6-S6: LC Amendment Tracking

**As** an export manager,
**I want to** track amendments to the LC,
**So that** I always work with the latest LC terms.

**Acceptance Criteria:**
- [ ] Amendment number, date, description of change
- [ ] Fields changed: amount, expiry date, shipment date, terms
- [ ] Previous vs new values
- [ ] Acceptance/rejection of amendment
- [ ] Updated LC terms reflect the latest amendment
- [ ] Upload amended LC document

**Story Points:** 3

---

### E6-S7: Record LC Details (Import — Opened by Us)

**As** an import manager,
**I want to** record LC details that we open for a supplier,
**So that** I can track the import LC lifecycle.

**Acceptance Criteria:**
- [ ] LC number, LC date, opening bank (our bank)
- [ ] Beneficiary (supplier), applicant (us)
- [ ] Amount, currency, type (sight/usance)
- [ ] Expiry date, latest shipment date
- [ ] LC opening charges (bank fees)
- [ ] Link to purchase order
- [ ] Status: Applied → Opened → Documents Received → Payment Due → Settled

**Story Points:** 3

---

### E6-S8: LC Expiry Alerts

**As** an export manager,
**I want to** receive alerts before LC expiry and latest shipment dates,
**So that** I don't miss critical deadlines.

**Acceptance Criteria:**
- [ ] Alert at: 30 days, 15 days, 7 days, 3 days before expiry
- [ ] Alert at: 15 days, 7 days, 3 days before latest shipment date
- [ ] In-app notification + email
- [ ] Dashboard widget: LCs expiring this month
- [ ] Expired LCs highlighted in red

**Story Points:** 2

---

### E6-S9: LC Register

**As** an accountant,
**I want to** view all LCs in a consolidated register,
**So that** I can track LC utilization and outstanding commitments.

**Acceptance Criteria:**
- [ ] Table: LC no, type, party, amount, currency, issue date, expiry date, status, utilized amount
- [ ] Filter: export/import, active/expired, party, date range
- [ ] Summary: total LC value, utilized, remaining
- [ ] Export to Excel

**Story Points:** 2

---

### E6-S10: LC Payment Tracking

**As** an accountant,
**I want to** track payment realization against each LC,
**So that** I know the payment status of every LC transaction.

**Acceptance Criteria:**
- [ ] For Sight LC: payment expected within days of document acceptance
- [ ] For Usance LC: maturity date calculated (B/L date + usance period)
- [ ] Payment amount, date, exchange rate, bank charges
- [ ] Link to payment record (E7)
- [ ] Status: Payment Pending → Payment Due → Realized
- [ ] Overdue alert if payment not received by maturity + grace period

**Story Points:** 3

---

## Total Story Points: 32
