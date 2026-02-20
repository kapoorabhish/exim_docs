import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { DocNumberService } from '../../common/services/doc-number.service';

import { ProformaController } from './proforma/proforma.controller';
import { ProformaService } from './proforma/proforma.service';

import { InvoiceController } from './invoice/invoice.controller';
import { InvoiceService } from './invoice/invoice.service';

import { BuyerPoController } from './buyer-po/buyer-po.controller';
import { BuyerPoService } from './buyer-po/buyer-po.service';

import { PackingListController } from './packing-list/packing-list.controller';
import { PackingListService } from './packing-list/packing-list.service';

import { ShippingBillController } from './shipping-bill/shipping-bill.controller';
import { ShippingBillService } from './shipping-bill/shipping-bill.service';

import { CooController } from './coo/coo.controller';
import { CooService } from './coo/coo.service';

import { BillOfLadingController } from './bill-of-lading/bill-of-lading.controller';
import { BillOfLadingService } from './bill-of-lading/bill-of-lading.service';

import { InsuranceController } from './insurance/insurance.controller';
import { InsuranceService } from './insurance/insurance.service';

import { BrcController } from './brc/brc.controller';
import { BrcService } from './brc/brc.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ProformaController,
    InvoiceController,
    BuyerPoController,
    PackingListController,
    ShippingBillController,
    CooController,
    BillOfLadingController,
    InsuranceController,
    BrcController,
  ],
  providers: [
    DocNumberService,
    ProformaService,
    InvoiceService,
    BuyerPoService,
    PackingListService,
    ShippingBillService,
    CooService,
    BillOfLadingService,
    InsuranceService,
    BrcService,
  ],
})
export class ExportsModule {}