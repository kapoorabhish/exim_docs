import { Test, TestingModule } from '@nestjs/testing';
import { DocNumberService } from './doc-number.service';
import { PrismaService } from '../prisma.service';
import { createPrismaMock, PrismaMock } from '../../test/prisma-mock';
import { makeDocumentSequence, TENANT_ID } from '../../test/fixtures';

describe('DocNumberService', () => {
  let service: DocNumberService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocNumberService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<DocNumberService>(DocNumberService);
  });

  // ─── getFyLabel ────────────────────────────────────────────────────────────

  describe('getFyLabel', () => {
    it('returns same-year FY for April (FY start)', () => {
      expect(service.getFyLabel(new Date(2025, 3, 1))).toBe('2025-26');
    });

    it('returns same-year FY for December', () => {
      expect(service.getFyLabel(new Date(2025, 11, 15))).toBe('2025-26');
    });

    it('returns previous-year FY for January (before April)', () => {
      expect(service.getFyLabel(new Date(2026, 0, 15))).toBe('2025-26');
    });

    it('returns previous-year FY for March 31 (last day of FY)', () => {
      expect(service.getFyLabel(new Date(2026, 2, 31))).toBe('2025-26');
    });

    it('starts a new FY on April 1', () => {
      expect(service.getFyLabel(new Date(2026, 3, 1))).toBe('2026-27');
    });

    it('returns a string matching YYYY-YY pattern when called without args', () => {
      expect(service.getFyLabel()).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  // ─── getNextNumber ─────────────────────────────────────────────────────────

  describe('getNextNumber', () => {
    beforeEach(() => {
      prisma.$transaction.mockImplementation(async (fn: any) => {
        if (typeof fn === 'function') return fn(prisma);
        return Promise.all(fn as Promise<unknown>[]);
      });
    });

    it('creates a new sequence when none exists and returns 001', async () => {
      prisma.documentSequence.findUnique.mockResolvedValue(null);
      prisma.documentSequence.create.mockResolvedValue(
        makeDocumentSequence({ lastSequence: 1 }) as any,
      );

      const result = await service.getNextNumber(TENANT_ID, 'PI');

      expect(prisma.documentSequence.create).toHaveBeenCalled();
      expect(result).toMatch(/^PI\/\d{4}-\d{2}\/001$/);
    });

    it('increments an existing sequence and returns padded number', async () => {
      prisma.documentSequence.findUnique.mockResolvedValue(
        makeDocumentSequence({ lastSequence: 1 }) as any,
      );
      prisma.documentSequence.update.mockResolvedValue(
        makeDocumentSequence({ lastSequence: 2 }) as any,
      );

      const result = await service.getNextNumber(TENANT_ID, 'PI');

      expect(prisma.documentSequence.update).toHaveBeenCalled();
      expect(result).toMatch(/^PI\/\d{4}-\d{2}\/002$/);
    });

    it('uses INV prefix for INV document type', async () => {
      prisma.documentSequence.findUnique.mockResolvedValue(null);
      prisma.documentSequence.create.mockResolvedValue(
        makeDocumentSequence({ documentType: 'INV', lastSequence: 1 }) as any,
      );

      const result = await service.getNextNumber(TENANT_ID, 'INV');
      expect(result).toMatch(/^INV\/\d{4}-\d{2}\/001$/);
    });

    it('uses SB prefix for SB document type', async () => {
      prisma.documentSequence.findUnique.mockResolvedValue(null);
      prisma.documentSequence.create.mockResolvedValue(
        makeDocumentSequence({ documentType: 'SB', lastSequence: 5 }) as any,
      );

      const result = await service.getNextNumber(TENANT_ID, 'SB');
      expect(result).toMatch(/^SB\/\d{4}-\d{2}\/005$/);
    });

    it('uses PO prefix for BPO document type', async () => {
      prisma.documentSequence.findUnique.mockResolvedValue(null);
      prisma.documentSequence.create.mockResolvedValue(
        makeDocumentSequence({ documentType: 'BPO', lastSequence: 1 }) as any,
      );

      const result = await service.getNextNumber(TENANT_ID, 'BPO');
      expect(result).toMatch(/^PO\/\d{4}-\d{2}\/001$/);
    });

    it('pads sequence numbers to 3 digits', async () => {
      prisma.documentSequence.findUnique.mockResolvedValue(
        makeDocumentSequence({ lastSequence: 9 }) as any,
      );
      prisma.documentSequence.update.mockResolvedValue(
        makeDocumentSequence({ lastSequence: 10 }) as any,
      );

      const result = await service.getNextNumber(TENANT_ID, 'PI');
      expect(result).toMatch(/^PI\/\d{4}-\d{2}\/010$/);
    });
  });
});
