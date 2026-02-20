import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductService } from './product.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { makeProduct, TENANT_ID } from '../../../test/fixtures';

describe('ProductService', () => {
  let service: ProductService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ProductService>(ProductService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated products', async () => {
      prisma.product.findMany.mockResolvedValue([makeProduct()] as any);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies search filter when q is provided', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { q: 'shirt' } as any);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns product when found', async () => {
      prisma.product.findFirst.mockResolvedValue(makeProduct() as any);
      const result = await service.getById(TENANT_ID, 'product-id');
      expect(result).toHaveProperty('name');
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws ConflictException if product with same SKU exists', async () => {
      prisma.product.findFirst.mockResolvedValue(makeProduct() as any);
      await expect(
        service.create(TENANT_ID, { sku: 'SKU-001', name: 'Test' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('creates product and auto-fills HS code rates when available', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.hsCode.findFirst.mockResolvedValue({ bcdRate: 20, igstRate: 12 } as any);
      prisma.product.create.mockResolvedValue(makeProduct() as any);

      await service.create(TENANT_ID, { sku: 'NEW-001', name: 'New Product', hsCode: '6109.10' } as any);

      expect(prisma.product.create).toHaveBeenCalled();
    });

    it('creates product without HS code lookup when rates are provided', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue(makeProduct() as any);

      await service.create(TENANT_ID, { sku: 'NEW-001', name: 'New', bcdRate: 20, igstRate: 12 } as any);

      expect(prisma.hsCode.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException if product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('updates product successfully', async () => {
      prisma.product.findFirst.mockResolvedValue(makeProduct() as any);
      prisma.product.update.mockResolvedValue(makeProduct({ name: 'Updated' }) as any);

      const result = await service.update(TENANT_ID, 'product-id', { name: 'Updated' } as any);
      expect(result).toHaveProperty('name');
    });
  });

  // ─── deactivate / delete ───────────────────────────────────────────────────

  describe('deactivate', () => {
    it('deactivates product', async () => {
      prisma.product.findFirst.mockResolvedValue(makeProduct() as any);
      prisma.product.update.mockResolvedValue(makeProduct({ isActive: false }) as any);

      await service.deactivate(TENANT_ID, 'product-id');
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });
  });

  describe('delete', () => {
    it('deletes product and returns success message', async () => {
      prisma.product.findFirst.mockResolvedValue(makeProduct() as any);
      prisma.product.delete.mockResolvedValue({} as any);

      const result = await service.delete(TENANT_ID, 'product-id');
      expect(result).toHaveProperty('message');
    });
  });

  // ─── csvTemplate / importCsv ───────────────────────────────────────────────

  describe('csvTemplate', () => {
    it('returns CSV string with headers', () => {
      const csv = service.csvTemplate();
      expect(csv).toContain('sku,name');
    });
  });

  describe('importCsv', () => {
    it('creates products from valid CSV rows', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue(makeProduct() as any);

      const csv = Buffer.from('sku,name\nTEE-001,White T-Shirt\n');
      const result = await service.importCsv(TENANT_ID, csv);

      expect(result.created).toBe(1);
    });

    it('skips rows missing sku or name', async () => {
      const csv = Buffer.from('sku,name\n,White T-Shirt\n');
      const result = await service.importCsv(TENANT_ID, csv);

      expect(result.skipped).toBe(1);
    });

    it('skips duplicate SKUs', async () => {
      prisma.product.findFirst.mockResolvedValue(makeProduct() as any);

      const csv = Buffer.from('sku,name\nTEE-001,Dupe Shirt\n');
      const result = await service.importCsv(TENANT_ID, csv);

      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
    });
  });
});
