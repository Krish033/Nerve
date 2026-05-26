/**
 * CONFIG SERVICE
 * 
 * Centralized configuration management with tenant scoping.
 */

import { Injectable, Logger } from '@nestjs/common';
import { IConfigService, IKernel } from '../contracts/module.contract';

@Injectable()
export class ConfigService implements IConfigService {
  private readonly logger = new Logger(ConfigService.name);
  private kernel: IKernel | undefined;
  private config = new Map<string, any>();
  private moduleConfigs = new Map<string, Map<string, any>>();

  setKernel(kernel: IKernel): void {
    this.kernel = kernel;
  }

  async initialize(): Promise<void> {
    // Load configuration from environment and database
    this.loadFromEnvironment();
    await this.loadFromDatabase();

    this.logger.log('Config service initialized');
  }

  /**
   * Get configuration value
   */
  get<T = any>(key: string, defaultValue?: T): T | undefined {
    const value = this.config.get(key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set configuration value
   */
  set<T = any>(key: string, value: T): void {
    this.config.set(key, value);
    this.logger.debug(`Config set: ${key}`);
  }

  /**
   * Check if config key exists
   */
  has(key: string): boolean {
    return this.config.has(key);
  }

  /**
   * Get module-specific configuration
   */
  getModuleConfig(moduleId: string): Record<string, any> {
    const moduleConfig = this.moduleConfigs.get(moduleId);
    return moduleConfig ? Object.fromEntries(moduleConfig) : {};
  }

  /**
   * Set module configuration
   */
  setModuleConfig(moduleId: string, config: Record<string, any>): void {
    let moduleConfig = this.moduleConfigs.get(moduleId);
    if (!moduleConfig) {
      moduleConfig = new Map();
      this.moduleConfigs.set(moduleId, moduleConfig);
    }

    for (const [key, value] of Object.entries(config)) {
      moduleConfig.set(key, value);
    }

    this.logger.debug(`Module config set for ${moduleId}`);
  }

  /**
   * Get all configuration
   */
  getAll(): Record<string, any> {
    return Object.fromEntries(this.config);
  }

  /**
   * Reload configuration from sources
   */
  async reload(): Promise<void> {
    this.config.clear();
    this.loadFromEnvironment();
    await this.loadFromDatabase();
    this.logger.log('Configuration reloaded');
  }

  // Private methods

  private loadFromEnvironment(): void {
    // Load all env vars starting with NERVE_
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('NERVE_')) {
        const configKey = key.replace('NERVE_', '').toLowerCase().replace(/_/g, '.');
        this.set(configKey, this.parseValue(value));
      }
    }

    // Core config
    this.set('app.name', process.env.APP_NAME || 'Nurve');
    this.set('app.env', process.env.NODE_ENV || 'development');
    this.set('app.url', process.env.APP_URL || 'http://localhost:3000');
    this.set('api.url', process.env.API_URL || 'http://localhost:4000');
  }

  private async loadFromDatabase(): Promise<void> {
    // Load from database settings table
    // const settings = await prisma.setting.findMany();
    // for (const setting of settings) {
    //   this.set(setting.key, setting.value);
    // }
  }

  private parseValue(value: string | undefined): any {
    if (!value) return undefined;

    // Try boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Try number
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

    // Try JSON
    try {
      return JSON.parse(value);
    } catch {
      // Return as string
      return value;
    }
  }
}
