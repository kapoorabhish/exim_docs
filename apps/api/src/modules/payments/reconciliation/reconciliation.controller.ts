import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('payments/reconciliation')
@UseGuards(JwtAuthGuard)
export class ReconciliationController {
  constructor(private service: ReconciliationService) {}

  @Get('unmatched-payments')
  getUnmatchedPayments(@CurrentUser() user: JwtPayload) {
    return this.service.getUnmatchedPayments(user.tenantId);
  }

  @Get(':statementId/unreconciled')
  getUnreconciled(@CurrentUser() user: JwtPayload, @Param('statementId') statementId: string) {
    return this.service.getUnreconciled(user.tenantId, statementId);
  }

  @Post(':statementId/auto-match')
  autoMatch(@CurrentUser() user: JwtPayload, @Param('statementId') statementId: string) {
    return this.service.autoMatch(user.tenantId, statementId, user.sub);
  }

  @Post('manual-match')
  manualMatch(@CurrentUser() user: JwtPayload, @Body() dto: any) {
    return this.service.manualMatch(user.tenantId, { ...dto, userId: user.sub });
  }
}