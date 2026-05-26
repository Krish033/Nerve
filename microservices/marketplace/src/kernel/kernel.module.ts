/**
 * KERNEL MODULE
 * 
 * NestJS module that provides the core kernel infrastructure.
 */

import { Module, Global } from '@nestjs/common';
import { Kernel } from './core/kernel';
import { ModuleRegistry } from './core/module-registry';
import { EventBus } from './core/event-bus';
import { PermissionSystem } from './core/permission-system';
import { ConfigService } from './core/config-service';
import { KernelLogger } from './core/kernel-logger';
import { QueueService } from './core/queue-service';
import { TenantService } from './core/tenant-service';
import { WorkflowEngine } from './core/workflow-engine';

@Global() // Make kernel available everywhere
@Module({
  providers: [
    // Core kernel
    Kernel,
    
    // Kernel services
    ModuleRegistry,
    EventBus,
    PermissionSystem,
    ConfigService,
    KernelLogger,
    QueueService,
    TenantService,
    WorkflowEngine,
  ],
  exports: [
    // Export kernel for use by modules
    Kernel,
    // Export services for direct use
    ModuleRegistry,
    EventBus,
    PermissionSystem,
    ConfigService,
    KernelLogger,
    QueueService,
    TenantService,
    WorkflowEngine,
  ],
})
export class KernelModule {}
