import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BillOfLadingService } from './bill-of-lading.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeInvoice, TENANT_ID, USER_ID } from '../../../test/fixtures';

const makeBl = (overrides: Record<string, unknown> = {}) => ({
  id: 'bl-id',
  tenantId: TENANT_ID,
  blNumber: 'BL-001',
  invoiceId: 'inv-id',
  shippingBillId: null,
  blDate: new Date(),
  vessel: 'MV Test',
  voyage: 'V001',
  portOfLoading: 'INNSA',
  portOfDischarge: 'USLAX',
  status: 'ISSUED',
  notes: null,
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('BillOfLadingService', () => {
  let service: BillOfLadingService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillOfLadingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<BillOfLadingService>(BillOfLadingService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns bills of lading', async () => {
      prisma.billOfLading.findMany.mockResolvedValue([makeBl()] as any);
      const result = await service.list(TENANT_ID, {});
      expect(result).toHaveLength(1);
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.billOfLading.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns B/L when found', async () => {
      prisma.billOfLading.findFirst.mockResolvedValue(makeBl() as any);
      const result = await service.getById(TENANT_ID, 'bl-id');
      expect(result).toHaveProperty('blNumber');
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws NotFoundException if invoice not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(service.create(TENANT_ID, USER_ID, { invoiceId: 'bad-id' })).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if shipping bill not found when provided', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice() as any);
      prisma.shippingBill.findFirst.mockResolvedValue(null);
      await expect(
        service.create(TENANT_ID, USER_ID, { invoiceId: 'inv-id', shippingBillId: 'bad-sb' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates B/L successfully', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice() as any);
      prisma.billOfLading.create.mockResolvedValue(makeBl() as any);

      await service.create(TENANT_ID, USER_ID, { invoiceId: 'inv-id', blNumber: 'BL-001' });

      expect(prisma.billOfLading.create).toHaveBeenCalled();
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException if B/L not found', async () => {
      prisma.billOfLading.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('updates B/L data', async () => {
      prisma.billOfLading.findFirst.mockResolvedValue(makeBl() as any);
      prisma.billOfLading.update.mockResolvedValue(makeBl({ vessel: 'MV Updated' }) as any);

      await service.update(TENANT_ID, 'bl-id', { vessel: 'MV Updated' });
      expect(prisma.billOfLading.update).toHaveBeenCalled();
    });
  });

  // ─── updateStatus ──────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('throws NotFoundException if B/L not found', async () => {
      prisma.billOfLading.findFirst.mockResolvedValue(null);
      await expect(service.updateStatus(TENANT_ID, 'bad-id', 'SURRENDERED')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for invalid status', async () => {
      prisma.billOfLading.findFirst.mockResolvedValue(makeBl() as any);
      await expect(service.updateStatus(TENANT_ID, 'bl-id', 'INVALID')).rejects.toThrow(BadRequestException);
    });

    it('updates to a valid status', async () => {
      prisma.billOfLading.findFirst.mockResolvedValue(makeBl() as any);
      prisma.billOfLading.update.mockResolvedValue(makeBl({ status: 'SURRENDERED' }) as any);

      await service.updateStatus(TENANT_ID, 'bl-id', 'SURRENDERED');
      expect(prisma.billOfLading.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'SURRENDERED' } }),
      );
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws NotFoundException if B/L not found', async () => {
      prisma.billOfLading.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('deletes B/L and returns message', async () => {
      prisma.billOfLading.findFirst.mockResolvedValue(makeBl() as any);
      prisma.billOfLading.delete.mockResolvedValue({} as any);

      const result = await service.delete(TENANT_ID, 'bl-id');
      expect(result).toHaveProperty('message');
    });
  });
});
