import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { base, BRAND, BORDER_COLOR } from '../styles';
import { amountToWords } from '../utils/amountToWords';

export interface PiLineItem {
  lineNumber: number;
  description: string;
  hsCode?: string;
  quantity: number;
  uomCode: string;
  unitPrice: number;
  amount: number;
}

export interface ProformaInvoicePdfData {
  piNumber: string;
  version: number;
  date: string;
  validUntil?: string;
  currency: string;
  incoterm?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  deliveryTimeline?: string;
  paymentTerms?: string;
  freight?: number;
  insurance?: number;
  totalAmount: number;
  notes?: string;
  termsContent?: string;
  lineItems: PiLineItem[];
  buyer: {
    name: string;
    address?: string;
    city?: string;
    country?: string;
    email?: string;
  };
  company: {
    companyName: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    gstin?: string;
    iec?: string;
    pan?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  bank?: {
    bankName?: string;
    branch?: string;
    accountNumber?: string;
    ifsc?: string;
    swiftCode?: string;
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

export function ProformaInvoicePdf({ data }: { data: ProformaInvoicePdfData }) {
  const subtotal = data.lineItems.reduce((s, i) => s + Number(i.amount || 0), 0);
  const freight = Number(data.freight || 0);
  const insurance = Number(data.insurance || 0);
  const grandTotal = subtotal + freight + insurance;
  const wordsLine = `${data.currency} ${amountToWords(grandTotal)}`;

  const { company, buyer, bank } = data;

  return (
    <Document>
      <Page size="A4" style={base.page}>
        {/* ── Header ── */}
        <View style={base.headerRow}>
          <View>
            <Text style={base.companyName}>{company.companyName}</Text>
            {company.address && <Text style={base.companyDetail}>{company.address}</Text>}
            {(company.city || company.pincode) && (
              <Text style={base.companyDetail}>
                {[company.city, company.state, company.pincode].filter(Boolean).join(', ')}
              </Text>
            )}
            {company.gstin && <Text style={base.companyDetail}>GSTIN: {company.gstin}</Text>}
            {company.iec && <Text style={base.companyDetail}>IEC: {company.iec}</Text>}
            {company.phone && <Text style={base.companyDetail}>T: {company.phone}</Text>}
            {company.email && <Text style={base.companyDetail}>E: {company.email}</Text>}
          </View>
          <View>
            <Text style={base.docTitle}>PROFORMA INVOICE</Text>
            <Text style={[base.docSubtitle, { fontFamily: 'Helvetica-Bold' }]}>{data.piNumber} v{data.version}</Text>
            <Text style={base.docSubtitle}>Date: {fmtDate(data.date)}</Text>
            {data.validUntil && <Text style={base.docSubtitle}>Valid Until: {fmtDate(data.validUntil)}</Text>}
            <Text style={[base.docSubtitle, { marginTop: 4, fontSize: 7, fontStyle: 'italic' }]}>
              NOT A TAX INVOICE
            </Text>
          </View>
        </View>

        {/* ── Buyer + Shipping ── */}
        <View style={base.metaSection}>
          <View style={[base.metaCol, { flex: 1.5 }]}>
            <Text style={base.metaLabel}>Bill To / Buyer</Text>
            <Text style={base.metaValue}>{buyer.name}</Text>
            {buyer.address && <Text style={base.companyDetail}>{buyer.address}</Text>}
            {(buyer.city || buyer.country) && (
              <Text style={base.companyDetail}>{[buyer.city, buyer.country].filter(Boolean).join(', ')}</Text>
            )}
            {buyer.email && <Text style={base.companyDetail}>{buyer.email}</Text>}
          </View>
          <View style={base.metaCol}>
            <Text style={base.metaLabel}>Incoterm</Text>
            <Text style={base.metaValue}>{data.incoterm || '—'}</Text>
            <Text style={base.metaLabel}>Port of Loading</Text>
            <Text style={base.metaValue}>{data.portOfLoading || '—'}</Text>
            <Text style={base.metaLabel}>Port of Discharge</Text>
            <Text style={base.metaValue}>{data.portOfDischarge || '—'}</Text>
          </View>
          <View style={base.metaCol}>
            <Text style={base.metaLabel}>Currency</Text>
            <Text style={base.metaValue}>{data.currency}</Text>
            <Text style={base.metaLabel}>Payment Terms</Text>
            <Text style={base.metaValueNormal}>{data.paymentTerms || '—'}</Text>
            <Text style={base.metaLabel}>Delivery</Text>
            <Text style={base.metaValueNormal}>{data.deliveryTimeline || '—'}</Text>
          </View>
        </View>

        {/* ── Line Items ── */}
        <Text style={base.sectionHeading}>Line Items</Text>
        <View style={[base.table, { borderTopLeftRadius: 0 }]}>
          <View style={base.tableHeaderRow}>
            <Text style={[base.th, { width: 24 }]}>#</Text>
            <Text style={[base.th, { flex: 1 }]}>Description</Text>
            <Text style={[base.th, { width: 55 }]}>HS Code</Text>
            <Text style={[base.th, { width: 40, textAlign: 'right' }]}>Qty</Text>
            <Text style={[base.th, { width: 30 }]}>UOM</Text>
            <Text style={[base.th, { width: 65, textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[base.th, { width: 70, textAlign: 'right' }]}>Amount</Text>
          </View>
          {data.lineItems.map((item, idx) => (
            <View
              key={idx}
              style={idx === data.lineItems.length - 1 ? base.tableRowLast : base.tableRow}
            >
              <Text style={[base.td, { width: 24 }]}>{item.lineNumber}</Text>
              <Text style={[base.td, { flex: 1 }]}>{item.description}</Text>
              <Text style={[base.td, { width: 55 }]}>{item.hsCode || ''}</Text>
              <Text style={[base.tdRight, { width: 40 }]}>{fmt(item.quantity, 0)}</Text>
              <Text style={[base.tdCenter, { width: 30 }]}>{item.uomCode}</Text>
              <Text style={[base.tdRight, { width: 65 }]}>{fmt(item.unitPrice, 4)}</Text>
              <Text style={[base.tdRight, { width: 70 }]}>{fmt(item.amount)}</Text>
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
            {freight > 0 && (
              <View style={base.totalsRow}>
                <Text style={base.totalsLabel}>Freight</Text>
                <Text style={base.totalsValue}>{data.currency} {fmt(freight)}</Text>
              </View>
            )}
            {insurance > 0 && (
              <View style={base.totalsRow}>
                <Text style={base.totalsLabel}>Insurance</Text>
                <Text style={base.totalsValue}>{data.currency} {fmt(insurance)}</Text>
              </View>
            )}
            <View style={base.totalsRowLast}>
              <Text style={base.totalGrandLabel}>Grand Total</Text>
              <Text style={base.totalGrandValue}>{data.currency} {fmt(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Amount in words */}
        <Text style={base.amountWords}>Amount in Words: {wordsLine}</Text>

        {/* ── Bank Details ── */}
        {bank && (
          <View style={[base.termsBox, { marginBottom: 8 }]}>
            <Text style={base.termsTitle}>Bank Details</Text>
            {bank.bankName && <Text style={base.termsText}>Bank: {bank.bankName}{bank.branch ? `, ${bank.branch}` : ''}</Text>}
            {bank.accountNumber && <Text style={base.termsText}>A/C No: {bank.accountNumber}</Text>}
            {bank.ifsc && <Text style={base.termsText}>IFSC: {bank.ifsc}</Text>}
            {bank.swiftCode && <Text style={base.termsText}>SWIFT: {bank.swiftCode}</Text>}
          </View>
        )}

        {/* ── Terms ── */}
        {(data.termsContent || data.notes) && (
          <View style={base.termsBox}>
            {data.termsContent && (
              <>
                <Text style={base.termsTitle}>Terms &amp; Conditions</Text>
                <Text style={base.termsText}>{data.termsContent}</Text>
              </>
            )}
            {data.notes && (
              <>
                <Text style={[base.termsTitle, { marginTop: 6 }]}>Notes</Text>
                <Text style={base.termsText}>{data.notes}</Text>
              </>
            )}
          </View>
        )}

        {/* ── Signature ── */}
        <View style={base.signatureRow}>
          <View style={base.signatureBox}>
            <Text style={base.signatureLabel}>Buyer&apos;s Acceptance</Text>
            <Text style={base.signatureName}>{buyer.name}</Text>
          </View>
          <View style={base.signatureBox}>
            <Text style={base.signatureLabel}>For {company.companyName}</Text>
            <Text style={base.signatureName}>Authorised Signatory</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <Text style={base.footer} render={({ pageNumber, totalPages }) =>
          `This is a Proforma Invoice only, not a tax invoice. | Page ${pageNumber} of ${totalPages}`
        } fixed />
      </Page>
    </Document>
  );
}