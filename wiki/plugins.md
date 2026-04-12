# 🔌 Руководство по созданию плагинов для модулей SoundLab

## 📋 Содержание

1. [Введение](#введение)
2. [Архитектура плагина](#архитектура-плагина)
3. [Структура плагина](#структура-плагина)
4. [Пошаговая инструкция](#пошаговая-инструкция)
5. [Проверки и логирование](#проверки-и-логирование)
6. [Пример создания плагина](#пример-создания-плагина)
7. [Чек-лист](#чек-лист)
8. [Частые проблемы](#частые-проблемы)

---

## Введение

Плагины в SoundLab — это расширения для модулей, которые:

- **Контекстно-зависимы** — показываются только для определённого модуля
- **Активируются через сайдбар** (вкладка "Плагины")
- **Могут иметь виджеты** — UI компоненты, отображаемые в модуле
- **Имеют настройки** — сохраняются в localStorage
- **Взаимодействуют с модулем** через контекст и события

---

## Архитектура плагина

┌─────────────────────────────────────────────────────────────┐
│ Плагин │
├─────────────────────────────────────────────────────────────┤
│ id: string # Уникальный идентификатор │
│ name: string # Отображаемое имя │
│ version: string # Версия плагина │
│ description: string # Описание │
│ icon: string # Эмодзи иконка │
│ moduleId: ModuleType # К какому модулю относится │
│ enabled: boolean # Активен/неактивен │
├─────────────────────────────────────────────────────────────┤
│ availableActions: [] # Доступные действия для execute │
│ settings: {} # Настройки плагина │
│ widget: IPluginWidget # Виджет (опционально) │
├─────────────────────────────────────────────────────────────┤
│ onActivate() # Вызывается при активации │
│ onDeactivate() # Вызывается при деактивации │
│ onModuleEvent() # Реакция на события модуля │
│ execute() # Выполнение действий │
└─────────────────────────────────────────────────────────────┘

---

## Структура плагина

src/plugins/название-модуля/
├── НазваниеПлагина.tsx # Главный файл плагина
├── widgets/ # Виджеты плагина (опционально)
│ └── НазваниеВиджета.tsx
├── components/ # Вспомогательные компоненты
│ └── ...
└── index.ts # Экспорт плагина

---

## Пошаговая инструкция

### Шаг 1: Создать папку плагина

```bash
mkdir -p src/plugins/название-модуля
cd src/plugins/название-модуля
```

### Шаг 2: Создать главный файл плагина
```typescript
// src/plugins/название-модуля/НазваниеПлагина.tsx

import React from 'react';
import { IPlugin, IPluginWidget, IPluginContext } from '../../types/plugins';

// Компонент виджета (если нужен)
const МойВиджет: React.FC<{
  context?: IPluginContext;
  plugin: IPlugin;
  onAction: (action: string, data?: any) => void;
  isActive: boolean;
}> = ({ context, plugin, onAction, isActive }) => {
  if (!isActive) return null;
  
  // Получаем данные из контекста модуля
  const someData = (context as any)?.someData || 0;
  
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-4">
      <h3 className="text-sm font-semibold mb-2">{plugin.name}</h3>
      <div className="text-2xl font-mono">{someData}</div>
      <button
        onClick={() => onAction('doSomething', { value: 42 })}
        className="mt-2 btn btn-xs btn-primary"
      >
        Действие
      </button>
    </div>
  );
};

// Виджет для плагина (если нужен)
const pluginWidget: IPluginWidget = {
  id: 'мой-виджет',
  pluginId: 'название-модуля-мой-плагин',
  title: 'Мой Виджет',
  icon: '✨',
  position: 'bottom',
  order: 1,
  width: 'full',
  component: МойВиджет,
};

// Класс плагина
class МойПлагинClass implements IPlugin {
  // ========== ОБЯЗАТЕЛЬНЫЕ ПОЛЯ ==========
  id = 'название-модуля-мой-плагин';
  name = 'Отображаемое имя плагина';
  version = '1.0.0';
  description = 'Краткое описание того, что делает плагин';
  icon = '🔧';
  moduleId = 'название-модуля' as const;  // ✅ Важно: ID модуля
  enabled = false;  // По умолчанию выключен
  
  // ========== ОПЦИОНАЛЬНЫЕ ПОЛЯ ==========
  availableActions = ['doSomething', 'getSomething', 'reset'];
  
  settings = {
    // Настройки плагина
    option1: true,
    option2: 50,
    option3: 'default',
  };
  
  // Виджет (если нужен)
  widget = pluginWidget;
  
  // ========== МЕТОДЫ ЖИЗНЕННОГО ЦИКЛА ==========
  
  onActivate(context?: IPluginContext): void {
    console.log(`✅ ${this.name} activated`);
    // Инициализация плагина
  }
  
  onDeactivate(context?: IPluginContext): void {
    console.log(`❌ ${this.name} deactivated`);
    // Очистка ресурсов
  }
  
  // Реакция на события модуля
  onModuleEvent(event: string, data: any, context?: IPluginContext): void {
    console.log(`📡 ${this.name} received event: ${event}`, data);
    
    switch (event) {
      case 'moduleStarted':
        // Реакция на запуск модуля
        break;
      case 'dataUpdate':
        // Реакция на обновление данных
        break;
    }
  }
  
  // ========== ГЛАВНЫЙ МЕТОД execute ==========
  
  execute(action: string, data?: any, context?: IPluginContext): any {
    switch (action) {
      case 'doSomething':
        console.log('Doing something with data:', data);
        return { success: true, result: data?.value };
        
      case 'getSomething':
        return this.settings.option2;
        
      case 'reset':
        this.settings.option2 = 50;
        this.settings.option1 = true;
        return true;
        
      default:
        console.warn(`Unknown action: ${action}`);
        return null;
    }
  }
}

// Экспортируем экземпляр плагина
export const МойПлагин = new МойПлагинClass();
```

### Шаг 3: Создать файл экспорта (если несколько плагинов)
```typescript
// src/plugins/название-модуля/index.ts

import { МойПлагин } from './МойПлагин';
import { ДругойПлагин } from './ДругойПлагин';

export const МОДУЛЬ_ПЛАГИНЫ = [МойПлагин, ДругойПлагин];

export { МойПлагин, ДругойПлагин };
```

### Шаг 4: Добавить плагин в глобальный реестр
```typescript
// src/plugins/index.ts

import { МойПлагин } from './название-модуля/МойПлагин';

export const ALL_PLUGINS: IPlugin[] = [
  // ... существующие плагины
  МойПлагин,  // ✅ Добавить сюда
];
```

### Шаг 5: В модуле добавить передачу данных в контекст
```typescript
// В модуле (src/modules/НазваниеМодуля/index.tsx)

const pluginContext: IPluginContext = {
  // ... обязательные поля
  // ✅ Добавьте данные, которые нужны плагину
  myData: state.myData,
  anotherValue: state.someValue,
};
```
## Проверки и логирование

✅ Логи при запуске приложения

📋 Plugin registered: название-модуля-мой-плагин (название-модуля)
✅ Plugin registry ready, plugins available: X
✅ Логи при переключении на модуль

🔍 usePlugins (название-модуля): found 1 plugins: ['название-модуля-мой-плагин']
✅ Active plugins for название-модуля: []
✅ Логи в сайдбаре (вкладка Плагины)

При открытии вкладки "Плагины" для вашего модуля должен отобразиться список плагинов.

✅ Логи при активации плагина

🔄 Toggle plugin: название-модуля-мой-плагин, current state: false
🔌 Activating plugin: название-модуля-мой-плагин
✅ Мой Плагин activated
✅ Plugin activated: название-модуля-мой-плагин
🔌 Active plugins changed: ['название-модуля-мой-плагин']
📦 Widgets to render: 1
✅ Логи при деактивации плагина

🔄 Toggle plugin: название-модуля-мой-плагин, current state: true
🔌 Deactivating plugin: название-модуля-мой-плагин
❌ Мой Плагин deactivated
✅ Plugin deactivated: название-модуля-мой-плагин
🔌 Active plugins changed: []
📦 Widgets to render: 0
✅ Логи при событиях модуля

📡 Мой Плагин received event: dataUpdate {volume: 0.5, quality: 85}

## Пример создания плагина
Создадим простой плагин "Логгер" для модуля "Счётчик":

### 1. Создаём src/plugins/counter/LoggerPlugin.tsx
```typescript
import React, { useState, useEffect } from 'react';
import { IPlugin, IPluginWidget, IPluginContext } from '../../types/plugins';

// Компонент виджета
const LoggerWidget: React.FC<{
  context?: IPluginContext;
  plugin: IPlugin;
  onAction: (action: string, data?: any) => void;
  isActive: boolean;
}> = ({ context, plugin, onAction, isActive }) => {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    if (!isActive) return;
    
    // Добавляем начальный лог
    setLogs(['Плагин активирован']);
  }, [isActive]);
  
  const addLog = (message: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 9)]);
  };
  
  const handleLog = () => {
    const count = (context as any)?.count || 0;
    addLog(`Текущее значение счётчика: ${count}`);
    onAction('log', { message: `Счётчик = ${count}`, count });
  };
  
  if (!isActive) return null;
  
  const count = (context as any)?.count || 0;
  
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">{plugin.name}</h3>
        <button
          onClick={handleLog}
          className="btn btn-xs btn-primary"
        >
          📝 Записать лог
        </button>
      </div>
      
      <div className="text-xs text-base-content/70 mb-2">
        Текущий счёт: <span className="font-mono font-bold">{count}</span>
      </div>
      
      {logs.length > 0 && (
        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="text-xs text-base-content/50 font-mono">
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Виджет
const loggerWidget: IPluginWidget = {
  id: 'logger-widget',
  pluginId: 'counter-logger',
  title: 'Логгер событий',
  icon: '📝',
  position: 'bottom',
  order: 1,
  width: 'full',
  component: LoggerWidget,
};

// Класс плагина
class LoggerPluginClass implements IPlugin {
  id = 'counter-logger';
  name = 'Логгер';
  version = '1.0.0';
  description = 'Логирует изменения счётчика';
  icon = '📝';
  moduleId = 'counter' as const;
  enabled = false;
  
  availableActions = ['log', 'getLogs', 'clearLogs'];
  
  settings = {
    maxLogs: 10,
    autoLog: true,
  };
  
  private logs: string[] = [];
  
  widget = loggerWidget;
  
  onActivate(context?: IPluginContext): void {
    console.log('📝 Logger Plugin activated');
    this.logs = [];
  }
  
  onDeactivate(context?: IPluginContext): void {
    console.log('📝 Logger Plugin deactivated');
  }
  
  onModuleEvent(event: string, data: any, context?: IPluginContext): void {
    if (event === 'countChanged' && this.settings.autoLog) {
      const count = (context as any)?.count || data?.count;
      this.addLog(`Счётчик изменился: ${count}`);
    }
  }
  
  private addLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.logs = [`[${timestamp}] ${message}`, ...this.logs].slice(0, this.settings.maxLogs);
  }
  
  execute(action: string, data?: any, context?: IPluginContext): any {
    switch (action) {
      case 'log':
        this.addLog(data?.message || 'Лог по запросу');
        return this.logs;
        
      case 'getLogs':
        return this.logs;
        
      case 'clearLogs':
        this.logs = [];
        return true;
        
      default:
        return null;
    }
  }
}

export const LoggerPlugin = new LoggerPluginClass();
```
### 2. Добавляем в src/plugins/index.ts
```typescript
import { LoggerPlugin } from './counter/LoggerPlugin';

export const ALL_PLUGINS: IPlugin[] = [
  // ... существующие
  LoggerPlugin,  // ✅ Добавить
];
```
### 3. В модуле Counter добавляем данные в контекст
```typescript
// В src/modules/Counter/index.tsx

const pluginContext: IPluginContext = {
  // ... обязательные поля
  count: state.count,  // ✅ Добавляем для плагина
};
```

## Чек-лист

### При создании плагина проверьте:

Обязательные поля
id — уникальный идентификатор (рекомендуется: модуль-название)
name — отображаемое имя
version — версия (semver)
description — описание
icon — эмодзи иконка
moduleId — ID модуля (должен совпадать с модулем)
enabled — начальное состояние (обычно false)

execute() — метод с switch для действий

### Опциональные поля

availableActions — список доступных действий
settings — объект с настройками
widget — виджет для отображения в модуле

### Методы жизненного цикла

onActivate() — инициализация при активации
onDeactivate() — очистка при деактивации
onModuleEvent() — реакция на события модуля

### Регистрация

Плагин добавлен в ALL_PLUGINS в src/plugins/index.ts
Экспортирован экземпляр класса, а не сам класс
Виджет (если есть)
Компонент виджета принимает context, plugin, onAction, isActive
Проверка if (!isActive) return null
Данные извлекаются из context

## Частые проблемы
# ❌ Плагин не появляется в сайдбаре
Причина: Плагин не добавлен в ALL_PLUGINS или указан неправильный moduleId

Решение:
Проверьте src/plugins/index.ts
Убедитесь, что moduleId совпадает с ID модуля

# ❌ Виджет не отображается в модуле
Причина: Плагин не активирован или виджет не определён

Решение:
Активируйте плагин через сайдбар
Проверьте, что у плагина есть поле widget
Проверьте, что в модуле есть рендер виджетов

# ❌ Данные не передаются в виджет
Причина: В модуле не добавлены данные в pluginContext

Решение: Добавьте необходимые поля в pluginContext:

```typescript
const pluginContext: IPluginContext = {
  // ... обязательные поля
  myData: state.myData,  // ✅ Добавить
};
```

# ❌ Ошибка "Plugin already active" при активации
Причина: Плагин уже был активирован ранее

Решение: Это нормальное предупреждение, не влияет на работу

# ❌ Действие не выполняется
Причина: Действие не добавлено в availableActions или не обработано в execute

Решение:

Добавьте действие в availableActions
Добавьте обработку в switch (action)

# ❌ Настройки не сохраняются
Причина: Настройки не добавлены в объект settings

Решение: Убедитесь, что у плагина есть поле settings

## 📝 Резюме
После выполнения всех шагов вы должны увидеть:

✅ Плагин в списке "Плагины" в сайдбаре (для вашего модуля)
✅ Логи в консоли при регистрации
✅ Возможность включить/выключить плагин через toggle
✅ Виджет плагина в модуле после активации
✅ Взаимодействие плагина с модулем через контекст