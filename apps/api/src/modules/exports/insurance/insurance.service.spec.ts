import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeInvoice, TENANT_ID, USER_ID } from '../../../test/fixtures';

const makeIc = (overrides: Record<string, unknown> = {}) => ({
  id: 'ic-id',
  tenantId: TENANT_ID,
  invoiceId: 'inv-id',
  policyNumber: 'POL-001',
  insurer: 'New India Insurance',
  policyDate: new Date(),
  validUntil: null,
  sumInsured: 90000,
  currency: 'INR',
  premium: 450,
  notes: null,
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('InsuranceService', () => {
  let service: InsuranceService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<InsuranceService>(InsuranceService);
  });

  describe('list', () => {
    it('returns insurance certificates', async () => {
      prisma.insuranceCertificate.findMany.mockResolvedValue([makeIc()] as any);
      const result = await service.list(TENANT_ID, {});
      expect(result).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.insuranceCertificate.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns certificate when found', async () => {
      prisma.insuranceCertificate.findFirst.mockResolvedValue(makeIc() as any);
      const result = await service.getById(TENANT_ID, 'ic-id');
      expect(result).toHaveProperty('policyNumber');
    });
  });

  describe('create', () => {
    it('throws NotFoundException if invoice not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(service.create(TENANT_ID, USER_ID, { invoiceId: 'bad-id' })).rejects.toThrow(NotFoundException);
    });

    it('creates insurance certificate', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice() as any);
      prisma.insuranceCertificate.create.mockResolvedValue(makeIc() as any);

      const result = await service.create(TENANT_ID, USER_ID, { invoiceId: 'inv-id', policyNumber: 'POL-001' });
      expect(result).toHaveProperty('policyNumber');
    });
  });

  describe('update', () => {
    it('throws NotFoundException if certificate not found', async () => {
      prisma.insuranceCertificate.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('updates certificate', async () => {
      prisma.insuranceCertificate.findFirst.mockResolvedValue(makeIc() as any);
      prisma.insuranceCertificate.update.mockResolvedValue(makeIc({ premium: 500 }) as any);

      await service.update(TENANT_ID, 'ic-id', { premium: 500 });
      expect(prisma.insuranceCertificate.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('throws NotFoundException if certificate not found', async () => {
      prisma.insuranceCertificate.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('deletes certificate and returns message', async () => {
      prisma.insuranceCertificate.findFirst.mockResolvedValue(makeIc() as any);
      prisma.insuranceCertificate.delete.mockResolvedValue({} as any);

      const result = await service.delete(TENANT_ID, 'ic-id');
      expect(result).toHaveProperty('message');
    });
  });
});
