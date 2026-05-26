/**
 * Plugin System Public API
 * 
 * Exports the complete plugin runtime system for platform integration.
 */

// Contracts
export * from './contracts';

// Core Runtime
export { PluginRuntime } from './runtime/plugin-runtime';
export { PluginRuntimeHardened } from './runtime/plugin-runtime-hardened';

// Registry
export { PluginRegistry } from './registry/plugin-registry';

// Validation
export { PluginValidator } from './validator/plugin-validator';

// Lifecycle
export { PluginLifecycleManager } from './lifecycle/plugin-lifecycle';

// Storage
export { PluginStorage } from './storage/plugin-storage';

// Diagnostics
export { PluginDiagnostics } from './diagnostics/plugin-diagnostics';

// Events
export { PluginEventBus } from './events/plugin-event-bus';

// Security
export { PluginSecurityManager } from './permissions/plugin-security';

// Isolation & Hardening
export {
  PluginCircuitBreaker,
  PluginTenantGuard,
  PluginMemoryGuard,
} from './isolation';
