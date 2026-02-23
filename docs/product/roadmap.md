# EXIM — Product Roadmap

**Version:** 1.0
**Date:** February 2026

---

## Sprint Plans

| Sprint | Goal | Stories | File |
|---|---|---|---|
| Sprint 1 | Auth, Tenant, App Shell | E1-S1, E1-S2, E1-S8, E2-S1–S7, E2-S10 | [Sprint 1](sprints/sprint-01.md) |
| Sprint 2 | Master Data (Parties, Products, Ports, Currencies) | E3-S1–S14 | [Sprint 2](sprints/sprint-02.md) |
| Sprint 3 | Export Documents (PI, CI, PL, SB) + Reference Browser | E4-S1–S9 | [Sprint 3](sprints/sprint-03.md) |
| Sprint 4 | Export Completion (B/L, Insurance, BRC, Register) + PDF Templates | E4-S10, E4-S11, E4-S13, E4-S14, E4-S16, E4-S18, E11-S1–S3 | [Sprint 4](sprints/sprint-04.md) |
| Sprint 5 | Unit Test Suite — Sprints 1–4 debt (Jest infra + 21 spec files, 270 tests, 90% coverage) | Backlog #15 | [Sprint 5](sprints/sprint-05.md) |
| Sprint 6 | Import Documentation — full E5 (all 14 stories) + backend & frontend unit tests | E5-S1–S14 | [Sprint 6](sprints/sprint-06.md) |
| Sprint 7 | Payments & Banking | E7-S1–S12 | Planned |
| Sprint 8 | GST & Compliance + LC Management | E8-S1–S10, E6-S1–S5 | Planned |
| Sprint 9 | Reports, Analytics, Dashboards | E10-S1–S8 | Planned |
| Sprint 10 | Shipping, CHA Portal, Communication | E9-S1–S10, E12-S1–S5 | Planned |
| Sprint 11 | Polish — Notifications, Bulk Operations, Advanced Reports | E12-S6–S10, E10-S9–S12, E11-S6–S8 | Planned |

---

## Delivery Phases

The product is delivered in 4 phases, each building on the previous. Each phase delivers a usable, deployable increment.

---

## Phase 1: Foundation (MVP)

**Goal:** A working platform where a single exporter can create invoices, manage parties, and generate PDFs.
**Duration:** 8-10 weeks
**Target users:** Business Owner, Export Manager, Data Entry Operator

### Epics

| # | Epic | Stories | Priority |
|---|---|---|---|
| E1 | [Platform & Tenant Management](epics/E01-platform-tenant-management.md) | 8 | P0 |
| E2 | [User Management & RBAC](epics/E02-user-management-rbac.md) | 10 | P0 |
| E3 | [Master Data Management](epics/E03-master-data.md) | 14 | P0 |
| E4 | [Export Documentation](epics/E04-export-documentation.md) | 18 | P0 |
| E11 | [Document Templates & Generation](epics/E11-document-templates.md) | 8 | P0 |

### Phase 1 Outcomes
- Tenant can sign up, configure business profile, invite users
- Party master (buyers/suppliers) and product master (with HS codes) operational
- Full export document chain: PI → CI → PL → SB (manual filing)
- PDF generation for invoices and packing lists
- Basic RBAC (Admin, Export Manager, Data Entry, Viewer)

---

## Phase 2: Full Trade Cycle

**Goal:** Complete import workflow, payments, LC management, and GST compliance.
**Duration:** 8-10 weeks
**Target users:** Import Manager, Accountant, Purchase Manager, Sales Manager

### Epics

| # | Epic | Stories | Priority |
|---|---|---|---|
| E5 | [Import Documentation](epics/E05-import-documentation.md) | 14 | P0 |
| E6 | [Letter of Credit & Trade Finance](epics/E06-letter-of-credit.md) | 10 | P1 |
| E7 | [Payments & Banking](epics/E07-payments-banking.md) | 12 | P0 |
| E8 | [GST & Compliance](epics/E08-gst-compliance.md) | 10 | P0 |

### Phase 2 Outcomes
- Full import document chain: PO → Supplier Invoice → BoE
- Landed cost calculator operational
- LC lifecycle management (open → document submission → payment)
- Payment recording with multi-currency, bank reconciliation
- GST compliance: LUT management, GSTR-1 export data, IGST credit tracking

---

## Phase 3: Collaboration & Intelligence

**Goal:** External user portals, shipping logistics, analytics dashboards, and communication tools.
**Duration:** 6-8 weeks
**Target users:** CHA/Freight Forwarder, Inventory Manager, all internal users

### Epics

| # | Epic | Stories | Priority |
|---|---|---|---|
| E9 | [Shipping & Logistics](epics/E09-shipping-logistics.md) | 10 | P1 |
| E10 | [Reports & Analytics](epics/E10-reports-analytics.md) | 12 | P1 |
| E12 | [Communication & Notifications](epics/E12-communication-notifications.md) | 10 | P1 |

### Phase 3 Outcomes
- CHA portal for customs clearance collaboration
- Container tracking and demurrage management
- Analytics dashboard with KPIs, trends, and drill-downs
- Email/WhatsApp/SMS integration for payment reminders and shipment alerts
- Inventory management with landed-cost valuation

---

## Phase 4: Scale & Integrate

**Goal:** Government portal integrations, mobile app, and enterprise features.
**Duration:** 10-12 weeks
**Target users:** All actors

### Planned Work
- ICEGATE API integration (electronic SB/BoE filing)
- GST portal integration (GSTR filing, e-invoice)
- DGFT portal integration (IEC verification, MEIS/RoDTEP)
- Shipping line APIs (container tracking, vessel schedules)
- Mobile application (React Native)
- Buyer/Supplier portal (view-only)
- Advanced features: OCR for supplier invoices, AI-powered HS code suggestions

---

## Story Point Budget (Estimated)

| Phase | Epics | Stories | Est. Story Points |
|---|---|---|---|
| Phase 1 | 5 | ~58 | ~180 |
| Phase 2 | 4 | ~46 | ~150 |
| Phase 3 | 3 | ~32 | ~100 |
| Phase 4 | — | — | ~200 |
| **Total** | **12** | **~136** | **~630** |

---

## Priority Definitions

| Priority | Meaning |
|---|---|
| **P0** | Must have — product is unusable without it |
| **P1** | Should have — significant business value, plan for current phase |
| **P2** | Nice to have — defer if timeline is tight |
| **P3** | Future — backlog for later phases |

---

## Epic Index

| ID | Epic | Phase | Priority | File |
|---|---|---|---|---|
| E1 | Platform & Tenant Management | 1 | P0 | [E01](epics/E01-platform-tenant-management.md) |
| E2 | User Management & RBAC | 1 | P0 | [E02](epics/E02-user-management-rbac.md) |
| E3 | Master Data Management | 1 | P0 | [E03](epics/E03-master-data.md) |
| E4 | Export Documentation | 1 | P0 | [E04](epics/E04-export-documentation.md) |
| E5 | Import Documentation | 2 | P0 | [E05](epics/E05-import-documentation.md) |
| E6 | Letter of Credit & Trade Finance | 2 | P1 | [E06](epics/E06-letter-of-credit.md) |
| E7 | Payments & Banking | 2 | P0 | [E07](epics/E07-payments-banking.md) |
| E8 | GST & Compliance | 2 | P0 | [E08](epics/E08-gst-compliance.md) |
| E9 | Shipping & Logistics | 3 | P1 | [E09](epics/E09-shipping-logistics.md) |
| E10 | Reports & Analytics | 3 | P1 | [E10](epics/E10-reports-analytics.md) |
| E11 | Document Templates & Generation | 1 | P0 | [E11](epics/E11-document-templates.md) |
| E12 | Communication & Notifications | 3 | P1 | [E12](epics/E12-communication-notifications.md) |

---

**Document Version:** 1.1
**Last Updated:** February 2026
