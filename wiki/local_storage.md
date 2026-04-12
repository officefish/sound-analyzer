# 💾 Работа с локальным хранилищем (localStorage) в SoundLab

## 📋 Содержание

1. [Введение](#введение)
2. [Архитектура хранения](#архитектура-хранения)
3. [Структура хранилища](#структура-хранилища)
4. [Сохранение состояния модулей](#сохранение-состояния-модулей)
5. [Сохранение состояния плагинов](#сохранение-состояния-плагинов)
6. [Подводные камни](#подводные-камни)
7. [Лучшие практики](#лучшие-практики)
8. [Отладка хранилища](#отладка-хранилища)
9. [Чек-лист](#чек-лист)

---

## Введение

В SoundLab используется **локальное хранилище браузера (localStorage)** для персистентности состояния приложения. Это позволяет:

- Сохранять текущий модуль между сессиями
- Восстанавливать активные плагины после перезагрузки
- Сохранять настройки виджетов
- Не терять пользовательские предпочтения

### Почему localStorage, а не IndexedDB или файлы?

| Критерий | localStorage | IndexedDB | Файлы (Electron) |
|----------|--------------|-----------|------------------|
| **Простота** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Объём** | ~5-10 МБ | ~500 МБ+ | Неограничен |
| **Скорость** | Синхронно | Асинхронно | Асинхронно |
| **Надёжность** | Высокая | Высокая | Средняя |
| **Кроссплатформенность** | ✅ | ✅ | ❌ (только Electron) |

**Итог:** localStorage достаточно для хранения состояния (настройки, ID активных плагинов), но не подходит для больших данных (аудио, файлы).

---

## Архитектура хранения

### Общая схема
┌─────────────────────────────────────────────────────────────────────────────┐
│ localStorage │
├─────────────────────────────────────────────────────────────────────────────┤
│ │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ stopwatch-app-storage (Zustand persist) │ │
│ │ ├── state.currentApp: "microphone2" │ │
│ │ ├── state.settings.theme: "dark" │ │
│ │ ├── state.settings.notificationsEnabled: true │ │
│ │ └── state.navigationCount: { stopwatch: 5, microphone: 3 } │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ plugins-storage (Zustand persist) │ │
│ │ ├── state.activePluginIds: ["microphone2-tune-monitor"] │ │
│ │ └── state.pluginSettings: [ │ │
│ │ ["microphone2-tune-monitor", { │ │
│ │ showVolume: true, │ │
│ │ showQuality: true, │ │
│ │ showWaveform: true, │ │
│ │ showSpectrum: true │ │
│ │ }] │ │
│ │ ] │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ i18nextLng (i18next) │ │
│ │ └── "ru" или "en" │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ lap-history (Custom) │ │
│ │ └── [{"number":1,"time":"00:00:05.23","timestamp":...}] │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ │
└─────────────────────────────────────────────────────────────────────────────┘

text

### Ключи хранилища

| Ключ | Назначение | Формат |
|------|-----------|--------|
| `stopwatch-app-storage` | Состояние приложения (текущий модуль, настройки) | JSON |
| `plugins-storage` | Состояние плагинов (активные, настройки) | JSON |
| `i18nextLng` | Выбранный язык | `ru`/`en` |
| `lap-history` | История кругов секундомера | JSON массив |

---

## Сохранение состояния модулей

### Использование Zustand persist

```typescript
// src/store/appStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentApp: 'stopwatch',
      setCurrentApp: (app) => set({ currentApp: app }),
      
      settings: {
        theme: 'dark',
        notificationsEnabled: true,
      },
      updateSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings }
      })),
      
      navigationCount: {
        stopwatch: 0,
        microphone: 0,
      },
      incrementNavigationCount: (app) => set((state) => ({
        navigationCount: {
          ...state.navigationCount,
          [app]: (state.navigationCount[app] || 0) + 1
        }
      })),
    }),
    {
      name: 'stopwatch-app-storage', // Ключ в localStorage
      partialize: (state) => ({
        // Сохраняем только нужные поля
        currentApp: state.currentApp,
        settings: state.settings,
        navigationCount: state.navigationCount,
      }),
    }
  )
);
```

### Что сохраняется

```json
{
  "state": {
    "currentApp": "microphone2",
    "settings": {
      "theme": "dark",
      "notificationsEnabled": true
    },
    "navigationCount": {
      "stopwatch": 3,
      "microphone": 5
    }
  },
  "version": 0
}
```

## Сохранение состояния плагинов

### Проблема: сериализация Map и Set

Zustand не умеет автоматически сериализовать Map и Set. Поэтому нужно преобразовывать их в массивы.

### Решение

```typescript
// src/store/pluginsStore.ts

export const usePluginsStore = create<PluginsState>()(
  persist(
    (set, get) => ({
      // Храним как Set в памяти
      activePluginIds: new Set<string>(),
      // Храним как Map в памяти
      pluginSettings: new Map<string, Record<string, any>>(),
      
      // ... методы
    }),
    {
      name: 'plugins-storage',
      
      // ✅ При сохранении: Map/Set → массивы
      partialize: (state) => ({
        activePluginIds: Array.from(state.activePluginIds),
        pluginSettings: Array.from(state.pluginSettings.entries()),
      }),
      
      // ✅ При восстановлении: массивы → Map/Set
      onRehydrateStorage: () => (state, error) => {
        if (error) return;
        
        const activeIds = (state as any)?.activePluginIds;
        if (activeIds && Array.isArray(activeIds)) {
          (state as any).activePluginIds = new Set(activeIds);
        }
        
        const settingsArr = (state as any)?.pluginSettings;
        if (settingsArr && Array.isArray(settingsArr)) {
          (state as any).pluginSettings = new Map(settingsArr);
        }
      },
    }
  )
);
```

### Важно: не сохранять методы!

```typescript
// ❌ ПЛОХО: Сохраняем плагин целиком (потеря методов)
partialize: (state) => ({
  plugins: state.plugins, // содержит execute, onActivate и т.д.
})

// ✅ ХОРОШО: Сохраняем только идентификаторы и настройки
partialize: (state) => ({
  activePluginIds: Array.from(state.activePluginIds),
  pluginSettings: Array.from(state.pluginSettings.entries()),
})
```

## Подводные камни

### 1. ⚠️ Потеря методов при восстановлении
Проблема: При восстановлении из JSON теряются методы классов.

```typescript
// ❌ ПЛОХО: Сохраняем объект с методами
const plugin = {
  id: 'my-plugin',
  execute: () => { ... }, // функция
  onActivate: () => { ... }, // функция
};
localStorage.setItem('plugin', JSON.stringify(plugin));
// Результат: функции превратятся в undefined

// ✅ ХОРОШО: Сохраняем только идентификатор
localStorage.setItem('activePluginId', 'my-plugin');
// При восстановлении берём плагин из реестра
const plugin = pluginRegistry.get('my-plugin');
```

### 2. ⚠️ Сериализация Map и Set
Проблема: JSON.stringify(new Map()) → {}

```typescript
// ❌ ПЛОХО: Прямая сериализация
const map = new Map([['key', 'value']]);
JSON.stringify(map); // '{}' - пустой объект!

// ✅ ХОРОШО: Преобразование в массив
const toStore = Array.from(map.entries());
JSON.stringify(toStore); // '[["key","value"]]'

// При восстановлении
const restored = new Map(JSON.parse(stored));
```

### 3. ⚠️ Переполнение localStorage
Проблема: localStorage ограничен ~5-10 МБ.

```typescript
// ❌ ПЛОХО: Хранение больших данных
localStorage.setItem('waveformData', JSON.stringify(largeArray)); // 10 МБ+

// ✅ ХОРОШО: Хранение только идентификаторов
localStorage.setItem('lastRecordingId', 'recording-123');
// Сами данные храним в файлах или IndexedDB
```

### 4. ⚠️ Синхронная природа
Проблема: localStorage работает синхронно, может блокировать UI.

```typescript
// ❌ ПЛОХО: Частые синхронные записи
for (let i = 0; i < 1000; i++) {
  localStorage.setItem(`key-${i}`, value);
}

// ✅ ХОРОШО: Используем debounce или запись только при изменении
let timeoutId: number | null = null;
const saveDebounced = (data: any) => {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    localStorage.setItem('key', JSON.stringify(data));
  }, 300);
};
```

### 5. ⚠️ Восстановление после обновления структуры
Проблема: При обновлении приложения структура данных может измениться.

```typescript
// ✅ ХОРОШО: Версионирование хранилища
const STORAGE_VERSION = 2;

const migrate = (oldData: any) => {
  if (!oldData.version || oldData.version < 2) {
    // Миграция с версии 1 на 2
    return {
      version: 2,
      ...oldData,
      newField: 'default',
    };
  }
  return oldData;
};

const stored = localStorage.getItem('key');
const data = stored ? migrate(JSON.parse(stored)) : initialState;
```

### 6. ⚠️ Конфиденциальные данные
Проблема: localStorage доступен любому скрипту на странице.

```typescript
// ❌ ПЛОХО: Хранение токенов, паролей
localStorage.setItem('userToken', 'secret-token-123');

// ✅ ХОРОШО: Хранение только пользовательских предпочтений
localStorage.setItem('theme', 'dark');
localStorage.setItem('notificationsEnabled', true);
// Для токенов используйте httpOnly cookies или secure Electron storage
```

## Лучшие практики

### 1. Используйте Zustand persist для глобального состояния

```typescript
// ✅ Рекомендуемый подход
export const useStore = create<State>()(
  persist(
    (set) => ({ /* ... */ }),
    { name: 'my-storage-key' }
  )
);
```
### 2. Для кастомных данных используйте сервис-обёртку

```typescript
// ✅ ХОРОШО: Сервис для работы с localStorage
class StorageService {
  private prefix = 'soundlab_';
  
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  }
  
  get<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  
  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }
}

export const storage = new StorageService();
```

### 3. Обрабатывайте ошибки сериализации

```typescript
// ✅ ХОРОШО: try-catch при работе с JSON
const saveData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded, clearing old data...');
      clearOldData();
    }
  }
};
```

### 4. Используйте debounce для частых обновлений

```typescript
// ✅ ХОРОШО: Дебаунс для частых записей
import { debounce } from 'lodash-es';

const saveSettings = debounce((settings: any) => {
  localStorage.setItem('settings', JSON.stringify(settings));
}, 500);
```

### 5. Очищайте неиспользуемые данные

```typescript
// ✅ ХОРОШО: Очистка старых ключей
const cleanupOldStorage = () => {
  const validKeys = ['stopwatch-app-storage', 'plugins-storage', 'i18nextLng'];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !validKeys.includes(key) && key.startsWith('soundlab_')) {
      localStorage.removeItem(key);
    }
  }
};
```

## Отладка хранилища

### Инструменты браузера

DevTools → Application → Local Storage — просмотр всех ключей

Console — ручные операции

```javascript
// Просмотр всех ключей
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(key, JSON.parse(localStorage.getItem(key)));
}

// Просмотр конкретного хранилища
console.log(JSON.parse(localStorage.getItem('plugins-storage')));

// Очистка
localStorage.clear();

// Очистка конкретного ключа
localStorage.removeItem('plugins-storage');
```

### Утилита для отладки

```typescript
// src/utils/debugStorage.ts
export const debugStorage = () => {
  console.group('📦 localStorage debug');
  
  const keys = ['stopwatch-app-storage', 'plugins-storage', 'i18nextLng'];
  
  for (const key of keys) {
    const stored = localStorage.getItem(key);
    if (stored) {
      console.log(`🔑 ${key}:`, JSON.parse(stored));
    } else {
      console.log(`🔑 ${key}: not found`);
    }
  }
  
  console.groupEnd();
};

// В консоли
window.debugStorage();
```

### Мониторинг изменений

```typescript
// Слушаем изменения в localStorage
window.addEventListener('storage', (event) => {
  console.log(`Storage changed: ${event.key}`, {
    oldValue: event.oldValue,
    newValue: event.newValue,
  });
});
```

## Чек-лист

### При добавлении нового хранилища

- [x] Использован Zustand persist для глобального состояния
- [x] Ключ хранилища уникален и осмыслен
- [x] Использован partialize для фильтрации сохраняемых полей
- [x] Map и Set преобразованы в массивы
- [x] Добавлена обработка ошибок сериализации
- [x] Проверено восстановление после перезагрузки

### При работе с плагинами

- [x] Сохраняются только id активных плагинов, а не сами плагины
- [x] Настройки плагинов сохраняются отдельно
- [x] При восстановлении плагины берутся из глобального реестра
- [x] Методы (execute, onActivate) не теряются

### При изменении структуры данных

- [x] Добавлена версионирование хранилища
- [x] Написана миграция для старых данных
- [x] Проверена обратная совместимость

### Для отладки

- [x] Добавлена утилита debugStorage() в консоль
- [x] Логируются ошибки сериализации
- [x] В development режиме видно, что сохраняется

## 📝 Резюме

Аспект	Рекомендация
 
Глобальное состояние	Zustand persist
Map/Set	Преобразовывать в массивы
Методы классов	Не сохранять, хранить только ID
Большие данные	Не хранить в localStorage
Частые обновления	Debounce
Ошибки	Try-catch
Отладка	DevTools + утилита

### Золотое правило:

В localStorage храните только то, что нужно для восстановления пользовательского опыта. Всё остальное — в памяти или файлах.