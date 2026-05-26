/**
 * Marketplace Types
 * 
 * Type definitions for the plugin marketplace system.
 */

import {
  PluginManifest,
  ValidatedPluginManifest,
  PluginPermission,
  ManifestValidationError,
} from '../../../kernel/plugins/contracts';

// Upload & Staging

export interface PluginUploadSession {
  id: string;
  filename: string;
  size: number;
  checksum: string;
  tempPath: string;
  uploadedAt: Date;
  status: 'PENDING_VALIDATION' | 'VALIDATED' | 'STAGED' | 'INSTALL_FAILED' | 'INSTALLED';
  manifest?: ValidatedPluginManifest;
  validationReport?: PluginValidationReport;
  securityReport?: PluginSecurityReport;
  stagedAt?: Date;
  installedAt?: Date;
  installedPluginId?: string;
  installError?: string;
}

export interface PluginStagedPackage {
  id: string;
  filename: string;
  manifest?: ValidatedPluginManifest;
  tempPath: string;
  checksum: string;
  stagedAt: Date;
  status: 'STAGED' | 'INSTALLING' | 'INSTALLED' | 'FAILED';
  permissions: PluginPermission[];
}

// Validation & Security Reports

export interface PluginValidationReport {
  valid: boolean;
  errors: ManifestValidationError[];
  warnings: string[];
  manifest?: ValidatedPluginManifest;
}

export interface PluginSecurityReport {
  allowed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  violations: SecurityViolation[];
  permissions: PluginPermission[];
}

export interface SecurityViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location?: string;
}

// Operation Results

export interface MarketplaceUploadResult {
  success: boolean;
  data?: {
    sessionId: string;
    filename: string;
    size: number;
    checksum: string;
    status: string;
    manifest?: ValidatedPluginManifest;
    validationReport?: PluginValidationReport;
    securityReport?: PluginSecurityReport;
    staged: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface MarketplaceStageResult {
  success: boolean;
  data?: {
    stagedPackageId: string;
    manifest?: ValidatedPluginManifest;
    permissions: PluginPermission[];
    readyForInstall: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface MarketplaceInstallResult {
  success: boolean;
  data?: {
    pluginId: string;
    name: string;
    version: string;
    state: string;
    enabled: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Plugin Management UI

export interface PluginListItem {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description?: string;
  author?: string;
  type: 'extension' | 'integration' | 'theme' | 'workflow' | 'capability';
  state: 'UPLOADED' | 'VALIDATED' | 'STAGED' | 'INSTALLED' | 'ENABLED' | 'DISABLED' | 'FAILED' | 'BROKEN';
  status: string;
  installedAt?: Date;
  enabledAt?: Date;
  updatedAt: Date;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  failureCount: number;
  permissions: string[];
  capabilities: {
    routes: number;
    menus: number;
    widgets: number;
    queues: number;
  };
}

export interface PluginDetail extends PluginListItem {
  manifest: PluginManifest;
  stateHistory: Array<{
    state: string;
    timestamp: Date;
    reason?: string;
  }>;
  installPath?: string;
  lastFailure?: {
    timestamp: Date;
    error: string;
    context?: string;
  };
  diagnostics: {
    logs: string[];
    metrics: {
      operations: number;
      errors: number;
      avgResponseTime: number;
    };
    healthChecks: Array<{
      timestamp: Date;
      healthy: boolean;
      details?: string;
    }>;
  };
}

export interface PluginActionRequest {
  action: 'install' | 'enable' | 'disable' | 'uninstall' | 'retry' | 'view_logs' | 'view_diagnostics';
  pluginId?: string;
  stagedPackageId?: string;
  force?: boolean;
  keepData?: boolean;
}

// Permissions

export interface PluginPermissionRequest {
  pluginId: string;
  pluginName: string;
  permissions: PluginPermission[];
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
}

// Installation History

export interface PluginInstallHistory {
  id: string;
  pluginId: string;
  pluginName: string;
  version: string;
  action: 'install' | 'uninstall' | 'enable' | 'disable' | 'update';
  performedBy: string;
  performedAt: Date;
  success: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

// Stats & Metrics

export interface MarketplaceStats {
  uploads: {
    total: number;
    byStatus: Record<string, number>;
    recentUploads: number;
  };
  plugins: {
    total: number;
    enabled: number;
    disabled: number;
    failed: number;
    byType: Record<string, number>;
  };
  system: {
    totalRoutes: number;
    totalMenus: number;
    totalWidgets: number;
    healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  };
}
