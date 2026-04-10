import { useCallback, useMemo, useEffect } from 'react';
import { usePluginsStore } from '../store/plugins.store';
import { IPluginContext, IPlugin } from '../types/plugins';
import { ModuleType } from '../types/modules';

export const usePlugins = (moduleId: ModuleType, context?: IPluginContext) => {
  const {
    getPluginsByModule,
    getActivePluginsByModule,
    isPluginActive,
    activatePlugin,
    deactivatePlugin,
    togglePlugin,
    executePluginAction,
    executeOnModule,
    emitModuleEvent,
    getPluginData,
    setPluginData,
    updatePluginSettings,
    registerPlugin,
    registerPlugins,
  } = usePluginsStore();
  
  const allPlugins = useMemo(() => {
    const plugins = getPluginsByModule(moduleId);
    console.log(`🔍 usePlugins (${moduleId}): found ${plugins.length} plugins:`, plugins.map(p => p.id));
    return plugins;
  }, [moduleId, getPluginsByModule]);
  
  const activePlugins = useMemo(() => {
    const plugins = getActivePluginsByModule(moduleId);
    console.log(`✅ Active plugins for ${moduleId}:`, plugins.map(p => p.id));
    return plugins;
  }, [moduleId, getActivePluginsByModule]);
  
  // Автоматическая активация плагинов с контекстом при монтировании
  useEffect(() => {
    console.log(`🔄 usePlugins effect for ${moduleId}, context:`, context ? 'provided' : 'not provided');
    
    if (context) {
      // Активируем все плагины, которые должны быть активны (восстанавливаем состояние)
      allPlugins.forEach(plugin => {
        if (plugin.enabled && !isPluginActive(plugin.id)) {
          console.log(`🔌 Activating plugin on mount: ${plugin.id}`);
          activatePlugin(plugin.id, context);
        }
      });
    }
  }, [moduleId, allPlugins, context, activatePlugin, isPluginActive]);
  
  const activateWithContext = useCallback((pluginId: string) => {
    console.log(`🔌 Activating plugin with context: ${pluginId}`);
    activatePlugin(pluginId, context);
  }, [context, activatePlugin]);
  
  const execute = useCallback((pluginId: string, action: string, data?: any) => {
    return executePluginAction(pluginId, action, data);
  }, [executePluginAction]);
  
  const executeOnAll = useCallback((action: string, data?: any) => {
    const results = executeOnModule(moduleId, action, data);
    console.log(`🎯 executeOnAll (${moduleId}, ${action}):`, results);
    return results;
  }, [moduleId, executeOnModule]);
  
  const emitEvent = useCallback((event: string, data?: any) => {
    console.log(`📡 emitEvent (${moduleId}, ${event}):`, data);
    emitModuleEvent(moduleId, event, data);
  }, [moduleId, emitModuleEvent]);
  
  const getPluginActions = useCallback((pluginId: string) => {
    const plugin = allPlugins.find(p => p.id === pluginId);
    return plugin?.availableActions || [];
  }, [allPlugins]);
  
  return {
    allPlugins,
    activePlugins,
    
    isActive: (pluginId: string) => isPluginActive(pluginId),
    hasActivePlugins: activePlugins.length > 0,
    getPluginActions,
    
    activate: activateWithContext,
    deactivate: deactivatePlugin,
    toggle: (pluginId: string) => {
      console.log(`🔄 Toggling plugin: ${pluginId}`);
      togglePlugin(pluginId, context);
    },
    
    registerPlugin,
    registerPlugins,
    
    execute,
    executeOnAll,
    emitEvent,
    
    getData: getPluginData,
    setData: setPluginData,
    
    updateSettings: updatePluginSettings,
  };
};