import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../test/prisma-mock';
import { makeTenant } from '../../test/fixtures';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<AdminService>(AdminService);
  });

  // ─── listTenants ───────────────────────────────────────────────────────────

  describe('listTenants', () => {
    it('returns paginated tenants', async () => {
      prisma.tenant.findMany.mockResolvedValue([makeTenant()] as any);
      prisma.tenant.count.mockResolvedValue(1);

      const result = await service.listTenants({});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies status filter', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);
      prisma.tenant.count.mockResolvedValue(0);

      await service.listTenants({ status: 'ACTIVE' });

      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'ACTIVE' }) }),
      );
    });

    it('applies search filter', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);
      prisma.tenant.count.mockResolvedValue(0);

      await service.listTenants({ q: 'test' });

      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });
  });

  // ─── getTenantById ─────────────────────────────────────────────────────────

  describe('getTenantById', () => {
    it('returns tenant with all relation counts', async () => {
      prisma.tenant.findUnique.mockResolvedValue(makeTenant() as any);

      const result = await service.getTenantById('tenant-id');

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ businessProfile: true, _count: expect.any(Object) }),
        }),
      );
    });
  });

  // ─── setTenantStatus ───────────────────────────────────────────────────────

  describe('setTenantStatus', () => {
    it('updates tenant status', async () => {
      prisma.tenant.update.mockResolvedValue(makeTenant({ status: 'SUSPENDED' }) as any);

      await service.setTenantStatus('tenant-id', 'SUSPENDED');

      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SUSPENDED' } }),
      );
    });
  });

  // ─── getPlatformStats ──────────────────────────────────────────────────────

  describe('getPlatformStats', () => {
    it('returns aggregated platform statistics', async () => {
      prisma.tenant.count.mockResolvedValue(10);
      prisma.tenant.groupBy.mockResolvedValue([
        { status: 'ACTIVE', _count: { id: 7 } },
        { status: 'TRIAL', _count: { id: 3 } },
      ] as any);
      prisma.user.count.mockResolvedValue(50);
      prisma.commercialInvoice.count.mockResolvedValue(200);
      prisma.shippingBill.count.mockResolvedValue(100);
      prisma.tenant.findMany.mockResolvedValue([
        { ...makeTenant(), businessProfile: { companyName: 'Top Co' }, _count: { commercialInvoices: 50 }, plan: 'PRO' },
      ] as any);

      const result = await service.getPlatformStats();

      expect(result).toHaveProperty('totalTenants', 10);
      expect(result).toHaveProperty('totalUsers', 50);
      expect(result).toHaveProperty('totalInvoices', 200);
      expect(result).toHaveProperty('activeTenants', 7);
      expect(result).toHaveProperty('trialTenants', 3);
      expect(result.topTenants).toHaveLength(1);
    });

    it('handles empty groupBy results gracefully', async () => {
      prisma.tenant.count.mockResolvedValue(0);
      prisma.tenant.groupBy.mockResolvedValue([] as any);
      prisma.user.count.mockResolvedValue(0);
      prisma.commercialInvoice.count.mockResolvedValue(0);
      prisma.shippingBill.count.mockResolvedValue(0);
      prisma.tenant.findMany.mockResolvedValue([] as any);

      const result = await service.getPlatformStats();

      expect(result.activeTenants).toBe(0);
      expect(result.trialTenants).toBe(0);
      expect(result.topTenants).toHaveLength(0);
    });
  });
});
