/**
 * SYSTEM MODULE
 * 
 * The platform control center for diagnostics, monitoring, and system management.
 * Provides health checks, registry visualization, event inspection, and system logs.
 */

import { Injectable, Logger, Controller, Get, Post, Body } from '@nestjs/common';
import { BaseModule } from '../../../kernel/core/base-module';
import { IKernel, ModuleManifest, HealthStatus } from '../../../kernel/contracts/module.contract';
import { PrismaService } from '@/prisma.service';

const MANIFEST: ModuleManifest = {
  id: 'system',
  name: 'System Control Center',
  version: '1.0.0',
  description: 'Platform diagnostics, monitoring, and system management',
  icon: 'Settings',
  enabledByDefault: true,
  
  menus: [
    {
      id: 'system',
      label: 'System',
      icon: 'Settings',
      order: 100,
      permissions: ['system.view']
    },
    {
      id: 'system-health',
      label: 'Health Status',
      path: '/system/health',
      parent: 'system',
      order: 1,
      permissions: ['system.health.view']
    },
    {
      id: 'system-modules',
      label: 'Module Registry',
      path: '/system/modules',
      parent: 'system',
      order: 2,
      permissions: ['system.modules.view']
    },
    {
      id: 'system-queues',
      label: 'Queue Monitor',
      path: '/system/queues',
      parent: 'system',
      order: 3,
      permissions: ['system.queues.view']
    },
    {
      id: 'system-events',
      label: 'Event Stream',
      path: '/system/events',
      parent: 'system',
      order: 4,
      permissions: ['system.events.view']
    },
    {
      id: 'system-logs',
      label: 'System Logs',
      path: '/system/logs',
      parent: 'system',
      order: 5,
      permissions: ['system.logs.view']
    }
  ],
  
  routes: [
    {
      id: 'system-health',
      path: '/system/health',
      component: 'SystemHealthPage',
      permissions: ['system.health.view']
    },
    {
      id: 'system-modules',
      path: '/system/modules',
      component: 'SystemModulesPage',
      permissions: ['system.modules.view']
    },
    {
      id: 'system-queues',
      path: '/system/queues',
      component: 'SystemQueuesPage',
      permissions: ['system.queues.view']
    },
    {
      id: 'system-events',
      path: '/system/events',
      component: 'SystemEventsPage',
      permissions: ['system.events.view']
    },
    {
      id: 'system-logs',
      path: '/system/logs',
      component: 'SystemLogsPage',
      permissions: ['system.logs.view']
    }
  ],
  
  widgets: [
    {
      id: 'system-status',
      name: 'System Status',
      description: 'Real-time system health indicators',
      component: 'SystemStatusWidget',
      category: 'dashboard',
      permissions: ['system.health.view']
    },
    {
      id: 'queue-stats',
      name: 'Queue Statistics',
      description: 'Active job queue metrics',
      component: 'QueueStatsWidget',
      category: 'dashboard',
      permissions: ['system.queues.view']
    },
    {
      id: 'recent-events',
      name: 'Recent System Events',
      description: 'Latest platform events',
      component: 'RecentEventsWidget',
      category: 'dashboard',
      permissions: ['system.events.view']
    }
  ],
  
  permissions: [
    'system.view',
    'system.health.view',
    'system.modules.view',
    'system.modules.manage',
    'system.queues.view',
    'system.queues.manage',
    'system.events.view',
    'system.logs.view'
  ],
  
  events: [
    {
      name: 'system.health.changed',
      description: 'System health status changed',
      payload: { status: 'string', checks: 'object' }
    },
    {
      name: 'system.module.registered',
      description: 'New module registered',
      payload: { moduleId: 'string', name: 'string' }
    },
    {
      name: 'system.queue.job.completed',
      description: 'Queue job completed',
      payload: { jobId: 'string', queue: 'string' }
    }
  ]
};

@Injectable()
export class SystemModule extends BaseModule {
  readonly manifest = MANIFEST;
  private readonly logger = new Logger(SystemModule.name);
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async onInitialize(): Promise<void> {
    this.logger.log('System module initializing...');
    
    // Listen to kernel events
    this.on('kernel.ready', this.handleKernelReady.bind(this));
    this.on('module.registered', this.handleModuleRegistered.bind(this));
    this.on('module.unregistered', this.handleModuleUnregistered.bind(this));
    
    // Start periodic health checks
    this.startHealthMonitoring();
    
    this.logger.log('System module initialized');
  }

  async onShutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.logger.log('System module shut down');
  }

  async onHealthCheck(): Promise<boolean> {
    // System module health check
    return true;
  }

  private async handleKernelReady(payload: any): Promise<void> {
    this.logger.log('Kernel ready event received', payload);
    await this.emit('kernel.ready.received', { timestamp: Date.now() });
  }

  private async handleModuleRegistered(payload: any): Promise<void> {
    this.logger.log(`Module registered: ${payload.moduleId}`);
  }

  private async handleModuleUnregistered(payload: any): Promise<void> {
    this.logger.log(`Module unregistered: ${payload.moduleId}`);
  }

  private startHealthMonitoring(): void {
    // Run health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.kernel?.healthCheck();
        if (health && health.status !== 'healthy') {
          this.logger.warn('System health degraded', health);
          await this.emit('system.health.changed', health);
        }
      } catch (error) {
        this.logger.error('Health check failed', error as Error);
      }
    }, 30000);
  }

  // API Methods exposed to controllers
  
  async getSystemHealth(): Promise<HealthStatus> {
    return await this.kernel!.healthCheck();
  }

  async getRegisteredModules(): Promise<any[]> {
    const modules = this.kernel!.modules.getAll();
    return modules.map(m => ({
      id: m.manifest.id,
      name: m.manifest.name,
      version: m.manifest.version,
      description: m.manifest.description,
      enabled: (m as any).isEnabled?.() ?? true,
      initialized: (m as any).isInitialized?.() ?? false,
      dependencies: m.manifest.dependencies || [],
      permissions: m.manifest.permissions || [],
      menus: m.manifest.menus || [],
      widgets: m.manifest.widgets || []
    }));
  }

  async getQueueStats(): Promise<any> {
    const stats = await this.kernel!.queue.getAllStats?.() || [];
    return stats;
  }

  async getSystemLogs(limit: number = 100): Promise<any[]> {
    // TODO: Run prisma generate to fix types
    return await (this.prisma as any).auditLog?.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' }
    }) || [];
  }

  async getRecentEvents(limit: number = 50): Promise<any[]> {
    // TODO: Run prisma generate to fix types
    return await (this.prisma as any).systemEvent?.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' }
    }) || [];
  }
}

// Controller for System Module API endpoints
@Controller('system')
export class SystemController {
  private readonly logger = new Logger(SystemController.name);

  constructor(private readonly systemModule: SystemModule) {}

  @Get('health')
  async getHealth() {
    return await this.systemModule.getSystemHealth();
  }

  @Get('modules')
  async getModules() {
    return await this.systemModule.getRegisteredModules();
  }

  @Get('queues')
  async getQueues() {
    return await this.systemModule.getQueueStats();
  }

  @Get('logs')
  async getLogs(@Body('limit') limit?: number) {
    return await this.systemModule.getSystemLogs(limit);
  }

  @Get('events')
  async getEvents(@Body('limit') limit?: number) {
    return await this.systemModule.getRecentEvents(limit);
  }
}
