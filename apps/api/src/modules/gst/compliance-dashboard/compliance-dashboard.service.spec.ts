import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceDashboardService } from './compliance-dashboard.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, makeLutRecord, makeBusinessProfile } from '../../../test/fixtures';

describe('ComplianceDashboardService', () => {
  let service: ComplianceDashboardService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceDashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ComplianceDashboardService>(ComplianceDashboardService);
  });

  describe('getDashboard', () => {
    it('returns dashboard with active LUT info', async () => {
      const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const lut = makeLutRecord({ expiryDate: future });
      prisma.lutRecord.findMany.mockResolvedValue([lut] as any);
      prisma.commercialInvoice.count.mockResolvedValue(5);
      prisma.billOfEntry.aggregate.mockResolvedValue({
        _sum: { igst: 250000 },
        _count: 3,
      } as any);
      prisma.businessProfile.findUnique.mockResolvedValue(makeBusinessProfile() as any);

      const result = await service.getDashboard(TENANT_ID);
      expect(result.lut.hasActive).toBe(true);
      expect(result.lut.daysRemaining).toBeGreaterThan(0);
      expect(result.gstr1.pendingInvoices).toBe(5);
      expect(result.igstCredit.unclaimedTotal).toBe(250000);
    });

    it('returns hasActive=false and null daysRemaining when no active LUT', async () => {
      prisma.lutRecord.findMany.mockResolvedValue([]);
      prisma.commercialInvoice.count.mockResolvedValue(0);
      prisma.billOfEntry.aggregate.mockResolvedValue({ _sum: { igst: null }, _count: 0 } as any);
      prisma.businessProfile.findUnique.mockResolvedValue(makeBusinessProfile() as any);

      const result = await service.getDashboard(TENANT_ID);
      expect(result.lut.hasActive).toBe(false);
      expect(result.lut.daysRemaining).toBeNull();
      expect(result.lut.expiryDate).toBeNull();
    });

    it('handles null business profile gracefully', async () => {
      prisma.lutRecord.findMany.mockResolvedValue([]);
      prisma.commercialInvoice.count.mockResolvedValue(0);
      prisma.billOfEntry.aggregate.mockResolvedValue({ _sum: { igst: null }, _count: 0 } as any);
      prisma.businessProfile.findUnique.mockResolvedValue(null);

      const result = await service.getDashboard(TENANT_ID);
      expect(result.iec.status).toBe('ACTIVE');
      expect(result.iec.lastConfirmedAt).toBeNull();
    });

    it('returns zero igstCredit totals when no unclaimed BoEs', async () => {
      prisma.lutRecord.findMany.mockResolvedValue([]);
      prisma.commercialInvoice.count.mockResolvedValue(0);
      prisma.billOfEntry.aggregate.mockResolvedValue({ _sum: { igst: null }, _count: 0 } as any);
      prisma.businessProfile.findUnique.mockResolvedValue(makeBusinessProfile() as any);

      const result = await service.getDashboard(TENANT_ID);
      expect(result.igstCredit.unclaimedCount).toBe(0);
      expect(result.igstCredit.unclaimedTotal).toBe(0);
    });
  });
});