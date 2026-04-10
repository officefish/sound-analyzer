import { ModuleType } from './modules';

// Тип для функции-обработчика
export type PluginHandler = (...args: any[]) => any;

// Базовый интерфейс плагина (универсальный)
export interface IPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  moduleId: ModuleType;
  enabled: boolean;
  
  // Жизненный цикл
  onActivate?: (context: IPluginContext) => void;
  onDeactivate?: (context: IPluginContext) => void;
  
  // События модуля (обязательное поле, но опциональное)
  onModuleEvent?: (event: string, data: any, context?: IPluginContext) => void;
  
  // Универсальный метод execute
  execute: (action: string, data?: any, context?: IPluginContext) => any;
  
  // Список доступных действий (для UI)
  availableActions?: string[];
  
  // UI компонент (опционально)
  UIComponent?: React.ComponentType<{ 
    context: any; 
    onAction: (action: string, data?: any) => void;
    isActive: boolean;
  }>;
  
  // Настройки
  settings?: Record<string, any>;
  settingsSchema?: ISettingField[];
}

// // Тип для функции-обработчика
// export type PluginHandler = (...args: any[]) => any;

// Схема настроек для UI
export interface ISettingField {
  key: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'range' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: any }[];
  defaultValue: any;
}

// Контекст модуля для плагина
export interface IPluginContext {
  moduleId: ModuleType;
  moduleState: any;
  dispatch: (action: string, payload?: any) => void;
  getData: () => any;
  setData: (data: any) => void;
  getStream?: () => MediaStream | null;
  getVolume?: () => number;
  log?: (message: string, level?: 'info' | 'warn' | 'error') => void;
}

// Регистратор плагинов
export interface IPluginRegistry {
  register(plugin: IPlugin): void;
  unregister(pluginId: string): void;
  getPluginsByModule(moduleId: ModuleType): IPlugin[];
  getActivePluginsByModule(moduleId: ModuleType): IPlugin[];
  activatePlugin(pluginId: string, context?: IPluginContext): void;
  deactivatePlugin(pluginId: string): void;
  togglePlugin(pluginId: string, context?: IPluginContext): void;
  executePluginAction(pluginId: string, action: string, data?: any): any;
  executeOnModule(moduleId: ModuleType, action: string, data?: any): any[];
}

// Тип для события модуля
export interface IModuleEvent {
  type: string;
  payload?: any;
  sourceModule: ModuleType;
  timestamp: number;
}
