# EXIM — Actors & Personas

**Version:** 1.0
**Date:** February 2026

---

## Table of Contents

1. [Actor Model Overview](#1-actor-model-overview)
2. [Platform-Level Actors](#2-platform-level-actors)
3. [Tenant-Level Actors](#3-tenant-level-actors)
4. [External Actors](#4-external-actors)
5. [System Actors](#5-system-actors)
6. [Actor-Module Access Matrix](#6-actor-module-access-matrix)

---

## 1. Actor Model Overview

Actors are organized in three tiers:

```
Platform Level          Tenant Level                External
─────────────          ────────────                ────────
Super Admin             Business Owner/Admin        CHA / Freight Forwarder
                        Accountant                  Buyer (view-only portal)
                        Export Manager               Supplier (view-only portal)
                        Import Manager
                        Sales Manager
                        Purchase Manager
                        Inventory Manager
                        Data Entry Operator
                        Viewer / Auditor
```

---

## 2. Platform-Level Actors

### A1: Super Admin

**Who:** EXIM platform operations team. Internal employees managing the SaaS infrastructure.

**Persona:**
- **Name:** Rahul (Platform Ops Lead)
- **Context:** Manages 200+ tenant accounts. Handles onboarding, billing disputes, and system health. Needs a god-view across all tenants without accessing individual business data unless escalated.

**Goals:**
- Onboard new tenant organizations
- Monitor platform health, uptime, and usage
- Manage subscription billing and plan limits
- Resolve support escalations
- Deploy platform updates

**Pain Points:**
- Tenant data isolation must be absolute — no cross-tenant leaks
- Needs quick access to tenant metadata without exposing financials
- Billing disputes require audit trail of plan changes

**Key Workflows:**
1. Tenant provisioning → configure plan → activate
2. Monitor usage dashboards → identify heavy users → upsell
3. Support ticket → impersonate tenant (read-only) → resolve

---

## 3. Tenant-Level Actors

### A2: Business Owner / Admin

**Who:** Owner or director of the export-import firm. Has full control over the organization's EXIM account.

**Persona:**
- **Name:** Priya Mehta
- **Company:** Mehta International (textile exporter, 25 employees)
- **Context:** Manages a growing export business. Needs oversight of all operations — from quotations to payment realization. Delegates day-to-day work but reviews financials and compliance herself.

**Goals:**
- Complete visibility into business operations
- Manage team access and permissions
- Ensure GST and customs compliance
- Track outstanding receivables and payables
- Configure business settings (branches, bank accounts, numbering)

**Pain Points:**
- Scattered documents across email, WhatsApp, and spreadsheets
- No single view of which shipments are pending payment
- Compliance deadlines (LUT renewal, GSTR filing) are easy to miss

**Key Workflows:**
1. Morning check → Dashboard KPIs → outstanding alerts
2. Add new team member → assign role → set module permissions
3. Review monthly P&L → export vs import breakdown
4. Configure new branch → add GSTIN → set numbering series

---

### A3: Accountant / Finance Manager

**Who:** In-house accountant or outsourced CA firm managing the financial side of trade operations.

**Persona:**
- **Name:** Suresh Agarwal (CA)
- **Context:** Handles books for 3 export-import clients. Needs to reconcile bank statements, track GST credits from imports, file returns, and ensure BRC compliance for exports. Works across multiple tenant accounts.

**Goals:**
- Record and reconcile payments (foreign currency inflows/outflows)
- Track IGST credits from import duties
- Generate GST returns data (GSTR-1, GSTR-3B)
- Manage bank reconciliation
- Produce financial reports (P&L, balance sheet, aging reports)

**Pain Points:**
- Matching bank receipts to specific invoices and shipping bills is tedious
- IGST credit from Bill of Entry doesn't auto-reconcile with GSTR-3B
- Currency gain/loss calculations on foreign payments are manual

**Key Workflows:**
1. Import bank statement → auto-match transactions → flag unmatched
2. Bill of Entry filed → duty paid → track IGST credit → claim in 3B
3. Month-end → GSTR-1 data from export invoices → file
4. Payment received → match to invoice → update outstanding → generate BRC

---

### A4: Export Manager

**Who:** Manages the end-to-end export documentation and shipment process.

**Persona:**
- **Name:** Anil Kumar
- **Context:** Handles 15-20 export shipments per month. Coordinates with buyers, CHAs, shipping lines, and the finance team. Needs to ensure documents are correct before customs filing — a single error means shipment delays.

**Goals:**
- Create and manage export documents (PI → CI → PL → SB)
- Coordinate with CHA for customs clearance
- Track shipments from factory to destination
- Ensure BRC is received for every shipment
- Claim duty drawback and export incentives

**Pain Points:**
- Document chain is fragile — PI number must carry through to SB and BRC
- CHA updates come via WhatsApp, hard to track formally
- Duty drawback claims require matching SB with BRC, often delayed

**Key Workflows:**
1. Buyer PO received → create PI → convert to CI + PL
2. CI + PL ready → share with CHA → CHA files SB
3. SB assessed → LEO issued → goods move to port → B/L received
4. Document set to bank (if LC) or buyer → track payment
5. Payment received → obtain BRC → claim drawback

---

### A5: Import Manager

**Who:** Manages import procurement, customs clearance, and landed cost tracking.

**Persona:**
- **Name:** Fatima Sheikh
- **Context:** Procures raw materials from 8 countries. Needs to track landed cost accurately (CIF + duties + charges) to price finished goods correctly. A miscalculated duty means margin erosion.

**Goals:**
- Create and track purchase orders to foreign suppliers
- Manage import documentation (supplier invoice, BoE, B/L)
- Calculate accurate landed costs
- Track customs clearance status
- Ensure IGST credits are claimed

**Pain Points:**
- Landed cost is complex — CIF value + BCD + SWS + IGST + port charges + CHA fees
- HS code classification errors lead to wrong duty rates
- Demurrage charges pile up if clearance is delayed
- IGST paid on BoE doesn't auto-reflect in GST returns

**Key Workflows:**
1. Issue PO to supplier → supplier ships → receive documents
2. Documents to CHA → CHA files BoE → duty assessed → pay duty
3. Out of Charge → delivery order → goods to warehouse → stock entry
4. Calculate per-unit landed cost → update inventory valuation
5. Month-end → reconcile BoE IGST with GSTR-3B

---

### A6: Sales Manager

**Who:** Handles pre-shipment sales activities — quotations, order management, customer relationships.

**Persona:**
- **Name:** Vikram Singh
- **Context:** Manages relationships with 50+ international buyers. Sends 30 quotations per month, converts ~40% to orders. Needs quick turnaround on proforma invoices with accurate pricing.

**Goals:**
- Create and send quotations / proforma invoices quickly
- Track order pipeline (quoted → ordered → shipped → paid)
- Manage customer database and communication history
- Follow up on pending payments

**Pain Points:**
- Calculating CIF price from FOB requires freight and insurance estimates
- Buyers request multiple revisions — version tracking is manual
- No single view of conversion rate from PI to actual shipment

**Key Workflows:**
1. Buyer inquiry → create PI with pricing → email/WhatsApp to buyer
2. Buyer confirms → link PO to PI → hand off to Export Manager
3. Weekly pipeline review → follow up on pending PIs
4. Monthly sales report → buyer-wise, country-wise breakdown

---

### A7: Purchase Manager

**Who:** Handles procurement — vendor management, purchase orders, cost negotiation.

**Persona:**
- **Name:** Deepak Patel
- **Context:** Sources materials from China, Vietnam, and Turkey. Needs to compare landed costs across suppliers (same product, different origin countries = different duties).

**Goals:**
- Create and manage purchase orders
- Compare supplier pricing including landed costs
- Track PO fulfillment and delivery timelines
- Manage vendor database

**Pain Points:**
- Same HS code attracts different BCD rates under different trade agreements
- Supplier invoices arrive in different formats (PDF, scanned, email)
- No easy way to compare total landed cost across 3 suppliers for the same item

**Key Workflows:**
1. Need identified → request quotes from 3 suppliers → landed cost comparison
2. Select supplier → issue PO → track shipment
3. Supplier invoice received → match against PO → hand off to Import Manager
4. Monthly procurement report → supplier-wise spending

---

### A8: Inventory Manager

**Who:** Manages stock, warehouse operations, and inventory valuation.

**Persona:**
- **Name:** Rajesh Nair
- **Context:** Manages 2 warehouses with 500+ SKUs. Imported goods need landed-cost-based valuation. Needs to track batch/lot for perishable items.

**Goals:**
- Maintain accurate stock levels
- Track goods receipt from imports
- Manage warehouse transfers
- Generate stock reports and alerts

**Pain Points:**
- Inventory valuation must use landed cost, not just invoice price
- Batch tracking for imported chemicals requires expiry date management
- Low stock alerts need to factor in lead time from overseas suppliers

**Key Workflows:**
1. Import cleared → goods received → stock in with landed cost
2. Production request → stock out → update inventory
3. Low stock alert → trigger PO to supplier
4. Month-end → stock valuation report (FIFO / weighted average)

---

### A9: Data Entry Operator

**Who:** Junior staff handling day-to-day transaction entry.

**Persona:**
- **Name:** Sneha Sharma
- **Context:** Enters 20-30 invoices and bills daily from physical documents. Needs a fast, form-based interface with minimal navigation. Cannot approve or delete — only create and edit drafts.

**Goals:**
- Enter invoices, bills, and basic master data quickly
- Minimize errors with auto-fill and validation
- Save drafts for manager review

**Pain Points:**
- Repetitive data entry across similar documents
- No auto-populate from previous similar transactions
- Needs clear feedback when a required field is missing

**Key Workflows:**
1. Physical invoice → enter in system → save as draft
2. Manager reviews → requests correction → edit and resubmit
3. Bulk entry from Excel/CSV upload

---

### A10: Viewer / Auditor

**Who:** External auditor, tax consultant, or internal compliance officer with read-only access.

**Persona:**
- **Name:** CA Anjali Desai (External Auditor)
- **Context:** Conducts quarterly compliance audits. Needs to view all documents, download reports, and verify GST reconciliation — but must never modify data.

**Goals:**
- View all documents across modules
- Download/export reports for offline analysis
- Verify compliance (GST, customs, FEMA)
- Audit trail of all modifications

**Pain Points:**
- Needs filtered views (date range, document type, party) for efficient audit
- Export to Excel is essential for offline working papers
- Audit trail must show who changed what and when

**Key Workflows:**
1. Login → filter documents by quarter → review shipping bills vs GSTR-1
2. Export aging report → verify outstanding receivables
3. Check audit trail for amended documents

---

## 4. External Actors

### A11: CHA / Freight Forwarder

**Who:** Licensed customs house agent or freight forwarding company. External to the tenant's organization but collaborates closely.

**Persona:**
- **Name:** Sanjay Logistics Pvt Ltd
- **Context:** Services 40+ exporter/importer clients. Files shipping bills and bills of entry on ICEGATE. Needs a portal to receive documents from clients, update clearance status, and submit their service bills.

**Goals:**
- Receive export/import documents from clients
- Update customs filing status (SB number, BoE number, LEO, OOC)
- Upload clearance documents
- Submit freight/CHA charges for the shipment

**Pain Points:**
- Currently receives documents via email/WhatsApp — no single source of truth
- Status updates are communicated via phone calls — not tracked
- Invoicing for services is separate from the shipment workflow

**Key Workflows:**
1. Client shares documents → CHA downloads → files on ICEGATE
2. Customs assessment done → CHA updates SB/BoE status in EXIM
3. Clearance complete → upload LEO/OOC → submit CHA charges
4. Client views real-time clearance status

---

### A12: Buyer (View-Only Portal) — Future

**Who:** International buyer of the exporter's goods. Given limited portal access to track their orders.

**Persona:**
- **Name:** John Miller (Global Traders LLC, USA)
- **Context:** Places 4-5 orders per quarter. Wants to see order status, download invoices, and track shipments without calling the supplier.

**Goals:**
- View order status and shipment tracking
- Download invoices and packing lists
- Track payment obligations

---

### A13: Supplier (View-Only Portal) — Future

**Who:** Foreign supplier providing goods to the importer. Limited portal access.

**Persona:**
- **Name:** Wei Chen (Shanghai Exports Co.)
- **Context:** Supplies raw materials. Wants to see PO status, confirm shipment dates, and share documents.

**Goals:**
- View and acknowledge purchase orders
- Upload shipping documents (invoice, B/L, CoO)
- Track payment status

---

## 5. System Actors

These are non-human actors that trigger automated actions:

### S1: Scheduler (Cron Jobs)

**Triggers:**
- Daily exchange rate sync
- LUT expiry alerts (30 days before)
- Certificate expiry alerts
- Payment overdue reminders
- Subscription renewal reminders

### S2: Notification Engine

**Actions:**
- Email dispatch (payment reminders, shipment alerts)
- SMS notifications (OTP, critical alerts)
- WhatsApp messages (document sharing, status updates)
- In-app notifications (real-time updates)

### S3: Integration Engine

**Actions:**
- ICEGATE data sync (shipping bill/BoE status)
- GST portal data fetch (GSTR-2A)
- Shipping line container tracking
- Bank statement import

---

## 6. Actor-Module Access Matrix

| Module | A2 Admin | A3 Accountant | A4 Export Mgr | A5 Import Mgr | A6 Sales | A7 Purchase | A8 Inventory | A9 Data Entry | A10 Auditor | A11 CHA |
|---|---|---|---|---|---|---|---|---|---|---|
| **Dashboard** | Full | Finance KPIs | Export KPIs | Import KPIs | Sales KPIs | Purchase KPIs | Stock KPIs | — | View | — |
| **Master Data** | Full | View | View | View | Customers | Vendors | Products | Create/Edit | View | — |
| **Export Docs** | Full | View + Finance | Full | — | Create PI | — | — | Create/Edit | View | Assigned only |
| **Import Docs** | Full | View + Finance | — | Full | — | Create PO | — | Create/Edit | View | Assigned only |
| **LC Management** | Full | Full | View own | View own | — | — | — | — | View | — |
| **Payments** | Full | Full | View export | View import | View own | View own | — | — | View | — |
| **GST & Compliance** | Full | Full | View export | View import | — | — | — | — | View | — |
| **Inventory** | Full | View | — | — | — | — | Full | Create/Edit | View | — |
| **Shipping** | Full | View | Full | Full | — | — | — | — | View | Assigned |
| **Reports** | Full | Financial | Export | Import | Sales | Purchase | Inventory | — | View all | — |
| **Settings** | Full | — | — | — | — | — | — | — | — | — |
| **Users** | Full | — | — | — | — | — | — | — | — | — |

**Legend:** Full = CRUD + Approve/Delete | View = Read-only | Create/Edit = No delete/approve | — = No access | Assigned = Only shipments assigned to them

---

**Document Version:** 1.0
**Last Updated:** February 2026
