/**
 * MODULE REGISTRY
 * 
 * Manages module registration, menus, routes, widgets, and tenant-specific configurations.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IModuleRegistry,
  IModule,
  IKernel,
  MenuRegistration,
  RouteRegistration,
  WidgetRegistration,
  ApiRegistration,
} from '../contracts/module.contract';

interface TenantRegistration<T> {
  moduleId: string;
  registration: T;
  tenantId: string;
}

@Injectable()
export class ModuleRegistry implements IModuleRegistry {
  private readonly logger = new Logger(ModuleRegistry.name);
  private kernel: IKernel | undefined;
  private modules = new Map<string, IModule>();

  // Tenant-scoped registrations
  private menus = new Map<string, TenantRegistration<MenuRegistration>[]>();
  private routes = new Map<string, TenantRegistration<RouteRegistration>[]>();
  private widgets = new Map<string, TenantRegistration<WidgetRegistration>[]>();
  private apis = new Map<string, ApiRegistration[]>();

  setKernel(kernel: IKernel): void {
    this.kernel = kernel;
  }

  /**
   * Register a module
   */
  register(module: IModule): void {
    this.modules.set(module.manifest.id, module);
    this.logger.debug(`Registered module: ${module.manifest.id}`);

    // Register global APIs
    if (module.manifest.apis) {
      this.apis.set(module.manifest.id, module.manifest.apis);
    }
  }

  /**
   * Unregister a module
   */
  unregister(moduleId: string): void {
    this.modules.delete(moduleId);
    this.menus.delete(moduleId);
    this.routes.delete(moduleId);
    this.widgets.delete(moduleId);
    this.apis.delete(moduleId);
    this.logger.debug(`Unregistered module: ${moduleId}`);
  }

  /**
   * Get all registered modules
   */
  getAll(): IModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get module by ID
   */
  get(moduleId: string): IModule | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Check if module exists
   */
  has(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  /**
   * Get enabled modules
   */
  getEnabled(): IModule[] {
    return this.getAll().filter(
      (m) => m.manifest.enabledByDefault !== false,
    );
  }

  /**
   * Get modules by category (future feature)
   */
  getByCategory(category: string): IModule[] {
    // For now, filter by module ID patterns or tags
    return this.getAll().filter((m) =>
      m.manifest.description?.toLowerCase().includes(category.toLowerCase()),
    );
  }

  // Menu Registration

  registerMenuForTenant(
    moduleId: string,
    menu: MenuRegistration,
    tenantId?: string,
  ): void {
    const key = tenantId || 'global';
    const registrations = this.menus.get(key) || [];

    registrations.push({
      moduleId,
      registration: menu,
      tenantId: key,
    });

    this.menus.set(key, registrations);
    this.logger.debug(`Registered menu ${menu.id} for module ${moduleId}`);
  }

  unregisterMenusForTenant(moduleId: string, tenantId?: string): void {
    const key = tenantId || 'global';
    const registrations = this.menus.get(key) || [];
    const filtered = registrations.filter((r) => r.moduleId !== moduleId);
    this.menus.set(key, filtered);
  }

  getMenusForTenant(tenantId?: string): TenantRegistration<MenuRegistration>[] {
    const key = tenantId || 'global';
    const globalMenus = this.menus.get('global') || [];
    const tenantMenus = this.menus.get(key) || [];

    // Merge global and tenant-specific menus
    return [...globalMenus, ...tenantMenus];
  }

  // Route Registration

  registerRouteForTenant(
    moduleId: string,
    route: RouteRegistration,
    tenantId?: string,
  ): void {
    const key = tenantId || 'global';
    const registrations = this.routes.get(key) || [];

    registrations.push({
      moduleId,
      registration: route,
      tenantId: key,
    });

    this.routes.set(key, registrations);
    this.logger.debug(`Registered route ${route.path} for module ${moduleId}`);
  }

  unregisterRoutesForTenant(moduleId: string, tenantId?: string): void {
    const key = tenantId || 'global';
    const registrations = this.routes.get(key) || [];
    const filtered = registrations.filter((r) => r.moduleId !== moduleId);
    this.routes.set(key, filtered);
  }

  getRoutesForTenant(tenantId?: string): TenantRegistration<RouteRegistration>[] {
    const key = tenantId || 'global';
    const globalRoutes = this.routes.get('global') || [];
    const tenantRoutes = this.routes.get(key) || [];

    return [...globalRoutes, ...tenantRoutes];
  }

  // Widget Registration

  registerWidgetForTenant(
    moduleId: string,
    widget: WidgetRegistration,
    tenantId?: string,
  ): void {
    const key = tenantId || 'global';
    const registrations = this.widgets.get(key) || [];

    registrations.push({
      moduleId,
      registration: widget,
      tenantId: key,
    });

    this.widgets.set(key, registrations);
    this.logger.debug(`Registered widget ${widget.id} for module ${moduleId}`);
  }

  unregisterWidgetsForTenant(moduleId: string, tenantId?: string): void {
    const key = tenantId || 'global';
    const registrations = this.widgets.get(key) || [];
    const filtered = registrations.filter((r) => r.moduleId !== moduleId);
    this.widgets.set(key, filtered);
  }

  getWidgetsForTenant(
    category?: string,
    tenantId?: string,
  ): TenantRegistration<WidgetRegistration>[] {
    const key = tenantId || 'global';
    const globalWidgets = this.widgets.get('global') || [];
    const tenantWidgets = this.widgets.get(key) || [];
    const all = [...globalWidgets, ...tenantWidgets];

    if (category) {
      return all.filter((w) => w.registration.category === category);
    }

    return all;
  }

  // API Registration

  getApisForModule(moduleId: string): ApiRegistration[] {
    return this.apis.get(moduleId) || [];
  }

  getAllApis(): Map<string, ApiRegistration[]> {
    return this.apis;
  }

  /**
   * Build navigation tree for UI
   */
  buildNavigationTree(
    tenantId?: string,
    userPermissions?: string[],
  ): MenuNode[] {
    const menus = this.getMenusForTenant(tenantId);
    const nodes: MenuNode[] = [];
    const nodeMap = new Map<string, MenuNode>();

    // Create all nodes
    for (const menu of menus) {
      // Filter by permissions if provided
      if (
        userPermissions &&
        menu.registration.permissions &&
        !menu.registration.permissions.some((p) => userPermissions.includes(p))
      ) {
        continue;
      }

      const node: MenuNode = {
        id: menu.registration.id,
        label: menu.registration.label,
        icon: menu.registration.icon,
        path: menu.registration.path,
        order: menu.registration.order || 0,
        children: [],
      };

      nodeMap.set(menu.registration.id, node);

      // If no parent, add to root
      if (!menu.registration.parent) {
        nodes.push(node);
      }
    }

    // Build parent-child relationships
    for (const menu of menus) {
      if (menu.registration.parent) {
        const parent = nodeMap.get(menu.registration.parent);
        const child = nodeMap.get(menu.registration.id);

        if (parent && child) {
          parent.children.push(child);
        }
      }
    }

    // Sort by order
    nodes.sort((a, b) => a.order - b.order);
    for (const node of nodes) {
      node.children.sort((a, b) => a.order - b.order);
    }

    return nodes;
  }
}

/**
 * Menu Node for UI tree
 */
export interface MenuNode {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  order: number;
  children: MenuNode[];
}
