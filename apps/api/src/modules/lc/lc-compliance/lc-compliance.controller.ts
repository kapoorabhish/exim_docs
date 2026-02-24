import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LcComplianceService } from './lc-compliance.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('lc')
@UseGuards(JwtAuthGuard)
export class LcComplianceController {
  constructor(private service: LcComplianceService) {}

  @Get(':id/compliance')
  checkCompliance(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.checkCompliance(user.tenantId, id);
  }
}