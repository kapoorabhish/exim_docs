import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { LutService } from '../lut/lut.service';

@Injectable()
export class InvoiceGstService {
  constructor(
    private prisma: PrismaService,
    private lutService: LutService,
  ) {}

  async setGstTreatment(tenantId: string, invoiceId: string, dto: { gstTreatment: string }) {
    const invoice = await this.prisma.commercialInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (dto.gstTreatment === 'LUT') {
      const activeLut = await this.lutService.getActiveLut(tenantId);
      if (!activeLut) throw new BadRequestException('No active LUT on file. Please activate a LUT record first.');
    }

    return this.prisma.commercialInvoice.update({
      where: { id: invoiceId },
      data: { gstTreatment: dto.gstTreatment as any },
    });
  }
}