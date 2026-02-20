import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PrismaService } from '../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../test/prisma-mock';
import { makeProforma, makeInvoice, TENANT_ID } from '../../test/fixtures';

// Mock the @react-pdf/renderer and @exim/pdf modules
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
}));

jest.mock('@exim/pdf', () => ({
  ProformaInvoicePdf: () => null,
  CommercialInvoicePdf: () => null,
  PackingListPdf: () => null,
}));

// Mock React.createElement to avoid JSX processing
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  createElement: jest.fn().mockReturnValue(null),
}));

const makePackingList = (overrides: Record<string, unknown> = {}) => ({
  id: 'pl-id',
  tenantId: TENANT_ID,
  plNumber: 'PL/2025-26/001',
  invoiceId: 'inv-id',
  date: new Date(),
  status: 'FINALIZED',
  shippingMarks: null,
  notes: null,
  totalPackages: 1,
  totalNetWeight: 10,
  totalGrossWeight: 11,
  totalCbm: 0.1,
  packages: [],
  invoice: {
    invoiceNumber: 'INV/2025-26/001',
    currency: 'USD',
    totalAmount: 1000,
    buyer: { name: 'Test Buyer', country: 'US' },
  },
  createdBy: 'user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeProfile = () => ({
  companyName: 'Test Co',
  registeredAddress: null,
  gstin: null,
  iecNumber: null,
  pan: null,
});

describe('PdfService', () => {
  let service: PdfService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    // Default: renderToBuffer returns a buffer
    const { renderToBuffer } = require('@react-pdf/renderer');
    (renderToBuffer as jest.Mock).mockResolvedValue(Buffer.from('fake-pdf'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<PdfService>(PdfService);

    // Setup common mocks
    prisma.businessProfile.findUnique.mockResolvedValue(makeProfile() as any);
    prisma.bankAccount.findFirst.mockResolvedValue(null);
  });

  // ─── renderProforma ────────────────────────────────────────────────────────

  describe('renderProforma', () => {
    it('throws NotFoundException if proforma not found', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(null);
      await expect(service.renderProforma(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns a Buffer for valid proforma', async () => {
      const pi = makeProforma({ lineItems: [] });
      prisma.proformaInvoice.findFirst.mockResolvedValue(pi as any);

      const result = await service.renderProforma(TENANT_ID, 'pi-id');
      expect(result).toBeInstanceOf(Buffer);
    });

    it('fetches tenant profile during rendering', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(makeProforma({ lineItems: [] }) as any);

      await service.renderProforma(TENANT_ID, 'pi-id');

      expect(prisma.businessProfile.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT_ID } }),
      );
    });
  });

  // ─── renderInvoice ─────────────────────────────────────────────────────────

  describe('renderInvoice', () => {
    it('throws NotFoundException if invoice not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(service.renderInvoice(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns a Buffer for valid invoice', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice({ lineItems: [] }) as any);

      const result = await service.renderInvoice(TENANT_ID, 'inv-id');
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // ─── renderPackingList ─────────────────────────────────────────────────────

  describe('renderPackingList', () => {
    it('throws NotFoundException if packing list not found', async () => {
      prisma.packingList.findFirst.mockResolvedValue(null);
      await expect(service.renderPackingList(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns a Buffer for valid packing list', async () => {
      prisma.packingList.findFirst.mockResolvedValue(makePackingList() as any);

      const result = await service.renderPackingList(TENANT_ID, 'pl-id');
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // ─── includes bank account when available ─────────────────────────────────

  describe('getTenantProfile (via renderProforma)', () => {
    it('includes bank details when a default export account exists', async () => {
      const bankAccount = {
        bankName: 'HDFC Bank',
        branch: 'Main',
        accountNumber: '123',
        ifscCode: 'HDFC0001',
        swiftCode: 'HDFCINBB',
      };
      prisma.bankAccount.findFirst.mockResolvedValue(bankAccount as any);
      prisma.proformaInvoice.findFirst.mockResolvedValue(makeProforma({ lineItems: [] }) as any);

      // Should not throw
      await expect(service.renderProforma(TENANT_ID, 'pi-id')).resolves.not.toThrow();
    });
  });
});
