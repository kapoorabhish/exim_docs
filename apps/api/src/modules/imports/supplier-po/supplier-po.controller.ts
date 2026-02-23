import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SupplierPoService } from './supplier-po.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('supplier-pos')
@UseGuards(JwtAuthGuard)
export class SupplierPoController {
  constructor(private service: SupplierPoService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: any) {
    return this.service.list(user.tenantId, query);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: any) {
    return this.service.create(user.tenantId, user.sub, dto);
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getById(user.tenantId, id);
  }

  @Put(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Put(':id/submit')
  submit(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.submit(user.tenantId, id);
  }

  @Put(':id/approve')
  approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.approve(user.tenantId, id, user.sub);
  }

  @Put(':id/reject')
  reject(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.reject(user.tenantId, id);
  }

  @Post(':id/clone')
  clone(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.clone(user.tenantId, user.sub, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.delete(user.tenantId, id);
  }
}