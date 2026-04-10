import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IPlugin, IPluginContext } from '../types/plugins';
import { ModuleType } from '../types/modules';

interface PluginsState {
  // Состояние
  plugins: IPlugin[];
  activePluginContexts: Map<string, IPluginContext>;
  pluginData: Record<string, any>;
  
  // Регистрация
  registerPlugin: (plugin: IPlugin) => void;
  registerPlugins: (plugins: IPlugin[]) => void;
  unregisterPlugin: (pluginId: string) => void;
  
  // Управление активацией
  activatePlugin: (pluginId: string, context?: IPluginContext) => void;
  deactivatePlugin: (pluginId: string) => void;
  togglePlugin: (pluginId: string, context?: IPluginContext) => void;
  
  // Получение плагинов
  getPluginsByModule: (moduleId: ModuleType) => IPlugin[];
  getActivePluginsByModule: (moduleId: ModuleType) => IPlugin[];
  isPluginActive: (pluginId: string) => boolean;
  
  // Работа с данными плагинов
  getPluginData: (pluginId: string) => any;
  setPluginData: (pluginId: string, data: any) => void;
  
  // Выполнение действий
  executePluginAction: (pluginId: string, action: string, data?: any) => any;
  executeOnModule: (moduleId: ModuleType, action: string, data?: any) => any[];
  
  // Настройки
  updatePluginSettings: (pluginId: string, settings: Record<string, any>) => void;
  
  // События
  emitModuleEvent: (moduleId: ModuleType, event: string, data?: any) => void;
}

export const usePluginsStore = create<PluginsState>()(
  persist(
    (set, get) => ({
      plugins: [],
      activePluginContexts: new Map(),
      pluginData: {},
      
      registerPlugin: (plugin) => {
        set((state) => ({
          plugins: [...state.plugins, plugin],
        }));
        console.log(`✅ Plugin registered: ${plugin.id} (${plugin.name})`);
      },
      
      registerPlugins: (plugins) => {
        set((state) => ({
          plugins: [...state.plugins, ...plugins],
        }));
        console.log(`✅ Registered ${plugins.length} plugins`);
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
        if (!plugin || plugin.enabled) return;
        
        // ✅ context может быть undefined, это ок
        if (plugin.onActivate) {
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
        return get().plugins.filter(p => p.moduleId === moduleId);
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
    }),
    {
      name: 'plugins-storage',
      partialize: (state) => ({
        plugins: state.plugins.map(p => ({
          id: p.id,
          enabled: p.enabled,
          settings: p.settings,
        })),
        pluginData: state.pluginData,
      }),
    }
  )
);