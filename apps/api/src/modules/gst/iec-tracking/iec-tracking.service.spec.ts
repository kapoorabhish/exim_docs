import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IecTrackingService } from './iec-tracking.service';
import { PrismaService } from '../../../common/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';
import { TENANT_ID, makeBusinessProfile } from '../../../test/fixtures';

describe('IecTrackingService', () => {
  let service: IecTrackingService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IecTrackingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<IecTrackingService>(IecTrackingService);
  });

  describe('getStatus', () => {
    it('throws NotFoundException when business profile not found', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue(null);
      await expect(service.getStatus(TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns IEC tracking data from business profile', async () => {
      const profile = makeBusinessProfile();
      prisma.businessProfile.findUnique.mockResolvedValue(profile as any);

      const result = await service.getStatus(TENANT_ID);
      expect(result.iecNumber).toBe('0512345678');
      expect(result.iecStatus).toBe('ACTIVE');
      expect(result.adCode).toBe('0240422');
    });
  });

  describe('confirmAnnualUpdate', () => {
    it('sets iecStatus to ACTIVE and updates iecLastConfirmedAt', async () => {
      prisma.businessProfile.update.mockResolvedValue(
        makeBusinessProfile({ iecStatus: 'ACTIVE', iecLastConfirmedAt: new Date() }) as any,
      );

      await service.confirmAnnualUpdate(TENANT_ID);
      expect(prisma.businessProfile.update).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        data: expect.objectContaining({
          iecStatus: 'ACTIVE',
          iecLastConfirmedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('updateAdCode', () => {
    it('updates adCode when provided', async () => {
      prisma.businessProfile.update.mockResolvedValue(makeBusinessProfile() as any);

      await service.updateAdCode(TENANT_ID, { adCode: '0240999' });
      expect(prisma.businessProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ adCode: '0240999' }),
        }),
      );
    });

    it('updates adBankName when provided', async () => {
      prisma.businessProfile.update.mockResolvedValue(makeBusinessProfile() as any);

      await service.updateAdCode(TENANT_ID, { adBankName: 'SBI Bank' });
      expect(prisma.businessProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ adBankName: 'SBI Bank' }),
        }),
      );
    });

    it('does not include undefined fields in update', async () => {
      prisma.businessProfile.update.mockResolvedValue(makeBusinessProfile() as any);

      await service.updateAdCode(TENANT_ID, { adCode: '0240999' });
      const callData = (prisma.businessProfile.update as jest.Mock).mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('adBankName');
    });
  });
});