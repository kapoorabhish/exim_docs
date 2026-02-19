import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../email/email.service';
import {
  SignupDto,
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  AcceptInviteDto,
} from './auth.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const slug = dto.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + crypto.randomBytes(3).toString('hex');

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.companyName,
        slug,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        businessProfile: {
          create: { companyName: dto.companyName },
        },
        users: {
          create: {
            email: dto.email,
            passwordHash,
            displayName: dto.companyName,
            phone: dto.phone,
            role: 'ADMIN',
            isVerified: false,
          },
        },
      },
      include: { users: true },
    });

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.verificationToken.create({
      data: {
        email: dto.email,
        token,
        type: 'EMAIL_VERIFY',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.email.sendVerificationEmail(dto.email, token);

    return { message: 'Verification email sent. Please check your inbox.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });

    if (!record || record.type !== 'EMAIL_VERIFY') {
      throw new BadRequestException('Invalid verification token');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Verification token expired');
    }
    if (record.usedAt) {
      throw new BadRequestException('Token already used');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: record.email },
      include: { tenant: true },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      }),
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);
    await this.email.sendWelcomeEmail(user.email, user.displayName);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
    };
  }

  async login(dto: LoginDto, ip?: string, device?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { tenant: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const updates: Record<string, unknown> = { failedLoginAttempts: attempts };
      if (attempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        updates.failedLoginAttempts = 0;
      }
      await this.prisma.user.update({ where: { id: user.id }, data: updates });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Account is deactivated');
    }
    if (!user.isVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        device,
        ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.auditLog.create({
      data: { tenantId: user.tenantId, userId: user.id, action: 'LOGIN', module: 'AUTH', ip },
    });

    return {
      ...tokens,
      user: this.sanitizeUser(user),
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug, status: user.tenant.status },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: dto.refreshToken },
      include: { user: { include: { tenant: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = session.user;
    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({ where: { refreshToken } });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If the email exists, a reset link has been sent.' };

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.verificationToken.create({
      data: {
        email: dto.email,
        token,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.email.sendPasswordResetEmail(dto.email, token);
    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });

    if (!record || record.type !== 'PASSWORD_RESET') {
      throw new BadRequestException('Invalid reset token');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token expired');
    }
    if (record.usedAt) {
      throw new BadRequestException('Token already used');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: record.email },
        data: { passwordHash },
      }),
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.deleteMany({
        where: { user: { email: record.email } },
      }),
    ]);

    return { message: 'Password reset successful. Please log in with your new password.' };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
      include: { tenant: true },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new BadRequestException('Invalid or expired invitation');
    }
    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation expired');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: invitation.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        tenantId: invitation.tenantId,
        email: invitation.email,
        passwordHash,
        displayName: dto.displayName,
        role: invitation.role,
        isVerified: true,
        status: 'ACTIVE',
      },
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
      tenant: { id: invitation.tenant.id, name: invitation.tenant.name, slug: invitation.tenant.slug },
    };
  }

  private async generateTokens(userId: string, email: string, tenantId: string, role: string) {
    const payload: JwtPayload = { sub: userId, email, tenantId, role };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = crypto.randomBytes(40).toString('hex');

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: { id: string; email: string; displayName: string; role: string; phone?: string | null; avatarUrl?: string | null }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    };
  }
}
