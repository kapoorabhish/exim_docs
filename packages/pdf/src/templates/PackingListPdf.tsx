import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { base, BORDER_COLOR } from '../styles';

export interface PackingItem {
  packageNo: string;
  contents: string;
  quantity: number;
  netWeight: number;
  grossWeight: number;
  cbm?: number;
  dimensionL?: number;
  dimensionW?: number;
  dimensionH?: number;
}

export interface PackingListPdfData {
  plNumber: string;
  date: string;
  shippingMarks?: string;
  notes?: string;
  totalPackages: number;
  totalNetWeight: number;
  totalGrossWeight: number;
  totalCbm: number;
  packages: PackingItem[];
  invoice: {
    invoiceNumber: string;
    currency: string;
    totalAmount: number;
    buyer?: {
      name: string;
      country?: string;
    };
  };
  company: {
    companyName: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    iec?: string;
    phone?: string;
    email?: string;
  };
}

function fmt(n: number | undefined | null, dec = 3) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtDate(d: string | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PackingListPdf({ data }: { data: PackingListPdfData }) {
  const { company, invoice } = data;

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
          </View>
          <View>
            <Text style={base.docTitle}>PACKING LIST</Text>
            <Text style={[base.docSubtitle, { fontFamily: 'Helvetica-Bold' }]}>{data.plNumber}</Text>
            <Text style={base.docSubtitle}>Date: {fmtDate(data.date)}</Text>
            <Text style={base.docSubtitle}>Against Invoice: {invoice.invoiceNumber}</Text>
            {invoice.buyer && (
              <Text style={base.docSubtitle}>Buyer: {invoice.buyer.name}{invoice.buyer.country ? `, ${invoice.buyer.country}` : ''}</Text>
            )}
          </View>
        </View>

        {/* ── Summary Cards ── */}
        <View style={[base.metaSection, { marginBottom: 12 }]}>
          <View style={base.metaCol}>
            <Text style={base.metaLabel}>Total Packages</Text>
            <Text style={base.metaValue}>{data.totalPackages}</Text>
          </View>
          <View style={base.metaCol}>
            <Text style={base.metaLabel}>Net Weight (kg)</Text>
            <Text style={base.metaValue}>{fmt(data.totalNetWeight)}</Text>
          </View>
          <View style={base.metaCol}>
            <Text style={base.metaLabel}>Gross Weight (kg)</Text>
            <Text style={base.metaValue}>{fmt(data.totalGrossWeight)}</Text>
          </View>
          <View style={base.metaCol}>
            <Text style={base.metaLabel}>Total CBM</Text>
            <Text style={base.metaValue}>{fmt(data.totalCbm, 4)}</Text>
          </View>
          <View style={base.metaCol}>
            <Text style={base.metaLabel}>Invoice Value</Text>
            <Text style={base.metaValue}>{invoice.currency} {Number(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        {/* ── Shipping Marks ── */}
        {data.shippingMarks && (
          <View style={[base.termsBox, { marginBottom: 10 }]}>
            <Text style={base.termsTitle}>Shipping Marks</Text>
            <Text style={base.termsText}>{data.shippingMarks}</Text>
          </View>
        )}

        {/* ── Package Table ── */}
        <Text style={base.sectionHeading}>Package Details</Text>
        <View style={[base.table, { borderTopLeftRadius: 0 }]}>
          <View style={base.tableHeaderRow}>
            <Text style={[base.th, { width: 45 }]}>Pkg No.</Text>
            <Text style={[base.th, { flex: 1 }]}>Contents</Text>
            <Text style={[base.th, { width: 38, textAlign: 'right' }]}>Qty</Text>
            <Text style={[base.th, { width: 52, textAlign: 'right' }]}>Net Wt (kg)</Text>
            <Text style={[base.th, { width: 58, textAlign: 'right' }]}>Gross Wt (kg)</Text>
            <Text style={[base.th, { width: 55, textAlign: 'right' }]}>CBM</Text>
            <Text style={[base.th, { width: 70, textAlign: 'center' }]}>Dimensions (cm)</Text>
          </View>
          {data.packages.map((pkg, idx) => (
            <View
              key={idx}
              style={idx === data.packages.length - 1 ? base.tableRowLast : base.tableRow}
            >
              <Text style={[base.td, { width: 45 }]}>{pkg.packageNo}</Text>
              <Text style={[base.td, { flex: 1 }]}>{pkg.contents}</Text>
              <Text style={[base.tdRight, { width: 38 }]}>{pkg.quantity}</Text>
              <Text style={[base.tdRight, { width: 52 }]}>{fmt(pkg.netWeight)}</Text>
              <Text style={[base.tdRight, { width: 58 }]}>{fmt(pkg.grossWeight)}</Text>
              <Text style={[base.tdRight, { width: 55 }]}>{pkg.cbm ? fmt(pkg.cbm, 4) : '—'}</Text>
              <Text style={[base.tdCenter, { width: 70 }]}>
                {pkg.dimensionL && pkg.dimensionW && pkg.dimensionH
                  ? `${pkg.dimensionL} × ${pkg.dimensionW} × ${pkg.dimensionH}`
                  : '—'}
              </Text>
            </View>
          ))}
          {/* Totals row */}
          <View style={[base.tableRow, { backgroundColor: '#F9FAFB' }]}>
            <Text style={[base.td, { width: 45, fontFamily: 'Helvetica-Bold' }]}>TOTAL</Text>
            <Text style={[base.td, { flex: 1 }]} />
            <Text style={[base.tdRight, { width: 38 }]} />
            <Text style={[base.tdRight, { width: 52, fontFamily: 'Helvetica-Bold' }]}>{fmt(data.totalNetWeight)}</Text>
            <Text style={[base.tdRight, { width: 58, fontFamily: 'Helvetica-Bold' }]}>{fmt(data.totalGrossWeight)}</Text>
            <Text style={[base.tdRight, { width: 55, fontFamily: 'Helvetica-Bold' }]}>{fmt(data.totalCbm, 4)}</Text>
            <Text style={[base.tdCenter, { width: 70 }]} />
          </View>
        </View>

        {/* ── Notes ── */}
        {data.notes && (
          <View style={base.termsBox}>
            <Text style={base.termsTitle}>Notes</Text>
            <Text style={base.termsText}>{data.notes}</Text>
          </View>
        )}

        {/* ── Signature ── */}
        <View style={base.signatureRow}>
          <View style={base.signatureBox}>
            <Text style={base.signatureLabel}>Verified by</Text>
            <Text style={base.signatureName}>Store / Packing</Text>
          </View>
          <View style={base.signatureBox}>
            <Text style={base.signatureLabel}>For {company.companyName}</Text>
            <Text style={base.signatureName}>Authorised Signatory</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <Text style={base.footer} render={({ pageNumber, totalPages }) =>
          `${company.companyName} | ${data.plNumber} | Page ${pageNumber} of ${totalPages}`
        } fixed />
      </Page>
    </Document>
  );
}