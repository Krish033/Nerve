/**
 * KERNEL MODULE
 * 
 * NestJS module that provides the core kernel infrastructure.
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Kernel } from './core/kernel';
import { ModuleRegistry } from './core/module-registry';
import { EventBus } from './core/event-bus';
import { EventBusRedis } from './core/event-bus-redis';
import { PermissionSystem } from './core/permission-system';
import { PermissionGuard, RoleGuard, TenantGuard, PermissionMiddleware } from './core/permission-guard';
import { ConfigService } from './core/config-service';
import { KernelLogger } from './core/kernel-logger';
import { QueueService } from './core/queue-service';
import { QueueServiceRedis } from './core/queue-service-redis';
import { TenantService } from './core/tenant-service';
import { WorkflowEngine } from './core/workflow-engine';
import { ModuleLoader } from './core/module-loader';

// Environment-based service selection
const useRedis = process.env.USE_REDIS === 'true' || process.env.REDIS_URL !== undefined;

@Global() // Make kernel available everywhere
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  providers: [
    // Core kernel
    Kernel,

    // Kernel services - Core implementations
    ModuleRegistry,
    PermissionSystem,
    ConfigService,
    KernelLogger,
    TenantService,
    WorkflowEngine,

    // Event Bus - Use Redis if configured, otherwise in-memory
    {
      provide: 'IEventBus',
      useClass: useRedis ? EventBusRedis : EventBus,
    },
    useRedis ? EventBusRedis : EventBus,

    // Queue Service - Use Redis if configured, otherwise in-memory
    {
      provide: 'IQueueService',
      useClass: useRedis ? QueueServiceRedis : QueueService,
    },
    useRedis ? QueueServiceRedis : QueueService,

    // Module Loader
    ModuleLoader,

    // Permission Guards
    PermissionGuard,
    RoleGuard,
    TenantGuard,
    PermissionMiddleware,
  ],
  exports: [
    // Export kernel for use by modules
    Kernel,
    // Export services for direct use
    ModuleRegistry,
    useRedis ? EventBusRedis : EventBus,
    PermissionSystem,
    ConfigService,
    KernelLogger,
    useRedis ? QueueServiceRedis : QueueService,
    TenantService,
    WorkflowEngine,
    ModuleLoader,
    PermissionGuard,
    RoleGuard,
    TenantGuard,
    PermissionMiddleware,
  ],
})
export class KernelModule {}
