/**
 * Plugin Route Loader
 * 
 * Dynamically registers plugin API routes at runtime.
 * Enables plug-and-play API endpoints without core code modification.
 */

import { Injectable, Logger, Type, Controller, Post, Get, Put, Delete, Patch, Body, Param, Query } from '@nestjs/common';
import { ModulesContainer, ModuleRef } from '@nestjs/core';
import { PluginInstance, PluginRoute } from '../contracts';

interface RegisteredRoute {
  pluginId: string;
  path: string;
  method: string;
  handler: string;
  controller: any;
}

@Injectable()
export class PluginRouteLoader {
  private readonly logger = new Logger(PluginRouteLoader.name);
  private readonly registeredRoutes = new Map<string, RegisteredRoute>();
  private readonly pluginControllers = new Map<string, any>();

  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Load and register all routes for a plugin
   */
  async loadPluginRoutes(instance: PluginInstance): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.log(`Loading routes for plugin ${instance.manifest.name}`);

      for (const route of instance.manifest.routes) {
        await this.registerRoute(instance.id, route);
      }

      this.logger.log(`Loaded ${instance.manifest.routes.length} routes for ${instance.manifest.name}`);
      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load routes for ${instance.manifest.name}: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Unregister all routes for a plugin
   */
  async unloadPluginRoutes(pluginId: string): Promise<void> {
    this.logger.log(`Unloading routes for plugin ${pluginId}`);

    // Find all routes for this plugin
    const routesToRemove: string[] = [];
    for (const [key, route] of this.registeredRoutes) {
      if (route.pluginId === pluginId) {
        routesToRemove.push(key);
      }
    }

    // Remove routes
    for (const key of routesToRemove) {
      this.registeredRoutes.delete(key);
      this.logger.debug(`Unregistered route: ${key}`);
    }

    // Remove controller
    this.pluginControllers.delete(pluginId);
  }

  /**
   * Check if a route is already registered
   */
  isRouteRegistered(path: string, method: string): boolean {
    const key = `${method.toUpperCase()}:${path}`;
    return this.registeredRoutes.has(key);
  }

  /**
   * Get all registered routes
   */
  getRegisteredRoutes(): RegisteredRoute[] {
    return Array.from(this.registeredRoutes.values());
  }

  /**
   * Create a dynamic controller for a plugin route
   */
  private async registerRoute(pluginId: string, route: PluginRoute): Promise<void> {
    const routeKey = `${route.method.toUpperCase()}:${route.path}`;

    // Check for conflicts
    if (this.registeredRoutes.has(routeKey)) {
      const existing = this.registeredRoutes.get(routeKey)!;
      throw new Error(`Route conflict: ${routeKey} is already registered by plugin ${existing.pluginId}`);
    }

    // Create dynamic controller method
    const controller = this.createRouteController(pluginId, route);

    // Store registration
    this.registeredRoutes.set(routeKey, {
      pluginId,
      path: route.path,
      method: route.method,
      handler: route.handler,
      controller,
    });

    this.logger.debug(`Registered route: ${route.method} ${route.path}`);
  }

  /**
   * Create a controller for a plugin route
   */
  private createRouteController(pluginId: string, route: PluginRoute): any {
    // Create a dynamic handler
    const handler = async (...args: any[]) => {
      this.logger.debug(`Executing route ${route.method} ${route.path} for plugin ${pluginId}`);
      
      try {
        // Extract request data from args
        const req = args.find(arg => arg && typeof arg === 'object' && 'body' in arg);
        const body = req?.body;
        const params = args.find(arg => arg && typeof arg === 'object' && 'id' in arg);
        const query = args.find(arg => arg && typeof arg === 'object' && !('body' in arg) && !('id' in arg));

        // Call plugin handler
        const result = await this.executePluginHandler(pluginId, route.handler, {
          body,
          params,
          query,
          headers: req?.headers,
        });

        return {
          success: true,
          data: result,
        };

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Route execution failed: ${message}`);
        
        return {
          success: false,
          error: {
            code: 'ROUTE_EXECUTION_FAILED',
            message,
          },
        };
      }
    };

    // Apply decorators based on HTTP method
    const decoratedHandler = this.applyHttpMethodDecorator(handler, route.method, route.path);

    return decoratedHandler;
  }

  /**
   * Apply HTTP method decorator to handler
   */
  private applyHttpMethodDecorator(handler: any, method: string, path: string): any {
    // Store metadata for dynamic routing
    Reflect.defineMetadata('plugin:route:method', method, handler);
    Reflect.defineMetadata('plugin:route:path', path, handler);
    Reflect.defineMetadata('plugin:route:handler', true, handler);
    
    return handler;
  }

  /**
   * Execute plugin route handler
   */
  private async executePluginHandler(
    pluginId: string,
    handlerName: string,
    context: {
      body?: any;
      params?: any;
      query?: any;
      headers?: any;
    },
  ): Promise<any> {
    // Get plugin instance
    const pluginController = this.pluginControllers.get(pluginId);
    if (!pluginController) {
      throw new Error(`Plugin controller not found: ${pluginId}`);
    }

    // Get handler method
    const handler = pluginController[handlerName];
    if (typeof handler !== 'function') {
      throw new Error(`Handler ${handlerName} not found in plugin ${pluginId}`);
    }

    // Execute with context
    return await handler.call(pluginController, context);
  }

  /**
   * Load plugin controller module
   */
  async loadPluginController(instance: PluginInstance): Promise<void> {
    if (!instance.manifest.entry.backend) {
      return;
    }

    try {
      this.logger.debug(`Loading controller from ${instance.installPath}/${instance.manifest.entry.backend}`);
      
      // Dynamic import of plugin controller
      const controllerPath = `${instance.installPath}/${instance.manifest.entry.backend}`;
      const module = await import(controllerPath);
      
      // Find controller class
      const ControllerClass = module.default || Object.values(module).find((exp: any) => 
        typeof exp === 'function' && exp.prototype
      );

      if (!ControllerClass) {
        throw new Error(`No controller found in ${controllerPath}`);
      }

      // Instantiate controller
      const controller = new (ControllerClass as any)();
      this.pluginControllers.set(instance.id, controller);

      this.logger.debug(`Loaded controller for plugin ${instance.manifest.name}`);

    } catch (error) {
      this.logger.error(`Failed to load controller for ${instance.manifest.name}: ${error}`);
      throw error;
    }
  }

  /**
   * Unload plugin controller
   */
  unloadPluginController(pluginId: string): void {
    this.pluginControllers.delete(pluginId);
    this.logger.debug(`Unloaded controller for plugin ${pluginId}`);
  }
}
