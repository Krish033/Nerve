/**
 * DASHBOARD MODULE
 * 
 * Provides the main dashboard functionality with dynamic widgets,
 * metrics cards, and modular dashboard sections.
 */

import { Injectable, Logger, Controller, Get, Post, Body, Param } from '@nestjs/common';
import { BaseModule } from '../../../kernel/core/base-module';
import { IKernel, ModuleManifest } from '../../../kernel/contracts/module.contract';
import { PrismaService } from '@/prisma.service';

const MANIFEST: ModuleManifest = {
  id: 'dashboard',
  name: 'Dashboard',
  version: '1.0.0',
  description: 'Main dashboard with dynamic widgets and metrics',
  icon: 'LayoutDashboard',
  enabledByDefault: true,
  
  menus: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'LayoutDashboard',
      order: 1,
      permissions: ['dashboard.view']
    }
  ],
  
  routes: [
    {
      id: 'dashboard-main',
      path: '/dashboard',
      component: 'DashboardPage',
      isDefault: true,
      permissions: ['dashboard.view']
    }
  ],
  
  widgets: [
    {
      id: 'stats-overview',
      name: 'Statistics Overview',
      description: 'Key metrics and statistics',
      component: 'StatsOverviewWidget',
      category: 'dashboard',
      defaultConfig: {
        showUsers: true,
        showJobs: true,
        showModules: true
      },
      permissions: ['dashboard.widgets.view']
    },
    {
      id: 'recent-activity',
      name: 'Recent Activity',
      description: 'Latest platform activity feed',
      component: 'RecentActivityWidget',
      category: 'dashboard',
      permissions: ['dashboard.widgets.view']
    },
    {
      id: 'quick-actions',
      name: 'Quick Actions',
      description: 'Common actions shortcuts',
      component: 'QuickActionsWidget',
      category: 'dashboard',
      permissions: ['dashboard.widgets.view']
    },
    {
      id: 'job-status',
      name: 'Job Status Overview',
      description: 'Active and recent job statuses',
      component: 'JobStatusWidget',
      category: 'dashboard',
      permissions: ['dashboard.widgets.view', 'system.queues.view']
    },
    {
      id: 'system-health-mini',
      name: 'System Health',
      description: 'Compact system health indicator',
      component: 'SystemHealthMiniWidget',
      category: 'dashboard',
      permissions: ['system.health.view']
    }
  ],
  
  permissions: [
    'dashboard.view',
    'dashboard.widgets.view',
    'dashboard.widgets.configure',
    'dashboard.widgets.add',
    'dashboard.widgets.remove'
  ],
  
  events: [
    {
      name: 'dashboard.widget.added',
      description: 'Widget added to dashboard',
      payload: { widgetId: 'string', dashboardId: 'string' }
    },
    {
      name: 'dashboard.widget.removed',
      description: 'Widget removed from dashboard',
      payload: { widgetId: 'string', dashboardId: 'string' }
    },
    {
      name: 'dashboard.widget.configured',
      description: 'Widget configuration updated',
      payload: { widgetId: 'string', config: 'object' }
    }
  ],
  
  settings: {
    defaultLayout: 'grid',
    columns: 3,
    refreshInterval: 60
  }
};

@Injectable()
export class DashboardModule extends BaseModule {
  readonly manifest = MANIFEST;
  private readonly logger = new Logger(DashboardModule.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async onInitialize(): Promise<void> {
    this.logger.log('Dashboard module initializing...');
    
    // Setup event handlers
    this.on('dashboard.widget.added', this.handleWidgetAdded.bind(this));
    this.on('dashboard.widget.removed', this.handleWidgetRemoved.bind(this));
    
    this.logger.log('Dashboard module initialized');
  }

  async onShutdown(): Promise<void> {
    this.logger.log('Dashboard module shut down');
  }

  async onHealthCheck(): Promise<boolean> {
    return true;
  }

  private async handleWidgetAdded(payload: any): Promise<void> {
    this.logger.log(`Widget added: ${payload.widgetId}`);
  }

  private async handleWidgetRemoved(payload: any): Promise<void> {
    this.logger.log(`Widget removed: ${payload.widgetId}`);
  }

  // Dashboard API methods

  async getDashboardData(tenantId: string, userId?: string): Promise<any> {
    // Get widget instances for this tenant/user
    const widgetInstances = await (this.prisma as any).widgetInstance?.findMany({
      where: {
        tenantId,
        OR: [
          { userId: null }, // Global widgets
          { userId: userId || undefined } // User-specific widgets
        ],
        isVisible: true
      },
      include: {
        widget: true
      },
      orderBy: { position: 'asc' }
    }) || [];

    // Get stats for the dashboard
    const stats = await this.getStats(tenantId);

    return {
      widgets: widgetInstances,
      stats,
      layout: {
        columns: 3,
        refreshInterval: 60
      }
    };
  }

  async getStats(tenantId: string): Promise<any> {
    const [
      userCount,
      jobCount,
      recentJobs,
      workflowCount,
      activeWorkflows
    ] = await Promise.all([
      (this.prisma as any).tenantUser?.count({ where: { tenantId } }) || 0,
      (this.prisma as any).job?.count({ where: { tenantId } }) || 0,
      (this.prisma as any).job?.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' }
      }) || [],
      (this.prisma as any).workflow?.count({ where: { tenantId } }) || 0,
      (this.prisma as any).workflow?.count({ 
        where: { 
          tenantId,
          isActive: true 
        } 
      }) || 0
    ]);

    return {
      users: userCount,
      jobs: {
        total: jobCount,
        recent: recentJobs
      },
      workflows: {
        total: workflowCount,
        active: activeWorkflows
      }
    };
  }

  async getAvailableWidgets(): Promise<any[]> {
    // Get all widgets from registered modules
    const widgets = await (this.prisma as any).widget?.findMany({
      where: { isSystem: false }
    }) || [];

    // Also get from module manifests
    const moduleWidgets = this.kernel!.modules.getAll()
      .flatMap(m => m.manifest.widgets || [])
      .map(w => ({
        ...w,
        source: 'manifest'
      }));

    return [...widgets, ...moduleWidgets];
  }

  async addWidgetToDashboard(
    tenantId: string,
    dashboardId: string,
    widgetId: string,
    userId?: string,
    config?: any
  ): Promise<any> {
    const existingWidget = await (this.prisma as any).widget?.findUnique({
      where: { widgetId }
    });

    if (!existingWidget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    // Get next position
    const lastPosition = await (this.prisma as any).widgetInstance?.findFirst({
      where: { tenantId, dashboardId },
      orderBy: { position: 'desc' }
    });

    const position = (lastPosition?.position ?? -1) + 1;

    const instance = await (this.prisma as any).widgetInstance?.create({
      data: {
        widgetId: existingWidget.id,
        tenantId,
        userId,
        dashboardId,
        config: config || existingWidget.defaultConfig,
        position
      }
    });

    await this.emit('dashboard.widget.added', {
      widgetId,
      dashboardId,
      tenantId,
      userId
    });

    return instance;
  }

  async removeWidgetFromDashboard(instanceId: string): Promise<void> {
    const instance = await (this.prisma as any).widgetInstance?.delete({
      where: { id: instanceId }
    });

    await this.emit('dashboard.widget.removed', {
      widgetId: instance.widgetId,
      dashboardId: instance.dashboardId
    });
  }

  async updateWidgetConfig(instanceId: string, config: any): Promise<any> {
    const instance = await (this.prisma as any).widgetInstance?.update({
      where: { id: instanceId },
      data: { config }
    });

    await this.emit('dashboard.widget.configured', {
      widgetId: instance.widgetId,
      config
    });

    return instance;
  }
}

// Controller for Dashboard API endpoints
@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardModule: DashboardModule) {}

  @Get()
  async getDashboard(@Body('tenantId') tenantId: string, @Body('userId') userId?: string) {
    return await this.dashboardModule.getDashboardData(tenantId, userId);
  }

  @Get('widgets')
  async getWidgets() {
    return await this.dashboardModule.getAvailableWidgets();
  }

  @Post('widgets')
  async addWidget(
    @Body('tenantId') tenantId: string,
    @Body('dashboardId') dashboardId: string,
    @Body('widgetId') widgetId: string,
    @Body('userId') userId?: string,
    @Body('config') config?: any
  ) {
    return await this.dashboardModule.addWidgetToDashboard(
      tenantId,
      dashboardId,
      widgetId,
      userId,
      config
    );
  }

  @Post('widgets/:instanceId/remove')
  async removeWidget(@Param('instanceId') instanceId: string) {
    await this.dashboardModule.removeWidgetFromDashboard(instanceId);
    return { success: true };
  }

  @Post('widgets/:instanceId/config')
  async updateWidgetConfig(
    @Param('instanceId') instanceId: string,
    @Body('config') config: any
  ) {
    return await this.dashboardModule.updateWidgetConfig(instanceId, config);
  }
}
