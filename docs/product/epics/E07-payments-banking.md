# E7: Payments & Banking

**Phase:** 2 (Full Trade Cycle)
**Priority:** P0
**Primary Actors:** A3 Accountant, A2 Admin
**Dependencies:** E4 (Export Docs), E5 (Import Docs)

---

## Epic Summary

Record and reconcile payments across multi-currency transactions — export receivables, import payables, advance adjustments, bank reconciliation, and aging reports.

---

## User Stories

### E7-S1: Record Export Payment Received

**As** an accountant,
**I want to** record a payment received from a buyer,
**So that** I can track outstanding receivables and match payments to invoices.

**Acceptance Criteria:**
- [ ] Payment date, reference number (bank UTR/wire reference)
- [ ] Buyer (from party master)
- [ ] Amount received (foreign currency)
- [ ] Exchange rate (auto-fetch or manual)
- [ ] INR equivalent (auto-calculated)
- [ ] Bank account (received in)
- [ ] Payment mode: Wire Transfer, LC, Cheque, Cash
- [ ] Bank charges deducted
- [ ] Link to one or more invoices (partial payment support)
- [ ] Per-invoice allocation (split a single payment across invoices)
- [ ] Status: Pending Clearance → Cleared → Bounced

**Story Points:** 5

---

### E7-S2: Record Import Payment Made

**As** an accountant,
**I want to** record a payment made to a supplier,
**So that** I can track outstanding payables.

**Acceptance Criteria:**
- [ ] Payment date, reference number
- [ ] Supplier (from party master)
- [ ] Amount paid (foreign currency)
- [ ] Exchange rate, INR equivalent
- [ ] Bank account (paid from)
- [ ] Payment mode: Wire Transfer, LC, TT, Cheque
- [ ] Bank charges
- [ ] Link to supplier invoices / purchase orders
- [ ] Per-invoice allocation
- [ ] TDS deducted (if applicable, for Indian suppliers)

**Story Points:** 5

---

### E7-S3: Advance Payment Recording

**As** an accountant,
**I want to** record advance payments (received or made) and adjust them against invoices later,
**So that** advance amounts are tracked separately until utilized.

**Acceptance Criteria:**
- [ ] Record advance: amount, currency, party, date, purpose
- [ ] Advance balance: total advance - amount adjusted
- [ ] "Adjust Advance" action when recording invoice payment
- [ ] Partial advance adjustment allowed
- [ ] Advance ledger per party
- [ ] Unadjusted advance visible in outstanding reports

**Story Points:** 5

---

### E7-S4: Payment Schedule & Reminders

**As** an accountant,
**I want to** set payment due dates and receive reminders,
**So that** I can follow up on overdue payments proactively.

**Acceptance Criteria:**
- [ ] Payment due date per invoice (auto-calculated from payment terms)
- [ ] Calendar view of upcoming payment dates
- [ ] Overdue payments highlighted (1-30, 31-60, 61-90, 90+ days)
- [ ] Manual reminder trigger (send email to party)
- [ ] Auto-reminder configuration: X days before due, on due date, X days after due
- [ ] Snooze/dismiss reminders

**Story Points:** 5

---

### E7-S5: Outstanding Receivables Report

**As** an accountant,
**I want to** view all outstanding export receivables by buyer,
**So that** I can follow up on collections and assess credit risk.

**Acceptance Criteria:**
- [ ] Table: buyer, invoice no, invoice date, amount, currency, due date, days overdue, age bucket
- [ ] Age buckets: Current, 1-30, 31-60, 61-90, 90+ days
- [ ] Filter by buyer, currency, age bucket, date range
- [ ] Summary: total outstanding, by age bucket, by currency
- [ ] Buyer-wise subtotals
- [ ] Export to Excel

**Story Points:** 3

---

### E7-S6: Outstanding Payables Report

**As** an accountant,
**I want to** view all outstanding import payables by supplier,
**So that** I can plan cash flow and prioritize payments.

**Acceptance Criteria:**
- [ ] Same structure as receivables but for suppliers
- [ ] Table: supplier, invoice no, date, amount, currency, due date, days overdue
- [ ] Age buckets, filters, summary, export

**Story Points:** 2

---

### E7-S7: Party Ledger

**As** an accountant,
**I want to** view the complete transaction history with a party,
**So that** I can see invoices, payments, advances, and running balance.

**Acceptance Criteria:**
- [ ] Select party → view chronological ledger
- [ ] Entries: invoices (debit), payments (credit), advances, adjustments
- [ ] Running balance column
- [ ] Opening balance (for migrated data)
- [ ] Filter by date range
- [ ] Closing balance
- [ ] Export to PDF/Excel

**Story Points:** 3

---

### E7-S8: Bank Statement Import

**As** an accountant,
**I want to** import bank statements to reconcile with recorded transactions,
**So that** my books match the bank records.

**Acceptance Criteria:**
- [ ] Upload CSV/Excel bank statement
- [ ] Column mapping (date, description, debit, credit, balance)
- [ ] Preview parsed transactions
- [ ] Support for common Indian bank formats (SBI, HDFC, ICICI, Axis)

**Story Points:** 3

---

### E7-S9: Bank Reconciliation

**As** an accountant,
**I want to** match bank statement entries with recorded payments,
**So that** I can identify discrepancies and unreconciled transactions.

**Acceptance Criteria:**
- [ ] Auto-match: by amount + date proximity + reference number
- [ ] Manual match: drag-and-drop or select to match
- [ ] Matched, unmatched-in-bank (not in our records), unmatched-in-books (not in bank)
- [ ] Reconciliation summary: matched count, unmatched count, difference
- [ ] Save reconciliation as of a date
- [ ] History of past reconciliations

**Story Points:** 5

---

### E7-S10: Currency Gain/Loss Calculation

**As** an accountant,
**I want to** see the realized exchange gain or loss on each payment,
**So that** I can account for forex impact accurately.

**Acceptance Criteria:**
- [ ] Invoice rate vs payment rate comparison
- [ ] Gain/loss per payment = (payment rate - invoice rate) x foreign currency amount
- [ ] Summary report: total forex gain/loss for period
- [ ] Unrealized gain/loss on outstanding invoices (at current rate)
- [ ] Report: by party, by currency, by period

**Story Points:** 3

---

### E7-S11: Payment Dashboard

**As** an accountant,
**I want to** see a payment summary dashboard,
**So that** I have a quick overview of cash flow status.

**Acceptance Criteria:**
- [ ] KPIs: total receivables, total payables, net position
- [ ] Collections this month vs last month
- [ ] Payments this month vs last month
- [ ] Overdue receivables total
- [ ] Upcoming payments (next 7 days, 30 days)
- [ ] Top 5 overdue buyers

**Story Points:** 3

---

### E7-S12: Payment Export to Tally Format

**As** an accountant,
**I want to** export payment data in Tally-compatible format,
**So that** I can import into my accounting software.

**Acceptance Criteria:**
- [ ] Export payments for date range as XML (Tally format)
- [ ] Includes: voucher type, party name, amount, narration
- [ ] Ledger name mapping (EXIM ledger → Tally ledger)
- [ ] Preview before export

**Story Points:** 3

---

## Total Story Points: 45
