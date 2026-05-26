/**
 * Plugin Validation Engine
 * 
 * Strict validation system for plugin manifests and packages.
 * Prevents unsafe, corrupt, or incompatible plugins from entering the system.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  PluginManifest,
  ValidatedPluginManifest,
  PluginValidationResult,
  ManifestValidationError,
  PluginType,
} from '../contracts';

interface ValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  validate?: (value: unknown) => boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: string[];
}

const PLUGIN_TYPES: PluginType[] = [
  'api-plugin',
  'ui-plugin',
  'workflow-plugin',
  'ai-plugin',
  'worker-plugin',
  'integration-plugin',
  'theme-plugin',
];

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;

const RESERVED_NAMES = [
  'core',
  'kernel',
  'system',
  'internal',
  'admin',
  'auth',
  'security',
  'database',
  'prisma',
  'nestjs',
  'plugin',
  'runtime',
];

const FORBIDDEN_MODULES = [
  'child_process',
  'cluster',
  'dgram',
  'dns',
  'net',
  'repl',
  'tls',
  'v8',
  'vm',
  'worker_threads',
];

@Injectable()
export class PluginValidator {
  private readonly logger = new Logger(PluginValidator.name);
  private readonly validationRules: ValidationRule[];
  private readonly platformVersion: string;

  constructor() {
    this.platformVersion = '1.0.0'; // Should be loaded from config
    
    this.validationRules = [
      { field: 'name', required: true, type: 'string', minLength: 3, maxLength: 64, pattern: /^[a-z0-9-]+$/ },
      { field: 'displayName', required: true, type: 'string', minLength: 1, maxLength: 128 },
      { field: 'version', required: true, type: 'string', pattern: SEMVER_PATTERN },
      { field: 'type', required: true, type: 'string', allowedValues: PLUGIN_TYPES },
      { field: 'description', required: false, type: 'string', maxLength: 500 },
      { field: 'author', required: false, type: 'string', maxLength: 128 },
      { field: 'license', required: false, type: 'string', maxLength: 32 },
      { field: 'homepage', required: false, type: 'string' },
      { field: 'repository', required: false, type: 'string' },
      { field: 'entry', required: true, type: 'object' },
      { field: 'enabled', required: true, type: 'boolean' },
      { field: 'permissions', required: true, type: 'array' },
      { field: 'routes', required: true, type: 'array' },
      { field: 'menus', required: true, type: 'array' },
      { field: 'widgets', required: true, type: 'array' },
      { field: 'events', required: true, type: 'object' },
      { field: 'queues', required: true, type: 'array' },
      { field: 'dependencies', required: true, type: 'array' },
      { field: 'settings', required: true, type: 'array' },
      { field: 'healthChecks', required: true, type: 'array' },
      { field: 'lifecycle', required: true, type: 'object' },
      { field: 'compatibility', required: true, type: 'object' },
      { field: 'resourceLimits', required: true, type: 'object' },
    ];
  }

  /**
   * Validate a complete plugin manifest
   */
  async validateManifest(manifest: PluginManifest): Promise<PluginValidationResult> {
    const errors: ManifestValidationError[] = [];
    const warnings: string[] = [];

    this.logger.debug(`Validating manifest: ${manifest.name}@${manifest.version}`);

    // 1. Validate required fields
    for (const rule of this.validationRules) {
      const value = (manifest as any)[rule.field];
      
      if (rule.required && (value === undefined || value === null)) {
        errors.push({
          field: rule.field,
          code: 'REQUIRED_FIELD_MISSING',
          message: `Required field '${rule.field}' is missing`,
          severity: 'error',
        });
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type check
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push({
            field: rule.field,
            code: 'TYPE_MISMATCH',
            message: `Field '${rule.field}' should be ${rule.type}, got ${actualType}`,
            severity: 'error',
          });
          continue;
        }

        // String validations
        if (rule.type === 'string' && typeof value === 'string') {
          if (rule.minLength && value.length < rule.minLength) {
            errors.push({
              field: rule.field,
              code: 'MIN_LENGTH_VIOLATION',
              message: `Field '${rule.field}' must be at least ${rule.minLength} characters`,
              severity: 'error',
            });
          }

          if (rule.maxLength && value.length > rule.maxLength) {
            errors.push({
              field: rule.field,
              code: 'MAX_LENGTH_VIOLATION',
              message: `Field '${rule.field}' must be at most ${rule.maxLength} characters`,
              severity: 'error',
            });
          }

          if (rule.pattern && !rule.pattern.test(value)) {
            errors.push({
              field: rule.field,
              code: 'PATTERN_MISMATCH',
              message: `Field '${rule.field}' does not match required pattern`,
              severity: 'error',
            });
          }

          if (rule.allowedValues && !rule.allowedValues.includes(value)) {
            errors.push({
              field: rule.field,
              code: 'INVALID_VALUE',
              message: `Field '${rule.field}' must be one of: ${rule.allowedValues.join(', ')}`,
              severity: 'error',
            });
          }
        }

        // Custom validation
        if (rule.validate && !rule.validate(value)) {
          errors.push({
            field: rule.field,
            code: 'CUSTOM_VALIDATION_FAILED',
            message: `Field '${rule.field}' failed custom validation`,
            severity: 'error',
          });
        }
      }
    }

    // 2. Validate reserved names
    if (RESERVED_NAMES.includes(manifest.name.toLowerCase())) {
      errors.push({
        field: 'name',
        code: 'RESERVED_NAME',
        message: `Plugin name '${manifest.name}' is reserved`,
        severity: 'error',
      });
    }

    // 3. Validate routes
    const routeErrors = this.validateRoutes(manifest.routes);
    errors.push(...routeErrors);

    // 4. Validate permissions
    const permissionErrors = this.validatePermissions(manifest.permissions);
    errors.push(...permissionErrors);

    // 5. Validate dependencies
    const dependencyErrors = await this.validateDependencies(manifest.dependencies);
    errors.push(...dependencyErrors);

    // 6. Validate events
    const eventWarnings = this.validateEvents(manifest.events);
    warnings.push(...eventWarnings);

    // 7. Validate queues
    const queueErrors = this.validateQueues(manifest.queues);
    errors.push(...queueErrors);

    // 8. Validate compatibility
    const compatErrors = this.validateCompatibility(manifest.compatibility);
    errors.push(...compatErrors);

    // 9. Security validations
    const securityErrors = this.validateSecuritySettings(manifest);
    errors.push(...securityErrors);

    // 10. Validate resource limits
    if (manifest.resourceLimits) {
      const resourceWarnings = this.validateResourceLimits(manifest.resourceLimits);
      warnings.push(...resourceWarnings);
    }

    // Return result
    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        warnings,
      };
    }

    // Create validated manifest
    const validatedManifest: ValidatedPluginManifest = {
      ...manifest,
      _validated: true,
      _validatedAt: new Date(),
      _hash: await this.computeManifestHash(manifest),
    };

    return {
      valid: true,
      manifest: validatedManifest,
      errors: [],
      warnings,
    };
  }

  /**
   * Check plugin compatibility with platform
   */
  async checkCompatibility(manifest: PluginManifest): Promise<{ compatible: boolean; reason?: string }> {
    const compat = manifest.compatibility;
    
    if (!compat) {
      return { compatible: false, reason: 'Missing compatibility information' };
    }

    // Check platform
    if (compat.platform && compat.platform !== 'nurve') {
      return { compatible: false, reason: `Unsupported platform: ${compat.platform}` };
    }

    // Check version compatibility
    if (compat.minVersion) {
      const minVersion = this.parseVersion(compat.minVersion);
      const currentVersion = this.parseVersion(this.platformVersion);
      
      if (!this.isVersionCompatible(currentVersion, minVersion)) {
        return {
          compatible: false,
          reason: `Platform version ${this.platformVersion} is below minimum required ${compat.minVersion}`,
        };
      }
    }

    if (compat.maxVersion) {
      const maxVersion = this.parseVersion(compat.maxVersion);
      const currentVersion = this.parseVersion(this.platformVersion);
      
      if (!this.isVersionCompatible(maxVersion, currentVersion)) {
        return {
          compatible: false,
          reason: `Platform version ${this.platformVersion} exceeds maximum supported ${compat.maxVersion}`,
        };
      }
    }

    // Check if deprecated
    if (compat.deprecated) {
      return { compatible: false, reason: 'Plugin version is deprecated' };
    }

    return { compatible: true };
  }

  /**
   * Validate package structure
   */
  async validatePackageStructure(extractPath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check for manifest
      const manifestPath = path.join(extractPath, 'manifest.json');
      try {
        await fs.access(manifestPath);
      } catch {
        return { valid: false, error: 'Missing manifest.json' };
      }

      // Validate required directories exist if entry points specified
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      if (manifest.entry?.backend) {
        const backendPath = path.join(extractPath, manifest.entry.backend);
        try {
          await fs.access(backendPath);
        } catch {
          return { valid: false, error: `Missing backend entry: ${manifest.entry.backend}` };
        }
      }

      if (manifest.entry?.frontend) {
        const frontendPath = path.join(extractPath, manifest.entry.frontend);
        try {
          await fs.access(frontendPath);
        } catch {
          return { valid: false, error: `Missing frontend entry: ${manifest.entry.frontend}` };
        }
      }

      // Check for suspicious files
      const forbiddenFiles = ['.exe', '.dll', '.so', '.dylib', '.bin'];
      const files = await this.listAllFiles(extractPath);
      
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (forbiddenFiles.includes(ext)) {
          return { valid: false, error: `Forbidden file type detected: ${file}` };
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Package structure validation failed',
      };
    }
  }

  // Private validation helpers

  private validateRoutes(routes: any[]): ManifestValidationError[] {
    const errors: ManifestValidationError[] = [];
    const seenPaths = new Set<string>();

    for (const route of routes) {
      // Validate required fields
      if (!route.path || typeof route.path !== 'string') {
        errors.push({
          field: 'routes',
          code: 'INVALID_ROUTE_PATH',
          message: 'Route path is required and must be a string',
          severity: 'error',
        });
        continue;
      }

      if (!route.method || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method)) {
        errors.push({
          field: 'routes',
          code: 'INVALID_ROUTE_METHOD',
          message: `Invalid route method: ${route.method}`,
          severity: 'error',
        });
      }

      // Check for path conflicts
      const pathKey = `${route.method}:${route.path}`;
      if (seenPaths.has(pathKey)) {
        errors.push({
          field: 'routes',
          code: 'DUPLICATE_ROUTE',
          message: `Duplicate route: ${route.method} ${route.path}`,
          severity: 'error',
        });
      }
      seenPaths.add(pathKey);

      // Validate path format
      if (!route.path.startsWith('/')) {
        errors.push({
          field: 'routes',
          code: 'INVALID_PATH_FORMAT',
          message: `Route path must start with /: ${route.path}`,
          severity: 'error',
        });
      }

      // Check for forbidden paths
      const forbiddenPaths = ['/api/admin', '/api/system', '/api/kernel', '/health', '/metrics'];
      if (forbiddenPaths.some(fp => route.path.startsWith(fp))) {
        errors.push({
          field: 'routes',
          code: 'FORBIDDEN_PATH',
          message: `Route path is reserved: ${route.path}`,
          severity: 'error',
        });
      }
    }

    return errors;
  }

  private validatePermissions(permissions: any[]): ManifestValidationError[] {
    const errors: ManifestValidationError[] = [];

    for (const perm of permissions) {
      if (!perm.resource || typeof perm.resource !== 'string') {
        errors.push({
          field: 'permissions',
          code: 'INVALID_PERMISSION_RESOURCE',
          message: 'Permission resource is required',
          severity: 'error',
        });
      }

      if (!perm.actions || !Array.isArray(perm.actions) || perm.actions.length === 0) {
        errors.push({
          field: 'permissions',
          code: 'INVALID_PERMISSION_ACTIONS',
          message: 'Permission actions must be a non-empty array',
          severity: 'error',
        });
      } else {
        const validActions = ['create', 'read', 'update', 'delete', 'execute', 'admin'];
        for (const action of perm.actions) {
          if (!validActions.includes(action)) {
            errors.push({
              field: 'permissions',
              code: 'INVALID_PERMISSION_ACTION',
              message: `Invalid permission action: ${action}`,
              severity: 'error',
            });
          }
        }
      }
    }

    return errors;
  }

  private async validateDependencies(dependencies: any[]): Promise<ManifestValidationError[]> {
    const errors: ManifestValidationError[] = [];

    for (const dep of dependencies) {
      if (!dep.name || typeof dep.name !== 'string') {
        errors.push({
          field: 'dependencies',
          code: 'INVALID_DEPENDENCY_NAME',
          message: 'Dependency name is required',
          severity: 'error',
        });
      }

      if (!dep.version || typeof dep.version !== 'string') {
        errors.push({
          field: 'dependencies',
          code: 'INVALID_DEPENDENCY_VERSION',
          message: 'Dependency version is required',
          severity: 'error',
        });
      } else if (!SEMVER_PATTERN.test(dep.version) && !dep.version.startsWith('^') && !dep.version.startsWith('~')) {
        errors.push({
          field: 'dependencies',
          code: 'INVALID_DEPENDENCY_VERSION_FORMAT',
          message: `Invalid dependency version format: ${dep.version}`,
          severity: 'warning',
        });
      }
    }

    return errors;
  }

  private validateEvents(events: any): string[] {
    const warnings: string[] = [];

    if (!events) return warnings;

    if (events.emits) {
      for (const event of events.emits) {
        if (!event.name || typeof event.name !== 'string') {
          warnings.push(`Event emission missing name`);
        }
      }
    }

    if (events.subscribes) {
      for (const event of events.subscribes) {
        if (!event.name || typeof event.name !== 'string') {
          warnings.push(`Event subscription missing name`);
        }
      }
    }

    return warnings;
  }

  private validateQueues(queues: any[]): ManifestValidationError[] {
    const errors: ManifestValidationError[] = [];

    for (const queue of queues) {
      if (!queue.name || typeof queue.name !== 'string') {
        errors.push({
          field: 'queues',
          code: 'INVALID_QUEUE_NAME',
          message: 'Queue name is required',
          severity: 'error',
        });
      }

      if (queue.concurrency !== undefined && (typeof queue.concurrency !== 'number' || queue.concurrency < 1)) {
        errors.push({
          field: 'queues',
          code: 'INVALID_QUEUE_CONCURRENCY',
          message: 'Queue concurrency must be a positive number',
          severity: 'error',
        });
      }

      if (queue.maxAttempts !== undefined && (typeof queue.maxAttempts !== 'number' || queue.maxAttempts < 1)) {
        errors.push({
          field: 'queues',
          code: 'INVALID_QUEUE_MAX_ATTEMPTS',
          message: 'Queue maxAttempts must be a positive number',
          severity: 'error',
        });
      }
    }

    return errors;
  }

  private validateCompatibility(compatibility: any): ManifestValidationError[] {
    const errors: ManifestValidationError[] = [];

    if (!compatibility) {
      errors.push({
        field: 'compatibility',
        code: 'MISSING_COMPATIBILITY',
        message: 'Compatibility information is required',
        severity: 'error',
      });
      return errors;
    }

    if (!compatibility.platform) {
      errors.push({
        field: 'compatibility.platform',
        code: 'MISSING_PLATFORM',
        message: 'Platform compatibility is required',
        severity: 'error',
      });
    }

    if (!compatibility.minVersion) {
      errors.push({
        field: 'compatibility.minVersion',
        code: 'MISSING_MIN_VERSION',
        message: 'Minimum version compatibility is required',
        severity: 'warning',
      });
    }

    return errors;
  }

  private validateSecuritySettings(manifest: PluginManifest): ManifestValidationError[] {
    const errors: ManifestValidationError[] = [];

    // Check sandbox settings
    if (manifest.sandbox) {
      if (manifest.sandbox.allowedModules) {
        for (const mod of manifest.sandbox.allowedModules) {
          if (FORBIDDEN_MODULES.includes(mod)) {
            errors.push({
              field: 'sandbox.allowedModules',
              code: 'FORBIDDEN_MODULE',
              message: `Module '${mod}' is forbidden for security reasons`,
              severity: 'error',
            });
          }
        }
      }
    }

    return errors;
  }

  private validateResourceLimits(limits: any): string[] {
    const warnings: string[] = [];

    if (limits.memory) {
      const memoryRegex = /^(\d+)(Mi|Gi|Ki|Ti)?$/;
      if (!memoryRegex.test(limits.memory)) {
        warnings.push(`Invalid memory format: ${limits.memory}`);
      }
    }

    if (limits.cpu) {
      const cpuRegex = /^(\d+(\.\d+)?)(m)?$/;
      if (!cpuRegex.test(limits.cpu)) {
        warnings.push(`Invalid CPU format: ${limits.cpu}`);
      }
    }

    return warnings;
  }

  private async computeManifestHash(manifest: PluginManifest): Promise<string> {
    // Simple hash computation - in production, use crypto
    const content = JSON.stringify(manifest);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.replace(/^[~^]/, '').split('.');
    return {
      major: parseInt(parts[0], 10) || 0,
      minor: parseInt(parts[1], 10) || 0,
      patch: parseInt(parts[2], 10) || 0,
    };
  }

  private isVersionCompatible(current: { major: number; minor: number; patch: number }, required: { major: number; minor: number; patch: number }): boolean {
    if (current.major > required.major) return true;
    if (current.major < required.major) return false;
    if (current.minor > required.minor) return true;
    if (current.minor < required.minor) return false;
    return current.patch >= required.patch;
  }

  private async listAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this.listAllFiles(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }
}
