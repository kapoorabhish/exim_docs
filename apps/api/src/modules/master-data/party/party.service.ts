import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PartyType } from '@exim/db';
import { PrismaService } from '../../../common/prisma.service';
import { CreatePartyDto, PartyQueryDto, UpdatePartyDto } from './party.dto';
import { parse } from 'csv-parse/sync';

@Injectable()
export class PartyService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query: PartyQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { tenantId };
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { gstin: { contains: query.q, mode: 'insensitive' } },
        { vatNumber: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.type) where.type = query.type;
    if (query.country) where.country = query.country;
    if (query.active !== undefined) where.isActive = query.active === 'true';

    const [data, total] = await Promise.all([
      this.prisma.party.findMany({
        where,
        include: { contacts: true },
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.party.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(tenantId: string, id: string) {
    const party = await this.prisma.party.findFirst({
      where: { id, tenantId },
      include: { contacts: true },
    });
    if (!party) throw new NotFoundException('Party not found');
    return party;
  }

  async create(tenantId: string, dto: CreatePartyDto) {
    const { contacts, ...partyData } = dto;

    // Warn on duplicate name+country within tenant
    const existing = await this.prisma.party.findFirst({
      where: { tenantId, name: partyData.name, country: partyData.country },
    });
    if (existing) throw new ConflictException(`Party "${partyData.name}" from ${partyData.country} already exists`);

    return this.prisma.party.create({
      data: {
        ...partyData,
        tenantId,
        contacts: contacts?.length
          ? { create: contacts }
          : undefined,
      },
      include: { contacts: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdatePartyDto) {
    await this.getById(tenantId, id);
    const { contacts, ...partyData } = dto;

    return this.prisma.party.update({
      where: { id },
      data: {
        ...partyData,
        contacts: contacts
          ? {
              deleteMany: {},
              create: contacts,
            }
          : undefined,
      },
      include: { contacts: true },
    });
  }

  async deactivate(tenantId: string, id: string) {
    await this.getById(tenantId, id);
    return this.prisma.party.update({ where: { id }, data: { isActive: false } });
  }

  async delete(tenantId: string, id: string) {
    await this.getById(tenantId, id);
    await this.prisma.party.delete({ where: { id } });
    return { message: 'Party deleted' };
  }

  csvTemplate(): string {
    return [
      'type,name,country,address,city,state,zip,vatNumber,iecNumber,gstin,bankName,swiftCode,accountNumber,defaultIncoterm,defaultPaymentTerms,creditLimit,preferredPortCode',
      'CUSTOMER,Acme Corp,US,"123 Main St",New York,NY,10001,US123456789,,,Chase Bank,CHASUS33,987654321,FOB,NET30,50000,USNYC',
      'VENDOR,Textile Mills Ltd,IN,"Plot 45 Industrial Area",Surat,GJ,395003,,0312345678,27AABCU9603R1ZX,HDFC Bank,HDFCINBB,1234567890,FOB,ADVANCE,,,INMRM',
    ].join('\n');
  }

  async importCsv(tenantId: string, buffer: Buffer) {
    const records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const row of records) {
      try {
        if (!row.name || !row.type || !row.country) {
          results.errors.push(`Row skipped — missing required field (name/type/country): ${JSON.stringify(row)}`);
          results.skipped++;
          continue;
        }
        const existing = await this.prisma.party.findFirst({
          where: { tenantId, name: row.name, country: row.country },
        });
        if (existing) { results.skipped++; continue; }

        await this.prisma.party.create({
          data: {
            tenantId,
            type: row.type as PartyType,
            name: row.name,
            country: row.country,
            address: row.address || null,
            city: row.city || null,
            state: row.state || null,
            zip: row.zip || null,
            vatNumber: row.vatNumber || null,
            iecNumber: row.iecNumber || null,
            gstin: row.gstin || null,
            bankName: row.bankName || null,
            swiftCode: row.swiftCode || null,
            accountNumber: row.accountNumber || null,
            defaultIncoterm: row.defaultIncoterm || null,
            defaultPaymentTerms: row.defaultPaymentTerms || null,
            creditLimit: row.creditLimit ? parseFloat(row.creditLimit) : null,
            preferredPortCode: row.preferredPortCode || null,
          },
        });
        results.created++;
      } catch (e: any) {
        results.errors.push(`Row error for "${row.name}": ${e.message}`);
        results.skipped++;
      }
    }
    return results;
  }
}