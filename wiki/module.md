# 📦 Руководство по добавлению новых модулей в SoundLab

## 📋 Содержание

1. [Введение](#введение)
2. [Структура модуля](#структура-модуля)
3. [Пошаговая инструкция](#пошаговая-инструкция)
4. [Проверки и логирование](#проверки-и-логирование)
5. [Пример создания модуля](#пример-создания-модуля)
6. [Чек-лист](#чек-лист)
7. [Частые проблемы](#частые-проблемы)

---

## Введение

SoundLab имеет модульную архитектуру. Каждый модуль — это независимое приложение (секундомер, микрофон и т.д.), которое:

- Подключается через сайдбар
- Может иметь свои плагины
- Использует общую систему плагинов
- Сохраняет состояние через Zustand

---

## Структура модуля

src/modules/НазваниеМодуля/
├── index.tsx # Главный компонент модуля
├── types.ts # TypeScript типы
├── components/ # Компоненты модуля (опционально)
│ └── ...
└── plugins/ # Плагины для этого модуля (опционально)
└── ...


---

## Пошаговая инструкция

### Шаг 1: Создать папку модуля

```bash
mkdir src/modules/НазваниеМодуля
cd src/modules/НазваниеМодуля
```

### Шаг 2: Создать файл типов types.ts
```typescript
// src/modules/НазваниеМодуля/types.ts

export interface НазваниеМодуляState {
  // Определите состояние вашего модуля
  isActive: boolean;
  // ... другие поля
}

export interface НазваниеМодуляServiceEvents {
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: string) => void;
  // ... другие события
}
```

### Шаг 3: Создать главный компонент index.tsx

```typescript
// src/modules/НазваниеМодуля/index.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useModulePlugins } from '../../hooks/useModulePlugins';
import { НазваниеМодуляState } from './types';
import { IPluginContext } from '../../types/plugins';

// Уникальный ID модуля (должен совпадать с id в MODULES)
const MODULE_ID = 'название-модуля';

// Начальное состояние
const INITIAL_STATE: НазваниеМодуляState = {
  isActive: false,
  // ... начальные значения
};

const НазваниеМодуля: React.FC = () => {
  const [state, setState] = useState<НазваниеМодуляState>(INITIAL_STATE);
  const stateRef = useRef(state);
  const isInitializedRef = useRef(false);
  
  // Обновляем ref при изменении state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // Создаём контекст для плагинов
  const pluginContext: IPluginContext = {
    moduleId: MODULE_ID as any,
    moduleState: state,
    dispatch: (action: string, payload?: any) => {
      console.log(`[${MODULE_ID}] Dispatch ${action}`, payload);
      // Обработка действий от плагинов
    },
    getData: () => stateRef.current,
    setData: (data: any) => {
      setState(prev => ({ ...prev, ...data }));
    },
    // Передаём все необходимые данные для плагинов
    // ... дополнительные поля
  };
  
  // Подключаем систему плагинов
  const {
    activePlugins,
    widgets,
    emitEvent,
    executeOnPlugins,
  } = useModulePlugins<НазваниеМодуляState>({
    moduleId: MODULE_ID as any,
    getInitialState: () => INITIAL_STATE,
  });
  
  // Логирование для проверки
  useEffect(() => {
    console.log(`✅ [${MODULE_ID}] Module initialized`);
    console.log(`📦 [${MODULE_ID}] Active plugins:`, activePlugins.map(p => p.id));
  }, [activePlugins]);
  
  // Основная логика модуля
  // ...
  
  return (
    <div className="p-6">
      {/* UI модуля */}
      <h1>Название модуля</h1>
      
      {/* Рендерим виджеты плагинов */}
      {activePlugins.length > 0 && (
        <div className="space-y-4">
          {widgets.map((widget) => {
            const plugin = activePlugins.find(p => p.id === widget.pluginId);
            if (!plugin) return null;
            return (
              <div key={widget.id}>
                <widget.component
                  plugin={plugin}
                  context={pluginContext}
                  onAction={(action, data) => plugin.execute?.(action, data, pluginContext)}
                  isActive={plugin.enabled}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default НазваниеМодуля;
```

### Шаг 4: Добавить модуль в src/types/modules.ts

```typescript
// src/types/modules.ts

import { IPluginContext } from './plugins';

// Добавьте новый тип
export type ModuleType = 'stopwatch' | 'microphone' | 'microphone2' | 'название-модуля';

// Добавьте модуль в список
export const MODULES: IModule[] = [
  // ... существующие модули
  {
    id: 'название-модуля',
    name: 'Отображаемое имя',
    icon: '🎯', // выберите иконку
    description: 'Краткое описание модуля',
    component: () => null, // заглушка, реальный компонент подставится в App.tsx
  },
];
```

### Шаг 5: Добавить импорт в src/App.tsx

```typescript
// src/App.tsx

// Добавьте импорт модуля
import НазваниеМодуля from './modules/НазваниеМодуля';

// Добавьте в маппинг компонентов
const moduleComponents: Record<ModuleType, React.ComponentType> = {
  stopwatch: Stopwatch,
  microphone: Microphone,
  microphone2: Microphone2,
  'название-модуля': НазваниеМодуля,  // ✅ Добавить сюда
};

// Обновите MODULES с реальными компонентами
MODULES[0].component = Stopwatch;
MODULES[1].component = Microphone;
MODULES[2].component = Microphone2;
MODULES[3].component = НазваниеМодуля;  // ✅ Добавить сюда
```

## Проверки и логирование
При корректном добавлении модуля в консоли должны появиться следующие логи:

### ✅ Логи при запуске приложения
```text
📋 Plugin registered: stopwatch-lap-history (stopwatch)
📋 Plugin registered: stopwatch-sound-effects (stopwatch)
📋 Plugin registered: microphone-noise-gate (microphone)
📋 Plugin registered: microphone-recorder (microphone)
📋 Plugin registered: microphone2-tune-monitor (microphone2)  // для плагинов модуля
✅ Plugin registry ready, plugins available: 5
```

### ✅ Логи при монтировании модуля
```text
✅ [название-модуля] Module initialized
📦 [название-модуля] Active plugins: []
```

## ✅ Логи при переключении на модуль
При переключении в сайдбаре должен появиться ваш модуль, и при клике на него:

```text
🔄 usePlugins effect for название-модуля, context: provided
```

### ✅ Логи при активации плагинов
При включении плагина для вашего модуля:

```text
🔌 Activating plugin: название-модуля-плагин
✅ Plugin activated: название-модуля-плагин
🔌 Active plugins changed: ['название-модуля-плагин']
📦 Widgets to render: 1
```

## Пример создания модуля
Создадим простой модуль "Счётчик кликов":

### 1. Создаём src/modules/Counter/types.ts

```typescript
export interface CounterState {
  count: number;
  isActive: boolean;
}

export interface CounterServiceEvents {
  onCountChange?: (count: number) => void;
  onReset?: () => void;
}
```

### 2. Создаём src/modules/Counter/index.tsx

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { useModulePlugins } from '../../hooks/useModulePlugins';
import { CounterState } from './types';
import { IPluginContext } from '../../types/plugins';

const MODULE_ID = 'counter';

const INITIAL_STATE: CounterState = {
  count: 0,
  isActive: true,
};

const Counter: React.FC = () => {
  const [state, setState] = useState<CounterState>(INITIAL_STATE);
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  const pluginContext: IPluginContext = {
    moduleId: MODULE_ID as any,
    moduleState: state,
    dispatch: (action: string, payload?: any) => {
      if (action === 'increment') {
        setState(prev => ({ ...prev, count: prev.count + 1 }));
      }
      if (action === 'reset') {
        setState(prev => ({ ...prev, count: 0 }));
      }
    },
    getData: () => stateRef.current,
    setData: (data: any) => {
      setState(prev => ({ ...prev, ...data }));
    },
    count: state.count,
  };
  
  const { activePlugins, widgets } = useModulePlugins<CounterState>({
    moduleId: MODULE_ID as any,
    getInitialState: () => INITIAL_STATE,
  });
  
  useEffect(() => {
    console.log(`✅ [${MODULE_ID}] Module initialized`);
    console.log(`📦 [${MODULE_ID}] Active plugins:`, activePlugins.map(p => p.id));
  }, [activePlugins]);
  
  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">Счётчик кликов</h1>
      <div className="text-6xl font-mono mb-6">{state.count}</div>
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => setState(prev => ({ ...prev, count: prev.count + 1 }))}
          className="btn bg-primary"
        >
          ➕ Увеличить
        </button>
        <button
          onClick={() => setState(prev => ({ ...prev, count: 0 }))}
          className="btn bg-secondary"
        >
          🔄 Сброс
        </button>
      </div>
      
      {activePlugins.length > 0 && (
        <div className="mt-6 space-y-4">
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

### 3. Добавляем в src/types/modules.ts

```typescript
export type ModuleType = 'stopwatch' | 'microphone' | 'microphone2' | 'counter';

export const MODULES: IModule[] = [
  // ... существующие
  {
    id: 'counter',
    name: 'Счётчик',
    icon: '🔢',
    description: 'Простой счётчик кликов',
    component: () => null,
  },
];
```

### 4. Добавляем в src/App.tsx

```typescript
import Counter from './modules/Counter';

const moduleComponents: Record<ModuleType, React.ComponentType> = {
  stopwatch: Stopwatch,
  microphone: Microphone,
  microphone2: Microphone2,
  counter: Counter,  // ✅ Добавить
};

MODULES[0].component = Stopwatch;
MODULES[1].component = Microphone;
MODULES[2].component = Microphone2;
MODULES[3].component = Counter;  // ✅ Добавить
```

## Чек-лист
При добавлении нового модуля проверьте:

- [x] Создана папка src/modules/НазваниеМодуля/
- [x] Создан файл types.ts с интерфейсами состояния
- [x] Создан файл index.tsx с компонентом модуля
- [x] В index.tsx используется хук useModulePlugins
- [x] Определён MODULE_ID (уникальный идентификатор)
- [x] Создан pluginContext с передачей данных
- [x] Добавлен тип в src/types/modules.ts
- [x] Добавлен модуль в массив MODULES
- [x] Добавлен импорт в src/App.tsx
- [x] Добавлен компонент в moduleComponents
- [x] Добавлен компонент в обновление MODULES

Проверка через консоль
После запуска проверьте наличие логов:

```bash
npm run electron:dev
```

В консоли должно быть:

```text
✅ [название-модуля] Module initialized
📦 [название-модуля] Active plugins: []
```

При переключении на модуль в сайдбаре:

```text
🔄 usePlugins effect for название-модуля, context: provided
```

Частые проблемы

❌ Модуль не появляется в сайдбаре
Причина: Модуль не добавлен в MODULES в src/types/modules.ts

Решение: Добавьте модуль в массив MODULES

❌ Ошибка "Cannot find module"
Причина: Неправильный путь импорта в App.tsx

Решение: Проверьте правильность пути: import Module from './modules/НазваниеМодуля'

❌ Плагины не видны для модуля
Причина: У плагина указан неправильный moduleId

Решение: Убедитесь, что в плагине moduleId совпадает с MODULE_ID модуля

```typescript
// В плагине
moduleId = 'название-модуля' as const;
```

❌ Виджеты не отображаются
Причина: В модуле используется widgets.length > 0 вместо activePlugins.length > 0

Решение: Используйте проверку на activePlugins.length > 0

❌ Контекст не передаётся в виджеты
Причина: В pluginContext не добавлены необходимые поля

Решение: Добавьте все необходимые данные в pluginContext:

```typescript
const pluginContext: IPluginContext = {
  // ... обязательные поля
  // Добавьте специфичные для модуля данные
  myData: state.myData,
};
```

📝 Резюме
После выполнения всех шагов вы должны увидеть:

✅ Новый модуль в сайдбаре
✅ Логи в консоли при запуске
✅ Логи при переключении на модуль
✅ Возможность создавать плагины для модуля
✅ Виджеты плагинов отображаются в модуле

При возникновении проблем — проверьте логи в консоли и сверьтесь с чек-листом.

