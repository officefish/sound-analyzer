# 🔄 Передача данных из модуля в плагин: Forwarding и Execute

## 📋 Содержание

1. [Введение](#введение)
2. [Почему такая архитектура?](#почему-такая-архитектура)
3. [Концепция Forwarding (пересылка данных)](#концепция-forwarding-пересылка-данных)
4. [Концепция Execute (опосредованный вызов)](#концепция-execute-опосредованный-вызов)
5. [Полный пример: Counter + LoggerPlugin](#полный-пример-counter--loggerplugin)
6. [Поток данных](#поток-данных)
7. [Типичные сценарии использования](#типичные-сценарии-использования)
8. [Практические советы](#практические-советы)

---

## Введение

В SoundLab используется **двунаправленная** система обмена данными между модулями и плагинами:

- **Forwarding (пересылка)** — модуль *передаёт* данные в плагин через контекст
- **Execute (вызов)** — плагин *запрашивает* действия у модуля или выполняет свою логику

Эта архитектура обеспечивает **слабое связывание** и **безопасность** — плагин не имеет прямого доступа к внутренностям модуля.

---

## Почему такая архитектура?

### Проблемы прямого доступа

```typescript
// ❌ ПЛОХО: Прямой доступ к состоянию модуля
const CounterModule = () => {
  const [count, setCount] = useState(0);
  
  return <PluginComponent count={count} setCount={setCount} />;
};
```

Недостатки:

Плагин может испортить состояние модуля

Сильная связанность — сложно менять модуль

Невозможно контролировать, что делает плагин

Наше решение

```typescript
// ✅ ХОРОШО: Через контекст и execute
const pluginContext: IPluginContext = {
  getData: () => stateRef.current,     // Только чтение
  setData: (data) => setState(data),   // Контролируемая запись
  dispatch: (action, payload) => {     // Только разрешённые действия
    if (action === 'increment') increment();
  }
};
```

Преимущества:

✅ Модуль контролирует, что может делать плагин
✅ Плагин не может испортить состояние
✅ Легко менять модуль, не затрагивая плагины
✅ Чёткое разделение ответственности

## Концепция Forwarding (пересылка данных)

### Что это такое?

Forwarding — это передача данных из модуля в плагин только для чтения. Плагин получает актуальное состояние модуля через контекст, но не может его напрямую изменить.

Как это работает
```typescript
// 1. Модуль создаёт контекст с данными
const pluginContext: IPluginContext = {
  // ... обязательные поля
  count: state.count,           // ← Пересылаем значение
  volume: state.volume,         // ← Пересылаем значение
  isActive: state.isActive,     // ← Пересылаем значение
};


// 2. Плагин получает данные через контекст
const MyWidget = ({ context }) => {
  const count = context?.count || 0;  // ← Читаем данные
  return <div>Count: {count}</div>;
};
```

Почему данные передаются, а не импортируются?

```typescript
// ❌ Что было бы, если бы плагин импортировал модуль
import { counterState } from '../Counter';

// Проблемы:
// - Циркулярные зависимости
// - Плагин привязан к конкретной реализации
// - Нельзя использовать с разными модулями

// ✅ Что имеем: данные приходят через контекст
// Плагин не знает, откуда данные — он просто их получает
```

Полный пример forwarding

```typescript
// Модуль Counter
const pluginContext: IPluginContext = {
  moduleId: 'counter',
  moduleState: state,
  dispatch: (action) => { /* ... */ },
  getData: () => stateRef.current,
  setData: (data) => setState(data),
  
  // 🔄 FORWARDING: передаём конкретные значения
  count: state.count,
  lastUpdated: state.lastUpdated,
  totalClicks: state.totalClicks,
};

// Плагин Logger получает эти данные
const LoggerWidget = ({ context }) => {
  // ✅ Плагин читает данные, но не может их изменить
  const count = context?.count || 0;
  const lastUpdated = context?.lastUpdated;
  
  return (
    <div>
      Текущий счёт: {count}
      Последнее обновление: {lastUpdated}
    </div>
  );
};
```

## Концепция Execute (опосредованный вызов)

### Что это такое?

Execute — это механизм, позволяющий плагину запрашивать выполнение действий у модуля или выполнять свою логику через единый метод execute(action, data).

### Как это работает

```typescript
// 1. Плагин определяет доступные действия
availableActions = ['increment', 'reset', 'log'];

// 2. Плагин реализует execute
execute(action: string, data?: any, context?: IPluginContext): any {
  switch (action) {
    case 'increment':
      // Запрашиваем у модуля инкремент через dispatch
      context?.dispatch('increment');
      return { success: true };
      
    case 'log':
      // Логируем (своя логика плагина)
      console.log('Log:', data);
      return true;
      
    default:
      return null;
  }
}

// 3. Модуль определяет, какие действия разрешены
const pluginContext: IPluginContext = {
  dispatch: (action: string, payload?: any) => {
    switch (action) {
      case 'increment':
        increment();  // ← Разрешённое действие
        break;
      case 'reset':
        reset();      // ← Разрешённое действие
        break;
      // deleteAllData — НЕТ в switch, значит запрещено
    }
  }
};
```

### Почему execute, а не прямые вызовы?

```typescript
// ❌ Прямой вызов (опасно)
plugin.increment = () => setCount(count + 1);
plugin.reset = () => setCount(0);
// Плагин может вызвать что угодно, даже то, что не должен

// ✅ Execute (безопасно)
plugin.execute('increment');
plugin.execute('reset');
plugin.execute('deleteAll');  // Вернёт null — действие не разрешено
```

### Полный пример execute

```typescript
// Модуль Counter — определяет разрешённые действия
const pluginContext: IPluginContext = {
  dispatch: (action: string, payload?: any) => {
    switch (action) {
      case 'increment':
        setState(prev => ({ ...prev, count: prev.count + 1 }));
        emitEvent('countChanged', { count: state.count + 1 });
        break;
        
      case 'reset':
        setState(prev => ({ ...prev, count: 0 }));
        emitEvent('countReset');
        break;
        
      case 'setCount':
        if (typeof payload === 'number' && payload >= 0) {
          setState(prev => ({ ...prev, count: payload }));
        }
        break;
        
      // Действия, не добавленные в switch, НЕДОСТУПНЫ плагину
    }
  }
};

// Плагин — запрашивает выполнение действий
class CounterControllerPlugin implements IPlugin {
  availableActions = ['increment', 'reset', 'setCount', 'getCount'];
  
  execute(action: string, data?: any, context?: IPluginContext): any {
    switch (action) {
      case 'increment':
        context?.dispatch('increment');
        return { success: true };
        
      case 'reset':
        context?.dispatch('reset');
        return { success: true };
        
      case 'setCount':
        if (typeof data === 'number') {
          context?.dispatch('setCount', data);
        }
        return { success: true };
        
      case 'getCount':
        return context?.getData()?.count || 0;
        
      default:
        return null;
    }
  }
}
```

Полный пример: Counter + LoggerPlugin

Структура

```markdown
src/modules/Counter/
├── index.tsx                 # Модуль счётчика
└── types.ts                  # Типы

src/plugins/counter/
├── LoggerPlugin.tsx          # Плагин-логгер
└── index.ts                  # Экспорт
📄 src/modules/Counter/types.ts
```

```typescript
export interface CounterState {
  count: number;
  lastUpdated: string;
  totalIncrements: number;
  isActive: boolean;
}

export interface CounterServiceEvents {
  onCountChange?: (count: number) => void;
  onReset?: () => void;
}
```
📄 src/modules/Counter/index.tsx

```typescript
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useModulePlugins } from '../../hooks/useModulePlugins';
import { CounterState } from './types';
import { IPluginContext } from '../../types/plugins';

const MODULE_ID = 'counter';

const INITIAL_STATE: CounterState = {
  count: 0,
  lastUpdated: new Date().toISOString(),
  totalIncrements: 0,
  isActive: true,
};

const Counter: React.FC = () => {
  const [state, setState] = useState<CounterState>(INITIAL_STATE);
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // ========== ЛОГИКА МОДУЛЯ ==========
  
  const increment = useCallback(() => {
    setState(prev => ({
      ...prev,
      count: prev.count + 1,
      totalIncrements: prev.totalIncrements + 1,
      lastUpdated: new Date().toISOString(),
    }));
    emitEvent('countChanged', { count: state.count + 1 });
  }, []);
  
  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      count: 0,
      lastUpdated: new Date().toISOString(),
    }));
    emitEvent('countReset');
  }, []);
  
  // ========== ПЛАГИНЫ ==========
  
  // 🔄 FORWARDING: передаём данные в плагины
  const pluginContext: IPluginContext = {
    moduleId: MODULE_ID as any,
    moduleState: state,
    
    // 📡 DISPATCH: определяем, какие действия разрешены плагинам
    dispatch: (action: string, payload?: any) => {
      console.log(`[Counter] Dispatch: ${action}`, payload);
      
      switch (action) {
        case 'increment':
          increment();
          break;
        case 'reset':
          reset();
          break;
        case 'setCount':
          if (typeof payload === 'number' && payload >= 0) {
            setState(prev => ({
              ...prev,
              count: payload,
              lastUpdated: new Date().toISOString(),
            }));
          }
          break;
        // ❌ Действие 'deleteAll' не добавлено → плагин не может его вызвать
      }
    },
    
    getData: () => stateRef.current,
    setData: (data: any) => {
      setState(prev => ({ ...prev, ...data }));
    },
    
    // 🔄 FORWARDING: конкретные значения для плагинов
    count: state.count,
    lastUpdated: state.lastUpdated,
    totalIncrements: state.totalIncrements,
  };
  
  const {
    activePlugins,
    widgets,
    emitEvent,
    executeOnPlugins,
  } = useModulePlugins<CounterState>({
    moduleId: MODULE_ID as any,
    getInitialState: () => INITIAL_STATE,
  });
  
  useEffect(() => {
    console.log(`✅ [Counter] Module initialized`);
    console.log(`📦 Active plugins:`, activePlugins.map(p => p.id));
  }, [activePlugins]);
  
  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">🔢 Счётчик кликов</h1>
      
      {/* Отображение данных */}
      <div className="text-6xl font-mono mb-2">{state.count}</div>
      <div className="text-xs text-base-content/50 mb-6">
        Всего кликов: {state.totalIncrements} | Обновлён: {new Date(state.lastUpdated).toLocaleTimeString()}
      </div>
      
      {/* Кнопки управления */}
      <div className="flex gap-3 justify-center mb-8">
        <button onClick={increment} className="btn btn-primary">
          ➕ Увеличить
        </button>
        <button onClick={reset} className="btn btn-secondary">
          🔄 Сброс
        </button>
      </div>
      
      {/* Виджеты плагинов */}
      {activePlugins.length > 0 && (
        <div className="space-y-4">
          {widgets.map((widget) => {
            const plugin = activePlugins.find(p => p.id === widget.pluginId);
            if (!plugin) return null;
            return (
              <widget.component
                key={widget.id}
                plugin={plugin}
                context={pluginContext}
                onAction={(action, data) => plugin.execute?.(action, data, pluginContext)}
                isActive={plugin.enabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Counter;
```

📄 src/plugins/counter/LoggerPlugin.tsx

```typescript
import React, { useState, useEffect } from 'react';
import { IPlugin, IPluginWidget, IPluginContext } from '../../types/plugins';

/**
 * 🧩 Логгер-плагин для модуля Counter
 * 
 * Демонстрирует:
 * 1. FORWARDING — получение данных из модуля через context
 * 2. EXECUTE — вызов действий модуля через onAction/execute
 * 3. onModuleEvent — реакция на события модуля
 */

// ========== ВИДЖЕТ ПЛАГИНА ==========

const LoggerWidget: React.FC<{
  context?: IPluginContext;
  plugin: IPlugin;
  onAction: (action: string, data?: any) => void;
  isActive: boolean;
}> = ({ context, plugin, onAction, isActive }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [autoLog, setAutoLog] = useState(plugin.settings?.autoLog ?? true);
  
  // Добавление лога
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };
  
  // 📡 EXECUTE: вызываем действия через onAction
  const handleLogCurrent = () => {
    // Получаем данные из контекста (FORWARDING)
    const count = (context as any)?.count || 0;
    const totalIncrements = (context as any)?.totalIncrements || 0;
    
    addLog(`📊 Текущее состояние: count=${count}, totalIncrements=${totalIncrements}`);
    onAction('log', { count, totalIncrements });
  };
  
  const handleIncrement = () => {
    addLog(`➕ Запрос на увеличение счётчика`);
    // 📡 EXECUTE: вызываем действие модуля
    onAction('increment');
  };
  
  const handleReset = () => {
    addLog(`🔄 Запрос на сброс счётчика`);
    onAction('reset');
  };
  
  const handleSetCount = () => {
    const newCount = prompt('Введите новое значение:', '5');
    if (newCount && !isNaN(Number(newCount))) {
      addLog(`🎯 Установка счётчика в ${newCount}`);
      onAction('setCount', Number(newCount));
    }
  };
  
  const handleClearLogs = () => {
    setLogs([]);
    onAction('clearLogs');
  };
  
  // 🔄 FORWARDING: получаем данные из контекста
  const count = (context as any)?.count || 0;
  const lastUpdated = (context as any)?.lastUpdated;
  
  if (!isActive) return null;
  
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-4">
      {/* Заголовок с настройками */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span>{plugin.icon}</span>
          <span>{plugin.name}</span>
        </h3>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={autoLog}
            onChange={(e) => {
              setAutoLog(e.target.checked);
              onAction('setAutoLog', e.target.checked);
            }}
            className="toggle toggle-xs"
          />
          <span className="text-base-content/60">Авто-лог</span>
        </label>
      </div>
      
      {/* 🔄 FORWARDING: отображение данных из модуля */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-4 p-2 bg-base-300/30 rounded-lg">
        <div>
          <span className="text-xs text-base-content/50">Текущий счёт:</span>
          <div className="text-xl font-mono font-bold">{count}</div>
        </div>
        <div>
          <span className="text-xs text-base-content/50">Последнее обновление:</span>
          <div className="text-xs font-mono">
            {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}
          </div>
        </div>
      </div>
      
      {/* 📡 EXECUTE: кнопки управления */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={handleLogCurrent} className="btn btn-xs btn-outline">
          📝 Записать состояние
        </button>
        <button onClick={handleIncrement} className="btn btn-xs btn-primary">
          ➕ Увеличить
        </button>
        <button onClick={handleReset} className="btn btn-xs btn-secondary">
          🔄 Сброс
        </button>
        <button onClick={handleSetCount} className="btn btn-xs btn-accent">
          🎯 Установить
        </button>
        <button onClick={handleClearLogs} className="btn btn-xs btn-ghost">
          🗑️ Очистить логи
        </button>
      </div>
      
      {/* Логи */}
      {logs.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-base-content/50 mb-1">📋 История действий:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto bg-base-300/30 rounded-lg p-2">
            {logs.map((log, i) => (
              <div key={i} className="text-xs font-mono text-base-content/70">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Виджет плагина
const loggerWidget: IPluginWidget = {
  id: 'logger-widget',
  pluginId: 'counter-logger',
  title: '📝 Логгер событий',
  icon: '📝',
  position: 'bottom',
  order: 1,
  width: 'full',
  component: LoggerWidget,
};

// ========== КЛАСС ПЛАГИНА ==========

class LoggerPluginClass implements IPlugin {
  // Идентификация
  id = 'counter-logger';
  name = 'Логгер';
  version = '1.0.0';
  description = 'Логирует изменения счётчика и может управлять им';
  icon = '📝';
  moduleId = 'counter' as const;
  enabled = false;
  
  // 📡 EXECUTE: доступные действия
  availableActions = ['log', 'increment', 'reset', 'setCount', 'setAutoLog', 'clearLogs', 'getLogs'];
  
  // Настройки
  settings = {
    maxLogs: 10,
    autoLog: true,
  };
  
  widget = loggerWidget;
  
  // Внутреннее состояние плагина
  private logs: string[] = [];
  
  // ========== МЕТОДЫ ЖИЗНЕННОГО ЦИКЛА ==========
  
  onActivate(context?: IPluginContext): void {
    console.log('📝 LoggerPlugin activated');
    this.addLog('🔌 Плагин активирован');
  }
  
  onDeactivate(context?: IPluginContext): void {
    console.log('📝 LoggerPlugin deactivated');
    this.addLog('🔌 Плагин деактивирован');
  }
  
  // 📡 onModuleEvent: реакция на события модуля
  onModuleEvent(event: string, data: any, context?: IPluginContext): void {
    console.log(`📡 LoggerPlugin received event: ${event}`, data);
    
    if (this.settings.autoLog) {
      switch (event) {
        case 'countChanged':
          this.addLog(`📈 Счётчик изменён: ${data?.count}`);
          break;
        case 'countReset':
          this.addLog(`🔄 Счётчик сброшен`);
          break;
      }
    }
  }
  
  // ========== ВНУТРЕННИЕ МЕТОДЫ ==========
  
  private addLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.logs = [`[${timestamp}] ${message}`, ...this.logs].slice(0, this.settings.maxLogs);
  }
  
  // ========== 📡 EXECUTE: обработка действий ==========
  
  execute(action: string, data?: any, context?: IPluginContext): any {
    switch (action) {
      // Логирование
      case 'log':
        this.addLog(data?.message || `📊 Запрос лога: ${JSON.stringify(data)}`);
        return this.logs;
      
      case 'getLogs':
        return this.logs;
      
      case 'clearLogs':
        this.logs = [];
        return true;
      
      // 📡 EXECUTE: вызов действий модуля через dispatch
      case 'increment':
        context?.dispatch('increment');
        return { success: true };
      
      case 'reset':
        context?.dispatch('reset');
        return { success: true };
      
      case 'setCount':
        if (typeof data === 'number') {
          context?.dispatch('setCount', data);
        }
        return { success: true };
      
      // Настройки
      case 'setAutoLog':
        this.settings.autoLog = data;
        return true;
      
      default:
        console.warn(`Unknown action: ${action}`);
        return null;
    }
  }
}

// Экспортируем экземпляр
export const LoggerPlugin = new LoggerPluginClass();
```

## Поток данных

### Диаграмма взаимодействия

┌─────────────────────────────────────────────────────────────────────────────┐
│                              МОДУЛЬ COUNTER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  state = { count: 5, totalIncrements: 10 }                                  │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      pluginContext                                   │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │    │
│  │  │ FORWARDING      │  │ FORWARDING      │  │ DISPATCH            │  │    │
│  │  │ count: 5        │  │ totalIncrements │  │ increment()         │  │    │
│  │  │ lastUpdated:..  │  │ : 10            │  │ reset()             │  │    │
│  │  └─────────────────┘  └─────────────────┘  │ setCount()          │  │    │
│  │                                            └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    │ Передача                                │
│                                    ▼                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ПЛАГИН LOGGER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  context?.count  ──────────────────────────────────────────────────────┐    │
│         │                                                              │    │
│         ▼                                                              │    │
│  ┌─────────────────────────────────────────────────────────────────┐  │    │
│  │                    ВИДЖЕТ (UI)                                    │  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐│  │    │
│  │  │ Отображение: "Текущий счёт: 5"                              ││  │    │
│  │  │                                                              ││  │    │
│  │  │ Кнопки:                                                      ││  │    │
│  │  │   [➕ Увеличить]  ──onAction('increment')──┐                ││  │    │
│  │  │   [🔄 Сброс]      ──onAction('reset')──────┼──► execute()   ││  │    │
│  │  │   [🎯 Установить] ──onAction('setCount')───┘                ││  │    │
│  │  └─────────────────────────────────────────────────────────────┘│  │    │
│  └─────────────────────────────────────────────────────────────────┘  │    │
│                                    │                                    │    │
│                                    ▼                                    │    │
│  ┌─────────────────────────────────────────────────────────────────┐  │    │
│  │                    execute()                                      │  │    │
│  │                                                                   │  │    │
│  │  case 'increment':                                               │  │    │
│  │    context?.dispatch('increment')  ──────────────────────────────┼──┼────┘
│  │    return { success: true }                                      │  │
│  └─────────────────────────────────────────────────────────────────┘  │    │
│                                                                         │    │
└─────────────────────────────────────────────────────────────────────────┘    │
                                     │                                         │
                                     │ dispatch('increment')                   │
                                     ▼                                         │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              МОДУЛЬ COUNTER                                  │
│                                                                             │
│  dispatch('increment') ──► increment() ──► count: 5 → 6                    │
│                                                                             │
│  emitEvent('countChanged', { count: 6 })                                    │
│         │                                                                   │
│         ▼                                                                   │
│  onModuleEvent('countChanged') ──► Плагин получает событие                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

## Типичные сценарии использования

### Сценарий 1: Только чтение данных (мониторинг)

```typescript
// Плагин только читает данные, не изменяя их
const MonitorWidget = ({ context }) => {
  const count = context?.count || 0;
  return <div>Текущее значение: {count}</div>;
};

// В модуле просто передаём данные
const pluginContext = { count: state.count };
```

### Сценарий 2: Управление модулем (контроллер)

```typescript
// Плагин управляет модулем через dispatch
const ControllerWidget = ({ context, onAction }) => {
  return (
    <button onClick={() => onAction('increment')}>
      Увеличить
    </button>
  );
};

// В плагине
execute(action, data, context) {
  if (action === 'increment') {
    context?.dispatch('increment');
  }
}

// В модуле определяем разрешённые действия
dispatch: (action) => {
  if (action === 'increment') increment();
}
```

### Сценарий 3: Обработка событий модуля

```typescript
// Плагин реагирует на события
onModuleEvent(event: string, data: any) {
  if (event === 'countChanged') {
    console.log(`Новое значение: ${data.count}`);
    this.saveToHistory(data.count);
  }
}

// В модуле генерируем события
emitEvent('countChanged', { count: newCount });
```

### Сценарий 4: Комбинированный

```typescript
// Плагин и читает, и управляет, и реагирует на события
// (именно так работает LoggerPlugin в примере выше)
```

## Практические советы

### 1. Что передавать через Forwarding?

✅ Передавайте:

- Значения, которые нужно отображать в UI плагина
- Состояние, необходимое для логики плагина
- Метаданные (время, количество операций)

❌ Не передавайте:

- Функции (передавайте через dispatch)
- Огромные массивы (передавайте по необходимости)
- Внутренние служебные данные модуля

### 2. Что делать через Execute?

✅ Используйте execute для:

- Действий, изменяющих состояние модуля
- Запросов данных из модуля
- Логики, которая может быть переопределена

❌ Не используйте execute для:

- Простого чтения данных (используйте forwarding)
- Внутренних вычислений плагина

### 3. Именование действий

```typescript
// ✅ Хорошие имена
'increment', 'reset', 'setVolume', 'startMonitoring'

// ❌ Плохие имена
'do', 'action1', 'click', 'handle'
```

### 4. Обработка ошибок

```typescript
execute(action: string, data?: any, context?: IPluginContext): any {
  try {
    switch (action) {
      case 'increment':
        if (!context) throw new Error('No context');
        context.dispatch('increment');
        return { success: true };
    }
  } catch (error) {
    console.error(`[${this.name}] Error executing ${action}:`, error);
    return { success: false, error: error.message };
  }
}
```

### 5. Типизация данных

```typescript
// Определите типы для данных, передаваемых через контекст
interface CounterContext extends IPluginContext {
  count: number;
  totalIncrements: number;
  lastUpdated: string;
}

// В виджете используйте утверждение типа
const { count, totalIncrements } = context as CounterContext;
```

📝 Резюме

Механизм	Назначение	Направление	Пример
Forwarding	Передача данных для чтения	Модуль → Плагин	count: state.count
Execute	Вызов действий и логики	Плагин → Модуль	context?.dispatch('increment')
onModuleEvent	Реакция на события	Модуль → Плагин	emitEvent('countChanged')

Ключевой принцип: Плагин не имеет прямого доступа к состоянию модуля — только через контролируемые механизмы. Это обеспечивает безопасность, слабую связанность и лёгкость поддержки.