import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../email/email.service';
import { createPrismaMock, PrismaMock } from '../../test/prisma-mock';
import { makeUser, makeTenant, TENANT_ID, USER_ID } from '../../test/fixtures';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$mockedhash'),
  compare: jest.fn(),
}));

const mockEmailService = {
  sendInvitationEmail: jest.fn().mockResolvedValue(undefined),
};

const OTHER_USER_ID = 'other-user-id';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  // ─── listUsers ─────────────────────────────────────────────────────────────

  describe('listUsers', () => {
    it('returns list of users', async () => {
      prisma.user.findMany.mockResolvedValue([makeUser()] as any);
      const result = await service.listUsers(TENANT_ID);
      expect(result).toHaveLength(1);
    });
  });

  // ─── inviteUser ────────────────────────────────────────────────────────────

  describe('inviteUser', () => {
    it('throws ConflictException if user already exists in org', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser() as any);

      await expect(
        service.inviteUser(TENANT_ID, USER_ID, { email: 'user@test.com', role: 'STAFF' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if invitation already pending', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue({ id: 'inv-id', status: 'PENDING' } as any);

      await expect(
        service.inviteUser(TENANT_ID, USER_ID, { email: 'new@test.com', role: 'STAFF' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('creates invitation and sends email on success', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue(makeTenant() as any);
      prisma.invitation.create.mockResolvedValue({ id: 'inv-id', token: 'tok' } as any);
      prisma.auditLog.create.mockResolvedValue({} as any);

      const result = await service.inviteUser(TENANT_ID, USER_ID, { email: 'new@test.com', role: 'STAFF' } as any);

      expect(mockEmailService.sendInvitationEmail).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });
  });

  // ─── changeRole ────────────────────────────────────────────────────────────

  describe('changeRole', () => {
    it('throws BadRequestException if changing own role', async () => {
      await expect(
        service.changeRole(TENANT_ID, USER_ID, USER_ID, { role: 'STAFF' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if target user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.changeRole(TENANT_ID, USER_ID, OTHER_USER_ID, { role: 'STAFF' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates role and creates audit log', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser({ id: OTHER_USER_ID }) as any);
      prisma.user.update.mockResolvedValue(makeUser({ id: OTHER_USER_ID, role: 'STAFF' }) as any);
      prisma.auditLog.create.mockResolvedValue({} as any);

      const result = await service.changeRole(TENANT_ID, USER_ID, OTHER_USER_ID, { role: 'STAFF' } as any);

      expect(prisma.user.update).toHaveBeenCalled();
      expect(result).toHaveProperty('role');
    });
  });

  // ─── changeStatus ──────────────────────────────────────────────────────────

  describe('changeStatus', () => {
    it('throws BadRequestException if changing own status', async () => {
      await expect(
        service.changeStatus(TENANT_ID, USER_ID, USER_ID, { status: 'INACTIVE' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when deactivating the last admin', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser({ id: OTHER_USER_ID, role: 'ADMIN' }) as any);
      prisma.user.count.mockResolvedValue(1);

      await expect(
        service.changeStatus(TENANT_ID, USER_ID, OTHER_USER_ID, { status: 'INACTIVE' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('deactivates user and deletes sessions', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser({ id: OTHER_USER_ID, role: 'STAFF' }) as any);
      prisma.user.update.mockResolvedValue(makeUser({ id: OTHER_USER_ID, status: 'INACTIVE' }) as any);
      prisma.session.deleteMany.mockResolvedValue({ count: 1 } as any);
      prisma.auditLog.create.mockResolvedValue({} as any);

      const result = await service.changeStatus(TENANT_ID, USER_ID, OTHER_USER_ID, { status: 'INACTIVE' } as any);

      expect(prisma.session.deleteMany).toHaveBeenCalled();
      expect(result).toHaveProperty('status');
    });
  });

  // ─── removeUser ────────────────────────────────────────────────────────────

  describe('removeUser', () => {
    it('throws BadRequestException if deleting self', async () => {
      await expect(service.removeUser(TENANT_ID, USER_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when deleting the last admin', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser({ id: OTHER_USER_ID, role: 'ADMIN' }) as any);
      prisma.user.count.mockResolvedValue(1);

      await expect(service.removeUser(TENANT_ID, USER_ID, OTHER_USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('deletes user and sessions', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser({ id: OTHER_USER_ID, role: 'STAFF' }) as any);
      prisma.session.deleteMany.mockResolvedValue({ count: 0 } as any);
      prisma.user.delete.mockResolvedValue({} as any);
      prisma.auditLog.create.mockResolvedValue({} as any);

      const result = await service.removeUser(TENANT_ID, USER_ID, OTHER_USER_ID);
      expect(result).toHaveProperty('message');
    });
  });

  // ─── getMyProfile ──────────────────────────────────────────────────────────

  describe('getMyProfile', () => {
    it('throws NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getMyProfile(USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns user profile', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser() as any);
      const result = await service.getMyProfile(USER_ID);
      expect(result).toHaveProperty('email');
    });
  });

  // ─── changePassword ────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('throws BadRequestException on wrong current password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prisma.user.findUnique.mockResolvedValue(makeUser() as any);

      await expect(
        service.changePassword(USER_ID, { currentPassword: 'wrong', newPassword: 'new' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates password hash on success', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(makeUser() as any);
      prisma.user.update.mockResolvedValue(makeUser() as any);

      const result = await service.changePassword(USER_ID, { currentPassword: 'current', newPassword: 'newpass' } as any);

      expect(prisma.user.update).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });
  });
});
