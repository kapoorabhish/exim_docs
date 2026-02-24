import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BankStatementService } from './bank-statement.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import {
  TENANT_ID,
  USER_ID,
  BANK_STATEMENT_ID,
  makeBankStatement,
  makeBankEntry,
} from '../../../test/fixtures';

describe('BankStatementService', () => {
  let service: BankStatementService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankStatementService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<BankStatementService>(BankStatementService);
  });

  describe('list', () => {
    it('returns paginated bank statements', async () => {
      prisma.bankStatement.findMany.mockResolvedValue([makeBankStatement()] as any);
      prisma.bankStatement.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies pagination', async () => {
      prisma.bankStatement.findMany.mockResolvedValue([]);
      prisma.bankStatement.count.mockResolvedValue(50);

      await service.list(TENANT_ID, { page: 2, pageSize: 10 });
      expect(prisma.bankStatement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('getById', () => {
    it('throws NotFoundException when statement not found', async () => {
      prisma.bankStatement.findFirst.mockResolvedValue(null);
      await expect(service.getById(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('returns statement with entries', async () => {
      const stmt = makeBankStatement({ entries: [makeBankEntry()] });
      prisma.bankStatement.findFirst.mockResolvedValue(stmt as any);

      const result = await service.getById(TENANT_ID, BANK_STATEMENT_ID);
      expect(result.bankName).toBe('HDFC Bank');
    });
  });

  describe('import', () => {
    it('creates bank statement with entries', async () => {
      const createdStmt = makeBankStatement({ entries: [makeBankEntry()] });
      prisma.bankStatement.create.mockResolvedValue(createdStmt as any);

      const result = await service.import(TENANT_ID, USER_ID, {
        bankName: 'HDFC Bank',
        accountNumber: '50200012345678',
        statementDate: '2025-04-30',
        openingBalance: 500000,
        closingBalance: 750000,
        entries: [
          {
            entryDate: '2025-04-15',
            description: 'Inward remittance',
            reference: 'UTR123',
            entryType: 'CREDIT',
            amount: 417500,
            balance: 917500,
          },
        ],
      });

      expect(prisma.bankStatement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bankName: 'HDFC Bank',
            entryCount: 1,
            entries: expect.objectContaining({ create: expect.any(Array) }),
          }),
        }),
      );
      expect(result).toBeTruthy();
    });

    it('creates entries with UNRECONCILED status by default', async () => {
      prisma.bankStatement.create.mockResolvedValue(makeBankStatement() as any);

      await service.import(TENANT_ID, USER_ID, {
        bankName: 'Test Bank',
        statementDate: '2025-04-30',
        openingBalance: 0,
        closingBalance: 100000,
        entries: [
          {
            entryDate: '2025-04-10',
            description: 'Test entry',
            entryType: 'CREDIT',
            amount: 100000,
            balance: 100000,
          },
        ],
      });

      const createCall = (prisma.bankStatement.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.entries.create[0].reconciliationStatus).toBe('UNRECONCILED');
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when statement not found', async () => {
      prisma.bankStatement.findFirst.mockResolvedValue(null);
      await expect(service.delete(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('deletes bank statement', async () => {
      prisma.bankStatement.findFirst.mockResolvedValue(makeBankStatement() as any);
      prisma.bankStatement.delete.mockResolvedValue({} as any);

      const result = await service.delete(TENANT_ID, BANK_STATEMENT_ID);
      expect(prisma.bankStatement.delete).toHaveBeenCalledWith({
        where: { id: BANK_STATEMENT_ID },
      });
      expect(result).toHaveProperty('message');
    });
  });
});