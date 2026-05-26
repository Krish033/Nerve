/**
 * Marketplace Controller
 * 
 * REST API endpoints for the plugin marketplace system.
 * Handles upload, staging, validation, and installation operations.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MarketplaceService } from './services/marketplace.service';
import { PluginInstaller, PluginRegistry, PluginDiagnostics } from '../../kernel/plugins';
import { PluginRouteLoader, PluginUILoader } from '../../kernel/plugins/loader';

// DTOs
class UploadPackageDto {
  skipValidation?: boolean;
  autoStage?: boolean;
}

class StagePackageDto {
  sessionId: string;
}

class InstallPackageDto {
  stagedPackageId: string;
  autoEnable?: boolean;
}

class PluginActionDto {
  action: 'enable' | 'disable' | 'uninstall' | 'retry';
  force?: boolean;
  keepData?: boolean;
}

@Controller('api/v1/marketplace')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly pluginInstaller: PluginInstaller,
    private readonly pluginRegistry: PluginRegistry,
    private readonly pluginDiagnostics: PluginDiagnostics,
    private readonly routeLoader: PluginRouteLoader,
    private readonly uiLoader: PluginUILoader,
  ) {}

  /**
   * Upload a plugin package
   * 
   * Flow: UPLOAD → TEMP STORAGE → VALIDATION → SECURITY CHECK
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('package'))
  async uploadPackage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadPackageDto,
  ) {
    if (!file) {
      return {
        success: false,
        error: {
          code: 'NO_PACKAGE',
          message: 'No plugin package uploaded',
        },
      };
    }

    this.logger.log(`Marketplace upload: ${file.originalname}`);

    const result = await this.marketplaceService.uploadPackage(file.buffer, file.originalname, {
      skipValidation: body.skipValidation,
      autoStage: body.autoStage,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: result.data,
      message: `Package uploaded successfully. Status: ${result.data?.status}`,
    };
  }

  /**
   * Stage a validated package for installation
   */
  @Post('stage/:sessionId')
  async stagePackage(@Param('sessionId') sessionId: string) {
    const result = await this.marketplaceService.stagePackage(sessionId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: result.data,
      message: 'Package staged and ready for installation',
    };
  }

  /**
   * Install a staged package
   */
  @Post('install')
  async installPackage(@Body() body: InstallPackageDto) {
    const result = await this.marketplaceService.installStagedPackage(body.stagedPackageId, {
      autoEnable: body.autoEnable,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: result.data,
      message: `Plugin ${result.data?.name} v${result.data?.version} installed successfully`,
    };
  }

  /**
   * List all staged packages ready for installation
   */
  @Get('staged')
  async listStagedPackages() {
    const packages = await this.marketplaceService.listStagedPackages();

    return {
      success: true,
      data: {
        packages: packages.map(p => ({
          id: p.id,
          filename: p.filename,
          manifest: p.manifest,
          stagedAt: p.stagedAt,
          permissions: p.permissions,
        })),
        total: packages.length,
      },
    };
  }

  /**
   * List upload history
   */
  @Get('uploads')
  async listUploads(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const uploads = await this.marketplaceService.listUploads({
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      success: true,
      data: {
        uploads: uploads.map(u => ({
          sessionId: u.sessionId,
          filename: u.filename,
          size: u.size,
          checksum: u.checksum,
          uploadedAt: u.uploadedAt,
          validated: u.validated,
        })),
        total: uploads.length,
      },
    };
  }

  /**
   * Delete an upload/staged package
   */
  @Delete('uploads/:sessionId')
  async deleteUpload(@Param('sessionId') sessionId: string) {
    const result = await this.marketplaceService.deleteUpload(sessionId);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: result.error || 'Failed to delete upload',
        },
      };
    }

    return {
      success: true,
      message: 'Upload deleted successfully',
    };
  }

  /**
   * Get upload statistics
   */
  @Get('stats')
  async getStats() {
    const [uploadStats, plugins] = await Promise.all([
      this.marketplaceService.getUploadStats(),
      this.pluginRegistry.listPlugins(),
    ]);

    const routes = this.routeLoader.getRegisteredRoutes();
    const widgets = this.uiLoader.getWidgets();
    const menus = this.uiLoader.getMenus();

    return {
      success: true,
      data: {
        uploads: uploadStats,
        plugins: {
          total: plugins.length,
          enabled: plugins.filter(p => p.state === 'ENABLED').length,
          disabled: plugins.filter(p => p.state === 'DISABLED').length,
          failed: plugins.filter(p => p.state === 'FAILED' || p.state === 'BROKEN').length,
          byType: this.groupByType(plugins),
        },
        capabilities: {
          totalRoutes: routes.length,
          totalWidgets: widgets.length,
          totalMenus: menus.length,
        },
        system: {
          healthStatus: this.calculateSystemHealth(plugins),
        },
      },
    };
  }

  /**
   * List all installed plugins (full details)
   */
  @Get('plugins')
  async listPlugins(
    @Query('state') state?: string,
    @Query('type') type?: string,
  ) {
    const plugins = await this.pluginRegistry.listPlugins();

    let filtered = plugins;
    if (state) {
      filtered = filtered.filter(p => p.state === state);
    }
    if (type) {
      filtered = filtered.filter(p => p.manifest.type === type);
    }

    return {
      success: true,
      data: {
        plugins: filtered.map(p => ({
          id: p.id,
          name: p.manifest.name,
          displayName: p.manifest.displayName,
          version: p.manifest.version,
          description: p.manifest.description,
          author: p.manifest.author,
          type: p.manifest.type,
          state: p.state,
          installedAt: p.installedAt,
          enabledAt: p.enabledAt,
          updatedAt: p.lastUpdatedAt,
          healthStatus: p.healthStatus,
          failureCount: p.failureCount,
          permissions: p.manifest.permissions.map(perm => perm.resource),
          capabilities: {
            routes: p.manifest.routes.length,
            menus: p.manifest.menus?.length || 0,
            widgets: p.manifest.widgets?.length || 0,
            queues: p.manifest.queues?.length || 0,
          },
        })),
        total: filtered.length,
      },
    };
  }

  /**
   * Get detailed plugin information
   */
  @Get('plugins/:id')
  async getPlugin(@Param('id') pluginId: string) {
    const plugin = await this.pluginRegistry.getPlugin(pluginId);

    if (!plugin) {
      return {
        success: false,
        error: {
          code: 'PLUGIN_NOT_FOUND',
          message: `Plugin ${pluginId} not found`,
        },
      };
    }

    const diagnostics = this.pluginDiagnostics.generateDiagnosticReport(pluginId);
    const diagData = typeof diagnostics === 'object' && diagnostics !== null 
      ? diagnostics as Record<string, any>
      : null;

    return {
      success: true,
      data: {
        id: plugin.id,
        name: plugin.manifest.name,
        displayName: plugin.manifest.displayName,
        version: plugin.manifest.version,
        description: plugin.manifest.description,
        author: plugin.manifest.author,
        type: plugin.manifest.type,
        state: plugin.state,
        installPath: plugin.installPath,
        installedAt: plugin.installedAt,
        enabledAt: plugin.enabledAt,
        updatedAt: plugin.lastUpdatedAt,
        healthStatus: plugin.healthStatus,
        failureCount: plugin.failureCount,
        lastFailure: plugin.lastFailure,
        stateHistory: plugin.stateHistory,
        permissions: plugin.manifest.permissions,
        routes: plugin.manifest.routes,
        menus: plugin.manifest.menus,
        widgets: plugin.manifest.widgets,
        dependencies: plugin.manifest.dependencies,
        diagnostics: diagData
          ? {
              summary: diagData.summary,
              recentOperations: diagData.recentOperations,
              recentErrors: diagData.recentErrors,
            }
          : null,
      },
    };
  }

  /**
   * Perform plugin action (enable/disable/uninstall/retry)
   */
  @Post('plugins/:id/action')
  async pluginAction(
    @Param('id') pluginId: string,
    @Body() body: PluginActionDto,
  ) {
    switch (body.action) {
      case 'enable': {
        const result = await this.pluginInstaller.enablePlugin(pluginId);
        return result.success
          ? { success: true, message: 'Plugin enabled successfully' }
          : { success: false, error: result.error };
      }

      case 'disable': {
        const result = await this.pluginInstaller.disablePlugin(pluginId);
        return result.success
          ? { success: true, message: 'Plugin disabled successfully' }
          : { success: false, error: result.error };
      }

      case 'uninstall': {
        const result = await this.pluginInstaller.uninstallPlugin(pluginId, {
          force: body.force,
          keepData: body.keepData,
        });
        return result.success
          ? { success: true, message: 'Plugin uninstalled successfully' }
          : { success: false, error: result.error };
      }

      case 'retry': {
        // Retry enabling a failed plugin
        const plugin = await this.pluginRegistry.getPlugin(pluginId);
        if (!plugin) {
          return {
            success: false,
            error: { code: 'PLUGIN_NOT_FOUND', message: 'Plugin not found' },
          };
        }
        if (plugin.state !== 'FAILED' && plugin.state !== 'BROKEN') {
          return {
            success: false,
            error: { code: 'INVALID_STATE', message: 'Plugin is not in a failed state' },
          };
        }
        const result = await this.pluginInstaller.enablePlugin(pluginId);
        return result.success
          ? { success: true, message: 'Plugin retry successful' }
          : { success: false, error: result.error };
      }

      default:
        return {
          success: false,
          error: { code: 'INVALID_ACTION', message: `Unknown action: ${body.action}` },
        };
    }
  }

  /**
   * Get plugin logs
   */
  @Get('plugins/:id/logs')
  async getPluginLogs(@Param('id') pluginId: string) {
    // This would query the plugin_logs table
    // For now, return placeholder
    return {
      success: true,
      data: {
        pluginId,
        logs: [],
        message: 'Plugin logs endpoint - implement with PluginLog table',
      },
    };
  }

  /**
   * Get plugin diagnostics
   */
  @Get('plugins/:id/diagnostics')
  async getPluginDiagnostics(@Param('id') pluginId: string) {
    const plugin = await this.pluginRegistry.getPlugin(pluginId);
    if (!plugin) {
      return {
        success: false,
        error: { code: 'PLUGIN_NOT_FOUND', message: 'Plugin not found' },
      };
    }

    const metrics = this.pluginDiagnostics.generateDiagnosticReport(pluginId);

    return {
      success: true,
      data: {
        pluginId,
        pluginName: plugin.manifest.name,
        state: plugin.state,
        healthStatus: plugin.healthStatus,
        failureCount: plugin.failureCount,
        lastFailure: plugin.lastFailure,
        metrics: metrics,
        routes: this.routeLoader.getRegisteredRoutes().filter(r => r.pluginId === pluginId),
        widgets: this.uiLoader.getPluginWidgets(pluginId),
      },
    };
  }

  // Private helpers

  private groupByType(plugins: any[]): Record<string, number> {
    return plugins.reduce((acc, plugin) => {
      const type = plugin.manifest.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateSystemHealth(plugins: any[]): 'healthy' | 'degraded' | 'unhealthy' {
    const failed = plugins.filter(p => p.state === 'FAILED' || p.state === 'BROKEN').length;
    const total = plugins.length;

    if (total === 0) return 'healthy';
    if (failed === 0) return 'healthy';
    if (failed / total > 0.5) return 'unhealthy';
    if (failed / total > 0.2) return 'degraded';
    return 'healthy';
  }
}
