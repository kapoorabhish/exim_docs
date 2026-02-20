import { Test, TestingModule } from '@nestjs/testing';
import { ReferenceService } from './reference.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';

describe('ReferenceService', () => {
  let service: ReferenceService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferenceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ReferenceService>(ReferenceService);
  });

  // ─── searchPorts ───────────────────────────────────────────────────────────

  describe('searchPorts', () => {
    it('returns ports list', async () => {
      prisma.port.findMany.mockResolvedValue([{ code: 'INNSA', name: 'Nhava Sheva' }] as any);
      const result = await service.searchPorts();
      expect(result).toHaveLength(1);
    });

    it('applies search filter when q is provided', async () => {
      prisma.port.findMany.mockResolvedValue([] as any);
      await service.searchPorts('nhava');
      expect(prisma.port.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });

    it('filters by country', async () => {
      prisma.port.findMany.mockResolvedValue([] as any);
      await service.searchPorts(undefined, 'in');
      expect(prisma.port.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ country: 'IN' }) }),
      );
    });
  });

  // ─── searchCountries ───────────────────────────────────────────────────────

  describe('searchCountries', () => {
    it('returns countries list', async () => {
      prisma.country.findMany.mockResolvedValue([{ code: 'IN', name: 'India' }] as any);
      const result = await service.searchCountries();
      expect(result).toHaveLength(1);
    });

    it('applies search filter when q is provided', async () => {
      prisma.country.findMany.mockResolvedValue([] as any);
      await service.searchCountries('india');
      expect(prisma.country.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });
  });

  // ─── searchHsCodes ─────────────────────────────────────────────────────────

  describe('searchHsCodes', () => {
    it('returns HS codes list', async () => {
      prisma.hsCode.findMany.mockResolvedValue([{ code: '6109.10', description: 'T-shirts' }] as any);
      const result = await service.searchHsCodes();
      expect(result).toHaveLength(1);
    });

    it('searches by code prefix when q starts with a digit', async () => {
      prisma.hsCode.findMany.mockResolvedValue([] as any);
      await service.searchHsCodes('6109');
      expect(prisma.hsCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: [{ code: { startsWith: '6109' } }] }) }),
      );
    });

    it('searches by description when q is text', async () => {
      prisma.hsCode.findMany.mockResolvedValue([] as any);
      await service.searchHsCodes('cotton');
      expect(prisma.hsCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.arrayContaining([{ description: expect.any(Object) }]) }) }),
      );
    });
  });

  // ─── listUoms / listIncoterms ──────────────────────────────────────────────

  describe('listUoms', () => {
    it('returns UOM list', async () => {
      prisma.uom.findMany.mockResolvedValue([{ code: 'PCS', name: 'Pieces' }] as any);
      const result = await service.listUoms();
      expect(result).toHaveLength(1);
    });
  });

  describe('listIncoterms', () => {
    it('returns incoterms list', async () => {
      prisma.incoterm.findMany.mockResolvedValue([{ code: 'FOB', name: 'Free on Board' }] as any);
      const result = await service.listIncoterms();
      expect(result).toHaveLength(1);
    });
  });
});
