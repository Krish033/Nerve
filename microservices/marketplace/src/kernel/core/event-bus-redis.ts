/**
 * EVENT BUS - REDIS IMPLEMENTATION
 * 
 * Distributed pub/sub with persistence, dead letter queue, and retry support.
 * Enables multi-instance event propagation and event replay.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  IEventBus,
  IKernel,
  EventHandler,
  EventMetadata,
  Subscription,
  EventStats,
} from '../contracts/module.contract';

interface EventSubscription<T = any> {
  id: string;
  event: string;
  handler: EventHandler<T>;
  once: boolean;
  retryCount: number;
}

interface StoredEvent {
  id: string;
  event: string;
  payload: any;
  metadata: EventMetadata;
  createdAt: number;
  processedAt?: number;
  error?: string;
  retryCount: number;
}

@Injectable()
export class EventBusRedis implements IEventBus, OnModuleDestroy {
  private readonly logger = new Logger(EventBusRedis.name);
  private kernel: IKernel | undefined;
  private redis: Redis;
  private subscriber: Redis;
  private subscriptions = new Map<string, EventSubscription[]>();
  private localHandlers = new Map<string, Set<string>>();
  private eventCounter = 0;

  // Configuration
  private readonly MAX_RETRIES = 3;
  private readonly EVENT_TIMEOUT = 30000;
  private readonly RETRY_DELAY = 5000;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    // Publisher connection
    this.redis = new Redis(redisUrl);

    // Subscriber connection (separate for pub/sub)
    this.subscriber = new Redis(redisUrl);

    // Handle Redis events
    this.redis.on('connect', () => {
      this.logger.log('Redis publisher connected');
    });

    this.subscriber.on('connect', () => {
      this.logger.log('Redis subscriber connected');
    });

    // Subscribe to global events channel
    this.subscriber.subscribe('events:global');
    this.subscriber.on('message', (channel: string, message: string) => {
      if (channel === 'events:global') {
        this.handleRemoteEvent(message);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber.unsubscribe();
    await this.subscriber.quit();
    await this.redis.quit();
  }

  setKernel(kernel: IKernel): void {
    this.kernel = kernel;
  }

  async initialize(): Promise<void> {
    this.logger.log('Event bus (Redis) initialized');
  }

  /**
   * Emit an event to all subscribers (local and remote)
   */
  async emit<T = any>(
    event: string,
    payload: T,
    metadata?: Partial<EventMetadata>,
  ): Promise<void> {
    // Build full metadata
    const fullMetadata: EventMetadata = {
      eventId: this.generateEventId(),
      timestamp: Date.now(),
      tenantId: this.kernel?.tenant?.getCurrentContext()?.id,
      ...metadata,
    };

    // Store event in Redis stream for persistence
    const storedEvent: StoredEvent = {
      id: fullMetadata.eventId,
      event,
      payload,
      metadata: fullMetadata,
      createdAt: Date.now(),
      retryCount: 0,
    };

    // Persist to Redis
    await this.persistEvent(storedEvent);

    // Publish to Redis pub/sub for distributed propagation
    await this.redis.publish('events:global', JSON.stringify({
      event,
      payload,
      metadata: fullMetadata,
    }));

    // Process locally immediately
    await this.processLocalEvent(event, payload, fullMetadata);

    this.eventCounter++;
  }

  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, handler: EventHandler<T>): Subscription {
    return this.subscribe(event, handler, false);
  }

  /**
   * Subscribe once to an event
   */
  once<T = any>(event: string, handler: EventHandler<T>): Subscription {
    return this.subscribe(event, handler, true);
  }

  /**
   * Unsubscribe from an event
   */
  off(subscription: Subscription): void {
    subscription.unsubscribe();
  }

  /**
   * Wait for an event (async)
   */
  waitFor<T = any>(event: string, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = timeout
        ? setTimeout(() => {
            subscription.unsubscribe();
            reject(new Error(`Timeout waiting for event: ${event}`));
          }, timeout)
        : null;

      const subscription = this.once<T>(event, (payload) => {
        if (timer) clearTimeout(timer);
        resolve(payload);
      });
    });
  }

  /**
   * Subscribe to multiple events with a single handler
   */
  onMany<T = any>(events: string[], handler: EventHandler<T>): Subscription {
    const subscriptions: Subscription[] = [];

    for (const event of events) {
      subscriptions.push(this.on(event, handler));
    }

    return {
      unsubscribe: () => {
        for (const sub of subscriptions) {
          sub.unsubscribe();
        }
      },
    };
  }

  /**
   * Emit event and wait for first response
   */
  async emitAndWait<TRequest, TResponse>(
    event: string,
    payload: TRequest,
    responseEvent: string,
    timeout?: number,
  ): Promise<TResponse> {
    const waitPromise = this.waitFor<TResponse>(responseEvent, timeout);
    await this.emit(event, payload);
    return waitPromise;
  }

  /**
   * Get event statistics
   */
  getStats(): EventStats {
    const stats: EventStats = {
      totalEvents: this.eventCounter,
      activeSubscriptions: 0,
      eventsByType: {},
      queueSize: 0,
    };

    for (const [event, subs] of this.subscriptions) {
      stats.activeSubscriptions += subs.length;
      stats.eventsByType[event] = subs.length;
    }

    return stats;
  }

  /**
   * Replay events from history
   */
  async replayEvents(
    event: string,
    fromTimestamp: number,
    toTimestamp?: number,
  ): Promise<number> {
    const streamKey = `events:stream:${event}`;
    const end = toTimestamp || '+'; // '+' means latest

    // Read events from Redis stream
    const events = await this.redis.xrange(
      streamKey,
      fromTimestamp,
      end as string,
    );

    let replayed = 0;

    for (const [, fields] of events) {
      const data = fields.find((f: string) => f === 'data');
      if (data) {
        const storedEvent: StoredEvent = JSON.parse(data);

        // Re-emit locally (don't publish to Redis again)
        await this.processLocalEvent(
          storedEvent.event,
          storedEvent.payload,
          storedEvent.metadata,
        );

        replayed++;
      }
    }

    this.logger.log(`Replayed ${replayed} events for ${event}`);
    return replayed;
  }

  /**
   * Get dead letter queue events
   */
  async getDeadLetterEvents(event?: string, limit = 100): Promise<StoredEvent[]> {
    const key = event ? `events:dlq:${event}` : 'events:dlq:all';
    const events = await this.redis.lrange(key, 0, limit - 1);
    return events.map((e) => JSON.parse(e));
  }

  /**
   * Retry dead letter event
   */
  async retryDeadLetter(eventId: string): Promise<boolean> {
    // Find in DLQ
    const dlqKeys = await this.redis.keys('events:dlq:*');

    for (const key of dlqKeys) {
      const events = await this.redis.lrange(key, 0, -1);

      for (let i = 0; i < events.length; i++) {
        const stored: StoredEvent = JSON.parse(events[i]);

        if (stored.id === eventId) {
          // Remove from DLQ
          await this.redis.lrem(key, 0, events[i]);

          // Re-emit
          await this.emit(stored.event, stored.payload, stored.metadata);

          this.logger.log(`Retried dead letter event: ${eventId}`);
          return true;
        }
      }
    }

    return false;
  }

  // Private methods

  private subscribe<T = any>(
    event: string,
    handler: EventHandler<T>,
    once: boolean,
  ): Subscription {
    const id = this.generateSubscriptionId();

    const subscription: EventSubscription<T> = {
      id,
      event,
      handler,
      once,
      retryCount: 0,
    };

    const subs = this.subscriptions.get(event) || [];
    subs.push(subscription);
    this.subscriptions.set(event, subs);

    // Track local handler for this event
    if (!this.localHandlers.has(event)) {
      this.localHandlers.set(event, new Set());
    }
    this.localHandlers.get(event)!.add(id);

    this.logger.debug(`Subscribed to event: ${event} (id: ${id})`);

    return {
      unsubscribe: () => {
        this.unsubscribeById(event, id);
      },
    };
  }

  private unsubscribeById(event: string, id: string): void {
    const subs = this.subscriptions.get(event) || [];
    const filtered = subs.filter((s) => s.id !== id);

    if (filtered.length === 0) {
      this.subscriptions.delete(event);
    } else {
      this.subscriptions.set(event, filtered);
    }

    // Remove from local handlers
    this.localHandlers.get(event)?.delete(id);

    this.logger.debug(`Unsubscribed from event: ${event} (id: ${id})`);
  }

  private async persistEvent(storedEvent: StoredEvent): Promise<void> {
    const streamKey = `events:stream:${storedEvent.event}`;

    // Add to Redis stream with 7-day retention
    await this.redis.xadd(
      streamKey,
      '*', // Auto-generate ID
      'data',
      JSON.stringify(storedEvent),
    );

    // Trim old events (keep 7 days)
    await this.redis.expire(streamKey, 7 * 24 * 3600);
  }

  private async handleRemoteEvent(message: string): Promise<void> {
    try {
      const { event, payload, metadata } = JSON.parse(message);

      // Only process if we have local subscribers
      if (this.localHandlers.has(event)) {
        await this.processLocalEvent(event, payload, metadata);
      }
    } catch (error: any) {
      this.logger.error('Failed to process remote event:', error);
    }
  }

  private async processLocalEvent(
    event: string,
    payload: any,
    metadata: EventMetadata,
  ): Promise<void> {
    const subs = this.subscriptions.get(event) || [];

    if (subs.length === 0) {
      return;
    }

    this.logger.debug(`Processing event: ${event} (${subs.length} subscribers)`);

    // Process all subscribers concurrently with timeout
    await Promise.all(
      subs.map(async (sub) => {
        try {
          // Set tenant context for this handler
          if (metadata.tenantId) {
            this.kernel?.tenant.setContext(metadata.tenantId);
          }

          await this.executeWithTimeout(
            async () => { await sub.handler(payload, metadata); },
            this.EVENT_TIMEOUT,
          );

          // Clean up once subscriptions
          if (sub.once) {
            this.unsubscribeById(event, sub.id);
          }
        } catch (error) {
          await this.handleEventError(sub, event, payload, metadata, error);
        } finally {
          this.kernel?.tenant.clearContext();
        }
      }),
    );
  }

  private async handleEventError(
    sub: EventSubscription,
    event: string,
    payload: any,
    metadata: EventMetadata,
    error: any,
  ): Promise<void> {
    sub.retryCount++;

    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `Event handler failed for ${event} (attempt ${sub.retryCount}):`,
      errorMessage,
    );

    if (sub.retryCount < this.MAX_RETRIES) {
      // Retry with delay
      setTimeout(() => {
        this.processLocalEvent(event, payload, metadata).catch(() => {});
      }, this.RETRY_DELAY * sub.retryCount);
    } else {
      // Max retries reached - move to dead letter queue
      await this.moveToDeadLetter(event, payload, metadata, errorMessage);

      // Emit failure event
      await this.kernel?.events.emit('event.handler.failed', {
        event,
        handlerId: sub.id,
        error: errorMessage,
        payload,
        metadata,
      });

      // Clean up once subscriptions even on failure
      if (sub.once) {
        this.unsubscribeById(event, sub.id);
      }
    }
  }

  private async moveToDeadLetter(
    event: string,
    payload: any,
    metadata: EventMetadata,
    error: string,
  ): Promise<void> {
    const storedEvent: StoredEvent = {
      id: metadata.eventId,
      event,
      payload,
      metadata,
      createdAt: metadata.timestamp,
      processedAt: Date.now(),
      error,
      retryCount: this.MAX_RETRIES,
    };

    // Add to event-specific DLQ
    await this.redis.lpush(`events:dlq:${event}`, JSON.stringify(storedEvent));

    // Also add to global DLQ
    await this.redis.lpush('events:dlq:all', JSON.stringify(storedEvent));

    // Trim DLQs to prevent unbounded growth
    await this.redis.ltrim(`events:dlq:${event}`, 0, 999);
    await this.redis.ltrim('events:dlq:all', 0, 999);

    this.logger.warn(`Event moved to dead letter queue: ${event}`);
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event handler timeout after ${timeout}ms`));
      }, timeout);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${++this.eventCounter}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
