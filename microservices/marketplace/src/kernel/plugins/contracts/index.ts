/**
 * Plugin System Contracts
 * 
 * Public API surface for the plugin runtime system.
 */

export * from './plugin-manifest';

// Re-export commonly used types for convenience
export type {
  PluginManifest,
  ValidatedPluginManifest,
  PluginPackage,
  PluginInstance,
  PluginOperationResult,
  PluginInstallationRequest,
  PluginInstallationResult,
  PluginValidationResult,
  ManifestValidationError,
  PluginState,
  PluginType,
  PluginPermission,
  PluginRoute,
  PluginMenu,
  PluginWidget,
  PluginEvent,
  PluginQueue,
  PluginDependency,
  PluginSetting,
  PluginHealthCheck,
  PluginLifecycleHooks,
  PluginCompatibility,
  PluginResourceLimits,
} from './plugin-manifest';
