import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';

import { LutController } from './lut/lut.controller';
import { LutService } from './lut/lut.service';

import { InvoiceGstController } from './invoice-gst/invoice-gst.controller';
import { InvoiceGstService } from './invoice-gst/invoice-gst.service';

import { Gstr1Controller } from './gstr1/gstr1.controller';
import { Gstr1Service } from './gstr1/gstr1.service';

import { IgstCreditController } from './igst-credit/igst-credit.controller';
import { IgstCreditService } from './igst-credit/igst-credit.service';

import { Gstr3bController } from './gstr3b/gstr3b.controller';
import { Gstr3bService } from './gstr3b/gstr3b.service';

import { EinvoiceController } from './einvoice/einvoice.controller';
import { EinvoiceService } from './einvoice/einvoice.service';

import { ComplianceDashboardController } from './compliance-dashboard/compliance-dashboard.controller';
import { ComplianceDashboardService } from './compliance-dashboard/compliance-dashboard.service';

import { IecTrackingController } from './iec-tracking/iec-tracking.controller';
import { IecTrackingService } from './iec-tracking/iec-tracking.service';

import { GstReconciliationController } from './gst-reconciliation/gst-reconciliation.controller';
import { GstReconciliationService } from './gst-reconciliation/gst-reconciliation.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    LutController,
    InvoiceGstController,
    Gstr1Controller,
    IgstCreditController,
    Gstr3bController,
    EinvoiceController,
    ComplianceDashboardController,
    IecTrackingController,
    GstReconciliationController,
  ],
  providers: [
    LutService,
    InvoiceGstService,
    Gstr1Service,
    IgstCreditService,
    Gstr3bService,
    EinvoiceService,
    ComplianceDashboardService,
    IecTrackingService,
    GstReconciliationService,
  ],
  exports: [LutService],
})
export class GstModule {}