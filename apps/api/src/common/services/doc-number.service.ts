import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const PREFIXES: Record<string, string> = {
  PI:  'PI',
  INV: 'INV',
  PL:  'PL',
  SB:  'SB',
  COO: 'COO',
  BPO: 'PO',
};

@Injectable()
export class DocNumberService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns the current Indian financial year label.
   * FY starts on 1 April. e.g. April 2025 → "2025-26", January 2026 → "2025-26".
   */
  getFyLabel(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-based
    const fyStart = month >= 4 ? year : year - 1;
    return `${fyStart}-${String(fyStart + 1).slice(2)}`;
  }

  /**
   * Atomically increments the sequence counter for (tenantId, documentType, fyLabel)
   * and returns a formatted document number like "PI/2025-26/001".
   */
  async getNextNumber(tenantId: string, documentType: string): Promise<string> {
    const fyLabel = this.getFyLabel();
    const prefix = PREFIXES[documentType] ?? documentType;

    // Atomic upsert + increment inside a transaction
    const seq = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.documentSequence.findUnique({
        where: { tenantId_documentType_fyLabel: { tenantId, documentType, fyLabel } },
      });

      if (existing) {
        return tx.documentSequence.update({
          where: { tenantId_documentType_fyLabel: { tenantId, documentType, fyLabel } },
          data: { lastSequence: { increment: 1 } },
        });
      }

      return tx.documentSequence.create({
        data: { tenantId, documentType, fyLabel, lastSequence: 1 },
      });
    });

    const padded = String(seq.lastSequence).padStart(3, '0');
    return `${prefix}/${fyLabel}/${padded}`;
  }
}