import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LcService } from './lc.service';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, USER_ID, PARTY_ID, LC_ID, makeLcDocument, makeLcDiscrepancy } from '../../../test/fixtures';

const mockDocNumber = { getNextNumber: jest.fn().mockResolvedValue('LC/2025-26/001') };

const makeLc = (overrides: Record<string, unknown> = {}) => ({
  id: LC_ID,
  tenantId: TENANT_ID,
  lcNumber: 'LC/2025-26/001',
  lcType: 'SIGHT',
  status: 'DRAFT',
  buyerPartyId: PARTY_ID,
  issuingBank: 'HSBC Hong Kong',
  advisingBank: null,
  isIrrevocable: true,
  isConfirmed: false,
  amount: 50000,
  currency: 'USD',
  expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  latestShipmentDate: null,
  portOfLoading: 'INMAA',
  portOfDischarge: 'USLAX',
  partialShipmentAllowed: false,
  transhipmentAllowed: false,
  submissionDate: null,
  bankReferenceNumber: null,
  proformaInvoiceId: null,
  notes: null,
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  buyer: { id: PARTY_ID, name: 'Test Buyer', country: 'US' },
  requiredDocs: [],
  discrepancies: [],
  _count: { requiredDocs: 0, discrepancies: 0 },
  ...overrides,
});

describe('LcService', () => {
  let service: LcService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();
    mockDocNumber.getNextNumber.mockResolvedValue('LC/2025-26/001');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LcService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocNumberService, useValue: mockDocNumber },
      ],
    }).compile();
    service = module.get<LcService>(LcService);
  });

  describe('list', () => {
    it('returns paginated LC list', async () => {
      prisma.letterOfCredit.findMany.mockResolvedValue([makeLc()] as any);
      prisma.letterOfCredit.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies status filter', async () => {
      prisma.letterOfCredit.findMany.mockResolvedValue([]);
      prisma.letterOfCredit.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { status: 'ACTIVE' });
      expect(prisma.letterOfCredit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('applies buyerPartyId filter', async () => {
      prisma.letterOfCredit.findMany.mockResolvedValue([]);
      prisma.letterOfCredit.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { buyerPartyId: PARTY_ID });
      expect(prisma.letterOfCredit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ buyerPartyId: PARTY_ID }),
        }),
      );
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when LC not found', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns full LC with docs and discrepancies', async () => {
      const lc = makeLc({ requiredDocs: [makeLcDocument()], discrepancies: [] });
      prisma.letterOfCredit.findFirst.mockResolvedValue(lc as any);

      const result = await service.getById(TENANT_ID, LC_ID);
      expect(result.lcNumber).toBe('LC/2025-26/001');
    });
  });

  describe('create', () => {
    it('generates LC number via DocNumberService', async () => {
      prisma.letterOfCredit.create.mockResolvedValue(makeLc() as any);

      await service.create(TENANT_ID, USER_ID, {
        buyerPartyId: PARTY_ID,
        lcDate: '2025-04-01',
        issuingBank: 'HSBC',
        currency: 'USD',
        amount: 50000,
        expiryDate: '2025-07-01',
      });

      expect(mockDocNumber.getNextNumber).toHaveBeenCalledWith(TENANT_ID, 'LC');
      expect(prisma.letterOfCredit.create).toHaveBeenCalled();
    });

    it('creates LC with required docs when provided', async () => {
      const lc = makeLc({ requiredDocs: [makeLcDocument()] });
      prisma.letterOfCredit.create.mockResolvedValue(lc as any);

      await service.create(TENANT_ID, USER_ID, {
        buyerPartyId: PARTY_ID,
        lcDate: '2025-04-01',
        issuingBank: 'HSBC',
        currency: 'USD',
        amount: 50000,
        expiryDate: '2025-07-01',
        requiredDocs: [{ documentType: 'COMMERCIAL_INVOICE', originalsRequired: 1 }],
      });

      expect(prisma.letterOfCredit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requiredDocs: expect.objectContaining({ create: expect.any(Array) }),
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when LC not found', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when LC is not DRAFT', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(makeLc({ status: 'ACTIVE' }) as any);
      await expect(service.update(TENANT_ID, LC_ID, { notes: 'test' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updates DRAFT LC via transaction', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(makeLc({ status: 'DRAFT' }) as any);
      const updatedLc = makeLc({ notes: 'Updated' });
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      (prisma as any).letterOfCredit.update.mockResolvedValue(updatedLc as any);
      (prisma as any).lcRequiredDocument.deleteMany.mockResolvedValue({ count: 0 } as any);

      const result = await service.update(TENANT_ID, LC_ID, { notes: 'Updated' });
      expect(result).toBeTruthy();
    });
  });

  describe('transitionStatus', () => {
    it('throws NotFoundException when LC not found', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(null);
      await expect(
        service.transitionStatus(TENANT_ID, 'bad-id', USER_ID, { status: 'ACTIVE' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for invalid status transition', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(makeLc({ status: 'DRAFT' }) as any);
      await expect(
        service.transitionStatus(TENANT_ID, LC_ID, USER_ID, { status: 'CLOSED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('transitions DRAFT → ACTIVE successfully', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(makeLc({ status: 'DRAFT' }) as any);
      prisma.letterOfCredit.update.mockResolvedValue(makeLc({ status: 'ACTIVE' }) as any);

      await service.transitionStatus(TENANT_ID, LC_ID, USER_ID, { status: 'ACTIVE' });
      expect(prisma.letterOfCredit.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
      );
    });

    it('sets submissionDate when transitioning to SUBMITTED', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(makeLc({ status: 'ACTIVE' }) as any);
      prisma.letterOfCredit.update.mockResolvedValue(makeLc({ status: 'SUBMITTED' }) as any);

      await service.transitionStatus(TENANT_ID, LC_ID, USER_ID, {
        status: 'SUBMITTED',
        submissionDate: '2025-05-01',
        bankReferenceNumber: 'BNK-REF-001',
      });

      expect(prisma.letterOfCredit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SUBMITTED',
            submissionDate: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('updateDocStatus', () => {
    it('throws NotFoundException when LC not found', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(null);
      await expect(
        service.updateDocStatus(TENANT_ID, 'bad-lc', 'doc-id', { status: 'READY' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates document status', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(makeLc() as any);
      prisma.lcRequiredDocument.update.mockResolvedValue(makeLcDocument({ status: 'READY' }) as any);

      await service.updateDocStatus(TENANT_ID, LC_ID, 'lc-doc-id', { status: 'READY' });
      expect(prisma.lcRequiredDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'READY' } }),
      );
    });
  });

  describe('addDiscrepancy', () => {
    it('throws NotFoundException when LC not found', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(null);
      await expect(
        service.addDiscrepancy(TENANT_ID, 'bad-lc', USER_ID, { description: 'Issue' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates discrepancy with default BLOCKING severity', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(makeLc() as any);
      prisma.lcDiscrepancy.create.mockResolvedValue(makeLcDiscrepancy() as any);

      await service.addDiscrepancy(TENANT_ID, LC_ID, USER_ID, {
        description: 'Partial shipment not permitted',
      });

      expect(prisma.lcDiscrepancy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: 'BLOCKING',
            description: 'Partial shipment not permitted',
          }),
        }),
      );
    });
  });

  describe('resolveDiscrepancy', () => {
    it('throws NotFoundException when LC not found', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(null);
      await expect(
        service.resolveDiscrepancy(TENANT_ID, 'bad-lc', 'disc-id', { status: 'RESOLVED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('resolves discrepancy and sets resolvedAt', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(makeLc() as any);
      prisma.lcDiscrepancy.update.mockResolvedValue(
        makeLcDiscrepancy({ status: 'RESOLVED', resolvedAt: new Date() }) as any,
      );

      await service.resolveDiscrepancy(TENANT_ID, LC_ID, 'lc-disc-id', {
        status: 'RESOLVED',
        resolution: 'Amendment obtained',
      });

      expect(prisma.lcDiscrepancy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'RESOLVED',
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when LC not found', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when LC is not DRAFT', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(makeLc({ status: 'ACTIVE' }) as any);
      await expect(service.delete(TENANT_ID, LC_ID)).rejects.toThrow(BadRequestException);
    });

    it('deletes DRAFT LC', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(makeLc({ status: 'DRAFT' }) as any);
      prisma.letterOfCredit.delete.mockResolvedValue({} as any);

      const result = await service.delete(TENANT_ID, LC_ID);
      expect(prisma.letterOfCredit.delete).toHaveBeenCalledWith({ where: { id: LC_ID } });
      expect(result).toHaveProperty('message');
    });
  });
});