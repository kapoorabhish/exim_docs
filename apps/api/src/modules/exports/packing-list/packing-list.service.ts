import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';

@Injectable()
export class PackingListService {
  constructor(
    private prisma: PrismaService,
    private docNumber: DocNumberService,
  ) {}

  list(tenantId: string, query: any) {
    const { status, invoiceId, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    return this.prisma.packingList.findMany({
      where: {
        tenantId,
        ...(status && { status }),
        ...(invoiceId && { invoiceId }),
      },
      include: {
        invoice: { select: { invoiceNumber: true, currency: true, totalAmount: true } },
        _count: { select: { packages: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    });
  }

  async getById(tenantId: string, id: string) {
    const pl = await this.prisma.packingList.findFirst({
      where: { id, tenantId },
      include: {
        invoice: { select: { invoiceNumber: true, currency: true, buyerPartyId: true } },
        packages: { orderBy: { packageNo: 'asc' } },
      },
    });
    if (!pl) throw new NotFoundException('Packing list not found');
    return pl;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { invoiceId, packages, ...rest } = dto;

    // Verify invoice belongs to tenant
    const invoice = await this.prisma.commercialInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lineItems: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const plNumber = await this.docNumber.getNextNumber(tenantId, 'PL');

    // Pre-fill packages from invoice line items if no packages provided
    const packageData: any[] = packages && packages.length > 0
      ? packages
      : invoice.lineItems.map((item, index) => ({
          packageNo: `${index + 1}/${invoice.lineItems.length}`,
          contents: item.description,
          quantity: item.quantity,
          netWeight: item.netWeight ?? 0,
          grossWeight: item.grossWeight ?? 0,
          dimensionL: null,
          dimensionW: null,
          dimensionH: null,
          cbm: null,
        }));

    const processedPackages = this.calcPackages(packageData);
    const totals = this.sumTotals(processedPackages);

    return this.prisma.packingList.create({
      data: {
        tenantId,
        plNumber,
        invoiceId,
        date: rest.date ? new Date(rest.date) : new Date(),
        shippingMarks: rest.shippingMarks,
        notes: rest.notes,
        createdBy: userId,
        ...totals,
        packages: { create: processedPackages },
      },
      include: { packages: true },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    const pl = await this.prisma.packingList.findFirst({ where: { id, tenantId } });
    if (!pl) throw new NotFoundException('Packing list not found');
    if (pl.status !== 'DRAFT') throw new BadRequestException('Only DRAFT packing lists can be updated');

    const { packages, ...rest } = dto;

    const processedPackages = packages ? this.calcPackages(packages) : undefined;
    const totals = processedPackages ? this.sumTotals(processedPackages) : {};

    return this.prisma.$transaction(async (tx) => {
      if (processedPackages) {
        await tx.packingItem.deleteMany({ where: { plId: id } });
        await tx.packingItem.createMany({ data: processedPackages.map((p: any) => ({ ...p, plId: id })) });
      }
      return tx.packingList.update({
        where: { id },
        data: {
          ...(rest.date && { date: new Date(rest.date) }),
          ...(rest.shippingMarks !== undefined && { shippingMarks: rest.shippingMarks }),
          ...(rest.notes !== undefined && { notes: rest.notes }),
          ...totals,
        },
        include: { packages: true },
      });
    });
  }

  async finalize(tenantId: string, id: string) {
    const pl = await this.prisma.packingList.findFirst({ where: { id, tenantId } });
    if (!pl) throw new NotFoundException('Packing list not found');
    if (pl.status !== 'DRAFT') throw new BadRequestException('Only DRAFT packing lists can be finalized');

    return this.prisma.packingList.update({
      where: { id },
      data: { status: 'FINALIZED' },
    });
  }

  async delete(tenantId: string, id: string) {
    const pl = await this.prisma.packingList.findFirst({ where: { id, tenantId } });
    if (!pl) throw new NotFoundException('Packing list not found');
    if (pl.status !== 'DRAFT') throw new BadRequestException('Only DRAFT packing lists can be deleted');

    await this.prisma.packingList.delete({ where: { id } });
    return { message: 'Packing list deleted' };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private calcPackages(packages: any[]): any[] {
    return packages.map((pkg) => {
      const l = pkg.dimensionL ? Number(pkg.dimensionL) : null;
      const w = pkg.dimensionW ? Number(pkg.dimensionW) : null;
      const h = pkg.dimensionH ? Number(pkg.dimensionH) : null;
      const cbm = l && w && h
        ? Math.round((l * w * h / 1_000_000) * 10_000) / 10_000
        : pkg.cbm ?? null;
      return { ...pkg, cbm };
    });
  }

  private sumTotals(packages: any[]) {
    const totalPackages = packages.length;
    const totalNetWeight = packages.reduce((s, p) => s + (Number(p.netWeight) || 0), 0);
    const totalGrossWeight = packages.reduce((s, p) => s + (Number(p.grossWeight) || 0), 0);
    const totalCbm = packages.reduce((s, p) => s + (Number(p.cbm) || 0), 0);
    return {
      totalPackages,
      totalNetWeight: Number(totalNetWeight.toFixed(3)),
      totalGrossWeight: Number(totalGrossWeight.toFixed(3)),
      totalCbm: Number(totalCbm.toFixed(4)),
    };
  }
}