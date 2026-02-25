import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { PaymentRemindersService } from './payment-reminders.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('payments/reminders')
@UseGuards(JwtAuthGuard)
export class PaymentRemindersController {
  constructor(private service: PaymentRemindersService) {}

  @Get('aging')
  getAgingReport(@CurrentUser() user: JwtPayload) {
    return this.service.getAgingReport(user.tenantId);
  }

  @Get('calendar')
  getCalendarEvents(@CurrentUser() user: JwtPayload, @Query('month') month: string) {
    return this.service.getCalendarEvents(user.tenantId, month ?? '');
  }

  @Post(':id/send')
  sendReminder(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.sendReminder(user.tenantId, id);
  }
}