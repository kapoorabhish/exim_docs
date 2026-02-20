import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProformaService } from './proforma.service';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeProforma, makeLineItem, TENANT_ID, USER_ID } from '../../../test/fixtures';

const mockDocNumber = { getNextNumber: jest.fn().mockResolvedValue('PI/2025-26/001') };

describe('ProformaService', () => {
  let service: ProformaService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();
    mockDocNumber.getNextNumber.mockResolvedValue('PI/2025-26/001');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProformaService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocNumberService, useValue: mockDocNumber },
      ],
    }).compile();
    service = module.get<ProformaService>(ProformaService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated proforma invoices', async () => {
      prisma.proformaInvoice.findMany.mockResolvedValue([makeProforma()] as any);
      prisma.proformaInvoice.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies status filter', async () => {
      prisma.proformaInvoice.findMany.mockResolvedValue([]);
      prisma.proformaInvoice.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { status: 'DRAFT' });
      expect(prisma.proformaInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'DRAFT' }) }),
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns proforma when found', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(makeProforma() as any);
      const result = await service.getById(TENANT_ID, 'pi-id');
      expect(result).toHaveProperty('piNumber');
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('calls docNumber.getNextNumber with PI type', async () => {
      prisma.proformaInvoice.create.mockResolvedValue(makeProforma() as any);

      await service.create(TENANT_ID, USER_ID, {
        buyerPartyId: 'party-id',
        currency: 'USD',
        date: new Date(),
        lineItems: [{ quantity: 10, unitPrice: 100, description: 'Item' }],
      });

      expect(mockDocNumber.getNextNumber).toHaveBeenCalledWith(TENANT_ID, 'PI');
    });

    it('calculates totalAmount from line items, freight, and insurance', async () => {
      prisma.proformaInvoice.create.mockResolvedValue(makeProforma() as any);

      await service.create(TENANT_ID, USER_ID, {
        lineItems: [{ quantity: 10, unitPrice: 100 }, { quantity: 5, unitPrice: 50 }],
        freight: 100,
        insurance: 50,
      });

      // subtotal = 1000 + 250 = 1250, freight=100, insurance=50 → total=1400
      expect(prisma.proformaInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ totalAmount: 1400 }) }),
      );
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException if proforma not found', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if not in DRAFT status', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(makeProforma({ status: 'FINALIZED' }) as any);
      await expect(service.update(TENANT_ID, 'pi-id', {})).rejects.toThrow(BadRequestException);
    });

    it('deletes old line items and recreates on update', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(makeProforma() as any);
      prisma.piLineItem.deleteMany.mockResolvedValue({ count: 1 } as any);
      prisma.proformaInvoice.update.mockResolvedValue(makeProforma() as any);

      await service.update(TENANT_ID, 'pi-id', {
        lineItems: [{ quantity: 5, unitPrice: 200, description: 'New Item' }],
      });

      expect(prisma.piLineItem.deleteMany).toHaveBeenCalledWith({ where: { piId: 'pi-id' } });
    });
  });

  // ─── finalize ──────────────────────────────────────────────────────────────

  describe('finalize', () => {
    it('throws NotFoundException if not found', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(null);
      await expect(service.finalize(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if not DRAFT', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(makeProforma({ status: 'FINALIZED' }) as any);
      await expect(service.finalize(TENANT_ID, 'pi-id')).rejects.toThrow(BadRequestException);
    });

    it('updates status to FINALIZED', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(makeProforma() as any);
      prisma.proformaInvoice.update.mockResolvedValue(makeProforma({ status: 'FINALIZED' }) as any);

      await service.finalize(TENANT_ID, 'pi-id');
      expect(prisma.proformaInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FINALIZED' } }),
      );
    });
  });

  // ─── revise ────────────────────────────────────────────────────────────────

  describe('revise', () => {
    it('throws BadRequestException if not FINALIZED', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(makeProforma({ status: 'DRAFT' }) as any);
      await expect(service.revise(TENANT_ID, 'pi-id', USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('cancels old PI and creates new version via transaction', async () => {
      const pi = makeProforma({ status: 'FINALIZED', version: 1 });
      prisma.proformaInvoice.findFirst.mockResolvedValue(pi as any);
      mockDocNumber.getNextNumber.mockResolvedValue('PI/2025-26/002');

      const newPi = makeProforma({ piNumber: 'PI/2025-26/002', version: 2, status: 'DRAFT' });
      prisma.$transaction.mockResolvedValue([{}, newPi] as any);

      const result = await service.revise(TENANT_ID, 'pi-id', USER_ID);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveProperty('version');
    });
  });

  // ─── cancel ────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('throws BadRequestException if not DRAFT', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(makeProforma({ status: 'FINALIZED' }) as any);
      await expect(service.cancel(TENANT_ID, 'pi-id')).rejects.toThrow(BadRequestException);
    });

    it('updates status to CANCELLED', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(makeProforma() as any);
      prisma.proformaInvoice.update.mockResolvedValue(makeProforma({ status: 'CANCELLED' }) as any);

      await service.cancel(TENANT_ID, 'pi-id');
      expect(prisma.proformaInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
    });
  });

  // ─── convert ───────────────────────────────────────────────────────────────

  describe('convert', () => {
    it('throws BadRequestException if not FINALIZED', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(makeProforma({ status: 'DRAFT' }) as any);
      await expect(service.convert(TENANT_ID, 'pi-id', USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('creates a CommercialInvoice with exchange rate snapshot', async () => {
      const pi = makeProforma({ status: 'FINALIZED', lineItems: [makeLineItem()] });
      prisma.proformaInvoice.findFirst.mockResolvedValue(pi as any);
      prisma.exchangeRate.findFirst.mockResolvedValue({ rate: 83.5 } as any);
      mockDocNumber.getNextNumber.mockResolvedValue('INV/2025-26/001');
      prisma.$transaction.mockResolvedValue([{}, { id: 'inv-id', invoiceNumber: 'INV/2025-26/001' }] as any);

      const result = await service.convert(TENANT_ID, 'pi-id', USER_ID);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveProperty('invoice');
    });
  });

  // ─── clone ─────────────────────────────────────────────────────────────────

  describe('clone', () => {
    it('throws NotFoundException if original not found', async () => {
      prisma.proformaInvoice.findFirst.mockResolvedValue(null);
      await expect(service.clone(TENANT_ID, USER_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('creates clone with new number, version=1, status=DRAFT', async () => {
      const pi = makeProforma({ lineItems: [makeLineItem()] });
      prisma.proformaInvoice.findFirst.mockResolvedValue(pi as any);
      mockDocNumber.getNextNumber.mockResolvedValue('PI/2025-26/002');
      prisma.proformaInvoice.create.mockResolvedValue(
        makeProforma({ piNumber: 'PI/2025-26/002', version: 1, status: 'DRAFT' }) as any,
      );

      const result = await service.clone(TENANT_ID, USER_ID, 'pi-id');

      expect(prisma.proformaInvoice.create).toHaveBeenCalled();
      expect(result).toHaveProperty('status', 'DRAFT');
    });
  });
});
