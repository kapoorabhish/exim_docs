import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';

@Injectable()
export class AdvancePaymentService {
  constructor(
    private prisma: PrismaService,
    private docNumber: DocNumberService,
  ) {}

  async list(tenantId: string, query: {
    type?: string;
    status?: string;
    partyId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { type, status, partyId, page = 1, pageSize = 20 } = query;
    const where: any = { tenantId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (partyId) where.partyId = partyId;

    const [data, total] = await Promise.all([
      this.prisma.advancePayment.findMany({
        where,
        include: {
          party: { select: { id: true, name: true, country: true } },
          adjustments: true,
        },
        orderBy: { advanceDate: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.advancePayment.count({ where }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getById(tenantId: string, id: string) {
    const advance = await this.prisma.advancePayment.findFirst({
      where: { id, tenantId },
      include: { party: true, adjustments: true },
    });
    if (!advance) throw new NotFoundException('Advance payment not found');
    return advance;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const advanceNumber = await this.docNumber.getNextNumber(tenantId, 'ADV');
    return this.prisma.advancePayment.create({
      data: {
        ...dto,
        tenantId,
        advanceNumber,
        createdBy: userId,
        adjustedAmount: 0,
        status: 'OPEN',
      },
      include: { party: { select: { id: true, name: true } } },
    });
  }

  async adjust(tenantId: string, advanceId: string, dto: {
    exportPaymentId?: string;
    importPaymentId?: string;
    adjustedAmount: number;
    notes?: string;
  }) {
    const advance = await this.prisma.advancePayment.findFirst({ where: { id: advanceId, tenantId } });
    if (!advance) throw new NotFoundException('Advance payment not found');
    if (advance.status === 'FULLY_ADJUSTED') throw new BadRequestException('Advance is already fully adjusted');

    const available = Number(advance.foreignAmount) - Number(advance.adjustedAmount);
    if (dto.adjustedAmount > available) {
      throw new BadRequestException(`Adjustment amount (${dto.adjustedAmount}) exceeds available balance (${available})`);
    }

    const newAdjusted = Number(advance.adjustedAmount) + dto.adjustedAmount;
    const newStatus = newAdjusted >= Number(advance.foreignAmount) ? 'FULLY_ADJUSTED' : 'PARTIALLY_ADJUSTED';

    const [adjustment] = await this.prisma.$transaction([
      this.prisma.advancePaymentAdjustment.create({
        data: {
          advanceId,
          exportPaymentId: dto.exportPaymentId,
          importPaymentId: dto.importPaymentId,
          adjustedAmount: dto.adjustedAmount,
          adjustmentDate: new Date(),
          notes: dto.notes,
        },
      }),
      this.prisma.advancePayment.update({
        where: { id: advanceId },
        data: { adjustedAmount: newAdjusted, status: newStatus as any },
      }),
    ]);

    return adjustment;
  }

  async delete(tenantId: string, id: string) {
    const advance = await this.prisma.advancePayment.findFirst({ where: { id, tenantId } });
    if (!advance) throw new NotFoundException('Advance payment not found');
    if (advance.status !== 'OPEN') throw new BadRequestException('Only OPEN advances can be deleted');
    await this.prisma.advancePayment.delete({ where: { id } });
    return { success: true };
  }
}