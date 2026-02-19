import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

export interface CreateTermsTemplateDto {
  name: string;
  documentType: string;
  content: string;
  isDefault?: boolean;
}

export interface UpdateTermsTemplateDto {
  name?: string;
  documentType?: string;
  content?: string;
  isDefault?: boolean;
}

@Injectable()
export class TermsService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, documentType?: string) {
    const where: any = { tenantId };
    if (documentType) where.documentType = documentType;
    return this.prisma.termsTemplate.findMany({
      where,
      orderBy: [{ documentType: 'asc' }, { isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async getById(tenantId: string, id: string) {
    const template = await this.prisma.termsTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!template) throw new NotFoundException('Terms template not found');
    return template;
  }

  async create(tenantId: string, dto: CreateTermsTemplateDto) {
    // If setting as default, clear existing defaults for this document type
    if (dto.isDefault) {
      await this.prisma.termsTemplate.updateMany({
        where: { tenantId, documentType: dto.documentType, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.termsTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        documentType: dto.documentType,
        content: dto.content,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateTermsTemplateDto) {
    const existing = await this.prisma.termsTemplate.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Terms template not found');

    // If setting as default, clear other defaults for this document type
    const docType = dto.documentType ?? existing.documentType;
    if (dto.isDefault) {
      await this.prisma.termsTemplate.updateMany({
        where: { tenantId, documentType: docType, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.termsTemplate.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.termsTemplate.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Terms template not found');
    await this.prisma.termsTemplate.delete({ where: { id } });
    return { message: 'Template deleted' };
  }

  async setDefault(tenantId: string, id: string) {
    const template = await this.prisma.termsTemplate.findFirst({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('Terms template not found');

    // Clear existing defaults for this document type
    await this.prisma.termsTemplate.updateMany({
      where: { tenantId, documentType: template.documentType, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.termsTemplate.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async getDefault(tenantId: string, documentType: string) {
    return this.prisma.termsTemplate.findFirst({
      where: { tenantId, documentType, isDefault: true },
    });
  }
}