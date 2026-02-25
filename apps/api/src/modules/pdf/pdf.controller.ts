import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('pdf')
@UseGuards(JwtAuthGuard)
export class PdfController {
  constructor(private service: PdfService) {}

  @Get('proforma-invoices/:id')
  async proforma(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.renderProforma(user.tenantId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PI-${id}.pdf"`);
    res.end(buffer);
  }

  @Get('invoices/:id')
  async invoice(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.renderInvoice(user.tenantId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="INV-${id}.pdf"`);
    res.end(buffer);
  }

  @Get('packing-lists/:id')
  async packingList(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.renderPackingList(user.tenantId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PL-${id}.pdf"`);
    res.end(buffer);
  }

  @Get('supplier-invoices/:id')
  async supplierInvoice(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.renderSupplierInvoice(user.tenantId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SINV-${id}.pdf"`);
    res.end(buffer);
  }
}