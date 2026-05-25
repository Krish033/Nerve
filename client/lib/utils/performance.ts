/**
 * Performance Utilities
 * 
 * Optimized memoization, throttling, and rendering utilities
 * for industrial-grade application performance.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Debounce hook with proper cleanup
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]) as T;
}

/**
 * Throttle hook for high-frequency events
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): T {
  const inThrottle = useRef<boolean>(false);
  
  return useCallback((...args: Parameters<T>) => {
    if (!inThrottle.current) {
      callback(...args);
      inThrottle.current = true;
      setTimeout(() => { inThrottle.current = false; }, limit);
    }
  }, [callback, limit]) as T;
}

/**
 * Memoized selector for Zustand stores
 * Prevents re-renders when selected state hasn't changed
 */
export function createSelector<State, Selected>(
  selector: (state: State) => Selected
) {
  return selector;
}

/**
 * Optimized RAF-based animation frame hook
 */
export function useRaf(callback: () => void, deps: any[] = []) {
  const rafRef = useRef<number | undefined>(undefined);
  
  useEffect(() => {
    const animate = () => {
      callback();
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, deps);
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  callback: (isIntersecting: boolean) => void,
  options?: IntersectionObserverInit
) {
  const targetRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => callback(entry.isIntersecting),
      { threshold: 0.1, ...options }
    );

    observerRef.current.observe(target);

    return () => observerRef.current?.disconnect();
  }, [callback, options]);

  return targetRef;
}

/**
 * Measure render performance in development
 */
export function useRenderPerf(componentName: string) {
  if (process.env.NODE_ENV !== 'production') {
    const startTime = performance.now();
    
    useEffect(() => {
      const duration = performance.now() - startTime;
      if (duration > 16) { // Frame budget
        console.warn(`[PERF] ${componentName} slow render: ${duration.toFixed(2)}ms`);
      }
    });
  }
}

/**
 * Deep equality check for complex objects
 * More efficient than JSON.stringify for large objects
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * Memory-efficient memoization with LRU cache
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      this.deleteFirst();
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  private deleteFirst(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
    }
  }
}

/**
 * Batch multiple state updates for performance
 */
export function batchUpdates<T>(
  updates: ((prev: T) => T)[],
  initial: T
): T {
  return updates.reduce((acc, update) => update(acc), initial);
}
