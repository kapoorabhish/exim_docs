# Domain Expert Review — EXIM Platform

**Date:** February 2026
**Role:** Domain Expert — Indian Export-Import Trade Operations
**Status:** Open — pending resolution before Sprint 2

---

## What's Accurate and Well-Conceived

- Document chain (PI → PO → CI → PL → SB → B/L → BRC) correctly reflects real export workflow
- BoE duty formula is accurate: `AV + BCD + SWS (10% of BCD) → Value for IGST → IGST = Value × Rate%`
- LUT management (ARN, annual validity, 30-day alert) is correctly specified in E8-S1
- SB types (Free, Drawback, EPCG) are real and correctly named
- Incoterm-driven freight/insurance fields on CI are correctly understood
- BRC linked to FEMA payment realization is correctly scoped
- GSTR-1 Table 6A correctly identified for export returns
- 8-digit ITC-HS code (India-specific) is correctly mentioned
- Multi-currency with en-IN locale (lakh/crore formatting) is appropriate for Indian users
- Social Welfare Surcharge at 10% of BCD is correctly captured

---

## Critical Errors to Fix

### 1. DEPB Shipping Bill Type Is Obsolete

**DEPB (Duty Entitlement Passbook Scheme) was discontinued in September 2011.**

The current SB types listed include DEPB — this is wrong and will confuse users.

**Correct current Shipping Bill types:**
```
Free Shipping Bill    → No export incentive claim
Drawback Shipping Bill → Claiming duty drawback (AIR or Brand Rate)
EPCG Shipping Bill    → Against EPCG licence
RoDTEP Shipping Bill  → Remission of Duties and Taxes on Exported Products
                        (replaced MEIS in January 2021 — current active scheme)
```

**MEIS (Merchandise Export from India Scheme)** was also discontinued — replaced by RoDTEP from 1 January 2021. All references to MEIS in the product documentation must be updated to RoDTEP.

**Action:** Replace `DEPB` with `RoDTEP` in the SB type enum. Update docs/product-documentation.md.

---

### 2. IEC Does Not Require Annual Renewal

The product (E8-S10) tracks "IEC renewal date" and plans renewal alerts. **This is factually incorrect as of March 2021.**

DGFT updated IEC policy: IEC is now permanently linked to PAN and has no renewal. However, exporters/importers must **confirm/update IEC details once per year** on the DGFT portal (window: April–June) to keep the IEC active. Non-update leads to deactivation, not expiry.

**Correct tracking model:**
```
Status:  Active | Update Due | Deactivated
Alert:   "IEC annual update window is open — confirm on DGFT portal before June 30"
Logic:   Every April 1, trigger reminder. If not acknowledged by June 30, set status → Update Due
```

---

### 3. Document Status Enum Is Architecturally Incorrect

**File:** `packages/shared/src/constants/documentStatuses.ts`

A single global `DocumentStatus` enum of 11 statuses cannot correctly model all document types. Each document has its own lifecycle.

**Current global enum (incorrect):**
```
draft, pending, filed, assessed, approved, rejected, cleared, shipped,
delivered, cancelled, amended
```

**Correct lifecycle per document type:**

| Document | Status Flow |
|---|---|
| Proforma Invoice | Draft → Sent → Accepted → Converted → Expired / Cancelled |
| Commercial Invoice | Draft → Finalized → Sent → Partially Paid → Paid / Overdue / Cancelled |
| Shipping Bill | Draft → Filed → Under Assessment → Assessed → **LEO** → Shipped / Cancelled |
| Bill of Entry | Draft → Filed → Under Assessment → Assessed → **Out of Charge (OOC)** / Held |
| Bill of Lading | Received → Issued → Surrendered / Telex Released |
| BRC | Pending → Received → Matched / Discrepant |
| Letter of Credit | Received → Advised → Docs Submitted → Discrepant → Paid / Expired |
| Certificate of Origin | Draft → Submitted to Chamber → Issued |
| Duty Drawback | Eligible → BRC Received → Claimed → Disbursed |

**Critical missing status: `LEO` (Let Export Order)**
- LEO is the customs permission to load and ship goods
- It is the most critical milestone in export clearance — nothing ships without LEO
- E4-S8 correctly defines: `Filed → Assessed → LEO → Shipped`
- But the `DocumentStatus` enum has no `LEO` value

**Missing: `OOC` (Out of Charge)**
- Import equivalent of LEO
- Issued by customs after BoE assessment and duty payment
- Goods cannot leave customs without OOC

**Minimum fix for now:** Add `LEO`, `OOC`, `converted`, `expired`, `under_assessment` to the global enum.
**Proper fix (Sprint 2+):** Separate status enums per document type.

---

### 4. AD Code Missing from BusinessProfile

The **AD Code (Authorized Dealer Code)** is a 14-digit code issued by the exporter's bank and registered at each export port. It is:
- **Mandatory for Shipping Bill filing on ICEGATE**
- Required for BRC linkage to the exporter's bank
- Part of GSTR-1 Table 6A export data

The current `BusinessProfile` model has `iecNumber`, `gstin`, `pan` — but **no `adCode`**. Without this, Shipping Bills cannot be filed.

**Schema addition:**
```prisma
model BusinessProfile {
  // ... existing fields ...
  adCode              String?   // 14-digit Authorized Dealer Code
  adBankName          String?   // Bank that issued the AD code
  iecLastConfirmedAt  DateTime? // Annual DGFT update tracking (not renewal)
}
```

---

### 5. GSTIN Validation Needs State Code and Checksum

The product says "GSTIN — 15 chars + checksum" which is directionally correct. But the current UI only enforces a 15-character max. Real GSTIN validation must:

**GSTIN format:** `SS + AAAAAAAAAA + E + Z + C`
- `SS` — 2-digit state code (01 J&K, 07 Delhi, 27 Maharashtra, 29 Karnataka, 33 Tamil Nadu, etc.) — must be a valid state code from 01–38
- `AAAAAAAAAA` — 10 characters matching the PAN on file
- `E` — Entity number (1–9 then A–Z)
- `Z` — Always the letter Z
- `C` — Checksum digit (calculated algorithmically)

**Validation logic to implement:**
1. Length must be exactly 15
2. Characters 1–2 must be a valid Indian state code
3. Characters 3–12 must be alphanumeric and match PAN format
4. Character 14 must be `Z`
5. Character 15 is checksum (Luhn-like modulo-36 algorithm — publicly documented by GSTN)

---

### 6. FEMA 9-Month Payment Realization Deadline Not Tracked

Under **FEMA (Foreign Exchange Management Act)**, exporters must realize export payment within **9 months from the date of shipment** (current RBI guideline). Failure triggers:
- Bank reporting to RBI on the Export Outstanding Statement (XOS)
- Potential FEMA violation and penalty

The BRC module tracks "Pending → Received" but **does not enforce or alert on the 9-month FEMA deadline.** This is a regulatory compliance requirement.

**Required logic:**
```
FEMA Deadline = Shipping Bill Date + 270 days

Alert schedule:
  60 days before → "Payment realization due in 60 days for SB [number]"
  30 days before → Warning level alert
   7 days before → Critical alert
   0 days (overdue) → "FEMA deadline breached — inform your AD bank"

BRC Pending Report must include: SB Date, FEMA Deadline, Days Remaining/Overdue
```

---

## Missing Domain Concepts

### 7. RoDTEP Scheme Needs Its Own Tracking

RoDTEP (Remission of Duties and Taxes on Exported Products) is the **current active export incentive scheme** (since Jan 2021). It remits embedded central/state taxes and is credited as a transferable scrip on ICEGATE.

**For complete RoDTEP support:**
- SB type: `RoDTEP Shipping Bill` (in addition to or instead of Free SB)
- Per-item RoDTEP rate (notified by CBIC, percentage of FOB value)
- RoDTEP amount per SB = Σ (item FOB value × item RoDTEP rate)
- Status tracking: `Eligible → Credited to ICEGATE Ledger → Scrip Generated → Utilised / Transferred`
- Report: RoDTEP pending, received, total value

Add to E4-S15 or create E4-S19: RoDTEP Tracking.

---

### 8. Three Different Exchange Rates Apply — Must Not Be Conflated

The system plans a single daily exchange rate per currency. In practice, **three rates apply to different transactions**, and using the wrong one causes compliance errors:

| Rate Type | Used For | Set By | Frequency |
|---|---|---|---|
| **RBI Reference Rate** | Accounting, P&L, general conversion | Reserve Bank of India | Daily |
| **CBIC Customs Rate** | SB FOB value (INR), BoE Assessable Value | CBIC notification | Weekly (Thursdays) |
| **Bank TT Rate** | Actual wire transfer, BRC realization | AD Bank | Real-time |

**Shipping Bills must use the CBIC customs rate** for FOB conversion to INR — not the RBI or bank rate. Using a different rate causes an assessable value mismatch during customs audit.

**Required ExchangeRate schema:**
```prisma
enum RateType {
  RBI
  CBIC
  BANK
  MANUAL
}

model ExchangeRate {
  id           String   @id @default(cuid())
  tenantId     String?  // null = platform rate, tenantId = manual override
  currencyCode String
  date         DateTime
  rateType     RateType
  rate         Decimal  @db.Decimal(10, 4)
  source       String?  // "RBI API", "CBIC Notification", "Manual"
  createdAt    DateTime @default(now())

  @@unique([currencyCode, date, rateType])
  @@index([currencyCode, date])
  @@map("exchange_rates")
}
```

---

### 9. Missing Document Types

**Current 14 types** are a good foundation. Required additions:

| Missing Type | Constant | Why Required |
|---|---|---|
| Duty Payment Challan | `duty_payment_challan` | Proof of customs duty payment on BoE |
| Delivery Order | `delivery_order` | Shipping line permission to release goods (import) |
| Let Export Order | `let_export_order` | Customs permission to ship (export) — critical |
| Examination Report | `examination_report` | Customs physical exam document |
| Inspection Certificate | `inspection_certificate` | Pre-shipment inspection |
| Letter of Undertaking | `lut` | Annual GST document for zero-rated export |
| RoDTEP Scrip | `rodtep_scrip` | Export incentive benefit certificate |
| Advance Authorization | `advance_authorization` | DGFT scheme licence |
| EPCG Licence | `epcg_licence` | DGFT capital goods import scheme |
| SWIFT Copy | `swift_copy` | Bank wire transfer confirmation |
| Import General Manifest | `igm` | Cargo arrival declaration by shipping line |

---

### 10. Missing Currencies for Indian Trade

Current 16 currencies cover major pairs but miss important Indian trading partners:

| Currency | Country | Notes |
|---|---|---|
| `TRY` Turkish Lira | Turkey | Major textile/machinery import source |
| `VND` Vietnamese Dong | Vietnam | Manufacturing hub (electronics, garments) |
| `IDR` Indonesian Rupiah | Indonesia | Palm oil, commodities |
| `BDT` Bangladeshi Taka | Bangladesh | Regional textile trade |
| `OMR` Omani Rial | Oman | Gulf trade (3 decimal places — special handling) |
| `QAR` Qatari Riyal | Qatar | Energy sector |
| `KWD` Kuwaiti Dinar | Kuwait | High-value (3 decimal places), Gulf trade |
| `BHD` Bahraini Dinar | Bahrain | Gulf trade (3 decimal places) |
| `BRL` Brazilian Real | Brazil | Agricultural imports |
| `ZAR` South African Rand | South Africa | Minerals, Africa hub |

**Special note on decimal places:**
- KWD, BHD, OMR use **3 decimal places** (not 2)
- IDR, VND use **0 decimal places** (like JPY, KRW)
- The `CurrencyInfo.decimals` field already supports this — just needs the correct values

---

### 11. Advance Authorization and EPCG — Compliance Obligations Not Scoped

Two major DGFT schemes are referenced (EPCG Shipping Bill exists) but have no tracking module:

**Advance Authorization (AA):**
- Allows duty-free import of inputs for export production
- Export Obligation (EO): must export within 18 months (extendable)
- Redemption required after EO fulfillment
- Tracking needed: imports under AA, exports against EO, % fulfillment, redemption status

**EPCG (Export Promotion Capital Goods):**
- Import capital goods at 0% customs duty
- EO = 6× CIF value of capital goods, over 6 years
- Quarterly DGFT reporting required
- Tracking needed: BoE under EPCG, SBs linked to EO, annual obligation % met

Both represent **significant penalties if not tracked** (customs duty + interest on unmet obligations). Add to roadmap post Sprint 3.

---

## Prisma Schema — Entities Required for Sprint 2+

The current schema covers auth/tenant only. These entities are needed before document modules:

```
Sprint 2 — Master Data (E3):
────────────────────────────
Party              (customers and vendors — type: CUSTOMER/VENDOR/BOTH)
  ↳ PartyContact   (multiple contacts per party)
  ↳ PartyBankAccount (SWIFT, IBAN, account details)
Product            (item master — hscode, duty rates, UOM, weight)
Port               (UN/LOCODE port master — pre-seeded, ~500 Indian + major world ports)
Country            (ISO codes, currency, FTA status with India)
ExchangeRate       (RBI/CBIC/Bank rates with rateType enum)
DocumentSequence   (auto-numbering: prefix + FY + sequence, annual reset)
UOM                (units of measurement with inter-conversion factors)
LUT                (Letter of Undertaking — annual, ARN, validity)

Sprint 3 — Export Documents (E4):
──────────────────────────────────
Shipment           (parent entity linking all export documents for one shipment)
ProformaInvoice    + ProformaInvoiceLineItem
BuyerPurchaseOrder (PO received from buyer, linked to PI)
CommercialInvoice  + CommercialInvoiceLineItem
PackingList        + PackingListItem
ShippingBill       + ShippingBillLineItem
BillOfLading
CertificateOfOrigin
InsuranceCertificate
BankRealizationCertificate
DutyDrawbackClaim  (linked to SB + BRC)
RoDTEPClaim        (linked to SB)
```

**Critical: DocumentSequence** — without this, document auto-numbering (with FY reset based on BusinessProfile.financialYearStartMonth) cannot work.

---

## Business Rules to Enforce in Code

These rules are regulatory requirements — they must be enforced by the backend, not just the UI:

| Rule | Enforce At |
|---|---|
| Active LUT required to mark invoice as "Export under LUT" | CI creation API |
| SB cannot be amended after LEO is issued | SB update API guard |
| CI must be locked (read-only) after SB is filed | CI update API guard |
| BoE cannot be amended after OOC | BoE update API guard |
| BRC required before Duty Drawback claim can be filed | Drawback claim validation |
| FEMA 9-month payment realization alert from SB date | Scheduled job (cron) |
| IGST = (AV + BCD + SWS) × IGST Rate — not AV × rate | BoE calculation engine |
| SWS = BCD × 10% (always, no exceptions) | BoE calculation engine |
| Insurance for CIF = 110% of CFR × insurance rate | Invoice auto-calc |
| CBIC rate used for SB FOB → INR conversion | SB calculation engine |
| RoDTEP rate applied per HS code item | RoDTEP calculation |
| Drawback rate (AIR) applied per HS code item | Drawback calculation |

---

## Regulatory Bodies — Reference for Integrations

| Body | Role | Future Integration |
|---|---|---|
| **ICEGATE** (CBIC) | SB filing, BoE filing, LEO/OOC status | ICEGATE API (Phase 2) |
| **GSTN** | GST returns, ITC, e-invoice IRN | GST API (Phase 2) |
| **DGFT Portal** | IEC, Advance Authorization, EPCG, RoDTEP | DGFT API (Phase 3) |
| **RBI / AD Banks** | BRC, FEMA reporting, exchange rates | Bank API (Phase 3) |
| **ECGC** | Export credit insurance | Portal integration (Phase 4) |
| **Export Promotion Councils** | RCMC, export data reporting | Phase 4 |

---

## Summary — Severity Matrix

Legend: ✅ Fixed | 🔲 Pending

| # | Issue | Severity | Fix By | Status |
|---|---|---|---|---|
| 1 | DEPB obsolete — replace with RoDTEP | Critical | Sprint 2 | ✅ Fixed — E4-S7 updated; SB type enum corrected |
| 2 | IEC renewal logic incorrect — annual update, not renewal | High | Sprint 2 | ✅ Fixed — E8-S10 rewritten; correct alert logic documented |
| 3 | Single DocumentStatus enum for all doc types | High | Sprint 2 | ✅ Partially fixed — global enum expanded with all lifecycle statuses + comment mapping per-doc lifecycle; full per-doc-type enums deferred to Sprint 2+ |
| 4 | LEO and OOC missing from status enum | High | Immediate | ✅ Fixed — `LEO` and `OOC` added to `DocumentStatus` in `@exim/shared` |
| 5 | AD Code missing from BusinessProfile schema | Critical | Sprint 2 | ✅ Fixed — `adCode`, `adBankName`, `iecLastConfirmedAt` added to `BusinessProfile` model in schema |
| 6 | GSTIN validation incomplete (no state code/checksum) | High | Sprint 2 | 🔲 Pending — validation logic to be implemented in Sprint 2 (backend API + frontend form) |
| 7 | FEMA 9-month deadline not tracked | Critical | Sprint 3 | 🔲 Pending — cron job + BRC report update deferred to Sprint 3 |
| 8 | RoDTEP scheme not in scope | High | Sprint 3 | 🔲 Pending — E4-S19 (RoDTEP Tracking) to be added in Sprint 3 epic planning |
| 9 | Three exchange rate types conflated (RBI/CBIC/Bank) | High | Sprint 2 | ✅ Fixed — `RateType` enum (`RBI`/`CBIC`/`BANK`/`MANUAL`) added to schema with explanatory comments |
| 10 | ExchangeRate schema missing rateType | Medium | Sprint 2 | ✅ Fixed — `ExchangeRate` model added to schema with `rateType`, `tenantId`, `source` fields |
| 11 | 10 currencies missing for Indian trade | Medium | Sprint 2 | ✅ Fixed — TRY, VND, IDR, BDT, OMR, QAR, KWD, BHD, BRL, ZAR added to `currencies.ts` |
| 12 | Gulf currencies (KWD, BHD, OMR) need 3 decimal places | Medium | Sprint 2 | ✅ Fixed — KWD, BHD, OMR set to `decimals: 3`; VND, IDR set to `decimals: 0` |
| 13 | Document types incomplete (LEO, DO, LUT, RoDTEP Scrip) | Medium | Sprint 3 | ✅ Fixed — 11 missing types added to `DocumentType` in `@exim/shared` |
| 14 | Advance Authorization / EPCG compliance not scoped | Medium | Sprint 4+ | 🔲 Pending — to be scoped post Sprint 3 |

### Files Modified

| File | Change |
|---|---|
| `packages/shared/src/constants/documentStatuses.ts` | Expanded `DocumentStatus` (11 → 38 statuses); added 11 `DocumentType` entries |
| `packages/shared/src/constants/currencies.ts` | Added 10 currencies; corrected decimal places for KWD, BHD, OMR, VND, IDR |
| `packages/db/prisma/schema.prisma` | Added `RateType` enum; `ExchangeRate` model; `adCode`, `adBankName`, `iecLastConfirmedAt` to `BusinessProfile` |
| `docs/product/epics/E04-export-documentation.md` | E4-S7: DEPB → RoDTEP with correct SB type descriptions |
| `docs/product/epics/E08-gst-compliance.md` | E8-S10: Rewritten for annual update model (not renewal) |

---

*Domain review completed — February 2026*
*Fixes applied — February 2026*
*Next review recommended after Sprint 2 schema design and master data module implementation*