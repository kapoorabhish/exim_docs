import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { DocNumberService } from '../../common/services/doc-number.service';

import { ExportPaymentController } from './export-payment/export-payment.controller';
import { ExportPaymentService } from './export-payment/export-payment.service';

import { ImportPaymentController } from './import-payment/import-payment.controller';
import { ImportPaymentService } from './import-payment/import-payment.service';

import { AdvancePaymentController } from './advance-payment/advance-payment.controller';
import { AdvancePaymentService } from './advance-payment/advance-payment.service';

import { PaymentDashboardController } from './payment-dashboard/payment-dashboard.controller';
import { PaymentDashboardService } from './payment-dashboard/payment-dashboard.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ExportPaymentController,
    ImportPaymentController,
    AdvancePaymentController,
    PaymentDashboardController,
  ],
  providers: [
    DocNumberService,
    ExportPaymentService,
    ImportPaymentService,
    AdvancePaymentService,
    PaymentDashboardService,
  ],
})
export class PaymentsModule {}