import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentRemindersService } from './payment-reminders.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, makeExportPayment, makeInvoice, EXPORT_PAYMENT_ID } from '../../../test/fixtures';

describe('PaymentRemindersService', () => {
  let service: PaymentRemindersService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentRemindersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<PaymentRemindersService>(PaymentRemindersService);
  });

  describe('getAgingReport', () => {
    it('returns empty array when no pending payments', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([]);

      const result = await service.getAgingReport(TENANT_ID);
      expect(result).toEqual([]);
    });

    it('returns CURRENT bucket for payments with no allocations', async () => {
      const payment = makeExportPayment({ allocations: [] });
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.getAgingReport(TENANT_ID);
      expect(result).toHaveLength(1);
      expect(result[0].ageBucket).toBe('CURRENT');
      expect(result[0].daysElapsed).toBe(0);
    });

    it('assigns correct age bucket for overdue payment', async () => {
      const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      const payment = makeExportPayment({
        allocations: [
          { invoice: { id: 'inv-id', invoiceNumber: 'INV/001', date: oldDate } },
        ],
      });
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.getAgingReport(TENANT_ID);
      expect(result[0].ageBucket).toBe('31_60');
      expect(result[0].daysElapsed).toBeGreaterThan(30);
    });

    it('assigns OVER_90 bucket for payments over 90 days old', async () => {
      const veryOldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const payment = makeExportPayment({
        allocations: [{ invoice: { id: 'inv-id', invoiceNumber: 'INV/001', date: veryOldDate } }],
      });
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.getAgingReport(TENANT_ID);
      expect(result[0].ageBucket).toBe('OVER_90');
    });

    it('includes buyer info in result', async () => {
      const payment = makeExportPayment({ allocations: [] });
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.getAgingReport(TENANT_ID);
      expect(result[0]).toHaveProperty('buyer');
    });
  });

  describe('getCalendarEvents', () => {
    it('returns empty array when no finalized invoices in month', async () => {
      prisma.commercialInvoice.findMany.mockResolvedValue([]);

      const result = await service.getCalendarEvents(TENANT_ID, '2025-04');
      expect(result).toEqual([]);
    });

    it('maps invoices to calendar event format', async () => {
      const inv = makeInvoice({
        id: 'inv-id',
        invoiceNumber: 'INV/001',
        date: new Date('2025-04-10'),
        totalAmount: 1000,
        currency: 'USD',
        buyer: { name: 'Test Buyer' },
      });
      prisma.commercialInvoice.findMany.mockResolvedValue([inv] as any);

      const result = await service.getCalendarEvents(TENANT_ID, '2025-04');
      expect(result).toHaveLength(1);
      expect(result[0].invoiceNumber).toBe('INV/001');
      expect(result[0].amount).toBe(1000);
      expect(result[0].currency).toBe('USD');
    });
  });

  describe('sendReminder', () => {
    it('throws NotFoundException when payment not found', async () => {
      prisma.exportPayment.findFirst.mockResolvedValue(null);
      await expect(service.sendReminder(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns reminder confirmation when payment found', async () => {
      const payment = makeExportPayment({ buyer: { name: 'Test Buyer Ltd' } });
      prisma.exportPayment.findFirst.mockResolvedValue(payment as any);

      const result = await service.sendReminder(TENANT_ID, EXPORT_PAYMENT_ID);
      expect(result).toHaveProperty('message');
      expect(result.buyerName).toBe('Test Buyer Ltd');
    });
  });
});