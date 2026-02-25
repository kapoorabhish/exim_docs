import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { differenceInDays } from 'date-fns';

interface ComplianceCheck {
  field: string;
  label: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

@Injectable()
export class LcComplianceService {
  constructor(private prisma: PrismaService) {}

  async checkCompliance(tenantId: string, lcId: string) {
    const lc = await this.prisma.letterOfCredit.findFirst({
      where: { id: lcId, tenantId },
      include: {
        requiredDocs: true,
        discrepancies: { where: { status: 'OPEN' } },
      },
    });
    if (!lc) throw new NotFoundException('Letter of Credit not found');

    const today = new Date();
    const checks: ComplianceCheck[] = [];

    const daysToExpiry = differenceInDays(lc.expiryDate, today);
    checks.push({
      field: 'expiryDate',
      label: 'LC Expiry',
      status: daysToExpiry < 0 ? 'FAIL' : daysToExpiry <= 7 ? 'WARN' : 'PASS',
      message:
        daysToExpiry < 0
          ? `LC expired ${Math.abs(daysToExpiry)} days ago`
          : daysToExpiry <= 7
          ? `LC expires in ${daysToExpiry} days — urgent`
          : `LC valid for ${daysToExpiry} more days`,
    });

    if (lc.latestShipmentDate) {
      const daysToShipment = differenceInDays(lc.latestShipmentDate, today);
      checks.push({
        field: 'latestShipmentDate',
        label: 'Latest Shipment Date',
        status: daysToShipment < 0 ? 'FAIL' : daysToShipment <= 3 ? 'WARN' : 'PASS',
        message:
          daysToShipment < 0
            ? `Latest shipment date passed ${Math.abs(daysToShipment)} days ago`
            : `${daysToShipment} days remaining for shipment`,
      });
    }

    const totalDocs = lc.requiredDocs.length;
    const readyDocs = lc.requiredDocs.filter((d) => d.status === 'READY').length;
    checks.push({
      field: 'documents',
      label: 'Document Checklist',
      status: totalDocs === 0 ? 'WARN' : readyDocs === totalDocs ? 'PASS' : 'WARN',
      message:
        totalDocs === 0
          ? 'No documents configured in checklist'
          : `${readyDocs}/${totalDocs} documents ready`,
    });

    const openBlocking = lc.discrepancies?.filter((d) => d.severity === 'BLOCKING').length ?? 0;
    const openNonBlocking = lc.discrepancies?.filter((d) => d.severity === 'NON_BLOCKING').length ?? 0;
    checks.push({
      field: 'discrepancies',
      label: 'Open Discrepancies',
      status: openBlocking > 0 ? 'FAIL' : openNonBlocking > 0 ? 'WARN' : 'PASS',
      message:
        openBlocking > 0
          ? `${openBlocking} blocking discrepancy(ies) must be resolved`
          : openNonBlocking > 0
          ? `${openNonBlocking} non-blocking discrepancy(ies) noted`
          : 'No open discrepancies',
    });

    const overallStatus = checks.some((c) => c.status === 'FAIL')
      ? 'FAIL'
      : checks.some((c) => c.status === 'WARN')
      ? 'WARN'
      : 'PASS';

    return { lcId, lcNumber: lc.lcNumber, overallStatus, checks };
  }
}