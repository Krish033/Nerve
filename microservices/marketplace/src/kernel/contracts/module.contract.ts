/**
 * KERNEL MODULE CONTRACTS
 * 
 * These contracts define the interface between the kernel and all modules.
 * Every module must implement these contracts to participate in the platform.
 */

/**
 * Module Manifest - The declaration file every module must provide
 */
export interface ModuleManifest {
  /** Unique module identifier (e.g., "crm", "scraper", "analytics") */
  id: string;

  /** Human-readable name */
  name: string;

  /** Module description */
  description: string;

  /** Module version (semver) */
  version: string;

  /** Module author/publisher */
  author?: string;

  /** Module icon (for UI) */
  icon?: string;

  /** Whether module is enabled by default */
  enabledByDefault?: boolean;

  /** Module dependencies (other module IDs) */
  dependencies?: string[];

  /** Required permissions this module needs */
  requiredPermissions?: string[];

  /** Menu items this module registers */
  menus?: MenuRegistration[];

  /** Routes this module registers */
  routes?: RouteRegistration[];

  /** Widgets this module provides */
  widgets?: WidgetRegistration[];

  /** API endpoints this module exposes */
  apis?: ApiRegistration[];

  /** Events this module emits */
  events?: EventDefinition[];

  /** Workflows this module provides */
  workflows?: WorkflowRegistration[];

  /** Database migrations (file paths or sql) */
  migrations?: string[];

  /** Feature flags this module uses */
  featureFlags?: string[];

  /** Permissions this module requires or provides */
  permissions?: string[];

  /** Module settings schema and defaults */
  settings?: Record<string, any>;
}

/**
 * Menu Registration
 */
export interface MenuRegistration {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  parent?: string;
  order?: number;
  permissions?: string[];
  featureFlag?: string;
}

/**
 * Route Registration
 */
export interface RouteRegistration {
  id: string;
  path: string;
  component: string;
  layout?: string;
  permissions?: string[];
  isDefault?: boolean;
}

/**
 * Widget Registration
 */
export interface WidgetRegistration {
  id: string;
  name: string;
  description: string;
  component: string;
  category: 'dashboard' | 'sidebar' | 'page' | 'modal';
  permissions?: string[];
  defaultConfig?: Record<string, any>;
}

/**
 * API Registration
 */
export interface ApiRegistration {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: string;
  permissions?: string[];
  rateLimit?: RateLimitConfig;
}

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

/**
 * Event Definition
 */
export interface EventDefinition {
  name: string;
  description: string;
  payload: EventPayloadSchema;
}

/**
 * Event Payload Schema (simplified - can use Zod/JSON Schema)
 */
export type EventPayloadSchema = Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>;

/**
 * Workflow Registration
 */
export interface WorkflowRegistration {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  actions: string[];
}

/**
 * Module Interface - Runtime contract
 */
export interface IModule {
  /** Module manifest */
  readonly manifest: ModuleManifest;

  /** Initialize module - called by kernel on startup */
  initialize(kernel: IKernel): Promise<void>;

  /** Shutdown module - called by kernel on shutdown */
  shutdown(): Promise<void>;

  /** Health check - called by kernel monitoring */
  healthCheck(): Promise<HealthStatus>;
}

/**
 * Kernel Interface - Core orchestration contract
 */
export interface IKernel {
  /** Module registry */
  readonly modules: IModuleRegistry;

  /** Event bus */
  readonly events: IEventBus;

  /** Permission system */
  readonly permissions: IPermissionSystem;

  /** Configuration */
  readonly config: IConfigService;

  /** Logger */
  readonly logger: IKernelLogger;

  /** Queue system */
  readonly queue: IQueueService;

  /** Tenant context */
  readonly tenant: ITenantService;

  /** Register a module */
  registerModule(module: IModule): Promise<void>;

  /** Unregister a module */
  unregisterModule(moduleId: string): Promise<void>;

  /** Get module by ID */
  getModule<T extends IModule>(moduleId: string): T | undefined;

  /** Health check for kernel and all modules */
  healthCheck(): Promise<HealthStatus>;
}

/**
 * Module Registry Interface
 */
export interface IModuleRegistry {
  /** Get all registered modules */
  getAll(): IModule[];

  /** Get module by ID */
  get(moduleId: string): IModule | undefined;

  /** Check if module exists */
  has(moduleId: string): boolean;

  /** Get enabled modules */
  getEnabled(): IModule[];

  /** Get modules by category */
  getByCategory(category: string): IModule[];

  /** Register menu for tenant */
  registerMenuForTenant(moduleId: string, menu: MenuRegistration, tenantId?: string): void;

  /** Register route for tenant */
  registerRouteForTenant(moduleId: string, route: RouteRegistration, tenantId?: string): void;

  /** Register widget for tenant */
  registerWidgetForTenant(moduleId: string, widget: WidgetRegistration, tenantId?: string): void;

  /** Build navigation tree for UI */
  buildNavigationTree(tenantId?: string, userPermissions?: string[]): MenuNode[];
}

/**
 * Menu Node for navigation tree
 */
export interface MenuNode {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  order: number;
  children: MenuNode[];
}

/**
 * Event Bus Interface
 */
export interface IEventBus {
  /** Emit an event */
  emit<T = any>(event: string, payload: T, metadata?: EventMetadata): Promise<void>;

  /** Subscribe to an event */
  on<T = any>(event: string, handler: EventHandler<T>): Subscription;

  /** Subscribe once */
  once<T = any>(event: string, handler: EventHandler<T>): Subscription;

  /** Unsubscribe */
  off(subscription: Subscription): void;

  /** Wait for event (async) */
  waitFor<T = any>(event: string, timeout?: number): Promise<T>;
}

/**
 * Event Handler Type
 */
export type EventHandler<T> = (payload: T, metadata: EventMetadata) => void | Promise<void>;

/**
 * Event Metadata
 */
export interface EventMetadata {
  eventId: string;
  timestamp: number;
  tenantId?: string;
  userId?: string;
  moduleId?: string;
  correlationId?: string;
}

/**
 * Subscription Handle
 */
export interface Subscription {
  unsubscribe(): void;
}

/**
 * Permission System Interface
 */
export interface IPermissionSystem {
  /** Check if user can perform action */
  can(user: UserContext, action: string, resource: ResourceContext): boolean | Promise<boolean>;

  /** Get user permissions */
  getPermissions(user: UserContext): string[] | Promise<string[]>;

  /** Register permission */
  registerPermission(permission: PermissionDefinition): void;

  /** Get all registered permissions */
  getAllPermissions(): PermissionDefinition[];
}

/**
 * User Context for Permissions
 */
export interface UserContext {
  id: string;
  tenantId?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Resource Context for Permissions
 */
export interface ResourceContext {
  type: string;
  id?: string;
  tenantId?: string;
  ownerId?: string;
}

/**
 * Permission Definition
 */
export interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  module?: string;
}

/**
 * Config Service Interface
 */
export interface IConfigService {
  get<T = any>(key: string, defaultValue?: T): T | undefined;
  set<T = any>(key: string, value: T): void;
  has(key: string): boolean;
  getModuleConfig(moduleId: string): Record<string, any>;
}

/**
 * Kernel Logger Interface
 */
export interface IKernelLogger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
  audit(action: string, userId: string, resource: string, details?: Record<string, any>): void;
}

/**
 * Queue Service Interface
 */
export interface IQueueService {
  /** Add job to queue */
  add<T = any>(queue: string, job: JobDefinition<T>, options?: JobOptions): Promise<JobId>;

  /** Process jobs from queue */
  process<T = any>(queue: string, handler: JobHandler<T>): void;

  /** Get job status */
  getJobStatus(jobId: JobId): Promise<JobStatus>;

  /** Cancel job */
  cancelJob(jobId: JobId): Promise<boolean>;

  /** Get all queue statistics */
  getAllStats?(): Promise<QueueStats[]>;

  /** Start queue processing */
  start(): Promise<void>;

  /** Stop queue processing */
  stop(): Promise<void>;

  /** Check if queue service is healthy */
  isHealthy(): Promise<boolean>;
}

/**
 * Job Definition
 */
export interface JobDefinition<T = any> {
  name: string;
  data: T;
  moduleId?: string;
}

/**
 * Job Options
 */
export interface JobOptions {
  delay?: number;
  attempts?: number;
  backoff?: 'fixed' | 'exponential';
  priority?: number;
  tenantId?: string;
}

/**
 * Job Handler
 */
export type JobHandler<T> = (job: JobContext<T>) => Promise<void>;

/**
 * Job Context
 */
export interface JobContext<T> {
  id: JobId;
  name: string;
  data: T;
  attempts: number;
  tenantId?: string;
  progress(progress: number): Promise<void>;
}

/**
 * Job ID Type
 */
export type JobId = string;

/**
 * Job Status
 */
export interface JobStatus {
  id: JobId;
  state: 'pending' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  attempts: number;
  error?: string;
}

export interface QueueStats {
  name: string;
  pending: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

/**
 * Tenant Service Interface
 */
export interface ITenantService {
  /** Get current tenant context */
  getCurrentContext(): TenantContext | undefined;

  /** Set tenant context (for async operations) */
  setContext(tenantId: string): void;

  /** Clear context */
  clearContext(): void;

  /** Check if tenant exists */
  exists(tenantId: string): Promise<boolean>;

  /** Create tenant */
  createTenant(tenant: TenantDefinition): Promise<TenantContext>;

  /** Get tenant config */
  getTenantConfig(tenantId: string): Promise<Record<string, any>>;
}

/**
 * Tenant Context
 */
export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  config?: Record<string, any>;
  features?: string[];
  plan?: string;
}

/**
 * Tenant Definition
 */
export interface TenantDefinition {
  name: string;
  slug: string;
  plan?: string;
  config?: Record<string, any>;
}

/**
 * Health Status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  checks?: Record<string, boolean>;
  timestamp: number;
}

/**
 * Event Statistics
 */
export interface EventStats {
  totalEvents: number;
  activeSubscriptions: number;
  eventsByType: Record<string, number>;
  queueSize: number;
}

/**
 * Module Activation Context
 */
export interface ModuleActivationContext {
  tenantId?: string;
  userId?: string;
  config?: Record<string, any>;
}
