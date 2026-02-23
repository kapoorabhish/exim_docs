import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { SupplierPoService } from '../supplier-po/supplier-po.service';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import {
  makeSupplierInvoice,
  makeSupplierPo,
  TENANT_ID,
  USER_ID,
  SUPPLIER_ID,
  SINV_ID,
  SPO_ID,
} from '../../../test/fixtures';

const mockDocNumber = { getNextNumber: jest.fn().mockResolvedValue('SINV/2025-26/001') };
const mockSupplierPoService = { updateFulfillmentStatus: jest.fn().mockResolvedValue(undefined) };

describe('SupplierInvoiceService', () => {
  let service: SupplierInvoiceService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();
    mockDocNumber.getNextNumber.mockResolvedValue('SINV/2025-26/001');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierInvoiceService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocNumberService, useValue: mockDocNumber },
        { provide: SupplierPoService, useValue: mockSupplierPoService },
      ],
    }).compile();
    service = module.get<SupplierInvoiceService>(SupplierInvoiceService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated supplier invoices', async () => {
      prisma.supplierInvoice.findMany.mockResolvedValue([makeSupplierInvoice()] as any);
      prisma.supplierInvoice.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies status filter', async () => {
      prisma.supplierInvoice.findMany.mockResolvedValue([]);
      prisma.supplierInvoice.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { status: 'RECEIVED' });
      expect(prisma.supplierInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'RECEIVED' }) }),
      );
    });

    it('applies poId filter', async () => {
      prisma.supplierInvoice.findMany.mockResolvedValue([]);
      prisma.supplierInvoice.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { poId: SPO_ID });
      expect(prisma.supplierInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ poId: SPO_ID }) }),
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.supplierInvoice.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns invoice with related data', async () => {
      prisma.supplierInvoice.findFirst.mockResolvedValue(makeSupplierInvoice() as any);
      const result = await service.getById(TENANT_ID, SINV_ID);
      expect(result.id).toBe(SINV_ID);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws NotFoundException when linked PO not found', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.create(TENANT_ID, USER_ID, {
          supplierPartyId: SUPPLIER_ID,
          invoiceDate: new Date(),
          exchangeRate: 83.5,
          poId: SPO_ID,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates standalone invoice without PO', async () => {
      prisma.supplierInvoice.create.mockResolvedValue(makeSupplierInvoice() as any);

      const result = await service.create(TENANT_ID, USER_ID, {
        supplierPartyId: SUPPLIER_ID,
        invoiceDate: new Date(),
        exchangeRate: 83.5,
        lineItems: [{ description: 'Item', quantity: 10, unitPrice: 50 }],
      });

      expect(mockDocNumber.getNextNumber).toHaveBeenCalledWith(TENANT_ID, 'SINV');
      expect(mockSupplierPoService.updateFulfillmentStatus).not.toHaveBeenCalled();
      expect(result.invoiceNumber).toBe('SINV/2025-26/001');
    });

    it('creates invoice linked to PO and triggers fulfillment update', async () => {
      prisma.supplierPurchaseOrder.findFirst.mockResolvedValue(makeSupplierPo() as any);
      prisma.supplierInvoice.create.mockResolvedValue(makeSupplierInvoice({ poId: SPO_ID }) as any);

      await service.create(TENANT_ID, USER_ID, {
        supplierPartyId: SUPPLIER_ID,
        invoiceDate: new Date(),
        exchangeRate: 83.5,
        poId: SPO_ID,
        lineItems: [],
      });

      expect(mockSupplierPoService.updateFulfillmentStatus).toHaveBeenCalledWith(SPO_ID);
    });
  });

  // ─── receive ───────────────────────────────────────────────────────────────

  describe('receive', () => {
    it('transitions DRAFT → RECEIVED', async () => {
      prisma.supplierInvoice.findFirst.mockResolvedValue(makeSupplierInvoice() as any);
      prisma.supplierInvoice.update.mockResolvedValue(makeSupplierInvoice({ status: 'RECEIVED' }) as any);

      const result = await service.receive(TENANT_ID, SINV_ID);
      expect(prisma.supplierInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'RECEIVED' } }),
      );
      expect(result.status).toBe('RECEIVED');
    });

    it('throws BadRequestException when not DRAFT', async () => {
      prisma.supplierInvoice.findFirst.mockResolvedValue(makeSupplierInvoice({ status: 'RECEIVED' }) as any);
      await expect(service.receive(TENANT_ID, SINV_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getDocumentSet ────────────────────────────────────────────────────────

  describe('getDocumentSet', () => {
    it('throws NotFoundException when invoice not found', async () => {
      prisma.supplierInvoice.findFirst.mockResolvedValue(null);
      await expect(service.getDocumentSet(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns aggregated document set', async () => {
      const fullInvoice = makeSupplierInvoice({
        po: makeSupplierPo(),
        billsOfEntry: [],
        importBls: [],
      });
      prisma.supplierInvoice.findFirst.mockResolvedValue(fullInvoice as any);

      const result = await service.getDocumentSet(TENANT_ID, SINV_ID);
      expect(result.id).toBe(SINV_ID);
      expect(result).toHaveProperty('po');
      expect(result).toHaveProperty('billsOfEntry');
      expect(result).toHaveProperty('importBls');
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws BadRequestException when not DRAFT', async () => {
      prisma.supplierInvoice.findFirst.mockResolvedValue(makeSupplierInvoice({ status: 'RECEIVED' }) as any);
      await expect(service.delete(TENANT_ID, SINV_ID)).rejects.toThrow(BadRequestException);
    });

    it('deletes a DRAFT invoice', async () => {
      prisma.supplierInvoice.findFirst.mockResolvedValue(makeSupplierInvoice() as any);
      prisma.supplierInvoice.delete.mockResolvedValue(makeSupplierInvoice() as any);

      const result = await service.delete(TENANT_ID, SINV_ID);
      expect(result.success).toBe(true);
    });
  });
});