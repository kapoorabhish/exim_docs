import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('supplier-invoices')
@UseGuards(JwtAuthGuard)
export class SupplierInvoiceController {
  constructor(private service: SupplierInvoiceService) {}

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

  @Put(':id/receive')
  receive(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.receive(user.tenantId, id);
  }

  @Get(':id/document-set')
  getDocumentSet(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getDocumentSet(user.tenantId, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.delete(user.tenantId, id);
  }
}