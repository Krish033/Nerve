/**
 * PERMISSION SYSTEM
 * 
 * Enterprise-grade RBAC with tenant isolation.
 * Every action goes through: can(user, action, resource)
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IPermissionSystem,
  IKernel,
  UserContext,
  ResourceContext,
  PermissionDefinition,
} from '../contracts/module.contract';

// Permission cache for performance
interface PermissionCache {
  userId: string;
  permissions: Set<string>;
  tenantId?: string;
  expiresAt: number;
}

@Injectable()
export class PermissionSystem implements IPermissionSystem {
  private readonly logger = new Logger(PermissionSystem.name);
  private kernel: IKernel | undefined;
  private permissions = new Map<string, PermissionDefinition>();
  private rolePermissions = new Map<string, string[]>();
  private cache = new Map<string, PermissionCache>();

  // Configuration
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  setKernel(kernel: IKernel): void {
    this.kernel = kernel;
  }

  async initialize(): Promise<void> {
    // Register core permissions
    this.registerCorePermissions();
    this.logger.log('Permission system initialized');
  }

  /**
   * Check if user can perform action on resource
   */
  async can(
    user: UserContext,
    action: string,
    resource: ResourceContext,
  ): Promise<boolean> {
    // Super admin check
    if (user.roles?.includes('superadmin')) {
      return true;
    }

    // Tenant isolation check
    if (resource.tenantId && user.tenantId !== resource.tenantId) {
      return false;
    }

    // Resource ownership check
    if (resource.ownerId && resource.ownerId === user.id) {
      return true;
    }

    // Get user permissions (cached)
    const userPermissions = await this.getPermissions(user);

    // Check if user has the exact permission
    if (userPermissions.includes(action)) {
      return true;
    }

    // Check wildcard permissions (e.g., "module:*")
    const parts = action.split(':');
    for (let i = parts.length - 1; i > 0; i--) {
      const wildcard = [...parts.slice(0, i), '*'].join(':');
      if (userPermissions.includes(wildcard)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Synchronous permission check (for guards)
   */
  canSync(user: UserContext, action: string, resource: ResourceContext): boolean {
    // Fire-and-forget async check
    this.can(user, action, resource).catch((error) => {
      this.logger.error('Permission check failed', error);
    });

    // Return cached result immediately
    const userPermissions = this.getCachedPermissions(user);
    return userPermissions.has(action);
  }

  /**
   * Get all permissions for a user
   */
  async getPermissions(user: UserContext): Promise<string[]> {
    const cacheKey = this.buildCacheKey(user);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return Array.from(cached.permissions);
    }

    // Build permissions from roles and direct grants
    const permissions = new Set<string>();

    // Add role-based permissions
    if (user.roles) {
      for (const role of user.roles) {
        const rolePerms = this.rolePermissions.get(role) || [];
        for (const perm of rolePerms) {
          permissions.add(perm);
        }
      }
    }

    // Add direct permissions
    if (user.permissions) {
      for (const perm of user.permissions) {
        permissions.add(perm);
      }
    }

    // Cache result
    this.cache.set(cacheKey, {
      userId: user.id,
      permissions,
      tenantId: user.tenantId,
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    return Array.from(permissions);
  }

  /**
   * Register a permission
   */
  registerPermission(permission: PermissionDefinition): void {
    this.permissions.set(permission.id, permission);
    this.logger.debug(`Registered permission: ${permission.id}`);
  }

  /**
   * Get all registered permissions
   */
  getAllPermissions(): PermissionDefinition[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get permissions for a module
   */
  getPermissionsByModule(moduleId: string): PermissionDefinition[] {
    return this.getAllPermissions().filter((p) => p.module === moduleId);
  }

  /**
   * Define a role with permissions
   */
  defineRole(role: string, permissions: string[]): void {
    this.rolePermissions.set(role, permissions);
    this.logger.debug(`Defined role ${role} with ${permissions.length} permissions`);
  }

  /**
   * Grant permission to user (for runtime permission changes)
   */
  async grantPermission(
    userId: string,
    permission: string,
    tenantId?: string,
  ): Promise<void> {
    // Invalidate cache
    const cacheKey = this.buildCacheKey({ id: userId, tenantId });
    this.cache.delete(cacheKey);

    this.logger.debug(`Granted permission ${permission} to user ${userId}`);
  }

  /**
   * Revoke permission from user
   */
  async revokePermission(
    userId: string,
    permission: string,
    tenantId?: string,
  ): Promise<void> {
    // Invalidate cache
    const cacheKey = this.buildCacheKey({ id: userId, tenantId });
    this.cache.delete(cacheKey);

    this.logger.debug(`Revoked permission ${permission} from user ${userId}`);
  }

  /**
   * Clear permission cache for user
   */
  clearCache(userId?: string): void {
    if (userId) {
      for (const [key, cache] of this.cache) {
        if (cache.userId === userId) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Create permission guard for route/API
   */
  createGuard(requiredPermission: string) {
    return async (user: UserContext, resource: ResourceContext) => {
      const allowed = await this.can(user, requiredPermission, resource);
      if (!allowed) {
        throw new PermissionDeniedError(requiredPermission, user.id);
      }
    };
  }

  // Private methods

  private registerCorePermissions(): void {
    // Core system permissions
    const corePerms: PermissionDefinition[] = [
      { id: 'system:*', name: 'System Admin', description: 'Full system access' },
      { id: 'system:read', name: 'System Read', description: 'Read system configuration' },
      { id: 'system:write', name: 'System Write', description: 'Modify system configuration' },
      { id: 'modules:*', name: 'Module Admin', description: 'Full module management' },
      { id: 'modules:read', name: 'Module Read', description: 'View modules' },
      { id: 'modules:install', name: 'Module Install', description: 'Install modules' },
      { id: 'modules:uninstall', name: 'Module Uninstall', description: 'Uninstall modules' },
      { id: 'users:*', name: 'User Admin', description: 'Full user management' },
      { id: 'users:read', name: 'User Read', description: 'View users' },
      { id: 'users:write', name: 'User Write', description: 'Create/modify users' },
      { id: 'tenants:*', name: 'Tenant Admin', description: 'Full tenant management' },
      { id: 'tenants:read', name: 'Tenant Read', description: 'View tenant data' },
      { id: 'workflows:*', name: 'Workflow Admin', description: 'Full workflow management' },
      { id: 'workflows:read', name: 'Workflow Read', description: 'View workflows' },
      { id: 'workflows:execute', name: 'Workflow Execute', description: 'Execute workflows' },
    ];

    for (const perm of corePerms) {
      this.registerPermission(perm);
    }

    // Define default roles
    this.defineRole('superadmin', ['system:*', 'modules:*', 'users:*', 'tenants:*', 'workflows:*']);
    this.defineRole('admin', ['modules:read', 'modules:install', 'users:read', 'users:write', 'workflows:*']);
    this.defineRole('user', ['modules:read', 'workflows:read', 'workflows:execute']);
    this.defineRole('readonly', ['modules:read', 'workflows:read']);
  }

  private getCachedPermissions(user: UserContext): Set<string> {
    const cacheKey = this.buildCacheKey(user);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    return new Set();
  }

  private buildCacheKey(user: UserContext): string {
    return `${user.id}:${user.tenantId || 'global'}`;
  }
}

/**
 * Permission Denied Error
 */
export class PermissionDeniedError extends Error {
  constructor(
    public readonly permission: string,
    public readonly userId: string,
  ) {
    super(`Permission denied: ${permission}`);
    this.name = 'PermissionDeniedError';
  }
}
