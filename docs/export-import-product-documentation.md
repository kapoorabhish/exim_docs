# Export-Import Documentation Management System
## Product Documentation & Knowledge Base

**Version:** 1.0  
**Date:** February 2026  
**Document Type:** Product Requirements & Export-Import Knowledge Guide

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Core Modules & Features](#3-core-modules--features)
4. [Export-Import Terminology & Concepts](#4-export-import-terminology--concepts)
5. [Appendix](#5-appendix)

---

## 1. PRODUCT OVERVIEW

### 1.1 Product Vision

A cloud-based, multi-tenant SaaS platform for managing export-import documentation, GST compliance, and international trade operations for Indian businesses.

### 1.2 Inspired By
- **Incodocs**: GST-compliant invoicing and business management
- **Swipe**: Mobile-first invoice and billing solution

### 1.3 Target Audience
- Small to medium exporters and importers
- Customs House Agents (CHAs)
- Freight forwarders
- Trading companies
- Manufacturers engaged in international trade
- Accounting firms handling export-import clients

### 1.4 Core Value Proposition
- All-in-one solution for export-import documentation
- GST & customs compliance automated
- Multi-currency support with real-time exchange rates
- Document chain management from PO to payment realization
- Integration with government portals (ICEGATE, DGFT, GST)
- Role-based access for team collaboration
- Multi-tenant architecture for scalability

### 1.5 Key Differentiators
1. Export-import specific features (not just invoicing)
2. Complete document traceability and relationships
3. Automated duty calculations based on HS codes
4. Integration with customs filing systems
5. Support for all Incoterms and payment terms
6. Container and shipping management
7. Incentive and drawback claim tracking

---

## 2. USER ROLES & PERMISSIONS

### 2.1 Platform Level Roles

#### Super Admin
**Responsibilities:**
- Manage all tenant accounts
- System-wide configuration and settings
- Monitor usage, performance, and health
- Billing and subscription management
- Support ticket resolution
- Platform updates and maintenance

**Key Permissions:**
- Full system access across all tenants
- Tenant creation/deletion
- Global settings management
- Analytics across all tenants
- Audit log access

---

### 2.2 Tenant Level Roles

#### Business Owner/Admin
**Responsibilities:**
- Complete control over organization data
- User management (create, edit, delete users)
- Business profile and settings configuration
- Subscription and billing management
- Data backup and export
- Compliance monitoring

**Key Permissions:**
- All modules access
- User role assignment
- Business settings configuration
- Financial reports access
- Audit logs viewing
- API key management

---

#### Accountant/Finance Manager
**Responsibilities:**
- Manage financial transactions
- GST compliance and filing
- Generate financial reports
- Bank reconciliation
- Payment tracking and collection
- Tax calculations and verification

**Key Permissions:**
- Full access to invoicing and payments
- GST and compliance modules
- Financial reports generation
- Bank accounts management
- Expense management
- Cannot delete users or change business settings

---

#### Export Manager
**Responsibilities:**
- Handle export documentation
- Create shipping bills
- Manage export invoices and packing lists
- Track shipments and containers
- Coordinate with CHAs and freight forwarders
- Monitor export payments (BRC)
- Claim export incentives

**Key Permissions:**
- Export module (full access)
- Customer management
- Product catalog access
- Shipping and logistics
- Export reports
- Cannot access import or finance modules

---

#### Import Manager
**Responsibilities:**
- Handle import documentation
- Create bills of entry
- Manage import invoices
- Track customs clearance
- Monitor landed costs
- Coordinate with vendors and CHAs
- IGST credit tracking

**Key Permissions:**
- Import module (full access)
- Vendor management
- Product catalog access
- Shipping and logistics
- Import reports
- Cannot access export or finance modules

---

#### Sales Manager
**Responsibilities:**
- Create quotations and proforma invoices
- Customer relationship management
- Order management
- Sales tracking and reporting
- Payment follow-up

**Key Permissions:**
- Sales module access
- Customer management
- Quotations and invoices (create/edit)
- Sales reports
- Limited payment viewing
- Cannot delete transactions

---

#### Purchase Manager
**Responsibilities:**
- Create purchase orders
- Vendor management
- Purchase invoice recording
- Expense management
- Procurement tracking

**Key Permissions:**
- Purchase module access
- Vendor management
- Purchase orders and bills
- Expense recording
- Purchase reports
- Cannot access sales or export modules

---

#### Inventory Manager
**Responsibilities:**
- Maintain product catalog
- Stock management
- Warehouse operations
- Stock adjustments
- Inventory reports

**Key Permissions:**
- Inventory module (full access)
- Product master management
- Stock adjustments
- Warehouse management
- Inventory reports
- Cannot access financial modules

---

#### CHA/Freight Forwarder (External User)
**Responsibilities:**
- File customs documents (shipping bill, bill of entry)
- Track customs clearance status
- Update shipping and container details
- Generate freight invoices
- Provide clearance documentation

**Key Permissions:**
- Limited access to assigned shipments only
- Update customs filing details
- Upload clearance documents
- View related invoices
- Cannot create invoices or access financial data

---

#### Data Entry Operator
**Responsibilities:**
- Enter day-to-day transactions
- Create invoices and bills
- Update basic information
- Data entry from physical documents

**Key Permissions:**
- Create and edit documents (limited)
- Basic master data entry
- Cannot delete transactions
- Cannot access reports or settings
- Cannot approve or finalize documents

---

#### Viewer/Auditor (Read-only)
**Responsibilities:**
- View documents and reports
- Audit transactions
- Export data for analysis
- Monitor compliance

**Key Permissions:**
- Read-only access to all modules
- Export/print documents
- View reports
- No create/edit/delete permissions
- Cannot change settings

---

## 3. CORE MODULES & FEATURES

### 3.1 Multi-Tenant & User Management Module

#### Features:
- **Organization/Tenant Onboarding**
  - Business registration with IEC, GSTIN, PAN
  - Multi-branch support
  - Business profile (logo, address, bank details)
  - Multiple GST registrations (for different states)
  
- **User Management**
  - Role-based access control (RBAC)
  - User invitation via email
  - Permission matrix (module-wise and action-wise)
  - User activity logs
  - Session management
  
- **Subscription Management**
  - Multiple pricing tiers (Starter, Professional, Enterprise)
  - Usage-based billing (number of transactions)
  - Payment gateway integration
  - Subscription upgrade/downgrade
  - Trial period management

### 3.2 Master Data Module

#### 3.2.1 Party Management (Buyers/Suppliers)
**Fields:**
- Party Type (Customer/Vendor/Both)
- Party Name, Address, Contact Details
- Country
- Tax Identifiers (VAT, TIN, EIN, etc.)
- IEC Number (if Indian party)
- GSTIN (if Indian party)
- Bank Details (SWIFT Code, IBAN, Account Number)
- Default Payment Terms
- Default Incoterm
- Credit Limit
- Port Preference
- Documents (KYC, Certifications)
- Contact Persons with designation

**Features:**
- Import parties from CSV/Excel
- Duplicate detection
- Party ledger (outstanding tracking)
- Communication history
- Document repository per party
- Party grouping (by country, by product category)

#### 3.2.2 Product/Item Master
**Fields:**
- Product Code (SKU)
- Product Name
- Description for Customs (detailed)
- HS Code (8-digit for India, 6-digit international)
- Country of Origin
- Unit of Measurement (PCS, KG, MT, LTR, etc.)
- Net Weight per unit
- Gross Weight per unit
- Dimensions (L×W×H)
- Customs Valuation Method
- Duty Rates (BCD%, IGST%)
- GST HSN Code (for domestic)
- Category/Group
- Certifications Required (CE, FDA, etc.)
- Shelf Life
- Storage Conditions

**Features:**
- HS Code lookup with description
- Duty rate auto-fetch from master
- Product images
- Variant management (size, color, grade)
- Multi-unit conversion (KG to MT, PCS to CTN)
- Product-wise export/import history

#### 3.2.3 Port Master
**Pre-loaded Data:**
- Indian Ports (INMAA - Mumbai, INBLR - Bangalore ICD, INDEL - Delhi, etc.)
- International Ports (USNYC - New York, CNSHA - Shanghai, etc.)
- Port Type (Sea Port, Air Port, ICD, Land Port)
- Country
- Port Code (6-digit UN/LOCODE)

#### 3.2.4 Country Master
**Pre-loaded Data:**
- Country Name
- Country Code (ISO 2-digit, 3-digit)
- Currency
- Trade Agreements with India (FTA status)
- Documentation requirements
- Duty preferences

#### 3.2.5 Currency Master
**Features:**
- Currency Code (USD, EUR, GBP, AED, etc.)
- Exchange rates (daily update via API)
- Exchange rate history
- Manual override option
- Base currency configuration (default INR)

#### 3.2.6 Bank Account Master
**Fields:**
- Bank Name
- Branch
- Account Number
- IFSC Code
- SWIFT Code (for foreign remittance)
- Account Type (Current, Savings)
- Currency
- Default account for exports/imports

#### 3.2.7 Terms & Conditions Templates
**Features:**
- Pre-defined templates for different document types
- Customizable text
- Language support
- Version control

### 3.3 Export Management Module

#### 3.3.1 Proforma Invoice (PI)
**Purpose:** Preliminary invoice to buyer before shipment

**Fields:**
- PI Number (auto-generated, customizable format)
- PI Date
- Buyer Details (from party master)
- Seller Details (from business profile)
- Validity Period
- Item Details:
  - Product description
  - HS Code
  - Quantity
  - Unit Price (in foreign currency)
  - Total Value
- Incoterm (EXW, FOB, CIF, etc.)
- Payment Terms (Advance, LC, DP, DA)
- Port of Loading
- Port of Discharge
- Country of Origin
- Delivery Timeline
- Special Instructions
- Bank Details for LC opening

**Features:**
- Convert PI to Commercial Invoice
- Version control (Amendment tracking)
- Email/WhatsApp sharing
- PDF generation with company branding
- Multi-currency support
- LC clause suggestions based on incoterm

#### 3.3.2 Purchase Order (from Buyer)
**Purpose:** Order received from buyer

**Fields:**
- PO Number (buyer's reference)
- PO Date
- Expected Delivery Date
- Items with quantities
- Pricing and payment terms
- Shipping instructions
- Quality specifications

**Features:**
- Link to Proforma Invoice
- PO vs PI comparison
- Acceptance/Rejection workflow
- Document upload

#### 3.3.3 Commercial Invoice (Export Invoice)
**Purpose:** Main document for customs clearance and payment

**Fields:**
- Invoice Number (auto-generated)
- Invoice Date
- Exporter Details (IEC, GSTIN, PAN, Address)
- Consignee Details (Buyer)
- Notify Party (if different from consignee)
- Pre-Carriage By (truck/rail)
- Place of Receipt
- Vessel/Flight Number
- Port of Loading (6-digit code)
- Port of Discharge (6-digit code)
- Final Destination
- Country of Origin
- Country of Final Destination
- Terms of Delivery (Incoterm)
- Payment Terms

**Item Details:**
- Marks & Numbers (container/carton markings)
- Description of Goods (as per customs)
- HS Code (8-digit)
- Quantity
- Unit
- Rate (per unit in foreign currency)
- Amount
- Total Packages
- Net Weight (per item and total)
- Gross Weight (per item and total)

**Calculations:**
- Subtotal (FOB Value)
- Freight Charges (if CFR/CIF)
- Insurance Charges (if CIF)
- Total Invoice Value
- Amount in Words

**Additional Fields:**
- Bank Details (for LC/payment)
- Declaration Statements
- Signature with designation
- Terms & Conditions

**Features:**
- Auto-populate from Proforma Invoice
- Currency conversion display (USD to INR equivalent)
- GST Treatment: "Export under LUT" or "Export against Bond"
- Link to Purchase Order
- Multiple invoice formats (for different countries)
- Freight and insurance auto-calculation based on Incoterm
- Email/WhatsApp with PDF
- Print multiple copies

#### 3.3.4 Packing List
**Purpose:** Detailed list of package contents

**Fields:**
- Packing List Number
- Date
- Invoice Reference
- Exporter and Consignee Details
- Shipping Marks (logo, destination, handling instructions)

**Package Details (Table):**
- Package Number (1/10, 2/10, etc.)
- Description of Contents
- Quantity per package
- Net Weight per package
- Gross Weight per package
- Dimensions (L×W×H) in CM
- Volume (CBM)

**Totals:**
- Total Packages
- Total Net Weight
- Total Gross Weight
- Total Volume (CBM)

**Features:**
- Auto-generate from invoice
- Carton-wise breakdown
- Container packing plan
- QR code for package tracking
- Editable package layout

#### 3.3.5 Shipping Bill (SB)
**Purpose:** Main customs document for export clearance

**Fields:**
- Shipping Bill Number (auto-generated or customs-generated)
- Shipping Bill Date
- Type of Shipping Bill:
  - Free Shipping Bill (no duty drawback)
  - Drawback Shipping Bill
  - DEPB Shipping Bill
  - EPCG Shipping Bill
- Port Code (from where exporting)
- IEC Code
- GSTIN
- Exporter Name and Address
- Consignee Details
- Invoice Details
- Item Details with HS Code
- FOB Value (INR)
- Freight Amount
- Insurance Amount
- Country of Destination
- Mode of Shipment (Sea/Air/Road)
- Expected Date of Shipment

**Item-wise Details:**
- Serial Number
- HS Code (8-digit)
- Description
- Quantity
- Unit
- Unit Price (INR)
- Total FOB Value (INR)
- Drawback Rate (if applicable)
- Drawback Amount

**Features:**
- XML/JSON generation for ICEGATE upload
- Status tracking (Filed → Assessed → LEO → Shipped)
- Integration with ICEGATE API (future)
- Let Export Order (LEO) storage
- Drawback calculation
- Multiple items per shipping bill
- Amendment support

#### 3.3.6 Certificate of Origin (CoO)
**Purpose:** Certifies country of manufacture

**Fields:**
- CoO Number
- Issue Date
- Exporter Details
- Consignee Details
- Invoice Number and Date
- Description of Goods
- HS Code
- Country of Origin
- Gross Weight
- Number of Packages
- Issuing Authority (Chamber of Commerce)

**Types:**
- Non-Preferential CoO
- Preferential CoO (for FTA benefits)

**Features:**
- Generate based on invoice
- Template for different countries
- Track expiry and renewal

#### 3.3.7 Bill of Lading (B/L) / Airway Bill (AWB)
**Purpose:** Receipt and title document from carrier

**Fields:**
- B/L Number (from shipping line)
- B/L Date
- Shipper Details
- Consignee Details
- Notify Party
- Vessel Name
- Voyage Number
- Port of Loading
- Port of Discharge
- Container Number(s)
- Seal Number(s)
- Number of Packages
- Description of Goods
- Gross Weight
- Measurement (CBM)
- Freight Terms (Prepaid/Collect)
- Number of Originals (usually 3)

**B/L Types:**
- Original B/L
- Telex Release
- Sea Waybill
- House B/L (from freight forwarder)
- Master B/L (from shipping line)

**Features:**
- Upload B/L copy (PDF/image)
- Track B/L status
- Mark surrendered/telex released
- Link to shipping bill and invoice

#### 3.3.8 Insurance Certificate/Policy
**Purpose:** Cargo insurance coverage

**Fields:**
- Policy Number
- Insurance Company
- Policy Date
- Insured Party
- Voyage Details
- Sum Insured
- Coverage Type (Institute Cargo Clause A/B/C)
- Premium Amount
- Validity

**Features:**
- Upload insurance documents
- Auto-calculate insurance (1.1% of CFR for CIF)
- Link to invoice

#### 3.3.9 Export Declaration / Inspection Certificates
**Types & Purpose:**
- **Pre-Shipment Inspection Certificate**: Quality verification
- **Phytosanitary Certificate**: For agricultural products
- **Health Certificate**: For food/pharma products
- **Fumigation Certificate**: For wooden packaging
- **Weight Certificate**: Certified weight by surveyor
- **Quality Certificate**: Lab test reports

**Features:**
- Upload certificates
- Track expiry dates
- Alert for missing certificates
- Certificate templates

#### 3.3.10 Bank Realization Certificate (BRC)
**Purpose:** Proof of payment receipt

**Fields:**
- BRC Number
- Bank Name
- Date of Realization
- Shipping Bill Number and Date
- Invoice Number and Date
- Foreign Currency Received
- INR Equivalent
- Exchange Rate

**Features:**
- Upload BRC from bank
- Match with shipping bill
- Track pending realizations
- Alert for delayed payments

### 3.4 Import Management Module

#### 3.4.1 Purchase Order (to Supplier)
**Purpose:** Order placement with foreign supplier

**Fields:**
- PO Number
- PO Date
- Supplier Details
- Delivery Address (in India)
- Item Details
- Pricing (in supplier's currency)
- Incoterm
- Payment Terms
- Expected Delivery Date
- Port of Destination
- Quality Requirements
- Inspection Requirements

**Features:**
- Multi-currency support
- Landed cost estimation
- PO approval workflow
- Amendment tracking
- PO vs Invoice matching

#### 3.4.2 Import Commercial Invoice (from Supplier)
**Purpose:** Invoice received from supplier

**Fields:**
- Supplier's Invoice Number
- Invoice Date
- Supplier Details
- Buyer Details (importer)
- Item Details with HS Codes
- Pricing (FOB/CIF/CFR)
- Currency
- Payment Terms
- Port of Loading
- Port of Discharge

**Features:**
- Upload supplier invoice (PDF)
- Data extraction (OCR)
- Link to Purchase Order
- Landed cost calculation
- Currency conversion

#### 3.4.3 Bill of Entry (BoE)
**Purpose:** Main customs clearance document for imports

**Fields:**
- Bill of Entry Number (customs-generated)
- Bill of Entry Date
- Type of BoE:
  - For Home Consumption
  - For Warehousing
  - Ex-Bond BoE
- Port Code (where importing)
- IEC Code
- GSTIN
- Importer Name and Address
- Supplier Details
- Country of Origin
- Country of Consignment (if different)
- Invoice Details
- Item Details with HS Codes

**Item-wise Details:**
- Serial Number
- HS Code (8-digit)
- Description
- Quantity
- Unit
- Assessable Value (CIF in INR)
- BCD Rate (%)
- BCD Amount
- Social Welfare Surcharge (SWS) @ 10% of BCD
- IGST Rate (%)
- IGST Amount
- Cess (if applicable)
- Total Duty

**Calculations:**
- Total Assessable Value
- Total BCD
- Total IGST
- Total Duty Payable

**Features:**
- XML/JSON generation for ICEGATE
- Duty calculator
- Status tracking (Filed → Assessed → Out of Charge)
- Link to import invoice
- Amendment support
- Integration with ICEGATE (future)

#### 3.4.4 Import Documents Management
**Documents:**
- **Import General Manifest (IGM)**: Filed by shipping line, shows cargo arrival
- **Delivery Order**: Permission to take delivery from shipping line
- **Container Tracking**: Track container from origin port to destination
- **Examination Report**: If customs physical examination done
- **Payment Proof**: Duty payment challan

**Features:**
- Document repository per shipment
- Status tracking
- Demurrage calculator
- Alert for free time expiry

#### 3.4.5 Landed Cost Calculator
**Purpose:** Calculate total cost of imported goods

**Components:**
- CIF Value (INR)
- Basic Customs Duty (BCD)
- Social Welfare Surcharge
- IGST
- Port Charges
- CHA Charges
- Transportation to Warehouse
- Insurance

**Formula:**
```
Assessable Value = CIF Value in INR
BCD = Assessable Value × BCD Rate%
SWS = BCD × 10%
Value for IGST = Assessable Value + BCD + SWS
IGST = Value for IGST × IGST Rate%
Total Landed Cost = CIF + BCD + SWS + IGST + Other Charges
Per Unit Cost = Total Landed Cost / Quantity
```

**Features:**
- Real-time calculation
- Compare multiple suppliers
- Save calculations for future reference
- Export calculations to Excel

### 3.5 Letter of Credit (LC) Module

#### 3.5.1 LC Management
**Purpose:** Manage LC-based transactions

**Fields:**
- LC Number (from bank)
- LC Date
- Issuing Bank (buyer's bank)
- Advising Bank (seller's bank)
- Beneficiary (exporter)
- Applicant (importer)
- LC Amount
- Currency
- LC Type:
  - Sight LC
  - Usance LC (30/60/90/120 days)
  - Revocable/Irrevocable
  - Confirmed/Unconfirmed
- Expiry Date
- Latest Shipment Date
- Port of Loading
- Port of Discharge
- Partial Shipments (Allowed/Not Allowed)
- Transhipment (Allowed/Not Allowed)

**Required Documents List:**
- Commercial Invoice (originals: 3, copies: 2)
- Packing List
- Bill of Lading (full set)
- Certificate of Origin
- Insurance Certificate
- Inspection Certificate
- Other documents

**LC Clauses:**
- Payment terms
- Document presentation period
- Discrepancy charges
- Special conditions

**Features:**
- LC vs Invoice matching
- Document checklist
- Alert for expiry and last shipment date
- Amendment tracking
- Discrepancy management
- Link to related invoices and shipping bills

#### 3.5.2 LC Document Submission
**Features:**
- Checklist of required documents
- Document upload
- Submission to bank tracking
- Discrepancy handling
- Payment tracking

### 3.6 Payment & Banking Module

#### 3.6.1 Payment Recording
**Payment Types:**
- **Advance Payment**: Before shipment
- **Against Documents**: DA/DP
- **LC Payment**: Sight or Usance
- **Open Account**: After delivery
- **Partial Payments**

**Fields:**
- Payment Date
- Payment Reference Number
- Party Name (Buyer/Supplier)
- Invoice/Shipment Reference
- Amount (foreign currency)
- Exchange Rate
- INR Equivalent
- Bank Account (received in)
- Payment Mode (Wire Transfer, LC, Cheque)
- Bank Charges
- TDS Deducted (if applicable)
- Status (Pending/Cleared/Bounced)

**Features:**
- Link payments to multiple invoices
- Advance adjustment
- Payment schedule
- Overdue tracking
- Payment reminders (automated)
- Bank statement reconciliation

#### 3.6.2 Outstanding Management
**Features:**
- Receivables aging report (0-30, 30-60, 60-90, 90+ days)
- Payables aging report
- Party-wise outstanding
- Shipment-wise outstanding
- Payment due date tracking
- Automated payment reminders via email/WhatsApp

#### 3.6.3 Bank Reconciliation
**Features:**
- Import bank statements (CSV/Excel/PDF)
- Auto-match transactions
- Manual matching
- Unmatched transaction review
- Reconciliation reports

### 3.7 GST & Compliance Module

#### 3.7.1 GST for Exports
**Features:**
- **LUT Management**:
  - Generate LUT application
  - Track LUT validity (yearly renewal)
  - ARN tracking
  - Alert before expiry

- **Export Invoice GST Treatment**:
  - Mark as "Export under LUT" or "Export under Bond"
  - Zero-rated supply
  - IGST refund tracking (if paid)

- **Shipping Bill & GSTR-1 Reconciliation**:
  - Match shipping bills with GSTR-1 Table 6A
  - Identify mismatches
  - Amendment support

#### 3.7.2 GST for Imports
**Features:**
- **IGST Tracking**:
  - IGST paid on Bill of Entry
  - IGST credit in GSTR-3B
  - Reconciliation between BoE and GSTR-3B

- **GSTR-2A Matching**:
  - Import GSTR-2A data
  - Match with Bills of Entry
  - Identify discrepancies

#### 3.7.3 GST Returns
**Features:**
- GSTR-1 generation (with export data)
- GSTR-3B filing
- Data export in JSON format
- Direct filing (via GST API integration - future)

### 3.8 Inventory Module (for Import-based inventory)

#### 3.8.1 Stock Management
**Features:**
- Stock In (from imports)
- Stock Out (to production/sales)
- Stock Transfer (between warehouses)
- Stock Adjustments
- Low stock alerts
- Batch/Lot tracking
- Expiry date tracking (for perishables)

#### 3.8.2 Valuation
**Methods:**
- FIFO (First In First Out)
- Weighted Average
- Landed cost-based valuation

#### 3.8.3 Inventory Reports
- Stock Summary
- Stock Movement
- Stock Aging
- Dead Stock Analysis
- Stock Valuation Report

### 3.9 Shipping & Logistics Module

#### 3.9.1 Freight Booking
**Features:**
- Freight forwarder/shipping line master
- Booking request creation
- Booking confirmation storage
- Freight rate management
- Container allocation

#### 3.9.2 Container Tracking
**Features:**
- Container number tracking
- Vessel schedule
- Expected arrival date
- Real-time tracking (via shipping line APIs - future)
- Demurrage calculator
- Detention calculator

#### 3.9.3 CHA Collaboration
**Features:**
- Share documents with CHA
- CHA access portal
- Status updates from CHA
- Expense/bill submission by CHA
- Communication log

### 3.10 Reports & Analytics Module

#### 3.10.1 Export Reports
- Export Register (all shipments)
- Country-wise Export Report
- Product-wise Export Report
- Buyer-wise Export Report
- Month-wise Export Trends
- Pending Shipments Report
- BRC Pending Report
- Shipping Bill Pending Report
- LC Expiry Report
- Port-wise Export Report

#### 3.10.2 Import Reports
- Import Register (all imports)
- Country-wise Import Report
- Product-wise Import Report
- Supplier-wise Import Report
- Month-wise Import Trends
- Pending Clearance Report
- Duty Payment Report
- IGST Credit Report
- Landed Cost Analysis

#### 3.10.3 Financial Reports
- Profit & Loss Statement
- Balance Sheet
- Cash Flow Statement
- Receivables Report
- Payables Report
- Outstanding Aging Report
- Bank Book
- Currency Gain/Loss Report

#### 3.10.4 Compliance Reports
- GST Reports (GSTR-1, GSTR-3B data)
- Shipping Bill vs GSTR-1 Reconciliation
- Bill of Entry vs GSTR-3B Reconciliation
- LUT Status Report
- Certificate Expiry Report
- IEC Renewal Report

#### 3.10.5 Analytics Dashboard
**KPIs:**
- Total Export Value (MTD, YTD)
- Total Import Value (MTD, YTD)
- Top 5 Buyers
- Top 5 Suppliers
- Top 5 Products
- Average Realization Period
- Outstanding Receivables
- Outstanding Payables
- Shipments in Transit
- Pending Customs Clearance

**Charts:**
- Monthly export-import trend (line chart)
- Country-wise distribution (pie chart)
- Product category-wise distribution (bar chart)
- Payment realization timeline (funnel chart)

### 3.11 Document Management & Templates

#### 3.11.1 Document Templates
**Customizable Templates:**
- Invoice formats (country-specific)
- Packing list layouts
- Certificate of Origin formats
- Letter of Credit templates
- Email templates (payment reminders, shipment alerts)
- WhatsApp message templates

**Features:**
- Drag-and-drop template builder
- Merge fields (auto-populate data)
- Multi-language support
- Company branding (logo, colors)
- Signature upload
- Header/footer customization

#### 3.11.2 Document Generation
**Features:**
- Bulk PDF generation
- Watermarking
- Digital signatures
- QR code embedding (for verification)
- Document versioning
- Print-ready formats

#### 3.11.3 Document Repository
**Features:**
- Centralized document storage
- Folder structure (by shipment, by party, by type)
- Document tagging
- Search by keywords, date, document type
- Access control (role-based)
- Version history
- Document expiry alerts

### 3.12 Communication & Collaboration

#### 3.12.1 Email Integration
**Features:**
- Send documents via email
- Email tracking (opened/not opened)
- Schedule emails
- Email templates
- Attachment limit handling (cloud links)

#### 3.12.2 WhatsApp Integration
**Features:**
- Share documents via WhatsApp Business API
- Send payment reminders
- Shipment status notifications
- Template message management
- Chat history

#### 3.12.3 SMS Notifications
**Features:**
- Payment due reminders
- Shipment alerts
- Customs clearance updates
- LC expiry alerts

#### 3.12.4 In-App Notifications
**Features:**
- Real-time notifications
- Notification center
- Action buttons in notifications
- Notification preferences

### 3.13 Integration Module

#### 3.13.1 Government Portal Integrations (Future)
- **ICEGATE API**: 
  - File Shipping Bill electronically
  - File Bill of Entry electronically
  - Fetch status updates
  - Download LEO and Out of Charge certificates

- **DGFT Portal**:
  - IEC verification
  - License application
  - Scrip management

- **GST Portal**:
  - Fetch GSTR-2A
  - File GSTR-1
  - LUT filing
  - E-invoice generation

#### 3.13.2 Banking Integrations
- **Payment Gateways**:
  - Razorpay/Stripe for subscription payments
  - International payment gateway for buyer payments

- **Bank APIs**:
  - Fetch bank statements
  - Payment status tracking
  - SWIFT message tracking

#### 3.13.3 Shipping Line APIs
- Track container status
- Fetch vessel schedules
- Download B/L documents
- Calculate demurrage

#### 3.13.4 Third-Party Tools
- **Accounting Software**: Tally, QuickBooks, Zoho Books
- **ERP Systems**: SAP, Oracle
- **E-commerce Platforms**: Shopify, Amazon (for e-commerce exports)
- **Currency Exchange APIs**: Real-time rates
- **Email Services**: SendGrid, AWS SES
- **SMS Gateway**: Twilio, MSG91
- **WhatsApp Business API**: Gupshup, Twilio

### 3.14 Mobile Application

#### 3.14.1 Mobile Features (Android & iOS)
**Core Features:**
- Dashboard (KPIs, pending tasks)
- Create invoices on-the-go
- Scan and upload documents (camera integration)
- Record payments
- Track shipments
- Push notifications
- Offline mode (sync when online)

**CHA-Specific Mobile Features:**
- Update clearance status
- Upload customs documents
- Real-time chat with clients

### 3.15 Settings & Configuration

#### 3.15.1 Business Settings
- Company profile
- Logo and branding
- Multiple branches/locations
- Financial year settings
- Default currency
- Tax configuration

#### 3.15.2 Document Settings
- Number series configuration (prefixes, suffixes, padding)
- Document approval workflows
- Default terms and conditions
- Email/WhatsApp templates

#### 3.15.3 User Preferences
- Language selection
- Date format
- Number format
- Time zone
- Notification preferences

#### 3.15.4 Backup & Data Export
- Automated daily backups
- On-demand backup
- Data export (CSV, Excel, PDF)
- Data import (for migration)

---

## 4. KEY TERMINOLOGY & CONCEPTS

### 4.1 Trade Terms (Incoterms 2020)

#### **EXW (Ex Works)**
- Buyer responsibility from seller's premises
- Seller's minimum obligation
- Buyer arranges everything (transport, export clearance, insurance)

#### **FCA (Free Carrier)**
- Seller delivers goods to carrier nominated by buyer
- Seller clears export customs
- Common for containerized cargo

#### **FOB (Free on Board)**
- Seller delivers goods on board vessel
- Seller pays export clearance and loading costs
- Buyer pays freight and insurance
- Risk transfers when goods are on vessel
- Most common in India for sea freight

#### **CFR (Cost and Freight)**
- Seller pays freight to destination port
- Buyer pays insurance
- Risk transfers when goods are on vessel

#### **CIF (Cost, Insurance, and Freight)**
- Seller pays freight and insurance to destination port
- Most common for imports
- Risk transfers when goods are on vessel
- Seller must provide minimum insurance (110% of CIF value)

#### **DAP (Delivered at Place)**
- Seller delivers to named destination
- Seller bears all risks till destination
- Buyer clears import customs

#### **DDP (Delivered Duty Paid)**
- Seller's maximum obligation
- Seller pays everything including import duty
- Buyer just receives goods

### 4.2 Payment Terms

#### **Advance Payment**
- 100% payment before shipment
- No risk for seller
- High risk for buyer
- Used when buyer trust is low

#### **Letter of Credit (LC)**
- Bank-guaranteed payment
- Reduces risk for both parties
- Types:
  - **Sight LC**: Payment on document presentation
  - **Usance LC**: Deferred payment (30/60/90/120 days)
  - **Revocable LC**: Can be cancelled (rare)
  - **Irrevocable LC**: Cannot be cancelled (standard)
  - **Confirmed LC**: Additional bank guarantee (safer for seller)

**LC Process Flow:**
```
1. Buyer applies for LC at their bank (Issuing Bank)
2. Issuing Bank sends LC to Seller's bank (Advising Bank)
3. Seller ships goods
4. Seller submits documents to Advising Bank
5. Advising Bank checks documents
6. Documents sent to Issuing Bank
7. Issuing Bank checks documents
8. Payment released to Seller
9. Documents handed to Buyer
10. Buyer clears customs and receives goods
```

#### **Documents Against Payment (DP)**
- Also called Cash Against Documents (CAD)
- Documents released to buyer only after payment
- Bank acts as intermediary
- Lower risk for seller than open account

#### **Documents Against Acceptance (DA)**
- Buyer accepts a time draft (promise to pay)
- Documents released after acceptance
- Payment made on due date (30/60/90 days)
- Higher risk for seller

#### **Open Account**
- Goods shipped, buyer pays later (30/60/90 days)
- High trust required
- High risk for seller
- Common between established business partners

### 4.3 Export Process Stages

#### **Stage 1: Pre-Shipment**
- Inquiry from buyer
- Quotation/Proforma Invoice
- Order confirmation
- LC opening (if applicable)
- Production/Procurement
- Quality inspection
- Packing

#### **Stage 2: Export Documentation**
- Commercial Invoice preparation
- Packing List preparation
- Certificate of Origin (from Chamber)
- Other certificates (inspection, health, phyto)
- Insurance policy (for CIF)

#### **Stage 3: Customs Clearance**
- Shipping Bill filing (on ICEGATE)
- Document submission to CHA
- CHA submits to customs
- Customs assessment
- Examination (if selected - random 5-10%)
- Let Export Order (LEO) issued
- Goods allowed to move to port

#### **Stage 4: Shipment**
- Goods transported to port
- Container stuffing (if FCL)
- Loading on vessel/aircraft
- Bill of Lading issued by shipping line
- Departure of vessel

#### **Stage 5: Post-Shipment Documentation**
- Prepare document set for buyer
- Submit to bank (if LC)
- Share with buyer (if DP/DA/Open Account)
- Track vessel/flight

#### **Stage 6: Payment Realization**
- Buyer receives documents
- Buyer clears import customs
- Payment received
- Bank Realization Certificate (BRC) obtained
- Foreign exchange conversion

#### **Stage 7: Post-Export Activities**
- Duty drawback claim (if applicable)
- Export incentive claim (RoDTEP)
- Update GSTR-1 (Table 6A)
- Maintain records for 5 years

### 4.4 Import Process Stages

#### **Stage 1: Pre-Import**
- Identify supplier
- Request quotation
- Issue Purchase Order
- Open LC (if required)
- Advance payment (if required)

#### **Stage 2: Shipment by Supplier**
- Supplier ships goods
- Supplier sends shipping documents:
  - Commercial Invoice
  - Packing List
  - Bill of Lading
  - Certificate of Origin
  - Insurance (if CIF)
  - Other certificates

#### **Stage 3: Arrival at Indian Port**
- Vessel arrives
- Shipping line files Import General Manifest (IGM)
- Importer receives arrival notice
- Documents submitted to CHA

#### **Stage 4: Customs Clearance**
- CHA files Bill of Entry on ICEGATE
- Customs assessment of duty
- Duty payment (BCD + IGST)
- Customs examination (if selected)
- Out of Charge (OOC) issued

#### **Stage 5: Cargo Delivery**
- Delivery Order from shipping line
- Container destuffing (if FCL)
- Goods transported to warehouse
- Stock entry in system

#### **Stage 6: Post-Import**
- Payment to supplier (balance payment)
- IGST credit claimed in GSTR-3B
- Accounting entries
- Stock allocation to production/sales

### 4.5 Customs Duties & Taxes

#### **For Exports:**
- **Generally duty-free** (most exports from India)
- **GST**: Zero-rated (export under LUT or bond)
- **Cess**: Usually nil
- **Export duty**: On some items (e.g., iron ore, leather - rare)

#### **For Imports:**

**1. Basic Customs Duty (BCD)**
- Varies by product (0% to 100%+)
- Based on HS Code
- Purpose: Protect domestic industry

**2. Social Welfare Surcharge (SWS)**
- 10% of BCD
- Additional revenue for government

**3. IGST (Integrated GST)**
- Applicable on: Assessable Value + BCD + SWS
- Rate: 5%, 12%, 18%, 28% (based on HSN)
- Can be claimed as input credit

**4. Compensation Cess**
- On luxury items (cars, tobacco, aerated drinks)
- Additional tax

**Import Duty Calculation Example:**
```
Product: Laptop
CIF Value: $1,000
Exchange Rate: ₹83/USD
CIF in INR: ₹83,000

BCD @ 0%: ₹0
SWS @ 10% of BCD: ₹0
Value for IGST: ₹83,000 + ₹0 = ₹83,000
IGST @ 18%: ₹14,940

Total Duty: ₹14,940
Landed Cost: ₹83,000 + ₹14,940 = ₹97,940 (+ CHA charges + port charges)
```

### 4.6 Container & Shipping Terms

#### **Container Types:**
- **20' (TEU - Twenty-foot Equivalent Unit)**: 
  - Internal: 5.9m L × 2.35m W × 2.39m H
  - Capacity: 28-30 CBM
  - Max load: 28-30 MT

- **40' (FEU - Forty-foot Equivalent Unit)**:
  - Internal: 12m L × 2.35m W × 2.39m H
  - Capacity: 58-60 CBM
  - Max load: 28-30 MT

- **40' HC (High Cube)**:
  - Internal: 12m L × 2.35m W × 2.69m H
  - Capacity: 68-70 CBM
  - Max load: 28-30 MT

#### **Loading Terms:**
- **FCL (Full Container Load)**: Entire container for one shipper
- **LCL (Less than Container Load)**: Shared container with multiple shippers
- **CBM (Cubic Meter)**: Volume measurement (L × W × H in meters)
- **Chargeable Weight**: Whichever is higher - actual weight or volumetric weight

#### **Port Charges:**
- **CFS (Container Freight Station) Charges**: Where LCL cargo is consolidated/deconsolidated
- **Demurrage**: Container detention at port (after free time)
- **Detention**: Container holding outside port (after free time)
- **Free Time**: Usually 3-7 days for export, 3-5 days for import

### 4.7 Document Relationships

```
Proforma Invoice (PI)
  ↓
Purchase Order (PO) from Buyer
  ↓
Commercial Invoice ←→ Packing List
  ↓                         ↓
Shipping Bill              Bill of Lading
  ↓                         ↓
Let Export Order (LEO)     Shipment
  ↓
Certificate of Origin, Insurance, Inspection Certificates
  ↓
Document Set to Buyer/Bank
  ↓
Payment Realization
  ↓
Bank Realization Certificate (BRC)
  ↓
Duty Drawback Claim, Export Incentive
```

---

---

## 5. APPENDIX

### 5.1 Glossary of Terms

- **IEC**: Import Export Code
- **GSTIN**: GST Identification Number
- **HS Code**: Harmonized System Code (product classification)
- **Incoterm**: International Commercial Terms (trade terms)
- **FOB**: Free on Board
- **CIF**: Cost Insurance Freight
- **LC**: Letter of Credit
- **B/L**: Bill of Lading
- **AWB**: Airway Bill
- **BoE**: Bill of Entry
- **SB**: Shipping Bill
- **LEO**: Let Export Order
- **OOC**: Out of Charge
- **BCD**: Basic Customs Duty
- **IGST**: Integrated Goods and Services Tax
- **LUT**: Letter of Undertaking
- **CHA**: Customs House Agent
- **ICEGATE**: Indian Customs EDI Gateway
- **DGFT**: Directorate General of Foreign Trade
- **CBM**: Cubic Meter
- **FCL**: Full Container Load
- **LCL**: Less than Container Load
- **TEU**: Twenty-foot Equivalent Unit

### 5.2 Useful Resources

**Government Portals:**
- ICEGATE: https://www.icegate.gov.in/
- DGFT: https://dgft.gov.in/
- GST Portal: https://www.gst.gov.in/
- SWIFT: https://www.swift.com/

**Reference Materials:**
- Incoterms 2020: https://iccwbo.org/resources-for-business/incoterms-rules/
- HS Code Search: https://www.foreign-trade.com/reference/hscode.htm
- Indian Customs Tariff: https://www.cbic.gov.in/

**Industry Associations:**
- FIEO: https://fieo.org/
- EEPC India: https://eepcindia.org/
- CAPEXIL: https://capexil.in/

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Status**: Product Documentation

---

*This is a living document and will be updated as the product evolves.*
