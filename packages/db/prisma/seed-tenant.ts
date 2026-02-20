/**
 * Tenant Seed Script
 *
 * Seeds realistic test data for a selected tenant.
 * Run: pnpm --filter @exim/db db:seed-tenant
 * Or:  pnpm --filter @exim/db db:seed-tenant -- --force   (re-seed even if data exists)
 *
 * What gets created:
 *  - Business Profile (Sunrise Exports Pvt Ltd)
 *  - 2 Bank Accounts (HDFC USD export, SBI INR import)
 *  - 9 Exchange Rates (USD / EUR / GBP × RBI / CBIC / BANK)
 *  - 5 Parties (3 customers, 2 vendors) with contacts
 *  - 4 Products (apparel / fabric)
 *  - 2 Terms Templates
 *  - 2 Proforma Invoices (one CONVERTED, one DRAFT)
 *  - 1 Commercial Invoice (LOCKED — SB has been filed)
 *  - 1 Packing List (FINALIZED)
 *  - 1 Shipping Bill (FILED, with status history)
 *  - 1 Certificate of Origin (ISSUED)
 *  - Document Sequences initialised for FY 2025-26
 */

import { createInterface } from 'readline';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Interactive prompt helper ────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise((res) => rl.question(q, res));

// ─── Tenant selection ─────────────────────────────────────────────────────────

async function selectTenant() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'asc' },
    include: { businessProfile: true },
  });

  if (tenants.length === 0) {
    console.error('\nNo tenants found. Create a tenant first via Prisma Studio or the registration API.');
    process.exit(1);
  }

  console.log('\nAvailable tenants:\n');
  tenants.forEach((t, i) => {
    const profile = t.businessProfile?.companyName ?? '(no profile yet)';
    console.log(`  [${i + 1}] ${t.name}  (slug: ${t.slug})  —  ${profile}  —  ${t.status}`);
  });

  const answer = await ask('\nEnter tenant number: ');
  const idx = parseInt(answer.trim(), 10) - 1;

  if (isNaN(idx) || idx < 0 || idx >= tenants.length) {
    console.error('Invalid selection.');
    process.exit(1);
  }

  return tenants[idx];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const force = process.argv.includes('--force');

  const tenant = await selectTenant();
  const tenantId = tenant.id;
  console.log(`\nSeeding tenant: ${tenant.name} (${tenantId})\n`);

  // Guard: warn if data already exists
  const existingParties = await prisma.party.count({ where: { tenantId } });
  if (existingParties > 0 && !force) {
    const confirm = await ask(
      `  ⚠ This tenant already has ${existingParties} parties. Re-seed anyway? (y/N): `,
    );
    if (confirm.trim().toLowerCase() !== 'y') {
      console.log('Aborted. Use --force to skip this prompt.');
      process.exit(0);
    }
  }

  // Find a tenant-level admin user to use as createdBy reference
  const adminUser = await prisma.user.findFirst({
    where: { tenantId, role: { in: ['ADMIN', 'EXPORT_MANAGER'] } },
    orderBy: { createdAt: 'asc' },
  });
  const createdBy = adminUser?.id ?? 'seed-script';

  // ── 1. Business Profile ────────────────────────────────────────────────────
  console.log('  → Business Profile...');
  await prisma.businessProfile.upsert({
    where: { tenantId },
    create: {
      tenantId,
      companyName: 'Sunrise Exports Pvt Ltd',
      registeredAddress: 'Plot No. 45, MIDC Industrial Area, Andheri East, Mumbai - 400093, Maharashtra',
      communicationAddress: 'Plot No. 45, MIDC Industrial Area, Andheri East, Mumbai - 400093, Maharashtra',
      iecNumber: '0910012345',
      gstin: '27AAACS1234C1ZA',
      pan: 'AAACS1234C',
      adCode: '03510101001234',
      adBankName: 'HDFC Bank Ltd',
      signatoryName: 'Rajesh Sharma',
      signatoryDesignation: 'Director',
      financialYearStartMonth: 4,
    },
    update: {},
  });

  // ── 2. Bank Accounts ───────────────────────────────────────────────────────
  console.log('  → Bank Accounts...');
  const existingBanks = await prisma.bankAccount.count({ where: { tenantId } });
  if (existingBanks === 0) {
    await prisma.bankAccount.createMany({
      data: [
        {
          tenantId,
          bankName: 'HDFC Bank Ltd',
          branch: 'Andheri East, Mumbai',
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0000392',
          swiftCode: 'HDFCINBB',
          accountType: 'CURRENT',
          currency: 'USD',
          isDefaultExport: true,
          isDefaultImport: false,
        },
        {
          tenantId,
          bankName: 'State Bank of India',
          branch: 'Andheri East, Mumbai',
          accountNumber: '39012345678901',
          ifscCode: 'SBIN0009876',
          swiftCode: 'SBININBB',
          accountType: 'CURRENT',
          currency: 'INR',
          isDefaultExport: false,
          isDefaultImport: true,
        },
      ],
    });
  }

  // ── 3. Exchange Rates ──────────────────────────────────────────────────────
  console.log('  → Exchange Rates...');
  const rateDate = new Date('2026-02-20T00:00:00.000Z');
  await prisma.exchangeRate.createMany({
    skipDuplicates: true,
    data: [
      { currencyCode: 'USD', date: rateDate, rateType: 'RBI',    rate: 86.42,  source: 'Seed data' },
      { currencyCode: 'USD', date: rateDate, rateType: 'CBIC',   rate: 86.10,  source: 'Seed data' },
      { currencyCode: 'USD', date: rateDate, rateType: 'BANK',   rate: 86.55,  source: 'Seed data' },
      { currencyCode: 'EUR', date: rateDate, rateType: 'RBI',    rate: 89.85,  source: 'Seed data' },
      { currencyCode: 'EUR', date: rateDate, rateType: 'CBIC',   rate: 89.50,  source: 'Seed data' },
      { currencyCode: 'EUR', date: rateDate, rateType: 'BANK',   rate: 90.10,  source: 'Seed data' },
      { currencyCode: 'GBP', date: rateDate, rateType: 'RBI',    rate: 108.20, source: 'Seed data' },
      { currencyCode: 'GBP', date: rateDate, rateType: 'CBIC',   rate: 107.80, source: 'Seed data' },
      { currencyCode: 'GBP', date: rateDate, rateType: 'BANK',   rate: 108.50, source: 'Seed data' },
    ],
  });

  // ── 4. Parties ─────────────────────────────────────────────────────────────
  console.log('  → Parties...');

  const globalTraders = await prisma.party.upsert({
    where: { id: `seed-${tenantId}-gt` },
    create: {
      id: `seed-${tenantId}-gt`,
      tenantId,
      type: 'CUSTOMER',
      name: 'Global Traders LLC',
      address: '1234 Commerce Blvd, Suite 100',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
      vatNumber: 'US-EIN-83-1234567',
      swiftCode: 'CITIUS33',
      accountNumber: 'US12345678901234567890',
      defaultIncoterm: 'FOB',
      defaultPaymentTerms: 'T/T 30 days after BL',
      creditLimit: 50000,
      preferredPortCode: 'USNYK',
      contacts: {
        create: [
          {
            name: 'John Mitchell',
            designation: 'Purchase Manager',
            email: 'j.mitchell@globaltraders-demo.com',
            phone: '+1-212-555-0101',
            isPrimary: true,
          },
          {
            name: 'Sarah Lee',
            designation: 'Accounts',
            email: 's.lee@globaltraders-demo.com',
            phone: '+1-212-555-0102',
          },
        ],
      },
    },
    update: {},
  });

  const euroFashion = await prisma.party.upsert({
    where: { id: `seed-${tenantId}-ef` },
    create: {
      id: `seed-${tenantId}-ef`,
      tenantId,
      type: 'CUSTOMER',
      name: 'Euro Fashion GmbH',
      address: 'Musterstraße 42',
      city: 'Hamburg',
      zip: '20095',
      country: 'DE',
      vatNumber: 'DE123456789',
      swiftCode: 'DEUTDEDB',
      accountNumber: 'DE89370400440532013000',
      defaultIncoterm: 'CIF',
      defaultPaymentTerms: 'LC at sight',
      creditLimit: 75000,
      preferredPortCode: 'DEHAM',
      contacts: {
        create: [
          {
            name: 'Klaus Weber',
            designation: 'Director',
            email: 'k.weber@eurofashion-demo.de',
            phone: '+49-40-12345678',
            isPrimary: true,
          },
        ],
      },
    },
    update: {},
  });

  await prisma.party.upsert({
    where: { id: `seed-${tenantId}-as` },
    create: {
      id: `seed-${tenantId}-as`,
      tenantId,
      type: 'CUSTOMER',
      name: 'Al Saud Trading Co.',
      address: 'P.O. Box 12345, Al Quoz Industrial Area',
      city: 'Dubai',
      country: 'AE',
      swiftCode: 'EBILAEAD',
      accountNumber: 'AE070331234567890123456',
      defaultIncoterm: 'CFR',
      defaultPaymentTerms: 'T/T 45 days',
      creditLimit: 30000,
      contacts: {
        create: [
          {
            name: 'Mohammed Al Saud',
            designation: 'Managing Director',
            email: 'm.alsaud@alsaudtrading-demo.ae',
            phone: '+971-4-555-1234',
            isPrimary: true,
          },
        ],
      },
    },
    update: {},
  });

  await prisma.party.upsert({
    where: { id: `seed-${tenantId}-tm` },
    create: {
      id: `seed-${tenantId}-tm`,
      tenantId,
      type: 'VENDOR',
      name: 'Textile Mills Pvt Ltd',
      address: '78, Textile Market, Ring Road',
      city: 'Surat',
      state: 'Gujarat',
      zip: '395002',
      country: 'IN',
      gstin: '24AABCT1234D1Z5',
      defaultPaymentTerms: 'Net 30',
      contacts: {
        create: [
          {
            name: 'Suresh Patel',
            designation: 'Sales Manager',
            email: 's.patel@textilemills-demo.in',
            phone: '+91-261-2345678',
            isPrimary: true,
          },
        ],
      },
    },
    update: {},
  });

  await prisma.party.upsert({
    where: { id: `seed-${tenantId}-ps` },
    create: {
      id: `seed-${tenantId}-ps`,
      tenantId,
      type: 'VENDOR',
      name: 'Packaging Solutions Pvt Ltd',
      address: 'B-12, MIDC, Bhiwandi',
      city: 'Bhiwandi',
      state: 'Maharashtra',
      zip: '421302',
      country: 'IN',
      gstin: '27AABCP5678E1Z3',
      defaultPaymentTerms: 'Net 15',
      contacts: {
        create: [
          {
            name: 'Amit Joshi',
            designation: 'Director',
            email: 'a.joshi@packagingsolutions-demo.in',
            phone: '+91-2522-234567',
            isPrimary: true,
          },
        ],
      },
    },
    update: {},
  });

  // ── 5. Products ─────────────────────────────────────────────────────────────
  console.log('  → Products...');
  await prisma.product.createMany({
    skipDuplicates: true,
    data: [
      {
        tenantId,
        sku: 'MCS-001',
        name: "Men's Cotton Shirts",
        customsDescription: "MEN'S WOVEN COTTON SHIRTS, 100% COTTON",
        hsCode: '62052000',
        countryOfOrigin: 'IN',
        uomCode: 'PCS',
        netWeightPerUnit: 0.25,
        grossWeightPerUnit: 0.28,
        dimensionL: 35,
        dimensionW: 25,
        dimensionH: 5,
        dimensionUnit: 'CM',
        bcdRate: 10.0,
        igstRate: 5.0,
        gstHsnCode: '62052000',
        gstRate: 5.0,
        category: 'Apparel',
      },
      {
        tenantId,
        sku: 'WSD-001',
        name: "Women's Silk Dress",
        customsDescription: "WOMEN'S DRESS OF SILK, WOVEN",
        hsCode: '61044200',
        countryOfOrigin: 'IN',
        uomCode: 'PCS',
        netWeightPerUnit: 0.3,
        grossWeightPerUnit: 0.34,
        bcdRate: 10.0,
        igstRate: 5.0,
        gstHsnCode: '61044200',
        gstRate: 5.0,
        category: 'Apparel',
      },
      {
        tenantId,
        sku: 'CF-001',
        name: 'Cotton Fabric (Dyed)',
        customsDescription: 'COTTON FABRIC, WOVEN, DYED, >85% COTTON, WT >200 G/M2',
        hsCode: '52083200',
        countryOfOrigin: 'IN',
        uomCode: 'MTR',
        netWeightPerUnit: 0.22,
        grossWeightPerUnit: 0.24,
        bcdRate: 10.0,
        igstRate: 5.0,
        gstHsnCode: '52083200',
        gstRate: 5.0,
        category: 'Fabric',
      },
      {
        tenantId,
        sku: 'HES-001',
        name: 'Hand-Embroidered Scarves',
        customsDescription: 'SCARVES, HAND-EMBROIDERED, OF SILK',
        hsCode: '62149010',
        countryOfOrigin: 'IN',
        uomCode: 'PCS',
        netWeightPerUnit: 0.08,
        grossWeightPerUnit: 0.1,
        bcdRate: 10.0,
        igstRate: 5.0,
        gstHsnCode: '62149010',
        gstRate: 5.0,
        category: 'Accessories',
      },
    ],
  });

  // ── 6. Terms Templates ─────────────────────────────────────────────────────
  console.log('  → Terms Templates...');
  const existingTemplates = await prisma.termsTemplate.count({ where: { tenantId } });
  if (existingTemplates === 0) {
    await prisma.termsTemplate.createMany({
      data: [
        {
          tenantId,
          name: 'Standard Export Terms',
          documentType: 'INVOICE',
          content:
            'All disputes are subject to Mumbai jurisdiction. Goods once sold will not be taken back. ' +
            'Payment to be made as per agreed terms. All charges after shipment are to the buyer\'s account.',
          isDefault: true,
        },
        {
          tenantId,
          name: 'Standard Proforma Terms',
          documentType: 'PROFORMA',
          content:
            'This proforma invoice is valid for 30 days from the date of issue. Prices are subject to change without ' +
            'prior notice. Order will be processed only upon receipt of advance payment or confirmed LC.',
          isDefault: true,
        },
      ],
    });
  }

  // ── 7. Get default export bank account ────────────────────────────────────
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { tenantId, isDefaultExport: true },
  });

  // ── 8. Document Sequences for FY 2025-26 ──────────────────────────────────
  console.log('  → Document Sequences...');
  const fyLabel = '2025-26';
  // lastSequence reflects how many docs we are seeding per type
  const seqMap: Record<string, number> = { PI: 2, INV: 1, PL: 1, SB: 1, COO: 1, BPO: 0 };
  for (const [documentType, lastSequence] of Object.entries(seqMap)) {
    await prisma.documentSequence.upsert({
      where: { tenantId_documentType_fyLabel: { tenantId, documentType, fyLabel } },
      create: { tenantId, documentType, fyLabel, lastSequence },
      update: {},
    });
  }

  // ── 9. Proforma Invoice 1 — CONVERTED (used to create INV/2025-26/001) ────
  console.log('  → Proforma Invoice PI/2025-26/001 (CONVERTED)...');
  const pi1 = await prisma.proformaInvoice.upsert({
    where: { id: `seed-${tenantId}-pi1` },
    create: {
      id: `seed-${tenantId}-pi1`,
      tenantId,
      piNumber: 'PI/2025-26/001',
      version: 1,
      status: 'CONVERTED',
      date: new Date('2026-01-10T00:00:00.000Z'),
      validUntil: new Date('2026-02-10T00:00:00.000Z'),
      buyerPartyId: globalTraders.id,
      incoterm: 'FOB',
      portOfLoading: 'INNSA',
      portOfDischarge: 'USNYK',
      paymentTerms: 'T/T 30 days after BL',
      currency: 'USD',
      freight: 0,
      insurance: 0,
      totalAmount: 12500,
      deliveryTerms: '45 days from PI confirmation',
      bankAccountId: bankAccount?.id,
      createdBy,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            description: "MEN'S WOVEN COTTON SHIRTS, 100% COTTON",
            hsCode: '62052000',
            quantity: 500,
            uomCode: 'PCS',
            unitPrice: 18.0,
            amount: 9000.0,
          },
          {
            lineNumber: 2,
            description: "WOMEN'S DRESS OF SILK, WOVEN",
            hsCode: '61044200',
            quantity: 100,
            uomCode: 'PCS',
            unitPrice: 35.0,
            amount: 3500.0,
          },
        ],
      },
    },
    update: {},
  });

  // ── 10. Proforma Invoice 2 — DRAFT ─────────────────────────────────────────
  console.log('  → Proforma Invoice PI/2025-26/002 (DRAFT)...');
  await prisma.proformaInvoice.upsert({
    where: { id: `seed-${tenantId}-pi2` },
    create: {
      id: `seed-${tenantId}-pi2`,
      tenantId,
      piNumber: 'PI/2025-26/002',
      version: 1,
      status: 'DRAFT',
      date: new Date('2026-02-05T00:00:00.000Z'),
      validUntil: new Date('2026-03-05T00:00:00.000Z'),
      buyerPartyId: euroFashion.id,
      incoterm: 'CIF',
      portOfLoading: 'INNSA',
      portOfDischarge: 'DEHAM',
      paymentTerms: 'LC at sight',
      currency: 'EUR',
      freight: 450,
      insurance: 120,
      totalAmount: 8570,
      bankAccountId: bankAccount?.id,
      createdBy,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            description: 'SCARVES, HAND-EMBROIDERED, OF SILK',
            hsCode: '62149010',
            quantity: 1000,
            uomCode: 'PCS',
            unitPrice: 8.0,
            amount: 8000.0,
          },
        ],
      },
    },
    update: {},
  });

  // ── 11. Commercial Invoice — LOCKED (SB is FILED) ─────────────────────────
  console.log('  → Commercial Invoice INV/2025-26/001 (LOCKED)...');
  const inv1 = await prisma.commercialInvoice.upsert({
    where: { id: `seed-${tenantId}-inv1` },
    create: {
      id: `seed-${tenantId}-inv1`,
      tenantId,
      invoiceNumber: 'INV/2025-26/001',
      status: 'LOCKED',
      date: new Date('2026-01-20T00:00:00.000Z'),
      piId: pi1.id,
      buyerPartyId: globalTraders.id,
      notifyParty: 'SAME AS CONSIGNEE',
      currency: 'USD',
      exchangeRate: 86.42,
      incoterm: 'FOB',
      portOfLoading: 'INNSA',
      portOfDischarge: 'USNYK',
      countryOfOrigin: 'IN',
      finalDestination: 'New York, USA',
      vesselFlight: 'MSC MAYA / VOY 2601E',
      preCarriage: 'By Road',
      placeOfReceipt: 'Mumbai',
      paymentTerms: 'T/T 30 days after BL',
      shippingMarks: 'SUNRISE/NY/2601',
      exportDeclaration: 'LUT',
      freight: 0,
      insurance: 0,
      totalAmount: 12500,
      bankAccountId: bankAccount?.id,
      createdBy,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            description: "MEN'S WOVEN COTTON SHIRTS, 100% COTTON",
            hsCode: '62052000',
            marksNumbers: 'SUNRISE/NY/2601/C1-C4',
            quantity: 500,
            uomCode: 'PCS',
            unitPrice: 18.0,
            amount: 9000.0,
            netWeight: 125.0,
            grossWeight: 140.0,
          },
          {
            lineNumber: 2,
            description: "WOMEN'S DRESS OF SILK, WOVEN",
            hsCode: '61044200',
            marksNumbers: 'SUNRISE/NY/2601/C5-C6',
            quantity: 100,
            uomCode: 'PCS',
            unitPrice: 35.0,
            amount: 3500.0,
            netWeight: 30.0,
            grossWeight: 34.0,
          },
        ],
      },
    },
    update: {},
  });

  // ── 12. Packing List — FINALIZED ──────────────────────────────────────────
  console.log('  → Packing List PL/2025-26/001 (FINALIZED)...');
  await prisma.packingList.upsert({
    where: { id: `seed-${tenantId}-pl1` },
    create: {
      id: `seed-${tenantId}-pl1`,
      tenantId,
      plNumber: 'PL/2025-26/001',
      status: 'FINALIZED',
      date: new Date('2026-01-20T00:00:00.000Z'),
      invoiceId: inv1.id,
      shippingMarks: 'SUNRISE/NY/2601',
      totalPackages: 6,
      totalNetWeight: 155.0,
      totalGrossWeight: 174.0,
      totalCbm: 0.504,
      createdBy,
      packages: {
        create: [
          {
            packageNo: '1-4/6',
            contents: "MEN'S COTTON SHIRTS (125 PCS/CTN)",
            quantity: 500,
            netWeight: 125.0,
            grossWeight: 140.0,
            dimensionL: 60,
            dimensionW: 40,
            dimensionH: 40,
            cbm: 0.384,
          },
          {
            packageNo: '5-6/6',
            contents: "WOMEN'S SILK DRESS (50 PCS/CTN)",
            quantity: 100,
            netWeight: 30.0,
            grossWeight: 34.0,
            dimensionL: 50,
            dimensionW: 40,
            dimensionH: 30,
            cbm: 0.12,
          },
        ],
      },
    },
    update: {},
  });

  // ── 13. Shipping Bill — FILED ──────────────────────────────────────────────
  console.log('  → Shipping Bill SB/2025-26/001 (FILED)...');
  await prisma.shippingBill.upsert({
    where: { id: `seed-${tenantId}-sb1` },
    create: {
      id: `seed-${tenantId}-sb1`,
      tenantId,
      sbNumber: '8765432',
      sbType: 'FREE',
      status: 'FILED',
      date: new Date('2026-01-22T00:00:00.000Z'),
      invoiceId: inv1.id,
      portCode: 'INNSA',
      modeOfShipment: 'SEA',
      countryOfDestination: 'US',
      exchangeRate: 86.1,
      totalFobInr: 1076250.0, // 12500 USD × 86.10
      freightInr: 0,
      insuranceInr: 0,
      createdBy,
      lineItems: {
        create: [
          {
            lineNumber: 1,
            description: "MEN'S WOVEN COTTON SHIRTS, 100% COTTON",
            hsCode: '62052000',
            quantity: 500,
            uomCode: 'PCS',
            unitPriceInr: 1549.8,   // 18 USD × 86.10
            fobValueInr: 774900.0,
          },
          {
            lineNumber: 2,
            description: "WOMEN'S DRESS OF SILK, WOVEN",
            hsCode: '61044200',
            quantity: 100,
            uomCode: 'PCS',
            unitPriceInr: 3013.5,   // 35 USD × 86.10
            fobValueInr: 301350.0,
          },
        ],
      },
      statusHistory: {
        create: [
          {
            status: 'DRAFT',
            changedAt: new Date('2026-01-22T10:00:00.000Z'),
            changedBy: createdBy,
            notes: 'SB created from INV/2025-26/001',
          },
          {
            status: 'FILED',
            changedAt: new Date('2026-01-22T14:30:00.000Z'),
            changedBy: createdBy,
            notes: 'Filed on ICEGATE. SB No: 8765432',
          },
        ],
      },
    },
    update: {},
  });

  // ── 14. Certificate of Origin — ISSUED ────────────────────────────────────
  console.log('  → Certificate of Origin COO/2025-26/001 (ISSUED)...');
  await prisma.certificateOfOrigin.upsert({
    where: { id: `seed-${tenantId}-coo1` },
    create: {
      id: `seed-${tenantId}-coo1`,
      tenantId,
      cooNumber: 'COO/2025-26/001',
      issueDate: new Date('2026-01-23T00:00:00.000Z'),
      invoiceId: inv1.id,
      cooType: 'NON_PREFERENTIAL',
      issuingAuthority: 'FIEO — Federation of Indian Export Organisations, Mumbai',
      status: 'ISSUED',
      notes: 'Certificate collected from FIEO Mumbai. Reference: FIEO/MUM/2601/001.',
      createdBy,
    },
    update: {},
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`
✅ Tenant seed complete!

  Business Profile  : Sunrise Exports Pvt Ltd
  Bank Accounts     : 2  (HDFC USD export, SBI INR import)
  Exchange Rates    : 9  (USD / EUR / GBP × RBI / CBIC / BANK)
  Parties           : 5  (3 customers: Global Traders LLC, Euro Fashion GmbH, Al Saud Trading Co.)
                         (2 vendors:   Textile Mills Pvt Ltd, Packaging Solutions Pvt Ltd)
  Products          : 4  (MCS-001, WSD-001, CF-001, HES-001)
  Terms Templates   : 2  (Invoice, Proforma)
  Proforma Invoices : 2  (PI/2025-26/001 → CONVERTED, PI/2025-26/002 → DRAFT)
  Commercial Invoice: 1  (INV/2025-26/001 → LOCKED)
  Packing List      : 1  (PL/2025-26/001 → FINALIZED)
  Shipping Bill     : 1  (SB/2025-26/001 → FILED, SB# 8765432)
  Certificate       : 1  (COO/2025-26/001 → ISSUED)

Document chain: PI/001 → INV/001 → PL/001 + SB/001 + COO/001  ✓
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });