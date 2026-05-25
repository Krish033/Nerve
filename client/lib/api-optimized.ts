/**
 * Optimized API Client with Caching, Retry Logic, and Performance Monitoring
 * 
 * Features:
 * - Request deduplication
 * - Intelligent caching
 * - Exponential backoff retry
 * - Request/response interceptors
 * - Performance tracking
 * - Circuit breaker pattern
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { logger } from "./logger-enhanced";

const API_URL = "/api";

// Cache configuration
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  etag?: string;
}

class APICache {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 60000; // 1 minute

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const isExpired = Date.now() - entry.timestamp > this.DEFAULT_TTL;
    if (isExpired) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, etag?: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag,
    });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getCacheKey(config: AxiosRequestConfig): string {
    return `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
  }
}

const apiCache = new APICache();

// Circuit breaker for resilience
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  
  private readonly THRESHOLD = 5;
  private readonly TIMEOUT = 60000; // 1 minute

  canExecute(): boolean {
    if (this.state === "CLOSED") return true;
    
    if (this.state === "OPEN") {
      const now = Date.now();
      if (this.lastFailureTime && now - this.lastFailureTime > this.TIMEOUT) {
        this.state = "HALF_OPEN";
        return true;
      }
      return false;
    }
    
    return true; // HALF_OPEN
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "CLOSED";
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.THRESHOLD) {
      this.state = "OPEN";
      logger.error("Circuit breaker opened - too many failures", {
        failures: this.failures,
      });
    }
  }
}

const circuitBreaker = new CircuitBreaker();

// Request deduplication
class RequestDeduper {
  private pending = new Map<string, Promise<any>>();

  async dedupe<T>(key: string, request: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) {
      return existing;
    }

    const promise = request().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

const requestDeduper = new RequestDeduper();

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add timestamp for performance tracking
    (config as any).metadata = { startTime: Date.now() };
    
    // Add auth token if available
    // Note: In a real implementation, get this from your auth store
    // const token = useAuthStore.getState().accessToken;
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Performance tracking
    const startTime = (response.config as any).metadata?.startTime;
    if (startTime) {
      const duration = Date.now() - startTime;
      logger.api(
        response.config.method?.toUpperCase() || "GET",
        response.config.url || "",
        duration,
        response.status
      );
    }
    
    circuitBreaker.recordSuccess();
    return response;
  },
  async (error) => {
    circuitBreaker.recordFailure();
    
    const originalRequest = error.config;
    
    // Skip retry logic for:
    // 1. Already retried requests
    // 2. Auth endpoints
    const isAuthEndpoint = 
      originalRequest?.url?.includes("/auth/login") || 
      originalRequest?.url?.includes("/auth/refresh");
    
    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      // Token refresh logic would go here
      // For now, just pass through
    }
    
    // Log error
    logger.error("API request failed", {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      error: error.message,
    });
    
    return Promise.reject(error);
  }
);

/**
 * Optimized API methods with caching and deduplication
 */
export const api = {
  /**
   * GET request with caching
   */
  async get<T>(url: string, config?: AxiosRequestConfig & { cache?: boolean }): Promise<T> {
    const cacheKey = apiCache.getCacheKey({ method: "GET", url, ...config });
    
    // Check cache
    if (config?.cache !== false) {
      const cached = apiCache.get<T>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit: ${url}`);
        return cached;
      }
    }
    
    // Circuit breaker check
    if (!circuitBreaker.canExecute()) {
      throw new Error("Service temporarily unavailable");
    }
    
    // Deduplicate concurrent identical requests
    return requestDeduper.dedupe(cacheKey, async () => {
      const response = await apiClient.get<T>(url, config);
      
      // Cache successful GET requests
      if (config?.cache !== false) {
        apiCache.set(cacheKey, response.data);
      }
      
      return response.data;
    });
  },

  /**
   * POST request (no caching, invalidates related cache)
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    if (!circuitBreaker.canExecute()) {
      throw new Error("Service temporarily unavailable");
    }
    
    const response = await apiClient.post<T>(url, data, config);
    
    // Invalidate related cache entries
    apiCache.invalidate(url.split("/")[1]);
    
    return response.data;
  },

  /**
   * PUT request (no caching, invalidates related cache)
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    if (!circuitBreaker.canExecute()) {
      throw new Error("Service temporarily unavailable");
    }
    
    const response = await apiClient.put<T>(url, data, config);
    apiCache.invalidate(url.split("/")[1]);
    return response.data;
  },

  /**
   * DELETE request (no caching, invalidates related cache)
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    if (!circuitBreaker.canExecute()) {
      throw new Error("Service temporarily unavailable");
    }
    
    const response = await apiClient.delete<T>(url, config);
    apiCache.invalidate(url.split("/")[1]);
    return response.data;
  },

  /**
   * Manual cache invalidation
   */
  invalidateCache(pattern?: string): void {
    apiCache.invalidate(pattern);
  },

  /**
   * Clear all caches
   */
  clearCache(): void {
    apiCache.invalidate();
  },
};

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryCondition?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    retryCondition = () => true,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      
      logger.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`, {
        error: error instanceof Error ? error.message : String(error),
      });
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
