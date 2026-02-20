import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeInvoice, makeLineItem, TENANT_ID, USER_ID } from '../../../test/fixtures';

const mockDocNumber = { getNextNumber: jest.fn().mockResolvedValue('INV/2025-26/001') };

describe('InvoiceService', () => {
  let service: InvoiceService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();
    mockDocNumber.getNextNumber.mockResolvedValue('INV/2025-26/001');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocNumberService, useValue: mockDocNumber },
      ],
    }).compile();
    service = module.get<InvoiceService>(InvoiceService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated invoices', async () => {
      prisma.commercialInvoice.findMany.mockResolvedValue([makeInvoice()] as any);
      prisma.commercialInvoice.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns invoice when found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice() as any);
      const result = await service.getById(TENANT_ID, 'inv-id');
      expect(result).toHaveProperty('invoiceNumber');
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates invoice with exchange rate snapshot', async () => {
      mockDocNumber.getNextNumber.mockResolvedValue('INV/2025-26/001');
      prisma.exchangeRate.findFirst.mockResolvedValue({ rate: 83.5 } as any);
      prisma.commercialInvoice.create.mockResolvedValue(makeInvoice() as any);

      await service.create(TENANT_ID, USER_ID, {
        buyerPartyId: 'party-id',
        currency: 'USD',
        lineItems: [{ quantity: 10, unitPrice: 100 }],
      });

      expect(prisma.commercialInvoice.create).toHaveBeenCalled();
    });

    it('uses rate=1 when no exchange rate found', async () => {
      prisma.exchangeRate.findFirst.mockResolvedValue(null);
      prisma.commercialInvoice.create.mockResolvedValue(makeInvoice() as any);

      await service.create(TENANT_ID, USER_ID, { currency: 'USD', lineItems: [] });

      expect(prisma.commercialInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ exchangeRate: 1 }) }),
      );
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException if invoice not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if invoice is LOCKED', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice({ status: 'LOCKED' }) as any);
      await expect(service.update(TENANT_ID, 'inv-id', {})).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException if not DRAFT', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice({ status: 'FINALIZED' }) as any);
      await expect(service.update(TENANT_ID, 'inv-id', {})).rejects.toThrow(BadRequestException);
    });

    it('deletes old line items and updates invoice', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice() as any);
      prisma.invoiceLineItem.deleteMany.mockResolvedValue({ count: 1 } as any);
      prisma.commercialInvoice.update.mockResolvedValue(makeInvoice() as any);

      await service.update(TENANT_ID, 'inv-id', {
        lineItems: [{ quantity: 5, unitPrice: 200 }],
      });

      expect(prisma.invoiceLineItem.deleteMany).toHaveBeenCalledWith({ where: { invoiceId: 'inv-id' } });
    });
  });

  // ─── finalize ──────────────────────────────────────────────────────────────

  describe('finalize', () => {
    it('throws BadRequestException if not DRAFT', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice({ status: 'FINALIZED' }) as any);
      await expect(service.finalize(TENANT_ID, 'inv-id')).rejects.toThrow(BadRequestException);
    });

    it('updates status to FINALIZED', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice() as any);
      prisma.commercialInvoice.update.mockResolvedValue(makeInvoice({ status: 'FINALIZED' }) as any);

      await service.finalize(TENANT_ID, 'inv-id');
      expect(prisma.commercialInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FINALIZED' } }),
      );
    });
  });

  // ─── lock ──────────────────────────────────────────────────────────────────

  describe('lock', () => {
    it('throws BadRequestException if not FINALIZED', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice({ status: 'DRAFT' }) as any);
      await expect(service.lock(TENANT_ID, 'inv-id')).rejects.toThrow(BadRequestException);
    });

    it('updates status to LOCKED', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice({ status: 'FINALIZED' }) as any);
      prisma.commercialInvoice.update.mockResolvedValue(makeInvoice({ status: 'LOCKED' }) as any);

      await service.lock(TENANT_ID, 'inv-id');
      expect(prisma.commercialInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'LOCKED' } }),
      );
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws BadRequestException if not DRAFT', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice({ status: 'FINALIZED' }) as any);
      await expect(service.delete(TENANT_ID, 'inv-id')).rejects.toThrow(BadRequestException);
    });

    it('deletes DRAFT invoice', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice() as any);
      prisma.commercialInvoice.delete.mockResolvedValue({} as any);

      await service.delete(TENANT_ID, 'inv-id');
      expect(prisma.commercialInvoice.delete).toHaveBeenCalled();
    });
  });

  // ─── clone ─────────────────────────────────────────────────────────────────

  describe('clone', () => {
    it('throws NotFoundException if original not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(service.clone(TENANT_ID, USER_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('creates clone with new number and DRAFT status', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice({ lineItems: [] }) as any);
      mockDocNumber.getNextNumber.mockResolvedValue('INV/2025-26/002');
      prisma.commercialInvoice.create.mockResolvedValue(makeInvoice({ invoiceNumber: 'INV/2025-26/002' }) as any);

      const result = await service.clone(TENANT_ID, USER_ID, 'inv-id');
      expect(result).toHaveProperty('invoiceNumber');
    });
  });

  // ─── documentSet ───────────────────────────────────────────────────────────

  describe('documentSet', () => {
    it('throws NotFoundException if invoice not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(service.documentSet(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns linked documents (PL, SB, BRC)', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice({ piId: null }) as any);
      prisma.packingList.findMany.mockResolvedValue([] as any);
      prisma.shippingBill.findMany.mockResolvedValue([] as any);
      prisma.bankRealizationCertificate.findMany.mockResolvedValue([] as any);

      const result = await service.documentSet(TENANT_ID, 'inv-id');
      expect(result).toHaveProperty('packingLists');
      expect(result).toHaveProperty('shippingBills');
    });
  });
});
