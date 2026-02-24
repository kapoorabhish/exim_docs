import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ForexService } from './forex.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('payments/forex')
@UseGuards(JwtAuthGuard)
export class ForexController {
  constructor(private service: ForexService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: JwtPayload, @Query() query: any) {
    return this.service.getSummary(user.tenantId, query);
  }

  @Get()
  getReport(@CurrentUser() user: JwtPayload, @Query() query: any) {
    return this.service.getGainLossReport(user.tenantId, query);
  }
}