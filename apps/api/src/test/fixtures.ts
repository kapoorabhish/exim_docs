/**
 * Test data factories — plain objects matching Prisma model shapes.
 * Pass partial overrides to customise specific fields.
 */

export const TENANT_ID = 'tenant-test-id';
export const USER_ID = 'user-test-id';
export const PARTY_ID = 'party-test-id';

export function makeTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: TENANT_ID,
    name: 'Test Co',
    slug: 'test-co-abc123',
    status: 'TRIAL',
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    tenantId: TENANT_ID,
    email: 'user@test.com',
    passwordHash: '$2a$12$hashedpassword',
    displayName: 'Test User',
    phone: null,
    role: 'ADMIN',
    isVerified: true,
    status: 'ACTIVE',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: makeTenant(),
    ...overrides,
  };
}

export function makeVerificationToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'token-id',
    email: 'user@test.com',
    token: 'abc123token',
    type: 'EMAIL_VERIFY',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

export function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-id',
    userId: USER_ID,
    refreshToken: 'refresh-token-abc',
    device: null,
    ip: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    user: makeUser(),
    ...overrides,
  };
}

export function makeParty(overrides: Record<string, unknown> = {}) {
  return {
    id: PARTY_ID,
    tenantId: TENANT_ID,
    name: 'Test Buyer Ltd',
    type: 'BUYER',
    country: 'US',
    address: '123 Test St',
    city: 'New York',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    taxId: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-id',
    tenantId: TENANT_ID,
    name: 'Test Product',
    description: null,
    hsCode: '6109.10',
    uomCode: 'PCS',
    defaultUnitPrice: 10.0,
    currency: 'USD',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeProforma(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pi-id',
    tenantId: TENANT_ID,
    piNumber: 'PI/2025-26/001',
    date: new Date(),
    validUntil: null,
    status: 'DRAFT',
    version: 1,
    parentId: null,
    buyerPartyId: PARTY_ID,
    currency: 'USD',
    incoterm: 'FOB',
    portOfLoading: 'INNSA',
    portOfDischarge: 'USLAX',
    paymentTerms: 'T/T 30 days',
    deliveryTerms: null,
    bankAccountId: null,
    freight: null,
    insurance: null,
    totalAmount: 1000.0,
    notes: null,
    termsContent: null,
    exportDeclaration: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    buyer: makeParty(),
    lineItems: [],
    ...overrides,
  };
}

export function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-id',
    tenantId: TENANT_ID,
    invoiceNumber: 'INV/2025-26/001',
    date: new Date(),
    status: 'DRAFT',
    piId: null,
    buyerPartyId: PARTY_ID,
    currency: 'USD',
    exchangeRate: 83.5,
    incoterm: 'FOB',
    portOfLoading: null,
    portOfDischarge: null,
    paymentTerms: null,
    bankAccountId: null,
    freight: null,
    insurance: null,
    totalAmount: 1000.0,
    exportDeclaration: null,
    notes: null,
    termsContent: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    buyer: makeParty(),
    lineItems: [],
    ...overrides,
  };
}

export function makeLineItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'li-id',
    lineNumber: 1,
    description: 'Test Item',
    hsCode: null,
    quantity: 100,
    uomCode: 'PCS',
    unitPrice: 10,
    amount: 1000,
    netWeight: null,
    grossWeight: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeDocumentSequence(overrides: Record<string, unknown> = {}) {
  return {
    id: 'seq-id',
    tenantId: TENANT_ID,
    documentType: 'PI',
    fyLabel: '2025-26',
    lastSequence: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Import Module Fixtures ───────────────────────────────

export const SUPPLIER_ID = 'supplier-party-id';
export const SPO_ID = 'spo-id';
export const SINV_ID = 'sinv-id';
export const BOE_ID = 'boe-id';

export function makeSupplierPo(overrides: Record<string, unknown> = {}) {
  return {
    id: SPO_ID,
    tenantId: TENANT_ID,
    poNumber: 'SPO/2025-26/001',
    supplierPartyId: SUPPLIER_ID,
    currency: 'USD',
    expectedDeliveryDate: null,
    status: 'DRAFT',
    totalAmount: 5000,
    approvedBy: null,
    approvedAt: null,
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: makeParty({ id: SUPPLIER_ID, name: 'Test Supplier Ltd', type: 'VENDOR' }),
    lineItems: [],
    supplierInvoices: [],
    ...overrides,
  };
}

export function makeSupplierPoLineItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'spo-li-id',
    poId: SPO_ID,
    lineNumber: 1,
    description: 'Test Import Item',
    hsCode: '6109.10',
    quantity: 100,
    uomCode: 'PCS',
    unitPrice: 50,
    totalPrice: 5000,
    ...overrides,
  };
}

export function makeSupplierInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: SINV_ID,
    tenantId: TENANT_ID,
    invoiceNumber: 'SINV/2025-26/001',
    supplierPartyId: SUPPLIER_ID,
    poId: null,
    currency: 'USD',
    exchangeRate: 83.5,
    exchangeRateDate: null,
    invoiceDate: new Date(),
    dueDate: null,
    totalAmount: 5000,
    status: 'DRAFT',
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: makeParty({ id: SUPPLIER_ID, name: 'Test Supplier Ltd', type: 'VENDOR' }),
    po: null,
    lineItems: [],
    billsOfEntry: [],
    importBls: [],
    ...overrides,
  };
}

export function makeSupplierInvoiceLineItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sinv-li-id',
    invoiceId: SINV_ID,
    lineNumber: 1,
    description: 'Test Import Item',
    hsCode: '6109.10',
    quantity: 100,
    uomCode: 'PCS',
    unitPrice: 50,
    totalPrice: 5000,
    ...overrides,
  };
}

export function makeBoe(overrides: Record<string, unknown> = {}) {
  return {
    id: BOE_ID,
    tenantId: TENANT_ID,
    boeNumber: null,
    invoiceId: SINV_ID,
    portOfEntry: 'INNSA',
    assessedValue: 417500,  // 5000 USD × 83.5 INR
    basicDuty: 41750,       // 10% BCD
    socialWelfareSurcharge: 4175, // 10% of BCD
    igst: 83502,            // 18% of (CIF + BCD + SWS)
    compensationCess: 0,
    totalDuty: 129427,
    status: 'DRAFT',
    filingDate: null,
    examinationDate: null,
    outOfChargeDate: null,
    dutyPaidDate: null,
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    invoice: makeSupplierInvoice(),
    landedCosts: [],
    importDocs: [],
    ...overrides,
  };
}

export function makeLandedCost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lc-id',
    tenantId: TENANT_ID,
    boeId: BOE_ID,
    cifValue: 417500,
    customsDuty: 129427,
    clearingCharges: 15000,
    handlingCharges: 5000,
    transportCharges: 8000,
    otherCharges: 2000,
    totalLandedCost: 576927,
    totalQuantity: 100,
    costPerUnit: 5769.27,
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    boe: makeBoe(),
    ...overrides,
  };
}

export function makeImportBl(overrides: Record<string, unknown> = {}) {
  return {
    id: 'import-bl-id',
    tenantId: TENANT_ID,
    invoiceId: SINV_ID,
    blNumber: 'MSCUBL123456',
    blDate: new Date(),
    shippingLine: 'MSC',
    vesselName: 'MSC Gülsün',
    containerNumbers: 'MSKU1234567,MSKU7654321',
    portOfLoading: 'CNSHA',
    portOfDischarge: 'INNSA',
    arrivalDate: new Date(),
    freeDays: 14,
    dailyDemurrageRate: 150,
    deliveryOrderNumber: null,
    deliveryOrderDate: null,
    status: 'RECEIVED',
    documentUrl: null,
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    invoice: makeSupplierInvoice(),
    ...overrides,
  };
}

export function makeImportDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: 'import-doc-id',
    tenantId: TENANT_ID,
    boeId: BOE_ID,
    documentType: 'COO',
    documentNumber: 'COO-2025-001',
    documentDate: new Date(),
    issuingAuthority: 'China Council for Promotion of International Trade',
    documentUrl: null,
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    boe: makeBoe(),
    ...overrides,
  };
}

// ─── Payment fixtures ──────────────────────────────────────────────────────────

export const EXPORT_PAYMENT_ID = 'export-payment-id';
export const IMPORT_PAYMENT_ID = 'import-payment-id';
export const ADVANCE_PAYMENT_ID = 'advance-payment-id';

export function makeExportPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: EXPORT_PAYMENT_ID,
    tenantId: TENANT_ID,
    paymentNumber: 'EPAY/2025-26/001',
    paymentDate: new Date(),
    referenceNumber: 'UTR123456',
    buyerPartyId: PARTY_ID,
    currency: 'USD',
    foreignAmount: 5000,
    exchangeRate: 83.5,
    inrAmount: 417500,
    bankAccountId: null,
    paymentMode: 'WIRE_TRANSFER',
    bankCharges: 50,
    status: 'PENDING_CLEARANCE',
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    buyer: makeParty(),
    allocations: [],
    ...overrides,
  };
}

export function makeImportPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: IMPORT_PAYMENT_ID,
    tenantId: TENANT_ID,
    paymentNumber: 'IPAY/2025-26/001',
    paymentDate: new Date(),
    referenceNumber: 'REF789',
    supplierPartyId: PARTY_ID,
    currency: 'USD',
    foreignAmount: 10000,
    exchangeRate: 83.5,
    inrAmount: 835000,
    bankAccountId: null,
    paymentMode: 'WIRE_TRANSFER',
    bankCharges: 100,
    tdsAmount: 0,
    status: 'PENDING',
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: makeParty(),
    allocations: [],
    ...overrides,
  };
}

export function makeAdvancePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: ADVANCE_PAYMENT_ID,
    tenantId: TENANT_ID,
    advanceNumber: 'ADV/2025-26/001',
    advanceDate: new Date(),
    type: 'RECEIVED',
    partyId: PARTY_ID,
    currency: 'USD',
    foreignAmount: 2000,
    exchangeRate: 83.5,
    inrAmount: 167000,
    adjustedAmount: 0,
    status: 'OPEN',
    purpose: 'Advance against PI-001',
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    party: makeParty(),
    adjustments: [],
    ...overrides,
  };
}

// ─── Sprint 8: GST fixtures ────────────────────────────────────────────────────

export const LUT_ID = 'lut-id';
export const LC_ID = 'lc-id';
export const BANK_STATEMENT_ID = 'bank-stmt-id';
export const BANK_ENTRY_ID = 'bank-entry-id';

export function makeLutRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: LUT_ID,
    tenantId: TENANT_ID,
    arnNumber: 'AD170322001234E',
    financialYear: '2025-26',
    filingDate: new Date('2025-04-01'),
    expiryDate: new Date('2026-03-31'),
    status: 'ACTIVE',
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function makeBusinessProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-id',
    tenantId: TENANT_ID,
    gstin: '27AABCU9603R1ZX',
    iecNumber: '0512345678',
    iecStatus: 'ACTIVE',
    iecLastConfirmedAt: new Date('2025-04-01'),
    adCode: '0240422',
    adBankName: 'HDFC Bank',
    adCodePorts: 'INMAA,INNSA',
    ...overrides,
  };
}

// ─── Sprint 8: LC fixtures ─────────────────────────────────────────────────────

export function makeLetterOfCredit(overrides: Record<string, unknown> = {}) {
  return {
    id: LC_ID,
    tenantId: TENANT_ID,
    lcNumber: 'LC/2025-26/001',
    lcType: 'SIGHT',
    status: 'DRAFT',
    buyerPartyId: PARTY_ID,
    issuingBank: 'HSBC Hong Kong',
    advisingBank: 'HDFC Bank India',
    lcAmount: 50000,
    currency: 'USD',
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    latestShipmentDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    presentationPeriod: 21,
    portOfLoading: 'INMAA',
    portOfDischarge: 'USLAX',
    goodsDescription: 'Cotton Garments',
    specialConditions: null,
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    buyer: makeParty(),
    requiredDocs: [],
    discrepancies: [],
    ...overrides,
  };
}

export function makeLcDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lc-doc-id',
    lcId: LC_ID,
    documentType: 'COMMERCIAL_INVOICE',
    copies: 3,
    originals: 1,
    instructions: null,
    status: 'NOT_STARTED',
    ...overrides,
  };
}

export function makeLcDiscrepancy(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lc-disc-id',
    lcId: LC_ID,
    description: 'Partial shipment not permitted',
    severity: 'BLOCKING',
    status: 'OPEN',
    loggedBy: USER_ID,
    resolvedBy: null,
    resolvedAt: null,
    waiveReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Sprint 8: Bank reconciliation fixtures ────────────────────────────────────

export function makeBankStatement(overrides: Record<string, unknown> = {}) {
  return {
    id: BANK_STATEMENT_ID,
    tenantId: TENANT_ID,
    bankAccountId: null,
    bankName: 'HDFC Bank',
    accountNumber: '50200012345678',
    statementDate: new Date(),
    currency: 'INR',
    openingBalance: 500000,
    closingBalance: 750000,
    totalCredits: 400000,
    totalDebits: 150000,
    entryCount: 10,
    unreconciledCount: 5,
    notes: null,
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    entries: [],
    ...overrides,
  };
}

export function makeBankEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: BANK_ENTRY_ID,
    statementId: BANK_STATEMENT_ID,
    entryDate: new Date(),
    description: 'Inward remittance UTR123456',
    reference: 'UTR123456',
    entryType: 'CREDIT',
    amount: 417500,
    reconciliationStatus: 'UNRECONCILED',
    exportPaymentId: null,
    importPaymentId: null,
    advancePaymentId: null,
    matchedAt: null,
    matchedBy: null,
    ...overrides,
  };
}
