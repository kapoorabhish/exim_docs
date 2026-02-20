import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PackingListService } from './packing-list.service';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeInvoice, TENANT_ID, USER_ID } from '../../../test/fixtures';

const mockDocNumber = { getNextNumber: jest.fn().mockResolvedValue('PL/2025-26/001') };

const makePackingList = (overrides: Record<string, unknown> = {}) => ({
  id: 'pl-id',
  tenantId: TENANT_ID,
  plNumber: 'PL/2025-26/001',
  invoiceId: 'inv-id',
  date: new Date(),
  status: 'DRAFT',
  shippingMarks: null,
  notes: null,
  totalPackages: 2,
  totalNetWeight: 20,
  totalGrossWeight: 22,
  totalCbm: 0.5,
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('PackingListService', () => {
  let service: PackingListService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();
    mockDocNumber.getNextNumber.mockResolvedValue('PL/2025-26/001');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackingListService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocNumberService, useValue: mockDocNumber },
      ],
    }).compile();
    service = module.get<PackingListService>(PackingListService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns packing lists', async () => {
      prisma.packingList.findMany.mockResolvedValue([makePackingList()] as any);
      const result = await service.list(TENANT_ID, {});
      expect(result).toHaveLength(1);
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.packingList.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns packing list when found', async () => {
      prisma.packingList.findFirst.mockResolvedValue(makePackingList() as any);
      const result = await service.getById(TENANT_ID, 'pl-id');
      expect(result).toHaveProperty('plNumber');
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws NotFoundException if invoice not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(service.create(TENANT_ID, USER_ID, { invoiceId: 'bad-id' })).rejects.toThrow(NotFoundException);
    });

    it('creates packing list and pre-fills packages from invoice line items when none provided', async () => {
      const invoice = makeInvoice({
        lineItems: [
          { id: 'li-1', lineNumber: 1, description: 'Item A', quantity: 10, unitPrice: 50, amount: 500, uomCode: 'PCS', hsCode: null, netWeight: 2, grossWeight: 2.5, createdAt: new Date(), updatedAt: new Date() },
        ],
      });
      prisma.commercialInvoice.findFirst.mockResolvedValue(invoice as any);
      prisma.packingList.create.mockResolvedValue(makePackingList() as any);

      await service.create(TENANT_ID, USER_ID, { invoiceId: 'inv-id' });

      expect(prisma.packingList.create).toHaveBeenCalled();
    });

    it('uses provided packages when given', async () => {
      const invoice = makeInvoice({ lineItems: [] });
      prisma.commercialInvoice.findFirst.mockResolvedValue(invoice as any);
      prisma.packingList.create.mockResolvedValue(makePackingList() as any);

      await service.create(TENANT_ID, USER_ID, {
        invoiceId: 'inv-id',
        packages: [{ packageNo: '1/1', contents: 'Books', quantity: 1, netWeight: 5, grossWeight: 5.5 }],
      });

      expect(prisma.packingList.create).toHaveBeenCalled();
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException if packing list not found', async () => {
      prisma.packingList.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if not DRAFT', async () => {
      prisma.packingList.findFirst.mockResolvedValue(makePackingList({ status: 'FINALIZED' }) as any);
      await expect(service.update(TENANT_ID, 'pl-id', {})).rejects.toThrow(BadRequestException);
    });

    it('uses transaction to update packing items and packing list', async () => {
      prisma.packingList.findFirst.mockResolvedValue(makePackingList() as any);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        if (typeof fn === 'function') return fn(prisma);
        return Promise.all(fn as Promise<unknown>[]);
      });
      prisma.packingItem.deleteMany.mockResolvedValue({ count: 0 } as any);
      prisma.packingItem.createMany.mockResolvedValue({ count: 1 } as any);
      prisma.packingList.update.mockResolvedValue(makePackingList() as any);

      await service.update(TENANT_ID, 'pl-id', {
        packages: [{ packageNo: '1/1', contents: 'X', quantity: 1, netWeight: 1, grossWeight: 1 }],
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── finalize ──────────────────────────────────────────────────────────────

  describe('finalize', () => {
    it('throws BadRequestException if not DRAFT', async () => {
      prisma.packingList.findFirst.mockResolvedValue(makePackingList({ status: 'FINALIZED' }) as any);
      await expect(service.finalize(TENANT_ID, 'pl-id')).rejects.toThrow(BadRequestException);
    });

    it('updates status to FINALIZED', async () => {
      prisma.packingList.findFirst.mockResolvedValue(makePackingList() as any);
      prisma.packingList.update.mockResolvedValue(makePackingList({ status: 'FINALIZED' }) as any);

      await service.finalize(TENANT_ID, 'pl-id');
      expect(prisma.packingList.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FINALIZED' } }),
      );
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws BadRequestException if not DRAFT', async () => {
      prisma.packingList.findFirst.mockResolvedValue(makePackingList({ status: 'FINALIZED' }) as any);
      await expect(service.delete(TENANT_ID, 'pl-id')).rejects.toThrow(BadRequestException);
    });

    it('deletes DRAFT packing list', async () => {
      prisma.packingList.findFirst.mockResolvedValue(makePackingList() as any);
      prisma.packingList.delete.mockResolvedValue({} as any);

      const result = await service.delete(TENANT_ID, 'pl-id');
      expect(result).toHaveProperty('message');
    });
  });
});
