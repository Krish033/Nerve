/**
 * Plugin Event Bus Integration
 * 
 * Provides safe event subscription and emission for plugins:
 * - Isolated event namespaces
 * - Automatic cleanup on disable
 * - Event rate limiting
 * - Listener leak prevention
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PluginInstance, PluginEvent } from '../contracts';
import { PluginDiagnostics } from '../diagnostics/plugin-diagnostics';

interface RegisteredListener {
  pluginId: string;
  event: string;
  handler: (payload: unknown) => void | Promise<void>;
  options?: {
    once?: boolean;
    prepend?: boolean;
  };
}

interface EmittedEvent {
  name: string;
  payload: unknown;
  timestamp: Date;
  pluginId?: string;
}

@Injectable()
export class PluginEventBus {
  private readonly logger = new Logger(PluginEventBus.name);
  private readonly listeners = new Map<string, RegisteredListener[]>();
  private readonly eventHistory: EmittedEvent[] = [];
  private readonly maxHistory = 1000;
  private readonly rateLimits = new Map<string, { count: number; resetTime: number }>();
  private readonly rateLimitWindow = 60000; // 1 minute
  private readonly maxEventsPerWindow = 100;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly diagnostics: PluginDiagnostics,
  ) {}

  /**
   * Register plugin event subscriptions
   */
  async registerPluginEvents(instance: PluginInstance): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.debug(`Registering events for plugin ${instance.manifest.name}`);

      const registered: RegisteredListener[] = [];

      for (const event of instance.manifest.events.subscribes) {
        // Create namespaced event name
        const eventName = this.createNamespacedEvent(event.name);

        // Create handler wrapper
        const handler = this.createEventHandler(instance, event);

        // Register with event emitter
        this.eventEmitter.on(eventName, handler);

        registered.push({
          pluginId: instance.id,
          event: eventName,
          handler,
        });

        this.logger.debug(`Registered listener for event: ${eventName}`);
      }

      this.listeners.set(instance.id, registered);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Unregister all plugin event listeners
   */
  async unregisterPluginEvents(instance: PluginInstance): Promise<void> {
    const registered = this.listeners.get(instance.id);
    if (!registered) return;

    this.logger.debug(`Unregistering events for plugin ${instance.manifest.name}`);

    for (const listener of registered) {
      this.eventEmitter.off(listener.event, listener.handler);
      this.logger.debug(`Unregistered listener for event: ${listener.event}`);
    }

    this.listeners.delete(instance.id);
  }

  /**
   * Emit an event from a plugin
   */
  async emitEvent(
    pluginId: string,
    eventName: string,
    payload: unknown,
  ): Promise<{ success: boolean; error?: string }> {
    // Check rate limits
    if (this.isRateLimited(pluginId)) {
      return {
        success: false,
        error: 'Event rate limit exceeded',
      };
    }

    // Create namespaced event name
    const namespacedEvent = this.createNamespacedEvent(eventName);

    // Record emission
    this.recordEvent({
      name: namespacedEvent,
      payload,
      timestamp: new Date(),
      pluginId,
    });

    // Increment rate limit counter
    this.incrementRateLimit(pluginId);

    try {
      // Emit event
      this.eventEmitter.emit(namespacedEvent, {
        ...payload,
        _pluginId: pluginId,
        _timestamp: Date.now(),
      });

      return { success: true };
    } catch (error) {
      this.diagnostics.recordError(pluginId, 'event.emit', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get event history
   */
  getEventHistory(filter?: { pluginId?: string; eventName?: string }): EmittedEvent[] {
    let events = [...this.eventHistory];

    if (filter?.pluginId) {
      events = events.filter(e => e.pluginId === filter.pluginId);
    }

    if (filter?.eventName) {
      events = events.filter(e => e.name === filter.eventName);
    }

    return events;
  }

  /**
   * Get active listeners for a plugin
   */
  getPluginListeners(pluginId: string): RegisteredListener[] {
    return this.listeners.get(pluginId) || [];
  }

  /**
   * Get all active listeners
   */
  getAllListeners(): Map<string, RegisteredListener[]> {
    return new Map(this.listeners);
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory.length = 0;
  }

  // Private helpers

  private createNamespacedEvent(eventName: string): string {
    // Ensure event names are namespaced to prevent collisions
    // Core events use 'app.' prefix, plugin events use 'plugin.'
    if (eventName.startsWith('app.') || eventName.startsWith('plugin.')) {
      return eventName;
    }
    return `plugin.${eventName}`;
  }

  private createEventHandler(
    instance: PluginInstance,
    event: PluginEvent,
  ): (payload: unknown) => Promise<void> {
    return async (payload: unknown) => {
      const operationId = this.diagnostics.startOperation('event.handle', {
        pluginId: instance.id,
        eventName: event.name,
      });

      try {
        // TODO: In production, this would call the actual plugin handler
        // For now, just log the event reception
        this.logger.debug(
          `Plugin ${instance.manifest.name} received event ${event.name}`,
        );

        this.diagnostics.endOperation(operationId, { success: true });
      } catch (error) {
        this.diagnostics.recordError(
          instance.id,
          `event.${event.name}`,
          error as Error,
        );
        this.diagnostics.endOperation(operationId, {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
  }

  private isRateLimited(pluginId: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(pluginId);

    if (!limit) return false;

    // Reset if window expired
    if (now > limit.resetTime) {
      this.rateLimits.delete(pluginId);
      return false;
    }

    return limit.count >= this.maxEventsPerWindow;
  }

  private incrementRateLimit(pluginId: string): void {
    const now = Date.now();
    const limit = this.rateLimits.get(pluginId);

    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(pluginId, {
        count: 1,
        resetTime: now + this.rateLimitWindow,
      });
    } else {
      limit.count++;
    }
  }

  private recordEvent(event: EmittedEvent): void {
    this.eventHistory.push(event);

    // Keep only recent events
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }
  }
}
