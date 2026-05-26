/**
 * Marketplace Module
 * 
 * Complete plugin marketplace and ecosystem management system.
 * 
 * Features:
 * - Plugin upload and staging
 * - Validation and security scanning
 * - Installation and lifecycle management
 * - Plugin registry and discovery
 * - Observability and diagnostics
 */

import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './services/marketplace.service';

// Import plugin system components
import {
  PluginRuntime,
  PluginInstaller,
  PluginRegistry,
  PluginValidator,
  PluginStorage,
  PluginLifecycleManager,
  PluginSecurityManager,
  PluginDiagnostics,
  PluginEventBus,
  PluginCircuitBreaker,
  PluginTenantGuard,
  PluginMemoryGuard,
} from '../../kernel/plugins';

import {
  PluginRouteLoader,
  PluginUILoader,
} from '../../kernel/plugins/loader';

@Module({
  controllers: [MarketplaceController],
  providers: [
    // Marketplace Services
    MarketplaceService,
    
    // Plugin Runtime System
    PluginRuntime,
    PluginInstaller,
    PluginRegistry,
    PluginValidator,
    PluginStorage,
    PluginLifecycleManager,
    PluginSecurityManager,
    PluginDiagnostics,
    PluginEventBus,
    
    // Isolation & Hardening
    PluginCircuitBreaker,
    PluginTenantGuard,
    PluginMemoryGuard,
    
    // Dynamic Loaders
    PluginRouteLoader,
    PluginUILoader,
  ],
  exports: [
    MarketplaceService,
    PluginInstaller,
    PluginRegistry,
    PluginRouteLoader,
    PluginUILoader,
  ],
})
export class MarketplaceModule {}
