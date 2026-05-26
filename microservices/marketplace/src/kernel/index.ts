/**
 * KERNEL EXPORTS
 * 
 * Public API for the kernel system.
 */

// Core
export { Kernel } from './core/kernel';
export { KernelModule } from './kernel.module';
export { BaseModule } from './core/base-module';

// Services - Core
export { ModuleRegistry } from './core/module-registry';
export { EventBus } from './core/event-bus';
export { PermissionSystem, PermissionDeniedError } from './core/permission-system';
export { ConfigService } from './core/config-service';
export { KernelLogger } from './core/kernel-logger';
export { QueueService } from './core/queue-service';
export { TenantService, WithTenant, getTenantPrisma } from './core/tenant-service';
export { WorkflowEngine } from './core/workflow-engine';

// Services - Production Redis Implementations
export { QueueServiceRedis } from './core/queue-service-redis';
export type { QueueStats } from './core/queue-service-redis';
export { EventBusRedis } from './core/event-bus-redis';

// Module Loader
export { ModuleLoader } from './core/module-loader';

// Permission Guards
export {
  PermissionGuard,
  RoleGuard,
  TenantGuard,
  PermissionMiddleware,
  RequirePermissions,
  Resource,
  Roles,
  Public,
} from './core/permission-guard';

// Contracts
export * from './contracts/module.contract';
