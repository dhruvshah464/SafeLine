import { SafeLinePlugin, PluginType } from './types';

export class PluginRegistry {
  private plugins: Map<string, SafeLinePlugin> = new Map();

  async register(plugin: SafeLinePlugin, config?: any): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered.`);
    }

    if (plugin.initialize) {
      await plugin.initialize(config);
    }

    this.plugins.set(plugin.name, plugin);
  }

  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return;

    if (plugin.teardown) {
      await plugin.teardown();
    }

    this.plugins.delete(pluginName);
  }

  getPlugin(pluginName: string): SafeLinePlugin | undefined {
    return this.plugins.get(pluginName);
  }

  getPluginsByType<T extends SafeLinePlugin>(type: PluginType): T[] {
    return Array.from(this.plugins.values()).filter(p => p.type === type) as T[];
  }

  getAllPlugins(): SafeLinePlugin[] {
    return Array.from(this.plugins.values());
  }
}

export const globalRegistry = new PluginRegistry();
