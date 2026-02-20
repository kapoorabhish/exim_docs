import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ShippingBillService } from './shipping-bill.service';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { InvoiceService } from '../invoice/invoice.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeInvoice, TENANT_ID, USER_ID } from '../../../test/fixtures';

const mockDocNumber = { getNextNumber: jest.fn().mockResolvedValue('SB/2025-26/001') };
const mockInvoiceService = { lock: jest.fn().mockResolvedValue({ status: 'LOCKED' }) };

const makeSb = (overrides: Record<string, unknown> = {}) => ({
  id: 'sb-id',
  tenantId: TENANT_ID,
  sbNumber: 'SB/2025-26/001',
  sbType: 'FREE',
  status: 'DRAFT',
  invoiceId: 'inv-id',
  date: new Date(),
  portCode: 'INMAA',
  modeOfShipment: 'SEA',
  countryOfDestination: 'US',
  exchangeRate: 83.5,
  totalFobInr: 83500,
  freightInr: null,
  insuranceInr: null,
  notes: null,
  leoNumber: null,
  leoDate: null,
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ShippingBillService', () => {
  let service: ShippingBillService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingBillService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocNumberService, useValue: mockDocNumber },
        { provide: InvoiceService, useValue: mockInvoiceService },
      ],
    }).compile();
    service = module.get<ShippingBillService>(ShippingBillService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns shipping bills', async () => {
      prisma.shippingBill.findMany.mockResolvedValue([makeSb()] as any);
      const result = await service.list(TENANT_ID, {});
      expect(result).toHaveLength(1);
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.shippingBill.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns shipping bill when found', async () => {
      prisma.shippingBill.findFirst.mockResolvedValue(makeSb() as any);
      const result = await service.getById(TENANT_ID, 'sb-id');
      expect(result).toHaveProperty('sbNumber');
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws NotFoundException if invoice not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(service.create(TENANT_ID, USER_ID, { invoiceId: 'bad-id' })).rejects.toThrow(NotFoundException);
    });

    it('creates shipping bill from invoice line items when none provided', async () => {
      const inv = makeInvoice({
        lineItems: [{ id: 'li-1', lineNumber: 1, description: 'Item', hsCode: '6109', quantity: 10, uomCode: 'PCS', unitPrice: 100, amount: 1000, netWeight: null, grossWeight: null, createdAt: new Date(), updatedAt: new Date() }],
        exchangeRate: 83.5,
      });
      prisma.commercialInvoice.findFirst.mockResolvedValue(inv as any);
      prisma.shippingBill.create.mockResolvedValue(makeSb() as any);

      await service.create(TENANT_ID, USER_ID, { invoiceId: 'inv-id', portCode: 'INMAA' });

      expect(prisma.shippingBill.create).toHaveBeenCalled();
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException if not found', async () => {
      prisma.shippingBill.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if not DRAFT', async () => {
      prisma.shippingBill.findFirst.mockResolvedValue(makeSb({ status: 'FILED' }) as any);
      await expect(service.update(TENANT_ID, 'sb-id', {})).rejects.toThrow(BadRequestException);
    });

    it('uses transaction to update line items and shipping bill', async () => {
      prisma.shippingBill.findFirst.mockResolvedValue(makeSb() as any);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        if (typeof fn === 'function') return fn(prisma);
        return Promise.all(fn as Promise<unknown>[]);
      });
      prisma.sbLineItem.deleteMany.mockResolvedValue({ count: 0 } as any);
      prisma.sbLineItem.createMany.mockResolvedValue({ count: 1 } as any);
      prisma.shippingBill.update.mockResolvedValue(makeSb() as any);

      await service.update(TENANT_ID, 'sb-id', { lineItems: [{ lineNumber: 1, description: 'Item', fobValueInr: 8350 }] });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── transitionStatus ──────────────────────────────────────────────────────

  describe('transitionStatus', () => {
    it('throws NotFoundException if SB not found', async () => {
      prisma.shippingBill.findFirst.mockResolvedValue(null);
      await expect(
        service.transitionStatus(TENANT_ID, 'bad-id', USER_ID, { status: 'FILED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for invalid next status', async () => {
      prisma.shippingBill.findFirst.mockResolvedValue(makeSb({ status: 'DRAFT' }) as any);
      await expect(
        service.transitionStatus(TENANT_ID, 'sb-id', USER_ID, { status: 'SHIPPED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires leoNumber and leoDate when transitioning to LEO', async () => {
      prisma.shippingBill.findFirst.mockResolvedValue(makeSb({ status: 'ASSESSED' }) as any);
      await expect(
        service.transitionStatus(TENANT_ID, 'sb-id', USER_ID, { status: 'LEO' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('transitions DRAFT to FILED and locks invoice', async () => {
      prisma.shippingBill.findFirst.mockResolvedValue(makeSb({ status: 'DRAFT', invoiceId: 'inv-id' }) as any);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        if (typeof fn === 'function') return fn(prisma);
        return Promise.all(fn as Promise<unknown>[]);
      });
      prisma.shippingBill.update.mockResolvedValue(makeSb({ status: 'FILED' }) as any);
      prisma.sbStatusHistory.create.mockResolvedValue({} as any);

      await service.transitionStatus(TENANT_ID, 'sb-id', USER_ID, { status: 'FILED' });

      expect(mockInvoiceService.lock).toHaveBeenCalledWith(TENANT_ID, 'inv-id');
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws BadRequestException if not DRAFT', async () => {
      prisma.shippingBill.findFirst.mockResolvedValue(makeSb({ status: 'FILED' }) as any);
      await expect(service.delete(TENANT_ID, 'sb-id')).rejects.toThrow(BadRequestException);
    });

    it('deletes DRAFT shipping bill', async () => {
      prisma.shippingBill.findFirst.mockResolvedValue(makeSb() as any);
      prisma.shippingBill.delete.mockResolvedValue({} as any);

      const result = await service.delete(TENANT_ID, 'sb-id');
      expect(result).toHaveProperty('message');
    });
  });
});
