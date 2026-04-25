// src/plugins/microphone2/TrendsFFTDetectorPlugin.tsx

import { IPlugin, IPluginWidget, IPluginContext } from '../../../../types/plugins';
import TrendsFFTDetectorWidget from './widgets/TrendsFFTDetectorWidget';
import { audioAnalysis } from '../../../../services/AudioFFTAnalysisService';
import { trendsDetector } from './services/ImprovedFFTTrendsService';
import { trendsDetectionReport } from '../../../../services/TrendsDetectionReport';
import { useTelemetryStore } from '../../../../store/telemetry.store';
import { usePatternTemplatesStore } from './stores/patterns.store';
import { SOUND_STATES, TrendsDetectionResult } from './types';

type DetectionMode = 'manual' | 'auto';
export type TickState = 'pending' | 'passed' | 'BIRDS' | 'PEOPLE' | 'WIND' | 'DRONE' | 'EXPLOSION' | 'TRAFFIC' | 'QUIET';

interface PluginConfig {
  detectionMode: DetectionMode;
  intervalMs: number;
  measurementsCount: number;
  enableTelemetry: boolean;
}

class TrendsFFTDetectorPluginClass implements IPlugin {
  id = 'microphone2-trends-fft-detector';
  name = 'Trends FFT Детектор';
  version = '2.0.0';
  description = 'Анализ звука с учётом временных трендов и паттернов';
  icon = '📈';
  moduleId = 'microphone' as const;
  enabled = false;
    
  private telemetryModuleId: string | null = null;
  private analysisInterval: number | null = null;
  private detectionCount: number = 0;
  private detectionMode: DetectionMode = 'auto';
  private isAnalyzing: boolean = false;
  private currentStream: MediaStream | null = null;
  private unsubscribeFromStore: (() => void) | null = null;
  
  // Статистика
  private totalAnalyses: number = 0;
  private successfulDetections: number = 0;
  private currentAnalysisProgress: number = 0;
  private lastDetectionResult: TrendsDetectionResult | null = null;
  private detectionHistory: TrendsDetectionResult[] = [];
  private currentTickStates: TickState[] = [];
  
  settings = {
    detectionMode: 'auto' as DetectionMode,
    enableTelemetry: true,
  };
  
  widget: IPluginWidget = {
    id: 'trends-fft-detector-widget',
    pluginId: 'microphone2-trends-fft-detector',
    title: 'Trends FFT Анализатор',
    icon: '📈',
    position: 'bottom',
    order: 4,
    width: 'full',
    component: TrendsFFTDetectorWidget,
  };

  private currentReportId: string | null = null;
  
  private generateReportUniqueId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${random}`;
  }
  
  private syncPatternsWithStore(): void {
    try {
      const store = usePatternTemplatesStore.getState();
      const enabledPatterns = store.getTemplatesForDetector();
      
      // Обновляем детектор с активными шаблонами
      trendsDetector.setPatterns(enabledPatterns);
      
      console.log(`[TrendsFFTDetector] Synced ${Object.keys(enabledPatterns).length} enabled patterns`);
    } catch (error) {
      console.error('[TrendsFFTDetector] Failed to sync patterns:', error);
    }
  }
  
  onActivate(context?: IPluginContext): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[TrendsFFTDetector] Модуль запущен`);
    console.log(`  Версия: ${this.version}`);
    console.log(`  Режим: ${this.detectionMode}`);
    console.log(`  Телеметрия: ${this.settings.enableTelemetry ? 'включена' : 'выключена'}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Настройка телеметрии
    if (this.settings.enableTelemetry) {
      this.telemetryModuleId = useTelemetryStore.getState().registerModule('TrendsFFTDetector', {
        version: this.version,
        mode: this.detectionMode,
      });
      
      if (this.telemetryModuleId) {
        trendsDetectionReport.setModuleId(this.telemetryModuleId);
      }
    }
    
    // Подписка на события детектора
    trendsDetector.on('onDetectionResult', this.handleDetectionResult.bind(this));
    trendsDetector.on('onStateDetected', this.handleStateDetected.bind(this));
    trendsDetector.on('onSampleCollected', this.handleSampleCollected.bind(this));
    
    // Загрузка конфигурации
    this.loadConfig();
    
    // Инициализация store и синхронизация шаблонов
    try {
      const store = usePatternTemplatesStore.getState();
      store.initializeTemplates();
      this.syncPatternsWithStore();
      
      // Подписываемся на изменения в store
      this.unsubscribeFromStore = usePatternTemplatesStore.subscribe(() => {
        this.syncPatternsWithStore();
      });
    } catch (error) {
      console.error('[TrendsFFTDetector] Failed to initialize pattern store:', error);
    }
    
    if (context) {
      (this as any).context = context;
    }
  }
  
  onDeactivate(): void {
    console.log('[TrendsFFTDetector] Модуль остановлен');
    
    this.stopAnalysis();
    trendsDetector.reset();
    trendsDetector.removeAllListeners();
    
    // Отписываемся от store
    if (this.unsubscribeFromStore) {
      this.unsubscribeFromStore();
      this.unsubscribeFromStore = null;
    }
    
    if (this.telemetryModuleId) {
      useTelemetryStore.getState().unregisterModule(this.telemetryModuleId);
      this.telemetryModuleId = null;
    }
  }

  private prepareForAnalysis(): void {
    this.currentReportId = this.generateReportUniqueId();
    console.log(`[TrendsFFTDetector] 📝 Generated report ID for analysis: ${this.currentReportId}`);
  }
  
  onModuleEvent(event: string, data: any): void {
    switch (event) {
      case 'recordingStarted':
        console.log('[TrendsFFTDetector] Recording started event received');
        if (this.detectionMode === 'auto' && !this.isAnalyzing) {
          this.prepareForAnalysis();
          this.startAnalysis();
        }
        break;
      case 'recordingStopped':
        console.log('[TrendsFFTDetector] Recording stopped event received');
        if (this.detectionMode === 'auto' && this.isAnalyzing) {
          this.stopAnalysis();
        }
        break;
      case 'streamAvailable':
        if (data?.stream) {
          this.currentStream = data.stream;
          console.log('[TrendsFFTDetector] Stream available');
          if (this.detectionMode === 'auto' && !this.isAnalyzing) {
            this.prepareForAnalysis();
            this.startAnalysis();
          }
        }
        break;
      default:
        // Игнорируем другие события
        break;
    }
  }
  
  private loadConfig(): void {
    const savedConfig = localStorage.getItem('trends-fft-detector-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        this.detectionMode = config.detectionMode || 'auto';
        this.settings.detectionMode = this.detectionMode;
        
        const fullConfig = {
          intervalMs: config.intervalMs ?? 30,
          measurementsCount: config.measurementsCount ?? 100,
        };
        
        trendsDetector.setConfig(fullConfig);
        
        audioAnalysis.setConfig({
          centroidMin: 0,
          centroidMax: 5000,
          fluxMin: 0,
          fluxMax: 5,
          rmsMin: 0,
          rmsMax: 1,
          fftSize: 2048,
          smoothingTimeConstant: 0.8,
        });
        
        console.log('[TrendsFFTDetector] Config loaded:', fullConfig);
      } catch (e) {
        console.error('[TrendsFFTDetector] Failed to load config:', e);
      }
    }
  }
  
  private saveConfig(): void {
    const config = trendsDetector.getConfig();
    const saveData = {
      detectionMode: this.detectionMode,
      intervalMs: config.intervalMs,
      measurementsCount: config.measurementsCount,
    };
    localStorage.setItem('trends-fft-detector-config', JSON.stringify(saveData));
    console.log('[TrendsFFTDetector] Config saved:', saveData);
  }
  
  private startAnalysis(): void {
    if (this.isAnalyzing) {
      console.log('[TrendsFFTDetector] Analysis already running');
      return;
    }
    
    this.isAnalyzing = true;
    
    try {
      audioAnalysis.start(this.currentStream || undefined);
      
      const config = trendsDetector.getConfig();
      this.analysisInterval = window.setInterval(() => {
        const result = audioAnalysis.getLastResult();
        if (result) {
          trendsDetector.addSample(result.centroid, result.flux, result.rms);
        }
      }, config.intervalMs);
      
      if (this.detectionMode === 'auto') {
        trendsDetector.startCollection();
      }
      
      console.log(`[TrendsFFTDetector] Analysis started in ${this.detectionMode} mode`);
    } catch (error) {
      console.error('[TrendsFFTDetector] Failed to start analysis:', error);
      this.isAnalyzing = false;
    }
  }
  
  private stopAnalysis(): void {
    if (!this.isAnalyzing) {
      return;
    }
    
    this.isAnalyzing = false;
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    audioAnalysis.stop();
    trendsDetector.stopCollection();
    
    console.log('[TrendsFFTDetector] Analysis stopped');
  }
  
  private handleSampleCollected(data: { samplesCount: number; totalNeeded: number }): void {
    this.currentAnalysisProgress = (data.samplesCount / data.totalNeeded) * 100;
    
    // Обновляем состояния тактов
    this.updateTickStates(data.samplesCount, data.totalNeeded);
    
    if (data.samplesCount === 1) {
      this.lastDetectionResult = null;
      this.currentTickStates = [];
    }
  }
  
  private updateTickStates(samplesCollected: number, totalNeeded: number): void {
    this.currentTickStates = [];
    for (let i = 0; i < totalNeeded; i++) {
      if (i < samplesCollected) {
        this.currentTickStates.push('passed');
      } else {
        this.currentTickStates.push('pending');
      }
    }
  }
  
  private async handleDetectionResult(result: TrendsDetectionResult): Promise<void> {
    console.log('[TrendsFFTDetector] Detection result:', {
      state: result.stateName,
      confidence: result.confidence,
      isDetected: result.isDetected,
      samplesCount: result.samples.length,
    });
    
    this.totalAnalyses++;
    this.currentAnalysisProgress = 0;
    this.lastDetectionResult = result;
    
    // Обновляем состояния тактов на основе результата
    this.updateTickStatesFromResult(result);
    
    if (result.isDetected) {
      this.successfulDetections++;
      this.detectionCount++;
      this.detectionHistory.unshift(result);
      
      if (this.detectionHistory.length > 20) {
        this.detectionHistory.pop();
      }
    }
    
    // Генерация отчета для телеметрии
    if (this.settings.enableTelemetry && this.currentReportId) {
      try {
        const config = trendsDetector.getConfig();
        
        await trendsDetectionReport.generateReport(result, config, this.currentReportId);
        this.currentReportId = null;
        
        console.log('[TrendsFFTDetector] Report generated successfully');
      } catch (error) {
        console.error('[TrendsFFTDetector] Failed to generate report:', error);
        this.currentReportId = null;
      }
    }
    
    // В авторежиме автоматически запускаем новый анализ
    if (this.detectionMode === 'auto' && this.isAnalyzing) {
      setTimeout(() => {
        if (this.isAnalyzing && this.detectionMode === 'auto') {
          this.currentReportId = this.generateReportUniqueId();
          trendsDetector.startCollection();
        }
      }, 500);
    }
  }
  
  private updateTickStatesFromResult(result: TrendsDetectionResult): void {
    const config = trendsDetector.getConfig();
    const neededSamples = config.measurementsCount;
    
    this.currentTickStates = [];
    for (let i = 0; i < neededSamples; i++) {
      const sample = result.samples[i];
      if (sample && sample.isValid) {
        this.currentTickStates.push(result.state as TickState);
      } else {
        this.currentTickStates.push('pending');
      }
    }
  }
  
  private handleStateDetected(result: TrendsDetectionResult): void {
    console.log(`[TrendsFFTDetector] 🎯 STATE DETECTED: ${result.stateName} (${result.confidence.toFixed(1)}%)`);
  }
  
  getConfig(): any {
    const config = trendsDetector.getConfig();
    return {
      detectionMode: this.detectionMode,
      intervalMs: config.intervalMs,
      measurementsCount: config.measurementsCount,
    };
  }
  
  setConfig(data: any): void {
    let needsRestart = false;
    
    if (data.detectionMode && data.detectionMode !== this.detectionMode) {
      this.detectionMode = data.detectionMode;
      this.settings.detectionMode = this.detectionMode;
      this.saveConfig();
      needsRestart = true;
      
      if (this.detectionMode === 'auto' && this.currentStream && !this.isAnalyzing) {
        this.prepareForAnalysis();
        this.startAnalysis();
      }
      if (this.detectionMode === 'manual' && this.isAnalyzing) {
        this.stopAnalysis();
      }
    }
    
    const config = trendsDetector.getConfig();
    const newConfig = {
      intervalMs: data.intervalMs ?? config.intervalMs,
      measurementsCount: data.measurementsCount ?? config.measurementsCount,
    };
    
    if (newConfig.intervalMs !== config.intervalMs || newConfig.measurementsCount !== config.measurementsCount) {
      trendsDetector.setConfig(newConfig);
      this.saveConfig();
      needsRestart = true;
    }
    
    if (needsRestart && this.isAnalyzing) {
      this.stopAnalysis();
      this.prepareForAnalysis();
      this.startAnalysis();
    }
  }
  
  getStatus(): any {
    const detectorStatus = trendsDetector.getStatus();
    const config = trendsDetector.getConfig();
    const neededSamples = config.measurementsCount;
    
    let tickStates: TickState[] = [];
    let currentTickIndex = 0;
    
    // Приоритет 1: Если есть результат последнего анализа
    if (this.lastDetectionResult && this.lastDetectionResult.samples && this.lastDetectionResult.samples.length > 0) {
      for (let i = 0; i < neededSamples; i++) {
        const sample = this.lastDetectionResult.samples[i];
        if (sample && sample.isValid) {
          tickStates.push(this.lastDetectionResult.state as TickState);
        } else {
          tickStates.push('pending');
        }
      }
      currentTickIndex = neededSamples;
    } 
    // Приоритет 2: Если идет сбор данных
    else if (detectorStatus.isCollecting) {
      for (let i = 0; i < neededSamples; i++) {
        if (i < detectorStatus.samplesCollected) {
          tickStates.push('passed');
        } else {
          tickStates.push('pending');
        }
      }
      currentTickIndex = detectorStatus.samplesCollected;
    } 
    // Приоритет 3: Нет активного анализа
    else {
      for (let i = 0; i < neededSamples; i++) {
        tickStates.push('pending');
      }
      currentTickIndex = 0;
    }
    
    return {
      isAnalyzing: this.isAnalyzing,
      isCollecting: detectorStatus.isCollecting,
      samplesCollected: detectorStatus.samplesCollected,
      neededSamples: neededSamples,
      currentSample: detectorStatus.currentSample,
      detectionCount: this.detectionCount,
      detectionMode: this.detectionMode,
      totalAnalyses: this.totalAnalyses,
      successfulDetections: this.successfulDetections,
      currentAnalysisProgress: this.currentAnalysisProgress,
      tickStates,
      currentTickIndex,
      lastResult: this.lastDetectionResult,
      detectionHistory: this.detectionHistory,
    };
  }
  
  startDetection(): void {
    console.log('[TrendsFFTDetector] Manual detection start requested');
    
    if (this.detectionMode === 'manual') {
      if (!this.isAnalyzing) {
        this.prepareForAnalysis();
        this.startAnalysis();
      }
      this.currentReportId = this.generateReportUniqueId();
      trendsDetector.startCollection();
    } else if (this.detectionMode === 'auto' && this.isAnalyzing) {
      this.currentReportId = this.generateReportUniqueId();
      trendsDetector.startCollection();
    }
  }
  
  stopDetection(): void {
    console.log('[TrendsFFTDetector] Manual detection stop requested');
    trendsDetector.stopCollection();
    this.currentTickStates = [];
    this.currentAnalysisProgress = 0;
  }
  
  setDetectionMode(mode: DetectionMode): void {
    if (mode === this.detectionMode) return;
    
    console.log('[TrendsFFTDetector] Switching detection mode:', this.detectionMode, '->', mode);
    this.detectionMode = mode;
    this.settings.detectionMode = mode;
    this.saveConfig();
    
    if (mode === 'auto' && this.currentStream && !this.isAnalyzing) {
      this.startAnalysis();
    }
    if (mode === 'manual' && this.isAnalyzing) {
      this.stopAnalysis();
    }
    
    this.currentTickStates = [];
  }

  setCustomPatterns(patterns: Record<string, any>): void {
    console.log('[TrendsFFTDetector] Setting custom patterns:', Object.keys(patterns).length);
    
    // Объединяем стандартные и пользовательские паттерны
    const allPatterns = { ...SOUND_STATES, ...patterns };
    
    // Обновляем детектор
    trendsDetector.setPatterns(allPatterns);
    
    this.saveConfig();
  }
  
  execute(action: string, data?: any): any {
    switch (action) {
      case 'getConfig':
        return this.getConfig();
      case 'setConfig':
        return this.setConfig(data);
      case 'getStatus':
        return this.getStatus();
      case 'startDetection':
        return this.startDetection();
      case 'stopDetection':
        return this.stopDetection();
      case 'setDetectionMode':
        return this.setDetectionMode(data);
      case 'setCustomPatterns':
        return this.setCustomPatterns(data);
      default:
        console.warn('[TrendsFFTDetector] Unknown action:', action);
        return null;
    }
  }
}

export const TrendsFFTDetectorPlugin = new TrendsFFTDetectorPluginClass();