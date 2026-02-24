import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LcService } from './lc.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('lc')
@UseGuards(JwtAuthGuard)
export class LcController {
  constructor(private service: LcService) {}

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

  @Put(':id/status')
  transitionStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: any) {
    return this.service.transitionStatus(user.tenantId, id, user.sub, dto);
  }

  @Put(':id/docs/:docId')
  updateDocStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Body() dto: { status: string },
  ) {
    return this.service.updateDocStatus(user.tenantId, id, docId, dto);
  }

  @Post(':id/discrepancies')
  addDiscrepancy(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: any) {
    return this.service.addDiscrepancy(user.tenantId, id, user.sub, dto);
  }

  @Put(':id/discrepancies/:discId')
  resolveDiscrepancy(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('discId') discId: string,
    @Body() dto: any,
  ) {
    return this.service.resolveDiscrepancy(user.tenantId, id, discId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.delete(user.tenantId, id);
  }
}