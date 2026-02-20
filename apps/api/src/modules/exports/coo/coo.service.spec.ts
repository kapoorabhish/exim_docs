import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CooService } from './coo.service';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeInvoice, TENANT_ID, USER_ID } from '../../../test/fixtures';

const mockDocNumber = { getNextNumber: jest.fn().mockResolvedValue('COO/2025-26/001') };

const makeCoo = (overrides: Record<string, unknown> = {}) => ({
  id: 'coo-id',
  tenantId: TENANT_ID,
  cooNumber: 'COO/2025-26/001',
  invoiceId: 'inv-id',
  issueDate: new Date(),
  cooType: 'NON_PREFERENTIAL',
  issuingAuthority: 'DGFT',
  status: 'DRAFT',
  documentUrl: null,
  notes: null,
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('CooService', () => {
  let service: CooService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CooService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocNumberService, useValue: mockDocNumber },
      ],
    }).compile();
    service = module.get<CooService>(CooService);
  });

  describe('list', () => {
    it('returns COOs', async () => {
      prisma.certificateOfOrigin.findMany.mockResolvedValue([makeCoo()] as any);
      const result = await service.list(TENANT_ID, {});
      expect(result).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.certificateOfOrigin.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns COO when found', async () => {
      prisma.certificateOfOrigin.findFirst.mockResolvedValue(makeCoo() as any);
      const result = await service.getById(TENANT_ID, 'coo-id');
      expect(result).toHaveProperty('cooNumber');
    });
  });

  describe('create', () => {
    it('throws NotFoundException if invoice not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(service.create(TENANT_ID, USER_ID, { invoiceId: 'bad-id' })).rejects.toThrow(NotFoundException);
    });

    it('creates COO with generated number', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice() as any);
      prisma.certificateOfOrigin.create.mockResolvedValue(makeCoo() as any);

      await service.create(TENANT_ID, USER_ID, { invoiceId: 'inv-id' });

      expect(mockDocNumber.getNextNumber).toHaveBeenCalledWith(TENANT_ID, 'COO');
      expect(prisma.certificateOfOrigin.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException if COO not found', async () => {
      prisma.certificateOfOrigin.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if not DRAFT', async () => {
      prisma.certificateOfOrigin.findFirst.mockResolvedValue(makeCoo({ status: 'ISSUED' }) as any);
      await expect(service.update(TENANT_ID, 'coo-id', {})).rejects.toThrow(BadRequestException);
    });

    it('updates DRAFT COO', async () => {
      prisma.certificateOfOrigin.findFirst.mockResolvedValue(makeCoo() as any);
      prisma.certificateOfOrigin.update.mockResolvedValue(makeCoo({ issuingAuthority: 'Chamber' }) as any);

      await service.update(TENANT_ID, 'coo-id', { issuingAuthority: 'Chamber' });
      expect(prisma.certificateOfOrigin.update).toHaveBeenCalled();
    });
  });

  describe('transitionStatus', () => {
    it('throws BadRequestException for invalid next status', async () => {
      prisma.certificateOfOrigin.findFirst.mockResolvedValue(makeCoo({ status: 'DRAFT' }) as any);
      await expect(
        service.transitionStatus(TENANT_ID, 'coo-id', { status: 'ISSUED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('transitions DRAFT to SUBMITTED', async () => {
      prisma.certificateOfOrigin.findFirst.mockResolvedValue(makeCoo({ status: 'DRAFT' }) as any);
      prisma.certificateOfOrigin.update.mockResolvedValue(makeCoo({ status: 'SUBMITTED' }) as any);

      await service.transitionStatus(TENANT_ID, 'coo-id', { status: 'SUBMITTED' });
      expect(prisma.certificateOfOrigin.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'SUBMITTED' }) }),
      );
    });

    it('throws BadRequestException when no more transitions allowed (from ISSUED)', async () => {
      prisma.certificateOfOrigin.findFirst.mockResolvedValue(makeCoo({ status: 'ISSUED' }) as any);
      await expect(
        service.transitionStatus(TENANT_ID, 'coo-id', { status: 'SUBMITTED' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('throws BadRequestException if not DRAFT', async () => {
      prisma.certificateOfOrigin.findFirst.mockResolvedValue(makeCoo({ status: 'SUBMITTED' }) as any);
      await expect(service.delete(TENANT_ID, 'coo-id')).rejects.toThrow(BadRequestException);
    });

    it('deletes DRAFT COO', async () => {
      prisma.certificateOfOrigin.findFirst.mockResolvedValue(makeCoo() as any);
      prisma.certificateOfOrigin.delete.mockResolvedValue({} as any);

      const result = await service.delete(TENANT_ID, 'coo-id');
      expect(result).toHaveProperty('message');
    });
  });
});
