import { Controller, Get, UseGuards } from '@nestjs/common';
import { ComplianceDashboardService } from './compliance-dashboard.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('gst/dashboard')
@UseGuards(JwtAuthGuard)
export class ComplianceDashboardController {
  constructor(private service: ComplianceDashboardService) {}

  @Get()
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.service.getDashboard(user.tenantId);
  }
}