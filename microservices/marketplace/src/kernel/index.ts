/**
 * KERNEL EXPORTS
 * 
 * Public API for the kernel system.
 */

// Core
export { Kernel } from './core/kernel';
export { KernelModule } from './kernel.module';
export { BaseModule } from './core/base-module';

// Services
export { ModuleRegistry } from './core/module-registry';
export type { MenuNode } from './core/module-registry';
export { EventBus } from './core/event-bus';
export type { EventStats } from './core/event-bus';
export { PermissionSystem, PermissionDeniedError } from './core/permission-system';
export { ConfigService } from './core/config-service';
export { KernelLogger } from './core/kernel-logger';
export { QueueService } from './core/queue-service';
export type { QueueStats } from './core/queue-service';
export { TenantService, WithTenant, getTenantPrisma } from './core/tenant-service';
export { WorkflowEngine } from './core/workflow-engine';
export type {
  Workflow,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowAction,
  WorkflowExecution,
  WorkflowContext,
  ActionResult,
  ActionHandler,
} from './core/workflow-engine';

// Contracts
export * from './contracts/module.contract';
