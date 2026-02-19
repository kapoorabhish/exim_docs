import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TermsService } from './terms.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('terms-templates')
@UseGuards(JwtAuthGuard)
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('documentType') documentType?: string) {
    return this.termsService.list(user.tenantId, documentType);
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.termsService.getById(user.tenantId, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: any) {
    return this.termsService.create(user.tenantId, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: any) {
    return this.termsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.termsService.delete(user.tenantId, id);
  }

  @Put(':id/default')
  setDefault(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.termsService.setDefault(user.tenantId, id);
  }
}