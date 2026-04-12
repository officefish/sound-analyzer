Управление состоянием с Zustand в SoundLab

## 📋 Содержание

1. [Введение](#введение)
2. [Архитектура сторов](#архитектура-сторов)
3. [Когда создавать новый стор](#когда-создавать-новый-стор)
4. [Когда использовать общий стор](#когда-использовать-общий-стор)
5. [Сравнительная таблица](#сравнительная-таблица)
6. [Практические примеры](#практические-примеры)
7. [Паттерны использования](#паттерны-использования)
8. [Антипаттерны](#антипаттерны)
9. [Чек-лист](#чек-лист)

---

## Введение

В SoundLab для управления состоянием используется **Zustand** — минималистичная библиотека для управления состоянием в React.

### Почему Zustand?

| Критерий | Zustand | Redux | MobX | Context API |
|----------|---------|-------|------|-------------|
| **Бойлерплейт** | Минимальный | Большой | Средний | Минимальный |
| **Производительность** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **TypeScript** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Вне React** | ✅ | ✅ | ✅ | ❌ |
| **Размер** | ~3KB | ~45KB | ~50KB | Встроен |

**Итог:** Zustand идеально подходит для средних и больших приложений, требующих простого и эффективного управления состоянием.

---

## Архитектура сторов

### Текущая структура сторов
src/store/
├── appStore.ts # Общее состояние приложения
├── pluginsStore.ts # Состояние плагинов
└── (другие сторы по необходимости)

text

### Принципы разделения
┌─────────────────────────────────────────────────────────────────────────────┐
│ appStore.ts │
│ ├── currentApp: "stopwatch" | "microphone" | "microphone2" │
│ ├── settings: { theme, notificationsEnabled } │
│ └── navigationCount: { stopwatch: number, microphone: number } │
└─────────────────────────────────────────────────────────────────────────────┘
│
│ (не зависит)
▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ pluginsStore.ts │
│ ├── activePluginIds: Set<string> │
│ ├── pluginSettings: Map<string, Record<string, any>> │
│ └── activePluginContexts: Map<string, IPluginContext> │
└─────────────────────────────────────────────────────────────────────────────┘
│
│ (не зависит)
▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ module-specific stores (опционально) │
│ ├── microphoneStore.ts # Специфичное состояние микрофона │
│ └── stopwatchStore.ts # Специфичное состояние секундомера │
└─────────────────────────────────────────────────────────────────────────────┘

text

---

## Когда создавать новый стор

### ✅ Критерии для создания отдельного стора

| Критерий | Описание | Пример |
|----------|----------|--------|
| **Независимая логика** | Состояние не зависит от других частей приложения | Плагины не зависят от текущего модуля |
| **Сложная структура** | Состояние содержит Map, Set, вложенные объекты | `activePluginIds: Set<string>` |
| **Отдельная персистентность** | Должно сохраняться независимо | Настройки плагинов сохраняются отдельно |
| **Крупный объём** | Много связанных полей (5+ полей) | Состояние плагина с настройками |
| **Переиспользование** | Используется в нескольких компонентах | `usePluginsStore` используется везде |
| **Отдельное тестирование** | Логика требует изолированного тестирования | Плагинная архитектура |

### Пример: `pluginsStore.ts`

```typescript
// ✅ ПРАВИЛЬНО: Отдельный стор для плагинов
// Причины:
// 1. Сложная структура (Map, Set)
// 2. Независимая логика
// 3. Своя персистентность
// 4. Используется во многих компонентах

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PluginsState {
  activePluginIds: Set<string>;
  pluginSettings: Map<string, Record<string, any>>;
  
  activatePlugin: (id: string) => void;
  deactivatePlugin: (id: string) => void;
  updateSettings: (id: string, settings: any) => void;
}

export const usePluginsStore = create<PluginsState>()(
  persist(
    (set) => ({
      activePluginIds: new Set(),
      pluginSettings: new Map(),
      
      activatePlugin: (id) => set((state) => ({
        activePluginIds: new Set([...state.activePluginIds, id])
      })),
      
      deactivatePlugin: (id) => set((state) => {
        const newSet = new Set(state.activePluginIds);
        newSet.delete(id);
        return { activePluginIds: newSet };
      }),
      
      updateSettings: (id, settings) => set((state) => ({
        pluginSettings: new Map(state.pluginSettings).set(id, settings)
      })),
    }),
    {
      name: 'plugins-storage',
      partialize: (state) => ({
        activePluginIds: Array.from(state.activePluginIds),
        pluginSettings: Array.from(state.pluginSettings.entries()),
      }),
    }
  )
);
```

### Когда использовать общий стор

- ✅ Критерии для использования общего стора

Критерий	Описание	Пример
Глобальное состояние	Нужно во всём приложении	Текущий модуль, тема
Простая структура	Примитивные типы, плоские объекты	currentApp: string
Небольшой объём	1-5 простых полей	Настройки приложения
Связанная логика	Поля логически связаны	Навигация и счётчики
Единая персистентность	Сохраняется вместе	Все настройки приложения

Пример: appStore.ts

```typescript
// ✅ ПРАВИЛЬНО: Общий стор для приложения
// Причины:
// 1. Глобальное состояние
// 2. Простая структура
// 3. Логически связанные поля

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  currentApp: 'stopwatch' | 'microphone' | 'microphone2';
  settings: {
    theme: 'dark' | 'light';
    notificationsEnabled: boolean;
  };
  navigationCount: {
    stopwatch: number;
    microphone: number;
    microphone2: number;
  };
  
  setCurrentApp: (app: AppState['currentApp']) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  incrementNavigationCount: (app: keyof AppState['navigationCount']) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentApp: 'stopwatch',
      settings: {
        theme: 'dark',
        notificationsEnabled: true,
      },
      navigationCount: {
        stopwatch: 0,
        microphone: 0,
        microphone2: 0,
      },
      
      setCurrentApp: (app) => set({ currentApp: app }),
      
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      
      incrementNavigationCount: (app) => set((state) => ({
        navigationCount: {
          ...state.navigationCount,
          [app]: state.navigationCount[app] + 1
        }
      })),
    }),
    {
      name: 'stopwatch-app-storage',
      partialize: (state) => ({
        currentApp: state.currentApp,
        settings: state.settings,
        navigationCount: state.navigationCount,
      }),
    }
  )
);
```

### Сравнительная таблица

Аспект	Общий стор (appStore)	Отдельный стор (pluginsStore)
Назначение	Глобальное состояние приложения	Специфичная подсистема
Количество полей	3-5	3-10+
Сложность типов	Примитивы, простые объекты	Map, Set, сложные объекты
Персистентность	Единая для всего стора	Своя логика сохранения
Зависимости	Минимальные	Может зависеть от других сторов
Переиспользование	Во всём приложении	В специфичных компонентах
Тестирование	Интеграционное	Изолированное

## Практические примеры

### Пример 1: Состояние модуля (лучше в локальном состоянии)

```typescript
// ❌ НЕ НУЖЕН ОТДЕЛЬНЫЙ СТОР
// Состояние секундомера живёт внутри компонента
const Stopwatch = () => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  
  // Логика здесь
};

// ✅ ЕСЛИ НУЖНО РАЗДЕЛИТЬ СОСТОЯНИЕ МЕЖДУ КОМПОНЕНТАМИ
// Например, статус записи нужен в нескольких местах
export const useMicrophoneStore = create((set) => ({
  isRecording: false,
  volume: 0,
  selectedDeviceId: null,
  
  startRecording: () => set({ isRecording: true }),
  stopRecording: () => set({ isRecording: false, volume: 0 }),
  setVolume: (volume) => set({ volume }),
  setDevice: (id) => set({ selectedDeviceId: id }),
}));
```

### Пример 2: Настройки пользователя (общий стор)

```typescript
// ✅ ПРАВИЛЬНО: В appStore
// Настройки нужны везде и связаны логически
interface AppState {
  settings: {
    theme: 'dark' | 'light';
    language: 'ru' | 'en';
    notifications: boolean;
    autoSave: boolean;
  };
  updateSettings: (settings: Partial<AppState['settings']>) => void;
}

// ❌ НЕПРАВИЛЬНО: Отдельный стор для каждой настройки
const useThemeStore = create(() => ({ theme: 'dark' }));
const useLanguageStore = create(() => ({ language: 'ru' }));
const useNotificationsStore = create(() => ({ enabled: true }));
```

### Пример 3: Данные плагинов (отдельный стор)

```typescript
// ✅ ПРАВИЛЬНО: Отдельный стор для плагинов
// Сложная структура, независимая логика
interface PluginsState {
  activePlugins: Map<string, boolean>;
  pluginConfigs: Map<string, PluginConfig>;
  
  registerPlugin: (plugin: Plugin) => void;
  activatePlugin: (id: string) => void;
  getPluginConfig: (id: string) => PluginConfig | undefined;
}

// ❌ НЕПРАВИЛЬНО: В общем сторе
// appStore станет слишком большим и сложным
interface AppState {
  // 50+ полей для разных плагинов ❌
  plugin1Enabled: boolean;
  plugin1Settings: any;
  plugin2Enabled: boolean;
  plugin2Settings: any;
  // ...
}
```

## Паттерны использования

### 1. Комбинирование сторов

```typescript
// Компонент может использовать несколько сторов
const MicrophoneComponent = () => {
  // Глобальное состояние
  const { settings } = useAppStore();
  
  // Специфичное состояние микрофона
  const { isRecording, startRecording, stopRecording } = useMicrophoneStore();
  
  // Состояние плагинов
  const { activePlugins } = usePluginsStore();
  
  // ...
};
```

### 2. Селекторы для производительности

```typescript
// ❌ ПЛОХО: Реагирует на любое изменение стора
const { currentApp, settings, navigationCount } = useAppStore();

// ✅ ХОРОШО: Реагирует только на нужное поле
const currentApp = useAppStore((state) => state.currentApp);
const theme = useAppStore((state) => state.settings.theme);
```

### 3. Действия вне компонентов

```typescript
// В сервисах можно использовать стор напрямую
// Не нужно передавать setState через пропсы

// microphone.service.ts
import { useMicrophoneStore } from '../store/microphoneStore';

export class MicrophoneService {
  startRecording() {
    // Обновляем стор из сервиса
    useMicrophoneStore.getState().startRecording();
  }
}
```

### 4. Сброс состояния

```typescript
// Добавляем метод сброса в стор
interface AppState {
  // ... поля
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // ... начальное состояние
  reset: () => set(initialState),
}));

// Использование
const resetApp = useAppStore((state) => state.reset);
resetApp(); // Сброс всех настроек
```

## Антипаттерны

- ❌ Стор на каждый useState

```typescript
// ❌ ПЛОХО: Избыточное создание сторов
const useButtonColorStore = create(() => ({ color: 'blue' }));
const useButtonSizeStore = create(() => ({ size: 'medium' }));
const useButtonTextStore = create(() => ({ text: 'Click' }));

// ✅ ХОРОШО: Один стор для связанных данных
const useButtonStore = create(() => ({
  color: 'blue',
  size: 'medium',
  text: 'Click',
}));

❌ Стор с огромным количеством полей
```

```typescript
// ❌ ПЛОХО: Слишком много несвязанных полей
interface GodStore {
  user: User;
  products: Product[];
  cart: Cart;
  notifications: Notification[];
  theme: string;
  language: string;
  // ... 50+ полей
}

// ✅ ХОРОШО: Разделение на логические группы
const useUserStore = create(...);
const useCartStore = create(...);
const useSettingsStore = create(...);
```

❌ Хранение вычисляемых значений

```typescript
// ❌ ПЛОХО: Хранение производных данных
interface Store {
  count: number;
  doubled: number; // всегда count * 2
  formatted: string; // всегда `${count} items`
}

// ✅ ХОРОШО: Вычисление на лету
const doubled = useStore((state) => state.count * 2);
const formatted = `${count} items`;
```

❌ Отсутствие типизации

```typescript
// ❌ ПЛОХО: Нет TypeScript
export const useStore = create((set) => ({
  data: null,
  setData: (d) => set({ data: d }),
}));

// ✅ ХОРОШО: Полная типизация
interface Store {
  data: string | null;
  setData: (data: string) => void;
}

export const useStore = create<Store>((set) => ({
  data: null,
  setData: (data) => set({ data }),
}));
```

## Чек-лист

### При создании нового стора

- [x] Состояние используется в нескольких компонентах?
- [x] Состояние имеет сложную структуру (Map, Set, вложенные объекты)?
- [x] Логика состояния независима от других частей приложения?
- [x] Требуется отдельная персистентность?
- [x] Состояние будет тестироваться изолированно?

✅ 3+ да → создавайте отдельный стор

### При использовании общего стора

- [x] Состояние глобально (нужно во всём приложении)?
- [x] Поля логически связаны?
- [x] Простая структура (примитивы, плоские объекты)?
- [x] Небольшой объём (до 5-10 полей)?
- [x] Изменения состояния редкие?

✅ 3+ да → используйте общий стор

### При рефакторинге

- [x] Стор не стал "божественным объектом" (>20 полей)
- [x] Нет дублирования состояния в разных сторах
- [x] Все сторы имеют чёткую ответственность
- [x] Производительность не страдает из-за лишних ререндеров

## 📝 Резюме

Сценарий	Решение	Пример

Глобальные настройки	Общий стор	appStore
Состояние модуля	Локальный useState	Секундомер
Состояние между компонентами	Отдельный стор	microphoneStore
Сложная подсистема	Отдельный стор	pluginsStore
Кэш данных	Отдельный стор	cacheStore
Временное состояние формы	Локальный useState	Форма ввода

## Золотое правило: 

Начинайте с локального состояния. Если оно начинает "путешествовать" по компонентам или усложняется — выносите в стор. Не создавайте сторы "на всякий случай".