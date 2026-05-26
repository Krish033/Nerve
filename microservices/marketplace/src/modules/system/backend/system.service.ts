/**
 * SYSTEM SERVICE
 * 
 * Core service for system-level operations and diagnostics.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma.service';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDiagnostics(): Promise<any> {
    const [
      tenantCount,
      moduleCount,
      jobCount,
      workflowCount,
      userCount,
      recentErrors
    ] = await Promise.all([
      (this.prisma as any).tenant?.count() || 0,
      (this.prisma as any).platformModule?.count() || 0,
      (this.prisma as any).job?.count() || 0,
      (this.prisma as any).workflow?.count() || 0,
      this.prisma.user.count(),
      this.prisma.errorLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      counts: {
        tenants: tenantCount,
        modules: moduleCount,
        jobs: jobCount,
        workflows: workflowCount,
        users: userCount
      },
      recentErrors
    };
  }

  async getModuleStats(): Promise<any> {
    const modules = await (this.prisma as any).platformModule?.findMany({
      include: {
        _count: {
          select: { tenantModules: true }
        }
      }
    }) || [];

    return modules.map((m: any) => ({
      id: m.moduleId,
      name: m.name,
      version: m.version,
      status: m.status,
      tenantInstallations: m._count.tenantModules,
      createdAt: m.createdAt
    }));
  }

  async getJobStats(): Promise<any> {
    const stats = await (this.prisma as any).job?.groupBy({
      by: ['status', 'queue'],
      _count: { _all: true }
    }) || [];

    const recentJobs = await (this.prisma as any).job?.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        queue: true,
        status: true,
        progress: true,
        createdAt: true
      }
    });

    return { stats, recentJobs };
  }

  async cleanupOldData(daysToKeep: number = 30): Promise<any> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const [
      deletedJobs,
      deletedEvents,
      deletedLogs
    ] = await Promise.all([
      (this.prisma as any).job?.deleteMany({
        where: {
          status: { in: ['completed', 'failed'] },
          completedAt: { lt: cutoffDate }
        }
      }) || { count: 0 },
      (this.prisma as any).systemEvent?.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          processed: true
        }
      }) || { count: 0 },
      (this.prisma as any).auditLog?.deleteMany({
        where: {
          createdAt: { lt: cutoffDate }
        }
      }) || { count: 0 }
    ]);

    return {
      deletedJobs: deletedJobs.count,
      deletedEvents: deletedEvents.count,
      deletedLogs: deletedLogs.count
    };
  }
}
