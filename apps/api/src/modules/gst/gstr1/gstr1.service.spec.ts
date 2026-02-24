import { Test, TestingModule } from '@nestjs/testing';
import { Gstr1Service } from './gstr1.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, makeInvoice } from '../../../test/fixtures';

describe('Gstr1Service', () => {
  let service: Gstr1Service;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Gstr1Service,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<Gstr1Service>(Gstr1Service);
  });

  describe('generateTable6a', () => {
    it('returns empty array when no finalized invoices in month', async () => {
      prisma.commercialInvoice.findMany.mockResolvedValue([]);

      const result = await service.generateTable6a(TENANT_ID, '2025-04');
      expect(result).toEqual([]);
    });

    it('maps invoice to Table 6A row with zero IGST for LUT invoices', async () => {
      const inv = makeInvoice({
        gstTreatment: 'LUT',
        totalAmount: 1000,
        exchangeRate: 83.5,
        shippingBills: [],
        buyer: { gstin: '29AABCU9603R1ZX' },
      });
      prisma.commercialInvoice.findMany.mockResolvedValue([inv] as any);

      const result = await service.generateTable6a(TENANT_ID, '2025-04');
      expect(result).toHaveLength(1);
      expect(result[0].igstAmount).toBe(0);
      expect(result[0].invoiceNumber).toBe(inv.invoiceNumber);
    });

    it('calculates 18% IGST for WITH_IGST invoices', async () => {
      const inv = makeInvoice({
        gstTreatment: 'WITH_IGST',
        totalAmount: 1000,
        exchangeRate: 83.5,
        shippingBills: [],
        buyer: { gstin: null },
      });
      prisma.commercialInvoice.findMany.mockResolvedValue([inv] as any);

      const result = await service.generateTable6a(TENANT_ID, '2025-04');
      expect(result[0].igstAmount).toBeCloseTo(180, 1);
    });

    it('includes shipping bill data when available', async () => {
      const sb = { sbNumber: 'SB12345', date: new Date('2025-04-10'), portCode: 'INNSA' };
      const inv = makeInvoice({ shippingBills: [sb], buyer: { gstin: null } });
      prisma.commercialInvoice.findMany.mockResolvedValue([inv] as any);

      const result = await service.generateTable6a(TENANT_ID, '2025-04');
      expect(result[0].shippingBillNumber).toBe('SB12345');
      expect(result[0].portCode).toBe('INNSA');
    });
  });

  describe('markFiled', () => {
    it('marks invoices as filed in GSTR-1', async () => {
      prisma.commercialInvoice.updateMany.mockResolvedValue({ count: 2 } as any);

      const result = await service.markFiled(TENANT_ID, {
        invoiceIds: ['inv-1', 'inv-2'],
        month: '2025-04',
      });
      expect(result.updated).toBe(2);
      expect(prisma.commercialInvoice.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { gstr1Filed: true, gstr1Month: '2025-04' },
        }),
      );
    });
  });

  describe('getFiledStatus', () => {
    it('returns filed status for invoices in the month', async () => {
      const inv = { id: 'inv-id', invoiceNumber: 'INV/001', gstr1Filed: true, gstr1Month: '2025-04' };
      prisma.commercialInvoice.findMany.mockResolvedValue([inv] as any);

      const result = await service.getFiledStatus(TENANT_ID, '2025-04');
      expect(result).toHaveLength(1);
      expect(result[0].gstr1Filed).toBe(true);
    });
  });
});