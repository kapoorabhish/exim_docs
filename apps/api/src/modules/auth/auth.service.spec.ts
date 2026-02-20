import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../email/email.service';
import { createPrismaMock, PrismaMock } from '../../test/prisma-mock';
import { makeTenant, makeUser, makeVerificationToken, makeSession, TENANT_ID, USER_ID } from '../../test/fixtures';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$mockedhash'),
  compare: jest.fn(),
}));

const mockJwtService = { sign: jest.fn().mockReturnValue('access-token') };
const mockConfigService = { get: jest.fn().mockReturnValue('secret') };
const mockEmailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendInvitationEmail: jest.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  // ─── signup ────────────────────────────────────────────────────────────────

  describe('signup', () => {
    it('throws ConflictException if email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser() as any);

      await expect(
        service.signup({ email: 'user@test.com', password: 'pass', companyName: 'Test Co', phone: '' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates tenant, user, and verification token on success', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const tenant = makeTenant({ users: [makeUser()] });
      prisma.tenant.create.mockResolvedValue(tenant as any);
      prisma.verificationToken.create.mockResolvedValue(makeVerificationToken() as any);

      const result = await service.signup({
        email: 'new@test.com',
        password: 'password',
        companyName: 'New Co',
        phone: '9999999999',
      });

      expect(prisma.tenant.create).toHaveBeenCalled();
      expect(prisma.verificationToken.create).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });
  });

  // ─── verifyEmail ───────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('throws BadRequestException for invalid token', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail({ token: 'bad' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired token', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(
        makeVerificationToken({ expiresAt: new Date(Date.now() - 1000) }) as any,
      );
      await expect(service.verifyEmail({ token: 'expired' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for already-used token', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(
        makeVerificationToken({ usedAt: new Date() }) as any,
      );
      await expect(service.verifyEmail({ token: 'used' })).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if user not found', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(makeVerificationToken() as any);
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.verifyEmail({ token: 'abc' })).rejects.toThrow(NotFoundException);
    });

    it('marks user as verified and returns tokens on success', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(makeVerificationToken() as any);
      prisma.user.findFirst.mockResolvedValue(makeUser() as any);
      prisma.$transaction.mockResolvedValue([{}, {}] as any);

      const result = await service.verifyEmail({ token: 'abc123token' });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('throws UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'p' })).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if account is locked', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ lockedUntil: new Date(Date.now() + 60 * 1000) }) as any,
      );
      await expect(service.login({ email: 'user@test.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });

    it('increments failedLoginAttempts on wrong password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prisma.user.findUnique.mockResolvedValue(makeUser({ failedLoginAttempts: 2 }) as any);
      prisma.user.update.mockResolvedValue(makeUser() as any);

      await expect(service.login({ email: 'user@test.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 3 }) }),
      );
    });

    it('locks account after 5 failed attempts', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prisma.user.findUnique.mockResolvedValue(makeUser({ failedLoginAttempts: 4 }) as any);
      prisma.user.update.mockResolvedValue(makeUser() as any);

      await expect(service.login({ email: 'user@test.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ lockedUntil: expect.any(Date) }) }),
      );
    });

    it('throws UnauthorizedException if account is INACTIVE', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ status: 'INACTIVE' }) as any);
      await expect(service.login({ email: 'user@test.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if email not verified', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ isVerified: false }) as any);
      await expect(service.login({ email: 'user@test.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens and creates session on successful login', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser() as any);
      prisma.user.update.mockResolvedValue(makeUser() as any);
      prisma.session.create.mockResolvedValue(makeSession() as any);
      prisma.auditLog.create.mockResolvedValue({} as any);

      const result = await service.login({ email: 'user@test.com', password: 'pass' });

      expect(prisma.session.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tenant');
    });
  });

  // ─── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('throws UnauthorizedException for missing session', async () => {
      prisma.session.findUnique.mockResolvedValue(null);
      await expect(service.refresh({ refreshToken: 'bad' })).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for expired session', async () => {
      prisma.session.findUnique.mockResolvedValue(
        makeSession({ expiresAt: new Date(Date.now() - 1000) }) as any,
      );
      prisma.session.delete.mockResolvedValue({} as any);
      await expect(service.refresh({ refreshToken: 'expired' })).rejects.toThrow(UnauthorizedException);
    });

    it('rotates refresh token on valid session', async () => {
      prisma.session.findUnique.mockResolvedValue(makeSession() as any);
      prisma.session.update.mockResolvedValue(makeSession() as any);

      const result = await service.refresh({ refreshToken: 'valid-token' });

      expect(prisma.session.update).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  // ─── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('deletes session and returns success message', async () => {
      prisma.session.deleteMany.mockResolvedValue({ count: 1 } as any);

      const result = await service.logout('my-refresh-token');

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { refreshToken: 'my-refresh-token' } });
      expect(result).toHaveProperty('message');
    });
  });

  // ─── forgotPassword ────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns silent success even when user not found (no enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nobody@x.com' });

      expect(prisma.verificationToken.create).not.toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });

    it('creates reset token and sends email when user exists', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser() as any);
      prisma.verificationToken.create.mockResolvedValue(makeVerificationToken() as any);

      const result = await service.forgotPassword({ email: 'user@test.com' });

      expect(prisma.verificationToken.create).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });
  });

  // ─── resetPassword ─────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('throws BadRequestException for invalid token', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword({ token: 'bad', newPassword: 'new' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired token', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(
        makeVerificationToken({ type: 'PASSWORD_RESET', expiresAt: new Date(Date.now() - 1) }) as any,
      );
      await expect(service.resetPassword({ token: 'exp', newPassword: 'new' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for already-used token', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(
        makeVerificationToken({ type: 'PASSWORD_RESET', usedAt: new Date() }) as any,
      );
      await expect(service.resetPassword({ token: 'used', newPassword: 'new' })).rejects.toThrow(BadRequestException);
    });

    it('updates password hash and deletes sessions on success', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(
        makeVerificationToken({ type: 'PASSWORD_RESET' }) as any,
      );
      prisma.$transaction.mockResolvedValue([{}, {}, {}] as any);

      const result = await service.resetPassword({ token: 'abc', newPassword: 'newpass' });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });
  });

  // ─── acceptInvite ──────────────────────────────────────────────────────────

  describe('acceptInvite', () => {
    it('throws BadRequestException for invalid invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);
      await expect(
        service.acceptInvite({ token: 'bad', password: 'pass', displayName: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-id',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1),
        email: 'inv@test.com',
        tenantId: TENANT_ID,
        tenant: makeTenant(),
      } as any);
      prisma.invitation.update.mockResolvedValue({} as any);

      await expect(
        service.acceptInvite({ token: 'exp', password: 'pass', displayName: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if email already registered', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-id',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60000),
        email: 'user@test.com',
        tenantId: TENANT_ID,
        tenant: makeTenant(),
        role: 'STAFF',
      } as any);
      prisma.user.findUnique.mockResolvedValue(makeUser() as any);

      await expect(
        service.acceptInvite({ token: 'valid', password: 'pass', displayName: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user and returns tokens on valid invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-id',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60000),
        email: 'new@test.com',
        tenantId: TENANT_ID,
        tenant: makeTenant(),
        role: 'STAFF',
      } as any);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeUser() as any);
      prisma.invitation.update.mockResolvedValue({} as any);

      const result = await service.acceptInvite({ token: 'valid', password: 'pass', displayName: 'New User' });

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });
  });
});
