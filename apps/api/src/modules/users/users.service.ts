import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../email/email.service';
import {
  InviteUserDto,
  ChangeRoleDto,
  ChangeStatusDto,
  UpdateMyProfileDto,
  ChangePasswordDto,
  AuditLogQueryDto,
} from './users.dto';
import { PERMISSION_MATRIX } from './permissions';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async listUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        displayName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteUser(tenantId: string, invitedBy: string, dto: InviteUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId },
    });
    if (existingUser) throw new ConflictException('User already exists in this organization');

    const existingInvite = await this.prisma.invitation.findFirst({
      where: { email: dto.email, tenantId, status: 'PENDING' },
    });
    if (existingInvite) throw new ConflictException('An invitation is already pending for this email');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    const token = crypto.randomBytes(32).toString('hex');
    const invitation = await this.prisma.invitation.create({
      data: {
        tenantId,
        email: dto.email,
        role: dto.role as any,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy,
      },
    });

    await this.email.sendInvitationEmail(dto.email, tenant?.name || 'EXIM', dto.role, token);

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: invitedBy,
        action: 'INVITE_USER',
        module: 'USERS',
        entity: dto.email,
        details: { role: dto.role },
      },
    });

    return invitation;
  }

  async changeRole(tenantId: string, userId: string, targetId: string, dto: ChangeRoleDto) {
    if (userId === targetId) {
      throw new BadRequestException('Cannot change your own role');
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetId, tenantId },
    });
    if (!target) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role: dto.role as any },
      select: { id: true, email: true, displayName: true, role: true, status: true },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CHANGE_ROLE',
        module: 'USERS',
        entity: target.email,
        details: { from: target.role, to: dto.role },
      },
    });

    return updated;
  }

  async changeStatus(tenantId: string, userId: string, targetId: string, dto: ChangeStatusDto) {
    if (userId === targetId) {
      throw new BadRequestException('Cannot change your own status');
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetId, tenantId },
    });
    if (!target) throw new NotFoundException('User not found');

    if (dto.status === 'INACTIVE' && target.role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: { tenantId, role: 'ADMIN', status: 'ACTIVE' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot deactivate the last admin');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { status: dto.status as any },
      select: { id: true, email: true, displayName: true, role: true, status: true },
    });

    if (dto.status === 'INACTIVE') {
      await this.prisma.session.deleteMany({ where: { userId: targetId } });
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CHANGE_STATUS',
        module: 'USERS',
        entity: target.email,
        details: { from: target.status, to: dto.status },
      },
    });

    return updated;
  }

  async removeUser(tenantId: string, userId: string, targetId: string) {
    if (userId === targetId) {
      throw new BadRequestException('Cannot delete yourself');
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetId, tenantId },
    });
    if (!target) throw new NotFoundException('User not found');

    if (target.role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: { tenantId, role: 'ADMIN', status: 'ACTIVE' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last admin');
      }
    }

    await this.prisma.session.deleteMany({ where: { userId: targetId } });
    await this.prisma.user.delete({ where: { id: targetId } });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'DELETE_USER',
        module: 'USERS',
        entity: target.email,
      },
    });

    return { message: 'User removed' };
  }

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        displayName: true,
        phone: true,
        avatarUrl: true,
        role: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  getPermissions() {
    return PERMISSION_MATRIX;
  }

  async listSessions(tenantId: string) {
    return this.prisma.session.findMany({
      where: { user: { tenantId } },
      select: {
        id: true,
        device: true,
        ip: true,
        createdAt: true,
        expiresAt: true,
        user: {
          select: { id: true, email: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async forceLogout(tenantId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || session.user.tenantId !== tenantId) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.session.delete({ where: { id: sessionId } });
    return { message: 'Session terminated' };
  }

  async queryAuditLogs(tenantId: string, query: AuditLogQueryDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = Math.min(parseInt(query.limit || '50', 10), 100);

    const where: Record<string, unknown> = { tenantId };
    if (query.userId) where.userId = query.userId;
    if (query.module) where.module = query.module;
    if (query.action) where.action = query.action;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) (where.createdAt as Record<string, unknown>).gte = new Date(query.from);
      if (query.to) (where.createdAt as Record<string, unknown>).lte = new Date(query.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: where as any }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
