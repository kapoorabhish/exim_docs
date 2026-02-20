import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BuyerPoService } from './buyer-po.service';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, USER_ID, PARTY_ID } from '../../../test/fixtures';

const mockDocNumber = { getNextNumber: jest.fn().mockResolvedValue('PO/2025-26/001') };

const makePo = (overrides: Record<string, unknown> = {}) => ({
  id: 'po-id',
  tenantId: TENANT_ID,
  poNumber: 'PO-001',
  buyerPartyId: PARTY_ID,
  status: 'OPEN',
  currency: 'USD',
  totalAmount: 1000,
  notes: null,
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  buyer: { id: PARTY_ID, name: 'Buyer Co' },
  lineItems: [],
  ...overrides,
});

describe('BuyerPoService', () => {
  let service: BuyerPoService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuyerPoService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocNumberService, useValue: mockDocNumber },
      ],
    }).compile();
    service = module.get<BuyerPoService>(BuyerPoService);
  });

  describe('list', () => {
    it('returns paginated POs', async () => {
      prisma.buyerPurchaseOrder.findMany.mockResolvedValue([makePo()] as any);
      prisma.buyerPurchaseOrder.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies status filter', async () => {
      prisma.buyerPurchaseOrder.findMany.mockResolvedValue([]);
      prisma.buyerPurchaseOrder.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { status: 'OPEN' });
      expect(prisma.buyerPurchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'OPEN' }) }),
      );
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.buyerPurchaseOrder.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns PO when found', async () => {
      prisma.buyerPurchaseOrder.findFirst.mockResolvedValue(makePo() as any);
      const result = await service.getById(TENANT_ID, 'po-id');
      expect(result).toHaveProperty('poNumber');
    });
  });

  describe('create', () => {
    it('calculates totalAmount from line items', async () => {
      prisma.buyerPurchaseOrder.create.mockResolvedValue(makePo({ totalAmount: 1500 }) as any);

      await service.create(TENANT_ID, USER_ID, {
        buyerPartyId: PARTY_ID,
        currency: 'USD',
        lineItems: [
          { quantity: 10, unitPrice: 100 },
          { quantity: 5, unitPrice: 20 },
        ],
      });

      expect(prisma.buyerPurchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ totalAmount: 1100 }) }),
      );
    });

    it('creates PO with zero total when no line items', async () => {
      prisma.buyerPurchaseOrder.create.mockResolvedValue(makePo({ totalAmount: 0 }) as any);

      await service.create(TENANT_ID, USER_ID, { buyerPartyId: PARTY_ID, currency: 'USD' });

      expect(prisma.buyerPurchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ totalAmount: 0 }) }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException if PO not found', async () => {
      prisma.buyerPurchaseOrder.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('deletes and recreates line items when provided', async () => {
      prisma.buyerPurchaseOrder.findFirst.mockResolvedValue(makePo() as any);
      prisma.buyerPoLineItem.deleteMany.mockResolvedValue({ count: 1 } as any);
      prisma.buyerPurchaseOrder.update.mockResolvedValue(makePo() as any);

      await service.update(TENANT_ID, 'po-id', {
        lineItems: [{ quantity: 5, unitPrice: 50 }],
      });

      expect(prisma.buyerPoLineItem.deleteMany).toHaveBeenCalledWith({ where: { poId: 'po-id' } });
    });

    it('updates without touching line items when none provided', async () => {
      prisma.buyerPurchaseOrder.findFirst.mockResolvedValue(makePo() as any);
      prisma.buyerPurchaseOrder.update.mockResolvedValue(makePo({ notes: 'Updated' }) as any);

      await service.update(TENANT_ID, 'po-id', { notes: 'Updated' });

      expect(prisma.buyerPoLineItem.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('setStatus', () => {
    it('throws NotFoundException if PO not found', async () => {
      prisma.buyerPurchaseOrder.findFirst.mockResolvedValue(null);
      await expect(service.setStatus(TENANT_ID, 'bad-id', 'CLOSED')).rejects.toThrow(NotFoundException);
    });

    it('updates status', async () => {
      prisma.buyerPurchaseOrder.findFirst.mockResolvedValue(makePo() as any);
      prisma.buyerPurchaseOrder.update.mockResolvedValue(makePo({ status: 'CLOSED' }) as any);

      await service.setStatus(TENANT_ID, 'po-id', 'CLOSED');
      expect(prisma.buyerPurchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CLOSED' } }),
      );
    });
  });

  describe('delete', () => {
    it('throws NotFoundException if PO not found', async () => {
      prisma.buyerPurchaseOrder.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('deletes PO', async () => {
      prisma.buyerPurchaseOrder.findFirst.mockResolvedValue(makePo() as any);
      prisma.buyerPurchaseOrder.delete.mockResolvedValue({} as any);

      await service.delete(TENANT_ID, 'po-id');
      expect(prisma.buyerPurchaseOrder.delete).toHaveBeenCalled();
    });
  });
});
