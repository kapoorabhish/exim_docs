import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class LandedCostService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query: { boeId?: string; page?: number; pageSize?: number }) {
    const { boeId, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId };
    if (boeId) where.boeId = boeId;

    const [data, total] = await Promise.all([
      this.prisma.landedCost.findMany({
        where,
        include: { boe: { select: { id: true, boeNumber: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (+page - 1) * +pageSize,
        take: +pageSize,
      }),
      this.prisma.landedCost.count({ where }),
    ]);
    return { data, total, page: +page, pageSize: +pageSize };
  }

  async getById(tenantId: string, id: string) {
    const lc = await this.prisma.landedCost.findFirst({
      where: { id, tenantId },
      include: { boe: true },
    });
    if (!lc) throw new NotFoundException('Landed cost not found');
    return lc;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { boeId, ...rest } = dto;

    const boe = await this.prisma.billOfEntry.findFirst({ where: { id: boeId, tenantId } });
    if (!boe) throw new NotFoundException('Bill of entry not found');

    const totals = this.calcTotals(dto);

    return this.prisma.landedCost.create({
      data: {
        ...rest,
        tenantId,
        boeId,
        createdBy: userId,
        totalLandedCost: totals.totalLandedCost,
        costPerUnit: totals.costPerUnit,
      },
      include: { boe: true },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const lc = await this.prisma.landedCost.findFirst({ where: { id, tenantId } });
    if (!lc) throw new NotFoundException('Landed cost not found');

    const merged = { ...lc, ...dto };
    const totals = this.calcTotals(merged);

    return this.prisma.landedCost.update({
      where: { id },
      data: {
        ...dto,
        totalLandedCost: totals.totalLandedCost,
        costPerUnit: totals.costPerUnit,
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const lc = await this.prisma.landedCost.findFirst({ where: { id, tenantId } });
    if (!lc) throw new NotFoundException('Landed cost not found');
    await this.prisma.landedCost.delete({ where: { id } });
    return { success: true };
  }

  private calcTotals(data: any): { totalLandedCost: number; costPerUnit: number } {
    const totalLandedCost =
      Number(data.cifValue ?? 0) +
      Number(data.customsDuty ?? 0) +
      Number(data.clearingCharges ?? 0) +
      Number(data.handlingCharges ?? 0) +
      Number(data.transportCharges ?? 0) +
      Number(data.otherCharges ?? 0);

    const totalQuantity = Number(data.totalQuantity ?? 1);
    const costPerUnit = totalQuantity > 0 ? totalLandedCost / totalQuantity : 0;

    return { totalLandedCost, costPerUnit };
  }
}