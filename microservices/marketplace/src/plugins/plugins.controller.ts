/**
 * Plugin Management API
 * 
 * RESTful API for plugin lifecycle management:
 * - Upload and install plugins
 * - Enable/disable plugins
 * - Query plugin status and diagnostics
 * - Manage plugin configuration
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PluginRuntime } from '../kernel/plugins/runtime/plugin-runtime';
import { PluginInstaller } from '../kernel/plugins/installer/plugin-installer';
import { PluginRegistry } from '../kernel/plugins/registry/plugin-registry';
import { PluginDiagnostics } from '../kernel/plugins/diagnostics/plugin-diagnostics';
import { PluginSecurityManager } from '../kernel/plugins/permissions/plugin-security';
import { PluginRouteLoader, PluginUILoader } from '../kernel/plugins/loader';
import {
  PluginState,
  PluginInstallationRequest,
  PluginOperationResult,
} from '../kernel/plugins/contracts';

// DTOs
class InstallPluginDto {
  force?: boolean;
  skipValidation?: boolean;
  autoEnable?: boolean;
}

class EnablePluginDto {
  reason?: string;
}

class DisablePluginDto {
  reason?: string;
  graceful?: boolean;
}

class UninstallPluginDto {
  force?: boolean;
  keepData?: boolean;
}

class PluginQueryDto {
  state?: PluginState;
  type?: string;
  page?: number = 1;
  limit?: number = 20;
}

@Controller('api/v1/plugins')
export class PluginsController {
  private readonly logger = new Logger(PluginsController.name);

  constructor(
    private readonly pluginRuntime: PluginRuntime,
    private readonly pluginInstaller: PluginInstaller,
    private readonly pluginRegistry: PluginRegistry,
    private readonly pluginDiagnostics: PluginDiagnostics,
    private readonly pluginSecurity: PluginSecurityManager,
    private readonly routeLoader: PluginRouteLoader,
    private readonly uiLoader: PluginUILoader,
  ) {}

  /**
   * List all installed plugins
   */
  @Get()
  async listPlugins(@Query() query: PluginQueryDto) {
    const plugins = await this.pluginRuntime.listPlugins({
      state: query.state,
      type: query.type,
    });

    const page = query.page || 1;
    const limit = query.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = plugins.slice(start, end);

    return {
      success: true,
      data: {
        plugins: paginated.map(p => ({
          id: p.id,
          name: p.manifest.name,
          displayName: p.manifest.displayName,
          version: p.manifest.version,
          type: p.manifest.type,
          state: p.state,
          installedAt: p.installedAt,
          enabledAt: p.enabledAt,
          healthStatus: p.healthStatus,
        })),
        pagination: {
          page,
          limit,
          total: plugins.length,
          totalPages: Math.ceil(plugins.length / limit),
        },
      },
    };
  }

  /**
   * Get detailed plugin information
   */
  @Get(':id')
  async getPlugin(@Param('id') pluginId: string) {
    const plugin = await this.pluginRuntime.getPlugin(pluginId);

    if (!plugin) {
      return {
        success: false,
        error: {
          code: 'PLUGIN_NOT_FOUND',
          message: `Plugin ${pluginId} not found`,
        },
      };
    }

    return {
      success: true,
      data: {
        id: plugin.id,
        manifest: plugin.manifest,
        state: plugin.state,
        installedAt: plugin.installedAt,
        enabledAt: plugin.enabledAt,
        lastUpdatedAt: plugin.lastUpdatedAt,
        installPath: plugin.installPath,
        stateHistory: plugin.stateHistory,
        healthStatus: plugin.healthStatus,
        failureCount: plugin.failureCount,
        lastFailure: plugin.lastFailure,
      },
    };
  }

  /**
   * Upload and install a plugin
   * 
   * Complete installation pipeline:
   * UPLOAD → TEMP STORAGE → VALIDATION → EXTRACTION → MANIFEST PARSE → 
   * SECURITY CHECK → DEPENDENCY CHECK → REGISTRATION → ACTIVATION
   */
  @Post('install')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('package'))
  async installPlugin(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: InstallPluginDto,
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

    this.logger.log(`Installing plugin from upload: ${file.originalname}`);

    // Use the complete installation pipeline
    const result = await this.pluginInstaller.install(file.buffer, {
      force: body.force,
      skipValidation: body.skipValidation,
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
      data: {
        pluginId: result.data?.pluginId,
        name: result.data?.manifest.name,
        version: result.data?.manifest.version,
        state: result.data?.state,
        installedAt: result.data?.installedAt,
        logs: result.data?.logs,
        warnings: result.data?.warnings,
        message: `Plugin ${result.data?.manifest.name} v${result.data?.manifest.version} installed successfully`,
      },
    };
  }

  /**
   * Enable a plugin
   */
  @Post(':id/enable')
  async enablePlugin(
    @Param('id') pluginId: string,
    @Body() body: EnablePluginDto,
  ) {
    const result = await this.pluginInstaller.enablePlugin(pluginId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: {
        message: 'Plugin enabled successfully',
      },
    };
  }

  /**
   * Disable a plugin
   */
  @Post(':id/disable')
  async disablePlugin(
    @Param('id') pluginId: string,
    @Body() body: DisablePluginDto,
  ) {
    const result = await this.pluginInstaller.disablePlugin(pluginId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: {
        message: 'Plugin disabled successfully',
      },
    };
  }

  /**
   * Uninstall a plugin
   */
  @Delete(':id')
  async uninstallPlugin(
    @Param('id') pluginId: string,
    @Body() body: UninstallPluginDto,
  ) {
    const result = await this.pluginInstaller.uninstallPlugin(pluginId, {
      force: body.force,
      keepData: body.keepData,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: {
        message: 'Plugin uninstalled successfully',
      },
    };
  }

  /**
   * Get plugin diagnostics
   */
  @Get(':id/diagnostics')
  async getPluginDiagnostics(@Param('id') pluginId: string): Promise<any> {
    const plugin = await this.pluginRuntime.getPlugin(pluginId);

    if (!plugin) {
      return {
        success: false,
        error: {
          code: 'PLUGIN_NOT_FOUND',
          message: `Plugin ${pluginId} not found`,
        },
      };
    }

    const diagnostics = await this.pluginRuntime.getPluginDiagnostics(pluginId);
    const securityReport = this.pluginSecurity.generateSecurityReport(pluginId);

    return {
      success: true,
      data: {
        pluginId,
        diagnostics,
        security: securityReport,
        system: this.pluginDiagnostics.getSystemMetrics(),
      },
    };
  }

  /**
   * Get plugin logs
   */
  @Get(':id/logs')
  async getPluginLogs(@Param('id') pluginId: string) {
    const metrics = this.pluginDiagnostics.getPluginMetrics(pluginId);

    if (!metrics) {
      return {
        success: false,
        error: {
          code: 'NO_METRICS',
          message: `No metrics available for plugin ${pluginId}`,
        },
      };
    }

    return {
      success: true,
      data: {
        pluginId,
        recentErrors: metrics.errors.slice(-50),
        lifecycleExecutions: metrics.lifecycleExecutions,
        healthChecks: metrics.healthChecks,
      },
    };
  }

  /**
   * Get system-wide plugin metrics
   */
  @Get('system/metrics')
  async getSystemMetrics(): Promise<any> {
    const metrics = this.pluginDiagnostics.getSystemMetrics();
    const allPlugins = await this.pluginRuntime.listPlugins();

    return {
      success: true,
      data: {
        system: metrics,
        summary: {
          total: allPlugins.length,
          enabled: allPlugins.filter(p => p.state === 'ENABLED').length,
          disabled: allPlugins.filter(p => p.state === 'DISABLED').length,
          failed: allPlugins.filter(p => p.state === 'FAILED' || p.state === 'BROKEN').length,
          byType: this.groupByType(allPlugins),
        },
      },
    };
  }

  /**
   * Validate a plugin manifest (without installing)
   */
  @Post('validate')
  @UseInterceptors(FileInterceptor('package'))
  async validatePlugin(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return {
        success: false,
        error: {
          code: 'NO_PACKAGE',
          message: 'No plugin package uploaded',
        },
      };
    }

    // This would use the validator directly
    // For now, return a placeholder
    return {
      success: true,
      data: {
        valid: true,
        message: 'Validation endpoint - implement with PluginValidator',
      },
    };
  }

  /**
   * Get all registered plugin routes
   */
  @Get('routes')
  async getPluginRoutes() {
    const routes = this.routeLoader.getRegisteredRoutes();

    return {
      success: true,
      data: {
        routes: routes.map(r => ({
          pluginId: r.pluginId,
          path: r.path,
          method: r.method,
          handler: r.handler,
        })),
        total: routes.length,
      },
    };
  }

  /**
   * Get all registered plugin UI components
   */
  @Get('ui/components')
  async getUIComponents() {
    const menus = this.uiLoader.getMenus();
    const widgets = this.uiLoader.getWidgets();

    return {
      success: true,
      data: {
        menus: menus.map(m => ({
          id: m.id,
          label: m.label,
          pluginId: m.pluginId,
          pluginName: m.pluginName,
          icon: m.icon,
          path: m.path,
        })),
        widgets: widgets.map(w => ({
          id: w.id,
          name: w.name,
          type: w.type,
          pluginId: w.pluginId,
          pluginName: w.pluginName,
        })),
        totalMenus: menus.length,
        totalWidgets: widgets.length,
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
}
