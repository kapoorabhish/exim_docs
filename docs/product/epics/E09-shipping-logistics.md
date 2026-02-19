# E9: Shipping & Logistics

**Phase:** 3 (Collaboration & Intelligence)
**Priority:** P1
**Primary Actors:** A4 Export Manager, A5 Import Manager, A11 CHA/Freight Forwarder
**Dependencies:** E4 (Export Docs), E5 (Import Docs)

---

## Epic Summary

Shipping line management, container tracking, CHA collaboration portal, and freight booking. Bridges the gap between document preparation and physical cargo movement.

---

## User Stories

### E9-S1: Freight Forwarder / Shipping Line Master

**As** an export manager,
**I want to** maintain a directory of freight forwarders and shipping lines,
**So that** I can quickly assign them to shipments.

**Acceptance Criteria:**
- [ ] Fields: company name, type (shipping line / freight forwarder / airline), contact person, phone, email
- [ ] Service routes (origin → destination ports)
- [ ] Rate cards (optional, for reference)
- [ ] Active/inactive toggle

**Story Points:** 2

---

### E9-S2: Container Management

**As** an export manager,
**I want to** record container details for each shipment,
**So that** I can track containers and plan loading.

**Acceptance Criteria:**
- [ ] Container number, size (20'/40'/40'HC), type (dry/reefer/open-top)
- [ ] Seal number
- [ ] Loading type: FCL / LCL
- [ ] Tare weight, max payload
- [ ] Link to shipment/invoice
- [ ] Multiple containers per shipment
- [ ] Stuffing details: which products in which container

**Story Points:** 3

---

### E9-S3: Container Tracking

**As** an import manager,
**I want to** track the real-time status of containers,
**So that** I can plan clearance and warehouse receipt.

**Acceptance Criteria:**
- [ ] Manual status updates: Loaded → In Transit → Arrived at Port → Under Clearance → Delivered
- [ ] Vessel name, voyage, ETA
- [ ] Status history with timestamps
- [ ] Future: API integration with major shipping lines (Maersk, MSC, CMA CGM)
- [ ] Dashboard: containers in transit, arriving this week

**Story Points:** 5

---

### E9-S4: CHA Portal — Document Sharing

**As** a CHA,
**I want to** receive export/import documents from my clients through a portal,
**So that** I can file customs documents without email back-and-forth.

**Acceptance Criteria:**
- [ ] CHA user account (A11 role) with limited access
- [ ] CHA sees only shipments assigned to them
- [ ] Documents available: CI, PL, SB data, BoE data
- [ ] Download documents as PDF
- [ ] Upload signed/stamped documents back

**Story Points:** 5

---

### E9-S5: CHA Portal — Status Updates

**As** a CHA,
**I want to** update the customs clearance status in the client's EXIM system,
**So that** the client has real-time visibility without calling me.

**Acceptance Criteria:**
- [ ] Update SB status: Filed (with SB number) → Assessed → LEO
- [ ] Update BoE status: Filed (with BoE number) → Assessed → Duty Paid → OOC
- [ ] Add notes/comments on each update
- [ ] Upload documents (LEO copy, OOC copy, assessment order)
- [ ] Client receives notification on each status change

**Story Points:** 3

---

### E9-S6: CHA Charges / Expense Recording

**As** a CHA,
**I want to** submit my service charges for a shipment,
**So that** the client can process my payment.

**Acceptance Criteria:**
- [ ] Expense items: CHA fee, customs exam charges, port charges, transportation, documentation charges
- [ ] Per-item: description, amount (INR), supporting document upload
- [ ] Total charges per shipment
- [ ] Status: Submitted → Under Review → Approved → Paid
- [ ] Client (Admin/Accountant) approves or queries charges

**Story Points:** 3

---

### E9-S7: Shipment Timeline View

**As** an export manager,
**I want to** see a visual timeline of each shipment's journey,
**So that** I can track progress at a glance.

**Acceptance Criteria:**
- [ ] Timeline milestones: Order → Documents Ready → Customs Filed → Cleared → Loaded → In Transit → Arrived → Delivered
- [ ] Each milestone: date (actual or expected), status (done/pending/delayed)
- [ ] Delayed milestones highlighted
- [ ] Compact view on shipment detail page

**Story Points:** 3

---

### E9-S8: Freight Rate Comparison

**As** a purchase manager,
**I want to** compare freight rates from multiple forwarders,
**So that** I can choose the most cost-effective option.

**Acceptance Criteria:**
- [ ] Request quotes: origin port, destination port, container type, weight/volume
- [ ] Enter rates from multiple forwarders
- [ ] Side-by-side comparison: rate, transit time, routing
- [ ] Select and link to shipment

**Story Points:** 3

---

### E9-S9: Vessel Schedule Reference

**As** an export manager,
**I want to** view vessel schedules for my regular routes,
**So that** I can plan shipment dates.

**Acceptance Criteria:**
- [ ] Manual entry: vessel name, voyage, shipping line, departure date, ETA, route
- [ ] Search by: origin port, destination port, date range
- [ ] Future: API integration with shipping lines for auto-fetch

**Story Points:** 2

---

### E9-S10: Shipment Register

**As** an export manager,
**I want to** view a consolidated register of all shipments,
**So that** I can see the big picture of logistics activity.

**Acceptance Criteria:**
- [ ] Table: shipment ref, type (export/import), party, origin port, destination port, vessel, container, status, ETA
- [ ] Filter by: type, status, date range, party, port
- [ ] Export to Excel

**Story Points:** 2

---

## Total Story Points: 31
