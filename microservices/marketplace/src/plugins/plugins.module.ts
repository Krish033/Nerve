/**
 * Plugin Management Module
 * 
 * Complete plugin installation and runtime system for the Nurve platform.
 * Supports marketplace, module ecosystem, and API capability platform.
 */

import { Module } from '@nestjs/common';
import { PluginsController } from './plugins.controller';

// Core Runtime
import { PluginRuntime } from '../kernel/plugins/runtime/plugin-runtime';
import { PluginRuntimeHardened } from '../kernel/plugins/runtime/plugin-runtime-hardened';

// Registry & Validation
import { PluginRegistry } from '../kernel/plugins/registry/plugin-registry';
import { PluginValidator } from '../kernel/plugins/validator/plugin-validator';

// Lifecycle & Storage
import { PluginLifecycleManager } from '../kernel/plugins/lifecycle/plugin-lifecycle';
import { PluginStorage } from '../kernel/plugins/storage/plugin-storage';

// Observability & Events
import { PluginDiagnostics } from '../kernel/plugins/diagnostics/plugin-diagnostics';
import { PluginEventBus } from '../kernel/plugins/events/plugin-event-bus';

// Security & Isolation
import { PluginSecurityManager } from '../kernel/plugins/permissions/plugin-security';
import { PluginCircuitBreaker } from '../kernel/plugins/isolation/plugin-circuit-breaker';
import { PluginTenantGuard } from '../kernel/plugins/isolation/plugin-tenant-guard';
import { PluginMemoryGuard } from '../kernel/plugins/isolation/plugin-memory-guard';

// Installation System
import { PluginInstaller } from '../kernel/plugins/installer/plugin-installer';

// Dynamic Loaders
import { PluginRouteLoader, PluginUILoader } from '../kernel/plugins/loader';

@Module({
  controllers: [PluginsController],
  providers: [
    // Core Runtime
    PluginRuntime,
    PluginRuntimeHardened,
    
    // Registry & Validation
    PluginRegistry,
    PluginValidator,
    
    // Lifecycle & Storage
    PluginLifecycleManager,
    PluginStorage,
    
    // Observability & Events
    PluginDiagnostics,
    PluginEventBus,
    
    // Security & Isolation
    PluginSecurityManager,
    PluginCircuitBreaker,
    PluginTenantGuard,
    PluginMemoryGuard,
    
    // Installation System
    PluginInstaller,
    
    // Dynamic Loaders
    PluginRouteLoader,
    PluginUILoader,
  ],
  exports: [
    // Primary APIs
    PluginRuntime,
    PluginRuntimeHardened,
    PluginInstaller,
    
    // Registry & Validation
    PluginRegistry,
    PluginValidator,
    
    // Observability
    PluginDiagnostics,
    
    // Security
    PluginSecurityManager,
    
    // Dynamic Loaders
    PluginRouteLoader,
    PluginUILoader,
  ],
})
export class PluginsModule {}
