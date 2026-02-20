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
