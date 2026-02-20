-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'EXPORT_MANAGER', 'IMPORT_MANAGER', 'SALES_MANAGER', 'PURCHASE_MANAGER', 'INVENTORY_MANAGER', 'DATA_ENTRY', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CURRENT', 'SAVINGS');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CUSTOMER', 'VENDOR', 'BOTH');

-- CreateEnum
CREATE TYPE "PortType" AS ENUM ('SEA', 'AIR', 'ICD', 'LAND');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('RBI', 'CBIC', 'BANK', 'MANUAL');

-- CreateEnum
CREATE TYPE "PiStatus" AS ENUM ('DRAFT', 'FINALIZED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'FINALIZED', 'LOCKED');

-- CreateEnum
CREATE TYPE "PlStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "PoStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SbType" AS ENUM ('FREE', 'DRAWBACK', 'RODTEP', 'EPCG');

-- CreateEnum
CREATE TYPE "SbStatus" AS ENUM ('DRAFT', 'FILED', 'UNDER_ASSESSMENT', 'ASSESSED', 'LEO', 'SHIPPED');

-- CreateEnum
CREATE TYPE "CooStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ISSUED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "registeredAddress" TEXT,
    "communicationAddress" TEXT,
    "iecNumber" TEXT,
    "iecLastConfirmedAt" TIMESTAMP(3),
    "gstin" TEXT,
    "pan" TEXT,
    "adCode" TEXT,
    "adBankName" TEXT,
    "logoUrl" TEXT,
    "signatureUrl" TEXT,
    "signatoryName" TEXT,
    "signatoryDesignation" TEXT,
    "financialYearStartMonth" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branch" TEXT,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT,
    "swiftCode" TEXT,
    "accountType" "AccountType" NOT NULL DEFAULT 'CURRENT',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isDefaultExport" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultImport" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "currencyCode" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rateType" "RateType" NOT NULL,
    "rate" DECIMAL(10,4) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "device" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entity" TEXT,
    "details" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "PartyType" NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT NOT NULL,
    "vatNumber" TEXT,
    "iecNumber" TEXT,
    "gstin" TEXT,
    "bankName" TEXT,
    "swiftCode" TEXT,
    "accountNumber" TEXT,
    "iban" TEXT,
    "defaultIncoterm" TEXT,
    "defaultPaymentTerms" TEXT,
    "creditLimit" DECIMAL(15,2),
    "preferredPortCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_contacts" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customsDescription" TEXT,
    "hsCode" TEXT,
    "countryOfOrigin" TEXT,
    "uomCode" TEXT NOT NULL DEFAULT 'PCS',
    "netWeightPerUnit" DECIMAL(10,4),
    "grossWeightPerUnit" DECIMAL(10,4),
    "dimensionL" DECIMAL(10,2),
    "dimensionW" DECIMAL(10,2),
    "dimensionH" DECIMAL(10,2),
    "dimensionUnit" TEXT DEFAULT 'CM',
    "bcdRate" DECIMAL(6,2),
    "igstRate" DECIMAL(6,2),
    "gstHsnCode" TEXT,
    "gstRate" DECIMAL(6,2),
    "category" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "portType" "PortType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "code" TEXT NOT NULL,
    "code3" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currencyCode" TEXT,
    "ftaWithIndia" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "uoms" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT,

    CONSTRAINT "uoms_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "hs_codes" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "category" TEXT,
    "bcdRate" DECIMAL(6,2),
    "igstRate" DECIMAL(6,2),

    CONSTRAINT "hs_codes_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "incoterms" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "riskTransferPoint" TEXT NOT NULL,
    "costDescription" TEXT NOT NULL,
    "applicableModes" TEXT NOT NULL,

    CONSTRAINT "incoterms_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "terms_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terms_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fyLabel" TEXT NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proforma_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "piNumber" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "status" "PiStatus" NOT NULL DEFAULT 'DRAFT',
    "date" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "buyerPartyId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "incoterm" TEXT,
    "portOfLoading" TEXT,
    "portOfDischarge" TEXT,
    "deliveryTerms" TEXT,
    "paymentTerms" TEXT,
    "bankAccountId" TEXT,
    "freight" DECIMAL(15,2),
    "insurance" DECIMAL(15,2),
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "termsContent" TEXT,
    "specialInstructions" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proforma_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pi_line_items" (
    "id" TEXT NOT NULL,
    "piId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "hsCode" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL,
    "uomCode" TEXT NOT NULL,
    "unitPrice" DECIMAL(15,4) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "pi_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "date" TIMESTAMP(3) NOT NULL,
    "piId" TEXT,
    "buyerPartyId" TEXT NOT NULL,
    "notifyParty" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(12,6) NOT NULL,
    "incoterm" TEXT,
    "paymentTerms" TEXT,
    "bankAccountId" TEXT,
    "preCarriage" TEXT,
    "placeOfReceipt" TEXT,
    "vesselFlight" TEXT,
    "portOfLoading" TEXT,
    "portOfDischarge" TEXT,
    "finalDestination" TEXT,
    "countryOfOrigin" TEXT,
    "countryOfDestination" TEXT,
    "shippingMarks" TEXT,
    "exportDeclaration" TEXT,
    "freight" DECIMAL(15,2),
    "insurance" DECIMAL(15,2),
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "termsContent" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "hsCode" TEXT,
    "marksNumbers" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL,
    "uomCode" TEXT NOT NULL,
    "unitPrice" DECIMAL(15,4) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "netWeight" DECIMAL(10,3),
    "grossWeight" DECIMAL(10,3),

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_purchase_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "status" "PoStatus" NOT NULL DEFAULT 'PENDING',
    "date" TIMESTAMP(3) NOT NULL,
    "expectedDelivery" TIMESTAMP(3),
    "buyerPartyId" TEXT NOT NULL,
    "piId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_po_line_items" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "uomCode" TEXT NOT NULL,
    "unitPrice" DECIMAL(15,4) NOT NULL,

    CONSTRAINT "buyer_po_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packing_lists" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plNumber" TEXT NOT NULL,
    "status" "PlStatus" NOT NULL DEFAULT 'DRAFT',
    "date" TIMESTAMP(3) NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "shippingMarks" TEXT,
    "totalPackages" INTEGER,
    "totalNetWeight" DECIMAL(10,3),
    "totalGrossWeight" DECIMAL(10,3),
    "totalCbm" DECIMAL(10,4),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packing_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packing_items" (
    "id" TEXT NOT NULL,
    "plId" TEXT NOT NULL,
    "packageNo" TEXT NOT NULL,
    "contents" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL,
    "netWeight" DECIMAL(10,3) NOT NULL,
    "grossWeight" DECIMAL(10,3) NOT NULL,
    "dimensionL" DECIMAL(8,2),
    "dimensionW" DECIMAL(8,2),
    "dimensionH" DECIMAL(8,2),
    "cbm" DECIMAL(10,4),

    CONSTRAINT "packing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_bills" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sbNumber" TEXT,
    "sbType" "SbType" NOT NULL DEFAULT 'FREE',
    "status" "SbStatus" NOT NULL DEFAULT 'DRAFT',
    "date" TIMESTAMP(3) NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "portCode" TEXT NOT NULL,
    "modeOfShipment" TEXT NOT NULL,
    "countryOfDestination" TEXT NOT NULL,
    "exchangeRate" DECIMAL(12,6) NOT NULL,
    "totalFobInr" DECIMAL(15,2) NOT NULL,
    "freightInr" DECIMAL(15,2),
    "insuranceInr" DECIMAL(15,2),
    "leoNumber" TEXT,
    "leoDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sb_line_items" (
    "id" TEXT NOT NULL,
    "sbId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "hsCode" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "uomCode" TEXT NOT NULL,
    "unitPriceInr" DECIMAL(15,4) NOT NULL,
    "fobValueInr" DECIMAL(15,2) NOT NULL,
    "drawbackRate" DECIMAL(6,2),
    "drawbackAmount" DECIMAL(15,2),

    CONSTRAINT "sb_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sb_status_history" (
    "id" TEXT NOT NULL,
    "sbId" TEXT NOT NULL,
    "status" "SbStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "sb_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates_of_origin" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cooNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "cooType" TEXT NOT NULL DEFAULT 'NON_PREFERENTIAL',
    "issuingAuthority" TEXT,
    "status" "CooStatus" NOT NULL DEFAULT 'DRAFT',
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_of_origin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_tenantId_key" ON "business_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "exchange_rates_currencyCode_date_idx" ON "exchange_rates"("currencyCode", "date");

-- CreateIndex
CREATE INDEX "exchange_rates_tenantId_currencyCode_idx" ON "exchange_rates"("tenantId", "currencyCode");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_currencyCode_date_rateType_tenantId_key" ON "exchange_rates"("currencyCode", "date", "rateType", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_module_idx" ON "audit_logs"("tenantId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_email_type_idx" ON "verification_tokens"("email", "type");

-- CreateIndex
CREATE INDEX "parties_tenantId_name_idx" ON "parties"("tenantId", "name");

-- CreateIndex
CREATE INDEX "parties_tenantId_type_idx" ON "parties"("tenantId", "type");

-- CreateIndex
CREATE INDEX "parties_tenantId_country_idx" ON "parties"("tenantId", "country");

-- CreateIndex
CREATE INDEX "products_tenantId_name_idx" ON "products"("tenantId", "name");

-- CreateIndex
CREATE INDEX "products_tenantId_hsCode_idx" ON "products"("tenantId", "hsCode");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenantId_sku_key" ON "products"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "ports_code_key" ON "ports"("code");

-- CreateIndex
CREATE INDEX "ports_country_idx" ON "ports"("country");

-- CreateIndex
CREATE INDEX "ports_portType_idx" ON "ports"("portType");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code3_key" ON "countries"("code3");

-- CreateIndex
CREATE INDEX "hs_codes_chapter_idx" ON "hs_codes"("chapter");

-- CreateIndex
CREATE INDEX "hs_codes_heading_idx" ON "hs_codes"("heading");

-- CreateIndex
CREATE INDEX "terms_templates_tenantId_documentType_idx" ON "terms_templates"("tenantId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_tenantId_documentType_fyLabel_key" ON "document_sequences"("tenantId", "documentType", "fyLabel");

-- CreateIndex
CREATE INDEX "proforma_invoices_tenantId_status_idx" ON "proforma_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "proforma_invoices_tenantId_buyerPartyId_idx" ON "proforma_invoices"("tenantId", "buyerPartyId");

-- CreateIndex
CREATE INDEX "commercial_invoices_tenantId_status_idx" ON "commercial_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "commercial_invoices_tenantId_buyerPartyId_idx" ON "commercial_invoices"("tenantId", "buyerPartyId");

-- CreateIndex
CREATE INDEX "buyer_purchase_orders_tenantId_buyerPartyId_idx" ON "buyer_purchase_orders"("tenantId", "buyerPartyId");

-- CreateIndex
CREATE INDEX "packing_lists_tenantId_invoiceId_idx" ON "packing_lists"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "shipping_bills_tenantId_status_idx" ON "shipping_bills"("tenantId", "status");

-- CreateIndex
CREATE INDEX "shipping_bills_tenantId_sbType_idx" ON "shipping_bills"("tenantId", "sbType");

-- CreateIndex
CREATE INDEX "certificates_of_origin_tenantId_status_idx" ON "certificates_of_origin"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_contacts" ADD CONSTRAINT "party_contacts_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uoms" ADD CONSTRAINT "uoms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_templates" ADD CONSTRAINT "terms_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proforma_invoices" ADD CONSTRAINT "proforma_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proforma_invoices" ADD CONSTRAINT "proforma_invoices_buyerPartyId_fkey" FOREIGN KEY ("buyerPartyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pi_line_items" ADD CONSTRAINT "pi_line_items_piId_fkey" FOREIGN KEY ("piId") REFERENCES "proforma_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_invoices" ADD CONSTRAINT "commercial_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_invoices" ADD CONSTRAINT "commercial_invoices_buyerPartyId_fkey" FOREIGN KEY ("buyerPartyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_invoices" ADD CONSTRAINT "commercial_invoices_piId_fkey" FOREIGN KEY ("piId") REFERENCES "proforma_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "commercial_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_purchase_orders" ADD CONSTRAINT "buyer_purchase_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_purchase_orders" ADD CONSTRAINT "buyer_purchase_orders_buyerPartyId_fkey" FOREIGN KEY ("buyerPartyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_purchase_orders" ADD CONSTRAINT "buyer_purchase_orders_piId_fkey" FOREIGN KEY ("piId") REFERENCES "proforma_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_po_line_items" ADD CONSTRAINT "buyer_po_line_items_poId_fkey" FOREIGN KEY ("poId") REFERENCES "buyer_purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "commercial_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_items" ADD CONSTRAINT "packing_items_plId_fkey" FOREIGN KEY ("plId") REFERENCES "packing_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_bills" ADD CONSTRAINT "shipping_bills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_bills" ADD CONSTRAINT "shipping_bills_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "commercial_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sb_line_items" ADD CONSTRAINT "sb_line_items_sbId_fkey" FOREIGN KEY ("sbId") REFERENCES "shipping_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sb_status_history" ADD CONSTRAINT "sb_status_history_sbId_fkey" FOREIGN KEY ("sbId") REFERENCES "shipping_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates_of_origin" ADD CONSTRAINT "certificates_of_origin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates_of_origin" ADD CONSTRAINT "certificates_of_origin_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "commercial_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
