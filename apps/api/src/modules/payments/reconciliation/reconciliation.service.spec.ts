import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import {
  TENANT_ID,
  USER_ID,
  BANK_STATEMENT_ID,
  BANK_ENTRY_ID,
  EXPORT_PAYMENT_ID,
  makeBankStatement,
  makeBankEntry,
  makeExportPayment,
  makeImportPayment,
  makeAdvancePayment,
} from '../../../test/fixtures';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ReconciliationService>(ReconciliationService);
  });

  describe('getUnreconciled', () => {
    it('throws NotFoundException when bank statement not found', async () => {
      prisma.bankStatement.findFirst.mockResolvedValue(null);
      await expect(service.getUnreconciled(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns unreconciled entries for the statement', async () => {
      prisma.bankStatement.findFirst.mockResolvedValue(makeBankStatement() as any);
      const entry = makeBankEntry({ reconciliationStatus: 'UNRECONCILED' });
      prisma.bankStatementEntry.findMany.mockResolvedValue([entry] as any);

      const result = await service.getUnreconciled(TENANT_ID, BANK_STATEMENT_ID);
      expect(result).toHaveLength(1);
      expect(result[0].reconciliationStatus).toBe('UNRECONCILED');
    });
  });

  describe('getUnmatchedPayments', () => {
    it('returns export payments, import payments, and advances grouped by type', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([makeExportPayment()] as any);
      prisma.importPayment.findMany.mockResolvedValue([makeImportPayment()] as any);
      prisma.advancePayment.findMany.mockResolvedValue([makeAdvancePayment()] as any);

      const result = await service.getUnmatchedPayments(TENANT_ID);
      expect(result.exportPayments).toHaveLength(1);
      expect(result.importPayments).toHaveLength(1);
      expect(result.advances).toHaveLength(1);
      expect(result.exportPayments[0].type).toBe('EXPORT');
      expect(result.importPayments[0].type).toBe('IMPORT');
      expect(result.advances[0].type).toBe('ADVANCE');
    });

    it('returns empty arrays when no unmatched payments', async () => {
      prisma.exportPayment.findMany.mockResolvedValue([]);
      prisma.importPayment.findMany.mockResolvedValue([]);
      prisma.advancePayment.findMany.mockResolvedValue([]);

      const result = await service.getUnmatchedPayments(TENANT_ID);
      expect(result.exportPayments).toHaveLength(0);
      expect(result.importPayments).toHaveLength(0);
      expect(result.advances).toHaveLength(0);
    });
  });

  describe('autoMatch', () => {
    it('returns matched count 0 when no CREDIT entries', async () => {
      prisma.bankStatementEntry.findMany.mockResolvedValue([]);
      prisma.exportPayment.findMany.mockResolvedValue([]);

      const result = await service.autoMatch(TENANT_ID, BANK_STATEMENT_ID, USER_ID);
      expect(result.matched).toBe(0);
      expect(result.total).toBe(0);
    });

    it('matches entry when amount, date, and reference align', async () => {
      const paymentDate = new Date('2025-04-15');
      const entry = makeBankEntry({
        entryType: 'CREDIT',
        amount: 417500,
        reference: 'UTR123456',
        entryDate: new Date('2025-04-15'),
        reconciliationStatus: 'UNRECONCILED',
      });
      const payment = makeExportPayment({
        foreignAmount: 417500,
        referenceNumber: 'UTR123456',
        paymentDate,
      });

      prisma.bankStatementEntry.findMany.mockResolvedValue([entry] as any);
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);
      prisma.bankStatementEntry.update.mockResolvedValue({ ...entry, reconciliationStatus: 'MATCHED' } as any);

      const result = await service.autoMatch(TENANT_ID, BANK_STATEMENT_ID, USER_ID);
      expect(result.matched).toBe(1);
      expect(prisma.bankStatementEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reconciliationStatus: 'MATCHED',
            exportPaymentId: EXPORT_PAYMENT_ID,
          }),
        }),
      );
    });

    it('does not match when amount differs', async () => {
      const entry = makeBankEntry({
        entryType: 'CREDIT',
        amount: 500000,
        reference: 'UTR123456',
        entryDate: new Date('2025-04-15'),
      });
      const payment = makeExportPayment({
        foreignAmount: 417500,
        referenceNumber: 'UTR123456',
        paymentDate: new Date('2025-04-15'),
      });

      prisma.bankStatementEntry.findMany.mockResolvedValue([entry] as any);
      prisma.exportPayment.findMany.mockResolvedValue([payment] as any);

      const result = await service.autoMatch(TENANT_ID, BANK_STATEMENT_ID, USER_ID);
      expect(result.matched).toBe(0);
    });
  });

  describe('manualMatch', () => {
    it('throws NotFoundException when entry not found', async () => {
      prisma.bankStatementEntry.findFirst.mockResolvedValue(null);
      await expect(
        service.manualMatch(TENANT_ID, {
          entryId: 'bad-id',
          paymentType: 'EXPORT',
          paymentId: EXPORT_PAYMENT_ID,
          userId: USER_ID,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('manually matches entry to export payment', async () => {
      const entry = makeBankEntry();
      prisma.bankStatementEntry.findFirst.mockResolvedValue(entry as any);
      prisma.bankStatementEntry.update.mockResolvedValue({
        ...entry,
        reconciliationStatus: 'MANUALLY_MATCHED',
        exportPaymentId: EXPORT_PAYMENT_ID,
      } as any);

      await service.manualMatch(TENANT_ID, {
        entryId: BANK_ENTRY_ID,
        paymentType: 'EXPORT',
        paymentId: EXPORT_PAYMENT_ID,
        userId: USER_ID,
      });

      expect(prisma.bankStatementEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reconciliationStatus: 'MANUALLY_MATCHED',
            exportPaymentId: EXPORT_PAYMENT_ID,
          }),
        }),
      );
    });

    it('manually matches entry to import payment', async () => {
      const entry = makeBankEntry();
      prisma.bankStatementEntry.findFirst.mockResolvedValue(entry as any);
      prisma.bankStatementEntry.update.mockResolvedValue({} as any);

      await service.manualMatch(TENANT_ID, {
        entryId: BANK_ENTRY_ID,
        paymentType: 'IMPORT',
        paymentId: 'import-pay-id',
        userId: USER_ID,
      });

      expect(prisma.bankStatementEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ importPaymentId: 'import-pay-id' }),
        }),
      );
    });

    it('manually matches entry to advance payment', async () => {
      const entry = makeBankEntry();
      prisma.bankStatementEntry.findFirst.mockResolvedValue(entry as any);
      prisma.bankStatementEntry.update.mockResolvedValue({} as any);

      await service.manualMatch(TENANT_ID, {
        entryId: BANK_ENTRY_ID,
        paymentType: 'ADVANCE',
        paymentId: 'advance-pay-id',
        userId: USER_ID,
      });

      expect(prisma.bankStatementEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ advancePaymentId: 'advance-pay-id' }),
        }),
      );
    });
  });
});