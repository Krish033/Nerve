/**
 * Plugin Security Manager
 * 
 * Provides foundational security architecture for plugins:
 * - Permission validation
 * - Capability checking
 * - Route restrictions
 * - API access control
 * - Tenant-aware plugin execution
 * - Sandbox preparation
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  PluginManifest,
  PluginPermission,
  ValidatedPluginManifest,
} from '../contracts';

interface SecurityValidationResult {
  allowed: boolean;
  reason?: string;
  violations: string[];
}

interface CapabilityCheck {
  resource: string;
  action: string;
  context?: {
    tenantId?: string;
    userId?: string;
    pluginId?: string;
  };
}

interface SecurityPolicy {
  maxPermissionsPerPlugin: number;
  maxRoutesPerPlugin: number;
  forbiddenRoutes: string[];
  forbiddenModules: string[];
  requirePermissionDescription: boolean;
  sandboxRequired: boolean;
}

const DEFAULT_POLICY: SecurityPolicy = {
  maxPermissionsPerPlugin: 50,
  maxRoutesPerPlugin: 100,
  forbiddenRoutes: [
    '/api/admin',
    '/api/system',
    '/api/kernel',
    '/health',
    '/metrics',
    '/ready',
    '/live',
  ],
  forbiddenModules: [
    'child_process',
    'cluster',
    'dgram',
    'dns',
    'fs',
    'net',
    'os',
    'path',
    'process',
    'repl',
    'tls',
    'v8',
    'vm',
    'worker_threads',
  ],
  requirePermissionDescription: true,
  sandboxRequired: true,
};

@Injectable()
export class PluginSecurityManager {
  private readonly logger = new Logger(PluginSecurityManager.name);
  private readonly policy: SecurityPolicy;
  private readonly pluginCapabilities = new Map<string, Set<string>>();

  constructor() {
    this.policy = DEFAULT_POLICY;
  }

  /**
   * Validate plugin security before installation
   */
  async validatePlugin(manifest: PluginManifest): Promise<SecurityValidationResult> {
    const violations: string[] = [];

    this.logger.debug(`Validating security for plugin ${manifest.name}`);

    // 1. Check permission limits
    if (manifest.permissions.length > this.policy.maxPermissionsPerPlugin) {
      violations.push(
        `Plugin has ${manifest.permissions.length} permissions, maximum is ${this.policy.maxPermissionsPerPlugin}`,
      );
    }

    // 2. Check route limits
    if (manifest.routes.length > this.policy.maxRoutesPerPlugin) {
      violations.push(
        `Plugin has ${manifest.routes.length} routes, maximum is ${this.policy.maxRoutesPerPlugin}`,
      );
    }

    // 3. Validate permission descriptions
    if (this.policy.requirePermissionDescription) {
      for (const perm of manifest.permissions) {
        if (!perm.description) {
          violations.push(`Permission ${perm.resource} lacks description`);
        }
      }
    }

    // 4. Check for forbidden routes
    for (const route of manifest.routes) {
      for (const forbidden of this.policy.forbiddenRoutes) {
        if (route.path.startsWith(forbidden)) {
          violations.push(`Route ${route.path} uses forbidden path prefix ${forbidden}`);
        }
      }
    }

    // 5. Check sandbox settings
    if (this.policy.sandboxRequired && !manifest.sandbox?.enabled) {
      violations.push('Plugin must enable sandbox mode');
    }

    // 6. Validate sandbox modules
    if (manifest.sandbox?.allowedModules) {
      for (const mod of manifest.sandbox.allowedModules) {
        if (this.policy.forbiddenModules.includes(mod)) {
          violations.push(`Plugin requests forbidden module: ${mod}`);
        }
      }
    }

    // 7. Check for suspicious patterns in routes
    for (const route of manifest.routes) {
      if (this.containsSuspiciousPattern(route.path)) {
        violations.push(`Route ${route.path} contains suspicious pattern`);
      }
    }

    // Return result
    if (violations.length > 0) {
      return {
        allowed: false,
        reason: `Security violations detected: ${violations.join(', ')}`,
        violations,
      };
    }

    // Register capabilities for this plugin
    this.registerCapabilities(manifest);

    return {
      allowed: true,
      violations: [],
    };
  }

  /**
   * Check if a plugin has a specific capability
   */
  hasCapability(pluginId: string, check: CapabilityCheck): boolean {
    const capabilities = this.pluginCapabilities.get(pluginId);
    if (!capabilities) return false;

    const capabilityKey = `${check.resource}:${check.action}`;
    
    // Check for exact match
    if (capabilities.has(capabilityKey)) return true;

    // Check for wildcard admin permission
    if (capabilities.has(`${check.resource}:admin`)) return true;
    if (capabilities.has('*:admin')) return true;

    return false;
  }

  /**
   * Validate plugin can access a route
   */
  canAccessRoute(pluginId: string, routePath: string, method: string): boolean {
    // Check for forbidden routes
    for (const forbidden of this.policy.forbiddenRoutes) {
      if (routePath.startsWith(forbidden)) {
        return false;
      }
    }

    // Additional route-specific checks can be added here
    return true;
  }

  /**
   * Check if plugin can use a specific module
   */
  canUseModule(pluginId: string, moduleName: string): boolean {
    return !this.policy.forbiddenModules.includes(moduleName);
  }

  /**
   * Get plugin capabilities
   */
  getPluginCapabilities(pluginId: string): string[] {
    const caps = this.pluginCapabilities.get(pluginId);
    return caps ? Array.from(caps) : [];
  }

  /**
   * Revoke all capabilities for a plugin
   */
  revokeCapabilities(pluginId: string): void {
    this.pluginCapabilities.delete(pluginId);
    this.logger.debug(`Revoked capabilities for plugin ${pluginId}`);
  }

  /**
   * Generate security report for a plugin
   */
  generateSecurityReport(pluginId: string): {
    capabilities: string[];
    sandboxEnabled: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const capabilities = this.getPluginCapabilities(pluginId);
    
    // Determine risk level based on capabilities
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    if (capabilities.some(c => c.includes(':admin'))) {
      riskLevel = 'high';
    } else if (capabilities.some(c => c.includes(':delete'))) {
      riskLevel = 'medium';
    }

    return {
      capabilities,
      sandboxEnabled: true, // Would be actual value from manifest
      riskLevel,
    };
  }

  /**
   * Validate API call from plugin
   */
  validateApiCall(
    pluginId: string,
    apiName: string,
    params: Record<string, unknown>,
  ): { allowed: boolean; reason?: string } {
    // Check if plugin has permission to use this API
    const hasPermission = this.hasCapability(pluginId, {
      resource: 'api',
      action: 'execute',
    });

    if (!hasPermission) {
      return {
        allowed: false,
        reason: `Plugin ${pluginId} does not have API execution permission`,
      };
    }

    // Additional API-specific validation
    const sanitizedParams = this.sanitizeApiParams(params);
    if (Object.keys(sanitizedParams).length !== Object.keys(params).length) {
      return {
        allowed: false,
        reason: 'API parameters contain invalid values',
      };
    }

    return { allowed: true };
  }

  // Private helpers

  private registerCapabilities(manifest: PluginManifest): void {
    const capabilities = new Set<string>();

    for (const perm of manifest.permissions) {
      for (const action of perm.actions) {
        capabilities.add(`${perm.resource}:${action}`);
      }
    }

    this.pluginCapabilities.set(manifest.name, capabilities);
    this.logger.debug(`Registered ${capabilities.size} capabilities for ${manifest.name}`);
  }

  private containsSuspiciousPattern(path: string): boolean {
    const suspiciousPatterns = [
      /\.\./,              // Path traversal
      /[<>"'`]/,           // Injection characters
      /\/\//,             // Double slashes
      /\*$/,              // Wildcard at end
      /\/\./,             // Hidden paths
    ];

    return suspiciousPatterns.some(pattern => pattern.test(path));
  }

  private sanitizeApiParams(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      // Skip keys with suspicious patterns
      if (this.containsSuspiciousPattern(key)) {
        continue;
      }

      // Sanitize string values
      if (typeof value === 'string') {
        // Remove potential script tags
        const clean = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        sanitized[key] = clean;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
