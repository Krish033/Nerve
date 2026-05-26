/**
 * Marketplace Service
 * 
 * Core marketplace operations for plugin ecosystem management.
 * Handles upload, staging, validation, and installation orchestration.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma.service';
import { PluginStorage } from '../../../kernel/plugins/storage/plugin-storage';
import { PluginValidator } from '../../../kernel/plugins/validator/plugin-validator';
import { PluginInstaller } from '../../../kernel/plugins/installer/plugin-installer';
import { PluginSecurityManager } from '../../../kernel/plugins/permissions/plugin-security';
import { PluginDiagnostics } from '../../../kernel/plugins/diagnostics/plugin-diagnostics';
import {
  PluginStagedPackage,
  PluginValidationReport,
  PluginSecurityReport,
  MarketplaceUploadResult,
  MarketplaceStageResult,
  MarketplaceInstallResult,
} from '../types/marketplace.types';
import {
  ValidatedPluginManifest,
} from '../../../kernel/plugins/contracts';

interface UploadSession {
  sessionId: string;
  filename: string;
  size: number;
  checksum: string;
  tempPath: string;
  uploadedAt: Date;
  validated: boolean;
  validationReport?: PluginValidationReport;
  securityReport?: PluginSecurityReport;
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  private readonly maxPackageSize = 50 * 1024 * 1024; // 50MB
  private readonly uploadSessions = new Map<string, UploadSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PluginStorage,
    private readonly validator: PluginValidator,
    private readonly installer: PluginInstaller,
    private readonly security: PluginSecurityManager,
    private readonly diagnostics: PluginDiagnostics,
  ) {}

  /**
   * Upload and stage a plugin package
   * 
   * Flow: UPLOAD → TEMP STORAGE → VALIDATION → SECURITY CHECK → STAGED
   */
  async uploadPackage(
    packageData: Buffer,
    filename: string,
    options: {
      skipValidation?: boolean;
      autoStage?: boolean;
    } = {},
  ): Promise<MarketplaceUploadResult> {
    const sessionId = crypto.randomUUID();
    const operationId = this.diagnostics.startOperation('marketplace.upload', {
      sessionId,
      filename,
      size: packageData.length,
    });

    try {
      this.logger.log(`Processing upload: ${filename} (${packageData.length} bytes)`);

      // 1. Validate upload size
      if (packageData.length > this.maxPackageSize) {
        return {
          success: false,
          error: {
            code: 'PACKAGE_TOO_LARGE',
            message: `Package size ${(packageData.length / 1024 / 1024).toFixed(2)}MB exceeds limit of ${(this.maxPackageSize / 1024 / 1024).toFixed(0)}MB`,
          },
        };
      }

      // 2. Validate package format
      const formatValidation = this.validatePackageFormat(packageData);
      if (!formatValidation.valid) {
        return {
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: formatValidation.error || 'Invalid package format',
          },
        };
      }

      // 3. Generate checksum
      const checksum = crypto.createHash('sha256').update(packageData).digest('hex');

      // 4. Check for duplicate uploads
      const existingByChecksum = await this.findByChecksum(checksum);
      if (existingByChecksum) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_UPLOAD',
            message: 'This package has already been uploaded',
            details: { existingSessionId: existingByChecksum.sessionId },
          },
        };
      }

      // 5. Extract to temp storage
      const extraction = await this.storage.extractPackage(packageData);
      if (!extraction.success || !extraction.tempPath) {
        return {
          success: false,
          error: {
            code: 'EXTRACTION_FAILED',
            message: extraction.error || 'Failed to extract package',
          },
        };
      }

      // 6. Create upload session
      const session: UploadSession = {
        sessionId,
        filename,
        size: packageData.length,
        checksum,
        tempPath: extraction.tempPath,
        uploadedAt: new Date(),
        validated: false,
      };

      // 7. Run validation if not skipped
      if (!options.skipValidation && extraction.manifest) {
        const validation = await this.validator.validateManifest(extraction.manifest);
        session.validated = validation.valid;
        session.validationReport = {
          valid: validation.valid,
          errors: validation.errors || [],
          warnings: validation.warnings || [],
          manifest: validation.manifest,
        };

        // 8. Run security check
        if (validation.valid && validation.manifest) {
          const securityCheck = await this.security.validatePlugin(validation.manifest);
          session.securityReport = {
            allowed: securityCheck.allowed,
            riskLevel: securityCheck.riskLevel || 'low',
            violations: (securityCheck.violations || []).map((v: string) => ({
              type: 'security',
              severity: 'high' as const,
              message: v,
            })),
            permissions: validation.manifest.permissions,
          };

          if (!securityCheck.allowed) {
            await this.storage.cleanupTemp(extraction.tempPath);
            return {
              success: false,
              error: {
                code: 'SECURITY_VIOLATION',
                message: securityCheck.reason || 'Security check failed',
                details: { violations: securityCheck.violations },
              },
            };
          }
        }

        if (!validation.valid) {
          await this.storage.cleanupTemp(extraction.tempPath);
          return {
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: `Validation failed with ${validation.errors?.length || 0} errors`,
              details: { errors: validation.errors },
            },
          };
        }
      }

      // 9. Store session
      this.uploadSessions.set(sessionId, session);

      // 10. Auto-stage if requested and validated
      if (options.autoStage && session.validated) {
        await this.stagePackage(sessionId);
      }

      // Persist to database
      await (this.prisma as any).pluginUpload.create({
        data: {
          id: sessionId,
          filename,
          size: packageData.length,
          checksum,
          tempPath: extraction.tempPath,
          status: session.validated ? 'VALIDATED' : 'PENDING_VALIDATION',
          manifest: session.validationReport?.manifest 
            ? JSON.stringify(session.validationReport.manifest) 
            : null,
          validationReport: session.validationReport 
            ? JSON.stringify(session.validationReport) 
            : null,
          securityReport: session.securityReport 
            ? JSON.stringify(session.securityReport) 
            : null,
        },
      });

      this.diagnostics.endOperation(operationId, { success: true });

      return {
        success: true,
        data: {
          sessionId,
          filename,
          size: packageData.length,
          checksum,
          status: session.validated ? 'VALIDATED' : 'PENDING_VALIDATION',
          manifest: session.validationReport?.manifest,
          validationReport: session.validationReport,
          securityReport: session.securityReport,
          staged: (options.autoStage || false) && session.validated,
        },
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Upload failed: ${message}`);
      this.diagnostics.endOperation(operationId, { success: false, error: message });

      return {
        success: false,
        error: {
          code: 'UPLOAD_EXCEPTION',
          message,
        },
      };
    }
  }

  /**
   * Stage a validated plugin package
   * 
   * Moves from temp to staged state, ready for installation
   */
  async stagePackage(sessionId: string): Promise<MarketplaceStageResult> {
    const operationId = this.diagnostics.startOperation('marketplace.stage', { sessionId });

    try {
      const session = this.uploadSessions.get(sessionId);
      if (!session) {
        // Try to load from database
        const dbUpload = await (this.prisma as any).pluginUpload.findUnique({
          where: { id: sessionId },
        });
        
        if (!dbUpload) {
          return {
            success: false,
            error: {
              code: 'SESSION_NOT_FOUND',
              message: `Upload session ${sessionId} not found`,
            },
          };
        }

        if (dbUpload.status !== 'VALIDATED') {
          return {
            success: false,
            error: {
              code: 'NOT_VALIDATED',
              message: 'Package must be validated before staging',
            },
          };
        }
      } else if (!session.validated) {
        return {
          success: false,
          error: {
            code: 'NOT_VALIDATED',
            message: 'Package must be validated before staging',
          },
        };
      }

      // Create staged package record
      const stagedPackage: PluginStagedPackage = {
        id: sessionId,
        filename: session?.filename || 'unknown',
        manifest: session?.validationReport?.manifest as ValidatedPluginManifest,
        tempPath: session?.tempPath || '',
        checksum: session?.checksum || '',
        stagedAt: new Date(),
        status: 'STAGED',
        permissions: session?.securityReport?.permissions || [],
      };

      // Update database
      await (this.prisma as any).pluginUpload.update({
        where: { id: sessionId },
        data: {
          status: 'STAGED',
          stagedAt: new Date(),
        },
      });

      this.diagnostics.endOperation(operationId, { success: true });

      return {
        success: true,
        data: {
          stagedPackageId: sessionId,
          manifest: stagedPackage.manifest,
          permissions: stagedPackage.permissions,
          readyForInstall: true,
        },
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.diagnostics.endOperation(operationId, { success: false, error: message });

      return {
        success: false,
        error: {
          code: 'STAGE_FAILED',
          message,
        },
      };
    }
  }

  /**
   * Install a staged plugin
   * 
   * Flow: STAGED → INSTALL → REGISTER → ACTIVATE → ENABLED
   */
  async installStagedPackage(
    stagedPackageId: string,
    options: {
      autoEnable?: boolean;
      skipPermissions?: boolean;
    } = {},
  ): Promise<MarketplaceInstallResult> {
    const operationId = this.diagnostics.startOperation('marketplace.install', { stagedPackageId });

    try {
      // Get staged package
      const staged = await (this.prisma as any).pluginUpload.findUnique({
        where: { id: stagedPackageId },
      });

      if (!staged) {
        return {
          success: false,
          error: {
            code: 'PACKAGE_NOT_FOUND',
            message: `Staged package ${stagedPackageId} not found`,
          },
        };
      }

      if (staged.status !== 'STAGED') {
        return {
          success: false,
          error: {
            code: 'NOT_STAGED',
            message: `Package must be staged before installation. Current status: ${staged.status}`,
          },
        };
      }

      // Check for existing installed plugin
      const existingPlugin = await this.prisma.plugin.findFirst({
        where: { name: staged.filename.replace(/\.[^/.]+$/, '') },
      });

      if (existingPlugin) {
        return {
          success: false,
          error: {
            code: 'PLUGIN_EXISTS',
            message: `A plugin with this name is already installed`,
            details: { existingPluginId: existingPlugin.id },
          },
        };
      }

      // Load package data from temp
      const fs = await import('fs/promises');
      const packageData = await fs.readFile(staged.tempPath);

      // Use the installer
      const installResult = await this.installer.install(packageData, {
        autoEnable: options.autoEnable,
        skipValidation: true, // Already validated
      });

      if (!installResult.success) {
        // Update status to failed
        await (this.prisma as any).pluginUpload.update({
          where: { id: stagedPackageId },
          data: {
            status: 'INSTALL_FAILED',
            installError: installResult.error?.message || 'Installation failed',
          },
        });

        return {
          success: false,
          error: {
            code: 'INSTALL_FAILED',
            message: installResult.error?.message || 'Installation failed',
            details: installResult.error?.details,
          },
        };
      }

      // Update to installed status
      await (this.prisma as any).pluginUpload.update({
        where: { id: stagedPackageId },
        data: {
          status: 'INSTALLED',
          installedAt: new Date(),
          installedPluginId: installResult.data?.pluginId,
        },
      });

      this.diagnostics.endOperation(operationId, { success: true });

      return {
        success: true,
        data: {
          pluginId: installResult.data!.pluginId,
          name: installResult.data!.manifest.name,
          version: installResult.data!.manifest.version,
          state: installResult.data!.state,
          enabled: options.autoEnable || false,
        },
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.diagnostics.endOperation(operationId, { success: false, error: message });

      return {
        success: false,
        error: {
          code: 'INSTALL_EXCEPTION',
          message,
        },
      };
    }
  }

  /**
   * List all staged packages ready for installation
   */
  async listStagedPackages(): Promise<PluginStagedPackage[]> {
    const uploads = await (this.prisma as any).pluginUpload.findMany({
      where: { status: 'STAGED' },
      orderBy: { stagedAt: 'desc' },
    });

    return uploads.map((u: any) => ({
      id: u.id,
      filename: u.filename,
      manifest: u.manifest ? JSON.parse(u.manifest) : undefined,
      tempPath: u.tempPath,
      checksum: u.checksum,
      stagedAt: u.stagedAt,
      status: u.status as 'STAGED',
      permissions: u.securityReport 
        ? JSON.parse(u.securityReport).permissions || [] 
        : [],
    }));
  }

  /**
   * List upload history
   */
  async listUploads(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<UploadSession[]> {
    const uploads = await (this.prisma as any).pluginUpload.findMany({
      where: options.status ? { status: options.status } : undefined,
      orderBy: { uploadedAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    });

    return uploads.map((u: any) => ({
      sessionId: u.id,
      filename: u.filename,
      size: u.size,
      checksum: u.checksum,
      tempPath: u.tempPath,
      uploadedAt: u.uploadedAt,
      validated: u.status === 'VALIDATED' || u.status === 'STAGED' || u.status === 'INSTALLED',
      validationReport: u.validationReport ? JSON.parse(u.validationReport) : undefined,
      securityReport: u.securityReport ? JSON.parse(u.securityReport) : undefined,
    }));
  }

  /**
   * Delete an upload/staged package
   */
  async deleteUpload(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const upload = await (this.prisma as any).pluginUpload.findUnique({
        where: { id: sessionId },
      });

      if (!upload) {
        return { success: false, error: 'Upload not found' };
      }

      // Cleanup temp file
      if (upload.tempPath) {
        await this.storage.cleanupTemp(upload.tempPath).catch(() => {});
      }

      // Delete from database
      await (this.prisma as any).pluginUpload.delete({
        where: { id: sessionId },
      });

      // Remove from memory
      this.uploadSessions.delete(sessionId);

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get upload statistics
   */
  async getUploadStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    recentUploads: number;
  }> {
    const stats = await (this.prisma as any).pluginUpload.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const total = await (this.prisma as any).pluginUpload.count();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUploads = await (this.prisma as any).pluginUpload.count({
      where: {
        uploadedAt: { gte: twentyFourHoursAgo },
      },
    });

    const byStatus: Record<string, number> = {};
    for (const stat of stats) {
      byStatus[stat.status] = stat._count.status;
    }

    return {
      total,
      byStatus,
      recentUploads,
    };
  }

  // Private helpers

  private validatePackageFormat(packageData: Buffer): { valid: boolean; error?: string } {
    // Check magic numbers
    const isZip = packageData[0] === 0x50 && packageData[1] === 0x4b;
    const isGzip = packageData[0] === 0x1f && packageData[1] === 0x8b;

    if (!isZip && !isGzip) {
      return {
        valid: false,
        error: 'Invalid package format. Supported: .zip, .tar.gz',
      };
    }

    return { valid: true };
  }

  private async findByChecksum(checksum: string): Promise<UploadSession | null> {
    // Check memory first
    for (const session of this.uploadSessions.values()) {
      if (session.checksum === checksum) {
        return session;
      }
    }

    // Check database
    const existing = await (this.prisma as any).pluginUpload.findFirst({
      where: { checksum },
    });

    if (existing) {
      return {
        sessionId: existing.id,
        filename: existing.filename,
        size: existing.size,
        checksum: existing.checksum,
        tempPath: existing.tempPath,
        uploadedAt: existing.uploadedAt,
        validated: existing.status === 'VALIDATED' || existing.status === 'STAGED',
      };
    }

    return null;
  }
}
