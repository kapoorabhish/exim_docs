import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { base, BRAND_LIGHT, BORDER_COLOR } from '../styles';
import { amountToWords } from '../utils/amountToWords';

export interface CiLineItem {
  lineNumber: number;
  description: string;
  hsCode?: string;
  quantity: number;
  uomCode: string;
  unitPrice: number;
  amount: number;
  netWeight?: number;
  grossWeight?: number;
}

export interface CommercialInvoicePdfData {
  invoiceNumber: string;
  date: string;
  currency: string;
  buyerRef?: string;
  incoterm?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  paymentTerms?: string;
  lut?: string;
  lutExpiryDate?: string;
  freight?: number;
  insurance?: number;
  totalAmount: number;
  totalAmountInr?: number;
  exchangeRate?: number;
  notes?: string;
  termsContent?: string;
  lineItems: CiLineItem[];
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

export function CommercialInvoicePdf({ data }: { data: CommercialInvoicePdfData }) {
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
            {company.pan && <Text style={base.companyDetail}>PAN: {company.pan}</Text>}
            {company.phone && <Text style={base.companyDetail}>T: {company.phone}</Text>}
            {company.email && <Text style={base.companyDetail}>E: {company.email}</Text>}
          </View>
          <View>
            <Text style={base.docTitle}>COMMERCIAL INVOICE</Text>
            <Text style={[base.docSubtitle, { fontFamily: 'Helvetica-Bold' }]}>{data.invoiceNumber}</Text>
            <Text style={base.docSubtitle}>Date: {fmtDate(data.date)}</Text>
            {data.buyerRef && <Text style={base.docSubtitle}>Buyer Ref: {data.buyerRef}</Text>}
            {data.lut && (
              <Text style={[base.docSubtitle, { marginTop: 4 }]}>
                LUT: {data.lut}{data.lutExpiryDate ? ` (valid till ${fmtDate(data.lutExpiryDate)})` : ''}
              </Text>
            )}
          </View>
        </View>

        {/* ── LUT Declaration ── */}
        {data.lut && (
          <View style={{
            backgroundColor: BRAND_LIGHT,
            borderRadius: 3,
            padding: 6,
            marginBottom: 8,
          }}>
            <Text style={{ fontSize: 7, fontStyle: 'italic', color: '#4F46E5' }}>
              Supply meant for export under Letter of Undertaking (LUT) without payment of integrated tax.
              LUT No. {data.lut}{data.lutExpiryDate ? ` dated, valid till ${fmtDate(data.lutExpiryDate)}` : ''}.
            </Text>
          </View>
        )}

        {/* ── Buyer + Shipping + Payment ── */}
        <View style={base.metaSection}>
          <View style={[base.metaCol, { flex: 1.5 }]}>
            <Text style={base.metaLabel}>Consignee / Buyer</Text>
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
            {data.exchangeRate && (
              <>
                <Text style={base.metaLabel}>Exchange Rate</Text>
                <Text style={base.metaValueNormal}>1 {data.currency} = ₹{fmt(data.exchangeRate, 4)}</Text>
              </>
            )}
          </View>
        </View>

        {/* ── Line Items ── */}
        <Text style={base.sectionHeading}>Line Items</Text>
        <View style={[base.table, { borderTopLeftRadius: 0 }]}>
          <View style={base.tableHeaderRow}>
            <Text style={[base.th, { width: 22 }]}>#</Text>
            <Text style={[base.th, { flex: 1 }]}>Description</Text>
            <Text style={[base.th, { width: 52 }]}>HS Code</Text>
            <Text style={[base.th, { width: 38, textAlign: 'right' }]}>Qty</Text>
            <Text style={[base.th, { width: 28 }]}>UOM</Text>
            <Text style={[base.th, { width: 42, textAlign: 'right' }]}>Net Wt</Text>
            <Text style={[base.th, { width: 62, textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[base.th, { width: 68, textAlign: 'right' }]}>Amount</Text>
          </View>
          {data.lineItems.map((item, idx) => (
            <View
              key={idx}
              style={idx === data.lineItems.length - 1 ? base.tableRowLast : base.tableRow}
            >
              <Text style={[base.td, { width: 22 }]}>{item.lineNumber}</Text>
              <Text style={[base.td, { flex: 1 }]}>{item.description}</Text>
              <Text style={[base.td, { width: 52 }]}>{item.hsCode || ''}</Text>
              <Text style={[base.tdRight, { width: 38 }]}>{fmt(item.quantity, 0)}</Text>
              <Text style={[base.tdCenter, { width: 28 }]}>{item.uomCode}</Text>
              <Text style={[base.tdRight, { width: 42 }]}>{item.netWeight ? fmt(item.netWeight, 2) : '—'}</Text>
              <Text style={[base.tdRight, { width: 62 }]}>{fmt(item.unitPrice, 4)}</Text>
              <Text style={[base.tdRight, { width: 68 }]}>{fmt(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={base.totalsSection}>
          <View style={base.totalsTable}>
            <View style={base.totalsRow}>
              <Text style={base.totalsLabel}>Subtotal (FOB)</Text>
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
              <Text style={base.totalGrandLabel}>Total ({data.currency})</Text>
              <Text style={base.totalGrandValue}>{data.currency} {fmt(grandTotal)}</Text>
            </View>
            {data.totalAmountInr && (
              <View style={[base.totalsRow, { borderTopWidth: 1, borderTopColor: BORDER_COLOR }]}>
                <Text style={base.totalsLabel}>Equivalent INR</Text>
                <Text style={base.totalsValue}>₹ {fmt(data.totalAmountInr)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Amount in words */}
        <Text style={base.amountWords}>Amount in Words: {wordsLine}</Text>

        {/* ── Bank Details ── */}
        {bank && (
          <View style={[base.termsBox, { marginBottom: 8 }]}>
            <Text style={base.termsTitle}>Bank Details (for wire transfer)</Text>
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
            <Text style={base.signatureLabel}>Buyer&apos;s Signature</Text>
            <Text style={base.signatureName}>{buyer.name}</Text>
          </View>
          <View style={base.signatureBox}>
            <Text style={base.signatureLabel}>For {company.companyName}</Text>
            <Text style={base.signatureName}>Authorised Signatory</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <Text style={base.footer} render={({ pageNumber, totalPages }) =>
          `${company.companyName} | ${data.invoiceNumber} | Page ${pageNumber} of ${totalPages}`
        } fixed />
      </Page>
    </Document>
  );
}