import { useCallback, useMemo, useEffect, useRef } from 'react';
import { usePluginsStore } from '../store/plugins.store';
import { IPluginContext } from '../types/plugins';
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
    // registerPlugin,
    // registerPlugins,
  } = usePluginsStore();
  
  const isMountedRef = useRef(true);
  const hasActivatedRef = useRef(false);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const allPlugins = useMemo(() => {
    return getPluginsByModule(moduleId);
  }, [moduleId, getPluginsByModule]);
  
  const activePlugins = useMemo(() => {
    return getActivePluginsByModule(moduleId);
  }, [moduleId, getActivePluginsByModule]);
  
  // ✅ Автоматическая активация плагинов с контекстом при монтировании (только один раз)
  useEffect(() => {
    if (context && !hasActivatedRef.current && isMountedRef.current) {
      hasActivatedRef.current = true;
      
      allPlugins.forEach(plugin => {
        if (plugin.enabled && !isPluginActive(plugin.id)) {
          console.log(`🔌 Auto-activating plugin: ${plugin.id}`);
          activatePlugin(plugin.id, context);
        }
      });
    }
  }, [moduleId, allPlugins, context, activatePlugin, isPluginActive]);
  
  const activateWithContext = useCallback((pluginId: string) => {
    if (!isMountedRef.current) return;
    activatePlugin(pluginId, context);
  }, [context, activatePlugin]);
  
  const execute = useCallback((pluginId: string, action: string, data?: any) => {
    if (!isMountedRef.current) return null;
    return executePluginAction(pluginId, action, data);
  }, [executePluginAction]);
  
  const executeOnAll = useCallback((action: string, data?: any) => {
    if (!isMountedRef.current) return [];
    return executeOnModule(moduleId, action, data);
  }, [moduleId, executeOnModule]);
  
  const emitEvent = useCallback((event: string, data?: any) => {
    if (!isMountedRef.current) return;
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
      if (!isMountedRef.current) return;
      togglePlugin(pluginId, context);
    },
    
    // registerPlugin,
    // registerPlugins,
    
    execute,
    executeOnAll,
    emitEvent,
    
    getData: getPluginData,
    setData: setPluginData,
    
    updateSettings: updatePluginSettings,
  };
};