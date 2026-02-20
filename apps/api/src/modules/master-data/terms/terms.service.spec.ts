import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TermsService } from './terms.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID } from '../../../test/fixtures';

const makeTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: 'tmpl-id',
  tenantId: TENANT_ID,
  name: 'Standard Terms',
  documentType: 'PI',
  content: 'All sales are final.',
  isDefault: false,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('TermsService', () => {
  let service: TermsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TermsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<TermsService>(TermsService);
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns all templates for a tenant', async () => {
      prisma.termsTemplate.findMany.mockResolvedValue([makeTemplate()] as any);
      const result = await service.list(TENANT_ID);
      expect(result).toHaveLength(1);
    });

    it('filters by documentType when provided', async () => {
      prisma.termsTemplate.findMany.mockResolvedValue([] as any);
      await service.list(TENANT_ID, 'PI');
      expect(prisma.termsTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ documentType: 'PI' }) }),
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('throws NotFoundException when template not found', async () => {
      prisma.termsTemplate.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns template when found', async () => {
      prisma.termsTemplate.findFirst.mockResolvedValue(makeTemplate() as any);
      const result = await service.getById(TENANT_ID, 'tmpl-id');
      expect(result).toHaveProperty('name');
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('clears existing defaults before creating a new default template', async () => {
      prisma.termsTemplate.updateMany.mockResolvedValue({ count: 1 } as any);
      prisma.termsTemplate.create.mockResolvedValue(makeTemplate({ isDefault: true }) as any);

      await service.create(TENANT_ID, { name: 'New', documentType: 'PI', content: '...', isDefault: true });

      expect(prisma.termsTemplate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDefault: false } }),
      );
    });

    it('creates template without clearing defaults when isDefault is false', async () => {
      prisma.termsTemplate.create.mockResolvedValue(makeTemplate() as any);

      await service.create(TENANT_ID, { name: 'New', documentType: 'PI', content: '...' });

      expect(prisma.termsTemplate.updateMany).not.toHaveBeenCalled();
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException if template not found', async () => {
      prisma.termsTemplate.findFirst.mockResolvedValue(null);
      await expect(service.update(TENANT_ID, 'bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('increments version on update', async () => {
      prisma.termsTemplate.findFirst.mockResolvedValue(makeTemplate() as any);
      prisma.termsTemplate.update.mockResolvedValue(makeTemplate({ version: 2 }) as any);

      const result = await service.update(TENANT_ID, 'tmpl-id', { content: 'Updated.' });

      expect(prisma.termsTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ version: { increment: 1 } }) }),
      );
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('throws NotFoundException if template not found', async () => {
      prisma.termsTemplate.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('deletes template and returns message', async () => {
      prisma.termsTemplate.findFirst.mockResolvedValue(makeTemplate() as any);
      prisma.termsTemplate.delete.mockResolvedValue({} as any);

      const result = await service.delete(TENANT_ID, 'tmpl-id');
      expect(result).toHaveProperty('message');
    });
  });

  // ─── setDefault ────────────────────────────────────────────────────────────

  describe('setDefault', () => {
    it('clears existing defaults and sets new default', async () => {
      prisma.termsTemplate.findFirst.mockResolvedValue(makeTemplate() as any);
      prisma.termsTemplate.updateMany.mockResolvedValue({ count: 1 } as any);
      prisma.termsTemplate.update.mockResolvedValue(makeTemplate({ isDefault: true }) as any);

      await service.setDefault(TENANT_ID, 'tmpl-id');

      expect(prisma.termsTemplate.updateMany).toHaveBeenCalled();
      expect(prisma.termsTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDefault: true } }),
      );
    });
  });

  // ─── getDefault ────────────────────────────────────────────────────────────

  describe('getDefault', () => {
    it('returns the default template for a document type', async () => {
      prisma.termsTemplate.findFirst.mockResolvedValue(makeTemplate({ isDefault: true }) as any);
      const result = await service.getDefault(TENANT_ID, 'PI');
      expect(result).toHaveProperty('isDefault', true);
    });
  });
});
