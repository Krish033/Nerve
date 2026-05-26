/**
 * EVENT BUS
 * 
 * Centralized pub/sub system for decoupled module communication.
 * All inter-module communication MUST go through the event bus.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IEventBus,
  IKernel,
  EventHandler,
  EventMetadata,
  Subscription,
} from '../contracts/module.contract';

interface EventSubscription<T = any> {
  id: string;
  event: string;
  handler: EventHandler<T>;
  once: boolean;
}

interface QueuedEvent {
  event: string;
  payload: any;
  metadata: EventMetadata;
}

@Injectable()
export class EventBus implements IEventBus {
  private readonly logger = new Logger(EventBus.name);
  private kernel: IKernel | undefined;
  private subscriptions = new Map<string, EventSubscription[]>();
  private eventQueue: QueuedEvent[] = [];
  private processing = false;
  private eventCounter = 0;

  // Configuration
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly ASYNC_TIMEOUT = 5000;

  setKernel(kernel: IKernel): void {
    this.kernel = kernel;
  }

  async initialize(): Promise<void> {
    this.logger.log('Event bus initialized');
  }

  /**
   * Emit an event to all subscribers
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

    // Queue event for processing
    this.queueEvent(event, payload, fullMetadata);

    // Process queue
    await this.processQueue();
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
    // The subscription object has the unsubscribe method
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
      queueSize: this.eventQueue.length,
    };

    for (const [event, subs] of this.subscriptions) {
      stats.activeSubscriptions += subs.length;
      stats.eventsByType[event] = subs.length;
    }

    return stats;
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
    };

    const subs = this.subscriptions.get(event) || [];
    subs.push(subscription);
    this.subscriptions.set(event, subs);

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

    this.logger.debug(`Unsubscribed from event: ${event} (id: ${id})`);
  }

  private queueEvent(
    event: string,
    payload: any,
    metadata: EventMetadata,
  ): void {
    // Prevent queue overflow
    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      this.logger.warn(`Event queue overflow, dropping event: ${event}`);
      return;
    }

    this.eventQueue.push({ event, payload, metadata });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    if (this.eventQueue.length === 0) return;

    this.processing = true;

    try {
      while (this.eventQueue.length > 0) {
        const queuedEvent = this.eventQueue.shift();
        if (!queuedEvent) continue;

        await this.processEvent(
          queuedEvent.event,
          queuedEvent.payload,
          queuedEvent.metadata,
        );
      }
    } finally {
      this.processing = false;
    }
  }

  private async processEvent(
    event: string,
    payload: any,
    metadata: EventMetadata,
  ): Promise<void> {
    const subs = this.subscriptions.get(event) || [];

    if (subs.length === 0) {
      this.logger.debug(`No subscribers for event: ${event}`);
      return;
    }

    this.logger.debug(
      `Processing event: ${event} (${subs.length} subscribers)`,
    );

    // Process all subscribers concurrently with timeout
    const promises = subs.map(async (sub) => {
      try {
        // Set tenant context for this handler
        if (metadata.tenantId) {
          this.kernel?.tenant.setContext(metadata.tenantId);
        }

        await this.executeWithTimeout(
          async () => { await sub.handler(payload, metadata); },
          this.ASYNC_TIMEOUT,
        );

        // Clean up once subscriptions
        if (sub.once) {
          this.unsubscribeById(event, sub.id);
        }
      } catch (error) {
        this.logger.error(
          `Event handler failed for ${event}:`,
          error as Error,
        );
      } finally {
        this.kernel?.tenant.clearContext();
      }
    });

    await Promise.all(promises);
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

/**
 * Event Statistics
 */
export interface EventStats {
  totalEvents: number;
  activeSubscriptions: number;
  eventsByType: Record<string, number>;
  queueSize: number;
}
