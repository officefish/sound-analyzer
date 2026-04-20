# Создание плагина-анализатора данных

## Пошаговое руководство

### Оглавление

- Введение
- Структура плагина
- Пошаговое создание плагина
- Пример реализации
- Лучшие практики
- Тестирование
- Интеграция с системой

## Введение

Плагины-анализаторы данных предназначены для обработки и анализа потоковых данных в реальном времени. Они реализуют интерфейс IDataAnalyzer и предоставляют методы для сбора, анализа и обработки данных.

## Назначение

- Анализ аудио/видео потоков
- Обработка телеметрии
- Детектирование событий
- Статистическая обработка данных

## Структура плагина
```text
src/plugins/{moduleName}/{PluginName}/
├── {PluginName}Plugin.ts          # Основной класс плагина
├── widgets/
│   └── {PluginName}Widget.tsx     # React компонент виджета
├── services/
│   └── {AnalyzerService}.ts       # Сервис анализа (опционально)
├── types/
│   └── index.ts                   # TypeScript типы
└── styles/
    └── {PluginName}.css           # Стили (опционально)
```

## Пошаговое создание плагина

### Шаг 1: Создание директории плагина

```bash
# Перейдите в директорию модуля
cd src/plugins/{moduleName}

# Создайте директорию для нового плагина
mkdir MyAnalyzerPlugin
cd MyAnalyzerPlugin

# Создайте необходимые поддиректории
mkdir widgets services types styles
Шаг 2: Определение типов
Создайте файл types/index.ts:
```

```typescript
// src/plugins/{moduleName}/MyAnalyzerPlugin/types/index.ts

// Типы для вашего анализатора
export interface MyAnalysisResult {
  state: string;
  confidence: number;
  value: number;
  timestamp: number;
}

export interface MyAnalyzerConfig {
  threshold: number;
  sensitivity: number;
  mode: 'fast' | 'precise';
}

export type DetectionEvent = 'started' | 'processing' | 'detected' | 'stopped';
```

### Шаг 3: Создание сервиса анализа (опционально)

Создайте файл services/MyAnalyzerService.ts:


```typescript
// src/plugins/{moduleName}/MyAnalyzerPlugin/services/MyAnalyzerService.ts

import { MyAnalysisResult, MyAnalyzerConfig } from '../types';

class MyAnalyzerService {
  private config: MyAnalyzerConfig = {
    threshold: 0.7,
    sensitivity: 0.5,
    mode: 'precise'
  };
  
  private listeners: Map<string, Set<Function>> = new Map();
  
  setConfig(config: Partial<MyAnalyzerConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  getConfig(): MyAnalyzerConfig {
    return { ...this.config };
  }
  
  analyze(data: any): MyAnalysisResult {
    // Реализация логики анализа
    const value = this.processData(data);
    const isDetected = value > this.config.threshold;
    
    return {
      state: isDetected ? 'detected' : 'normal',
      confidence: isDetected ? value : 1 - value,
      value: value,
      timestamp: Date.now()
    };
  }
  
  private processData(data: any): number {
    // Ваша логика обработки данных
    return Math.random(); // Пример
  }
  
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(callback => {
      callback(...args);
    });
  }
}

export const myAnalyzerService = new MyAnalyzerService();
```

### Шаг 4: Создание основного класса плагина
Создайте файл MyAnalyzerPlugin.ts:

```typescript
// src/plugins/{moduleName}/MyAnalyzerPlugin/MyAnalyzerPlugin.ts

import { IDataAnalyzer } from '../../../../types/analyzers';
import { IPluginWidget, IPluginContext } from '../../../../types/plugins';
import { ModuleType } from '../../../../types/modules';
import { IAnalysisResult, IAnalyzerConfig, IAnalyzerStatus } from '../../../../types/analyzers';
import MyAnalyzerWidget from './widgets/MyAnalyzerWidget';
import { myAnalyzerService } from './services/MyAnalyzerService';
import { MyAnalysisResult } from './types';

class MyAnalyzerPluginClass implements IDataAnalyzer {
  // ==================== Базовые свойства плагина ====================
  
  id = 'module-name-my-analyzer';
  name = 'My Analyzer Plugin';
  version = '1.0.0';
  description = 'Описание функциональности вашего анализатора';
  icon = '📊';
  moduleId = 'microphone' as ModuleType; // Укажите нужный модуль
  enabled = false;
  
  // ==================== Настройки ====================
  
  settings = {
    threshold: 0.7,
    autoStart: false
  };
  
  // ==================== Виджет ====================
  
  widget: IPluginWidget = {
    id: 'my-analyzer-widget',
    pluginId: 'module-name-my-analyzer',
    title: 'My Analyzer',
    icon: '📊',
    position: 'bottom',
    order: 1,
    width: 'full',
    component: MyAnalyzerWidget
  };
  
  // ==================== Свойства анализатора ====================
  
  private isAnalyzingFlag = false;
  private isCollectingFlag = false;
  private samples: any[] = [];
  private lastResult: IAnalysisResult | null = null;
  private detectionCount = 0;
  private analysisInterval: number | null = null;
  private currentStream: any = null;
  
  // Конфигурация
  private currentConfig: IAnalyzerConfig = {
    enabled: true,
    autoStart: false,
    intervalMs: 100,
    bufferSize: 100
  };
  
  // Метрики
  private metrics: Record<string, number> = {
    totalAnalyses: 0,
    successfulDetections: 0,
    averageConfidence: 0
  };
  
  // Обработчики событий
  private eventHandlers: Map<string, Set<Function>> = new Map();
  
  // ==================== Жизненный цикл ====================
  
  onActivate(context?: IPluginContext): void {
    console.log(`[${this.name}] Активация плагина v${this.version}`);
    
    // Подписываемся на события сервиса
    myAnalyzerService.on('detection', this.handleDetection.bind(this));
    
    // Загружаем сохраненные настройки
    this.loadConfig();
    
    // Автоматический запуск если нужно
    if (this.currentConfig.autoStart) {
      this.startAnalysis(context);
    }
  }
  
  onDeactivate(context?: IPluginContext): void {
    console.log(`[${this.name}] Деактивация плагина`);
    
    this.stopAnalysis();
    this.clearSamples();
    this.removeAllListeners();
  }
  
  onModuleEvent(event: string, data: any, context?: IPluginContext): void {
    console.log(`[${this.name}] Событие модуля: ${event}`, data);
    
    switch (event) {
      case 'recordingStarted':
        if (this.currentConfig.autoStart && !this.isAnalyzingFlag) {
          this.startAnalysis(context);
        }
        break;
        
      case 'recordingStopped':
        if (this.currentConfig.autoStart && this.isAnalyzingFlag) {
          this.stopAnalysis();
        }
        break;
        
      case 'streamAvailable':
        if (data?.stream) {
          this.currentStream = data.stream;
          if (this.currentConfig.autoStart && !this.isAnalyzingFlag) {
            this.startAnalysis(context);
          }
        }
        break;
        
      case 'dataAvailable':
        if (data?.sample && this.validateSample(data.sample)) {
          this.addSample(data.sample);
        }
        break;
    }
  }
  
  // ==================== Основные методы анализа ====================
  
  startAnalysis(context?: IPluginContext): void {
    if (this.isAnalyzingFlag) {
      console.warn(`[${this.name}] Анализ уже запущен`);
      return;
    }
    
    this.isAnalyzingFlag = true;
    this.error = null;
    
    // Запускаем периодический анализ
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    
    this.analysisInterval = window.setInterval(() => {
      if (this.samples.length > 0) {
        this.processSamples();
      }
    }, this.currentConfig.intervalMs);
    
    this.emit('onStart');
    console.log(`[${this.name}] Анализ запущен (интервал: ${this.currentConfig.intervalMs}ms)`);
  }
  
  stopAnalysis(): void {
    if (!this.isAnalyzingFlag) return;
    
    this.isAnalyzingFlag = false;
    this.isCollectingFlag = false;
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    this.emit('onStop');
    console.log(`[${this.name}] Анализ остановлен`);
  }
  
  async analyze(data: any): Promise<IAnalysisResult> {
    // Используем сервис для анализа
    const result = myAnalyzerService.analyze(data);
    
    // Преобразуем в стандартный формат IAnalysisResult
    return {
      id: this.generateAnalysisId(),
      type: 'my-analysis',
      state: result.state,
      confidence: result.confidence,
      data: result,
      metrics: {
        confidence: result.confidence,
        timestamp: Date.now(),
        value: result.value
      },
      samples: this.samples,
      isDetected: result.confidence > this.settings.threshold
    };
  }
  
  // ==================== Управление данными ====================
  
  addSample(sample: any): void {
    if (!this.validateSample(sample)) {
      console.warn(`[${this.name}] Невалидный семпл отклонен`);
      return;
    }
    
    this.samples.push(sample);
    
    // Ограничиваем размер буфера
    if (this.samples.length > this.currentConfig.bufferSize) {
      this.samples.shift();
    }
    
    const progress = (this.samples.length / this.currentConfig.bufferSize) * 100;
    this.emit('onProgress', progress);
  }
  
  getSamples(): any[] {
    return [...this.samples];
  }
  
  clearSamples(): void {
    this.samples = [];
    console.log(`[${this.name}] Семплы очищены`);
  }
  
  // ==================== Конфигурация ====================
  
  getConfig(): IAnalyzerConfig {
    return { ...this.currentConfig };
  }
  
  setConfig(config: Partial<IAnalyzerConfig>): void {
    if (!this.validateConfig(config)) {
      throw new Error(`[${this.name}] Невалидная конфигурация`);
    }
    
    const wasAnalyzing = this.isAnalyzingFlag;
    
    if (wasAnalyzing) {
      this.stopAnalysis();
    }
    
    this.currentConfig = { ...this.currentConfig, ...config };
    myAnalyzerService.setConfig({
      threshold: this.settings.threshold,
      sensitivity: this.settings.threshold,
      mode: 'precise'
    });
    
    if (wasAnalyzing && this.currentConfig.enabled) {
      this.startAnalysis();
    }
    
    this.saveConfig();
    console.log(`[${this.name}] Конфигурация обновлена:`, this.currentConfig);
  }
  
  // ==================== Статус и метрики ====================
  
  getStatus(): IAnalyzerStatus {
    return {
      isAnalyzing: this.isAnalyzingFlag,
      isCollecting: this.isCollectingFlag,
      progress: this.samples.length / this.currentConfig.bufferSize,
      samplesCollected: this.samples.length,
      totalSamples: this.currentConfig.bufferSize,
      lastResult: this.lastResult,
      detectionCount: this.detectionCount,
      error: this.error?.message
    };
  }
  
  getMetrics(): Record<string, number> {
    return { ...this.metrics };
  }
  
  resetMetrics(): void {
    this.metrics = {
      totalAnalyses: 0,
      successfulDetections: 0,
      averageConfidence: 0
    };
    this.detectionCount = 0;
  }
  
  // ==================== Обработчики событий ====================
  
  on(event: keyof IAnalyzerEvents, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }
  
  off(event: keyof IAnalyzerEvents, handler: Function): void {
    this.eventHandlers.get(event)?.delete(handler);
  }
  
  emit(event: keyof IAnalyzerEvents, ...args: any[]): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`[${this.name}] Ошибка в обработчике ${event}:`, error);
      }
    });
  }
  
  private removeAllListeners(): void {
    this.eventHandlers.clear();
  }
  
  // ==================== Работа с отчетами ====================
  
  async generateReport(result: IAnalysisResult): Promise<any> {
    // Базовая генерация отчета
    const report = {
      id: `report_${Date.now()}`,
      pluginId: this.id,
      pluginName: this.name,
      timestamp: Date.now(),
      result: result,
      config: this.currentConfig
    };
    
    console.log(`[${this.name}] Отчет сгенерирован:`, report.id);
    return report;
  }
  
  exportData(format: 'json' | 'csv'): string {
    const data = {
      pluginId: this.id,
      pluginName: this.name,
      exportedAt: Date.now(),
      config: this.currentConfig,
      metrics: this.metrics,
      lastResult: this.lastResult,
      totalDetections: this.detectionCount
    };
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      return this.convertToCSV(data);
    }
  }
  
  // ==================== Валидация ====================
  
  validateSample(sample: any): boolean {
    // Проверяем, что семпл существует и имеет необходимые поля
    return sample !== null && sample !== undefined;
  }
  
  validateConfig(config: Partial<IAnalyzerConfig>): boolean {
    if (config.intervalMs !== undefined && (config.intervalMs < 10 || config.intervalMs > 10000)) {
      console.error(`[${this.name}] Невалидный intervalMs: ${config.intervalMs}`);
      return false;
    }
    
    if (config.bufferSize !== undefined && (config.bufferSize < 10 || config.bufferSize > 10000)) {
      console.error(`[${this.name}] Невалидный bufferSize: ${config.bufferSize}`);
      return false;
    }
    
    return true;
  }
  
  // ==================== Пользовательские методы ====================
  
  // Добавьте специфические для вашего плагина методы
  setThreshold(threshold: number): void {
    this.settings.threshold = Math.max(0, Math.min(1, threshold));
    myAnalyzerService.setConfig({ threshold: this.settings.threshold });
    this.saveConfig();
  }
  
  getThreshold(): number {
    return this.settings.threshold;
  }
  
  // ==================== Вспомогательные методы ====================
  
  private generateAnalysisId(): string {
    return `${this.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  private async processSamples(): Promise<void> {
    if (this.samples.length === 0) return;
    
    const startTime = performance.now();
    
    try {
      // Анализируем последний семпл
      const lastSample = this.samples[this.samples.length - 1];
      const result = await this.analyze(lastSample);
      
      await this.handleAnalysisResult(result);
      
      // Обновляем метрики
      this.metrics.lastAnalysisDuration = performance.now() - startTime;
      this.metrics.totalAnalyses++;
      
      if (result.isDetected) {
        this.metrics.successfulDetections++;
        this.detectionCount++;
      }
      
      this.metrics.averageConfidence = 
        (this.metrics.averageConfidence * (this.metrics.totalAnalyses - 1) + result.confidence) 
        / this.metrics.totalAnalyses;
      
    } catch (error) {
      console.error(`[${this.name}] Ошибка анализа:`, error);
    }
  }
  
  private async handleAnalysisResult(result: IAnalysisResult): Promise<void> {
    this.lastResult = result;
    this.emit('onResult', result);
    
    if (result.isDetected) {
      this.emit('onStateDetected', result.state, result);
      await this.generateReport(result);
    }
    
    // Очищаем семплы после обработки
    this.clearSamples();
  }
  
  private handleDetection(data: any): void {
    console.log(`[${this.name}] Обнаружено:`, data);
    // Дополнительная обработка
  }
  
  private saveConfig(): void {
    try {
      localStorage.setItem(`${this.id}-config`, JSON.stringify(this.currentConfig));
      localStorage.setItem(`${this.id}-settings`, JSON.stringify(this.settings));
    } catch (error) {
      console.error(`[${this.name}] Ошибка сохранения конфигурации:`, error);
    }
  }
  
  private loadConfig(): void {
    try {
      const savedConfig = localStorage.getItem(`${this.id}-config`);
      if (savedConfig) {
        this.currentConfig = { ...this.currentConfig, ...JSON.parse(savedConfig) };
      }
      
      const savedSettings = localStorage.getItem(`${this.id}-settings`);
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      console.error(`[${this.name}] Ошибка загрузки конфигурации:`, error);
    }
  }
  
  private convertToCSV(data: any): string {
    const headers = ['timestamp', 'state', 'confidence', 'isDetected'];
    const rows = [headers];
    
    if (this.lastResult) {
      rows.push([
        new Date().toISOString(),
        String(this.lastResult.state),
        String(this.lastResult.confidence),
        String(this.lastResult.isDetected)
      ]);
    }
    
    return rows.map(row => row.join(',')).join('\n');
  }
  
  // ==================== Метод execute ====================
  
  execute(action: string, data?: any, context?: IPluginContext): any {
    console.log(`[${this.name}] Execute: ${action}`, data);
    
    switch (action) {
      case 'getConfig':
        return this.getConfig();
        
      case 'setConfig':
        this.setConfig(data);
        return true;
        
      case 'getStatus':
        return this.getStatus();
        
      case 'getMetrics':
        return this.getMetrics();
        
      case 'resetMetrics':
        this.resetMetrics();
        return true;
        
      case 'startAnalysis':
        this.startAnalysis(context);
        return true;
        
      case 'stopAnalysis':
        this.stopAnalysis();
        return true;
        
      case 'clearSamples':
        this.clearSamples();
        return true;
        
      case 'setThreshold':
        this.setThreshold(data);
        return true;
        
      case 'getThreshold':
        return this.getThreshold();
        
      case 'exportData':
        return this.exportData(data?.format || 'json');
        
      default:
        console.warn(`[${this.name}] Неизвестное действие: ${action}`);
        return null;
    }
  }
}

// Экспортируем экземпляр плагина
export const MyAnalyzerPlugin = new MyAnalyzerPluginClass();
```

### Шаг 5: Создание виджета
Создайте файл widgets/MyAnalyzerWidget.tsx:

```typescript
// src/plugins/{moduleName}/MyAnalyzerPlugin/widgets/MyAnalyzerWidget.tsx

import React, { useState, useEffect } from 'react';
import { IPlugin } from '../../../../types/plugins';

interface Props {
  plugin: IPlugin;
  context?: any;
  onAction: (action: string, data?: any) => void;
  isActive: boolean;
}

const MyAnalyzerWidget: React.FC<Props> = ({ plugin, onAction, isActive }) => {
  const [status, setStatus] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [threshold, setThreshold] = useState<number>(0.7);
  
  useEffect(() => {
    if (isActive) {
      loadStatus();
      loadConfig();
      loadMetrics();
      
      // Периодическое обновление
      const interval = setInterval(loadStatus, 1000);
      return () => clearInterval(interval);
    }
  }, [isActive]);
  
  const loadStatus = () => {
    const statusData = plugin.execute('getStatus');
    setStatus(statusData);
  };
  
  const loadConfig = () => {
    const configData = plugin.execute('getConfig');
    setConfig(configData);
    setThreshold(plugin.execute('getThreshold'));
  };
  
  const loadMetrics = () => {
    const metricsData = plugin.execute('getMetrics');
    setMetrics(metricsData);
  };
  
  const handleStartAnalysis = () => {
    onAction('startAnalysis');
    setTimeout(loadStatus, 100);
  };
  
  const handleStopAnalysis = () => {
    onAction('stopAnalysis');
    setTimeout(loadStatus, 100);
  };
  
  const handleThresholdChange = (value: number) => {
    setThreshold(value);
    plugin.execute('setThreshold', value);
  };
  
  const handleExportData = (format: 'json' | 'csv') => {
    const data = plugin.execute('exportData', { format });
    
    // Скачивание файла
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plugin.id}_export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (!isActive) {
    return <div className="widget-inactive">Плагин не активен</div>;
  }
  
  return (
    <div className="my-analyzer-widget">
      <div className="widget-header">
        <h3>{plugin.icon} {plugin.name}</h3>
        <div className="version">v{plugin.version}</div>
      </div>
      
      <div className="widget-content">
        {/* Статус */}
        <div className="status-section">
          <h4>Статус</h4>
          <div className="status-grid">
            <div className="status-item">
              <label>Анализ:</label>
              <span className={status?.isAnalyzing ? 'active' : 'inactive'}>
                {status?.isAnalyzing ? '🟢 Активен' : '⚫ Остановлен'}
              </span>
            </div>
            <div className="status-item">
              <label>Семплов:</label>
              <span>{status?.samplesCollected} / {status?.totalSamples}</span>
            </div>
            <div className="status-item">
              <label>Прогресс:</label>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${status?.progress * 100}%` }}
                />
              </div>
            </div>
            <div className="status-item">
              <label>Обнаружено:</label>
              <span className="detection-count">{status?.detectionCount}</span>
            </div>
          </div>
        </div>
        
        {/* Метрики */}
        {metrics && (
          <div className="metrics-section">
            <h4>Метрики</h4>
            <div className="metrics-grid">
              <div className="metric">
                <label>Всего анализов:</label>
                <span>{metrics.totalAnalyses}</span>
              </div>
              <div className="metric">
                <label>Успешных обнаружений:</label>
                <span>{metrics.successfulDetections}</span>
              </div>
              <div className="metric">
                <label>Средняя уверенность:</label>
                <span>{(metrics.averageConfidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Последний результат */}
        {status?.lastResult && (
          <div className="last-result">
            <h4>Последний результат</h4>
            <div className={`result ${status.lastResult.isDetected ? 'detected' : 'normal'}`}>
              <div className="result-state">
                {status.lastResult.isDetected ? '✅ ОБНАРУЖЕНО' : 'ℹ️ Норма'}
              </div>
              <div className="result-details">
                <div>Состояние: {String(status.lastResult.state)}</div>
                <div>Уверенность: {(status.lastResult.confidence * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Настройки */}
        <div className="settings-section">
          <h4>Настройки</h4>
          <div className="setting">
            <label>Порог обнаружения:</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01"
              value={threshold}
              onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
            />
            <span>{(threshold * 100).toFixed(0)}%</span>
          </div>
          
          <div className="setting">
            <label>Интервал анализа (мс):</label>
            <input 
              type="number" 
              value={config?.intervalMs || 100}
              onChange={(e) => {
                const newConfig = { ...config, intervalMs: parseInt(e.target.value) };
                plugin.execute('setConfig', newConfig);
              }}
              min="10"
              max="10000"
            />
          </div>
        </div>
        
        {/* Действия */}
        <div className="actions-section">
          <button 
            onClick={handleStartAnalysis}
            disabled={status?.isAnalyzing}
            className="btn-primary"
          >
            ▶ Запустить анализ
          </button>
          <button 
            onClick={handleStopAnalysis}
            disabled={!status?.isAnalyzing}
            className="btn-secondary"
          >
            ⏹ Остановить
          </button>
          <button onClick={() => handleExportData('json')}>
            📥 Экспорт JSON
          </button>
          <button onClick={() => handleExportData('csv')}>
            📊 Экспорт CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyAnalyzerWidget;
```

### Шаг 6: Регистрация плагина

```typescript
// src/plugins/{moduleName}/index.ts

import { MyAnalyzerPlugin } from './MyAnalyzerPlugin/MyAnalyzerPlugin';

// Экспортируйте плагин для регистрации
export const plugins = [
  MyAnalyzerPlugin,
  // ... другие плагины
];
```

## Пример реализации

### Простой анализатор уровня звука

```typescript
// src/plugins/microphone/VolumeAnalyzer/VolumeAnalyzerPlugin.ts

class VolumeAnalyzerPlugin implements IDataAnalyzer {
  id = 'microphone-volume-analyzer';
  name = 'Volume Analyzer';
  version = '1.0.0';
  description = 'Анализирует уровень громкости звука';
  icon = '🔊';
  moduleId = 'microphone';
  
  private threshold = 0.5;
  private volumes: number[] = [];
  
  async analyze(data: any): Promise<IAnalysisResult> {
    const volume = data.volume || 0;
    this.volumes.push(volume);
    
    const avgVolume = this.volumes.reduce((a, b) => a + b, 0) / this.volumes.length;
    const isLoud = avgVolume > this.threshold;
    
    return {
      id: `volume_${Date.now()}`,
      type: 'volume-analysis',
      state: isLoud ? 'loud' : 'quiet',
      confidence: isLoud ? avgVolume : 1 - avgVolume,
      data: { volume: avgVolume, samples: this.volumes.length },
      metrics: { confidence: avgVolume, timestamp: Date.now() },
      isDetected: isLoud
    };
  }
  
  // ... реализация остальных методов
}
```

## Лучшие практики

### 1. Управление ресурсами

- [x] Всегда очищайте интервалы и таймеры в onDeactivate
- [x] Ограничивайте размер буфера данных
- [x] Используйте WeakMap для больших объектов

### 2. Обработка ошибок

```typescript
try {
  // Ваш код
} catch (error) {
  console.error(`[${this.name}] Ошибка:`, error);
  this.emit('onError', error);
}
```

### 3. Производительность

- [x] Используйте requestAnimationFrame для UI обновлений
- [x] Ограничивайте частоту анализа через intervalMs
- [x] Используйте Web Workers для тяжелых вычислений

### 4. Типизация

```typescript
// Всегда используйте строгую типизацию
interface SampleData {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}
```

### 5. Конфигурация

```typescript
// Сохраняйте конфигурацию с валидацией
setConfig(config: Partial<IAnalyzerConfig>): void {
  const validated = this.validateConfig(config);
  if (!validated) throw new Error('Invalid config');
  // Сохраняем
}
```

### Тестирование

## Модульное тестирование

```typescript
// __tests__/MyAnalyzerPlugin.test.ts

import { MyAnalyzerPlugin } from '../MyAnalyzerPlugin';

describe('MyAnalyzerPlugin', () => {
  let plugin: IDataAnalyzer;
  
  beforeEach(() => {
    plugin = MyAnalyzerPlugin;
  });
  
  test('should initialize correctly', () => {
    expect(plugin.id).toBeDefined();
    expect(plugin.name).toBeDefined();
    expect(plugin.version).toBeDefined();
  });
  
  test('should analyze data', async () => {
    const sample = { value: 0.8 };
    const result = await plugin.analyze(sample);
    
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('isDetected');
  });
  
  test('should validate samples', () => {
    expect(plugin.validateSample(null)).toBe(false);
    expect(plugin.validateSample({ value: 1 })).toBe(true);
  });
});
```

### Интеграционное тестирование

```typescript
// Интеграция с модулем
test('should respond to module events', () => {
  const context = mockContext();
  
  plugin.onActivate(context);
  plugin.onModuleEvent('recordingStarted', {});
  
  expect(plugin.getStatus().isAnalyzing).toBe(true);
});
```

### Интеграция с системой
Регистрация в PluginRegistry

```typescript
// src/plugins/index.ts

import { pluginRegistry } from '../services/PluginRegistry';
import { MyAnalyzerPlugin } from './microphone/MyAnalyzerPlugin';

// Регистрация плагинов
pluginRegistry.register(MyAnalyzerPlugin);
```

### Использование в компонентах

```typescript
// Использование плагина через хук
const useAnalyzer = (pluginId: string) => {
  const plugin = pluginRegistry.getPlugin(pluginId);
  
  const start = useCallback(() => {
    plugin?.execute('startAnalysis');
  }, [plugin]);
  
  const getStatus = useCallback(() => {
    return plugin?.execute('getStatus');
  }, [plugin]);
  
  return { start, getStatus, plugin };
};
```

## Чек-лист создания плагина

- [x] Создана директория плагина
- [x] Определены типы данных
- [x] Реализован сервис анализа (если нужен)
- [x] Создан основной класс с интерфейсом IDataAnalyzer
- [x] Реализованы все методы интерфейса
- [x] Создан React компонент виджета
- [x] Добавлена обработка событий модуля
- [x] Реализовано сохранение/загрузка конфигурации
- [x] Добавлена валидация данных
- [x] Написаны тесты
- [x] Плагин зарегистрирован в системе
- [x] Добавлена документация

## Заключение
Следуя этому руководству, вы можете создавать новые плагины-анализаторы, которые полностью интегрируются с существующей системой. Ключевые моменты:

- Стандартизация - все анализаторы следуют единому интерфейсу
- Гибкость - можно переопределять любое поведение
- Производительность - встроенные механизмы оптимизации
- Поддержка - единый подход к логированию и обработке ошибок

При возникновении вопросов обращайтесь к существующим плагинам как к примерам реализации.

