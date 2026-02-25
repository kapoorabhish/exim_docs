import { Test, TestingModule } from '@nestjs/testing';
import { GstReconciliationService } from './gst-reconciliation.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, makeInvoice, makeBoe } from '../../../test/fixtures';

describe('GstReconciliationService', () => {
  let service: GstReconciliationService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GstReconciliationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<GstReconciliationService>(GstReconciliationService);
  });

  describe('getSbVsGstr1Mismatches', () => {
    it('returns empty array when all invoices have shipping bills and are GSTR-1 filed', async () => {
      const inv = makeInvoice({ shippingBills: [{ sbNumber: 'SB001' }], gstr1Filed: true });
      prisma.commercialInvoice.findMany.mockResolvedValue([inv] as any);

      const result = await service.getSbVsGstr1Mismatches(TENANT_ID, '2025-04');
      expect(result).toHaveLength(0);
    });

    it('flags invoices with no shipping bill as NO_SHIPPING_BILL', async () => {
      const inv = makeInvoice({ shippingBills: [], gstr1Filed: false });
      prisma.commercialInvoice.findMany.mockResolvedValue([inv] as any);

      const result = await service.getSbVsGstr1Mismatches(TENANT_ID, '2025-04');
      expect(result).toHaveLength(1);
      expect(result[0].issue).toBe('NO_SHIPPING_BILL');
    });

    it('flags invoices not filed in GSTR-1 as NOT_FILED_IN_GSTR1', async () => {
      const inv = makeInvoice({
        shippingBills: [{ sbNumber: 'SB001' }],
        gstr1Filed: false,
      });
      prisma.commercialInvoice.findMany.mockResolvedValue([inv] as any);

      const result = await service.getSbVsGstr1Mismatches(TENANT_ID, '2025-04');
      expect(result).toHaveLength(1);
      expect(result[0].issue).toBe('NOT_FILED_IN_GSTR1');
    });

    it('returns mismatch row with correct fields', async () => {
      const inv = makeInvoice({ shippingBills: [], gstr1Filed: false });
      prisma.commercialInvoice.findMany.mockResolvedValue([inv] as any);

      const result = await service.getSbVsGstr1Mismatches(TENANT_ID, '2025-04');
      expect(result[0]).toHaveProperty('invoiceId');
      expect(result[0]).toHaveProperty('invoiceNumber');
      expect(result[0]).toHaveProperty('totalAmount');
    });
  });

  describe('getBoeVsGstr3bMismatches', () => {
    it('returns empty array when all BoEs are claimed for the given month', async () => {
      const boe = makeBoe({ igstCreditStatus: 'CLAIMED', gstr3bMonth: '2025-04' });
      prisma.billOfEntry.findMany.mockResolvedValue([boe] as any);

      const result = await service.getBoeVsGstr3bMismatches(TENANT_ID, '2025-04');
      expect(result).toHaveLength(0);
    });

    it('flags unclaimed BoEs as UNCLAIMED_IGST', async () => {
      const boe = makeBoe({ igstCreditStatus: 'UNCLAIMED', gstr3bMonth: null });
      prisma.billOfEntry.findMany.mockResolvedValue([boe] as any);

      const result = await service.getBoeVsGstr3bMismatches(TENANT_ID, '2025-04');
      expect(result).toHaveLength(1);
      expect(result[0].issue).toBe('UNCLAIMED_IGST');
    });

    it('flags BoEs claimed in different month as CLAIMED_DIFFERENT_MONTH', async () => {
      const boe = makeBoe({ igstCreditStatus: 'CLAIMED', gstr3bMonth: '2025-03' });
      prisma.billOfEntry.findMany.mockResolvedValue([boe] as any);

      const result = await service.getBoeVsGstr3bMismatches(TENANT_ID, '2025-04');
      expect(result).toHaveLength(1);
      expect(result[0].issue).toBe('CLAIMED_DIFFERENT_MONTH');
    });

    it('returns mismatch row with correct fields', async () => {
      const boe = makeBoe({ igstCreditStatus: 'UNCLAIMED', invoice: { invoiceNumber: 'SINV/001' } });
      prisma.billOfEntry.findMany.mockResolvedValue([boe] as any);

      const result = await service.getBoeVsGstr3bMismatches(TENANT_ID, '2025-04');
      expect(result[0]).toHaveProperty('boeId');
      expect(result[0]).toHaveProperty('boeNumber');
      expect(result[0]).toHaveProperty('igst');
    });
  });
});