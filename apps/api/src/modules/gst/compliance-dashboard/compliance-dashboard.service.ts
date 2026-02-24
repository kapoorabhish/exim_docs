import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { differenceInDays } from 'date-fns';

@Injectable()
export class ComplianceDashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const today = new Date();

    const luts = await this.prisma.lutRecord.findMany({
      where: { tenantId, status: { in: ['ACTIVE', 'EXPIRING'] } },
      orderBy: { expiryDate: 'asc' },
    });
    const activeLut = luts[0] ?? null;
    const lutDaysRemaining = activeLut ? differenceInDays(activeLut.expiryDate, today) : null;

    const gstr1Pending = await this.prisma.commercialInvoice.count({
      where: { tenantId, status: { in: ['FINALIZED', 'LOCKED'] }, gstr1Filed: false },
    });

    const igstResult = await this.prisma.billOfEntry.aggregate({
      where: { tenantId, igstCreditStatus: 'UNCLAIMED' },
      _sum: { igst: true },
      _count: true,
    });

    const profile = await this.prisma.businessProfile.findUnique({
      where: { tenantId },
      select: { iecStatus: true, iecLastConfirmedAt: true },
    });

    return {
      lut: {
        hasActive: !!activeLut,
        daysRemaining: lutDaysRemaining,
        expiryDate: activeLut?.expiryDate ?? null,
        arnNumber: activeLut?.arnNumber ?? null,
      },
      gstr1: { pendingInvoices: gstr1Pending },
      igstCredit: {
        unclaimedCount: igstResult._count,
        unclaimedTotal: Number(igstResult._sum.igst ?? 0),
      },
      iec: {
        status: profile?.iecStatus ?? 'ACTIVE',
        lastConfirmedAt: profile?.iecLastConfirmedAt ?? null,
      },
    };
  }
}