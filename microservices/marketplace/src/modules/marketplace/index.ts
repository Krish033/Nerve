/**
 * Marketplace Module Public API
 * 
 * Export all marketplace types and services for external use.
 */

// Services
export { MarketplaceService } from './services/marketplace.service';

// Controller
export { MarketplaceController } from './marketplace.controller';

// Module
export { MarketplaceModule } from './marketplace.module';

// Types
export type {
  PluginUploadSession,
  PluginStagedPackage,
  PluginValidationReport,
  PluginSecurityReport,
  SecurityViolation,
  MarketplaceUploadResult,
  MarketplaceStageResult,
  MarketplaceInstallResult,
  PluginListItem,
  PluginDetail,
  PluginActionRequest,
  PluginPermissionRequest,
  PluginInstallHistory,
  MarketplaceStats,
} from './types/marketplace.types';
