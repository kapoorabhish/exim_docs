import { Controller, Get, Post, Put, Body, Query, UseGuards } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

class ManualRateDto {
  currencyCode: string;
  date: string; // ISO date string
  rateType: string;
  rate: number;
  source?: string;
}

@Controller('exchange-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExchangeRateController {
  constructor(private exchangeRateService: ExchangeRateService) {}

  @Get()
  getCurrent(@Query('currencyCode') currencyCode?: string) {
    return this.exchangeRateService.getCurrentRates(currencyCode);
  }

  @Get('history')
  getHistory(
    @Query('currencyCode') currencyCode: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.exchangeRateService.getRateHistory(currencyCode, dateFrom, dateTo);
  }

  @Post('sync')
  @Roles('ADMIN')
  syncRates(@CurrentUser() user: JwtPayload) {
    return this.exchangeRateService.syncRbiRates();
  }

  @Put('manual')
  @Roles('ADMIN')
  manualOverride(@CurrentUser() user: JwtPayload, @Body() dto: ManualRateDto) {
    return this.exchangeRateService.setManualRate(user.tenantId, dto);
  }
}