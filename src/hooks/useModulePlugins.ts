import { useState, useRef, useCallback, useEffect } from 'react';
import { usePluginsStore } from '../store/plugins.store';
import { IPluginContext } from '../types/plugins';
import { ModuleType } from '../types/modules';

interface UseModulePluginsOptions<T> {
  moduleId: ModuleType;
  getInitialState: () => T;
}

export function useModulePlugins<T extends Record<string, any>>(options: UseModulePluginsOptions<T>) {
  const { moduleId, getInitialState } = options;
  
  const [state, setStateInternal] = useState<T>(getInitialState);
  const stateRef = useRef(state);
  const contextRestoredRef = useRef(false);
  
  const { 
    getWidgetsByModule, 
    emitModuleEvent, 
    executeOnModule, 
    getActivePluginsByModule, 
    isPluginActive, 
    togglePlugin,
    activatePlugin,
    activePluginContexts
  } = usePluginsStore();
  
  // Обновляем ref
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // Функция обновления состояния
  const setState = useCallback((updater: Partial<T> | ((prev: T) => T)) => {
    setStateInternal(prev => {
      if (typeof updater === 'function') {
        return updater(prev);
      }
      return { ...prev, ...updater };
    });
  }, []);
  
  // Создаём контекст для плагинов
  const pluginContext: IPluginContext = {
    moduleId,
    moduleState: state,
    dispatch: (action: string, payload?: any) => {
      console.log(`[${moduleId}] Dispatch ${action}`, payload);
    },
    getData: () => stateRef.current,
    setData: (data: any) => {
      setState(data);
    },
  };
  
  // ✅ Восстанавливаем контекст для активных плагинов при монтировании (только один раз)
  useEffect(() => {
    if (contextRestoredRef.current) return;
    
    const activePlugins = getActivePluginsByModule(moduleId);
    
    if (activePlugins.length > 0) {
      console.log(`[${moduleId}] Restoring context for ${activePlugins.length} active plugins:`, activePlugins.map(p => p.id));
      
      activePlugins.forEach(plugin => {
        // Проверяем, есть ли уже контекст у плагина
        const existingContext = activePluginContexts.get(plugin.id);
        
        if (!existingContext) {
          // Вызываем onActivate у плагина с новым контекстом
          if (plugin.onActivate) {
            plugin.onActivate(pluginContext);
          }
          // Сохраняем контекст в store
          activatePlugin(plugin.id, pluginContext);
          console.log(`[${moduleId}] Context restored for plugin: ${plugin.id}`);
        } else {
          console.log(`[${moduleId}] Plugin already has context: ${plugin.id}`);
        }
      });
      
      contextRestoredRef.current = true;
    }
  }, [moduleId, getActivePluginsByModule, activatePlugin, pluginContext, activePluginContexts]);
  
  // Получаем активные плагины
  const activePlugins = getActivePluginsByModule(moduleId);
  const widgets = getWidgetsByModule(moduleId);
  
  // Отправка событий в плагины
  const emitEvent = useCallback((event: string, data?: any) => {
    emitModuleEvent(moduleId, event, data);
  }, [moduleId, emitModuleEvent]);
  
  // Выполнение действий на плагинах
  const executeOnPlugins = useCallback((action: string, data?: any) => {
    return executeOnModule(moduleId, action, data);
  }, [moduleId, executeOnModule]);
  
  return {
    state,
    setState,
    activePlugins,
    widgets,
    emitEvent,
    executeOnPlugins,
    togglePlugin,
    isPluginActive,
    pluginContext,
  };
}