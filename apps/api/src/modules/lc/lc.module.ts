import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { DocNumberService } from '../../common/services/doc-number.service';

import { LcController } from './lc/lc.controller';
import { LcService } from './lc/lc.service';

import { LcComplianceController } from './lc-compliance/lc-compliance.controller';
import { LcComplianceService } from './lc-compliance/lc-compliance.service';

@Module({
  imports: [PrismaModule],
  controllers: [LcController, LcComplianceController],
  providers: [DocNumberService, LcService, LcComplianceService],
})
export class LcModule {}