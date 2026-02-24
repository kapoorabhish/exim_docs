/**
 * Global document status constants.
 *
 * NOTE: A single global enum cannot fully model the lifecycle of every document type.
 * Each document type has its own lifecycle (see domain-expert-review.md Issue #3).
 * This global set is the union of all statuses across all document types.
 * Proper per-document-type status enums will be introduced in Sprint 2+.
 *
 * Lifecycles by document type:
 *   Proforma Invoice    : draft → sent → accepted → converted → expired / cancelled
 *   Commercial Invoice  : draft → finalized → sent → partially_paid → paid / overdue / cancelled
 *   Shipping Bill       : draft → filed → under_assessment → assessed → leo → shipped / cancelled
 *   Bill of Entry       : draft → filed → under_assessment → assessed → ooc / held
 *   Bill of Lading      : received → issued → surrendered / telex_released
 *   BRC                 : pending → received → matched / discrepant
 *   Letter of Credit    : received → advised → docs_submitted → discrepant → paid / expired
 *   Certificate of Origin: draft → submitted → issued
 *   Duty Drawback       : eligible → brc_received → claimed → disbursed
 *   RoDTEP              : eligible → credited → scrip_generated → utilised / transferred
 */
export const DocumentStatus = {
  // Universal
  DRAFT: 'draft',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  AMENDED: 'amended',
  REJECTED: 'rejected',
  APPROVED: 'approved',

  // Proforma Invoice / Commercial Invoice
  SENT: 'sent',
  ACCEPTED: 'accepted',
  CONVERTED: 'converted',
  EXPIRED: 'expired',
  FINALIZED: 'finalized',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',

  // Shipping Bill / Bill of Entry — customs workflow
  FILED: 'filed',
  UNDER_ASSESSMENT: 'under_assessment',
  ASSESSED: 'assessed',
  LEO: 'leo',           // Let Export Order — customs permission to load/ship (export)
  OOC: 'ooc',           // Out of Charge — customs clearance for import
  HELD: 'held',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CLEARED: 'cleared',

  // Bill of Lading
  RECEIVED: 'received',
  ISSUED: 'issued',
  SURRENDERED: 'surrendered',
  TELEX_RELEASED: 'telex_released',

  // BRC / Letter of Credit
  MATCHED: 'matched',
  DISCREPANT: 'discrepant',
  DOCS_SUBMITTED: 'docs_submitted',

  // Certificate of Origin
  SUBMITTED: 'submitted',

  // Drawback / RoDTEP incentive tracking
  ELIGIBLE: 'eligible',
  BRC_RECEIVED: 'brc_received',
  CLAIMED: 'claimed',
  DISBURSED: 'disbursed',
  CREDITED: 'credited',
  SCRIP_GENERATED: 'scrip_generated',
  UTILISED: 'utilised',
  TRANSFERRED: 'transferred',

  // LUT
  APPLIED: 'applied',
  ACTIVE: 'active',
  EXPIRING: 'expiring',

  // e-Invoice IRN
  IRN_GENERATED: 'irn_generated',
  IRN_CANCELLED: 'irn_cancelled',

  // Supplier Purchase Order — approval & fulfilment lifecycle
  PENDING_APPROVAL: 'pending_approval',
  PARTIALLY_FULFILLED: 'partially_fulfilled',
  FULLY_FULFILLED: 'fully_fulfilled',
  CLOSED: 'closed',

  // Bill of Entry — customs clearance lifecycle
  EXAMINED: 'examined',
  OUT_OF_CHARGE: 'out_of_charge',
  DUTY_PAID: 'duty_paid',

  // Import Bill of Lading — delivery lifecycle
  DELIVERY_ORDER_ISSUED: 'delivery_order_issued',
  CARGO_PICKED_UP: 'cargo_picked_up',

  // Letter of Credit — lifecycle
  UNDER_REVIEW: 'under_review',
  PAYMENT_RELEASED: 'payment_released',

  // Bank reconciliation
  UNRECONCILED: 'unreconciled',
  MANUALLY_MATCHED: 'manually_matched',
  EXCLUDED: 'excluded',

  // IGST Credit
  UNCLAIMED: 'unclaimed',

  // IEC Status
  UPDATE_DUE: 'update_due',
  DEACTIVATED: 'deactivated',

  // LC Document checklist
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  READY: 'ready',

  // LC Discrepancy
  OPEN: 'open',
  RESOLVED: 'resolved',
  WAIVED: 'waived',
} as const;

export type DocumentStatusType = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const DocumentStatusConfig: Record<
  DocumentStatusType,
  { label: string; color: string }
> = {
  [DocumentStatus.DRAFT]: { label: 'Draft', color: 'default' },
  [DocumentStatus.PENDING]: { label: 'Pending', color: 'warning' },
  [DocumentStatus.CANCELLED]: { label: 'Cancelled', color: 'default' },
  [DocumentStatus.AMENDED]: { label: 'Amended', color: 'warning' },
  [DocumentStatus.REJECTED]: { label: 'Rejected', color: 'error' },
  [DocumentStatus.APPROVED]: { label: 'Approved', color: 'success' },

  [DocumentStatus.SENT]: { label: 'Sent', color: 'processing' },
  [DocumentStatus.ACCEPTED]: { label: 'Accepted', color: 'success' },
  [DocumentStatus.CONVERTED]: { label: 'Converted', color: 'success' },
  [DocumentStatus.EXPIRED]: { label: 'Expired', color: 'error' },
  [DocumentStatus.FINALIZED]: { label: 'Finalized', color: 'processing' },
  [DocumentStatus.PARTIALLY_PAID]: { label: 'Partially Paid', color: 'warning' },
  [DocumentStatus.PAID]: { label: 'Paid', color: 'success' },
  [DocumentStatus.OVERDUE]: { label: 'Overdue', color: 'error' },

  [DocumentStatus.FILED]: { label: 'Filed', color: 'processing' },
  [DocumentStatus.UNDER_ASSESSMENT]: { label: 'Under Assessment', color: 'processing' },
  [DocumentStatus.ASSESSED]: { label: 'Assessed', color: 'processing' },
  [DocumentStatus.LEO]: { label: 'LEO', color: 'success' },
  [DocumentStatus.OOC]: { label: 'Out of Charge', color: 'success' },
  [DocumentStatus.HELD]: { label: 'Held', color: 'error' },
  [DocumentStatus.SHIPPED]: { label: 'Shipped', color: 'success' },
  [DocumentStatus.DELIVERED]: { label: 'Delivered', color: 'success' },
  [DocumentStatus.CLEARED]: { label: 'Cleared', color: 'success' },

  [DocumentStatus.RECEIVED]: { label: 'Received', color: 'processing' },
  [DocumentStatus.ISSUED]: { label: 'Issued', color: 'success' },
  [DocumentStatus.SURRENDERED]: { label: 'Surrendered', color: 'default' },
  [DocumentStatus.TELEX_RELEASED]: { label: 'Telex Released', color: 'success' },

  [DocumentStatus.MATCHED]: { label: 'Matched', color: 'success' },
  [DocumentStatus.DISCREPANT]: { label: 'Discrepant', color: 'error' },
  [DocumentStatus.DOCS_SUBMITTED]: { label: 'Docs Submitted', color: 'processing' },

  [DocumentStatus.SUBMITTED]: { label: 'Submitted', color: 'processing' },

  [DocumentStatus.ELIGIBLE]: { label: 'Eligible', color: 'processing' },
  [DocumentStatus.BRC_RECEIVED]: { label: 'BRC Received', color: 'processing' },
  [DocumentStatus.CLAIMED]: { label: 'Claimed', color: 'processing' },
  [DocumentStatus.DISBURSED]: { label: 'Disbursed', color: 'success' },
  [DocumentStatus.CREDITED]: { label: 'Credited', color: 'success' },
  [DocumentStatus.SCRIP_GENERATED]: { label: 'Scrip Generated', color: 'success' },
  [DocumentStatus.UTILISED]: { label: 'Utilised', color: 'default' },
  [DocumentStatus.TRANSFERRED]: { label: 'Transferred', color: 'default' },

  [DocumentStatus.APPLIED]: { label: 'Applied', color: 'processing' },
  [DocumentStatus.ACTIVE]: { label: 'Active', color: 'success' },
  [DocumentStatus.EXPIRING]: { label: 'Expiring Soon', color: 'warning' },

  [DocumentStatus.IRN_GENERATED]: { label: 'IRN Generated', color: 'success' },
  [DocumentStatus.IRN_CANCELLED]: { label: 'IRN Cancelled', color: 'error' },

  [DocumentStatus.PENDING_APPROVAL]: { label: 'Pending Approval', color: 'processing' },
  [DocumentStatus.PARTIALLY_FULFILLED]: { label: 'Partially Fulfilled', color: 'warning' },
  [DocumentStatus.FULLY_FULFILLED]: { label: 'Fully Fulfilled', color: 'success' },
  [DocumentStatus.CLOSED]: { label: 'Closed', color: 'default' },

  [DocumentStatus.EXAMINED]: { label: 'Examined', color: 'processing' },
  [DocumentStatus.OUT_OF_CHARGE]: { label: 'Out of Charge', color: 'success' },
  [DocumentStatus.DUTY_PAID]: { label: 'Duty Paid', color: 'success' },

  [DocumentStatus.DELIVERY_ORDER_ISSUED]: { label: 'D/O Issued', color: 'warning' },
  [DocumentStatus.CARGO_PICKED_UP]: { label: 'Cargo Picked Up', color: 'success' },

  [DocumentStatus.UNDER_REVIEW]: { label: 'Under Review', color: 'processing' },
  [DocumentStatus.PAYMENT_RELEASED]: { label: 'Payment Released', color: 'success' },

  [DocumentStatus.UNRECONCILED]: { label: 'Unreconciled', color: 'default' },
  [DocumentStatus.MANUALLY_MATCHED]: { label: 'Manually Matched', color: 'success' },
  [DocumentStatus.EXCLUDED]: { label: 'Excluded', color: 'default' },

  [DocumentStatus.UNCLAIMED]: { label: 'Unclaimed', color: 'warning' },

  [DocumentStatus.UPDATE_DUE]: { label: 'Update Due', color: 'warning' },
  [DocumentStatus.DEACTIVATED]: { label: 'Deactivated', color: 'error' },

  [DocumentStatus.NOT_STARTED]: { label: 'Not Started', color: 'default' },
  [DocumentStatus.IN_PROGRESS]: { label: 'In Progress', color: 'processing' },
  [DocumentStatus.READY]: { label: 'Ready', color: 'success' },

  [DocumentStatus.OPEN]: { label: 'Open', color: 'warning' },
  [DocumentStatus.RESOLVED]: { label: 'Resolved', color: 'success' },
  [DocumentStatus.WAIVED]: { label: 'Waived', color: 'default' },
};

export const DocumentType = {
  // Export documents
  PROFORMA_INVOICE: 'proforma_invoice',
  COMMERCIAL_INVOICE: 'commercial_invoice',
  PACKING_LIST: 'packing_list',
  SHIPPING_BILL: 'shipping_bill',
  BILL_OF_LADING: 'bill_of_lading',
  AIRWAY_BILL: 'airway_bill',
  CERTIFICATE_OF_ORIGIN: 'certificate_of_origin',
  INSURANCE_CERTIFICATE: 'insurance_certificate',
  PURCHASE_ORDER: 'purchase_order',
  BRC: 'bank_realization_certificate',

  // Import documents
  BILL_OF_ENTRY: 'bill_of_entry',
  DELIVERY_ORDER: 'delivery_order',            // Shipping line permission to release goods (import)
  IMPORT_GENERAL_MANIFEST: 'igm',              // Cargo arrival declaration by shipping line

  // Customs clearance documents
  LET_EXPORT_ORDER: 'let_export_order',        // Customs permission to load and ship (export critical)
  DUTY_PAYMENT_CHALLAN: 'duty_payment_challan', // Proof of customs duty payment on BoE
  EXAMINATION_REPORT: 'examination_report',    // Customs physical examination document

  // Compliance / GST documents
  LUT: 'lut',                                  // Letter of Undertaking — annual GST document
  SWIFT_COPY: 'swift_copy',                    // Bank wire transfer confirmation

  // Inspection / quality documents
  INSPECTION_CERTIFICATE: 'inspection_certificate', // Pre-shipment inspection

  // DGFT scheme documents
  ADVANCE_AUTHORIZATION: 'advance_authorization',   // DGFT duty-free input import licence
  EPCG_LICENCE: 'epcg_licence',                     // DGFT capital goods import licence
  RODTEP_SCRIP: 'rodtep_scrip',                     // RoDTEP export incentive certificate

  // Finance / trade finance
  LC: 'letter_of_credit',
  DEBIT_NOTE: 'debit_note',
  CREDIT_NOTE: 'credit_note',
} as const;

export type DocumentTypeValue = (typeof DocumentType)[keyof typeof DocumentType];

export const DocumentTypeConfig: Record<DocumentTypeValue, { label: string; shortLabel: string }> = {
  [DocumentType.PROFORMA_INVOICE]: { label: 'Proforma Invoice', shortLabel: 'PI' },
  [DocumentType.COMMERCIAL_INVOICE]: { label: 'Commercial Invoice', shortLabel: 'CI' },
  [DocumentType.PACKING_LIST]: { label: 'Packing List', shortLabel: 'PL' },
  [DocumentType.SHIPPING_BILL]: { label: 'Shipping Bill', shortLabel: 'SB' },
  [DocumentType.BILL_OF_ENTRY]: { label: 'Bill of Entry', shortLabel: 'BoE' },
  [DocumentType.BILL_OF_LADING]: { label: 'Bill of Lading', shortLabel: 'B/L' },
  [DocumentType.AIRWAY_BILL]: { label: 'Airway Bill', shortLabel: 'AWB' },
  [DocumentType.CERTIFICATE_OF_ORIGIN]: { label: 'Certificate of Origin', shortLabel: 'CoO' },
  [DocumentType.INSURANCE_CERTIFICATE]: { label: 'Insurance Certificate', shortLabel: 'IC' },
  [DocumentType.PURCHASE_ORDER]: { label: 'Purchase Order', shortLabel: 'PO' },
  [DocumentType.BRC]: { label: 'Bank Realization Certificate', shortLabel: 'BRC' },
  [DocumentType.DELIVERY_ORDER]: { label: 'Delivery Order', shortLabel: 'DO' },
  [DocumentType.IMPORT_GENERAL_MANIFEST]: { label: 'Import General Manifest', shortLabel: 'IGM' },
  [DocumentType.LET_EXPORT_ORDER]: { label: 'Let Export Order', shortLabel: 'LEO' },
  [DocumentType.DUTY_PAYMENT_CHALLAN]: { label: 'Duty Payment Challan', shortLabel: 'DPC' },
  [DocumentType.EXAMINATION_REPORT]: { label: 'Examination Report', shortLabel: 'ER' },
  [DocumentType.LUT]: { label: 'Letter of Undertaking', shortLabel: 'LUT' },
  [DocumentType.SWIFT_COPY]: { label: 'SWIFT Copy', shortLabel: 'SWIFT' },
  [DocumentType.INSPECTION_CERTIFICATE]: { label: 'Inspection Certificate', shortLabel: 'IC' },
  [DocumentType.ADVANCE_AUTHORIZATION]: { label: 'Advance Authorization', shortLabel: 'AA' },
  [DocumentType.EPCG_LICENCE]: { label: 'EPCG Licence', shortLabel: 'EPCG' },
  [DocumentType.RODTEP_SCRIP]: { label: 'RoDTEP Scrip', shortLabel: 'RoDTEP' },
  [DocumentType.LC]: { label: 'Letter of Credit', shortLabel: 'LC' },
  [DocumentType.DEBIT_NOTE]: { label: 'Debit Note', shortLabel: 'DN' },
  [DocumentType.CREDIT_NOTE]: { label: 'Credit Note', shortLabel: 'CN' },
};
