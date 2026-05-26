/**
 * RATE LIMITER
 * 
 * Multi-tier rate limiting with tenant-aware quotas.
 * Protects against API abuse, DDoS, and resource exhaustion.
 */

import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export interface RateLimitConfig {
  windowMs: number;       // Time window in milliseconds
  maxRequests: number;    // Max requests per window
  keyPrefix?: string;     // Key prefix for Redis
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private redis?: Redis;
  private localCache = new Map<string, RateLimitState>();
  private defaultConfig: RateLimitConfig;
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis if available
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    }

    // Default config: 100 requests per minute
    this.defaultConfig = {
      windowMs: 60 * 1000,
      maxRequests: 100,
      keyPrefix: 'ratelimit',
    };

    // Start cleanup timer
    this.startCleanup();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.redis?.disconnect();
  }

  /**
   * Check rate limit for a key
   */
  async checkLimit(
    key: string,
    config?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const fullKey = `${finalConfig.keyPrefix}:${key}`;
    const now = Date.now();

    if (this.redis) {
      return this.checkRedisLimit(fullKey, finalConfig, now);
    } else {
      return this.checkLocalLimit(fullKey, finalConfig, now);
    }
  }

  /**
   * Consume a request (increment counter)
   */
  async consume(
    key: string,
    config?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const result = await this.checkLimit(key, config);

    if (result.allowed) {
      // Increment the counter
      if (this.redis) {
        await this.incrementRedis(key, config);
      } else {
        await this.incrementLocal(key, config);
      }
    }

    return result;
  }

  /**
   * Check tenant-wide rate limit
   */
  async checkTenantLimit(
    tenantId: string,
    config?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    // Higher limits for tenant-wide
    const tenantConfig: RateLimitConfig = {
      windowMs: 60 * 1000,
      maxRequests: 1000, // 1000 requests per minute per tenant
      keyPrefix: 'ratelimit:tenant',
      ...config,
    };

    return this.consume(`tenant:${tenantId}`, tenantConfig);
  }

  /**
   * Check user-specific rate limit
   */
  async checkUserLimit(
    userId: string,
    config?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const userConfig: RateLimitConfig = {
      windowMs: 60 * 1000,
      maxRequests: 60, // 60 requests per minute per user
      keyPrefix: 'ratelimit:user',
      ...config,
    };

    return this.consume(`user:${userId}`, userConfig);
  }

  /**
   * Check IP-based rate limit (for unauthenticated requests)
   */
  async checkIPLimit(
    ip: string,
    config?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const ipConfig: RateLimitConfig = {
      windowMs: 60 * 1000,
      maxRequests: 30, // 30 requests per minute per IP
      keyPrefix: 'ratelimit:ip',
      ...config,
    };

    return this.consume(`ip:${ip}`, ipConfig);
  }

  /**
   * Check endpoint-specific rate limit
   */
  async checkEndpointLimit(
    endpoint: string,
    identifier: string,
    config?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const endpointConfig: RateLimitConfig = {
      windowMs: 60 * 1000,
      maxRequests: 10, // 10 requests per minute per endpoint
      keyPrefix: 'ratelimit:endpoint',
      ...config,
    };

    return this.consume(`endpoint:${endpoint}:${identifier}`, endpointConfig);
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string, config?: Partial<RateLimitConfig>): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const fullKey = `${finalConfig.keyPrefix}:${key}`;

    if (this.redis) {
      await this.redis.del(fullKey);
    } else {
      this.localCache.delete(fullKey);
    }

    this.logger.debug(`Rate limit reset for: ${key}`);
  }

  /**
   * Get current rate limit status
   */
  async getStatus(
    key: string,
    config?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    return this.checkLimit(key, config);
  }

  // Private methods

  private async checkRedisLimit(
    key: string,
    config: RateLimitConfig,
    now: number,
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      throw new Error('Redis not available');
    }

    // Use Redis INCR with expiry
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.pexpire(key, config.windowMs);

    const results = await pipeline.exec();
    const count = (results?.[0]?.[1] as number) || 0;

    // Get TTL for reset time
    const ttl = await this.redis.pttl(key);
    const resetTime = now + Math.max(0, ttl);

    const remaining = Math.max(0, config.maxRequests - count);
    const allowed = count <= config.maxRequests;

    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil(ttl / 1000),
    };
  }

  private checkLocalLimit(
    key: string,
    config: RateLimitConfig,
    now: number,
  ): RateLimitResult {
    const state = this.localCache.get(key);

    if (!state || now > state.resetTime) {
      // New window
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }

    const remaining = Math.max(0, config.maxRequests - state.count);
    const allowed = state.count < config.maxRequests;

    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime: state.resetTime,
      retryAfter: allowed ? undefined : Math.ceil((state.resetTime - now) / 1000),
    };
  }

  private async incrementRedis(
    key: string,
    config?: Partial<RateLimitConfig>,
  ): Promise<void> {
    if (!this.redis) return;

    const finalConfig = { ...this.defaultConfig, ...config };
    const fullKey = `${finalConfig.keyPrefix}:${key}`;

    await this.redis.incr(fullKey);
    await this.redis.pexpire(fullKey, finalConfig.windowMs);
  }

  private async incrementLocal(
    key: string,
    config?: Partial<RateLimitConfig>,
  ): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const fullKey = `${finalConfig.keyPrefix}:${key}`;
    const now = Date.now();

    const state = this.localCache.get(fullKey);

    if (!state || now > state.resetTime) {
      // New window
      this.localCache.set(fullKey, {
        count: 1,
        resetTime: now + finalConfig.windowMs,
      });
    } else {
      state.count++;
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, state] of this.localCache) {
        if (now > state.resetTime) {
          this.localCache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
      }
    }, this.CLEANUP_INTERVAL);
  }
}

/**
 * Rate limit middleware factory
 */
export function createRateLimitMiddleware(
  rateLimiter: RateLimiter,
  config?: Partial<RateLimitConfig>,
) {
  return async function rateLimitMiddleware(
    req: any,
    res: any,
    next: () => void,
  ): Promise<void> {
    try {
      // Build key from request
      const key = buildRateLimitKey(req);

      // Check rate limit
      const result = await rateLimiter.consume(key, config);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter || 60);
        res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: result.retryAfter,
        });
        return;
      }

      next();
    } catch (error) {
      // If rate limiting fails, allow request but log error
      console.error('Rate limiting error:', error);
      next();
    }
  };
}

function buildRateLimitKey(req: any): string {
  const parts: string[] = [];

  // Add tenant if available
  if (req.tenant?.id) {
    parts.push(`tenant:${req.tenant.id}`);
  }

  // Add user if authenticated
  if (req.user?.id) {
    parts.push(`user:${req.user.id}`);
  } else {
    // Use IP for unauthenticated
    parts.push(`ip:${req.ip || req.connection?.remoteAddress || 'unknown'}`);
  }

  // Add endpoint
  parts.push(`endpoint:${req.method}:${req.path}`);

  return parts.join(':');
}
