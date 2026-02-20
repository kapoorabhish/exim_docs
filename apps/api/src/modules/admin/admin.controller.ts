import { Controller, Get, Put, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private service: AdminService) {}

  /** Platform-wide stats */
  @Get('stats')
  getStats() {
    return this.service.getPlatformStats();
  }

  /** List all tenants */
  @Get('tenants')
  listTenants(@Query() query: any) {
    return this.service.listTenants(query);
  }

  /** Get single tenant with usage counts */
  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return this.service.getTenantById(id);
  }

  /** Activate / deactivate / suspend a tenant */
  @Put('tenants/:id/status')
  setTenantStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.setTenantStatus(id, status);
  }
}