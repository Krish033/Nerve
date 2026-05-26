/**
 * Plugin UI Loader
 * 
 * Dynamically registers plugin UI components:
 * - Sidebar menus
 * - Dashboard widgets
 * - Settings pages
 * - Admin panels
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PluginInstance, PluginMenu, PluginWidget } from '../contracts';

interface RegisteredMenu extends PluginMenu {
  pluginId: string;
  pluginName: string;
}

export interface RegisteredWidget extends PluginWidget {
  pluginId: string;
  pluginName: string;
}

interface UIRegistrationEvent {
  type: 'menu' | 'widget' | 'settings' | 'page';
  action: 'register' | 'unregister';
  pluginId: string;
  data: any;
}

@Injectable()
export class PluginUILoader {
  private readonly logger = new Logger(PluginUILoader.name);
  private readonly menus = new Map<string, RegisteredMenu[]>();
  private readonly widgets = new Map<string, RegisteredWidget[]>();
  private readonly settings = new Map<string, any[]>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Load all UI components for a plugin
   */
  async loadPluginUI(instance: PluginInstance): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.log(`Loading UI for plugin ${instance.manifest.name}`);

      // Load menus
      if (instance.manifest.menus && instance.manifest.menus.length > 0) {
        await this.registerMenus(instance);
      }

      // Load widgets
      if (instance.manifest.widgets && instance.manifest.widgets.length > 0) {
        await this.registerWidgets(instance);
      }

      this.logger.log(`UI loaded for ${instance.manifest.name}`);
      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Unload all UI components for a plugin
   */
  async unloadPluginUI(pluginId: string): Promise<void> {
    this.logger.log(`Unloading UI for plugin ${pluginId}`);

    // Unregister menus
    this.unregisterMenus(pluginId);

    // Unregister widgets
    this.unregisterWidgets(pluginId);

    // Unregister settings
    this.settings.delete(pluginId);
  }

  /**
   * Get all registered menus
   */
  getMenus(): RegisteredMenu[] {
    const allMenus: RegisteredMenu[] = [];
    for (const menus of this.menus.values()) {
      allMenus.push(...menus);
    }
    return allMenus.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Get menus for a specific parent
   */
  getMenusByParent(parent?: string): RegisteredMenu[] {
    return this.getMenus().filter(menu => menu.parent === parent);
  }

  /**
   * Get all registered widgets
   */
  getWidgets(): RegisteredWidget[] {
    const allWidgets: RegisteredWidget[] = [];
    for (const widgets of this.widgets.values()) {
      allWidgets.push(...widgets);
    }
    return allWidgets;
  }

  /**
   * Get widgets by type
   */
  getWidgetsByType(type: string): RegisteredWidget[] {
    return this.getWidgets().filter(widget => widget.type === type);
  }

  /**
   * Get widgets for a plugin
   */
  getPluginWidgets(pluginId: string): RegisteredWidget[] {
    return this.widgets.get(pluginId) || [];
  }

  /**
   * Check if a menu is registered
   */
  isMenuRegistered(menuId: string): boolean {
    for (const menus of this.menus.values()) {
      if (menus.some(m => m.id === menuId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a widget is registered
   */
  isWidgetRegistered(widgetId: string): boolean {
    for (const widgets of this.widgets.values()) {
      if (widgets.some(w => w.id === widgetId)) {
        return true;
      }
    }
    return false;
  }

  // Private methods

  private async registerMenus(instance: PluginInstance): Promise<void> {
    const registeredMenus: RegisteredMenu[] = [];

    for (const menu of instance.manifest.menus || []) {
      // Check for ID conflicts
      if (this.isMenuRegistered(menu.id)) {
        this.logger.warn(`Menu ID conflict: ${menu.id} already registered`);
        continue;
      }

      const registeredMenu: RegisteredMenu = {
        ...menu,
        pluginId: instance.id,
        pluginName: instance.manifest.name,
      };

      registeredMenus.push(registeredMenu);
      this.logger.debug(`Registered menu: ${menu.id}`);
    }

    this.menus.set(instance.id, registeredMenus);

    // Emit UI update event
    this.emitUIEvent({
      type: 'menu',
      action: 'register',
      pluginId: instance.id,
      data: registeredMenus,
    });
  }

  private async registerWidgets(instance: PluginInstance): Promise<void> {
    const registeredWidgets: RegisteredWidget[] = [];

    for (const widget of instance.manifest.widgets || []) {
      // Check for ID conflicts
      if (this.isWidgetRegistered(widget.id)) {
        this.logger.warn(`Widget ID conflict: ${widget.id} already registered`);
        continue;
      }

      const registeredWidget: RegisteredWidget = {
        ...widget,
        pluginId: instance.id,
        pluginName: instance.manifest.name,
      };

      registeredWidgets.push(registeredWidget);
      this.logger.debug(`Registered widget: ${widget.id} (${widget.type})`);
    }

    this.widgets.set(instance.id, registeredWidgets);

    // Emit UI update event
    this.emitUIEvent({
      type: 'widget',
      action: 'register',
      pluginId: instance.id,
      data: registeredWidgets,
    });
  }

  private unregisterMenus(pluginId: string): void {
    const menus = this.menus.get(pluginId);
    if (menus) {
      this.menus.delete(pluginId);
      
      this.emitUIEvent({
        type: 'menu',
        action: 'unregister',
        pluginId,
        data: menus,
      });
      
      this.logger.debug(`Unregistered ${menus.length} menus for ${pluginId}`);
    }
  }

  private unregisterWidgets(pluginId: string): void {
    const widgets = this.widgets.get(pluginId);
    if (widgets) {
      this.widgets.delete(pluginId);
      
      this.emitUIEvent({
        type: 'widget',
        action: 'unregister',
        pluginId,
        data: widgets,
      });
      
      this.logger.debug(`Unregistered ${widgets.length} widgets for ${pluginId}`);
    }
  }

  private emitUIEvent(event: UIRegistrationEvent): void {
    this.eventEmitter.emit('plugin.ui.update', event);
    this.logger.debug(`UI event emitted: ${event.type} ${event.action}`);
  }
}
