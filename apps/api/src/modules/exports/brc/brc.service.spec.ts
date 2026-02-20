import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BrcService } from './brc.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeInvoice, TENANT_ID, USER_ID } from '../../../test/fixtures';

const makeBrc = (overrides: Record<string, unknown> = {}) => ({
  id: 'brc-id',
  tenantId: TENANT_ID,
  brcNumber: null,
  invoiceId: 'inv-id',
  shippingBillId: null,
  foreignCurrency: 'USD',
  foreignAmount: 1000,
  inrAmount: 83500,
  bankName: 'HDFC Bank',
  bankRefNumber: 'REF123',
  realizationDate: new Date(),
  status: 'PENDING',
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('BrcService', () => {
  let service: BrcService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrcService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<BrcService>(BrcService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns BRCs', async () => {
      prisma.bankRealizationCertificate.findMany.mockResolvedValue([makeBrc()] as any);
      const result = await service.list(TENANT_ID, {});
      expect(result).toHaveLength(1);
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.bankRealizationCertificate.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns BRC when found', async () => {
      prisma.bankRealizationCertificate.findFirst.mockResolvedValue(makeBrc() as any);
      const result = await service.getById(TENANT_ID, 'brc-id');
      expect(result).toHaveProperty('foreignCurrency');
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

    it('creates BRC successfully', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice() as any);
      prisma.bankRealizationCertificate.create.mockResolvedValue(makeBrc() as any);

      const result = await service.create(TENANT_ID, USER_ID, {
        invoiceId: 'inv-id',
        foreignCurrency: 'USD',
        foreignAmount: 1000,
        inrAmount: 83500,
      });
      expect(result).toHaveProperty('foreignCurrency');
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException if BRC not found', async () => {
      prisma.bankRealizationCertificate.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('updates BRC', async () => {
      prisma.bankRealizationCertificate.findFirst.mockResolvedValue(makeBrc() as any);
      prisma.bankRealizationCertificate.update.mockResolvedValue(makeBrc({ inrAmount: 84000 }) as any);

      const result = await service.update(TENANT_ID, 'brc-id', { inrAmount: 84000 });
      expect(result).toHaveProperty('inrAmount');
    });
  });

  // ─── markReceived ──────────────────────────────────────────────────────────

  describe('markReceived', () => {
    it('throws NotFoundException if BRC not found', async () => {
      prisma.bankRealizationCertificate.findFirst.mockResolvedValue(null);
      await expect(service.markReceived(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('marks BRC as RECEIVED with optional number', async () => {
      prisma.bankRealizationCertificate.findFirst.mockResolvedValue(makeBrc() as any);
      prisma.bankRealizationCertificate.update.mockResolvedValue(makeBrc({ status: 'RECEIVED', brcNumber: 'BRC/001' }) as any);

      await service.markReceived(TENANT_ID, 'brc-id', 'BRC/001');
      expect(prisma.bankRealizationCertificate.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'RECEIVED', brcNumber: 'BRC/001' }) }),
      );
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws NotFoundException if BRC not found', async () => {
      prisma.bankRealizationCertificate.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('deletes BRC and returns message', async () => {
      prisma.bankRealizationCertificate.findFirst.mockResolvedValue(makeBrc() as any);
      prisma.bankRealizationCertificate.delete.mockResolvedValue({} as any);

      const result = await service.delete(TENANT_ID, 'brc-id');
      expect(result).toHaveProperty('message');
    });
  });
});
