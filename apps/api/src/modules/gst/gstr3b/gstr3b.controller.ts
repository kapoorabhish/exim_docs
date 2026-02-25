import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Gstr3bService } from './gstr3b.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('gst/gstr3b')
@UseGuards(JwtAuthGuard)
export class Gstr3bController {
  constructor(private service: Gstr3bService) {}

  @Get()
  generateData(@CurrentUser() user: JwtPayload, @Query('month') month: string) {
    return this.service.generateData(user.tenantId, month ?? '');
  }
}