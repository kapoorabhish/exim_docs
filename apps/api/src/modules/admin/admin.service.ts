import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listTenants(query: any) {
    const { status, plan, q, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { businessProfile: { iecNumber: { contains: q, mode: 'insensitive' } } },
        { users: { some: { email: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        include: {
          businessProfile: { select: { companyName: true, iecNumber: true } },
          _count: { select: { users: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { data: tenants, total, page: Number(page), limit: Number(limit) };
  }

  async getTenantById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        businessProfile: true,
        _count: {
          select: {
            users: true,
            parties: true,
            products: true,
            proformaInvoices: true,
            commercialInvoices: true,
            shippingBills: true,
          },
        },
      },
    });
  }

  async setTenantStatus(id: string, status: string) {
    return this.prisma.tenant.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async getPlatformStats() {
    const [
      totalTenants,
      byStatus,
      byPlan,
      totalUsers,
      totalInvoices,
      totalShippingBills,
      topTenants,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.tenant.groupBy({ by: ['plan'], _count: { id: true } }),
      this.prisma.user.count(),
      this.prisma.commercialInvoice.count(),
      this.prisma.shippingBill.count(),
      // Top 10 tenants by invoice count
      this.prisma.tenant.findMany({
        take: 10,
        include: {
          businessProfile: { select: { companyName: true } },
          _count: { select: { commercialInvoices: true } },
        },
        orderBy: { commercialInvoices: { _count: 'desc' } },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of byStatus) statusMap[s.status] = s._count.id;

    const planMap: Record<string, number> = {};
    for (const p of byPlan) planMap[p.plan] = p._count.id;

    return {
      totalTenants,
      byStatus: statusMap,
      activeTenants: statusMap['ACTIVE'] ?? 0,
      trialTenants: statusMap['TRIAL'] ?? 0,
      expiredTenants: statusMap['EXPIRED'] ?? 0,
      suspendedTenants: statusMap['SUSPENDED'] ?? 0,
      byPlan: planMap,
      totalUsers,
      totalInvoices,
      totalShippingBills,
      topTenants: topTenants.map((t) => ({
        id: t.id,
        name: t.businessProfile?.companyName ?? t.name,
        plan: t.plan,
        invoiceCount: t._count.commercialInvoices,
      })),
    };
  }
}