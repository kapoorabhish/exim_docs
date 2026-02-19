# E10: Reports & Analytics

**Phase:** 3 (Collaboration & Intelligence)
**Priority:** P1
**Primary Actors:** A2 Admin, A3 Accountant, A4 Export Manager, A5 Import Manager, A10 Auditor
**Dependencies:** E4, E5, E7, E8 (data from all operational modules)

---

## Epic Summary

Comprehensive reporting and analytics — export/import registers, financial reports, compliance reports, and an interactive dashboard with KPIs, trends, and drill-downs.

---

## User Stories

### E10-S1: Analytics Dashboard

**As** a business owner,
**I want to** see key business metrics on a dashboard,
**So that** I can make informed decisions at a glance.

**Acceptance Criteria:**
- [ ] KPI cards: Total Export Value (MTD/YTD), Total Import Value, Outstanding Receivables, Outstanding Payables, Shipments in Transit, Pending Documents
- [ ] Monthly trend chart: export vs import values (12 months)
- [ ] Country-wise distribution: pie chart for top 10 countries
- [ ] Product category-wise: bar chart
- [ ] Recent activity feed (last 10 document actions)
- [ ] Date range selector (MTD, QTD, YTD, custom)
- [ ] Dashboard loads in under 2 seconds

**Story Points:** 8

---

### E10-S2: Export Reports Suite

**As** an export manager,
**I want to** generate various export reports,
**So that** I can analyze export performance and track pending items.

**Reports included:**
- [ ] Export Register (all shipments — master report)
- [ ] Country-wise Export Report
- [ ] Buyer-wise Export Report
- [ ] Product-wise Export Report
- [ ] Port-wise Export Report
- [ ] Month-wise Export Trends

**Acceptance Criteria (per report):**
- [ ] Filter by: date range, buyer, country, product, status
- [ ] Sort by any column
- [ ] Summary row with totals
- [ ] Export to Excel and PDF
- [ ] Save filter as "Saved View" for quick access

**Story Points:** 5

---

### E10-S3: Import Reports Suite

**As** an import manager,
**I want to** generate import analysis reports,
**So that** I can track procurement spending and supplier performance.

**Reports included:**
- [ ] Import Register (all imports)
- [ ] Country-wise Import Report
- [ ] Supplier-wise Import Report
- [ ] Product-wise Import Report
- [ ] Month-wise Import Trends
- [ ] Duty Payment Report

**Acceptance Criteria:** Same as E10-S2 structure.

**Story Points:** 5

---

### E10-S4: Financial Reports

**As** an accountant,
**I want to** generate financial reports from EXIM data,
**So that** I can monitor financial health and support audit.

**Reports included:**
- [ ] Receivables Aging Report (0-30, 31-60, 61-90, 90+ days)
- [ ] Payables Aging Report
- [ ] Currency Gain/Loss Report
- [ ] Bank Book (bank account-wise transactions)
- [ ] Cash Flow Summary (inflows vs outflows by month)
- [ ] Party-wise Outstanding Summary

**Acceptance Criteria:**
- [ ] Date range, party, currency filters
- [ ] Drill-down: click a row to see underlying transactions
- [ ] Export to Excel and PDF

**Story Points:** 5

---

### E10-S5: Compliance Reports

**As** an accountant,
**I want to** generate compliance-focused reports,
**So that** I can ensure regulatory requirements are met.

**Reports included:**
- [ ] Shipping Bill vs GSTR-1 Reconciliation
- [ ] Bill of Entry vs GSTR-3B Reconciliation
- [ ] LUT Status Report
- [ ] BRC Pending Report (SBs without BRC)
- [ ] Certificate Expiry Report
- [ ] IEC / GSTIN Status Report

**Acceptance Criteria:**
- [ ] Mismatch highlighting for reconciliation reports
- [ ] Export to Excel
- [ ] Action buttons: "Resolve" on mismatch items

**Story Points:** 5

---

### E10-S6: Pending Items Dashboard

**As** a business owner,
**I want to** see all pending/actionable items across modules,
**So that** nothing falls through the cracks.

**Acceptance Criteria:**
- [ ] Pending SBs (not yet LEO)
- [ ] Pending BoEs (not yet OOC)
- [ ] Pending BRCs (shipped but no payment)
- [ ] Overdue receivables (past due date)
- [ ] LCs expiring this month
- [ ] Certificates expiring this month
- [ ] Each item clickable (navigate to detail)
- [ ] Count badges on sidebar navigation

**Story Points:** 5

---

### E10-S7: Custom Report Builder

**As** a business owner,
**I want to** build simple custom reports by selecting columns and filters,
**So that** I can get specific data views without developer help.

**Acceptance Criteria:**
- [ ] Select data source: Export Invoices, Import Invoices, Payments, etc.
- [ ] Pick columns from available fields
- [ ] Add filters (equals, contains, date range, number range)
- [ ] Group by a field (e.g., group by country)
- [ ] Sort order
- [ ] Save report as named template
- [ ] Export to Excel

**Story Points:** 8

---

### E10-S8: Top Buyers / Suppliers Analysis

**As** a business owner,
**I want to** see my top buyers and suppliers ranked by value,
**So that** I can focus on key relationships.

**Acceptance Criteria:**
- [ ] Top 10 buyers by export value (YTD)
- [ ] Top 10 suppliers by import value (YTD)
- [ ] Trend comparison: this year vs last year
- [ ] Bar chart + table view
- [ ] Click buyer/supplier to see their transaction history

**Story Points:** 3

---

### E10-S9: Shipment Turnaround Analysis

**As** a business owner,
**I want to** analyze the average time for each stage of the trade cycle,
**So that** I can identify bottlenecks and improve efficiency.

**Acceptance Criteria:**
- [ ] Average days: PI to CI, CI to SB filing, SB to LEO, LEO to shipment, shipment to payment
- [ ] Import: PO to arrival, arrival to OOC, OOC to warehouse
- [ ] Trend over months
- [ ] Benchmark against own historical average
- [ ] Filter by buyer/supplier, country

**Story Points:** 5

---

### E10-S10: Report Scheduling

**As** an accountant,
**I want to** schedule reports to be emailed automatically,
**So that** stakeholders receive reports without manual effort.

**Acceptance Criteria:**
- [ ] Select saved report → schedule (daily, weekly, monthly)
- [ ] Recipients: email addresses
- [ ] Format: Excel or PDF
- [ ] Delivery time configuration
- [ ] Enable/disable schedule
- [ ] Last delivery status visible

**Story Points:** 3

---

### E10-S11: Data Export — Bulk Download

**As** an auditor,
**I want to** bulk download all documents and data for a date range,
**So that** I can perform offline audit.

**Acceptance Criteria:**
- [ ] Select module, date range, document types
- [ ] Generate zip file with all matching PDFs
- [ ] Include Excel summary sheet
- [ ] Background job (notify when ready)
- [ ] Download link valid for 24 hours

**Story Points:** 3

---

### E10-S12: Role-Based Report Access

**As** a system,
**I want to** restrict report access based on user roles,
**So that** users only see reports relevant to their function.

**Acceptance Criteria:**
- [ ] Export Manager: export reports only
- [ ] Import Manager: import reports only
- [ ] Accountant: financial + compliance reports
- [ ] Admin: all reports
- [ ] Viewer/Auditor: all reports (read-only)
- [ ] Sales: sales pipeline reports
- [ ] Enforced at API level

**Story Points:** 2

---

## Total Story Points: 57
