import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { UpdateProfileDto, CreateBankAccountDto, UpdateBankAccountDto } from './tenant.dto';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async getProfile(tenantId: string) {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { tenantId },
    });
    if (!profile) throw new NotFoundException('Business profile not found');
    return profile;
  }

  async updateProfile(tenantId: string, dto: UpdateProfileDto) {
    return this.prisma.businessProfile.update({
      where: { tenantId },
      data: dto,
    });
  }

  async getBankAccounts(tenantId: string) {
    return this.prisma.bankAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBankAccount(tenantId: string, dto: CreateBankAccountDto) {
    return this.prisma.bankAccount.create({
      data: { tenantId, ...dto },
    });
  }

  async updateBankAccount(tenantId: string, id: string, dto: UpdateBankAccountDto) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, tenantId },
    });
    if (!account) throw new NotFoundException('Bank account not found');

    return this.prisma.bankAccount.update({
      where: { id },
      data: dto,
    });
  }

  async deleteBankAccount(tenantId: string, id: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, tenantId },
    });
    if (!account) throw new NotFoundException('Bank account not found');

    await this.prisma.bankAccount.delete({ where: { id } });
    return { message: 'Bank account deleted' };
  }
}
