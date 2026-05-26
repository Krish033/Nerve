/**
 * Plugin Memory Guard
 * 
 * Monitors and limits memory consumption per plugin to prevent
memory leaks and resource exhaustion attacks.
 */

import { Injectable, Logger } from '@nestjs/common';

interface MemoryProfile {
  pluginId: string;
  baselineHeap: number;
  baselineExternal: number;
  peakHeap: number;
  peakExternal: number;
  currentHeap: number;
  currentExternal: number;
  leakScore: number;
  lastUpdate: Date;
  samples: Array<{
    timestamp: Date;
    heapUsed: number;
    external: number;
  }>;
}

interface MemoryGuardConfig {
  maxHeapMB: number;
  maxExternalMB: number;
  leakThreshold: number;
  sampleIntervalMs: number;
  maxSamples: number;
}

@Injectable()
export class PluginMemoryGuard {
  private readonly logger = new Logger(PluginMemoryGuard.name);
  private readonly profiles = new Map<string, MemoryProfile>();
  private readonly config: MemoryGuardConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor() {
    this.config = {
      maxHeapMB: 512,
      maxExternalMB: 256,
      leakThreshold: 0.8, // 80% growth rate indicates leak
      sampleIntervalMs: 30000, // 30 seconds
      maxSamples: 20,
    };
  }

  onModuleInit(): void {
    this.startMonitoring();
  }

  onModuleDestroy(): void {
    this.stopMonitoring();
  }

  /**
   * Initialize memory profile for a plugin
   */
  initializeProfile(pluginId: string): void {
    const usage = process.memoryUsage();
    
    const profile: MemoryProfile = {
      pluginId,
      baselineHeap: usage.heapUsed,
      baselineExternal: usage.external,
      peakHeap: usage.heapUsed,
      peakExternal: usage.external,
      currentHeap: usage.heapUsed,
      currentExternal: usage.external,
      leakScore: 0,
      lastUpdate: new Date(),
      samples: [{
        timestamp: new Date(),
        heapUsed: usage.heapUsed,
        external: usage.external,
      }],
    };

    this.profiles.set(pluginId, profile);
    this.logger.debug(`Initialized memory profile for ${pluginId}`);
  }

  /**
   * Check if plugin exceeds memory limits
   */
  checkMemoryLimits(pluginId: string): {
    allowed: boolean;
    heapMB: number;
    externalMB: number;
    reason?: string;
  } {
    const profile = this.profiles.get(pluginId);
    if (!profile) {
      return { allowed: true, heapMB: 0, externalMB: 0 };
    }

    const currentUsage = process.memoryUsage();
    const pluginHeap = currentUsage.heapUsed - profile.baselineHeap;
    const pluginExternal = currentUsage.external - profile.baselineExternal;
    
    const heapMB = pluginHeap / 1024 / 1024;
    const externalMB = pluginExternal / 1024 / 1024;

    profile.currentHeap = pluginHeap;
    profile.currentExternal = pluginExternal;
    profile.lastUpdate = new Date();

    // Update peaks
    if (pluginHeap > profile.peakHeap) {
      profile.peakHeap = pluginHeap;
    }
    if (pluginExternal > profile.peakExternal) {
      profile.peakExternal = pluginExternal;
    }

    // Check limits
    if (heapMB > this.config.maxHeapMB) {
      return {
        allowed: false,
        heapMB,
        externalMB,
        reason: `Heap limit exceeded: ${heapMB.toFixed(2)}MB > ${this.config.maxHeapMB}MB`,
      };
    }

    if (externalMB > this.config.maxExternalMB) {
      return {
        allowed: false,
        heapMB,
        externalMB,
        reason: `External memory limit exceeded: ${externalMB.toFixed(2)}MB > ${this.config.maxExternalMB}MB`,
      };
    }

    return { allowed: true, heapMB, externalMB };
  }

  /**
   * Sample current memory usage
   */
  sampleMemory(pluginId: string): void {
    const profile = this.profiles.get(pluginId);
    if (!profile) return;

    const usage = process.memoryUsage();
    const sample = {
      timestamp: new Date(),
      heapUsed: usage.heapUsed - profile.baselineHeap,
      external: usage.external - profile.baselineExternal,
    };

    profile.samples.push(sample);

    // Keep only recent samples
    if (profile.samples.length > this.config.maxSamples) {
      profile.samples.shift();
    }

    // Calculate leak score
    profile.leakScore = this.calculateLeakScore(profile);
  }

  /**
   * Detect memory leak
   */
  detectMemoryLeak(pluginId: string): {
    detected: boolean;
    leakScore: number;
    growthRate: number;
    recommendation?: string;
  } {
    const profile = this.profiles.get(pluginId);
    if (!profile || profile.samples.length < 5) {
      return { detected: false, leakScore: 0, growthRate: 0 };
    }

    const leakScore = profile.leakScore;
    const growthRate = this.calculateGrowthRate(profile);

    if (leakScore > this.config.leakThreshold) {
      return {
        detected: true,
        leakScore,
        growthRate,
        recommendation: 'Memory leak detected - consider restarting plugin or investigating heap dumps',
      };
    }

    return { detected: false, leakScore, growthRate };
  }

  /**
   * Get memory profile for a plugin
   */
  getProfile(pluginId: string): MemoryProfile | undefined {
    return this.profiles.get(pluginId);
  }

  /**
   * Get all memory profiles
   */
  getAllProfiles(): MemoryProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Clean up plugin profile
   */
  cleanupProfile(pluginId: string): void {
    this.profiles.delete(pluginId);
    this.logger.debug(`Cleaned up memory profile for ${pluginId}`);
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): void {
    if (global.gc) {
      global.gc();
      this.logger.debug('Forced garbage collection');
    }
  }

  /**
   * Get memory pressure status
   */
  getMemoryPressure(): {
    pressure: 'low' | 'medium' | 'high' | 'critical';
    systemHeapMB: number;
    systemExternalMB: number;
    rssMB: number;
  } {
    const usage = process.memoryUsage();
    const systemHeapMB = usage.heapUsed / 1024 / 1024;
    const systemExternalMB = usage.external / 1024 / 1024;
    const rssMB = usage.rss / 1024 / 1024;

    let pressure: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (rssMB > 2048) {
      pressure = 'critical';
    } else if (rssMB > 1024) {
      pressure = 'high';
    } else if (rssMB > 512) {
      pressure = 'medium';
    }

    return {
      pressure,
      systemHeapMB,
      systemExternalMB,
      rssMB,
    };
  }

  // Private helpers

  private startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.monitorAllPlugins();
    }, this.config.sampleIntervalMs);

    this.logger.log('Memory guard monitoring started');
  }

  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    this.logger.log('Memory guard monitoring stopped');
  }

  private monitorAllPlugins(): void {
    for (const [pluginId, profile] of this.profiles) {
      this.sampleMemory(pluginId);
      
      const leakDetection = this.detectMemoryLeak(pluginId);
      if (leakDetection.detected) {
        this.logger.warn(
          `Memory leak detected in ${pluginId}: ` +
          `score=${leakDetection.leakScore.toFixed(2)}, ` +
          `growth=${leakDetection.growthRate.toFixed(2)}%`
        );
      }

      const limits = this.checkMemoryLimits(pluginId);
      if (!limits.allowed) {
        this.logger.error(
          `Memory limit violation for ${pluginId}: ${limits.reason}`
        );
      }
    }
  }

  private calculateLeakScore(profile: MemoryProfile): number {
    if (profile.samples.length < 5) return 0;

    // Simple linear regression to detect upward trend
    const recent = profile.samples.slice(-10);
    const first = recent[0].heapUsed;
    const last = recent[recent.length - 1].heapUsed;
    
    if (first === 0) return 0;

    const growthRate = (last - first) / first;
    
    // Score based on growth rate and consistency
    return Math.min(growthRate, 1.0);
  }

  private calculateGrowthRate(profile: MemoryProfile): number {
    if (profile.samples.length < 2) return 0;

    const first = profile.samples[0].heapUsed;
    const last = profile.samples[profile.samples.length - 1].heapUsed;

    if (first === 0) return 0;

    return ((last - first) / first) * 100;
  }
}
