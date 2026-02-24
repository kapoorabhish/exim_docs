import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LutService } from './lut.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, USER_ID, LUT_ID, makeLutRecord } from '../../../test/fixtures';

describe('LutService', () => {
  let service: LutService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LutService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<LutService>(LutService);
  });

  describe('list', () => {
    it('returns all LUT records with computed status', async () => {
      const lut = makeLutRecord();
      prisma.lutRecord.findMany.mockResolvedValue([lut] as any);

      const result = await service.list(TENANT_ID);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('status');
    });

    it('returns ACTIVE status for active LUT within valid date range', async () => {
      const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const lut = makeLutRecord({ status: 'ACTIVE', expiryDate: future });
      prisma.lutRecord.findMany.mockResolvedValue([lut] as any);

      const result = await service.list(TENANT_ID);
      expect(result[0].status).toBe('ACTIVE');
    });

    it('returns EXPIRED status for expired LUT', async () => {
      const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const lut = makeLutRecord({ status: 'ACTIVE', expiryDate: past });
      prisma.lutRecord.findMany.mockResolvedValue([lut] as any);

      const result = await service.list(TENANT_ID);
      expect(result[0].status).toBe('EXPIRED');
    });

    it('returns EXPIRING status for LUT expiring within 30 days', async () => {
      const soon = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const lut = makeLutRecord({ status: 'ACTIVE', expiryDate: soon });
      prisma.lutRecord.findMany.mockResolvedValue([lut] as any);

      const result = await service.list(TENANT_ID);
      expect(result[0].status).toBe('EXPIRING');
    });

    it('returns APPLIED status unchanged', async () => {
      const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const lut = makeLutRecord({ status: 'APPLIED', expiryDate: future });
      prisma.lutRecord.findMany.mockResolvedValue([lut] as any);

      const result = await service.list(TENANT_ID);
      expect(result[0].status).toBe('APPLIED');
    });
  });

  describe('create', () => {
    it('creates LUT with auto-computed expiry date (365 days from filing)', async () => {
      const created = makeLutRecord({ status: 'APPLIED' });
      prisma.lutRecord.create.mockResolvedValue(created as any);

      await service.create(TENANT_ID, USER_ID, {
        arnNumber: 'AD170322001234E',
        filingDate: '2025-04-01',
        financialYear: '2025-26',
      });

      expect(prisma.lutRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPLIED',
            financialYear: '2025-26',
          }),
        }),
      );
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.lutRecord.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns LUT with computed status when found', async () => {
      prisma.lutRecord.findFirst.mockResolvedValue(makeLutRecord() as any);
      const result = await service.getById(TENANT_ID, LUT_ID);
      expect(result).toHaveProperty('arnNumber');
      expect(result).toHaveProperty('status');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when LUT not found', async () => {
      prisma.lutRecord.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('updates allowed fields', async () => {
      prisma.lutRecord.findFirst.mockResolvedValue(makeLutRecord() as any);
      prisma.lutRecord.update.mockResolvedValue(makeLutRecord({ notes: 'Updated' }) as any);

      await service.update(TENANT_ID, LUT_ID, { notes: 'Updated' });
      expect(prisma.lutRecord.update).toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('throws NotFoundException when LUT not found', async () => {
      prisma.lutRecord.findFirst.mockResolvedValue(null);
      await expect(service.activate(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when LUT is not APPLIED', async () => {
      prisma.lutRecord.findFirst.mockResolvedValue(makeLutRecord({ status: 'ACTIVE' }) as any);
      await expect(service.activate(TENANT_ID, LUT_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when active LUT already exists for the same FY', async () => {
      prisma.lutRecord.findFirst
        .mockResolvedValueOnce(makeLutRecord({ status: 'APPLIED' }) as any)
        .mockResolvedValueOnce(makeLutRecord({ id: 'other-lut-id', status: 'ACTIVE' }) as any);

      await expect(service.activate(TENANT_ID, LUT_ID)).rejects.toThrow(BadRequestException);
    });

    it('activates APPLIED LUT successfully', async () => {
      prisma.lutRecord.findFirst
        .mockResolvedValueOnce(makeLutRecord({ status: 'APPLIED' }) as any)
        .mockResolvedValueOnce(null);
      prisma.lutRecord.update.mockResolvedValue(makeLutRecord({ status: 'ACTIVE' }) as any);

      const result = await service.activate(TENANT_ID, LUT_ID);
      expect(prisma.lutRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'ACTIVE' } }),
      );
      expect(result).toBeTruthy();
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when not found', async () => {
      prisma.lutRecord.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when LUT is not APPLIED', async () => {
      prisma.lutRecord.findFirst.mockResolvedValue(makeLutRecord({ status: 'ACTIVE' }) as any);
      await expect(service.delete(TENANT_ID, LUT_ID)).rejects.toThrow(BadRequestException);
    });

    it('deletes APPLIED LUT successfully', async () => {
      prisma.lutRecord.findFirst.mockResolvedValue(makeLutRecord({ status: 'APPLIED' }) as any);
      prisma.lutRecord.delete.mockResolvedValue({} as any);

      const result = await service.delete(TENANT_ID, LUT_ID);
      expect(prisma.lutRecord.delete).toHaveBeenCalledWith({ where: { id: LUT_ID } });
      expect(result).toHaveProperty('message');
    });
  });

  describe('getActiveLut', () => {
    it('returns null when no active LUT exists', async () => {
      prisma.lutRecord.findMany.mockResolvedValue([]);
      const result = await service.getActiveLut(TENANT_ID);
      expect(result).toBeNull();
    });

    it('returns active LUT when found', async () => {
      const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const lut = makeLutRecord({ status: 'ACTIVE', expiryDate: future });
      prisma.lutRecord.findMany.mockResolvedValue([lut] as any);

      const result = await service.getActiveLut(TENANT_ID);
      expect(result).toBeTruthy();
      expect(result!.status).toBe('ACTIVE');
    });
  });
});