import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { IgstCreditService } from './igst-credit.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('gst/igst-credit')
@UseGuards(JwtAuthGuard)
export class IgstCreditController {
  constructor(private service: IgstCreditService) {}

  @Get('summary')
  summary(@CurrentUser() user: JwtPayload) {
    return this.service.summary(user.tenantId);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: any) {
    return this.service.list(user.tenantId, query);
  }

  @Put(':id/claim')
  markClaimed(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: { month: string },
  ) {
    return this.service.markClaimed(user.tenantId, id, dto);
  }
}