import { StyleSheet } from '@react-pdf/renderer';

export const BRAND = '#4F46E5'; // Indigo primary
export const BRAND_LIGHT = '#EEF2FF';
export const TEXT_PRIMARY = '#111827';
export const TEXT_SECONDARY = '#6B7280';
export const BORDER_COLOR = '#E5E7EB';
export const TABLE_HEADER_BG = '#F9FAFB';

export const base = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: TEXT_PRIMARY,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },
  // ─── Header ──────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    marginBottom: 3,
  },
  companyDetail: {
    fontSize: 7.5,
    color: TEXT_SECONDARY,
    marginBottom: 1,
  },
  docTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    textAlign: 'right',
    marginBottom: 4,
  },
  docSubtitle: {
    fontSize: 8,
    color: TEXT_SECONDARY,
    textAlign: 'right',
  },
  // ─── Two-column meta section ─────────────────────────────
  metaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  metaCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 3,
    padding: 8,
  },
  metaLabel: {
    fontSize: 7,
    color: TEXT_SECONDARY,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: 8,
    color: TEXT_PRIMARY,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  metaValueNormal: {
    fontSize: 8,
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  // ─── Section heading ─────────────────────────────────────
  sectionHeading: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    backgroundColor: BRAND_LIGHT,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 0,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  // ─── Table ───────────────────────────────────────────────
  table: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 3,
    marginBottom: 10,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: TABLE_HEADER_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  th: {
    padding: 5,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  td: {
    padding: 5,
    fontSize: 8,
  },
  tdRight: {
    padding: 5,
    fontSize: 8,
    textAlign: 'right',
  },
  tdCenter: {
    padding: 5,
    fontSize: 8,
    textAlign: 'center',
  },
  // ─── Totals ──────────────────────────────────────────────
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  totalsTable: {
    width: 220,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 3,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  totalsRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: BRAND_LIGHT,
  },
  totalsLabel: {
    fontSize: 7.5,
    color: TEXT_SECONDARY,
  },
  totalsValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  totalGrandLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
  },
  totalGrandValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
  },
  // ─── Amount in words ─────────────────────────────────────
  amountWords: {
    fontSize: 7.5,
    fontStyle: 'italic',
    color: TEXT_SECONDARY,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  // ─── Terms / Notes ───────────────────────────────────────
  termsBox: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 3,
    padding: 8,
    marginBottom: 10,
  },
  termsTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  termsText: {
    fontSize: 7.5,
    color: TEXT_SECONDARY,
    lineHeight: 1.4,
  },
  // ─── Signature block ─────────────────────────────────────
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  signatureBox: {
    width: '42%',
    borderTopWidth: 1,
    borderTopColor: TEXT_PRIMARY,
    paddingTop: 4,
  },
  signatureLabel: {
    fontSize: 7.5,
    color: TEXT_SECONDARY,
  },
  signatureName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
  },
  // ─── Footer ──────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    textAlign: 'center',
    fontSize: 7,
    color: TEXT_SECONDARY,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 4,
  },
  // ─── Utilities ───────────────────────────────────────────
  bold: { fontFamily: 'Helvetica-Bold' },
  right: { textAlign: 'right' },
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER_COLOR, marginVertical: 8 },
});