import { Test, TestingModule } from '@nestjs/testing';
import { Gstr3bService } from './gstr3b.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID } from '../../../test/fixtures';

describe('Gstr3bService', () => {
  let service: Gstr3bService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Gstr3bService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<Gstr3bService>(Gstr3bService);
  });

  describe('generateData', () => {
    it('returns zero totals when no invoices or BoEs in month', async () => {
      prisma.commercialInvoice.findMany.mockResolvedValue([]);
      prisma.billOfEntry.findMany.mockResolvedValue([]);

      const result = await service.generateData(TENANT_ID, '2025-04');
      expect(result.table31.lut.taxableValue).toBe(0);
      expect(result.table31.withIgst.taxableValue).toBe(0);
      expect(result.table4.itcFromImports).toBe(0);
      expect(result.month).toBe('2025-04');
    });

    it('segregates LUT and WITH_IGST invoices in Table 3.1', async () => {
      const invoices = [
        { totalAmount: 1000, gstTreatment: 'LUT', exchangeRate: 83 },
        { totalAmount: 500, gstTreatment: 'WITH_IGST', exchangeRate: 84 },
      ];
      prisma.commercialInvoice.findMany.mockResolvedValue(invoices as any);
      prisma.billOfEntry.findMany.mockResolvedValue([]);

      const result = await service.generateData(TENANT_ID, '2025-04');
      expect(result.table31.lut.taxableValue).toBe(83000);
      expect(result.table31.lut.invoiceCount).toBe(1);
      expect(result.table31.withIgst.taxableValue).toBe(42000);
      expect(result.table31.withIgst.invoiceCount).toBe(1);
    });

    it('calculates IGST at 18% of WITH_IGST invoice value × exchange rate', async () => {
      const invoices = [
        { totalAmount: 1000, gstTreatment: 'WITH_IGST', exchangeRate: 100 },
      ];
      prisma.commercialInvoice.findMany.mockResolvedValue(invoices as any);
      prisma.billOfEntry.findMany.mockResolvedValue([]);

      const result = await service.generateData(TENANT_ID, '2025-04');
      expect(result.table31.withIgst.igst).toBeCloseTo(18000, 1);
      expect(result.table31.lut.igst).toBe(0);
    });

    it('sums IGST from claimed BoEs for Table 4 ITC from imports', async () => {
      prisma.commercialInvoice.findMany.mockResolvedValue([]);
      const boes = [
        { igst: 50000 },
        { igst: 30000 },
      ];
      prisma.billOfEntry.findMany.mockResolvedValue(boes as any);

      const result = await service.generateData(TENANT_ID, '2025-04');
      expect(result.table4.itcFromImports).toBe(80000);
      expect(result.table4.boeCount).toBe(2);
    });

    it('includes total row aggregating LUT and WITH_IGST', async () => {
      const invoices = [
        { totalAmount: 1000, gstTreatment: 'LUT', exchangeRate: 1 },
        { totalAmount: 500, gstTreatment: 'WITH_IGST', exchangeRate: 1 },
      ];
      prisma.commercialInvoice.findMany.mockResolvedValue(invoices as any);
      prisma.billOfEntry.findMany.mockResolvedValue([]);

      const result = await service.generateData(TENANT_ID, '2025-04');
      expect(result.table31.total.taxableValue).toBe(1500);
    });
  });
});