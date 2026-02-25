import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { DocNumberService } from '../../../common/services/doc-number.service';
import { InvoiceService } from '../invoice/invoice.service';

// Allowed transitions in the SB status machine
const TRANSITIONS: Record<string, string> = {
  DRAFT: 'FILED',
  FILED: 'UNDER_ASSESSMENT',
  UNDER_ASSESSMENT: 'ASSESSED',
  ASSESSED: 'LEO',
  LEO: 'SHIPPED',
};

@Injectable()
export class ShippingBillService {
  constructor(
    private prisma: PrismaService,
    private docNumber: DocNumberService,
    private invoiceService: InvoiceService,
  ) {}

  list(tenantId: string, query: any) {
    const { status, sbType, dateFrom, dateTo, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    return this.prisma.shippingBill.findMany({
      where: {
        tenantId,
        ...(status && { status }),
        ...(sbType && { sbType }),
        ...(dateFrom || dateTo
          ? { date: { ...(dateFrom && { gte: new Date(dateFrom) }), ...(dateTo && { lte: new Date(dateTo) }) } }
          : {}),
      },
      include: {
        invoice: { select: { id: true, invoiceNumber: true, currency: true, totalAmount: true } },
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    });
  }

  async getById(tenantId: string, id: string) {
    const sb = await this.prisma.shippingBill.findFirst({
      where: { id, tenantId },
      include: {
        invoice: { select: { invoiceNumber: true, currency: true, totalAmount: true, exchangeRate: true } },
        lineItems: { orderBy: { lineNumber: 'asc' } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });
    if (!sb) throw new NotFoundException('Shipping bill not found');
    return sb;
  }

  async create(tenantId: string, userId: string, dto: any) {
    const { invoiceId, lineItems, ...rest } = dto;

    const invoice = await this.prisma.commercialInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lineItems: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const sbNumber = await this.docNumber.getNextNumber(tenantId, 'SB');

    // Pre-fill from invoice line items if not provided
    const itemData = lineItems && lineItems.length > 0
      ? lineItems
      : invoice.lineItems.map((item, idx) => ({
          lineNumber: idx + 1,
          description: item.description,
          hsCode: item.hsCode ?? '',
          quantity: item.quantity,
          uomCode: item.uomCode,
          unitPriceInr: Number(item.unitPrice) * Number(invoice.exchangeRate ?? 1),
          fobValueInr: Number(item.amount) * Number(invoice.exchangeRate ?? 1),
          drawbackRate: null,
          drawbackAmount: null,
        }));

    const totalFobInr = itemData.reduce((s: number, i: any) => s + Number(i.fobValueInr), 0);

    const sb = await this.prisma.shippingBill.create({
      data: {
        tenantId,
        sbNumber,
        sbType: rest.sbType ?? 'FREE',
        status: 'DRAFT',
        date: rest.date ? new Date(rest.date) : new Date(),
        invoiceId,
        portCode: rest.portCode,
        modeOfShipment: rest.modeOfShipment ?? 'SEA',
        countryOfDestination: rest.countryOfDestination,
        exchangeRate: invoice.exchangeRate ?? 1,
        totalFobInr,
        freightInr: rest.freightInr ?? null,
        insuranceInr: rest.insuranceInr ?? null,
        notes: rest.notes ?? null,
        createdBy: userId,
        lineItems: { create: itemData },
        statusHistory: {
          create: { status: 'DRAFT', changedBy: userId, notes: 'Created' },
        },
      },
      include: { lineItems: true, statusHistory: true },
    });

    return sb;
  }

  async update(tenantId: string, id: string, dto: any) {
    const sb = await this.prisma.shippingBill.findFirst({ where: { id, tenantId } });
    if (!sb) throw new NotFoundException('Shipping bill not found');
    if (sb.status !== 'DRAFT') throw new BadRequestException('Only DRAFT shipping bills can be updated');

    const { lineItems, ...rest } = dto;

    const itemData = lineItems;
    const totalFobInr = itemData
      ? itemData.reduce((s: number, i: any) => s + Number(i.fobValueInr), 0)
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      if (itemData) {
        await tx.sbLineItem.deleteMany({ where: { sbId: id } });
        await tx.sbLineItem.createMany({ data: itemData.map((i: any) => ({ ...i, sbId: id })) });
      }
      return tx.shippingBill.update({
        where: { id },
        data: {
          ...(rest.sbType && { sbType: rest.sbType }),
          ...(rest.date && { date: new Date(rest.date) }),
          ...(rest.portCode && { portCode: rest.portCode }),
          ...(rest.modeOfShipment && { modeOfShipment: rest.modeOfShipment }),
          ...(rest.countryOfDestination && { countryOfDestination: rest.countryOfDestination }),
          ...(rest.exchangeRate !== undefined && { exchangeRate: rest.exchangeRate }),
          ...(totalFobInr !== undefined && { totalFobInr }),
          ...(rest.freightInr !== undefined && { freightInr: rest.freightInr }),
          ...(rest.insuranceInr !== undefined && { insuranceInr: rest.insuranceInr }),
          ...(rest.notes !== undefined && { notes: rest.notes }),
        },
        include: { lineItems: true, statusHistory: { orderBy: { changedAt: 'asc' } } },
      });
    });
  }

  async transitionStatus(tenantId: string, id: string, userId: string, body: any) {
    const sb = await this.prisma.shippingBill.findFirst({ where: { id, tenantId } });
    if (!sb) throw new NotFoundException('Shipping bill not found');

    const { status: nextStatus, notes, leoNumber, leoDate } = body;
    const allowedNext = TRANSITIONS[sb.status];

    if (!allowedNext) throw new BadRequestException(`No transitions allowed from ${sb.status}`);
    if (nextStatus !== allowedNext) {
      throw new BadRequestException(
        `Invalid transition. Current: ${sb.status}, allowed next: ${allowedNext}`,
      );
    }

    if (nextStatus === 'LEO') {
      if (!leoNumber || !leoDate) {
        throw new BadRequestException('leoNumber and leoDate are required when transitioning to LEO');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shippingBill.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(nextStatus === 'LEO' && {
            leoNumber,
            leoDate: new Date(leoDate),
          }),
        },
      });

      await tx.sbStatusHistory.create({
        data: { sbId: id, status: nextStatus, changedBy: userId, notes: notes ?? null },
      });

      // When filed → lock the linked Commercial Invoice
      if (nextStatus === 'FILED') {
        await this.invoiceService.lock(tenantId, sb.invoiceId);
      }

      return updated;
    });
  }

  async delete(tenantId: string, id: string) {
    const sb = await this.prisma.shippingBill.findFirst({ where: { id, tenantId } });
    if (!sb) throw new NotFoundException('Shipping bill not found');
    if (sb.status !== 'DRAFT') throw new BadRequestException('Only DRAFT shipping bills can be deleted');

    await this.prisma.shippingBill.delete({ where: { id } });
    return { message: 'Shipping bill deleted' };
  }
}