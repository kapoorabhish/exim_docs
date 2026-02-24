import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EinvoiceService } from './einvoice.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, makeInvoice } from '../../../test/fixtures';

describe('EinvoiceService', () => {
  let service: EinvoiceService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EinvoiceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<EinvoiceService>(EinvoiceService);
  });

  describe('generateIrn', () => {
    it('throws NotFoundException when invoice not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(service.generateIrn(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when IRN already exists', async () => {
      const inv = makeInvoice({ irn: 'existing-irn' });
      prisma.commercialInvoice.findFirst.mockResolvedValue(inv as any);
      await expect(service.generateIrn(TENANT_ID, 'inv-id')).rejects.toThrow(BadRequestException);
    });

    it('generates IRN and updates invoice with irn and qrCode', async () => {
      const inv = makeInvoice({
        irn: null,
        buyer: { gstin: '29AABCU9603R1ZX' },
        tenant: { businessProfile: { gstin: '27AABCU9603R1ZX' } },
      });
      prisma.commercialInvoice.findFirst.mockResolvedValue(inv as any);
      prisma.commercialInvoice.update.mockResolvedValue({
        ...inv,
        irn: 'mock-irn',
        qrCode: 'mock-qr',
      } as any);

      await service.generateIrn(TENANT_ID, 'inv-id');
      expect(prisma.commercialInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            irn: expect.any(String),
            qrCode: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('cancelIrn', () => {
    it('throws NotFoundException when invoice not found', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(null);
      await expect(service.cancelIrn(TENANT_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when no IRN to cancel', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(makeInvoice({ irn: null }) as any);
      await expect(service.cancelIrn(TENANT_ID, 'inv-id')).rejects.toThrow(BadRequestException);
    });

    it('cancels IRN by clearing irn and qrCode', async () => {
      prisma.commercialInvoice.findFirst.mockResolvedValue(
        makeInvoice({ irn: 'some-irn', qrCode: 'some-qr' }) as any,
      );
      prisma.commercialInvoice.update.mockResolvedValue(
        makeInvoice({ irn: null, qrCode: null }) as any,
      );

      await service.cancelIrn(TENANT_ID, 'inv-id');
      expect(prisma.commercialInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { irn: null, qrCode: null },
        }),
      );
    });
  });
});