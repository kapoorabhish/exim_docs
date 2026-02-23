import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PaymentDashboardService } from './payment-dashboard.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentDashboardController {
  constructor(private service: PaymentDashboardService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.service.getDashboard(user.tenantId);
  }

  @Get('party-ledger/:partyId')
  getPartyLedger(
    @CurrentUser() user: JwtPayload,
    @Param('partyId') partyId: string,
    @Query() query: any,
  ) {
    return this.service.getPartyLedger(user.tenantId, partyId, query);
  }
}