import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class IgstCreditService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query: { status?: string; month?: string; page?: number; pageSize?: number }) {
    const { status, month, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId };
    if (status) where.igstCreditStatus = status;
    if (month) where.gstr3bMonth = month;

    const [data, total] = await Promise.all([
      this.prisma.billOfEntry.findMany({
        where,
        include: {
          invoice: { select: { id: true, invoiceNumber: true, invoiceDate: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.billOfEntry.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async markClaimed(tenantId: string, id: string, dto: { month: string }) {
    const boe = await this.prisma.billOfEntry.findFirst({ where: { id, tenantId } });
    if (!boe) throw new NotFoundException('Bill of Entry not found');
    if (boe.igstCreditStatus === 'CLAIMED') throw new BadRequestException('IGST credit already claimed');

    return this.prisma.billOfEntry.update({
      where: { id },
      data: { igstCreditStatus: 'CLAIMED', gstr3bMonth: dto.month },
    });
  }

  async summary(tenantId: string) {
    const [unclaimed, claimed] = await Promise.all([
      this.prisma.billOfEntry.aggregate({
        where: { tenantId, igstCreditStatus: 'UNCLAIMED' },
        _sum: { igst: true },
        _count: true,
      }),
      this.prisma.billOfEntry.aggregate({
        where: { tenantId, igstCreditStatus: 'CLAIMED' },
        _sum: { igst: true },
        _count: true,
      }),
    ]);
    return {
      unclaimed: { count: unclaimed._count, totalIgst: Number(unclaimed._sum.igst ?? 0) },
      claimed: { count: claimed._count, totalIgst: Number(claimed._sum.igst ?? 0) },
    };
  }
}