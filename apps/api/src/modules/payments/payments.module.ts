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

import { PaymentRemindersController } from './reminders/payment-reminders.controller';
import { PaymentRemindersService } from './reminders/payment-reminders.service';

import { BankStatementController } from './bank-statement/bank-statement.controller';
import { BankStatementService } from './bank-statement/bank-statement.service';

import { ReconciliationController } from './reconciliation/reconciliation.controller';
import { ReconciliationService } from './reconciliation/reconciliation.service';

import { ForexController } from './forex/forex.controller';
import { ForexService } from './forex/forex.service';

import { TallyExportController } from './tally-export/tally-export.controller';
import { TallyExportService } from './tally-export/tally-export.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ExportPaymentController,
    ImportPaymentController,
    AdvancePaymentController,
    PaymentDashboardController,
    PaymentRemindersController,
    BankStatementController,
    ReconciliationController,
    ForexController,
    TallyExportController,
  ],
  providers: [
    DocNumberService,
    ExportPaymentService,
    ImportPaymentService,
    AdvancePaymentService,
    PaymentDashboardService,
    PaymentRemindersService,
    BankStatementService,
    ReconciliationService,
    ForexService,
    TallyExportService,
  ],
})
export class PaymentsModule {}