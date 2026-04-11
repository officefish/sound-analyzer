import { ModuleType } from './modules';

// Тип для функции-обработчика
export type PluginHandler = (...args: any[]) => any;

// Виджет плагина - контекст может быть любым объектом
export interface IPluginWidget {
  id: string;
  pluginId: string;
  title: string;
  icon?: string;
  position?: 'top' | 'bottom' | 'sidebar';
  order?: number;
  width?: 'full' | 'half' | 'auto';
  height?: number | 'auto';
  component: React.ComponentType<{
    plugin: IPlugin;
    context?: any;  // ✅ Делаем контекст любым (any)
    onAction: (action: string, data?: any) => void;
    isActive: boolean;
  }>;
}

// Гибкий контекст — может содержать любые поля
export interface IPluginContext {
  moduleId: ModuleType;
  moduleState: any;
  dispatch: (action: string, payload?: any) => void;
  getData: () => any;
  setData: (data: any) => void;
  
  // Опциональные методы для специфичных модулей
  getStream?: () => MediaStream | null;
  getVolume?: () => number;
  log?: (message: string, level?: 'info' | 'warn' | 'error') => void;
  
  // Динамические поля для конкретных модулей
  [key: string]: any;
}

// Базовый интерфейс плагина
export interface IPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  moduleId: ModuleType;
  enabled: boolean;
  
  // Жизненный цикл
  onActivate?: (context?: IPluginContext) => void;
  onDeactivate?: (context?: IPluginContext) => void;
  
  // События модуля
  onModuleEvent?: (event: string, data: any, context?: IPluginContext) => void;
  
  // Универсальный метод execute
  execute: (action: string, data?: any, context?: IPluginContext) => any;
  
  // Список доступных действий (для UI)
  availableActions?: string[];
  
  // Виджет плагина
  widget?: IPluginWidget;
  
  // Настройки
  settings?: Record<string, any>;
  settingsSchema?: ISettingField[];
}

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
