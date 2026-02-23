import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { DocNumberService } from '../../common/services/doc-number.service';

import { SupplierPoController } from './supplier-po/supplier-po.controller';
import { SupplierPoService } from './supplier-po/supplier-po.service';

import { SupplierInvoiceController } from './supplier-invoice/supplier-invoice.controller';
import { SupplierInvoiceService } from './supplier-invoice/supplier-invoice.service';

import { BillOfEntryController } from './bill-of-entry/bill-of-entry.controller';
import { BillOfEntryService } from './bill-of-entry/bill-of-entry.service';

import { LandedCostController } from './landed-cost/landed-cost.controller';
import { LandedCostService } from './landed-cost/landed-cost.service';

import { ImportBlController } from './import-bl/import-bl.controller';
import { ImportDocumentController } from './import-bl/import-document.controller';
import { ImportBlService } from './import-bl/import-bl.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    SupplierPoController,
    SupplierInvoiceController,
    BillOfEntryController,
    LandedCostController,
    ImportBlController,
    ImportDocumentController,
  ],
  providers: [
    DocNumberService,
    SupplierPoService,
    SupplierInvoiceService,
    BillOfEntryService,
    LandedCostService,
    ImportBlService,
  ],
})
export class ImportsModule {}