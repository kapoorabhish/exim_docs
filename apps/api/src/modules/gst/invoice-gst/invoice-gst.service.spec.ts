import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoiceGstService } from './invoice-gst.service';
import { PrismaService } from '../../../common/prisma.service';
import { LutService } from '../lut/lut.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, makeInvoice } from '../../../test/fixtures';

const mockLutService = {
  getActiveLut: jest.fn(),
};

describe('InvoiceGstService', () => {
  let service: InvoiceGstService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceGstService,
        { provide: PrismaService, useValue: prisma },
        { provide: LutService, useValue: mockLutService },
      ],
    }).compile();
    service = module.get<InvoiceGstService>(InvoiceGstService);
  });

  describe('setGstTreatment', () => {
    it('throws NotFoundException when invoice not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(
        service.setGstTreatment(TENANT_ID, 'bad-id', { gstTreatment: 'LUT' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when setting LUT but no active LUT exists', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice() as any);
      mockLutService.getActiveLut.mockResolvedValue(null);

      await expect(
        service.setGstTreatment(TENANT_ID, 'inv-id', { gstTreatment: 'LUT' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets LUT treatment when active LUT exists', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice() as any);
      mockLutService.getActiveLut.mockResolvedValue({ id: 'lut-id', status: 'ACTIVE' });
      prisma.commercialInvoice.update.mockResolvedValue(makeInvoice({ gstTreatment: 'LUT' }) as any);

      const result = await service.setGstTreatment(TENANT_ID, 'inv-id', { gstTreatment: 'LUT' });
      expect(prisma.commercialInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { gstTreatment: 'LUT' } }),
      );
      expect(result).toBeTruthy();
    });

    it('sets WITH_IGST treatment without LUT check', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice() as any);
      prisma.commercialInvoice.update.mockResolvedValue(
        makeInvoice({ gstTreatment: 'WITH_IGST' }) as any,
      );

      await service.setGstTreatment(TENANT_ID, 'inv-id', { gstTreatment: 'WITH_IGST' });
      expect(mockLutService.getActiveLut).not.toHaveBeenCalled();
      expect(prisma.commercialInvoice.update).toHaveBeenCalled();
    });
  });
});