import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { PrismaService } from '../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../test/prisma-mock';
import { TENANT_ID } from '../../test/fixtures';

const makeProfile = (overrides: Record<string, unknown> = {}) => ({
  id: 'profile-id',
  tenantId: TENANT_ID,
  companyName: 'Test Co',
  registeredAddress: null,
  gstin: null,
  iecNumber: null,
  pan: null,
  ...overrides,
});

const makeBankAccount = (overrides: Record<string, unknown> = {}) => ({
  id: 'bank-id',
  tenantId: TENANT_ID,
  bankName: 'HDFC Bank',
  branch: 'Main Branch',
  accountNumber: '1234567890',
  ifscCode: 'HDFC0001234',
  swiftCode: null,
  isDefaultExport: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('TenantService', () => {
  let service: TenantService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<TenantService>(TenantService);
  });

  // ─── getProfile ────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('throws NotFoundException if profile does not exist', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue(null);
      await expect(service.getProfile(TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns profile when found', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue(makeProfile() as any);
      const result = await service.getProfile(TENANT_ID);
      expect(result).toHaveProperty('companyName');
    });
  });

  // ─── updateProfile ─────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates profile and returns updated record', async () => {
      const updated = makeProfile({ gstin: '27AABCU9603R1ZX' });
      prisma.businessProfile.update.mockResolvedValue(updated as any);

      const result = await service.updateProfile(TENANT_ID, { gstin: '27AABCU9603R1ZX' } as any);

      expect(prisma.businessProfile.update).toHaveBeenCalled();
      expect(result.gstin).toBe('27AABCU9603R1ZX');
    });
  });

  // ─── getBankAccounts ───────────────────────────────────────────────────────

  describe('getBankAccounts', () => {
    it('returns list of bank accounts', async () => {
      prisma.bankAccount.findMany.mockResolvedValue([makeBankAccount()] as any);
      const result = await service.getBankAccounts(TENANT_ID);
      expect(result).toHaveLength(1);
    });
  });

  // ─── createBankAccount ─────────────────────────────────────────────────────

  describe('createBankAccount', () => {
    it('creates and returns new bank account', async () => {
      prisma.bankAccount.create.mockResolvedValue(makeBankAccount() as any);
      const result = await service.createBankAccount(TENANT_ID, { bankName: 'HDFC Bank' } as any);
      expect(result).toHaveProperty('bankName');
    });
  });

  // ─── updateBankAccount ─────────────────────────────────────────────────────

  describe('updateBankAccount', () => {
    it('throws NotFoundException if account not found', async () => {
      prisma.bankAccount.findFirst.mockResolvedValue(null);
      await expect(service.updateBankAccount(TENANT_ID, 'bad-id', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('updates account when found', async () => {
      prisma.bankAccount.findFirst.mockResolvedValue(makeBankAccount() as any);
      prisma.bankAccount.update.mockResolvedValue(makeBankAccount({ swiftCode: 'HDFCINBB' }) as any);

      const result = await service.updateBankAccount(TENANT_ID, 'bank-id', { swiftCode: 'HDFCINBB' } as any);
      expect(result.swiftCode).toBe('HDFCINBB');
    });
  });

  // ─── deleteBankAccount ─────────────────────────────────────────────────────

  describe('deleteBankAccount', () => {
    it('throws NotFoundException if account not found', async () => {
      prisma.bankAccount.findFirst.mockResolvedValue(null);
      await expect(service.deleteBankAccount(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('deletes account and returns success message', async () => {
      prisma.bankAccount.findFirst.mockResolvedValue(makeBankAccount() as any);
      prisma.bankAccount.delete.mockResolvedValue({} as any);

      const result = await service.deleteBankAccount(TENANT_ID, 'bank-id');
      expect(result).toHaveProperty('message');
    });
  });
});
