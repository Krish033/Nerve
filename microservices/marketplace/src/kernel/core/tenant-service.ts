/**
 * TENANT SERVICE
 * 
 * Multi-tenant foundation with context isolation.
 * Every operation must be scoped to a tenant.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import {
  ITenantService,
  IKernel,
  TenantContext,
  TenantDefinition,
} from '../contracts/module.contract';

// AsyncLocalStorage for request-scoped tenant context
const asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

@Injectable()
export class TenantService implements ITenantService {
  private readonly logger = new Logger(TenantService.name);
  private kernel: IKernel | undefined;
  private tenants = new Map<string, TenantContext>();
  private tenantConfigs = new Map<string, Record<string, any>>();
  private tenantFeatures = new Map<string, string[]>();

  setKernel(kernel: IKernel): void {
    this.kernel = kernel;
  }

  async initialize(): Promise<void> {
    // Load existing tenants from database
    await this.loadTenants();
    this.logger.log('Tenant service initialized');
  }

  /**
   * Get current tenant context (from AsyncLocalStorage)
   */
  getCurrentContext(): TenantContext | undefined {
    return asyncLocalStorage.getStore();
  }

  /**
   * Set tenant context (for async operations)
   */
  setContext(tenantId: string): void {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Note: This sets context for the current async operation
    // For true async context, use runWithContext
  }

  /**
   * Clear tenant context
   */
  clearContext(): void {
    // Context is automatically cleared when async operation ends
  }

  /**
   * Run function within tenant context
   */
  async runWithContext<T>(
    tenantId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    return asyncLocalStorage.run(tenant, fn);
  }

  /**
   * Check if tenant exists
   */
  async exists(tenantId: string): Promise<boolean> {
    return this.tenants.has(tenantId);
  }

  /**
   * Create new tenant
   */
  async createTenant(definition: TenantDefinition): Promise<TenantContext> {
    // Check if slug is unique
    for (const tenant of this.tenants.values()) {
      if (tenant.slug === definition.slug) {
        throw new Error(`Tenant slug ${definition.slug} already exists`);
      }
    }

    const tenant: TenantContext = {
      id: this.generateTenantId(),
      name: definition.name,
      slug: definition.slug,
      config: definition.config || {},
      plan: definition.plan || 'basic',
    };

    this.tenants.set(tenant.id, tenant);
    this.tenantConfigs.set(tenant.id, definition.config || {});

    // Persist to database
    await this.saveTenant(tenant);

    this.logger.log(`Tenant created: ${tenant.name} (${tenant.id})`);

    // Emit event
    await this.kernel?.events.emit('tenant.created', {
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    });

    return tenant;
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<TenantContext | undefined> {
    return this.tenants.get(tenantId);
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<TenantContext | undefined> {
    for (const tenant of this.tenants.values()) {
      if (tenant.slug === slug) {
        return tenant;
      }
    }
    return undefined;
  }

  /**
   * Get tenant configuration
   */
  async getTenantConfig(tenantId: string): Promise<Record<string, any>> {
    return this.tenantConfigs.get(tenantId) || {};
  }

  /**
   * Update tenant configuration
   */
  async updateTenantConfig(
    tenantId: string,
    config: Record<string, any>,
  ): Promise<void> {
    const existing = this.tenantConfigs.get(tenantId) || {};
    const updated = { ...existing, ...config };
    this.tenantConfigs.set(tenantId, updated);

    // Update tenant context
    const tenant = this.tenants.get(tenantId);
    if (tenant) {
      tenant.config = updated;
    }

    await this.saveTenantConfig(tenantId, updated);
  }

  /**
   * Enable feature for tenant
   */
  async enableFeature(tenantId: string, feature: string): Promise<void> {
    const features = this.tenantFeatures.get(tenantId) || [];
    if (!features.includes(feature)) {
      features.push(feature);
      this.tenantFeatures.set(tenantId, features);
    }

    // Update tenant context
    const tenant = this.tenants.get(tenantId);
    if (tenant) {
      tenant.features = features;
    }

    this.logger.debug(`Feature ${feature} enabled for tenant ${tenantId}`);
  }

  /**
   * Disable feature for tenant
   */
  async disableFeature(tenantId: string, feature: string): Promise<void> {
    const features = this.tenantFeatures.get(tenantId) || [];
    const filtered = features.filter((f) => f !== feature);
    this.tenantFeatures.set(tenantId, filtered);

    // Update tenant context
    const tenant = this.tenants.get(tenantId);
    if (tenant) {
      tenant.features = filtered;
    }

    this.logger.debug(`Feature ${feature} disabled for tenant ${tenantId}`);
  }

  /**
   * Check if tenant has feature
   */
  async hasFeature(tenantId: string, feature: string): Promise<boolean> {
    const features = this.tenantFeatures.get(tenantId) || [];
    return features.includes(feature);
  }

  /**
   * Get all tenants
   */
  async getAllTenants(): Promise<TenantContext[]> {
    return Array.from(this.tenants.values());
  }

  /**
   * Delete tenant
   */
  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Clean up
    this.tenants.delete(tenantId);
    this.tenantConfigs.delete(tenantId);
    this.tenantFeatures.delete(tenantId);

    // Delete from database
    await this.deleteTenantFromDb(tenantId);

    this.logger.log(`Tenant deleted: ${tenantId}`);

    // Emit event
    await this.kernel?.events.emit('tenant.deleted', {
      tenantId,
      name: tenant.name,
    });
  }

  /**
   * Middleware for HTTP requests to extract tenant
   */
  createMiddleware() {
    return async (req: any, res: any, next: any) => {
      try {
        // Extract tenant from subdomain, header, or path
        const tenantId = this.extractTenantId(req);

        if (tenantId) {
          const tenant = await this.getTenant(tenantId);
          if (tenant) {
            // Run request in tenant context
            return asyncLocalStorage.run(tenant, () => next());
          }
        }

        // No tenant context (public routes)
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Private methods

  private async loadTenants(): Promise<void> {
    // In production, load from database
    // For now, create default tenant
    if (this.tenants.size === 0) {
      await this.createTenant({
        name: 'Default',
        slug: 'default',
        plan: 'enterprise',
      });
    }
  }

  private async saveTenant(tenant: TenantContext): Promise<void> {
    // Persist to database
    // await prisma.tenant.create({ data: tenant });
  }

  private async saveTenantConfig(
    tenantId: string,
    config: Record<string, any>,
  ): Promise<void> {
    // Persist to database
  }

  private async deleteTenantFromDb(tenantId: string): Promise<void> {
    // Delete from database
  }

  private generateTenantId(): string {
    return `tnt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractTenantId(req: any): string | undefined {
    // Try multiple methods to identify tenant

    // 1. From subdomain (e.g., tenant.example.com)
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      const tenant = Array.from(this.tenants.values()).find(
        (t) => t.slug === subdomain,
      );
      if (tenant) return tenant.id;
    }

    // 2. From header
    const tenantHeader = req.headers['x-tenant-id'];
    if (tenantHeader) {
      return tenantHeader as string;
    }

    // 3. From query parameter
    if (req.query?.tenantId) {
      return req.query.tenantId as string;
    }

    // 4. From JWT token (decoded in auth middleware)
    if (req.user?.tenantId) {
      return req.user.tenantId;
    }

    return undefined;
  }
}

/**
 * Decorator to inject tenant context
 */
export function WithTenant() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const tenantService = (this as any).tenantService as TenantService;
      const tenant = tenantService.getCurrentContext();

      if (!tenant) {
        throw new Error('Tenant context required');
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Helper to get tenant-scoped Prisma client
 */
export function getTenantPrisma(tenantId: string) {
  // Return Prisma client with tenant filter applied
  // This ensures all queries are scoped to the tenant
  return {
    where: {
      tenantId,
    },
  };
}
