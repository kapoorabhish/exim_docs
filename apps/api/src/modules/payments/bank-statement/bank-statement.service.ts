import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class BankStatementService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;
    const [data, total] = await Promise.all([
      this.prisma.bankStatement.findMany({
        where: { tenantId },
        orderBy: { statementDate: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.bankStatement.count({ where: { tenantId } }),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async getById(tenantId: string, id: string) {
    const stmt = await this.prisma.bankStatement.findFirst({
      where: { id, tenantId },
      include: { entries: { orderBy: { entryDate: 'asc' } } },
    });
    if (!stmt) throw new NotFoundException('Bank statement not found');
    return stmt;
  }

  async import(
    tenantId: string,
    userId: string,
    dto: {
      bankName: string;
      accountNumber?: string;
      statementDate: string;
      openingBalance: number;
      closingBalance: number;
      entries: Array<{
        entryDate: string;
        valueDate?: string;
        description: string;
        reference?: string;
        entryType: string;
        amount: number;
        balance: number;
      }>;
    },
  ) {
    return this.prisma.bankStatement.create({
      data: {
        tenantId,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber ?? null,
        statementDate: new Date(dto.statementDate),
        openingBalance: dto.openingBalance,
        closingBalance: dto.closingBalance,
        entryCount: dto.entries.length,
        uploadedBy: userId,
        entries: {
          create: dto.entries.map((e) => ({
            entryDate: new Date(e.entryDate),
            valueDate: e.valueDate ? new Date(e.valueDate) : null,
            description: e.description,
            reference: e.reference ?? null,
            entryType: e.entryType as any,
            amount: e.amount,
            balance: e.balance,
            reconciliationStatus: 'UNRECONCILED',
          })),
        },
      },
      include: { entries: true },
    });
  }

  async delete(tenantId: string, id: string) {
    const stmt = await this.prisma.bankStatement.findFirst({ where: { id, tenantId } });
    if (!stmt) throw new NotFoundException('Bank statement not found');
    await this.prisma.bankStatement.delete({ where: { id } });
    return { message: 'Bank statement deleted' };
  }
}