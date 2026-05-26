/**
 * Plugin Storage System
 * 
 * Manages isolated plugin storage including:
 * - Package extraction
 * - Installation directories
 * - Asset management
 * - Safe cleanup
 * - Version control
 */

import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { PluginManifest, ValidatedPluginManifest } from '../contracts';

interface ExtractionResult {
  success: boolean;
  tempPath?: string;
  manifest?: PluginManifest;
  error?: string;
}

interface InstallationResult {
  success: boolean;
  installPath?: string;
  error?: string;
}

interface CleanupResult {
  success: boolean;
  error?: string;
}

@Injectable()
export class PluginStorage {
  private readonly logger = new Logger(PluginStorage.name);
  private readonly basePath: string;
  private readonly tempPath: string;
  private readonly assetsPath: string;

  constructor() {
    // Base storage paths
    this.basePath = process.env.PLUGIN_STORAGE_PATH || './storage/plugins';
    this.tempPath = path.join(this.basePath, 'temp');
    this.assetsPath = path.join(this.basePath, 'assets');
  }

  async onModuleInit(): Promise<void> {
    // Ensure storage directories exist
    await this.ensureDirectories();
  }

  /**
   * Extract plugin package from buffer
   */
  async extractPackage(packageData: Buffer): Promise<ExtractionResult> {
    const operationId = crypto.randomUUID();
    const tempDir = path.join(this.tempPath, operationId);

    try {
      this.logger.debug(`Extracting package to ${tempDir}`);

      // Create temp directory
      await fs.mkdir(tempDir, { recursive: true });

      // Detect format and extract
      const isTar = packageData[0] === 0x1f && packageData[1] === 0x8b;
      const isZip = packageData[0] === 0x50 && packageData[1] === 0x4b;

      if (isZip) {
        await this.extractZip(packageData, tempDir);
      } else if (isTar) {
        await this.extractTar(packageData, tempDir);
      } else {
        await this.cleanupTemp(tempDir);
        return { success: false, error: 'Unknown package format. Supported: .zip, .tar.gz' };
      }

      // Find and parse manifest
      const manifestPath = path.join(tempDir, 'manifest.json');
      let manifest: PluginManifest;

      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        manifest = JSON.parse(manifestContent);
      } catch {
        await this.cleanupTemp(tempDir);
        return { success: false, error: 'Invalid or missing manifest.json' };
      }

      // Security: Check for path traversal attempts
      const isSafe = await this.validatePathSafety(tempDir);
      if (!isSafe) {
        await this.cleanupTemp(tempDir);
        return { success: false, error: 'Package contains unsafe file paths' };
      }

      return {
        success: true,
        tempPath: tempDir,
        manifest,
      };

    } catch (error) {
      await this.cleanupTemp(tempDir);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
      };
    }
  }

  /**
   * Install plugin to permanent storage
   */
  async installPlugin(
    manifest: ValidatedPluginManifest,
    tempPath: string,
  ): Promise<InstallationResult> {
    try {
      const sanitizedName = this.sanitizePluginName(manifest.name);
      const versionedName = `${sanitizedName}-${manifest.version}`;
      const installPath = path.join(this.basePath, 'installed', versionedName);

      this.logger.debug(`Installing plugin to ${installPath}`);

      // Check if already exists
      try {
        await fs.access(installPath);
        // Remove old installation
        await fs.rm(installPath, { recursive: true, force: true });
      } catch {
        // Directory doesn't exist, which is expected
      }

      // Create installation directory
      await fs.mkdir(installPath, { recursive: true });

      // Copy files from temp
      await this.copyDirectory(tempPath, installPath);

      // Verify installation
      const manifestPath = path.join(installPath, 'manifest.json');
      await fs.access(manifestPath);

      // Cleanup temp
      await this.cleanupTemp(tempPath);

      // Set restrictive permissions
      await this.setSecurePermissions(installPath);

      return {
        success: true,
        installPath,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Installation failed',
      };
    }
  }

  /**
   * Uninstall plugin and cleanup
   */
  async uninstallPlugin(instance: { id: string; installPath: string }): Promise<CleanupResult> {
    try {
      this.logger.debug(`Uninstalling plugin ${instance.id}`);

      // Remove installation directory
      await fs.rm(instance.installPath, { recursive: true, force: true });

      // Cleanup any cached assets
      const assetDir = path.join(this.assetsPath, instance.id);
      await fs.rm(assetDir, { recursive: true, force: true }).catch(() => {});

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Uninstallation failed',
      };
    }
  }

  /**
   * Cleanup temporary extraction directory
   */
  async cleanupTemp(tempPath: string): Promise<void> {
    try {
      await fs.rm(tempPath, { recursive: true, force: true });
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp directory ${tempPath}: ${error}`);
    }
  }

  /**
   * Store plugin asset
   */
  async storeAsset(
    pluginId: string,
    assetName: string,
    data: Buffer,
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const sanitizedName = this.sanitizeFilename(assetName);
      const assetDir = path.join(this.assetsPath, pluginId);
      const assetPath = path.join(assetDir, sanitizedName);

      // Ensure asset directory exists
      await fs.mkdir(assetDir, { recursive: true });

      // Write asset
      await fs.writeFile(assetPath, data);

      return {
        success: true,
        path: assetPath,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store asset',
      };
    }
  }

  /**
   * Retrieve plugin asset
   */
  async getAsset(
    pluginId: string,
    assetName: string,
  ): Promise<{ success: boolean; data?: Buffer; error?: string }> {
    try {
      const sanitizedName = this.sanitizeFilename(assetName);
      const assetPath = path.join(this.assetsPath, pluginId, sanitizedName);

      const data = await fs.readFile(assetPath);

      return {
        success: true,
        data,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Asset not found',
      };
    }
  }

  /**
   * List installed plugins
   */
  async listInstalled(): Promise<Array<{ name: string; path: string }>> {
    const installedPath = path.join(this.basePath, 'installed');
    const plugins: Array<{ name: string; path: string }> = [];

    try {
      const entries = await fs.readdir(installedPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          plugins.push({
            name: entry.name,
            path: path.join(installedPath, entry.name),
          });
        }
      }
    } catch {
      // Directory doesn't exist yet
    }

    return plugins;
  }

  /**
   * Get plugin installation path
   */
  getPluginPath(pluginName: string, version: string): string {
    const sanitizedName = this.sanitizePluginName(pluginName);
    const versionedName = `${sanitizedName}-${version}`;
    return path.join(this.basePath, 'installed', versionedName);
  }

  // Private helpers

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.basePath,
      path.join(this.basePath, 'installed'),
      this.tempPath,
      this.assetsPath,
      path.join(this.basePath, 'cache'),
      path.join(this.basePath, 'logs'),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async extractZip(data: Buffer, destPath: string): Promise<void> {
    // Use adm-zip or similar in production
    // For now, placeholder implementation
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    const tempFile = path.join(this.tempPath, `extract-${Date.now()}.zip`);
    await fs.writeFile(tempFile, data);

    try {
      await execAsync(`unzip -q "${tempFile}" -d "${destPath}"`);
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  private async extractTar(data: Buffer, destPath: string): Promise<void> {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    const tempFile = path.join(this.tempPath, `extract-${Date.now()}.tar.gz`);
    await fs.writeFile(tempFile, data);

    try {
      await execAsync(`tar -xzf "${tempFile}" -C "${destPath}"`);
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  private async validatePathSafety(extractPath: string): Promise<boolean> {
    const files = await this.listAllFiles(extractPath);

    for (const file of files) {
      const relativePath = path.relative(extractPath, file);

      // Check for path traversal
      if (relativePath.includes('..') || relativePath.startsWith('/')) {
        this.logger.error(`Path traversal detected: ${relativePath}`);
        return false;
      }

      // Check for absolute paths in symlinks
      const lstat = await fs.lstat(file);
      if (lstat.isSymbolicLink()) {
        const linkTarget = await fs.readlink(file);
        if (path.isAbsolute(linkTarget)) {
          this.logger.error(`Absolute symlink detected: ${relativePath} -> ${linkTarget}`);
          return false;
        }
      }
    }

    return true;
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else if (entry.isFile()) {
        await fs.copyFile(srcPath, destPath);
      }
      // Skip symlinks for security
    }
  }

  private async setSecurePermissions(installPath: string): Promise<void> {
    try {
      // Read-only for all files
      await fs.chmod(installPath, 0o755);

      const setPermissions = async (dir: string) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await fs.chmod(fullPath, 0o755);
            await setPermissions(fullPath);
          } else {
            // Files are read-only
            await fs.chmod(fullPath, 0o644);
          }
        }
      };

      await setPermissions(installPath);
    } catch (error) {
      this.logger.warn(`Failed to set permissions: ${error}`);
    }
  }

  private async listAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.listAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return files;
  }

  private sanitizePluginName(name: string): string {
    // Remove unsafe characters
    return name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  }

  private sanitizeFilename(filename: string): string {
    // Remove path separators and other unsafe characters
    return filename.replace(/[\\/:*?"<>|]/g, '_');
  }
}
