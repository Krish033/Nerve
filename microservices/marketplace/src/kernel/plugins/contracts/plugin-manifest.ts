/**
 * Plugin Manifest Contract System
 * 
 * Defines the standardized plugin package structure for the Nurve platform.
 * All plugins MUST conform to this manifest specification.
 */

export type PluginType = 
  | 'api-plugin' 
  | 'ui-plugin' 
  | 'workflow-plugin'
  | 'ai-plugin'
  | 'worker-plugin'
  | 'integration-plugin'
  | 'theme-plugin';

export type PluginState =
  | 'INSTALLED'
  | 'ENABLED'
  | 'DISABLED'
  | 'FAILED'
  | 'UPDATING'
  | 'INVALID'
  | 'BROKEN';

export interface PluginPermission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete' | 'execute' | 'admin')[];
  description?: string;
}

export interface PluginRoute {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  handler: string;
  permissions?: string[];
  middleware?: string[];
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface PluginMenu {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  parent?: string;
  order?: number;
  permissions?: string[];
}

export interface PluginWidget {
  id: string;
  name: string;
  type: 'dashboard' | 'sidebar' | 'modal' | 'page';
  entry: string;
  permissions?: string[];
  config?: Record<string, unknown>;
}

export interface PluginEvent {
  name: string;
  description?: string;
  payloadSchema?: Record<string, unknown>;
}

export interface PluginQueue {
  name: string;
  concurrency: number;
  handler: string;
  maxAttempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

export interface PluginDependency {
  name: string;
  version: string;
  optional?: boolean;
}

export interface PluginSetting {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'secret';
  label: string;
  description?: string;
  default?: unknown;
  required?: boolean;
  encrypted?: boolean;
}

export interface PluginHealthCheck {
  name: string;
  endpoint?: string;
  interval?: number;
  timeout?: number;
  critical?: boolean;
}

export interface PluginLifecycleHooks {
  onInstall?: string;
  onEnable?: string;
  onDisable?: string;
  onUpdate?: string;
  onUninstall?: string;
  onHealthCheck?: string;
}

export interface PluginCompatibility {
  platform: string;
  minVersion: string;
  maxVersion?: string;
  deprecated?: boolean;
  breakingChanges?: string[];
}

export interface PluginResourceLimits {
  memory?: string;
  cpu?: string;
  storage?: string;
  maxWorkers?: number;
  maxQueueJobs?: number;
  maxEventsPerSecond?: number;
}

/**
 * Core Plugin Manifest Schema
 * 
 * This is the authoritative contract that all plugins must follow.
 */
export interface PluginManifest {
  // Core Identity
  name: string;
  displayName: string;
  version: string;
  type: PluginType;
  
  // Metadata
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  
  // Entry Points
  entry: {
    backend?: string;
    frontend?: string;
  };
  
  // State
  enabled: boolean;
  autoEnable?: boolean;
  
  // Permissions
  permissions: PluginPermission[];
  
  // Routes
  routes: PluginRoute[];
  
  // UI Integration
  menus: PluginMenu[];
  widgets: PluginWidget[];
  
  // Event System
  events: {
    emits: PluginEvent[];
    subscribes: PluginEvent[];
  };
  
  // Queue Workers
  queues: PluginQueue[];
  
  // Dependencies
  dependencies: PluginDependency[];
  
  // Settings
  settings: PluginSetting[];
  
  // Health Monitoring
  healthChecks: PluginHealthCheck[];
  
  // Lifecycle
  lifecycle: PluginLifecycleHooks;
  
  // Compatibility
  compatibility: PluginCompatibility;
  
  // Resource Management
  resourceLimits: PluginResourceLimits;
  
  // Security
  sandbox?: {
    enabled: boolean;
    allowedModules?: string[];
    forbiddenModules?: string[];
    networkAccess?: boolean;
    fileSystemAccess?: boolean;
  };
  
  // Additional metadata for future extensibility
  metadata?: Record<string, unknown>;
}

/**
 * Validated Plugin Manifest
 * Used internally after validation passes
 */
export interface ValidatedPluginManifest extends PluginManifest {
  _validated: true;
  _validatedAt: Date;
  _hash: string;
}

/**
 * Plugin Installation Package Structure
 */
export interface PluginPackage {
  manifest: PluginManifest;
  files: {
    backend?: string[];
    frontend?: string[];
    assets?: string[];
    migrations?: string[];
  };
  checksum: string;
}

/**
 * Plugin Runtime Instance
 */
export interface PluginInstance {
  id: string;
  manifest: ValidatedPluginManifest;
  state: PluginState;
  
  // Runtime Info
  installedAt: Date;
  enabledAt?: Date;
  lastUpdatedAt?: Date;
  
  // Paths
  installPath: string;
  backendPath?: string;
  frontendPath?: string;
  
  // State History
  stateHistory: {
    state: PluginState;
    timestamp: Date;
    reason?: string;
  }[];
  
  // Runtime References
  backendModule?: unknown;
  workers?: string[];
  eventSubscriptions?: string[];
  routeHandlers?: string[];
  
  // Diagnostics
  healthStatus?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastHealthCheck?: Date;
  failureCount: number;
  lastFailure?: {
    timestamp: Date;
    error: string;
    context?: string;
  };
}

/**
 * Plugin Operation Result
 */
export interface PluginOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  warnings?: string[];
}

/**
 * Plugin Installation Request
 */
export interface PluginInstallationRequest {
  source: 'upload' | 'marketplace' | 'git' | 'registry';
  packageData?: Buffer;
  marketplaceId?: string;
  gitUrl?: string;
  version?: string;
  force?: boolean;
  skipValidation?: boolean;
}

/**
 * Plugin Installation Result
 */
export interface PluginInstallationResult {
  pluginId: string;
  manifest: PluginManifest;
  state: PluginState;
  installedAt: Date;
  logs: string[];
  warnings?: string[];
}

/**
 * Manifest Validation Error
 */
export interface ManifestValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Plugin Validation Result
 */
export interface PluginValidationResult {
  valid: boolean;
  manifest?: ValidatedPluginManifest;
  errors: ManifestValidationError[];
  warnings: string[];
}
