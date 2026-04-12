# 🪝 Руководство по созданию React хуков в SoundLab

## 📋 Содержание

1. [Введение](#введение)
2. [Что такое кастомный хук?](#что-такое-кастомный-хук)
3. [Когда создавать хук](#когда-создавать-хук)
4. [Когда НЕ создавать хук](#когда-не-создавать-хук)
5. [Положительные примеры](#положительные-примеры)
6. [Отрицательные примеры](#отрицательные-примеры)
7. [Практические рекомендации](#практические-рекомендации)
8. [Чек-лист](#чек-лист)

---

## Введение

Кастомные хуки — мощный механизм React для переиспользования логики с состоянием. Однако **не всякая логика должна быть хуком**.

В SoundLab мы следуем чётким критериям для принятия решения о вынесении кода в отдельный хук.

---

## Что такое кастомный хук?

Кастомный хук — это функция, имя которой начинается с `use`, и которая может вызывать другие хуки.

```typescript
// Пример кастомного хука
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  return [value, setValue] as const;
}
```

### Когда создавать хук

✅ Критерии для вынесения логики в хук

Критерий	Описание	Пример

- Повторное использование	Одна и та же логика нужна в нескольких компонентах	useLocalStorage, useDebounce
- Сложная логика состояния	Управление состоянием с несколькими связанными переменными	useForm, useToggle
- Побочные эффекты	Работа с подписками, таймерами, DOM событиями	useWindowSize, useEventListener
- Абстракция сложности	Сокрытие деталей реализации от компонента	useMicrophone, useAudioAnalysis
- Тестируемость	Логику легче тестировать изолированно	useCounter, useTimer

## График принятия решения

┌─────────────────────────────────────────────────────────────────┐
│                    Логика в компоненте                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Используется в нескольких      │
              │ компонентах?                   │
              └───────────────────────────────┘
                    │                    │
                   YES                   NO
                    │                    │
                    ▼                    ▼
    ┌───────────────────────┐  ┌───────────────────────────────┐
    │ ✅ ВЫНОСИТЬ В ХУК      │  │ Логика сложная (5+ строк      │
    │                        │  │ useState/useEffect)?          │
    └───────────────────────┘  └───────────────────────────────┘
                                          │                    │
                                         YES                   NO
                                          │                    │
                                          ▼                    ▼
                          ┌───────────────────────┐  ┌───────────────────────┐
                          │ ✅ ВЫНОСИТЬ В ХУК      │  │ ❌ ОСТАВИТЬ В         │
                          │ (для чистоты кода)    │  │    КОМПОНЕНТЕ         │
                          └───────────────────────┘  └───────────────────────┘

## Когда НЕ создавать хук

### ❌ Критерии против вынесения в хук

Критерий	Почему плохо	Пример
Одиночное использование	Усложняет код без причины	Простой useState в одном месте
Простая логика	Оверхед без выгоды	Один useEffect с простой зависимостью
UI-специфичная логика	Логика тесно связана с разметкой	Обработчики конкретных кнопок
Однократная инициализация	Лучше оставить в компоненте	Начальная загрузка данных для страницы
Производная логика	Используйте useMemo вместо хука	Вычисление значения на основе состояния
Положительные примеры
Пример 1: useMicrophone — работа с микрофоном
Проблема: Логика работы с микрофоном сложная и потенциально переиспользуемая.

### // ❌ ПЛОХО: Вся логика в компоненте (100+ строк)

```tsx
const MicrophoneComponent = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyserRef.current = analyser;
      source.connect(analyser);
      await context.resume();
      setIsRecording(true);
      // ... анализ громкости
    } catch (err) {
      setError('Failed to access microphone');
    }
  };
  
  // ... ещё 50 строк логики
  
  return (/* JSX */);
};
```

```tsx
// ✅ ХОРОШО: Логика вынесена в хук
// hooks/useMicrophone.ts
export const useMicrophone = (deviceId?: string) => {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<MicrophoneService | null>(null);
  
  useEffect(() => {
    const service = new MicrophoneService();
    serviceRef.current = service;
    
    service.on('onVolumeUpdate', setVolume);
    service.on('onRecordingStart', () => setIsRecording(true));
    service.on('onRecordingStop', () => setIsRecording(false));
    service.on('onError', setError);
    
    if (deviceId) {
      service.start(deviceId);
    }
    
    return () => service.dispose();
  }, [deviceId]);
  
  const start = useCallback(() => serviceRef.current?.start(deviceId), [deviceId]);
  const stop = useCallback(() => serviceRef.current?.stop(), []);
  
  return { isRecording, volume, error, start, stop };
};

// Компонент стал чистым и простым
const MicrophoneComponent = () => {
  const { isRecording, volume, error, start, stop } = useMicrophone();
  
  return (
    <div>
      {error && <div className="text-error">{error}</div>}
      <button onClick={start} disabled={isRecording}>Start</button>
      <button onClick={stop} disabled={!isRecording}>Stop</button>
      <div>Volume: {Math.round(volume * 100)}%</div>
    </div>
  );
};
```

### Почему это хороший хук:

- ✅ Сложная логика скрыта от компонента
- ✅ Может использоваться в разных компонентах
- ✅ Легко тестировать
- ✅ Управление жизненным циклом (очистка ресурсов)

## Пример 2: useLocalStorage — работа с хранилищем

### Проблема: Логика работы с localStorage повторяется во многих компонентах.

```tsx
// ❌ ПЛОХО: Повторяющийся код в каждом компоненте
const SettingsPage = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // ...
};

const UserPreferences = () => {
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('notifications') === 'true';
  });
  
  useEffect(() => {
    localStorage.setItem('notifications', String(notifications));
  }, [notifications]);
  
  // ...
};
```

```tsx
// ✅ ХОРОШО: Универсальный хук
// hooks/useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });
  
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error);
    }
  }, [key, value]);
  
  return [value, setValue] as const;
}

// Использование в компонентах
const SettingsPage = () => {
  const [theme, setTheme] = useLocalStorage('theme', 'dark');
  // ...
};

const UserPreferences = () => {
  const [notifications, setNotifications] = useLocalStorage('notifications', true);
  // ...
};
```

### Почему это хороший хук:

- ✅ Устраняет дублирование кода
- ✅ Единая логика обработки ошибок
- ✅ Типизирован (generic)
- ✅ Может использоваться в любом компоненте

## Пример 3: useDebounce — отложенное выполнение

Проблема: Нужно отложить выполнение действия (поиск, валидация) до завершения ввода.

```tsx
// ❌ ПЛОХО: Таймеры в компоненте
const SearchComponent = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const timerRef = useRef<number | null>(null);
  
  const handleSearch = (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const data = await searchAPI(value);
      setResults(data);
    }, 300);
  };
  
  // ...
};
```

```tsx
// ✅ ХОРОШО: Хук useDebounce
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// Использование
const SearchComponent = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    if (debouncedQuery) {
      searchAPI(debouncedQuery).then(setResults);
    }
  }, [debouncedQuery]);
  
  return <input onChange={(e) => setQuery(e.target.value)} />;
};
```

### Почему это хороший хук:

- ✅ Простой и переиспользуемый
- ✅ Решает конкретную проблему
- ✅ Не зависит от бизнес-логики
- ✅ Легко тестировать

## Отрицательные примеры

### Пример 1: Простой toggle — НЕ НУЖЕН ХУК

```tsx
// ❌ ПЛОХО: Хук для простого переключателя
// hooks/useToggle.ts
export const useToggle = (initial = false) => {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  return { value, toggle, setTrue, setFalse };
};

// Использование
const Modal = () => {
  const { value: isOpen, toggle } = useToggle(false);
  
  return (
    <>
      <button onClick={toggle}>Open</button>
      {isOpen && <div>Modal content</div>}
    </>
  );
};
```

```tsx
// ✅ ХОРОШО: Простой useState достаточно
const Modal = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open</button>
      {isOpen && <div>Modal content</div>}
    </>
  );
};
```

### Почему это плохой хук:

- ❌ Решает тривиальную задачу (один useState)
- ❌ Не добавляет ценности
- ❌ Усложняет чтение кода (нужно заглядывать в хук)
- ❌ Создаёт ненужную абстракцию

### Пример 2: Простой таймер — НЕ НУЖЕН ХУК

```tsx
// ❌ ПЛОХО: Хук для таймера, который используется один раз
// hooks/useTimer.ts
export const useTimer = (initialSeconds: number) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    let interval: number | null = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(s => s - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds]);
  
  const start = useCallback(() => setIsActive(true), []);
  const reset = useCallback(() => {
    setIsActive(false);
    setSeconds(initialSeconds);
  }, [initialSeconds]);
  
  return { seconds, isActive, start, reset };
};

// Использование (только в одном компоненте)
const VerificationCode = () => {
  const { seconds, start, reset } = useTimer(60);
  
  return (
    <div>
      <button onClick={start} disabled={seconds !== 60}>
        Send code
      </button>
      {seconds < 60 && <div>Resend in {seconds}s</div>}
    </div>
  );
};
```

```tsx
// ✅ ХОРОШО: Простая логика прямо в компоненте
const VerificationCode = () => {
  const [seconds, setSeconds] = useState(60);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    let interval: number | null = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => setSeconds(s => s - 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, seconds]);
  
  const handleSend = () => {
    setIsActive(true);
    setSeconds(60);
    // логика отправки кода
  };
  
  return (
    <div>
      <button onClick={handleSend} disabled={isActive}>
        Send code
      </button>
      {isActive && <div>Resend in {seconds}s</div>}
    </div>
  );
};
```

### Почему это плохой хук:

- ❌ Используется только в одном месте
- ❌ Логика простая и понятная
- ❌ Хук добавляет уровень косвенности
- ❌ Не переиспользуется

### Пример 3: UI-специфичная логика — НЕ НУЖЕН ХУК

```tsx
// ❌ ПЛОХО: Хук с логикой, привязанной к конкретному UI
// hooks/useFormattedVolume.ts
export const useFormattedVolume = (rawVolume: number) => {
  const [formatted, setFormatted] = useState('0%');
  
  useEffect(() => {
    const percent = Math.min(100, Math.max(0, Math.round(rawVolume * 100)));
    const color = percent < 30 ? 'text-green-500' : percent < 70 ? 'text-yellow-500' : 'text-red-500';
    setFormatted(`${percent}%`);
    
    // Также обновляем DOM напрямую (плохо!)
    document.documentElement.style.setProperty('--volume-color', color);
  }, [rawVolume]);
  
  return formatted;
};

// Использование
const VolumeIndicator = ({ volume }) => {
  const formatted = useFormattedVolume(volume);
  return <div>{formatted}</div>;
};
```

```tsx
// ✅ ХОРОШО: Простая вычисляемая логика в компоненте
const VolumeIndicator = ({ volume }) => {
  const percent = Math.min(100, Math.max(0, Math.round(volume * 100)));
  const color = percent < 30 ? 'text-green-500' : percent < 70 ? 'text-yellow-500' : 'text-red-500';
  
  return <div className={color}>{percent}%</div>;
};
```

### Почему это плохой хук:

- ❌ Смешивает вычисления и UI (цвета)
- ❌ Имеет побочные эффекты (изменение CSS переменной)
- ❌ Не переиспользуется в таком виде
- ❌ Лучше использовать useMemo или просто вычисление

## Сравнительная таблица

Аспект	✅ Хороший хук	❌ Плохой хук

Переиспользование	Используется в 2+ компонентах	Используется в 1 компоненте
Сложность	10+ строк логики или несколько хуков	1-2 простых хука
Абстракция	Скрывает сложную логику	Скрывает тривиальную логику
Тестирование	Требует изоляции	Тестируется вместе с компонентом
Побочные эффекты	Управляет подписками/ресурсами	Простое вычисление значений

## Практические рекомендации

### 1. Следуй правилу "Один хук — одна ответственность"

```typescript
// ✅ Хорошо: Разделение ответственности
const useMicrophone = () => { /* только микрофон */ };
const useAudioAnalysis = () => { /* только анализ */ };

// ❌ Плохо: Всё в одном хуке
const useAudio = () => { /* и микрофон, и анализ, и запись */ };
```

### 2. Используй useMemo для вычислений, а не хуки

```typescript
// ✅ Хорошо: useMemo для вычисляемых значений
const percent = useMemo(() => Math.round(volume * 100), [volume]);

// ❌ Плохо: Хук для простого вычисления
const usePercent = (volume) => Math.round(volume * 100);
```

### 3. Хуки должны быть чистыми и предсказуемыми

```typescript
// ✅ Хорошо: Хук без побочных эффектов на входе
const useWindowSize = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    // логика
  }, []);
  return size;
};

// ❌ Плохо: Хук с побочными эффектами
const useLogger = (value) => {
  useEffect(() => {
    console.log(value); // OK
    document.title = String(value); // ❌ Побочный эффект на UI
  }, [value]);
};
```

### 4. Документируй хуки

```typescript
/**
 * Хук для работы с микрофоном
 * @param deviceId - ID устройства (опционально)
 * @returns Объект с состоянием и методами управления
 * 
 * @example
 * const { isRecording, volume, start, stop } = useMicrophone();
 */
const useMicrophone = (deviceId?: string) => {
  // ...
};
```

## Чек-лист перед созданием хука

### Вопросы к себе

- Будет ли этот хук использоваться в двух и более компонентах?
- Содержит ли логика сложное управление состоянием (3+ useState)?
- Есть ли побочные эффекты (useEffect, подписки, таймеры)?
- Требует ли логика отдельного тестирования?
- Упрощает ли чтение и понимание кода?

Если ответили ДА на 2+ вопроса → создавайте хук
Если ответили НЕТ на все вопросы → оставьте логику в компоненте

## 📝 Резюме

Ситуация	Решение

- [x] Логика используется в нескольких компонентах	✅ ХУК
- [x] Сложная логика с 3+ состояниями/эффектами	✅ ХУК
- [x] Работа с подписками, таймерами, событиями	✅ ХУК
- [x] Простой toggle, счётчик или флаг	❌ useState
- [x] Вычисление значения на основе пропсов	❌ useMemo
- [x] Обработчик конкретной кнопки	❌ Оставить в компоненте
- [x] Однократная инициализация	❌ useEffect в компоненте

Золотое правило: Создавай хук только когда есть реальная потребность в переиспользовании или абстракции сложности. Не создавай хуки "на всякий случай" — это усложняет код без причины.