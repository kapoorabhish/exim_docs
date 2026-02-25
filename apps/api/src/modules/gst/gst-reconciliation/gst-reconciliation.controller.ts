import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GstReconciliationService } from './gst-reconciliation.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('gst/reconciliation')
@UseGuards(JwtAuthGuard)
export class GstReconciliationController {
  constructor(private service: GstReconciliationService) {}

  @Get('sb-vs-gstr1')
  sbVsGstr1(@CurrentUser() user: JwtPayload, @Query('month') month: string) {
    return this.service.getSbVsGstr1Mismatches(user.tenantId, month ?? '');
  }

  @Get('boe-vs-gstr3b')
  boeVsGstr3b(@CurrentUser() user: JwtPayload, @Query('month') month: string) {
    return this.service.getBoeVsGstr3bMismatches(user.tenantId, month ?? '');
  }
}