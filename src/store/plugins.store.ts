// src/store/pluginsStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IPlugin, IPluginWidget, IPluginContext } from '../types/plugins';
import { ModuleType } from '../types/modules';

// Глобальный реестр оригинальных плагинов
let globalPluginRegistry: IPlugin[] = [];
let globalContextProvider: ((pluginId: string) => IPluginContext | undefined) | null = null;

export const setPluginRegistry = (plugins: IPlugin[]) => {
  globalPluginRegistry = plugins;
};

export const setGlobalContextProvider = (provider: (pluginId: string) => IPluginContext | undefined) => {
  globalContextProvider = provider;
};

interface PluginsState {
  pluginStates: Map<string, { enabled: boolean; settings: Record<string, any> }>;
  activePluginContexts: Map<string, IPluginContext>;
  pluginData: Record<string, any>;
  
  // Получить плагин с применением сохранённого состояния
  getPlugin: (pluginId: string) => IPlugin | undefined;
  getPluginsByModule: (moduleId: ModuleType) => IPlugin[];
  getActivePluginsByModule: (moduleId: ModuleType) => IPlugin[];
  
  // Управление состоянием
  setPluginEnabled: (pluginId: string, enabled: boolean) => void;
  updatePluginSettings: (pluginId: string, settings: Record<string, any>) => void;
  
  // Управление активацией (с контекстом и вызовом колбэков)
  activatePlugin: (pluginId: string, context?: IPluginContext) => void;
  deactivatePlugin: (pluginId: string) => void;
  togglePlugin: (pluginId: string, context?: IPluginContext) => void;
  isPluginActive: (pluginId: string) => boolean;
  
  // Восстановление контекстов для активных плагинов
  restoreActivePluginContexts: () => void;
  
  // Выполнение действий
  executePluginAction: (pluginId: string, action: string, data?: any) => any;
  executeOnModule: (moduleId: ModuleType, action: string, data?: any) => any[];
  
  // События
  emitModuleEvent: (moduleId: ModuleType, event: string, data?: any) => void;
  
  // Виджеты
  getWidgetsByModule: (moduleId: ModuleType) => IPluginWidget[];
  
  // Данные плагинов
  getPluginData: (pluginId: string) => any;
  setPluginData: (pluginId: string, data: any) => void;
}

// Вспомогательная функция для получения плагина с состоянием
const getPluginWithState = (
  pluginId: string,
  pluginStates: Map<string, { enabled: boolean; settings: Record<string, any> }>
): IPlugin | undefined => {
  const originalPlugin = globalPluginRegistry.find(p => p.id === pluginId);
  if (!originalPlugin) return undefined;
  
  const state = pluginStates.get(pluginId);
  if (!state) return originalPlugin;
  
  // Возвращаем копию плагина с применённым состоянием
  return {
    ...originalPlugin,
    enabled: state.enabled,
    settings: { ...originalPlugin.settings, ...state.settings },
  };
};

export const usePluginsStore = create<PluginsState>()(
  persist(
    (set, get) => ({
      pluginStates: new Map(),
      activePluginContexts: new Map(),
      pluginData: {},
      
      getPlugin: (pluginId) => {
        return getPluginWithState(pluginId, get().pluginStates);
      },
      
      getPluginsByModule: (moduleId) => {
        const state = get();
        return globalPluginRegistry
          .filter(p => p.moduleId === moduleId)
          .map(p => getPluginWithState(p.id, state.pluginStates)!)
          .filter(p => p !== undefined);
      },
      
      getActivePluginsByModule: (moduleId) => {
        return get().getPluginsByModule(moduleId).filter(p => p.enabled);
      },
      
      setPluginEnabled: (pluginId, enabled) => {
        set((state) => {
          const newStates = new Map(state.pluginStates);
          const existing = newStates.get(pluginId) || { enabled: false, settings: {} };
          newStates.set(pluginId, { ...existing, enabled });
          return { pluginStates: newStates };
        });
      },
      
      updatePluginSettings: (pluginId, settings) => {
        set((state) => {
          const newStates = new Map(state.pluginStates);
          const existing = newStates.get(pluginId) || { enabled: false, settings: {} };
          newStates.set(pluginId, {
            ...existing,
            settings: { ...existing.settings, ...settings },
          });
          return { pluginStates: newStates };
        });
      },
      
      activatePlugin: (pluginId, context) => {
        const plugin = get().getPlugin(pluginId);
        if (!plugin) {
          console.error(`❌ Plugin not found: ${pluginId}`);
          return;
        }
        if (plugin.enabled) {
          console.log(`⚠️ Plugin already active: ${pluginId}`);
          return;
        }
        
        console.log(`🔌 Activating plugin: ${pluginId}`);
        
        // Вызываем onActivate у плагина
        if (plugin.onActivate) {
          plugin.onActivate(context);
        }
        
        // Обновляем состояние
        get().setPluginEnabled(pluginId, true);
        
        // Сохраняем контекст
        if (context) {
          set((state) => ({
            activePluginContexts: new Map(state.activePluginContexts).set(pluginId, context),
          }));
        }
        
        console.log(`✅ Plugin activated: ${pluginId}`);
      },
      
      deactivatePlugin: (pluginId) => {
        const plugin = get().getPlugin(pluginId);
        if (!plugin) {
          console.error(`❌ Plugin not found: ${pluginId}`);
          return;
        }
        if (!plugin.enabled) {
          console.log(`⚠️ Plugin already inactive: ${pluginId}`);
          return;
        }
        
        console.log(`🔌 Deactivating plugin: ${pluginId}`);
        
        // Вызываем onDeactivate у плагина с контекстом, если он есть
        if (plugin.onDeactivate) {
          const context = get().activePluginContexts.get(pluginId);
          plugin.onDeactivate(context);
        }
        
        // Обновляем состояние
        get().setPluginEnabled(pluginId, false);
        
        // Удаляем контекст
        set((state) => {
          const newContexts = new Map(state.activePluginContexts);
          newContexts.delete(pluginId);
          return { activePluginContexts: newContexts };
        });
        
        console.log(`✅ Plugin deactivated: ${pluginId}`);
      },
      
      togglePlugin: (pluginId, context) => {
        const plugin = get().getPlugin(pluginId);
        console.log(`🔄 Toggle plugin: ${pluginId}, current state: ${plugin?.enabled}`);
        
        if (plugin?.enabled) {
          get().deactivatePlugin(pluginId);
        } else {
          get().activatePlugin(pluginId, context);
        }
      },
      
      isPluginActive: (pluginId) => {
        const plugin = get().getPlugin(pluginId);
        return plugin?.enabled || false;
      },
      
      // ✅ Восстанавливаем контексты для всех активных плагинов
      restoreActivePluginContexts: () => {
        if (!globalContextProvider) {
          console.warn('⚠️ No global context provider set');
          return;
        }
        
        const activePlugins = get().getPluginsByModule('stopwatch')
          .concat(get().getPluginsByModule('microphone'))
          .filter(p => p.enabled);
        
        console.log(`🔄 Restoring contexts for ${activePlugins.length} active plugins...`);
        
        activePlugins.forEach(plugin => {
          const context = globalContextProvider!(plugin.id);
          if (context) {
            set((state) => ({
              activePluginContexts: new Map(state.activePluginContexts).set(plugin.id, context),
            }));
            
            // Вызываем onActivate при восстановлении, если нужно
            if (plugin.onActivate) {
              plugin.onActivate(context);
            }
            
            console.log(`✅ Context restored for plugin: ${plugin.id}`);
          } else {
            console.warn(`⚠️ Could not restore context for plugin: ${plugin.id}`);
          }
        });
      },
      
      executePluginAction: (pluginId, action, data) => {
        const plugin = get().getPlugin(pluginId);
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
        const activePlugins = get().getActivePluginsByModule(moduleId);
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
    }),
    {
      name: 'plugins-storage',
      partialize: (state) => ({
        pluginStates: Array.from(state.pluginStates.entries()),
        pluginData: state.pluginData,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && (state as any).pluginStates) {
          const restored = new Map((state as any).pluginStates);
          (state as any).pluginStates = restored;
          console.log('🔄 Plugins store rehydrated, states:', Array.from(restored.entries()));
          
          // После восстановления вызываем restoreActivePluginContexts
          setTimeout(() => {
            const store = usePluginsStore.getState();
            store.restoreActivePluginContexts();
          }, 100);
        }
      },
    }
  )
);