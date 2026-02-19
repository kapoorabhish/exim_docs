import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './product.dto';
import { parse } from 'csv-parse/sync';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, query: ProductQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { tenantId };
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { sku: { contains: query.q, mode: 'insensitive' } },
        { hsCode: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.category) where.category = query.category;
    if (query.active !== undefined) where.isActive = query.active === 'true';

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take: pageSize, orderBy: { name: 'asc' } }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(tenantId: string, dto: CreateProductDto) {
    const existing = await this.prisma.product.findFirst({ where: { tenantId, sku: dto.sku } });
    if (existing) throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);

    // Auto-fill BCD/IGST from HS code if not provided
    let bcdRate = dto.bcdRate;
    let igstRate = dto.igstRate;
    if (dto.hsCode && (bcdRate === undefined || igstRate === undefined)) {
      const hsEntry = await this.prisma.hsCode.findFirst({
        where: { code: { startsWith: dto.hsCode.substring(0, 6) } },
      });
      if (hsEntry) {
        bcdRate = bcdRate ?? (hsEntry.bcdRate ? Number(hsEntry.bcdRate) : undefined);
        igstRate = igstRate ?? (hsEntry.igstRate ? Number(hsEntry.igstRate) : undefined);
      }
    }

    return this.prisma.product.create({ data: { ...dto, tenantId, bcdRate, igstRate } });
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    await this.getById(tenantId, id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async deactivate(tenantId: string, id: string) {
    await this.getById(tenantId, id);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async delete(tenantId: string, id: string) {
    await this.getById(tenantId, id);
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted' };
  }

  csvTemplate(): string {
    return [
      'sku,name,customsDescription,hsCode,countryOfOrigin,uomCode,netWeightPerUnit,grossWeightPerUnit,bcdRate,igstRate,gstHsnCode,gstRate,category',
      'TSHIRT-BLK-M,Black T-Shirt Medium,"Knitted cotton T-shirt, black, size M",610910,IN,PCS,0.25,0.30,20,12,6109,12,Apparel',
      'PHARMA-API-001,Paracetamol API,"Paracetamol anhydrous pharmaceutical grade",300490,IN,KG,1.00,1.05,0,12,3004,12,Pharmaceuticals',
    ].join('\n');
  }

  async importCsv(tenantId: string, buffer: Buffer) {
    const records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const row of records) {
      try {
        if (!row.sku || !row.name) {
          results.errors.push(`Row skipped — missing sku or name`);
          results.skipped++;
          continue;
        }
        const existing = await this.prisma.product.findFirst({ where: { tenantId, sku: row.sku } });
        if (existing) { results.skipped++; continue; }

        await this.prisma.product.create({
          data: {
            tenantId,
            sku: row.sku,
            name: row.name,
            customsDescription: row.customsDescription || null,
            hsCode: row.hsCode || null,
            countryOfOrigin: row.countryOfOrigin || null,
            uomCode: row.uomCode || 'PCS',
            netWeightPerUnit: row.netWeightPerUnit ? parseFloat(row.netWeightPerUnit) : null,
            grossWeightPerUnit: row.grossWeightPerUnit ? parseFloat(row.grossWeightPerUnit) : null,
            bcdRate: row.bcdRate ? parseFloat(row.bcdRate) : null,
            igstRate: row.igstRate ? parseFloat(row.igstRate) : null,
            gstHsnCode: row.gstHsnCode || null,
            gstRate: row.gstRate ? parseFloat(row.gstRate) : null,
            category: row.category || null,
          },
        });
        results.created++;
      } catch (e: any) {
        results.errors.push(`Row error for "${row.sku}": ${e.message}`);
        results.skipped++;
      }
    }
    return results;
  }
}