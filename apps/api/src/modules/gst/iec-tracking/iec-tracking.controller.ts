import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { IecTrackingService } from './iec-tracking.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('gst/iec')
@UseGuards(JwtAuthGuard)
export class IecTrackingController {
  constructor(private service: IecTrackingService) {}

  @Get()
  getStatus(@CurrentUser() user: JwtPayload) {
    return this.service.getStatus(user.tenantId);
  }

  @Post('confirm')
  confirmAnnualUpdate(@CurrentUser() user: JwtPayload) {
    return this.service.confirmAnnualUpdate(user.tenantId);
  }

  @Put('ad-code')
  updateAdCode(@CurrentUser() user: JwtPayload, @Body() dto: any) {
    return this.service.updateAdCode(user.tenantId, dto);
  }
}