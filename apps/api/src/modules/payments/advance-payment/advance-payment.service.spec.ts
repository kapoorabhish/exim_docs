import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdvancePaymentService } from './advance-payment.service';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeAdvancePayment, TENANT_ID, USER_ID, ADVANCE_PAYMENT_ID } from '../../../test/fixtures';

const mockDocNumber = { getNextNumber: jest.fn().mockResolvedValue('ADV/2025-26/001') };

describe('AdvancePaymentService', () => {
  let service: AdvancePaymentService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();
    mockDocNumber.getNextNumber.mockResolvedValue('ADV/2025-26/001');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancePaymentService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocNumberService, useValue: mockDocNumber },
      ],
    }).compile();
    service = module.get<AdvancePaymentService>(AdvancePaymentService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated advances', async () => {
      prisma.advancePayment.findMany.mockResolvedValue([makeAdvancePayment()] as any);
      prisma.advancePayment.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies type filter', async () => {
      prisma.advancePayment.findMany.mockResolvedValue([]);
      prisma.advancePayment.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { type: 'RECEIVED' });
      expect(prisma.advancePayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ type: 'RECEIVED' }) }),
      );
    });

    it('applies status filter', async () => {
      prisma.advancePayment.findMany.mockResolvedValue([]);
      prisma.advancePayment.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { status: 'OPEN' });
      expect(prisma.advancePayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'OPEN' }) }),
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.advancePayment.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns advance when found', async () => {
      prisma.advancePayment.findFirst.mockResolvedValue(makeAdvancePayment() as any);
      const result = await service.getById(TENANT_ID, ADVANCE_PAYMENT_ID);
      expect(result.id).toBe(ADVANCE_PAYMENT_ID);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates advance with auto-generated ADV number', async () => {
      const created = makeAdvancePayment({ advanceNumber: 'ADV/2025-26/001', status: 'OPEN', adjustedAmount: 0 });
      prisma.advancePayment.create.mockResolvedValue(created as any);

      const result = await service.create(TENANT_ID, USER_ID, {
        type: 'RECEIVED',
        partyId: 'party-1',
        currency: 'USD',
        foreignAmount: 2000,
        exchangeRate: 83.5,
        inrAmount: 167000,
        advanceDate: new Date(),
      });

      expect(mockDocNumber.getNextNumber).toHaveBeenCalledWith(TENANT_ID, 'ADV');
      expect(result.advanceNumber).toBe('ADV/2025-26/001');
      expect(result.status).toBe('OPEN');
      expect(result.adjustedAmount).toBe(0);
    });
  });

  // ─── adjust ────────────────────────────────────────────────────────────────

  describe('adjust', () => {
    it('throws NotFoundException when advance not found', async () => {
      prisma.advancePayment.findFirst.mockResolvedValue(null);
      await expect(service.adjust(TENANT_ID, 'bad-id', { adjustedAmount: 500 })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when advance is fully adjusted', async () => {
      prisma.advancePayment.findFirst.mockResolvedValue(makeAdvancePayment({ status: 'FULLY_ADJUSTED' }) as any);
      await expect(service.adjust(TENANT_ID, ADVANCE_PAYMENT_ID, { adjustedAmount: 100 })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when adjustment exceeds available balance', async () => {
      prisma.advancePayment.findFirst.mockResolvedValue(
        makeAdvancePayment({ foreignAmount: 2000, adjustedAmount: 1500 }) as any,
      );
      await expect(service.adjust(TENANT_ID, ADVANCE_PAYMENT_ID, { adjustedAmount: 600 })).rejects.toThrow(BadRequestException);
    });

    it('creates adjustment record and updates advance to PARTIALLY_ADJUSTED', async () => {
      prisma.advancePayment.findFirst.mockResolvedValue(
        makeAdvancePayment({ foreignAmount: 2000, adjustedAmount: 0 }) as any,
      );
      const adjustmentRecord = { id: 'adj-1', advanceId: ADVANCE_PAYMENT_ID, adjustedAmount: 500 };
      (prisma.$transaction as any).mockImplementation(async (ops: any[]) => {
        return Promise.all(ops.map((op) => op));
      });
      prisma.advancePaymentAdjustment.create.mockResolvedValue(adjustmentRecord as any);
      prisma.advancePayment.update.mockResolvedValue(
        makeAdvancePayment({ adjustedAmount: 500, status: 'PARTIALLY_ADJUSTED' }) as any,
      );

      const result = await service.adjust(TENANT_ID, ADVANCE_PAYMENT_ID, { adjustedAmount: 500 });
      expect(prisma.advancePaymentAdjustment.create).toHaveBeenCalled();
      expect(prisma.advancePayment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PARTIALLY_ADJUSTED' }) }),
      );
      expect(result).toEqual(adjustmentRecord);
    });

    it('sets FULLY_ADJUSTED when amount equals advance total', async () => {
      prisma.advancePayment.findFirst.mockResolvedValue(
        makeAdvancePayment({ foreignAmount: 2000, adjustedAmount: 0 }) as any,
      );
      (prisma.$transaction as any).mockImplementation(async (ops: any[]) => Promise.all(ops.map((op) => op)));
      prisma.advancePaymentAdjustment.create.mockResolvedValue({ id: 'adj-2' } as any);
      prisma.advancePayment.update.mockResolvedValue(
        makeAdvancePayment({ adjustedAmount: 2000, status: 'FULLY_ADJUSTED' }) as any,
      );

      await service.adjust(TENANT_ID, ADVANCE_PAYMENT_ID, { adjustedAmount: 2000 });
      expect(prisma.advancePayment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FULLY_ADJUSTED' }) }),
      );
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.advancePayment.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when advance is not OPEN', async () => {
      prisma.advancePayment.findFirst.mockResolvedValue(
        makeAdvancePayment({ status: 'PARTIALLY_ADJUSTED' }) as any,
      );
      await expect(service.delete(TENANT_ID, ADVANCE_PAYMENT_ID)).rejects.toThrow(BadRequestException);
    });

    it('deletes OPEN advance successfully', async () => {
      prisma.advancePayment.findFirst.mockResolvedValue(makeAdvancePayment({ status: 'OPEN' }) as any);
      prisma.advancePayment.delete.mockResolvedValue(makeAdvancePayment() as any);

      const result = await service.delete(TENANT_ID, ADVANCE_PAYMENT_ID);
      expect(result.success).toBe(true);
    });
  });
});