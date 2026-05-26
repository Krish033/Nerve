/**
 * Plugin Management Module
 * 
 * NestJS module for the plugin runtime system.
 */

import { Module } from '@nestjs/common';
import { PluginsController } from './plugins.controller';
import { PluginRuntime } from '../kernel/plugins/runtime/plugin-runtime';
import { PluginRegistry } from '../kernel/plugins/registry/plugin-registry';
import { PluginValidator } from '../kernel/plugins/validator/plugin-validator';
import { PluginLifecycleManager } from '../kernel/plugins/lifecycle/plugin-lifecycle';
import { PluginStorage } from '../kernel/plugins/storage/plugin-storage';
import { PluginDiagnostics } from '../kernel/plugins/diagnostics/plugin-diagnostics';
import { PluginEventBus } from '../kernel/plugins/events/plugin-event-bus';
import { PluginSecurityManager } from '../kernel/plugins/permissions/plugin-security';

@Module({
  controllers: [PluginsController],
  providers: [
    PluginRuntime,
    PluginRegistry,
    PluginValidator,
    PluginLifecycleManager,
    PluginStorage,
    PluginDiagnostics,
    PluginEventBus,
    PluginSecurityManager,
  ],
  exports: [
    PluginRuntime,
    PluginRegistry,
    PluginValidator,
    PluginDiagnostics,
    PluginSecurityManager,
  ],
})
export class PluginsModule {}
