// src/store/pluginsStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IPlugin, IPluginWidget, IPluginContext } from '../types/plugins';
import { ModuleType } from '../types/modules';

// Глобальный реестр оригинальных плагинов (с методами)
let globalPluginRegistry: Map<string, IPlugin> = new Map();

export const setPluginRegistry = (plugins: IPlugin[]) => {
  globalPluginRegistry.clear();
  plugins.forEach(plugin => {
    globalPluginRegistry.set(plugin.id, plugin);
  });
  console.log('📦 Global plugin registry updated:', Array.from(globalPluginRegistry.keys()));
};

// Тип для сохранённого состояния плагина
interface StoredPluginState {
  id: string;
  enabled: boolean;
  settings: Record<string, any>;
}

interface PluginsState {
  // Храним только ID плагинов, которые активны
  activePluginIds: Set<string>;
  // Храним настройки отдельно
  pluginSettings: Map<string, Record<string, any>>;
  // Контексты активных плагинов
  activePluginContexts: Map<string, IPluginContext>;
  pluginData: Record<string, any>;
  
  // Получить плагин с применением сохранённого состояния
  getPlugin: (pluginId: string) => IPlugin | undefined;
  getPluginsByModule: (moduleId: ModuleType) => IPlugin[];
  getActivePluginsByModule: (moduleId: ModuleType) => IPlugin[];
  
  // Управление состоянием
  setPluginEnabled: (pluginId: string, enabled: boolean) => void;
  updatePluginSettings: (pluginId: string, settings: Record<string, any>) => void;
  
  // Управление активацией
  activatePlugin: (pluginId: string, context?: IPluginContext) => void;
  deactivatePlugin: (pluginId: string) => void;
  togglePlugin: (pluginId: string, context?: IPluginContext) => void;
  isPluginActive: (pluginId: string) => boolean;
  
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
  
  // Принудительное восстановление
  rehydrate: () => void;
}

export const usePluginsStore = create<PluginsState>()(
  persist(
    (set, get) => ({
      activePluginIds: new Set<string>(),
      pluginSettings: new Map<string, Record<string, any>>(),
      activePluginContexts: new Map(),
      pluginData: {},
      
      // ✅ Возвращаем оригинальный плагин из реестра (не копию!)
      getPlugin: (pluginId) => {
        const originalPlugin = globalPluginRegistry.get(pluginId);
        if (!originalPlugin) {
          console.warn(`⚠️ Plugin not found in registry: ${pluginId}`);
          return undefined;
        }
        
        const savedSettings = get().pluginSettings.get(pluginId);
        const isActive = get().activePluginIds.has(pluginId);
        
        // ✅ Не копируем объект, а обновляем его свойства напрямую
        // Так сохраняется ссылка на оригинальный объект с методами
        originalPlugin.enabled = isActive;
        if (savedSettings) {
          originalPlugin.settings = {
            ...originalPlugin.settings,
            ...savedSettings,
          };
        }
        
        return originalPlugin;
      },
      
      getPluginsByModule: (moduleId) => {
        const plugins: IPlugin[] = [];
        for (const plugin of globalPluginRegistry.values()) {
          if (plugin.moduleId === moduleId) {
            const enriched = get().getPlugin(plugin.id);
            if (enriched) plugins.push(enriched);
          }
        }
        console.log(`🔍 getPluginsByModule(${moduleId}): found ${plugins.length} plugins`);
        return plugins;
      },
      
      getActivePluginsByModule: (moduleId) => {
        return get().getPluginsByModule(moduleId).filter(p => p.enabled);
      },
      
      setPluginEnabled: (pluginId, enabled) => {
        console.log(`📝 setPluginEnabled: ${pluginId} -> ${enabled}`);
        set((state) => {
          const newActiveIds = new Set(state.activePluginIds);
          if (enabled) {
            newActiveIds.add(pluginId);
          } else {
            newActiveIds.delete(pluginId);
          }
          return { activePluginIds: newActiveIds };
        });
      },
      
      updatePluginSettings: (pluginId, settings) => {
        console.log(`📝 updatePluginSettings: ${pluginId}`, settings);
        set((state) => {
          const newSettings = new Map(state.pluginSettings);
          const existing = newSettings.get(pluginId) || {};
          newSettings.set(pluginId, { ...existing, ...settings });
          return { pluginSettings: newSettings };
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
        console.log(`   Plugin has execute method: ${typeof plugin.execute === 'function'}`);
        
        if (plugin.onActivate && context) {
          plugin.onActivate(context);
        }
        
        get().setPluginEnabled(pluginId, true);
        
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
        
        if (plugin.onDeactivate) {
          const context = get().activePluginContexts.get(pluginId);
          plugin.onDeactivate(context);
        }
        
        get().setPluginEnabled(pluginId, false);
        
        set((state) => {
          const newContexts = new Map(state.activePluginContexts);
          newContexts.delete(pluginId);
          return { activePluginContexts: newContexts };
        });
        
        console.log(`✅ Plugin deactivated: ${pluginId}`);
      },
      
      togglePlugin: (pluginId, context) => {
        const plugin = get().getPlugin(pluginId);
        console.log(`🔄 Toggle plugin: ${pluginId}, current: ${plugin?.enabled}`);
        if (plugin?.enabled) {
          get().deactivatePlugin(pluginId);
        } else {
          get().activatePlugin(pluginId, context);
        }
      },
      
      isPluginActive: (pluginId) => {
        return get().activePluginIds.has(pluginId);
      },
      
      // ✅ Выполнение действия — используем оригинальный плагин
      executePluginAction: (pluginId, action, data) => {
        const plugin = get().getPlugin(pluginId);
        if (!plugin) {
          console.error(`❌ executePluginAction: Plugin not found: ${pluginId}`);
          return null;
        }
        if (!plugin.enabled) {
          console.warn(`⚠️ executePluginAction: Plugin not active: ${pluginId}`);
          return null;
        }
        if (typeof plugin.execute !== 'function') {
          console.error(`❌ executePluginAction: Plugin.execute is not a function for ${pluginId}`);
          console.log('   Plugin object:', plugin);
          return null;
        }
        
        const context = get().activePluginContexts.get(pluginId);
        return plugin.execute(action, data, context);
      },
      
      executeOnModule: (moduleId, action, data) => {
        const activePlugins = get().getActivePluginsByModule(moduleId);
        console.log(`🎯 executeOnModule: ${moduleId}, action: ${action}, plugins: ${activePlugins.length}`);
        
        const results: any[] = [];
        activePlugins.forEach(plugin => {
          if (typeof plugin.execute === 'function') {
            const context = get().activePluginContexts.get(plugin.id);
            const result = plugin.execute(action, data, context);
            if (result !== undefined && result !== null) {
              results.push(result);
            }
          } else {
            console.error(`❌ Plugin ${plugin.id} has no execute method!`);
            console.log('   Plugin:', plugin);
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
      
      rehydrate: () => {
        console.log('🔄 Manual rehydrate called');
        const state = usePluginsStore.getState();
        console.log('📦 Current activePluginIds:', Array.from(state.activePluginIds));
        console.log('📦 Current pluginSettings:', Array.from(state.pluginSettings.entries()));
        
        // Принудительно обновляем enabled для всех активных плагинов
        for (const id of state.activePluginIds) {
          const plugin = globalPluginRegistry.get(id);
          if (plugin) {
            plugin.enabled = true;
            console.log(`✅ Restored enabled state for ${id}`);
          }
        }
      },
    }),
    {
      name: 'plugins-storage',
      partialize: (state) => ({
        activePluginIds: Array.from(state.activePluginIds),
        pluginSettings: Array.from(state.pluginSettings.entries()),
        pluginData: state.pluginData,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('❌ Failed to rehydrate plugins store:', error);
        } else if (state) {
          console.log('🔄 Plugins store rehydrated from storage');
          
          // Восстанавливаем Set из массива
          const activeIds = (state as any).activePluginIds;
          if (activeIds && Array.isArray(activeIds)) {
            (state as any).activePluginIds = new Set(activeIds);
            console.log('📦 Restored activePluginIds:', activeIds);
          }
          
          // Восстанавливаем Map из массива
          const settingsArr = (state as any).pluginSettings;
          if (settingsArr && Array.isArray(settingsArr)) {
            (state as any).pluginSettings = new Map(settingsArr);
            console.log('📦 Restored pluginSettings:', settingsArr.length);
          }
          
          // ✅ Обновляем enabled для всех активных плагинов в реестре
          setTimeout(() => {
            const activeIdsList = (state as any).activePluginIds;
            if (activeIdsList) {
              for (const id of activeIdsList) {
                const plugin = globalPluginRegistry.get(id);
                if (plugin) {
                  plugin.enabled = true;
                  console.log(`✅ Synced enabled state for ${id}`);
                }
              }
            }
            
            // Проверяем execute метод
            for (const [id, plugin] of globalPluginRegistry.entries()) {
              if (typeof plugin.execute === 'function') {
                console.log(`✅ Plugin ${id}: execute method OK`);
              } else {
                console.error(`❌ Plugin ${id}: execute method MISSING!`);
              }
            }
          }, 100);
        }
      },
    }
  )
);

// // src/store/pluginsStore.ts

// import { create } from 'zustand';
// import { persist } from 'zustand/middleware';
// import { IPlugin, IPluginWidget, IPluginContext } from '../types/plugins';
// import { ModuleType } from '../types/modules';

// // Глобальный реестр оригинальных плагинов
// let globalPluginRegistry: IPlugin[] = [];

// export const setPluginRegistry = (plugins: IPlugin[]) => {
//   globalPluginRegistry = plugins;
// };

// interface PluginsState {
//   pluginStates: Map<string, { enabled: boolean; settings: Record<string, any> }>;
//   activePluginContexts: Map<string, IPluginContext>;
//   pluginData: Record<string, any>;
  
//   getPlugin: (pluginId: string) => IPlugin | undefined;
//   getPluginsByModule: (moduleId: ModuleType) => IPlugin[];
//   getActivePluginsByModule: (moduleId: ModuleType) => IPlugin[];
  
//   setPluginEnabled: (pluginId: string, enabled: boolean) => void;
//   updatePluginSettings: (pluginId: string, settings: Record<string, any>) => void;
  
//   activatePlugin: (pluginId: string, context?: IPluginContext) => void;
//   deactivatePlugin: (pluginId: string) => void;
//   togglePlugin: (pluginId: string, context?: IPluginContext) => void;
//   isPluginActive: (pluginId: string) => boolean;
  
//   executePluginAction: (pluginId: string, action: string, data?: any) => any;
//   executeOnModule: (moduleId: ModuleType, action: string, data?: any) => any[];
  
//   emitModuleEvent: (moduleId: ModuleType, event: string, data?: any) => void;
  
//   getWidgetsByModule: (moduleId: ModuleType) => IPluginWidget[];
  
//   getPluginData: (pluginId: string) => any;
//   setPluginData: (pluginId: string, data: any) => void;
// }

// const getPluginWithState = (
//   pluginId: string,
//   pluginStates: Map<string, { enabled: boolean; settings: Record<string, any> }>
// ): IPlugin | undefined => {
//   // ✅ Находим оригинальный плагин в глобальном реестре
//   const originalPlugin = globalPluginRegistry.find(p => p.id === pluginId);
//   if (!originalPlugin) {
//     console.warn(`⚠️ Original plugin not found: ${pluginId}`);
//     return undefined;
//   }
  
//   // Получаем сохранённое состояние
//   const state = pluginStates.get(pluginId);
//   if (!state) {
//     // Если состояния нет, возвращаем оригинальный плагин без изменений
//     return originalPlugin;
//   }
  
//   // ✅ Возвращаем оригинальный плагин с применённым состоянием
//   // Важно: сохраняем все методы (execute, onActivate и т.д.) из оригинального плагина
//   return {
//     ...originalPlugin,
//     enabled: state.enabled,
//     settings: { ...originalPlugin.settings, ...state.settings },
//     // Сохраняем ссылки на методы из оригинального плагина
//     execute: originalPlugin.execute,
//     onActivate: originalPlugin.onActivate,
//     onDeactivate: originalPlugin.onDeactivate,
//     onModuleEvent: originalPlugin.onModuleEvent,
//     widget: originalPlugin.widget,
//   };
// };

// export const usePluginsStore = create<PluginsState>()(
//   persist(
//     (set, get) => ({
//       pluginStates: new Map(),
//       activePluginContexts: new Map(),
//       pluginData: {},
      
//       getPlugin: (pluginId) => {
//         return getPluginWithState(pluginId, get().pluginStates);
//       },
      
//       getPluginsByModule: (moduleId) => {
//         const state = get();
//         // ✅ Используем глобальный реестр для получения списка плагинов модуля
//         const modulePlugins = globalPluginRegistry.filter(p => p.moduleId === moduleId);
        
//         return modulePlugins
//           .map(p => getPluginWithState(p.id, state.pluginStates))
//           .filter((p): p is IPlugin => p !== undefined);
//       },
      
//       getActivePluginsByModule: (moduleId) => {
//         return get().getPluginsByModule(moduleId).filter(p => p.enabled);
//       },
      
//       setPluginEnabled: (pluginId, enabled) => {
//         set((state) => {
//           const newStates = new Map(state.pluginStates);
//           const existing = newStates.get(pluginId) || { enabled: false, settings: {} };
//           newStates.set(pluginId, { ...existing, enabled });
//           return { pluginStates: newStates };
//         });
//       },
      
//       updatePluginSettings: (pluginId, settings) => {
//         set((state) => {
//           const newStates = new Map(state.pluginStates);
//           const existing = newStates.get(pluginId) || { enabled: false, settings: {} };
//           newStates.set(pluginId, {
//             ...existing,
//             settings: { ...existing.settings, ...settings },
//           });
//           return { pluginStates: newStates };
//         });
//       },
      
//       activatePlugin: (pluginId, context) => {
//         const plugin = get().getPlugin(pluginId);
//         if (!plugin) {
//           console.error(`❌ Plugin not found: ${pluginId}`);
//           return;
//         }
//         if (plugin.enabled) {
//           console.log(`⚠️ Plugin already active: ${pluginId}`);
//           return;
//         }
        
//         console.log(`🔌 Activating plugin: ${pluginId}`);
        
//         // ✅ Вызываем onActivate у плагина (метод из оригинального объекта)
//         if (plugin.onActivate && context) {
//           plugin.onActivate(context);
//         }
        
//         get().setPluginEnabled(pluginId, true);
        
//         if (context) {
//           set((state) => ({
//             activePluginContexts: new Map(state.activePluginContexts).set(pluginId, context),
//           }));
//         }
        
//         console.log(`✅ Plugin activated: ${pluginId}`);
//       },
      
//       deactivatePlugin: (pluginId) => {
//         const plugin = get().getPlugin(pluginId);
//         if (!plugin) {
//           console.error(`❌ Plugin not found: ${pluginId}`);
//           return;
//         }
//         if (!plugin.enabled) {
//           console.log(`⚠️ Plugin already inactive: ${pluginId}`);
//           return;
//         }
        
//         console.log(`🔌 Deactivating plugin: ${pluginId}`);
        
//         // ✅ Вызываем onDeactivate у плагина (метод из оригинального объекта)
//         if (plugin.onDeactivate) {
//           const context = get().activePluginContexts.get(pluginId);
//           plugin.onDeactivate(context);
//         }
        
//         get().setPluginEnabled(pluginId, false);
        
//         set((state) => {
//           const newContexts = new Map(state.activePluginContexts);
//           newContexts.delete(pluginId);
//           return { activePluginContexts: newContexts };
//         });
        
//         console.log(`✅ Plugin deactivated: ${pluginId}`);
//       },
      
//       togglePlugin: (pluginId, context) => {
//         const plugin = get().getPlugin(pluginId);
//         if (plugin?.enabled) {
//           get().deactivatePlugin(pluginId);
//         } else {
//           get().activatePlugin(pluginId, context);
//         }
//       },
      
//       isPluginActive: (pluginId) => {
//         const plugin = get().getPlugin(pluginId);
//         return plugin?.enabled || false;
//       },
      
//       executePluginAction: (pluginId, action, data) => {
//         const plugin = get().getPlugin(pluginId);
//         // ✅ Проверяем наличие метода execute
//         if (plugin && plugin.enabled && typeof plugin.execute === 'function') {
//           const context = get().activePluginContexts.get(pluginId);
//           return plugin.execute(action, data, context);
//         }
//         console.warn(`⚠️ Cannot execute ${action} on ${pluginId}: execute method not found or plugin disabled`);
//         return null;
//       },
      
//       executeOnModule: (moduleId, action, data) => {
//         const activePlugins = get().getActivePluginsByModule(moduleId);
//         const results: any[] = [];
//         activePlugins.forEach(plugin => {
//           // ✅ Проверяем наличие метода execute
//           if (typeof plugin.execute === 'function') {
//             const context = get().activePluginContexts.get(plugin.id);
//             const result = plugin.execute(action, data, context);
//             if (result !== undefined && result !== null) {
//               results.push(result);
//             }
//           } else {
//             console.warn(`⚠️ Plugin ${plugin.id} has no execute method`);
//           }
//         });
//         return results;
//       },
      
//       emitModuleEvent: (moduleId, event, data) => {
//         const activePlugins = get().getActivePluginsByModule(moduleId);
//         activePlugins.forEach(plugin => {
//           if (plugin.onModuleEvent && typeof plugin.onModuleEvent === 'function') {
//             const context = get().activePluginContexts.get(plugin.id);
//             plugin.onModuleEvent(event, data, context);
//           }
//         });
//       },
      
//       getWidgetsByModule: (moduleId) => {
//         const activePlugins = get().getActivePluginsByModule(moduleId);
//         const widgets: IPluginWidget[] = [];
        
//         activePlugins.forEach(plugin => {
//           if (plugin.widget) {
//             widgets.push({
//               ...plugin.widget,
//               pluginId: plugin.id,
//             });
//           }
//         });
        
//         return widgets.sort((a, b) => (a.order || 999) - (b.order || 999));
//       },
      
//       getPluginData: (pluginId) => {
//         return get().pluginData[pluginId];
//       },
      
//       setPluginData: (pluginId, data) => {
//         set((state) => ({
//           pluginData: {
//             ...state.pluginData,
//             [pluginId]: data,
//           },
//         }));
//       },
//     }),
//     {
//       name: 'plugins-storage',
//       partialize: (state) => ({
//         // ✅ Сохраняем только состояния (enabled и settings)
//         pluginStates: Array.from(state.pluginStates.entries()),
//         pluginData: state.pluginData,
//       }),
//       onRehydrateStorage: () => (state) => {
//         if (state && (state as any).pluginStates) {
//           const restored = new Map((state as any).pluginStates);
//           (state as any).pluginStates = restored;
//           console.log('🔄 Plugins store rehydrated, states:', Array.from(restored.entries()));
          
//           // ✅ Логируем восстановленные плагины для отладки
//           const typedRestored = restored as Map<string, { enabled: boolean; settings: Record<string, any> }>;
//             typedRestored.forEach((value, key) => {
//               console.log(`  - ${key}: enabled=${value.enabled}`);
//             });
//           }
//       },
//     }
//   )
// );
