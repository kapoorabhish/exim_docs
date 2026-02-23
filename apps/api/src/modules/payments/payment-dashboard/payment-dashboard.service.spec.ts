import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentDashboardService } from './payment-dashboard.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeParty, TENANT_ID, PARTY_ID } from '../../../test/fixtures';

describe('PaymentDashboardService', () => {
  let service: PaymentDashboardService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentDashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<PaymentDashboardService>(PaymentDashboardService);
  });

  // ─── getDashboard ──────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    const makeAggregate = (sum = 0, count = 0) => ({ _sum: { inrAmount: sum, totalAmount: sum }, _count: count });

    beforeEach(() => {
      prisma.exportPayment.aggregate.mockResolvedValue(makeAggregate(100000, 2) as any);
      prisma.importPayment.aggregate.mockResolvedValue(makeAggregate(80000, 1) as any);
      prisma.supplierInvoice.aggregate.mockResolvedValue({ _sum: { totalAmount: 50000 }, _count: 3 } as any);
      prisma.commercialInvoice.aggregate.mockResolvedValue({ _sum: { totalAmount: 200000 }, _count: 5 } as any);
      prisma.supplierInvoice.count.mockResolvedValue(2);
      prisma.commercialInvoice.findMany.mockResolvedValue([]);
    });

    it('returns dashboard KPIs', async () => {
      const result = await service.getDashboard(TENANT_ID);
      expect(result.kpis).toBeDefined();
      expect(result.collections).toBeDefined();
      expect(result.payments).toBeDefined();
      expect(result.upcoming).toBeDefined();
    });

    it('computes netPosition as receivables minus payables', async () => {
      prisma.commercialInvoice.aggregate.mockResolvedValue({ _sum: { totalAmount: 200000 }, _count: 5 } as any);
      prisma.supplierInvoice.aggregate.mockResolvedValue({ _sum: { totalAmount: 80000 }, _count: 2 } as any);
      prisma.exportPayment.aggregate.mockResolvedValue(makeAggregate(0, 0) as any);
      prisma.importPayment.aggregate.mockResolvedValue(makeAggregate(0, 0) as any);
      prisma.supplierInvoice.count.mockResolvedValue(0);
      prisma.commercialInvoice.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(TENANT_ID);
      expect(result.kpis.netPosition).toBe(120000);
    });

    it('returns top5Buyers from commercial invoices', async () => {
      const invoice1 = { buyerPartyId: 'buyer-1', totalAmount: 50000, buyer: { id: 'buyer-1', name: 'Buyer A' } };
      const invoice2 = { buyerPartyId: 'buyer-2', totalAmount: 30000, buyer: { id: 'buyer-2', name: 'Buyer B' } };
      prisma.commercialInvoice.findMany.mockResolvedValue([invoice1, invoice2] as any);

      const result = await service.getDashboard(TENANT_ID);
      expect(result.top5Buyers).toHaveLength(2);
      expect(result.top5Buyers[0].totalOutstanding).toBe(50000);
    });

    it('handles null aggregate sums gracefully', async () => {
      prisma.exportPayment.aggregate.mockResolvedValue({ _sum: { inrAmount: null }, _count: 0 } as any);
      prisma.importPayment.aggregate.mockResolvedValue({ _sum: { inrAmount: null }, _count: 0 } as any);
      prisma.supplierInvoice.aggregate.mockResolvedValue({ _sum: { totalAmount: null }, _count: 0 } as any);
      prisma.commercialInvoice.aggregate.mockResolvedValue({ _sum: { totalAmount: null }, _count: 0 } as any);

      const result = await service.getDashboard(TENANT_ID);
      expect(result.kpis.totalReceivables).toBe(0);
      expect(result.kpis.totalPayables).toBe(0);
    });
  });

  // ─── getPartyLedger ────────────────────────────────────────────────────────

  describe('getPartyLedger', () => {
    beforeEach(() => {
      prisma.commercialInvoice.findMany.mockResolvedValue([]);
      prisma.exportPayment.findMany.mockResolvedValue([]);
      prisma.supplierInvoice.findMany.mockResolvedValue([]);
      prisma.importPayment.findMany.mockResolvedValue([]);
      prisma.advancePayment.findMany.mockResolvedValue([]);
    });

    it('throws NotFoundException when party not found', async () => {
      prisma.party.findFirst.mockResolvedValue(null);
      await expect(service.getPartyLedger(TENANT_ID, 'bad-party', {})).rejects.toThrow(NotFoundException);
    });

    it('returns empty ledger for party with no transactions', async () => {
      prisma.party.findFirst.mockResolvedValue(makeParty() as any);

      const result = await service.getPartyLedger(TENANT_ID, PARTY_ID, {});
      expect(result.entries).toHaveLength(0);
      expect(result.closingBalance).toBe(0);
      expect(result.party.id).toBe(PARTY_ID);
    });

    it('builds ledger entries from export invoices (debit)', async () => {
      prisma.party.findFirst.mockResolvedValue(makeParty() as any);
      prisma.commercialInvoice.findMany.mockResolvedValue([
        { id: 'inv-1', invoiceNumber: 'INV/001', date: new Date('2026-01-01'), totalAmount: 10000, currency: 'USD' },
      ] as any);

      const result = await service.getPartyLedger(TENANT_ID, PARTY_ID, {});
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].debit).toBe(10000);
      expect(result.entries[0].credit).toBe(0);
      expect(result.closingBalance).toBe(10000);
    });

    it('builds ledger entries from export payments (credit)', async () => {
      prisma.party.findFirst.mockResolvedValue(makeParty() as any);
      prisma.exportPayment.findMany.mockResolvedValue([
        { id: 'pmt-1', paymentNumber: 'EPAY/001', paymentDate: new Date('2026-01-15'), inrAmount: 8000, currency: 'USD' },
      ] as any);

      const result = await service.getPartyLedger(TENANT_ID, PARTY_ID, {});
      expect(result.entries[0].credit).toBe(8000);
      expect(result.entries[0].debit).toBe(0);
      expect(result.closingBalance).toBe(-8000);
    });

    it('applies date filter when provided', async () => {
      prisma.party.findFirst.mockResolvedValue(makeParty() as any);

      await service.getPartyLedger(TENANT_ID, PARTY_ID, { dateFrom: '2026-01-01', dateTo: '2026-01-31' });
      expect(prisma.commercialInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ date: expect.any(Object) }) }),
      );
    });

    it('paginates ledger entries correctly', async () => {
      prisma.party.findFirst.mockResolvedValue(makeParty() as any);
      const invoices = Array.from({ length: 5 }, (_, i) => ({
        id: `inv-${i}`, invoiceNumber: `INV/00${i}`, date: new Date('2026-01-01'), totalAmount: 1000, currency: 'USD',
      }));
      prisma.commercialInvoice.findMany.mockResolvedValue(invoices as any);

      const result = await service.getPartyLedger(TENANT_ID, PARTY_ID, { page: 1, pageSize: 3 });
      expect(result.entries).toHaveLength(3);
      expect(result.total).toBe(5);
    });
  });
});