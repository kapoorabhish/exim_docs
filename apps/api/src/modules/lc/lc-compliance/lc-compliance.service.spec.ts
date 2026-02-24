import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LcComplianceService } from './lc-compliance.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, LC_ID, makeLcDocument, makeLcDiscrepancy } from '../../../test/fixtures';

const makeLcForCompliance = (overrides: Record<string, unknown> = {}) => ({
  id: LC_ID,
  lcNumber: 'LC/2025-26/001',
  expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  latestShipmentDate: null,
  requiredDocs: [],
  discrepancies: [],
  ...overrides,
});

describe('LcComplianceService', () => {
  let service: LcComplianceService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LcComplianceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<LcComplianceService>(LcComplianceService);
  });

  describe('checkCompliance', () => {
    it('throws NotFoundException when LC not found', async () => {
      prisma.letterOfCredit.findFirst.mockResolvedValue(null);
      await expect(service.checkCompliance(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns PASS overall status when all checks pass', async () => {
      const futureExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const readyDoc = makeLcDocument({ status: 'READY' });
      const lc = makeLcForCompliance({
        expiryDate: futureExpiry,
        requiredDocs: [readyDoc],
        discrepancies: [],
      });
      prisma.letterOfCredit.findFirst.mockResolvedValue(lc as any);

      const result = await service.checkCompliance(TENANT_ID, LC_ID);
      expect(result.overallStatus).toBe('PASS');
      expect(result.lcId).toBe(LC_ID);
    });

    it('returns FAIL for expired LC', async () => {
      const pastExpiry = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const lc = makeLcForCompliance({ expiryDate: pastExpiry, discrepancies: [] });
      prisma.letterOfCredit.findFirst.mockResolvedValue(lc as any);

      const result = await service.checkCompliance(TENANT_ID, LC_ID);
      expect(result.overallStatus).toBe('FAIL');
      const expiryCheck = result.checks.find((c) => c.field === 'expiryDate');
      expect(expiryCheck?.status).toBe('FAIL');
    });

    it('returns WARN for LC expiring within 7 days', async () => {
      const soonExpiry = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const readyDoc = makeLcDocument({ status: 'READY' });
      const lc = makeLcForCompliance({
        expiryDate: soonExpiry,
        requiredDocs: [readyDoc],
        discrepancies: [],
      });
      prisma.letterOfCredit.findFirst.mockResolvedValue(lc as any);

      const result = await service.checkCompliance(TENANT_ID, LC_ID);
      const expiryCheck = result.checks.find((c) => c.field === 'expiryDate');
      expect(expiryCheck?.status).toBe('WARN');
    });

    it('returns FAIL when blocking discrepancy is open', async () => {
      const futureExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const readyDoc = makeLcDocument({ status: 'READY' });
      const blockingDisc = makeLcDiscrepancy({ severity: 'BLOCKING', status: 'OPEN' });
      const lc = makeLcForCompliance({
        expiryDate: futureExpiry,
        requiredDocs: [readyDoc],
        discrepancies: [blockingDisc],
      });
      prisma.letterOfCredit.findFirst.mockResolvedValue(lc as any);

      const result = await service.checkCompliance(TENANT_ID, LC_ID);
      expect(result.overallStatus).toBe('FAIL');
      const discCheck = result.checks.find((c) => c.field === 'discrepancies');
      expect(discCheck?.status).toBe('FAIL');
    });

    it('returns WARN for document checklist with not-ready docs', async () => {
      const futureExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const notReadyDoc = makeLcDocument({ status: 'NOT_STARTED' });
      const lc = makeLcForCompliance({
        expiryDate: futureExpiry,
        requiredDocs: [notReadyDoc],
        discrepancies: [],
      });
      prisma.letterOfCredit.findFirst.mockResolvedValue(lc as any);

      const result = await service.checkCompliance(TENANT_ID, LC_ID);
      const docCheck = result.checks.find((c) => c.field === 'documents');
      expect(docCheck?.status).toBe('WARN');
    });

    it('includes latest shipment date check when present', async () => {
      const futureExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const pastShipmentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const lc = makeLcForCompliance({
        expiryDate: futureExpiry,
        latestShipmentDate: pastShipmentDate,
        requiredDocs: [],
        discrepancies: [],
      });
      prisma.letterOfCredit.findFirst.mockResolvedValue(lc as any);

      const result = await service.checkCompliance(TENANT_ID, LC_ID);
      const shipmentCheck = result.checks.find((c) => c.field === 'latestShipmentDate');
      expect(shipmentCheck).toBeTruthy();
      expect(shipmentCheck?.status).toBe('FAIL');
    });

    it('returns PASS for non-blocking open discrepancies as WARN overall', async () => {
      const futureExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const readyDoc = makeLcDocument({ status: 'READY' });
      const nonBlockingDisc = makeLcDiscrepancy({ severity: 'NON_BLOCKING', status: 'OPEN' });
      const lc = makeLcForCompliance({
        expiryDate: futureExpiry,
        requiredDocs: [readyDoc],
        discrepancies: [nonBlockingDisc],
      });
      prisma.letterOfCredit.findFirst.mockResolvedValue(lc as any);

      const result = await service.checkCompliance(TENANT_ID, LC_ID);
      expect(result.overallStatus).toBe('WARN');
    });
  });
});