import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

import { PrismaModule } from '../../common/prisma.module';

import { PartyController } from './party/party.controller';
import { PartyService } from './party/party.service';

import { ProductController } from './product/product.controller';
import { ProductService } from './product/product.service';

import { ReferenceController } from './reference/reference.controller';
import { ReferenceService } from './reference/reference.service';

import { ExchangeRateController } from './exchange-rate/exchange-rate.controller';
import { ExchangeRateService } from './exchange-rate/exchange-rate.service';

import { TermsController } from './terms/terms.controller';
import { TermsService } from './terms/terms.service';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }), // 5 MB
  ],
  controllers: [
    PartyController,
    ProductController,
    ReferenceController,
    ExchangeRateController,
    TermsController,
  ],
  providers: [
    PartyService,
    ProductService,
    ReferenceService,
    ExchangeRateService,
    TermsService,
  ],
})
export class MasterDataModule {}