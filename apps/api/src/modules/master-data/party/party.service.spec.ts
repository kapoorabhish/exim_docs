import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PartyService } from './party.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeParty, TENANT_ID } from '../../../test/fixtures';

describe('PartyService', () => {
  let service: PartyService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<PartyService>(PartyService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated parties', async () => {
      prisma.party.findMany.mockResolvedValue([makeParty()] as any);
      prisma.party.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies type filter when provided', async () => {
      prisma.party.findMany.mockResolvedValue([]);
      prisma.party.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { type: 'BUYER' } as any);

      expect(prisma.party.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ type: 'BUYER' }) }),
      );
    });

    it('applies search filter when q is provided', async () => {
      prisma.party.findMany.mockResolvedValue([]);
      prisma.party.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { q: 'Acme' } as any);

      expect(prisma.party.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when party not found', async () => {
      prisma.party.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns party when found', async () => {
      prisma.party.findFirst.mockResolvedValue(makeParty() as any);
      const result = await service.getById(TENANT_ID, 'party-id');
      expect(result).toHaveProperty('name');
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws ConflictException if party with same name+country exists', async () => {
      prisma.party.findFirst.mockResolvedValue(makeParty() as any);
      await expect(
        service.create(TENANT_ID, { name: 'Test Buyer Ltd', country: 'US', type: 'BUYER' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('creates party when no duplicate exists', async () => {
      prisma.party.findFirst.mockResolvedValue(null);
      prisma.party.create.mockResolvedValue(makeParty() as any);

      const result = await service.create(TENANT_ID, { name: 'New Party', country: 'US', type: 'BUYER' } as any);
      expect(result).toHaveProperty('name');
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException if party not found', async () => {
      prisma.party.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('updates party successfully', async () => {
      prisma.party.findFirst.mockResolvedValue(makeParty() as any);
      prisma.party.update.mockResolvedValue(makeParty({ city: 'Los Angeles' }) as any);

      const result = await service.update(TENANT_ID, 'party-id', { city: 'Los Angeles' } as any);
      expect(result).toHaveProperty('city');
    });
  });

  // ─── deactivate ────────────────────────────────────────────────────────────

  describe('deactivate', () => {
    it('deactivates party successfully', async () => {
      prisma.party.findFirst.mockResolvedValue(makeParty() as any);
      prisma.party.update.mockResolvedValue(makeParty({ isActive: false }) as any);

      await service.deactivate(TENANT_ID, 'party-id');
      expect(prisma.party.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes party and returns success message', async () => {
      prisma.party.findFirst.mockResolvedValue(makeParty() as any);
      prisma.party.delete.mockResolvedValue({} as any);

      const result = await service.delete(TENANT_ID, 'party-id');
      expect(result).toHaveProperty('message');
    });
  });

  // ─── csvTemplate ───────────────────────────────────────────────────────────

  describe('csvTemplate', () => {
    it('returns a non-empty CSV string with headers', () => {
      const csv = service.csvTemplate();
      expect(csv).toContain('type,name,country');
    });
  });

  // ─── importCsv ─────────────────────────────────────────────────────────────

  describe('importCsv', () => {
    it('creates parties from valid CSV rows', async () => {
      prisma.party.findFirst.mockResolvedValue(null);
      prisma.party.create.mockResolvedValue(makeParty() as any);

      const csv = Buffer.from('type,name,country\nBUYER,Acme Corp,US\n');
      const result = await service.importCsv(TENANT_ID, csv);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('skips rows with missing required fields', async () => {
      const csv = Buffer.from('type,name,country\nBUYER,,US\n');
      const result = await service.importCsv(TENANT_ID, csv);

      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('skips duplicate parties', async () => {
      prisma.party.findFirst.mockResolvedValue(makeParty() as any);

      const csv = Buffer.from('type,name,country\nBUYER,Test Buyer Ltd,US\n');
      const result = await service.importCsv(TENANT_ID, csv);

      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
    });
  });
});
