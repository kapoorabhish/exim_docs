import { Test, TestingModule } from '@nestjs/testing';
import { TallyExportService } from './tally-export.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, makeExportPayment } from '../../../test/fixtures';

describe('TallyExportService', () => {
  let service: TallyExportService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyExportService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<TallyExportService>(TallyExportService);
  });

  describe('getPreview', () => {
    it('returns empty array when no payments found', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([]);

      const result = await service.getPreview(TENANT_ID, {});
      expect(result).toEqual([]);
    });

    it('maps payments to preview format', async () => {
      const payment = makeExportPayment({
        paymentDate: new Date('2025-04-15'),
        referenceNumber: 'UTR123456',
        foreignAmount: 5000,
        currency: 'USD',
        buyer: { name: 'Test Buyer Ltd' },
      });
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.getPreview(TENANT_ID, {});
      expect(result).toHaveLength(1);
      expect(result[0].referenceNumber).toBe('UTR123456');
      expect(result[0].amount).toBe(5000);
      expect(result[0].currency).toBe('USD');
      expect(result[0].buyerName).toBe('Test Buyer Ltd');
    });

    it('applies date range filter to query', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([]);

      await service.getPreview(TENANT_ID, { dateFrom: '2025-04-01', dateTo: '2025-04-30' });
      expect(prisma.exportPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            paymentDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('generateXml', () => {
    it('returns valid XML envelope string', async () => {
      const payment = makeExportPayment({
        paymentDate: new Date('2025-04-15'),
        referenceNumber: 'UTR123456',
        foreignAmount: 5000,
        currency: 'USD',
        buyer: { name: 'Test Buyer Ltd' },
      });
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.generateXml(TENANT_ID, {});
      expect(result).toContain('<?xml version="1.0"');
      expect(result).toContain('<ENVELOPE>');
      expect(result).toContain('<TALLYREQUEST>Import Data</TALLYREQUEST>');
    });

    it('includes payment voucher in XML output', async () => {
      const payment = makeExportPayment({
        paymentDate: new Date('2025-04-15'),
        referenceNumber: 'UTR123456',
        foreignAmount: 5000,
        currency: 'USD',
        buyer: { name: 'Test Buyer Ltd' },
      });
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.generateXml(TENANT_ID, {});
      expect(result).toContain('<VOUCHER VCHTYPE="Receipt"');
      expect(result).toContain('UTR123456');
      expect(result).toContain('5000');
    });

    it('returns minimal XML envelope when no payments', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([]);

      const result = await service.generateXml(TENANT_ID, {});
      expect(result).toContain('<ENVELOPE>');
      expect(result).not.toContain('<VOUCHER');
    });

    it('formats date as YYYYMMDD in voucher XML', async () => {
      const payment = makeExportPayment({
        paymentDate: new Date('2025-04-15'),
        referenceNumber: 'UTR001',
        foreignAmount: 1000,
        currency: 'USD',
        buyer: { name: 'Buyer' },
      });
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.generateXml(TENANT_ID, {});
      expect(result).toContain('<DATE>20250415</DATE>');
    });
  });
});