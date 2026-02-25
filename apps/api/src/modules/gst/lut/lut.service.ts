import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { addDays, differenceInDays } from 'date-fns';

@Injectable()
export class LutService {
  constructor(private prisma: PrismaService) {}

  private computeStatus(lut: { expiryDate: Date; status: string }): string {
    const today = new Date();
    if (lut.status === 'APPLIED') return 'APPLIED';
    if (lut.expiryDate < today) return 'EXPIRED';
    if (differenceInDays(lut.expiryDate, today) <= 30) return 'EXPIRING';
    return 'ACTIVE';
  }

  async list(tenantId: string) {
    const records = await this.prisma.lutRecord.findMany({
      where: { tenantId },
      orderBy: { filingDate: 'desc' },
    });
    return records.map((r) => ({ ...r, status: this.computeStatus(r) }));
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { arnNumber, filingDate, financialYear, documentUrl, notes } = dto;
    const filing = new Date(filingDate);
    const expiryDate = addDays(filing, 365);

    return this.prisma.lutRecord.create({
      data: {
        tenantId,
        arnNumber,
        filingDate: filing,
        financialYear,
        expiryDate,
        status: 'APPLIED',
        documentUrl: documentUrl ?? null,
        notes: notes ?? null,
        createdBy: userId,
      },
    });
  }

  async getById(tenantId: string, id: string) {
    const lut = await this.prisma.lutRecord.findFirst({ where: { id, tenantId } });
    if (!lut) throw new NotFoundException('LUT record not found');
    return { ...lut, status: this.computeStatus(lut) };
  }

  async update(tenantId: string, id: string, dto: any) {
    const lut = await this.prisma.lutRecord.findFirst({ where: { id, tenantId } });
    if (!lut) throw new NotFoundException('LUT record not found');
    return this.prisma.lutRecord.update({
      where: { id },
      data: {
        ...(dto.documentUrl !== undefined && { documentUrl: dto.documentUrl }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.arnNumber !== undefined && { arnNumber: dto.arnNumber }),
      },
    });
  }

  async activate(tenantId: string, id: string) {
    const lut = await this.prisma.lutRecord.findFirst({ where: { id, tenantId } });
    if (!lut) throw new NotFoundException('LUT record not found');
    if (lut.status !== 'APPLIED') throw new BadRequestException('Only APPLIED LUT records can be activated');

    const existing = await this.prisma.lutRecord.findFirst({
      where: { tenantId, financialYear: lut.financialYear, status: 'ACTIVE', id: { not: id } },
    });
    if (existing) throw new BadRequestException(`An ACTIVE LUT already exists for FY ${lut.financialYear}`);

    return this.prisma.lutRecord.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async delete(tenantId: string, id: string) {
    const lut = await this.prisma.lutRecord.findFirst({ where: { id, tenantId } });
    if (!lut) throw new NotFoundException('LUT record not found');
    if (lut.status !== 'APPLIED') throw new BadRequestException('Only APPLIED LUT records can be deleted');
    await this.prisma.lutRecord.delete({ where: { id } });
    return { message: 'LUT record deleted' };
  }

  async getActiveLut(tenantId: string) {
    const all = await this.prisma.lutRecord.findMany({
      where: { tenantId, status: { in: ['ACTIVE', 'EXPIRING'] } },
    });
    const computed = all.map((r) => ({ ...r, status: this.computeStatus(r) }));
    return computed.find((r) => r.status === 'ACTIVE' || r.status === 'EXPIRING') ?? null;
  }
}