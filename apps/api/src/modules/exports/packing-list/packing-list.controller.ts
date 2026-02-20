import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PackingListService } from './packing-list.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('packing-lists')
@UseGuards(JwtAuthGuard)
export class PackingListController {
  constructor(private service: PackingListService) {}

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

  @Post(':id/finalize')
  finalize(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.finalize(user.tenantId, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.delete(user.tenantId, id);
  }
}