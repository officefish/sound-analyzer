Стратегия тестирования в SoundLab

## 📋 Содержание

1. [Введение](#введение)
2. [Философия тестирования](#философия-тестирования)
3. [Приоритеты тестирования](#приоритеты-тестирования)
4. [Уровень 1: Критические тесты](#уровень-1-критические-тесты)
5. [Уровень 2: Стандартные тесты](#уровень-2-стандартные-тесты)
6. [Уровень 3: Факультативные тесты](#уровень-3-факультативные-тесты)
7. [Что НЕ нужно тестировать](#что-не-нужно-тестировать)
8. [Инструменты](#инструменты)
9. [Примеры тестов](#примеры-тестов)
10. [Чек-лист](#чек-лист)

---

## Введение

SoundLab — проект с высоким темпом развития. Мы не пишем тесты "для галочки". Каждый тест должен **приносить пользу** и **окупать время**, затраченное на его написание.

### Наша философия

> **"Тесты — это страховка, а не самоцель"**

| Подход | Наш выбор |
|--------|-----------|
| TDD (Test-Driven Development) | ❌ Только для критических компонентов |
| Высокое покрытие (90%+) | ❌ Не требуется |
| Тестирование только важного | ✅ Да |
| Быстрая обратная связь | ✅ Да |
| Документация через тесты | ✅ Для API и сервисов |

---

## Приоритеты тестирования

Тесты разделены на **три уровня приоритета**:
┌─────────────────────────────────────────────────────────────────────────────┐
│ УРОВЕНЬ 1: КРИТИЧЕСКИЕ │
│ ● Работа с аудио (Web Audio API) │
│ ● Плагинная архитектура │
│ ● Сохранение/восстановление состояния │
│ ● Аутентификация/разрешения │
│ ● Работа с файловой системой (Electron) │
├─────────────────────────────────────────────────────────────────────────────┤
│ УРОВЕНЬ 2: СТАНДАРТНЫЕ │
│ ● Бизнес-логика сервисов │
│ ● Публичные API методов │
│ ● Обработка ошибок │
│ ● Утилиты и хелперы │
│ ● Валидация данных │
├─────────────────────────────────────────────────────────────────────────────┤
│ УРОВЕНЬ 3: ФАКУЛЬТАТИВНЫЕ │
│ ● UI компоненты │
│ ● Анимации и переходы │
│ ● Вёрстка и адаптивность │
│ ● Краевые случаи (edge cases) │
│ ● Интернационализация │
└─────────────────────────────────────────────────────────────────────────────┘

text

---

## Уровень 1: Критические тесты

### 🚨 Когда писать обязательно

Тесты этого уровня пишутся **ДО** или **СРАЗУ ПОСЛЕ** написания кода.

| Ситуация | Почему | Пример |
|----------|--------|--------|
| Работа с внешними API | Ошибка может сломать всё приложение | Web Audio API, MediaDevices |
| Сохранение данных | Потеря данных недопустима | localStorage, файлы |
| Плагинная архитектура | Без тестов сложно отладить | Регистрация, активация |
| Обработка разрешений | Пользовательский опыт | Доступ к микрофону |
| Electron IPC | Критический мост | Основной процесс ↔ Рендер |

### ✅ Что тестировать

```typescript
// 1. Работа с микрофоном
describe('MicrophoneService', () => {
  it('should request permissions on start', async () => {});
  it('should handle permission denial gracefully', async () => {});
  it('should release resources on stop', async () => {});
});

// 2. Плагинная архитектура
describe('PluginsStore', () => {
  it('should register plugin correctly', () => {});
  it('should persist enabled state', () => {});
  it('should restore context on rehydrate', () => {});
});

// 3. Сохранение состояния
describe('useAppStore', () => {
  it('should persist current app to localStorage', () => {});
  it('should restore from localStorage on load', () => {});
});
```

❌ Что НЕ тестировать

- Детали реализации Web Audio API (мы не тестируем браузер)
- Внутренние состояния, которые не влияют на API

## Уровень 2: Стандартные тесты

### 📋 Когда писать в процессе разработки

Тесты этого уровня пишутся ВМЕСТЕ с кодом, но не требуют TDD.

Ситуация	Почему	Пример
Сложная бизнес-логика	Легко допустить ошибку	Алгоритмы анализа звука
Публичные методы	API должен быть стабильным	execute(), onModuleEvent()
Обработка ошибок	Пользователь должен знать о проблемах	try/catch блоки
Утилиты и хелперы	Переиспользуются везде	formatTime(), debounce()
Валидация данных	Безопасность и корректность	Проверка входных данных

✅ Что тестировать

```typescript
// 1. Бизнес-логика сервисов
describe('AudioAnalysisService', () => {
  it('should calculate RMS correctly', () => {});
  it('should detect peak volume', () => {});
  it('should apply noise gate filter', () => {});
});

// 2. Публичные методы плагинов
describe('TuneMonitorPlugin', () => {
  it('should execute "setWidgetState" action', () => {});
  it('should return correct value on "getWidgetState"', () => {});
  it('should reset all widgets on "resetWidgets"', () => {});
});

// 3. Обработка ошибок
describe('MicrophoneService', () => {
  it('should emit error event when device not found', async () => {});
  it('should handle AudioContext suspension', async () => {});
});

// 4. Утилиты
describe('formatTime', () => {
  it('should format milliseconds to HH:MM:SS.ms', () => {});
  it('should handle hours correctly', () => {});
  it('should pad single digits with zero', () => {});
});
```

❌ Что НЕ тестировать

- Очевидные однострочные функции без логики
- Простые геттеры/сеттеры
- Конфигурационные файлы

## Уровень 3: Факультативные тесты

💡 Когда писать по желанию

Тесты этого уровня пишутся ЕСЛИ ЕСТЬ ВРЕМЯ или при возникновении проблем.

Ситуация	Почему	Пример

UI компоненты	Часто меняются, тесты ломаются	Кнопки, карточки
Анимации	Трудно тестировать автоматически	Переходы, пульсация
Вёрстка	Лучше проверять визуально	Адаптивность, темы
Краевые случаи	Редко встречаются	Очень длинные строки
Интернационализация	Можно проверить вручную	Переводы

✅ Что можно тестировать (опционально)

```typescript
// 1. UI компоненты (только базовое)
describe('Button', () => {
  it('should render children correctly', () => {
    render(<Button>Click</Button>);
    expect(screen.getByText('Click')).toBeInTheDocument();
  });
  
  it('should handle click events', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalled();
  });
});

// 2. Адаптивность (ручная проверка)
// Не пишем автоматические тесты для медиа-запросов

// 3. Краевые случаи (только если баг уже был)
describe('formatTime', () => {
  it('should handle negative values', () => {
    expect(formatTime(-1000)).toBe('00:00:00.00');
  });
});
```

❌ Что НЕ нужно тестировать

- Snapshot-тесты (слишком хрупкие)
- Тесты для каждой адаптивной версии
- Тесты анимаций
- Тесты совместимости с разными браузерами (ручное тестирование)

Что НЕ нужно тестировать

🚫 Антипаттерны тестирования

Не тестируйте	Почему	Вместо этого
React-компоненты полностью	Часто меняются, тесты ломаются	Тестируйте только критическую логику
Snapshot-тесты	Хрупкие, не несут пользы	Используйте getBy* ассерты
Внутренние детали реализации	Рефакторинг ломает тесты	Тестируйте публичное API
Конфигурацию	Не содержит логики	Доверяйте коду
CSS-классы	Не влияют на функционал	Проверяйте наличие элемента
Библиотеки	Не наша ответственность	Верьте в авторов библиотек

### Примеры плохих тестов

```typescript
// ❌ ПЛОХО: Snapshot-тест
expect(component).toMatchSnapshot();

// ❌ ПЛОХО: Тест на CSS-классы
expect(button.className).toContain('btn-primary');

// ❌ ПЛОХО: Тест внутреннего состояния
expect(component.instance().state.isOpen).toBe(true);

// ❌ ПЛОХО: Тест конфигурации
expect(i18n.options.fallbackLng).toBe('ru');
```

### Хорошие альтернативы

```typescript
// ✅ ХОРОШО: Проверка результата действия
expect(screen.getByText('Success')).toBeInTheDocument();

// ✅ ХОРОШО: Проверка бизнес-логики
expect(formatTime(65000)).toBe('00:01:05.00');

// ✅ ХОРОШО: Проверка вызова API
expect(mockGetUserMedia).toHaveBeenCalled();
```
## Инструменты

### Основной стек

Инструмент	Назначение	Уровни

Jest	Тест-раннер	1, 2, 3
@testing-library/react	Рендер компонентов	2, 3
@testing-library/user-event	Симуляция действий	2, 3
jest-mock	Моки для API	1, 2

### Установка

```bash
npm install --save-dev \
  jest \
  @types/jest \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  ts-jest
```

## Конфигурация

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 30, // Низкий порог — тестируем только важное
      branches: 20,
      functions: 30,
      lines: 30,
    },
  },
};
```

```typescript
// src/setupTests.ts
import '@testing-library/jest-dom';

// Мок для MediaDevices API
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(),
    enumerateDevices: jest.fn(),
  },
  configurable: true,
});

// Мок для AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createMediaStreamSource: jest.fn().mockReturnValue({ connect: jest.fn() }),
  createAnalyser: jest.fn().mockReturnValue({
    connect: jest.fn(),
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn(),
  }),
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
}));
```

## Примеры тестов по уровням

### Уровень 1: Критический (MicrophoneService)

```typescript
// src/services/__tests__/MicrophoneService.test.ts
import { MicrophoneService } from '../MicrophoneService';

describe('MicrophoneService (Critical)', () => {
  let service: MicrophoneService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new MicrophoneService();
  });
  
  afterEach(() => {
    service.dispose();
  });
  
  describe('start', () => {
    it('should request microphone permissions', async () => {
      const mockStream = { getTracks: () => [{ stop: jest.fn() }] };
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(mockStream);
      
      await service.start();
      
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });
    
    it('should handle permission denial', async () => {
      const errorSpy = jest.fn();
      service.on('onError', errorSpy);
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(new Error('Denied'));
      
      const result = await service.start();
      
      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith('Failed to access microphone');
    });
  });
  
  describe('stop', () => {
    it('should release all resources', async () => {
      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }],
      };
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(mockStream);
      
      await service.start();
      service.stop();
      
      expect(mockStream.getTracks()[0].stop).toHaveBeenCalled();
    });
  });
});
```

### Уровень 2: Стандартный (AudioAnalysisService)

```typescript
// src/services/__tests__/AudioAnalysisService.test.ts
import { AudioAnalysisService } from '../AudioAnalysisService';

describe('AudioAnalysisService (Standard)', () => {
  let service: AudioAnalysisService;
  
  beforeEach(() => {
    service = new AudioAnalysisService();
  });
  
  describe('calculateRMS', () => {
    it('should calculate RMS correctly for simple array', () => {
      const samples = new Float32Array([0.5, -0.5, 0.5, -0.5]);
      const rms = service.calculateRMS(samples);
      expect(rms).toBeCloseTo(0.5);
    });
    
    it('should return 0 for empty array', () => {
      const rms = service.calculateRMS(new Float32Array(0));
      expect(rms).toBe(0);
    });
  });
  
  describe('applyNoiseGate', () => {
    it('should filter values below threshold', () => {
      const result = service.applyNoiseGate(0.05, 0.1);
      expect(result).toBe(0);
    });
    
    it('should pass values above threshold', () => {
      const result = service.applyNoiseGate(0.15, 0.1);
      expect(result).toBe(0.15);
    });
  });
});
```

### Уровень 3: Факультативный (UI компонент)

```typescript
// src/modules/Microphone/__tests__/VolumeWidget.test.tsx
import { render, screen } from '@testing-library/react';
import { VolumeWidget } from '../components/VolumeWidget';

// Только базовые проверки, без деталей стилей
describe('VolumeWidget (Optional)', () => {
  it('should render volume percentage', () => {
    render(<VolumeWidget volume={0.75} isRecording={true} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
  
  it('should show "--" when not recording', () => {
    render(<VolumeWidget volume={0} isRecording={false} />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });
  
  // ❌ НЕ ТЕСТИРУЕМ:
  // - Цвет прогресс-бара
  // - Анимации
  // - Адаптивные классы
});
```

## Скорость разработки vs Тесты

### График принятия решений

┌─────────────────────────────────────────────────────────────────┐
│                    НОВЫЙ КОД                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Код влияет на критическую      │
              │ функциональность?              │
              └───────────────────────────────┘
                    │                    │
                   YES                   NO
                    │                    │
                    ▼                    ▼
    ┌───────────────────────┐  ┌───────────────────────────────┐
    │ УРОВЕНЬ 1             │  │ Код содержит сложную          │
    │ Пишем тесты ДО кода   │  │ бизнес-логику?                │
    │ (TDD)                 │  └───────────────────────────────┘
    └───────────────────────┘           │                    │
                                        YES                   NO
                                         │                    │
                                         ▼                    ▼
                         ┌───────────────────────┐  ┌───────────────────────┐
                         │ УРОВЕНЬ 2             │  │ УРОВЕНЬ 3             │
                         │ Пишем тесты ПОСЛЕ     │  │ Тесты опционально     │
                         │ кода                  │  │ или пропускаем        │
                         └───────────────────────┘  └───────────────────────┘

### Временные затраты

Уровень	Время на написание	Окупаемость
Уровень 1	30-60 мин	✅ Всегда
Уровень 2	10-30 мин	✅ Обычно
Уровень 3	5-15 мин	❔ Иногда

## Чек-лист

### Перед написанием теста

- Этот код может сломать приложение? → Уровень 1
- В коде есть сложная логика/алгоритмы? → Уровень 2
- Это простой UI компонент? → Уровень 3 (пропустить)

Тест будет ломаться при каждом рефакторинге? → Не писать

### При поддержке тестов

- [x] Тесты не мешают рефакторингу
- [x] Тесты не требуют постоянного обновления
- [x] Тесты дают полезную обратную связь
- [x] Время на поддержку тестов < 10% времени разработки

## 📝 Резюме

Уровень	Когда писать	Пример	Приоритет
1. Критические	До/сразу после кода	Web Audio API, плагины	🔴 Обязательно
2. Стандартные	Вместе с кодом	Бизнес-логика, утилиты	🟡 Рекомендуется
3. Факультативные	При наличии времени	UI, анимации	🟢 Опционально

## Золотое правило

Пиши тесты, которые защищают от реальных проблем. Не пиши тесты, которые нужны только для покрытия.

Проект должен развиваться быстро. Тесты — это инструмент, а не самоцель. Если тест не помогает находить баги — он не нужен.
