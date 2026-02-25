import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class IecTrackingService {
  constructor(private prisma: PrismaService) {}

  async getStatus(tenantId: string) {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { tenantId },
      select: {
        iecNumber: true,
        iecStatus: true,
        iecLastConfirmedAt: true,
        adCode: true,
        adBankName: true,
        adCodePorts: true,
        gstin: true,
      },
    });
    if (!profile) throw new NotFoundException('Business profile not found');
    return profile;
  }

  async confirmAnnualUpdate(tenantId: string) {
    return this.prisma.businessProfile.update({
      where: { tenantId },
      data: { iecStatus: 'ACTIVE', iecLastConfirmedAt: new Date() },
    });
  }

  async updateAdCode(tenantId: string, dto: { adCode?: string; adBankName?: string; adCodePorts?: string }) {
    return this.prisma.businessProfile.update({
      where: { tenantId },
      data: {
        ...(dto.adCode !== undefined && { adCode: dto.adCode }),
        ...(dto.adBankName !== undefined && { adBankName: dto.adBankName }),
        ...(dto.adCodePorts !== undefined && { adCodePorts: dto.adCodePorts }),
      },
    });
  }
}