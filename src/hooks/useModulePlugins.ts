import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlugins } from './usePlugins';
import { usePluginsStore } from '../store/plugins.store';
import { IPluginContext } from '../types/plugins';
import { ModuleType } from '../types/modules';

interface UseModulePluginsOptions<T> {
  moduleId: ModuleType;
  getInitialState: () => T;
  getContext: (state: T, setState: (updater: Partial<T> | ((prev: T) => T)) => void) => IPluginContext;
  onEvent?: (event: string, data: any, state: T, setState: (updater: Partial<T> | ((prev: T) => T)) => void) => void;
}

export function useModulePlugins<T extends Record<string, any>>(options: UseModulePluginsOptions<T>) {
  const { moduleId, getInitialState, getContext, onEvent } = options;
  
  const [state, setStateInternal] = useState<T>(getInitialState);
  const stateRef = useRef(state);
  const contextRegisteredRef = useRef(false);
  const isMountedRef = useRef(true);
  const { getWidgetsByModule: getWidgetsFromStore, emitModuleEvent: emitStoreEvent } = usePluginsStore();
  
  // Обновляем ref при изменении state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // Отслеживаем монтирование
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Функция обновления состояния с поддержкой частичных обновлений
  const setState = useCallback((updater: Partial<T> | ((prev: T) => T)) => {
    if (!isMountedRef.current) return;
    
    setStateInternal(prev => {
      if (typeof updater === 'function') {
        return updater(prev);
      }
      return { ...prev, ...updater };
    });
  }, []);
  
  // Создаём контекст для плагинов
  const pluginContext = getContext(state, setState);
  
  // Подключаем плагины
  const { activePlugins, executeOnAll, emitEvent: emitPluginEvent } = usePlugins(moduleId, pluginContext);
  
  // Получаем виджеты
  const widgets = getWidgetsFromStore(moduleId);
  
  // Передаём контекст наверх (для глобального восстановления)
  useEffect(() => {
    if (pluginContext.onContextReady && !contextRegisteredRef.current && isMountedRef.current) {
      contextRegisteredRef.current = true;
      pluginContext.onContextReady(pluginContext);
    }
  }, [pluginContext]);
  
  // ✅ Обработчик событий модуля с защитой от бесконечного цикла
  const emitModuleEvent = useCallback((event: string, data?: any) => {
    if (!isMountedRef.current) return;
    
    // Отправляем событие в плагины
    emitPluginEvent(event, data);
    
    // Отправляем событие в store
    emitStoreEvent(moduleId, event, data);
    
    // Вызываем колбэк, если он есть
    if (onEvent) {
      onEvent(event, data, state, setState);
    }
  }, [emitPluginEvent, emitStoreEvent, moduleId, onEvent, state, setState]);
  
  // Выполнение действий на всех плагинах
  const executeOnPlugins = useCallback((action: string, data?: any) => {
    if (!isMountedRef.current) return [];
    return executeOnAll(action, data);
  }, [executeOnAll]);
  
  return {
    state,
    setState,
    activePlugins,
    widgets,
    emitEvent: emitModuleEvent,
    executeOnPlugins,
    pluginContext,
  };
}