import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { Gstr1Service } from './gstr1.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('gst/gstr1')
@UseGuards(JwtAuthGuard)
export class Gstr1Controller {
  constructor(private service: Gstr1Service) {}

  @Get('table6a')
  generateTable6a(@CurrentUser() user: JwtPayload, @Query('month') month: string) {
    return this.service.generateTable6a(user.tenantId, month ?? '');
  }

  @Post('mark-filed')
  markFiled(@CurrentUser() user: JwtPayload, @Body() dto: { invoiceIds: string[]; month: string }) {
    return this.service.markFiled(user.tenantId, dto);
  }

  @Get('status')
  getFiledStatus(@CurrentUser() user: JwtPayload, @Query('month') month: string) {
    return this.service.getFiledStatus(user.tenantId, month ?? '');
  }
}