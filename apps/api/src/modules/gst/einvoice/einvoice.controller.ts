import { Controller, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { EinvoiceService } from './einvoice.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@Controller('gst/einvoice')
@UseGuards(JwtAuthGuard)
export class EinvoiceController {
  constructor(private service: EinvoiceService) {}

  @Post(':id/irn')
  generateIrn(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.generateIrn(user.tenantId, id);
  }

  @Delete(':id/irn')
  cancelIrn(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.cancelIrn(user.tenantId, id);
  }
}