import { Injectable, NotFoundException } from '@nestjs/common';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  ProformaInvoicePdf,
  CommercialInvoicePdf,
  PackingListPdf,
  SupplierInvoicePdf,
  type ProformaInvoicePdfData,
  type CommercialInvoicePdfData,
  type PackingListPdfData,
  type SupplierInvoicePdfData,
} from '@exim/pdf';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class PdfService {
  constructor(private prisma: PrismaService) {}

  // ─── Proforma Invoice ─────────────────────────────────────────────────────

  async renderProforma(tenantId: string, id: string): Promise<Buffer> {
    const pi = await this.prisma.proformaInvoice.findFirst({
      where: { id, tenantId },
      include: {
        buyer: true,
        lineItems: { orderBy: { lineNumber: 'asc' } },
      },
    });
    if (!pi) throw new NotFoundException('Proforma invoice not found');

    const { company, bank } = await this.getTenantProfile(tenantId);

    const data: ProformaInvoicePdfData = {
      piNumber: pi.piNumber,
      version: pi.version,
      date: pi.date.toISOString(),
      validUntil: pi.validUntil?.toISOString(),
      currency: pi.currency,
      incoterm: pi.incoterm ?? undefined,
      portOfLoading: pi.portOfLoading ?? undefined,
      portOfDischarge: pi.portOfDischarge ?? undefined,
      deliveryTimeline: pi.deliveryTerms ?? undefined,
      paymentTerms: pi.paymentTerms ?? undefined,
      freight: pi.freight ? Number(pi.freight) : undefined,
      insurance: pi.insurance ? Number(pi.insurance) : undefined,
      totalAmount: Number(pi.totalAmount),
      notes: pi.notes ?? undefined,
      termsContent: pi.termsContent ?? undefined,
      lineItems: pi.lineItems.map((li) => ({
        lineNumber: li.lineNumber,
        description: li.description,
        hsCode: li.hsCode ?? undefined,
        quantity: Number(li.quantity),
        uomCode: li.uomCode,
        unitPrice: Number(li.unitPrice),
        amount: Number(li.amount),
      })),
      buyer: {
        name: pi.buyer.name,
        address: pi.buyer.address ?? undefined,
        city: pi.buyer.city ?? undefined,
        country: pi.buyer.country ?? undefined,
      },
      company,
      bank,
    };

    return renderToBuffer(React.createElement(ProformaInvoicePdf, { data }) as any);
  }

  // ─── Commercial Invoice ───────────────────────────────────────────────────

  async renderInvoice(tenantId: string, id: string): Promise<Buffer> {
    const inv = await this.prisma.commercialInvoice.findFirst({
      where: { id, tenantId },
      include: {
        buyer: true,
        lineItems: { orderBy: { lineNumber: 'asc' } },
      },
    });
    if (!inv) throw new NotFoundException('Invoice not found');

    const { company, bank } = await this.getTenantProfile(tenantId);

    const data: CommercialInvoicePdfData = {
      invoiceNumber: inv.invoiceNumber,
      date: inv.date.toISOString(),
      currency: inv.currency,
      incoterm: inv.incoterm ?? undefined,
      portOfLoading: inv.portOfLoading ?? undefined,
      portOfDischarge: inv.portOfDischarge ?? undefined,
      paymentTerms: inv.paymentTerms ?? undefined,
      lut: inv.exportDeclaration ?? undefined,
      freight: inv.freight ? Number(inv.freight) : undefined,
      insurance: inv.insurance ? Number(inv.insurance) : undefined,
      totalAmount: Number(inv.totalAmount),
      exchangeRate: Number(inv.exchangeRate),
      notes: inv.notes ?? undefined,
      termsContent: inv.termsContent ?? undefined,
      lineItems: inv.lineItems.map((li) => ({
        lineNumber: li.lineNumber,
        description: li.description,
        hsCode: li.hsCode ?? undefined,
        quantity: Number(li.quantity),
        uomCode: li.uomCode,
        unitPrice: Number(li.unitPrice),
        amount: Number(li.amount),
        netWeight: li.netWeight ? Number(li.netWeight) : undefined,
        grossWeight: li.grossWeight ? Number(li.grossWeight) : undefined,
      })),
      buyer: {
        name: inv.buyer.name,
        address: inv.buyer.address ?? undefined,
        city: inv.buyer.city ?? undefined,
        country: inv.buyer.country ?? undefined,
      },
      company,
      bank,
    };

    return renderToBuffer(React.createElement(CommercialInvoicePdf, { data }) as any);
  }

  // ─── Packing List ─────────────────────────────────────────────────────────

  async renderPackingList(tenantId: string, id: string): Promise<Buffer> {
    const pl = await this.prisma.packingList.findFirst({
      where: { id, tenantId },
      include: {
        packages: { orderBy: { packageNo: 'asc' } },
        invoice: {
          select: {
            invoiceNumber: true,
            currency: true,
            totalAmount: true,
            buyer: { select: { name: true, country: true } },
          },
        },
      },
    });
    if (!pl) throw new NotFoundException('Packing list not found');

    const { company } = await this.getTenantProfile(tenantId);

    const data: PackingListPdfData = {
      plNumber: pl.plNumber,
      date: pl.date.toISOString(),
      shippingMarks: pl.shippingMarks ?? undefined,
      notes: pl.notes ?? undefined,
      totalPackages: pl.totalPackages ?? 0,
      totalNetWeight: Number(pl.totalNetWeight ?? 0),
      totalGrossWeight: Number(pl.totalGrossWeight ?? 0),
      totalCbm: Number(pl.totalCbm ?? 0),
      packages: pl.packages.map((pkg) => ({
        packageNo: pkg.packageNo,
        contents: pkg.contents ?? '',
        quantity: Number(pkg.quantity),
        netWeight: Number(pkg.netWeight),
        grossWeight: Number(pkg.grossWeight),
        cbm: pkg.cbm ? Number(pkg.cbm) : undefined,
        dimensionL: pkg.dimensionL ? Number(pkg.dimensionL) : undefined,
        dimensionW: pkg.dimensionW ? Number(pkg.dimensionW) : undefined,
        dimensionH: pkg.dimensionH ? Number(pkg.dimensionH) : undefined,
      })),
      invoice: {
        invoiceNumber: pl.invoice.invoiceNumber,
        currency: pl.invoice.currency,
        totalAmount: Number(pl.invoice.totalAmount),
        buyer: pl.invoice.buyer
          ? { name: pl.invoice.buyer.name, country: pl.invoice.buyer.country ?? undefined }
          : undefined,
      },
      company,
    };

    return renderToBuffer(React.createElement(PackingListPdf, { data }) as any);
  }

  // ─── Supplier Invoice ─────────────────────────────────────────────────────

  async renderSupplierInvoice(tenantId: string, id: string): Promise<Buffer> {
    const inv = await this.prisma.supplierInvoice.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        po: { select: { poNumber: true } },
        lineItems: { orderBy: { lineNumber: 'asc' } },
      },
    });
    if (!inv) throw new NotFoundException('Supplier invoice not found');

    const profile = await this.prisma.businessProfile.findUnique({ where: { tenantId } });

    const data: SupplierInvoicePdfData = {
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate.toISOString(),
      dueDate: inv.dueDate?.toISOString(),
      currency: inv.currency,
      exchangeRate: Number(inv.exchangeRate),
      totalAmount: Number(inv.totalAmount),
      notes: inv.notes ?? undefined,
      poNumber: inv.po?.poNumber ?? undefined,
      lineItems: inv.lineItems.map((li) => ({
        lineNumber: li.lineNumber,
        description: li.description,
        hsCode: li.hsCode ?? undefined,
        quantity: Number(li.quantity),
        uomCode: li.uomCode,
        unitPrice: Number(li.unitPrice),
        totalPrice: Number(li.totalPrice),
      })),
      supplier: {
        name: inv.supplier.name,
        address: inv.supplier.address ?? undefined,
        city: inv.supplier.city ?? undefined,
        country: inv.supplier.country ?? undefined,
      },
      company: {
        companyName: profile?.companyName ?? 'Company',
        address: profile?.registeredAddress ?? undefined,
        gstin: profile?.gstin ?? undefined,
        iec: profile?.iecNumber ?? undefined,
      },
    };

    return renderToBuffer(React.createElement(SupplierInvoicePdf, { data }) as any);
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────

  private async getTenantProfile(tenantId: string) {
    const [profile, bankAccount] = await Promise.all([
      this.prisma.businessProfile.findUnique({ where: { tenantId } }),
      this.prisma.bankAccount.findFirst({ where: { tenantId, isDefaultExport: true } }),
    ]);

    const company = {
      companyName: profile?.companyName ?? 'Company',
      address: profile?.registeredAddress ?? undefined,
      gstin: profile?.gstin ?? undefined,
      iec: profile?.iecNumber ?? undefined,
      pan: profile?.pan ?? undefined,
    };

    const bank = bankAccount
      ? {
          bankName: bankAccount.bankName,
          branch: bankAccount.branch ?? undefined,
          accountNumber: bankAccount.accountNumber,
          ifsc: bankAccount.ifscCode ?? undefined,
          swiftCode: bankAccount.swiftCode ?? undefined,
        }
      : undefined;

    return { company, bank };
  }
}
