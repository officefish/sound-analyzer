import { useCallback, useMemo } from 'react';
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
  
  const allPlugins = useMemo(() => getPluginsByModule(moduleId), [moduleId, getPluginsByModule]);
  const activePlugins = useMemo(() => getActivePluginsByModule(moduleId), [moduleId, getActivePluginsByModule]);
  
  const activateWithContext = useCallback((pluginId: string) => {
    activatePlugin(pluginId, context);
  }, [context, activatePlugin]);
  
  const execute = useCallback((pluginId: string, action: string, data?: any) => {
    return executePluginAction(pluginId, action, data);
  }, [executePluginAction]);
  
  const executeOnAll = useCallback((action: string, data?: any) => {
    return executeOnModule(moduleId, action, data);
  }, [moduleId, executeOnModule]);
  
  const emitEvent = useCallback((event: string, data?: any) => {
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
    toggle: (pluginId: string) => togglePlugin(pluginId, context),
    
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