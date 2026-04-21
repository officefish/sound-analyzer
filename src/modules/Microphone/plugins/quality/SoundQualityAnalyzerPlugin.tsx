
// import { IAnalyzerEvents, IDataAnalyzer } from '../../../../types/analyzers';
// import { IPluginWidget, IPluginContext } from '../../../../types/plugins';
import { ModuleType } from '../../../../types/modules';
import { IPlugin, IPluginWidget } from '../../../../types/plugins';
// import { IAnalysisResult, IAnalyzerConfig, IAnalyzerStatus } from '../../../../types/analyzers';
// import SoundQualityWidget from './widgets/SoundQualityWidget';
import { soundQualityService } from './services/SoundQualityService';
import { QualityMetrics } from './types';
import SoundQualityWidget from './widgets/SoundQualityWidget';

class SoundQualityAnalyzerPluginClass implements IPlugin {
  id = 'microphone-sound-quality-analyzer';
  name = 'Sound Quality Analyzer';
  version = '1.0.0';
  description = 'Анализ общего качества звука: SNR, четкость, динамика, пиковый уровень';
  icon = '🎵';
  moduleId = 'microphone' as ModuleType;
  enabled = false;
  
  // Доступные действия
  availableActions = ['getMetrics', 'resetMetrics', 'getCurrentQuality', 'getRecommendation', 'exportData'];
  
  // Настройки виджетов
  settings = {
    showSnr: true,
    showClarity: true,
    showDynamics: true,
    showPeak: true,
    autoReset: true,
  };
  

  // ==================== Виджет ====================
  
    widget: IPluginWidget = {
        id: 'sound-quality-widget',
        pluginId: 'microphone-sound-quality-analyzer',
        title: 'Качество звука',
        icon: '🎵',
        position: 'bottom',
        order: 5,
        width: 'full',
        component: SoundQualityWidget
    };
  
  // Приватные поля для статистики
  private metrics = {
    totalAnalyses: 0,
    averageQuality: 0,
    excellentCount: 0,
    goodCount: 0,
    fairCount: 0,
    poorCount: 0,
    badCount: 0
  };
  
  onActivate(context?: any): void {

    if (context) {
      // proccessing context here
    }
    console.log(`[${this.name}] Активация плагина v${this.version}`);
    
    // Загружаем сохраненные настройки
    this.loadSettings();
    
    // Настраиваем сервис
    soundQualityService.setConfig({
      maxRms: 0.02,
      historySize: 100
    });
    
    // Подписываемся на события сервиса
    soundQualityService.on('onMetricsUpdate', this.handleMetricsUpdate.bind(this));
  }
  
  onDeactivate(context?: any): void {
      if (context) {
      // proccessing context here
    }
    console.log(`[${this.name}] Деактивация плагина`);
    soundQualityService.reset();
    this.resetMetrics();
  }
  
  onModuleEvent(event: string, data: any, context?: any): void {
      if (context) {
      // proccessing context here
    }
    
    // Обработка событий от модуля
    switch (event) {
      case 'recordingStarted':
        console.log(`[${this.name}] Запись начата`);
        if (this.settings.autoReset) {
          this.resetMetrics();
        }
        break;
        
      case 'recordingStopped':
        console.log(`[${this.name}] Запись остановлена`);
        break;
        
      case 'audioFrame':
        // Обработка аудио кадра
        if (data?.rms !== undefined) {
          const metrics = soundQualityService.updateMetrics(data.rms);
          this.updateStatistics(metrics.overall);
        }
        break;
    }
  }
  
  // ============ Методы для получения данных ============
  
  getCurrentQuality(): QualityMetrics | null {
    return soundQualityService.getMetrics();
  }
  
  getRecommendation(): string {
    const lastResult = soundQualityService.getLastResult();
    return lastResult?.recommendation || 'Нет данных';
  }
  
  getRating(): { text: string; class: string; color: string } | null {
    const lastResult = soundQualityService.getLastResult();
    return lastResult?.rating || null;
  }
  
  getMetrics(): Record<string, number> {
    const qualityMetrics = soundQualityService.getMetrics();
    
    return {
      totalAnalyses: this.metrics.totalAnalyses,
      averageQuality: this.metrics.averageQuality,
      excellentCount: this.metrics.excellentCount,
      goodCount: this.metrics.goodCount,
      fairCount: this.metrics.fairCount,
      poorCount: this.metrics.poorCount,
      badCount: this.metrics.badCount,
      currentSnr: qualityMetrics?.snr || 0,
      currentClarity: qualityMetrics?.clarity || 0,
      currentDynamics: qualityMetrics?.dynamics || 0,
      currentPeakLevel: qualityMetrics?.peakLevel || 0,
      currentOverall: qualityMetrics?.overall || 0
    };
  }
  
  resetMetrics(): void {
    this.metrics = {
      totalAnalyses: 0,
      averageQuality: 0,
      excellentCount: 0,
      goodCount: 0,
      fairCount: 0,
      poorCount: 0,
      badCount: 0
    };
    soundQualityService.reset();
    console.log(`[${this.name}] Метрики сброшены`);
  }
  
  exportData(format: 'json' | 'csv' = 'json'): string {
    return soundQualityService.exportData(format);
  }
  
  // ============ Приватные методы ============
  
  private updateStatistics(quality: number): void {
    this.metrics.totalAnalyses++;
    
    // Обновляем среднее качество
    this.metrics.averageQuality = 
      (this.metrics.averageQuality * (this.metrics.totalAnalyses - 1) + quality) 
      / this.metrics.totalAnalyses;
    
    // Обновляем счетчики категорий
    if (quality >= 80) this.metrics.excellentCount++;
    else if (quality >= 60) this.metrics.goodCount++;
    else if (quality >= 40) this.metrics.fairCount++;
    else if (quality >= 20) this.metrics.poorCount++;
    else this.metrics.badCount++;
  }
  
  private handleMetricsUpdate(metrics: QualityMetrics): void {
    // Можно добавить дополнительную логику при обновлении метрик
    // Например, отправить событие в модуль при плохом качестве
    if (metrics.overall < 40) {
      console.warn(`[${this.name}] Низкое качество звука: ${metrics.overall.toFixed(1)}%`);
    }
  }
  
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(`${this.id}-settings`);
      if (saved) {
        const settings = JSON.parse(saved);
        Object.assign(this.settings, settings);
      }
    } catch (error) {
      console.error(`[${this.name}] Ошибка загрузки настроек:`, error);
    }
  }
  
  private saveSettings(): void {
    try {
      localStorage.setItem(`${this.id}-settings`, JSON.stringify(this.settings));
    } catch (error) {
      console.error(`[${this.name}] Ошибка сохранения настроек:`, error);
    }
  }
  
  // ============ Метод execute для внешнего взаимодействия ============
  
  execute(action: string, data?: any, context?: any): any {

    if (context) {
      // proccessing context here
    }

    console.log(`[${this.name}] Execute: ${action}`, data);
    
    switch (action) {
      case 'getMetrics':
        return this.getMetrics();
        
      case 'resetMetrics':
        this.resetMetrics();
        return true;
        
      case 'getCurrentQuality':
        return this.getCurrentQuality();
        
      case 'getRecommendation':
        return this.getRecommendation();
        
      case 'getRating':
        return this.getRating();
        
      case 'exportData':
        return this.exportData(data?.format || 'json');
        
      case 'processAudioFrame':
        // Обработка аудио кадра для внешних вызовов
        if (data?.rms !== undefined) {
          const metrics = soundQualityService.updateMetrics(data.rms);
          this.updateStatistics(metrics.overall);
          return {
            overall: metrics.overall,
            snr: metrics.snr,
            clarity: metrics.clarity,
            dynamics: metrics.dynamics,
            peakLevel: metrics.peakLevel,
            rating: soundQualityService.getLastResult()?.rating
          };
        }
        return null;
        
      case 'setSettings':
        if (data) {
          Object.assign(this.settings, data);
          this.saveSettings();
        }
        return true;
        
      case 'getSettings':
        return { ...this.settings };
        
      default:
        console.warn(`[${this.name}] Неизвестное действие: ${action}`);
        return null;
    }
  }
}

// Экспортируем экземпляр плагина
export const SoundQualityAnalyzerPlugin = new SoundQualityAnalyzerPluginClass();

// import { IAnalyzerEvents, IDataAnalyzer } from '../../../../types/analyzers';
// import { IPluginWidget, IPluginContext } from '../../../../types/plugins';
// import { ModuleType } from '../../../../types/modules';
// import { IAnalysisResult, IAnalyzerConfig, IAnalyzerStatus } from '../../../../types/analyzers';
// import SoundQualityWidget from './widgets/SoundQualityWidget';
// import { soundQualityService } from './services/SoundQualityService';
// import { QualityMetrics } from './types';

// export class SoundQualityAnalyzerPluginClass implements IDataAnalyzer {
    
//     // ==================== Базовые свойства ====================
  
//     id = 'microphone-sound-quality-analyzer';
//     name = 'Sound Quality Analyzer';
//     version = '1.0.0';
//     description = 'Анализ общего качества звука: SNR, четкость, динамика, пиковый уровень';
//     icon = '🎵';
//     moduleId = 'microphone' as ModuleType;
//     enabled = false;

//     // ==================== Настройки ====================
  
//     settings = {
//         maxRms: 0.02,
//         historySize: 100,
//         updateIntervalMs: 100,
//         autoAnalyze: true
//     };

//     // ==================== Виджет ====================
  
//     widget: IPluginWidget = {
//         id: 'sound-quality-widget',
//         pluginId: 'microphone-sound-quality-analyzer',
//         title: 'Качество звука',
//         icon: '🎵',
//         position: 'bottom',
//         order: 5,
//         width: 'full',
//         component: SoundQualityWidget
//     };

//     // ==================== Свойства анализатора ====================
  
//     private isAnalyzingFlag = false;
//     private isCollectingFlag = false;
//     private samples: number[] = [];
//     private lastResult: IAnalysisResult | null = null;
//     private analysisInterval: number | null = null;
//     private currentStream: MediaStream | null = null;
//     private audioContext: AudioContext | null = null;
//     private sourceNode: MediaStreamAudioSourceNode | null = null;
//     private analyserNode: AnalyserNode | null = null;

//     // Конфигурация
//     private currentConfig: IAnalyzerConfig = {
//         enabled: true,
//         autoStart: false,
//         intervalMs: 3000,
//         bufferSize: 100,
//         numSamples: 1
//     };

//     // Обработчики событий
//     private eventHandlers: Map<string, Set<Function>> = new Map();
//     private error: Error | null = null;
  
//     constructor() {
//         // Подписываемся на события сервиса
//         soundQualityService.on('onMetricsUpdate', this.handleMetricsUpdate.bind(this));
//         soundQualityService.on('onResultUpdate', this.handleResultUpdate.bind(this));
//     }

//     // ==================== Жизненный цикл ====================
  
//     onActivate(context?: IPluginContext): void {
//         console.log(`[${this.name}] Активация плагина v${this.version}`);
    
//         // Загружаем сохраненные настройки
//         this.loadConfig();
    
//         // Настраиваем сервис
//         soundQualityService.setConfig({
//             maxRms: this.settings.maxRms,
//             historySize: this.settings.historySize
//         });
    
//         // Автоматический запуск если нужно
//         if (this.currentConfig.autoStart) {
//             this.startAnalysis(context);
//         }
//     }
  
//     onDeactivate(context?: IPluginContext): void {
//         if (context) {
//             // you might be proccessing context here
//         }
//         console.log(`[${this.name}] Деактивация плагина`);
//         this.stopAnalysis();
//         soundQualityService.reset();
//     }

//     onModuleEvent(event: string, data: any, context?: IPluginContext): void {
//         switch (event) {
//             case 'recordingStarted':
//                 if (this.currentConfig.autoStart && !this.isAnalyzingFlag) {
//                     this.startAnalysis(context);
//                 }
//                 break;
        
//             case 'recordingStopped':
//                 if (this.currentConfig.autoStart && this.isAnalyzingFlag) {
//                     this.stopAnalysis();
//                 }
//                 break;
        
//             case 'streamAvailable':
//                 if (data?.stream) {
//                     this.currentStream = data.stream;
//                     if (this.currentConfig.autoStart && !this.isAnalyzingFlag) {
//                     this.startAnalysis(context);
//                  }
//                 }
//                  break;
        
//             case 'audioData':
//                 if (data?.rms !== undefined && this.validateSample(data.rms)) {
//                     this.addSample(data.rms);
//                 }
//             break;
//         }
//     }

//     // ==================== Основные методы анализа ====================
  
//     startAnalysis(
//         context?: IPluginContext): void {
//         if (context) {
//             // you might be proccessing context here
//         }

//         if (this.isAnalyzingFlag) {
//             console.warn(`[${this.name}] Анализ уже запущен`);
//         return;
//         }
    
//         this.isAnalyzingFlag = true;
//         this.error = null;
    
//         // Если есть стрим, подключаемся к нему
//         if (this.currentStream && !this.audioContext) {
//             this.setupAudioContext();
//         }
    
//         // Запускаем периодический анализ
//         if (this.analysisInterval) {
//             clearInterval(this.analysisInterval);
//         }
    
//         this.analysisInterval = window.setInterval(() => {
//             if (this.samples.length > 0 && this.currentConfig.enabled) {
//                 this.processLatestSample();
//             }
//         }, this.currentConfig.intervalMs);
    
//         this.emit('onStart');
//         console.log(`[${this.name}] Анализ качества звука запущен`);
//     }

//     stopAnalysis(): void {
//         if (!this.isAnalyzingFlag) return;
    
//         this.isAnalyzingFlag = false;
//         this.isCollectingFlag = false;
    
//         if (this.analysisInterval) {
//             clearInterval(this.analysisInterval);
//             this.analysisInterval = null;
//         }
    
//         // Закрываем аудио контекст
//         if (this.audioContext) {
//             this.audioContext.close();
//             this.audioContext = null;
//             this.sourceNode = null;
//             this.analyserNode = null;
//         }
    
//         this.emit('onStop');
//         console.log(`[${this.name}] Анализ качества звука остановлен`);
//     }

//     async analyze(data: any): Promise<IAnalysisResult> {
//         const rms = typeof data === 'number' ? data : data.rms || 0;
    
//         // Обновляем метрики через сервис
//         const metrics = soundQualityService.updateMetrics(rms);
//         const lastResult = soundQualityService.getLastResult();
    
//         return {
//             id: this.generateAnalysisId(),
//             type: 'sound-quality',
//             state: lastResult?.rating.text || 'unknown',
//             confidence: metrics.overall / 100,
//             data: {
//                 rms,
//                 metrics,
//                 rating: lastResult?.rating,
//                 recommendation: lastResult?.recommendation
//             },
//             metrics: {
//                 confidence: metrics.overall / 100,
//                 timestamp: Date.now(),
//                 snr: metrics.snr,
//                 clarity: metrics.clarity,
//                 dynamics: metrics.dynamics,
//                 peakLevel: metrics.peakLevel
//             },
//             isDetected: metrics.overall >= 60 // Хорошее качество = detected
//         };
//     }

//     // ==================== Управление данными ====================

//     addSample(sample: number): void {
//         if (!this.validateSample(sample)) {
//             console.warn(`[${this.name}] Невалидный семпл: ${sample}`);
//             return;
//         }
    
//         this.samples.push(sample);
    
//         // Ограничиваем размер буфера
//         if (this.samples.length > this.currentConfig.bufferSize) {
//             this.samples.shift();
//         }
//     }

//     getSamples(): number[] {
//         return [...this.samples];
//     }
  
//     clearSamples(): void {
//         this.samples = [];
//         soundQualityService.reset();
//     }

//     // ==================== Конфигурация ====================

//     getConfig(): IAnalyzerConfig {
//         return { ...this.currentConfig };
//     }
  
//     setConfig(config: Partial<IAnalyzerConfig>): void {
//         if (!this.validateConfig(config)) {
//             throw new Error(`[${this.name}] Невалидная конфигурация`);
//         }
    
//         const wasAnalyzing = this.isAnalyzingFlag;
    
//         if (wasAnalyzing) {
//             this.stopAnalysis();
//         }
    
//         this.currentConfig = { ...this.currentConfig, ...config };
    
//         // Обновляем настройки сервиса
//         soundQualityService.setConfig({
//             maxRms: this.settings.maxRms,
//             historySize: this.settings.historySize,
//             updateIntervalMs: this.settings.updateIntervalMs
//         });
    
//         if (wasAnalyzing && this.currentConfig.enabled) {
//             this.startAnalysis();
//         }
    
//         this.saveConfig();
//         console.log(`[${this.name}] Конфигурация обновлена:`, this.currentConfig);
//     }

//     // ==================== Статус и метрики ====================
  
//     getStatus(): IAnalyzerStatus {
//         // const serviceStatus = soundQualityService.getStatus(
//         //     this.samples[this.samples.length - 1] || 0
//         // );
    
//         return {
//             isAnalyzing: this.isAnalyzingFlag,
//             isCollecting: this.isCollectingFlag,
//             progress: this.samples.length / this.currentConfig.bufferSize,
//             samplesCollected: this.samples.length,
//             totalSamples: this.currentConfig.bufferSize,
//             lastResult: this.lastResult,
//             detectionCount: 0,
//             error: this.error?.message
//         };
//     }
  
//     getMetrics(): Record<string, number> {
//         const qualityMetrics = soundQualityService.getMetrics();
    
//         return {
//             //totalAnalyses: this.metrics.totalAnalyses,
//             //averageQuality: this.metrics.averageQuality,
//             //excellentCount: this.metrics.excellentCount,
//             //goodCount: this.metrics.goodCount,
//             //fairCount: this.metrics.fairCount,
//             //poorCount: this.metrics.poorCount,
//             //badCount: this.metrics.badCount,
//             currentSnr: qualityMetrics?.snr || 0,
//             currentClarity: qualityMetrics?.clarity || 0,
//             currentDynamics: qualityMetrics?.dynamics || 0,
//             currentPeakLevel: qualityMetrics?.peakLevel || 0,
//             currentOverall: qualityMetrics?.overall || 0
//         };
//     }
  
//     resetMetrics(): void {
//         // this.metrics = {
//         //   totalAnalyses: 0,
//         //   averageQuality: 0,
//         //   excellentCount: 0,
//         //   goodCount: 0,
//         //   fairCount: 0,
//         //   poorCount: 0,
//         //   badCount: 0
//         // };
//         soundQualityService.reset();
//     }

//     // ==================== Обработчики событий ====================  
//     on(event: keyof IAnalyzerEvents, handler: Function): void {
//         if (!this.eventHandlers.has(event)) {
//             this.eventHandlers.set(event, new Set());
//         }
//         this.eventHandlers.get(event)!.add(handler);
//     }
  
//     off(event: keyof IAnalyzerEvents, handler: Function): void {
//         this.eventHandlers.get(event)?.delete(handler);
//     }
  
//     emit(event: keyof IAnalyzerEvents, ...args: any[]): void {
//         this.eventHandlers.get(event)?.forEach(handler => {
//         try {
//             handler(...args);
//         } catch (error) {
//             console.error(`[${this.name}] Ошибка в обработчике ${event}:`, error);
//         }});
//     }
  
//     // private removeAllListeners(): void {
//     //     this.eventHandlers.clear();
//     // }

//     // ==================== Работа с отчетами ====================
  
//     async generateReport(result: IAnalysisResult): Promise<any> {
//         const report = {
//             id: `quality_report_${Date.now()}`,
//             pluginId: this.id,
//             pluginName: this.name,
//             timestamp: Date.now(),
//             result: result.data,
//             metrics: result.metrics,
//             config: this.currentConfig
//         };
    
//         console.log(`[${this.name}] Отчет сгенерирован:`, report.id);
//         return report;
//     }

//     exportData(format: 'json' | 'csv'): string {
//         return soundQualityService.exportData(format);
//     }

//     // ==================== Валидация ====================
  
//     validateSample(sample: any): boolean {
//         return typeof sample === 'number' && !isNaN(sample) && sample >= 0 && sample <= 1;
//     }
  
//     validateConfig(config: Partial<IAnalyzerConfig>): boolean {
//         if (config.intervalMs !== undefined && (config.intervalMs < 10 || config.intervalMs > 5000)) {
//             return false;
//         }
//         if (config.bufferSize !== undefined && (config.bufferSize < 10 || config.bufferSize > 1000)) {
//             return false;
//         }
//         return true;
//     }

//     // ==================== Приватные методы ====================

//     private setupAudioContext(): void {
//         if (!this.currentStream) return;
    
//         try {
//             this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
//             this.sourceNode = this.audioContext.createMediaStreamSource(this.currentStream);
//             this.analyserNode = this.audioContext.createAnalyser();
//             this.analyserNode.fftSize = 256;
      
//             this.sourceNode.connect(this.analyserNode);
//             this.audioContext.resume();
      
//             // Запускаем сбор RMS значений
//             this.startRMSCollection();
//         } catch (error) {
//             console.error(`[${this.name}] Ошибка настройки аудио:`, error);
//             this.error = error as Error;
//         }
//     }

//     private startRMSCollection(): void {
//         if (!this.analyserNode) return;
    
//         const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    
//         const collectRMS = () => {
//             if (!this.isAnalyzingFlag || !this.analyserNode) return;
      
//             this.analyserNode.getByteTimeDomainData(dataArray);
      
//             let sum = 0;
//             for (let i = 0; i < dataArray.length; i++) {
//                 const sample = (dataArray[i] - 128) / 128;
//                 sum += sample * sample;
//             }
//             const rms = Math.sqrt(sum / dataArray.length);
      
//             this.addSample(rms);
//             requestAnimationFrame(collectRMS);
//         };
    
//         collectRMS();
//     }

//     private processLatestSample(): void {
//         if (this.samples.length === 0) return;
    
//         const latestRms = this.samples[this.samples.length - 1];
//         this.processAnalysis(latestRms);
//     }

//     private async processAnalysis(rms: number): Promise<void> {
//         try {
//             const result = await this.analyze(rms);
//             await this.handleAnalysisResult(result);
//         } catch (error) {
//             console.error(`[${this.name}] Ошибка анализа:`, error);
//             this.error = error as Error;
//             this.emit('onError', error);
//         }
//     }

//     private async handleAnalysisResult(result: IAnalysisResult): Promise<void> {
//         this.lastResult = result;
//         this.emit('onResult', result);
    
//         // Обновляем статистику
//         this.updateStatistics(result);
    
//         if (result.isDetected) {
//             this.emit('onStateDetected', result.state, result);
//         }
//     }

//     private updateStatistics(result: IAnalysisResult): void {
//         if (result) {
//             // result might be proccesing there
//         }
//         // this.metrics.totalAnalyses++;
//         // const quality = (result.confidence * 100);
    
//         // // Обновляем среднее качество
//         // this.metrics.averageQuality = 
//         //     (this.metrics.averageQuality * (this.metrics.totalAnalyses - 1) + quality) 
//         //     / this.metrics.totalAnalyses;
    
//         // // Обновляем счетчики категорий
//         // if (quality >= 80) this.metrics.excellentCount++;
//         // else if (quality >= 60) this.metrics.goodCount++;
//         // else if (quality >= 40) this.metrics.fairCount++;
//         // else if (quality >= 20) this.metrics.poorCount++;
//         // else this.metrics.badCount++;
//     }

//     private handleMetricsUpdate(metrics: QualityMetrics): void {
//         this.emit('onProgress', metrics.overall / 100);
//     }
  
//     private handleResultUpdate(result: any): void {
//         // Дополнительная обработка результата
//         console.log(`[${this.name}] Quality update: ${result.metrics.overall.toFixed(1)}%`);
//     }
  
//     private generateAnalysisId(): string {
//         return `${this.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
//     }

//     private saveConfig(): void {
//         try {
//             localStorage.setItem(`${this.id}-config`, JSON.stringify(this.currentConfig));
//             localStorage.setItem(`${this.id}-settings`, JSON.stringify(this.settings));
//         } catch (error) {
//             console.error(`[${this.name}] Ошибка сохранения конфигурации:`, error);
//         }
//     }

//     private loadConfig(): void {
//         try {
//             const savedConfig = localStorage.getItem(`${this.id}-config`);
//             if (savedConfig) {
//                 this.currentConfig = { ...this.currentConfig, ...JSON.parse(savedConfig) };
//             }
      
//             const savedSettings = localStorage.getItem(`${this.id}-settings`);
//             if (savedSettings) {
//                 this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
//             }
//         } catch (error) {
//             console.error(`[${this.name}] Ошибка загрузки конфигурации:`, error);
//         }
//     }

//     // ==================== Публичные методы для UI ====================
  
//     getCurrentQuality(): QualityMetrics | null {
//         return soundQualityService.getMetrics();
//     }
  
//     getRecommendation(): string {
//         const lastResult = soundQualityService.getLastResult();
//         return lastResult?.recommendation || 'Нет данных';
//     }
  
//     getRating(): { text: string; class: string; color: string } | null {
//         const lastResult = soundQualityService.getLastResult();
//         return lastResult?.rating || null;
//     }

//     // ==================== Метод execute ====================
  
//     execute(action: string, data?: any, context?: IPluginContext): any {
//         switch (action) {
//             case 'getConfig':
//                 return this.getConfig();
        
//             case 'setConfig':
//                 this.setConfig(data);
//                 return true;
        
//             case 'getStatus':
//                 return this.getStatus();
        
//             case 'getMetrics':
//                 return this.getMetrics();
        
//             case 'resetMetrics':
//                 this.resetMetrics();
//                 return true;
        
//             case 'startAnalysis':
//                 this.startAnalysis(context);
//                 return true;
        
//             case 'stopAnalysis':
//                 this.stopAnalysis();
//                 return true;
        
//             case 'clearSamples':
//                 this.clearSamples();
//                 return true;
        
//             case 'getCurrentQuality':
//                 return this.getCurrentQuality();
        
//             case 'getRecommendation':
//                 return this.getRecommendation();
        
//             case 'getRating':
//                 return this.getRating();
        
//             case 'exportData':
//                 return this.exportData(data?.format || 'json');
        
//             default:
//                 console.warn(`[${this.name}] Неизвестное действие: ${action}`);
//                 return null;
//         }
//     }

// }

// // Экспортируем экземпляр, а не класс
// export const SoundQualityAnalyzerPlugin = new SoundQualityAnalyzerPluginClass();