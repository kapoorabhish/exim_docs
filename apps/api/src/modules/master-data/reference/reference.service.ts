import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class ReferenceService {
  constructor(private prisma: PrismaService) {}

  async searchPorts(q?: string, country?: string, type?: string) {
    const where: any = { isActive: true };
    if (q) where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { code: { contains: q.toUpperCase() } },
    ];
    if (country) where.country = country.toUpperCase();
    if (type) where.portType = type.toUpperCase();

    return this.prisma.port.findMany({ where, take: 50, orderBy: [{ country: 'asc' }, { name: 'asc' }] });
  }

  async searchCountries(q?: string) {
    const where: any = {};
    if (q) where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { code: { contains: q.toUpperCase() } },
      { code3: { contains: q.toUpperCase() } },
    ];
    return this.prisma.country.findMany({ where, orderBy: { name: 'asc' } });
  }

  async searchHsCodes(q?: string, chapter?: string) {
    const where: any = {};
    if (chapter) where.chapter = chapter;
    if (q) {
      const isCode = /^\d/.test(q);
      where.OR = isCode
        ? [{ code: { startsWith: q } }]
        : [
            { description: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ];
    }
    return this.prisma.hsCode.findMany({ where, take: 50, orderBy: { code: 'asc' } });
  }

  async listUoms() {
    return this.prisma.uom.findMany({ where: { tenantId: null }, orderBy: { code: 'asc' } });
  }

  async listIncoterms() {
    return this.prisma.incoterm.findMany({ orderBy: { code: 'asc' } });
  }
}