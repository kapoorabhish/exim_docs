import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { base, BRAND, BRAND_LIGHT, BORDER_COLOR, TEXT_SECONDARY } from '../styles';

export interface SiLineItemPdf {
  lineNumber: number;
  description: string;
  hsCode?: string;
  quantity: number;
  uomCode: string;
  unitPrice: number;
  totalPrice: number;
}

export interface SupplierInvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  currency: string;
  exchangeRate: number;
  totalAmount: number;
  notes?: string;
  poNumber?: string;
  lineItems: SiLineItemPdf[];
  supplier: {
    name: string;
    address?: string;
    city?: string;
    country?: string;
  };
  company: {
    companyName: string;
    address?: string;
    gstin?: string;
    iec?: string;
  };
}

function fmt(n: number | undefined | null, dec = 2) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtDate(d: string | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function SupplierInvoicePdf({ data }: { data: SupplierInvoicePdfData }) {
  const subtotal = data.lineItems.reduce((s, i) => s + Number(i.totalPrice || 0), 0);

  return (
    <Document>
      <Page size="A4" style={base.page}>
        {/* ── Header ── */}
        <View style={base.headerRow}>
          <View>
            <Text style={base.companyName}>{data.company.companyName}</Text>
            {data.company.address && <Text style={base.companyDetail}>{data.company.address}</Text>}
            {data.company.gstin && <Text style={base.companyDetail}>GSTIN: {data.company.gstin}</Text>}
            {data.company.iec && <Text style={base.companyDetail}>IEC: {data.company.iec}</Text>}
          </View>
          <View>
            <Text style={base.docTitle}>SUPPLIER INVOICE</Text>
            <Text style={[base.docSubtitle, { fontFamily: 'Helvetica-Bold' }]}>{data.invoiceNumber}</Text>
            <Text style={base.docSubtitle}>Invoice Date: {fmtDate(data.invoiceDate)}</Text>
            {data.dueDate && <Text style={base.docSubtitle}>Due Date: {fmtDate(data.dueDate)}</Text>}
            {data.poNumber && <Text style={base.docSubtitle}>PO Ref: {data.poNumber}</Text>}
          </View>
        </View>

        {/* ── Supplier + Currency ── */}
        <View style={base.metaSection}>
          <View style={[base.metaCol, { flex: 2 }]}>
            <Text style={base.metaLabel}>Supplier</Text>
            <Text style={base.metaValue}>{data.supplier.name}</Text>
            {data.supplier.address && <Text style={base.companyDetail}>{data.supplier.address}</Text>}
            {(data.supplier.city || data.supplier.country) && (
              <Text style={base.companyDetail}>
                {[data.supplier.city, data.supplier.country].filter(Boolean).join(', ')}
              </Text>
            )}
          </View>
          <View style={base.metaCol}>
            <Text style={base.metaLabel}>Currency</Text>
            <Text style={base.metaValue}>{data.currency}</Text>
            <Text style={base.metaLabel}>Exchange Rate</Text>
            <Text style={base.metaValueNormal}>1 {data.currency} = ₹{fmt(data.exchangeRate, 4)}</Text>
          </View>
          <View style={base.metaCol}>
            <Text style={base.metaLabel}>Invoice Total</Text>
            <Text style={[base.metaValue, { color: BRAND }]}>
              {data.currency} {fmt(data.totalAmount)}
            </Text>
            <Text style={base.metaLabel}>INR Equivalent</Text>
            <Text style={base.metaValueNormal}>
              ₹{fmt(data.totalAmount * data.exchangeRate)}
            </Text>
          </View>
        </View>

        {/* ── Line Items ── */}
        <Text style={base.sectionHeading}>Line Items</Text>
        <View style={[base.table, { borderTopLeftRadius: 0 }]}>
          <View style={base.tableHeaderRow}>
            <Text style={[base.th, { width: 22 }]}>#</Text>
            <Text style={[base.th, { flex: 1 }]}>Description</Text>
            <Text style={[base.th, { width: 58 }]}>HS Code</Text>
            <Text style={[base.th, { width: 44, textAlign: 'right' }]}>Qty</Text>
            <Text style={[base.th, { width: 30 }]}>UOM</Text>
            <Text style={[base.th, { width: 64, textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[base.th, { width: 72, textAlign: 'right' }]}>Total</Text>
          </View>
          {data.lineItems.map((item, idx) => (
            <View
              key={idx}
              style={idx === data.lineItems.length - 1 ? base.tableRowLast : base.tableRow}
            >
              <Text style={[base.td, { width: 22 }]}>{item.lineNumber}</Text>
              <Text style={[base.td, { flex: 1 }]}>{item.description}</Text>
              <Text style={[base.td, { width: 58 }]}>{item.hsCode || ''}</Text>
              <Text style={[base.tdRight, { width: 44 }]}>{fmt(item.quantity, 3)}</Text>
              <Text style={[base.tdCenter, { width: 30 }]}>{item.uomCode}</Text>
              <Text style={[base.tdRight, { width: 64 }]}>{fmt(item.unitPrice, 4)}</Text>
              <Text style={[base.tdRight, { width: 72 }]}>{fmt(item.totalPrice)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={base.totalsSection}>
          <View style={base.totalsTable}>
            <View style={base.totalsRow}>
              <Text style={base.totalsLabel}>Subtotal</Text>
              <Text style={base.totalsValue}>{data.currency} {fmt(subtotal)}</Text>
            </View>
            <View style={base.totalsRowLast}>
              <Text style={base.totalGrandLabel}>Total</Text>
              <Text style={base.totalGrandValue}>{data.currency} {fmt(data.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {data.notes && (
          <View style={base.termsBox}>
            <Text style={base.termsTitle}>Notes</Text>
            <Text style={base.termsText}>{data.notes}</Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={base.footer}>
          <Text>
            {data.invoiceNumber} · Supplier: {data.supplier.name} · Generated by EXIM Docs
          </Text>
        </View>
      </Page>
    </Document>
  );
}
