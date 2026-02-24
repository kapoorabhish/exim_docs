import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { differenceInDays } from 'date-fns';

@Injectable()
export class ReconciliationService {
  constructor(private prisma: PrismaService) {}

  async getUnreconciled(tenantId: string, statementId: string) {
    const stmt = await this.prisma.bankStatement.findFirst({ where: { id: statementId, tenantId } });
    if (!stmt) throw new NotFoundException('Bank statement not found');

    return this.prisma.bankStatementEntry.findMany({
      where: { statementId, reconciliationStatus: 'UNRECONCILED' },
      orderBy: { entryDate: 'asc' },
    });
  }

  async getUnmatchedPayments(tenantId: string) {
    const [exportPayments, importPayments, advances] = await Promise.all([
      this.prisma.exportPayment.findMany({
        where: { tenantId, status: { in: ['PENDING_CLEARANCE'] } },
        select: {
          id: true, paymentDate: true, foreignAmount: true, currency: true, referenceNumber: true,
          buyer: { select: { name: true } },
        },
      }),
      this.prisma.importPayment.findMany({
        where: { tenantId, status: { in: ['PENDING'] } },
        select: { id: true, paymentDate: true, foreignAmount: true, currency: true, referenceNumber: true },
      }),
      this.prisma.advancePayment.findMany({
        where: { tenantId, status: 'OPEN' },
        select: { id: true, advanceDate: true, foreignAmount: true, currency: true },
      }),
    ]);

    return {
      exportPayments: exportPayments.map((p) => ({ ...p, type: 'EXPORT' })),
      importPayments: importPayments.map((p) => ({ ...p, type: 'IMPORT' })),
      advances: advances.map((p) => ({ ...p, type: 'ADVANCE' })),
    };
  }

  async autoMatch(tenantId: string, statementId: string, userId: string) {
    const entries = await this.prisma.bankStatementEntry.findMany({
      where: { statementId, reconciliationStatus: 'UNRECONCILED', entryType: 'CREDIT' },
    });

    const exportPayments = await this.prisma.exportPayment.findMany({
      where: { tenantId, status: { in: ['PENDING_CLEARANCE'] } },
    });

    let matchCount = 0;
    for (const entry of entries) {
      for (const payment of exportPayments) {
        const amountMatch = Math.abs(Number(entry.amount) - Number(payment.foreignAmount)) < 0.01;
        const dateDiff = Math.abs(differenceInDays(entry.entryDate, payment.paymentDate));
        const refMatch =
          entry.reference &&
          payment.referenceNumber &&
          (entry.reference.includes(payment.referenceNumber) ||
            payment.referenceNumber.includes(entry.reference));

        if (amountMatch && dateDiff <= 2 && refMatch) {
          await this.prisma.bankStatementEntry.update({
            where: { id: entry.id },
            data: {
              reconciliationStatus: 'MATCHED',
              exportPaymentId: payment.id,
              matchedAt: new Date(),
              matchedBy: userId,
            },
          });
          matchCount++;
          break;
        }
      }
    }

    return { matched: matchCount, total: entries.length };
  }

  async manualMatch(
    tenantId: string,
    dto: { entryId: string; paymentType: 'EXPORT' | 'IMPORT' | 'ADVANCE'; paymentId: string; userId: string },
  ) {
    const entry = await this.prisma.bankStatementEntry.findFirst({ where: { id: dto.entryId } });
    if (!entry) throw new NotFoundException('Bank statement entry not found');

    const data: any = {
      reconciliationStatus: 'MANUALLY_MATCHED',
      matchedAt: new Date(),
      matchedBy: dto.userId,
    };

    if (dto.paymentType === 'EXPORT') data.exportPaymentId = dto.paymentId;
    else if (dto.paymentType === 'IMPORT') data.importPaymentId = dto.paymentId;
    else data.advancePaymentId = dto.paymentId;

    return this.prisma.bankStatementEntry.update({ where: { id: dto.entryId }, data });
  }
}