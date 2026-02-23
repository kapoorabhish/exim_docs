import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SupplierPoService } from './supplier-po.service';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeSupplierPo, makeSupplierPoLineItem, TENANT_ID, USER_ID, SUPPLIER_ID, SPO_ID } from '../../../test/fixtures';

const mockDocNumber = { getNextNumber: jest.fn().mockResolvedValue('SPO/2025-26/001') };

describe('SupplierPoService', () => {
  let service: SupplierPoService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();
    mockDocNumber.getNextNumber.mockResolvedValue('SPO/2025-26/001');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierPoService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocNumberService, useValue: mockDocNumber },
      ],
    }).compile();
    service = module.get<SupplierPoService>(SupplierPoService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated supplier purchase orders', async () => {
      prisma.supplierPurchaseOrder.findMany.mockResolvedValue([makeSupplierPo()] as any);
      prisma.supplierPurchaseOrder.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies status filter', async () => {
      prisma.supplierPurchaseOrder.findMany.mockResolvedValue([]);
      prisma.supplierPurchaseOrder.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { status: 'APPROVED' });
      expect(prisma.supplierPurchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'APPROVED' }) }),
      );
    });

    it('applies supplierPartyId filter', async () => {
      prisma.supplierPurchaseOrder.findMany.mockResolvedValue([]);
      prisma.supplierPurchaseOrder.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { supplierPartyId: SUPPLIER_ID });
      expect(prisma.supplierPurchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ supplierPartyId: SUPPLIER_ID }) }),
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns the purchase order when found', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(makeSupplierPo() as any);
      const result = await service.getById(TENANT_ID, SPO_ID);
      expect(result.id).toBe(SPO_ID);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('generates SPO number and calculates totalAmount from line items', async () => {
      const lineItems = [
        { description: 'Item A', quantity: 10, unitPrice: 50 },
        { description: 'Item B', quantity: 5, unitPrice: 100 },
      ];
      const created = makeSupplierPo({ totalAmount: 1000, lineItems });
      prisma.supplierPurchaseOrder.create.mockResolvedValue(created as any);

      const result = await service.create(TENANT_ID, USER_ID, {
        supplierPartyId: SUPPLIER_ID,
        currency: 'USD',
        lineItems,
      });

      expect(mockDocNumber.getNextNumber).toHaveBeenCalledWith(TENANT_ID, 'SPO');
      expect(prisma.supplierPurchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            poNumber: 'SPO/2025-26/001',
            totalAmount: 1000, // 10×50 + 5×100
          }),
        }),
      );
      expect(result.totalAmount).toBe(1000);
    });

    it('creates with zero total when no line items', async () => {
      prisma.supplierPurchaseOrder.create.mockResolvedValue(makeSupplierPo({ totalAmount: 0 }) as any);

      await service.create(TENANT_ID, USER_ID, { supplierPartyId: SUPPLIER_ID, currency: 'USD' });
      expect(prisma.supplierPurchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ totalAmount: 0 }) }),
      );
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws BadRequestException when not DRAFT', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(makeSupplierPo({ status: 'APPROVED' }) as any);
      await expect(service.update(TENANT_ID, SPO_ID, {})).rejects.toThrow(BadRequestException);
    });

    it('deletes old line items and recreates them', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(makeSupplierPo() as any);
      prisma.supplierPoLineItem.deleteMany.mockResolvedValue({ count: 1 } as any);
      prisma.supplierPurchaseOrder.update.mockResolvedValue(makeSupplierPo() as any);

      await service.update(TENANT_ID, SPO_ID, {
        lineItems: [{ description: 'Updated Item', quantity: 20, unitPrice: 30 }],
      });

      expect(prisma.supplierPoLineItem.deleteMany).toHaveBeenCalledWith({ where: { poId: SPO_ID } });
      expect(prisma.supplierPurchaseOrder.update).toHaveBeenCalled();
    });
  });

  // ─── submit ────────────────────────────────────────────────────────────────

  describe('submit', () => {
    it('transitions DRAFT → PENDING_APPROVAL', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(makeSupplierPo() as any);
      prisma.supplierPurchaseOrder.update.mockResolvedValue(makeSupplierPo({ status: 'PENDING_APPROVAL' }) as any);

      const result = await service.submit(TENANT_ID, SPO_ID);
      expect(prisma.supplierPurchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'PENDING_APPROVAL' } }),
      );
      expect(result.status).toBe('PENDING_APPROVAL');
    });

    it('throws BadRequestException when not DRAFT', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(makeSupplierPo({ status: 'APPROVED' }) as any);
      await expect(service.submit(TENANT_ID, SPO_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── approve ───────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('transitions PENDING_APPROVAL → APPROVED and sets approvedBy/approvedAt', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(
        makeSupplierPo({ status: 'PENDING_APPROVAL' }) as any,
      );
      prisma.supplierPurchaseOrder.update.mockResolvedValue(
        makeSupplierPo({ status: 'APPROVED', approvedBy: USER_ID, approvedAt: new Date() }) as any,
      );

      const result = await service.approve(TENANT_ID, SPO_ID, USER_ID);
      expect(prisma.supplierPurchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED', approvedBy: USER_ID }),
        }),
      );
      expect(result.status).toBe('APPROVED');
    });

    it('throws BadRequestException when not PENDING_APPROVAL', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(makeSupplierPo({ status: 'DRAFT' }) as any);
      await expect(service.approve(TENANT_ID, SPO_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── reject ────────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('transitions PENDING_APPROVAL → REJECTED', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(
        makeSupplierPo({ status: 'PENDING_APPROVAL' }) as any,
      );
      prisma.supplierPurchaseOrder.update.mockResolvedValue(makeSupplierPo({ status: 'REJECTED' }) as any);

      await service.reject(TENANT_ID, SPO_ID);
      expect(prisma.supplierPurchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'REJECTED' } }),
      );
    });

    it('throws BadRequestException when not PENDING_APPROVAL', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(makeSupplierPo({ status: 'DRAFT' }) as any);
      await expect(service.reject(TENANT_ID, SPO_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── clone ─────────────────────────────────────────────────────────────────

  describe('clone', () => {
    it('throws NotFoundException when source PO not found', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(null);
      await expect(service.clone(TENANT_ID, USER_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('creates a new DRAFT with a new SPO number', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(
        makeSupplierPo({ lineItems: [makeSupplierPoLineItem()] }) as any,
      );
      prisma.supplierPurchaseOrder.create.mockResolvedValue(
        makeSupplierPo({ id: 'new-spo-id', poNumber: 'SPO/2025-26/002', status: 'DRAFT' }) as any,
      );
      mockDocNumber.getNextNumber.mockResolvedValue('SPO/2025-26/002');

      const result = await service.clone(TENANT_ID, USER_ID, SPO_ID);
      expect(result.status).toBe('DRAFT');
      expect(result.poNumber).toBe('SPO/2025-26/002');
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws BadRequestException when not DRAFT', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(makeSupplierPo({ status: 'APPROVED' }) as any);
      await expect(service.delete(TENANT_ID, SPO_ID)).rejects.toThrow(BadRequestException);
    });

    it('deletes a DRAFT order', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(makeSupplierPo() as any);
      prisma.supplierPurchaseOrder.delete.mockResolvedValue(makeSupplierPo() as any);

      const result = await service.delete(TENANT_ID, SPO_ID);
      expect(result.success).toBe(true);
    });
  });

  // ─── updateFulfillmentStatus ────────────────────────────────────────────────

  describe('updateFulfillmentStatus', () => {
    it('sets PARTIALLY_FULFILLED when invoiced qty < PO qty', async () => {
      prisma.supplierPurchaseOrder.findUnique.mockResolvedValue(
        makeSupplierPo({
          lineItems: [makeSupplierPoLineItem({ quantity: 100 })],
          supplierInvoices: [
            { lineItems: [{ quantity: 40 }] },
          ],
        }) as any,
      );
      prisma.supplierPurchaseOrder.update.mockResolvedValue(makeSupplierPo({ status: 'PARTIALLY_FULFILLED' }) as any);

      await service.updateFulfillmentStatus(SPO_ID);
      expect(prisma.supplierPurchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'PARTIALLY_FULFILLED' } }),
      );
    });

    it('sets FULLY_FULFILLED when invoiced qty >= PO qty', async () => {
      prisma.supplierPurchaseOrder.findUnique.mockResolvedValue(
        makeSupplierPo({
          lineItems: [makeSupplierPoLineItem({ quantity: 100 })],
          supplierInvoices: [
            { lineItems: [{ quantity: 100 }] },
          ],
        }) as any,
      );
      prisma.supplierPurchaseOrder.update.mockResolvedValue(makeSupplierPo({ status: 'FULLY_FULFILLED' }) as any);

      await service.updateFulfillmentStatus(SPO_ID);
      expect(prisma.supplierPurchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FULLY_FULFILLED' } }),
      );
    });

    it('does nothing when PO not found', async () => {
      prisma.supplierPurchaseOrder.findUnique.mockResolvedValue(null);
      await service.updateFulfillmentStatus('bad-id');
      expect(prisma.supplierPurchaseOrder.update).not.toHaveBeenCalled();
    });
  });
});