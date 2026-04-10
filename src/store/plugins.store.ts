// src/store/pluginsStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IPlugin, IPluginWidget, IPluginContext } from '../types/plugins';
import { ModuleType } from '../types/modules';

// Глобальный реестр плагинов для восстановления
let globalPluginRegistry: IPlugin[] = [];

export const setPluginRegistry = (plugins: IPlugin[]) => {
  globalPluginRegistry = plugins;
};

interface PluginsState {
  plugins: IPlugin[];
  activePluginContexts: Map<string, IPluginContext>;
  pluginData: Record<string, any>;
  
  registerPlugin: (plugin: IPlugin) => void;
  registerPlugins: (plugins: IPlugin[]) => void;
  unregisterPlugin: (pluginId: string) => void;
  
  activatePlugin: (pluginId: string, context?: IPluginContext) => void;
  deactivatePlugin: (pluginId: string) => void;
  togglePlugin: (pluginId: string, context?: IPluginContext) => void;
  
  getPluginsByModule: (moduleId: ModuleType) => IPlugin[];
  getActivePluginsByModule: (moduleId: ModuleType) => IPlugin[];
  isPluginActive: (pluginId: string) => boolean;
  
  getPluginData: (pluginId: string) => any;
  setPluginData: (pluginId: string, data: any) => void;
  
  executePluginAction: (pluginId: string, action: string, data?: any) => any;
  executeOnModule: (moduleId: ModuleType, action: string, data?: any) => any[];
  
  updatePluginSettings: (pluginId: string, settings: Record<string, any>) => void;
  
  emitModuleEvent: (moduleId: ModuleType, event: string, data?: any) => void;
  
  getWidgetsByModule: (moduleId: ModuleType) => IPluginWidget[];
}

export const usePluginsStore = create<PluginsState>()(
  persist(
    (set, get) => ({
      plugins: [],
      activePluginContexts: new Map(),
      pluginData: {},
      
      registerPlugin: (plugin) => {
        console.log(`📝 registerPlugin called: ${plugin.id}, moduleId: ${plugin.moduleId}`);
        
        // Проверяем, что moduleId корректен
        if (!plugin.moduleId || (plugin.moduleId !== 'stopwatch' && plugin.moduleId !== 'microphone')) {
          console.error(`❌ Plugin ${plugin.id} has invalid moduleId: ${plugin.moduleId}`);
          return;
        }
        
        set((state) => {
          // Проверяем, нет ли уже такого плагина
          const exists = state.plugins.some(p => p.id === plugin.id);
          if (exists) {
            console.log(`  Plugin ${plugin.id} already exists, skipping`);
            return state;
          }
          return {
            plugins: [...state.plugins, plugin],
          };
        });
        console.log(`✅ Plugin registered: ${plugin.id} (${plugin.name}) for module ${plugin.moduleId}`);
      },
      
      registerPlugins: (plugins) => {
        console.log(`📝 registerPlugins called with ${plugins.length} plugins`);
        set((state) => {
          const newPlugins = plugins.filter(p => !state.plugins.some(existing => existing.id === p.id));
          console.log(`  Adding ${newPlugins.length} new plugins`);
          return {
            plugins: [...state.plugins, ...newPlugins],
          };
        });
      },
      
      unregisterPlugin: (pluginId) => {
        get().deactivatePlugin(pluginId);
        set((state) => ({
          plugins: state.plugins.filter(p => p.id !== pluginId),
          pluginData: Object.fromEntries(
            Object.entries(state.pluginData).filter(([key]) => key !== pluginId)
          ),
        }));
        console.log(`❌ Plugin unregistered: ${pluginId}`);
      },
      
      activatePlugin: (pluginId, context) => {
        const plugin = get().plugins.find(p => p.id === pluginId);
        if (!plugin) {
          console.error(`❌ Plugin not found: ${pluginId}`);
          return;
        }
        if (plugin.enabled) return;
        
        if (plugin.onActivate && context) {
          plugin.onActivate(context);
        }
        
        set((state) => ({
          plugins: state.plugins.map(p =>
            p.id === pluginId ? { ...p, enabled: true } : p
          ),
          activePluginContexts: context 
            ? new Map(state.activePluginContexts).set(pluginId, context)
            : new Map(state.activePluginContexts),
        }));
        
        console.log(`🔌 Plugin activated: ${pluginId}`);
      },
      
      deactivatePlugin: (pluginId) => {
        const plugin = get().plugins.find(p => p.id === pluginId);
        if (!plugin || !plugin.enabled) return;
        
        if (plugin.onDeactivate) {
          const context = get().activePluginContexts.get(pluginId);
          plugin.onDeactivate(context);
        }
        
        set((state) => {
          const newContexts = new Map(state.activePluginContexts);
          newContexts.delete(pluginId);
          return {
            plugins: state.plugins.map(p =>
              p.id === pluginId ? { ...p, enabled: false } : p
            ),
            activePluginContexts: newContexts,
          };
        });
        
        console.log(`🔌 Plugin deactivated: ${pluginId}`);
      },
      
      togglePlugin: (pluginId, context) => {
        const plugin = get().plugins.find(p => p.id === pluginId);
        if (plugin?.enabled) {
          get().deactivatePlugin(pluginId);
        } else {
          get().activatePlugin(pluginId, context);
        }
      },
      
      getPluginsByModule: (moduleId) => {
        const allPlugins = get().plugins;
        const filtered = allPlugins.filter(p => p.moduleId === moduleId);
        
        console.log(`🔍 getPluginsByModule(${moduleId}): total=${allPlugins.length}, filtered=${filtered.length}`);
        
        return filtered;
      },
      
      getActivePluginsByModule: (moduleId) => {
        return get().plugins.filter(p => p.moduleId === moduleId && p.enabled);
      },
      
      isPluginActive: (pluginId) => {
        const plugin = get().plugins.find(p => p.id === pluginId);
        return plugin?.enabled || false;
      },
      
      getPluginData: (pluginId) => {
        return get().pluginData[pluginId];
      },
      
      setPluginData: (pluginId, data) => {
        set((state) => ({
          pluginData: {
            ...state.pluginData,
            [pluginId]: data,
          },
        }));
      },
      
      executePluginAction: (pluginId, action, data) => {
        const plugin = get().plugins.find(p => p.id === pluginId);
        if (plugin && plugin.enabled) {
          const context = get().activePluginContexts.get(pluginId);
          return plugin.execute(action, data, context);
        }
        return null;
      },
      
      executeOnModule: (moduleId, action, data) => {
        const activePlugins = get().getActivePluginsByModule(moduleId);
        const results: any[] = [];
        activePlugins.forEach(plugin => {
          const context = get().activePluginContexts.get(plugin.id);
          const result = plugin.execute(action, data, context);
          if (result !== undefined && result !== null) {
            results.push(result);
          }
        });
        return results;
      },
      
      updatePluginSettings: (pluginId, settings) => {
        set((state) => ({
          plugins: state.plugins.map(p =>
            p.id === pluginId
              ? { ...p, settings: { ...p.settings, ...settings } }
              : p
          ),
        }));
      },
      
      emitModuleEvent: (moduleId, event, data) => {
        const activePlugins = get().getActivePluginsByModule(moduleId);
        activePlugins.forEach(plugin => {
          if (plugin.onModuleEvent) {
            const context = get().activePluginContexts.get(plugin.id);
            plugin.onModuleEvent(event, data, context);
          }
        });
      },
      
      getWidgetsByModule: (moduleId) => {
        const activePlugins = get().plugins.filter(p => p.moduleId === moduleId && p.enabled);
        const widgets: IPluginWidget[] = [];
        
        activePlugins.forEach(plugin => {
          if (plugin.widget) {
            widgets.push({
              ...plugin.widget,
              pluginId: plugin.id,
            });
          }
        });
        
        return widgets.sort((a, b) => (a.order || 999) - (b.order || 999));
      },
    }),
    {
      name: 'plugins-storage',
      // Сохраняем только то, что нужно
      partialize: (state) => ({
        pluginStates: state.plugins.map(p => ({
          id: p.id,
          enabled: p.enabled,
          settings: p.settings,
        })),
        pluginData: state.pluginData,
      }),
      // Восстанавливаем плагины из реестра
      onRehydrateStorage: () => (state) => {
        if (state && globalPluginRegistry.length > 0) {
          console.log('🔄 Rehydrating plugins from registry...');
          
          // Восстанавливаем плагины из глобального реестра
          const restoredPlugins = globalPluginRegistry.map(plugin => {
            const savedState = (state as any)?.pluginStates?.find((ps: any) => ps.id === plugin.id);
            if (savedState) {
              return {
                ...plugin,
                enabled: savedState.enabled,
                settings: { ...plugin.settings, ...savedState.settings },
              };
            }
            return plugin;
          });
          
          // Обновляем состояние
          setTimeout(() => {
            usePluginsStore.setState({ plugins: restoredPlugins });
            console.log(`✅ Rehydrated ${restoredPlugins.length} plugins`);
          }, 0);
        }
      },
    }
  )
);