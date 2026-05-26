/**
 * Plugin Registry System
 * 
 * Centralized registry for all plugin registrations including:
 * - Plugin instances
 * - Routes
 * - Widgets
 * - Queues
 * - Events
 * - Permissions
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import {
  PluginInstance,
  PluginManifest,
  ValidatedPluginManifest,
  PluginRoute,
  PluginWidget,
  PluginQueue,
  PluginPermission,
} from '../contracts';

interface RegisteredRoute {
  pluginId: string;
  route: PluginRoute;
  handler: unknown;
}

interface RegisteredWidget {
  pluginId: string;
  widget: PluginWidget;
}

interface RegisteredQueue {
  pluginId: string;
  queue: PluginQueue;
  workerId?: string;
}

@Injectable()
export class PluginRegistry {
  private readonly logger = new Logger(PluginRegistry.name);
  
  // In-memory registries for runtime access
  private readonly plugins = new Map<string, PluginInstance>();
  private readonly routes = new Map<string, RegisteredRoute[]>();
  private readonly widgets = new Map<string, RegisteredWidget[]>();
  private readonly queues = new Map<string, RegisteredQueue[]>();
  private readonly permissions = new Map<string, PluginPermission[]>();
  
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a plugin instance in the system
   */
  async registerPlugin(instance: PluginInstance): Promise<void> {
    // Store in memory
    this.plugins.set(instance.id, instance);
    this.routes.set(instance.id, []);
    this.widgets.set(instance.id, []);
    this.queues.set(instance.id, []);
    this.permissions.set(instance.id, instance.manifest.permissions);
    
    // Persist to database
    await this.prisma.plugin.create({
      data: {
        id: instance.id,
        name: instance.manifest.name,
        version: instance.manifest.version,
        type: instance.manifest.type,
        manifest: JSON.stringify(instance.manifest),
        state: instance.state,
        installedAt: instance.installedAt,
        installPath: instance.installPath,
      },
    });
    
    this.logger.log(`Registered plugin: ${instance.manifest.name} (${instance.id})`);
  }

  /**
   * Update plugin state in registry
   */
  async updatePlugin(instance: PluginInstance): Promise<void> {
    // Update memory
    this.plugins.set(instance.id, instance);
    
    // Update database
    await this.prisma.plugin.update({
      where: { id: instance.id },
      data: {
        state: instance.state,
        enabledAt: instance.enabledAt,
        healthStatus: instance.healthStatus,
        failureCount: instance.failureCount,
        lastFailure: instance.lastFailure ? JSON.stringify(instance.lastFailure) : null,
        stateHistory: JSON.stringify(instance.stateHistory),
      },
    });
  }

  /**
   * Unregister a plugin completely
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    // Clean up memory
    this.plugins.delete(pluginId);
    this.routes.delete(pluginId);
    this.widgets.delete(pluginId);
    this.queues.delete(pluginId);
    this.permissions.delete(pluginId);
    
    // Remove from database
    await this.prisma.plugin.delete({
      where: { id: pluginId },
    });
    
    this.logger.log(`Unregistered plugin: ${pluginId}`);
  }

  /**
   * Get a plugin by ID
   */
  async getPlugin(pluginId: string): Promise<PluginInstance | undefined> {
    // Check memory first
    const cached = this.plugins.get(pluginId);
    if (cached) return cached;
    
    // Load from database
    const dbPlugin = await this.prisma.plugin.findUnique({
      where: { id: pluginId },
    });
    
    if (!dbPlugin) return undefined;
    
    // Reconstruct instance
    const instance = this.reconstructInstance(dbPlugin);
    this.plugins.set(pluginId, instance);
    
    return instance;
  }

  /**
   * Get plugin by name
   */
  async getPluginByName(name: string): Promise<PluginInstance | undefined> {
    // Check memory
    for (const instance of this.plugins.values()) {
      if (instance.manifest.name === name) {
        return instance;
      }
    }
    
    // Query database
    const dbPlugin = await this.prisma.plugin.findFirst({
      where: { name },
    });
    
    if (!dbPlugin) return undefined;
    
    return this.reconstructInstance(dbPlugin);
  }

  /**
   * List all registered plugins
   */
  async listPlugins(): Promise<PluginInstance[]> {
    // Load all from database
    const dbPlugins = await this.prisma.plugin.findMany();
    
    return dbPlugins.map((p: { id: string; name: string; version: string; type: string; manifest: string; state: string; installedAt: Date; enabledAt: Date | null; installPath: string; updatedAt: Date; healthStatus: string | null; failureCount: number; lastFailure: string | null; stateHistory: string | null; }) => {
      // Use cached version if available
      const cached = this.plugins.get(p.id);
      if (cached) return cached;
      
      const instance = this.reconstructInstance(p);
      this.plugins.set(p.id, instance);
      return instance;
    });
  }

  /**
   * Register plugin routes
   */
  async registerRoutes(instance: PluginInstance): Promise<{ success: boolean; error?: string }> {
    try {
      const registered: RegisteredRoute[] = [];
      
      for (const route of instance.manifest.routes) {
        // Validate route doesn't conflict with existing routes
        const conflict = await this.checkRouteConflict(route);
        if (conflict) {
          return {
            success: false,
            error: `Route conflict: ${route.method} ${route.path} already registered`,
          };
        }
        
        registered.push({
          pluginId: instance.id,
          route,
          handler: null, // Will be set when backend module loads
        });
        
        this.logger.debug(`Registered route: ${route.method} ${route.path}`);
      }
      
      this.routes.set(instance.id, registered);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Unregister plugin routes
   */
  async unregisterRoutes(instance: PluginInstance): Promise<void> {
    this.routes.delete(instance.id);
    this.logger.debug(`Unregistered routes for ${instance.manifest.name}`);
  }

  /**
   * Register plugin widgets
   */
  async registerWidgets(instance: PluginInstance): Promise<{ success: boolean; error?: string }> {
    try {
      const registered: RegisteredWidget[] = instance.manifest.widgets.map(widget => ({
        pluginId: instance.id,
        widget,
      }));
      
      this.widgets.set(instance.id, registered);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Unregister plugin widgets
   */
  async unregisterWidgets(instance: PluginInstance): Promise<void> {
    this.widgets.delete(instance.id);
  }

  /**
   * Register plugin queues
   */
  async registerQueues(instance: PluginInstance): Promise<{ success: boolean; error?: string }> {
    try {
      const registered: RegisteredQueue[] = instance.manifest.queues.map(queue => ({
        pluginId: instance.id,
        queue,
      }));
      
      this.queues.set(instance.id, registered);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Unregister plugin queues
   */
  async unregisterQueues(instance: PluginInstance): Promise<void> {
    this.queues.delete(instance.id);
  }

  /**
   * Get all registered routes
   */
  getAllRoutes(): Array<{ pluginId: string; route: PluginRoute }> {
    const allRoutes: Array<{ pluginId: string; route: PluginRoute }> = [];
    
    for (const [pluginId, routes] of this.routes) {
      for (const registered of routes) {
        allRoutes.push({ pluginId, route: registered.route });
      }
    }
    
    return allRoutes;
  }

  /**
   * Get all registered widgets
   */
  getAllWidgets(): Array<{ pluginId: string; widget: PluginWidget }> {
    const allWidgets: Array<{ pluginId: string; widget: PluginWidget }> = [];
    
    for (const [pluginId, widgets] of this.widgets) {
      for (const registered of widgets) {
        allWidgets.push({ pluginId, widget: registered.widget });
      }
    }
    
    return allWidgets;
  }

  /**
   * Get all registered queues
   */
  getAllQueues(): Array<{ pluginId: string; queue: PluginQueue; workerId?: string }> {
    const allQueues: Array<{ pluginId: string; queue: PluginQueue; workerId?: string }> = [];
    
    for (const [pluginId, queues] of this.queues) {
      for (const registered of queues) {
        allQueues.push({
          pluginId,
          queue: registered.queue,
          workerId: registered.workerId,
        });
      }
    }
    
    return allQueues;
  }

  /**
   * Get plugin permissions
   */
  getPluginPermissions(pluginId: string): PluginPermission[] {
    return this.permissions.get(pluginId) || [];
  }

  /**
   * Check if permission is granted to plugin
   */
  hasPermission(pluginId: string, resource: string, action: string): boolean {
    const permissions = this.permissions.get(pluginId) || [];
    
    return permissions.some(p => {
      if (p.resource !== resource && p.resource !== '*') return false;
      return p.actions.includes(action as any) || p.actions.includes('admin' as any);
    });
  }

  /**
   * Update queue worker ID
   */
  updateQueueWorker(pluginId: string, queueName: string, workerId: string): void {
    const queues = this.queues.get(pluginId);
    if (!queues) return;
    
    const queue = queues.find(q => q.queue.name === queueName);
    if (queue) {
      queue.workerId = workerId;
    }
  }

  // Private helpers

  private reconstructInstance(dbPlugin: any): PluginInstance {
    const manifest = JSON.parse(dbPlugin.manifest) as ValidatedPluginManifest;
    
    return {
      id: dbPlugin.id,
      manifest,
      state: dbPlugin.state,
      installedAt: dbPlugin.installedAt,
      enabledAt: dbPlugin.enabledAt || undefined,
      lastUpdatedAt: dbPlugin.updatedAt,
      installPath: dbPlugin.installPath,
      stateHistory: dbPlugin.stateHistory ? JSON.parse(dbPlugin.stateHistory) : [{
        state: dbPlugin.state,
        timestamp: dbPlugin.installedAt,
        reason: 'reconstructed',
      }],
      healthStatus: dbPlugin.healthStatus || 'unknown',
      failureCount: dbPlugin.failureCount || 0,
      lastFailure: dbPlugin.lastFailure ? JSON.parse(dbPlugin.lastFailure) : undefined,
    };
  }

  private async checkRouteConflict(route: PluginRoute): Promise<boolean> {
    for (const routes of this.routes.values()) {
      for (const registered of routes) {
        if (registered.route.path === route.path && registered.route.method === route.method) {
          return true;
        }
      }
    }
    return false;
  }
}
