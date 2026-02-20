import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProformaService } from './proforma.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('proforma-invoices')
@UseGuards(JwtAuthGuard)
export class ProformaController {
  constructor(private service: ProformaService) {}

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

  @Post(':id/revise')
  revise(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.revise(user.tenantId, id, user.sub);
  }

  @Post(':id/convert')
  convert(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.convert(user.tenantId, id, user.sub);
  }

  @Post(':id/clone')
  clone(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.clone(user.tenantId, user.sub, id);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.cancel(user.tenantId, id);
  }
}