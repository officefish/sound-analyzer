# 🧠 Выделение бизнес-логики в сервисы

## 📋 Содержание

1. [Введение](#введение)
2. [Проблема: логика в компонентах](#проблема-логика-в-компонентах)
3. [Решение: сервисный слой](#решение-сервисный-слой)
4. [Архитектура сервисов](#архитектура-сервисов)
5. [Преимущества](#преимущества)
6. [Тестирование сервисов](#тестирование-сервисов)
7. [Пример: рефакторинг MicrophoneService](#пример-рефакторинг-microphoneservice)
8. [Юнит-тестирование сервиса](#юнит-тестирование-сервиса)
9. [Практические рекомендации](#практические-рекомендации)
10. [Чек-лист](#чек-лист)

---

## Введение

В SoundLab мы следуем принципу **разделения ответственности** (Separation of Concerns):

- **Компоненты** — отвечают только за отображение UI
- **Сервисы** — содержат всю бизнес-логику

Это делает код:
- **Тестируемым** — сервисы можно тестировать изолированно
- **Переиспользуемым** — одна логика для разных компонентов
- **Поддерживаемым** — легко находить и исправлять ошибки

---

## Проблема: логика в компонентах

### ❌ Антипаттерн: Вся логика в компоненте

```tsx
// ❌ ПЛОХО: Микрофон с логикой внутри компонента
const Microphone = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const startRecording = async () => {
    // Сложная логика работы с Web Audio API
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);
    
    // ... ещё 50 строк сложной логики
  };
  
  const stopRecording = () => {
    // ... ещё 30 строк логики очистки
  };
  
  return (
    <div>
      <button onClick={startRecording}>Start</button>
      <button onClick={stopRecording}>Stop</button>
      <div>Volume: {volume}%</div>
    </div>
  );
};
```

### Проблемы такого подхода:

Проблема	Описание
- ❌ Не тестируется	Нельзя протестировать логику без рендера React
- ❌ Сложно отлаживать	Логика перемешана с UI
- ❌ Не переиспользуется	Нельзя использовать ту же логику в другом месте
- ❌ Трудно поддерживать	Изменение логики требует правки компонента
- ❌ Нет чёткой структуры	Сложно понять, где что находится

### Решение: сервисный слой

✅ Хорошо: Логика вынесена в сервис

```tsx
// ✅ ХОРОШО: Компонент только для UI
const Microphone = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const serviceRef = useRef<MicrophoneService | null>(null);
  
  useEffect(() => {
    serviceRef.current = new MicrophoneService();
    serviceRef.current.on('volumeUpdate', setVolume);
    serviceRef.current.on('recordingStart', () => setIsRecording(true));
    serviceRef.current.on('recordingStop', () => setIsRecording(false));
    
    return () => serviceRef.current?.dispose();
  }, []);
  
  return (
    <div>
      <button onClick={() => serviceRef.current?.start()}>Start</button>
      <button onClick={() => serviceRef.current?.stop()}>Stop</button>
      <div>Volume: {volume}%</div>
    </div>
  );
};
```

```typescript
// ✅ ХОРОШО: Сервис с бизнес-логикой (легко тестировать)
class MicrophoneService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private callbacks: Map<string, Function[]> = new Map();
  
  on(event: string, callback: Function) {
    if (!this.callbacks.has(event)) this.callbacks.set(event, []);
    this.callbacks.get(event)!.push(callback);
  }
  
  private emit(event: string, data?: any) {
    this.callbacks.get(event)?.forEach(cb => cb(data));
  }
  
  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaStream = stream;
    // ... логика обработки
    this.emit('recordingStart');
  }
  
  stop() {
    // ... логика очистки
    this.emit('recordingStop');
  }
  
  dispose() {
    this.stop();
    this.callbacks.clear();
  }
}
```

## Архитектура сервисов

### Диаграмма архитектуры

┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         React Components                             │    │
│  │  - Только отображение UI                                             │    │
│  │  - Подписка на события сервисов                                       │    │
│  │  - Вызов методов сервисов                                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    │ events & calls                          │
│                                    ▼                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                              SERVICE LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                           Services                                    │    │
│  │  - Вся бизнес-логика                                                  │    │
│  │  - Работа с внешними API                                              │    │
│  │  - Управление состоянием                                              │    │
│  │  - Генерация событий                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    │ calls                                   │
│                                    ▼                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                              INFRASTRUCTURE                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    External APIs / Hardware                           │    │
│  │  - Web Audio API                                                      │    │
│  │  - MediaDevices API                                                   │    │
│  │  - localStorage                                                       │    │
│  │  - Electron IPC                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

## Структура сервиса

```typescript
// src/services/BaseService.ts
export abstract class BaseService {
  protected listeners: Map<string, Set<Function>> = new Map();
  
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }
  
  protected emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
  
  abstract dispose(): void;
}
```

```typescript
// src/services/MicrophoneService.ts
import { BaseService } from './BaseService';

export interface MicrophoneServiceEvents {
  onVolumeUpdate?: (volume: number) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onError?: (error: string) => void;
}

export class MicrophoneService extends BaseService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private isRecordingFlag = false;
  
  async start(deviceId?: string): Promise<boolean> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;
      
      this.audioContext = new AudioContext();
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.sourceNode.connect(this.analyserNode);
      
      await this.audioContext.resume();
      this.isRecordingFlag = true;
      
      this.startVolumeAnalysis();
      this.emit('onRecordingStart');
      
      return true;
    } catch (error) {
      this.emit('onError', 'Failed to access microphone');
      return false;
    }
  }
  
  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    this.isRecordingFlag = false;
    this.emit('onRecordingStop');
  }
  
  private startVolumeAnalysis(): void {
    if (!this.analyserNode) return;
    
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    
    const updateVolume = () => {
      if (!this.analyserNode || !this.isRecordingFlag) return;
      
      this.analyserNode.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      const normalizedVolume = Math.min(1, average / 128);
      
      this.emit('onVolumeUpdate', normalizedVolume);
      this.animationFrameId = requestAnimationFrame(updateVolume);
    };
    
    updateVolume();
  }
  
  dispose(): void {
    this.stop();
    this.listeners.clear();
  }
}
```

## Преимущества

### 1. Тестируемость

```typescript
// ✅ Легко тестировать сервис изолированно
describe('MicrophoneService', () => {
  let service: MicrophoneService;
  
  beforeEach(() => {
    service = new MicrophoneService();
  });
  
  afterEach(() => {
    service.dispose();
  });
  
  it('should emit recordingStart event when start is called', async () => {
    const startSpy = jest.fn();
    service.on('onRecordingStart', startSpy);
    
    await service.start();
    
    expect(startSpy).toHaveBeenCalled();
  });
  
  it('should emit volumeUpdate events', async () => {
    const volumeSpy = jest.fn();
    service.on('onVolumeUpdate', volumeSpy);
    
    await service.start();
    
    // Ждём несколько кадров анимации
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(volumeSpy).toHaveBeenCalled();
    expect(volumeSpy.mock.calls[0][0]).toBeGreaterThanOrEqual(0);
    expect(volumeSpy.mock.calls[0][0]).toBeLessThanOrEqual(1);
  });
});
```

### 2. Переиспользование

```typescript
// ✅ Один сервис можно использовать в разных компонентах
// Компонент 1: Основной микрофон
const MainMicrophone = () => {
  const service = useMicrophoneService();
  // ...
};

// Компонент 2: Виджет уровня громкости
const VolumeWidget = () => {
  const service = useMicrophoneService();
  // ...
};

// Компонент 3: Индикатор записи
const RecordingIndicator = () => {
  const service = useMicrophoneService();
  // ...
};
```

### 3. Поддержка и отладка

```typescript
// ✅ Логирование в сервисе
class MicrophoneService extends BaseService {
  async start(deviceId?: string): Promise<boolean> {
    console.log('[MicrophoneService] Starting with device:', deviceId);
    
    try {
      // ... логика
      console.log('[MicrophoneService] Started successfully');
      return true;
    } catch (error) {
      console.error('[MicrophoneService] Failed to start:', error);
      return false;
    }
  }
}
```

### 4. Инверсия зависимостей

```typescript
// ✅ Сервис не зависит от конкретной реализации
interface IAudioRecorder {
  start(): Promise<void>;
  stop(): void;
  on(event: string, callback: Function): void;
}

class MicrophoneService {
  constructor(private recorder: IAudioRecorder) {}
  
  async start() {
    await this.recorder.start();
  }
}

// В production используем реальный рекордер
const service = new MicrophoneService(new WebAudioRecorder());

// В тестах используем мок
const mockRecorder = {
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn(),
  on: jest.fn(),
};
const service = new MicrophoneService(mockRecorder);
```

## Тестирование сервисов

### Настройка тестов

```bash
npm install --save-dev jest @types/jest @testing-library/react-hooks
```

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "jsdom",
    "collectCoverageFrom": [
      "src/services/**/*.ts",
      "src/modules/**/services/**/*.ts"
    ]
  }
}
```

### Пример юнит-теста для MicrophoneService

```typescript
// src/services/__tests__/MicrophoneService.test.ts
import { MicrophoneService } from '../MicrophoneService';

// Мок для MediaDevices API
const mockGetUserMedia = jest.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  configurable: true,
});

// Мок для AudioContext
class MockAudioContext {
  createMediaStreamSource = jest.fn().mockReturnValue({
    connect: jest.fn(),
  });
  createAnalyser = jest.fn().mockReturnValue({
    connect: jest.fn(),
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn(),
  });
  resume = jest.fn().mockResolvedValue(undefined);
  close = jest.fn().mockResolvedValue(undefined);
}

global.AudioContext = MockAudioContext as any;

describe('MicrophoneService', () => {
  let service: MicrophoneService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new MicrophoneService();
    
    // Настраиваем мок для getUserMedia
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    });
  });
  
  afterEach(() => {
    service.dispose();
  });
  
  describe('start', () => {
    it('should successfully start recording', async () => {
      const startSpy = jest.fn();
      service.on('onRecordingStart', startSpy);
      
      const result = await service.start();
      
      expect(result).toBe(true);
      expect(startSpy).toHaveBeenCalled();
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    });
    
    it('should handle errors when microphone access is denied', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
      
      const errorSpy = jest.fn();
      service.on('onError', errorSpy);
      
      const result = await service.start();
      
      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith('Failed to access microphone');
    });
    
    it('should use specified device when deviceId is provided', async () => {
      await service.start('test-device-id');
      
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: { deviceId: { exact: 'test-device-id' } },
      });
    });
  });
  
  describe('stop', () => {
    it('should stop recording and clean up resources', async () => {
      await service.start();
      
      const stopSpy = jest.fn();
      service.on('onRecordingStop', stopSpy);
      
      service.stop();
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });
  
  describe('volume updates', () => {
    it('should emit volume updates when recording', async () => {
      const volumeSpy = jest.fn();
      service.on('onVolumeUpdate', volumeSpy);
      
      await service.start();
      
      // Имитируем обновление громкости
      const mockAnalyser = (service as any).analyserNode;
      if (mockAnalyser) {
        mockAnalyser.getByteFrequencyData.mockImplementation((array: Uint8Array) => {
          array.fill(64); // 50% громкости
        });
      }
      
      // Ждём один кадр анимации
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(volumeSpy).toHaveBeenCalled();
      expect(volumeSpy.mock.calls[0][0]).toBe(0.5);
    });
  });
});
```

### Пример теста для плагина

```typescript
// src/plugins/microphone2/__tests__/TuneMonitorPlugin.test.ts
import { TuneMonitorPlugin } from '../TuneMonitorPlugin';

describe('TuneMonitorPlugin', () => {
  let plugin: typeof TuneMonitorPlugin;
  
  beforeEach(() => {
    plugin = TuneMonitorPlugin;
    plugin.enabled = false;
    plugin.settings = {
      showVolume: true,
      showQuality: true,
      showWaveform: true,
      showSpectrum: true,
    };
  });
  
  describe('execute', () => {
    it('should handle setWidgetState action', () => {
      const result = plugin.execute('setWidgetState', { widget: 'volume', enabled: false });
      
      expect(result).toBe(true);
      expect(plugin.settings.showVolume).toBe(false);
    });
    
    it('should handle getWidgetState action', () => {
      plugin.settings.showVolume = true;
      
      const result = plugin.execute('getWidgetState', { widget: 'volume' });
      
      expect(result).toBe(true);
    });
    
    it('should handle resetWidgets action', () => {
      plugin.settings.showVolume = false;
      plugin.settings.showQuality = false;
      
      const result = plugin.execute('resetWidgets');
      
      expect(result).toBe(true);
      expect(plugin.settings.showVolume).toBe(true);
      expect(plugin.settings.showQuality).toBe(true);
    });
    
    it('should return null for unknown actions', () => {
      const result = plugin.execute('unknownAction');
      
      expect(result).toBeNull();
    });
  });
  
  describe('lifecycle', () => {
    it('should log activation', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      plugin.onActivate();
      
      expect(consoleSpy).toHaveBeenCalledWith('🎵 Tune Monitor Plugin activated');
    });
  });
});
```

##  Пример: рефакторинг MicrophoneService

### Исходный компонент с логикой

```tsx
// ❌ Было: Вся логика в компоненте (200+ строк)
const Microphone = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  // ... ещё 50 строк refs и состояний
  
  const getDevices = async () => {
    // 20 строк логики
  };
  
  const startRecording = async () => {
    // 50 строк логики
  };
  
  const stopRecording = () => {
    // 30 строк логики
  };
  
  const updateVolume = () => {
    // 30 строк логики
  };
  
  // ... ещё 100 строк JSX
  
  return (/* JSX */);
};
```

### После рефакторинга

```typescript
// ✅ Стало: Сервис с бизнес-логикой
// src/services/MicrophoneService.ts
export class MicrophoneService extends BaseService {
  async getDevices(): Promise<MediaDeviceInfo[]> {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audioinput');
  }
  
  async start(deviceId?: string): Promise<boolean> {
    // Логика запуска
  }
  
  stop(): void {
    // Логика остановки
  }
  
  changeDevice(deviceId: string): Promise<void> {
    // Логика смены устройства
  }
}
```

```tsx
// ✅ Стало: Чистый компонент (50 строк)
// src/modules/Microphone/index.tsx
const Microphone = () => {
  const [state, setState] = useState(INITIAL_STATE);
  const serviceRef = useRef<MicrophoneService | null>(null);
  
  useEffect(() => {
    const service = new MicrophoneService();
    serviceRef.current = service;
    
    service.on('onVolumeUpdate', (volume) => {
      setState(prev => ({ ...prev, volume }));
    });
    
    service.on('onRecordingStart', () => {
      setState(prev => ({ ...prev, isRecording: true }));
    });
    
    service.on('onRecordingStop', () => {
      setState(prev => ({ ...prev, isRecording: false }));
    });
    
    service.getDevices().then(devices => {
      setState(prev => ({ ...prev, devices }));
    });
    
    return () => service.dispose();
  }, []);
  
  const handleStart = useCallback(() => {
    serviceRef.current?.start(state.selectedDevice);
  }, [state.selectedDevice]);
  
  const handleStop = useCallback(() => {
    serviceRef.current?.stop();
  }, []);
  
  return (
    <div>
      <button onClick={handleStart}>Start</button>
      <button onClick={handleStop}>Stop</button>
      <VolumeMeter volume={state.volume} />
    </div>
  );
};
```

## Практические рекомендации

### 1. Именование сервисов

```typescript
// ✅ Хорошие имена
MicrophoneService
AudioAnalysisService
PluginManagerService
StorageService

// ❌ Плохие имена
MicrophoneHelper
AudioUtils
PluginThing
```

### 2. Размер сервиса

```typescript
// ✅ Один сервис — одна ответственность
class AudioRecorderService {
  // Только запись звука
}

class AudioAnalysisService {
  // Только анализ звука
}

// ❌ Огромный сервис со всем подряд
class AudioService {
  // И запись, и анализ, и устройства, и плагины...
}
```

### 3. Обработка ошибок

```typescript
class MicrophoneService {
  async start(): Promise<Result> {
    try {
      // логика
      return { success: true };
    } catch (error) {
      this.emit('onError', error.message);
      return { success: false, error: error.message };
    }
  }
}
```

### 4. Типизация событий

```typescript
// ✅ Строгая типизация событий
interface MicrophoneEvents {
  onVolumeUpdate: (volume: number) => void;
  onRecordingStart: () => void;
  onRecordingStop: () => void;
  onError: (error: string) => void;
}

class MicrophoneService {
  on<K extends keyof MicrophoneEvents>(
    event: K,
    callback: MicrophoneEvents[K]
  ): void {
    // ...
  }
}
```

## 5. Очистка ресурсов

```typescript
class MicrophoneService {
  dispose(): void {
    // Останавливаем все процессы
    this.stop();
    
    // Закрываем соединения
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    // Очищаем слушатели
    this.listeners.clear();
    
    // Убираем таймеры
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
```

## Чек-лист

### При создании нового модуля

- [x] Выделена бизнес-логика в отдельный сервис
- [x] Сервис наследуется от BaseService
- [x] Сервис имеет понятное имя и одну ответственность
- [x] Все публичные методы возвращают Promise или синхронный результат
- [x] Есть система событий для уведомления компонентов
- [x] Есть метод dispose() для очистки ресурсов
- [x] Компонент не содержит бизнес-логики (только вызовы сервиса)

### При создании плагина

- [x] Сложная логика вынесена в отдельные функции/методы
- [x] Плагин не содержит тяжёлых вычислений в execute
- [x] Ресурсы очищаются в onDeactivate

### Для тестирования

- [x] Написаны юнит-тесты для сервисов
- [x] Моки для внешних зависимостей (Web Audio API, MediaDevices)
- [x] Протестированы основные сценарии (успех/ошибка)
- [x] Протестирована очистка ресурсов
- [x] Покрытие кода не менее 70%

## 📝 Резюме

Аспект	Компонент	Сервис
Ответственность	Отображение UI	Бизнес-логика
Тестирование	Интеграционное (сложно)	Юнит-тесты (легко)
Переиспользование	Ограниченное	Максимальное
Поддержка	Трудно	Легко
Зависимости	React, DOM	Чистый TS/JS

Ключевой принцип: Компоненты должны быть "глупыми" (только UI), а сервисы — "умными" (вся логика). Это делает код тестируемым, переиспользуемым и поддерживаемым.