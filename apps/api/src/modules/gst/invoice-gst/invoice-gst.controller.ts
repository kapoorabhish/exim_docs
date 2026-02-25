import { Controller, Put, Param, Body, UseGuards } from '@nestjs/common';
import { InvoiceGstService } from './invoice-gst.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('gst/invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceGstController {
  constructor(private service: InvoiceGstService) {}

  @Put(':id/gst-treatment')
  setGstTreatment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: { gstTreatment: string },
  ) {
    return this.service.setGstTreatment(user.tenantId, id, dto);
  }
}