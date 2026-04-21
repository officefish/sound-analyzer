// src/plugins/microphone2/TrendsFFTDetectorPlugin.tsx

import { IPlugin, IPluginWidget, IPluginContext } from '../../../../types/plugins';
import TrendsFFTDetectorWidget from './widgets/TrendsFFTDetectorWidget';
import { audioAnalysis } from '../../../../services/AudioFFTAnalysisService';
//import { trendsDetector } from './services/TrendFFTAnalyzerService';
import { trendsDetector } from './services/ImprovedFFTTrendsService';
import { trendsDetectionReport } from '../../../../services/TrendsDetectionReport';
import { useTelemetryStore } from '../../../../store/telemetry.store';
import { SOUND_STATES, TrendsDetectionResult } from './types';

type DetectionMode = 'manual' | 'auto';
export type TickState = 'pending' | 'passed' | 'BIRDS' | 'PEOPLE' | 'WIND' | 'DRONE' | 'EXPLOSION' | 'TRAFFIC' | 'QUIET';

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
  
  // Статистика
  private totalAnalyses: number = 0;
  private successfulDetections: number = 0;
  private currentAnalysisProgress: number = 0;
  private lastDetectionResult: TrendsDetectionResult | null = null;
  private detectionHistory: TrendsDetectionResult[] = [];
  private currentTickStates: TickState[] = [];
  //private currentTickIndex: number = 0;
  
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
  
  onActivate(context?: IPluginContext): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[TrendsFFTDetector] Модуль запущен`);
    console.log(`  Версия: ${this.version}`);
    console.log(`  Режим: ${this.detectionMode}`);
    console.log(`  Телеметрия: ${this.settings.enableTelemetry ? 'включена' : 'выключена'}`);
    console.log(`${'='.repeat(60)}\n`);
    
    if (this.settings.enableTelemetry) {
      this.telemetryModuleId = useTelemetryStore.getState().registerModule('TrendsFFTDetector', {
        version: this.version,
        mode: this.detectionMode,
      });
      
      if (this.telemetryModuleId) {
        trendsDetectionReport.setModuleId(this.telemetryModuleId);
      }
    }
    
    trendsDetector.on('onDetectionResult', this.handleDetectionResult.bind(this));
    trendsDetector.on('onStateDetected', this.handleStateDetected.bind(this));
    trendsDetector.on('onSampleCollected', this.handleSampleCollected.bind(this));
    
    
    this.loadConfig();
    
    if (context) {
      (this as any).context = context;
    }
  }
  
  onDeactivate(): void {
    console.log('📈 Trends FFT Detector Plugin deactivated');
    
    this.stopAnalysis();
    trendsDetector.reset();
    trendsDetector.removeAllListeners();
    
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
        if (this.detectionMode === 'auto' && !this.isAnalyzing) {
          this.prepareForAnalysis();
          this.startAnalysis();
        }
        break;
      case 'recordingStopped':
        if (this.detectionMode === 'auto' && this.isAnalyzing) {
          this.stopAnalysis();
        }
        break;
      case 'streamAvailable':
        if (data?.stream) {
          this.currentStream = data.stream;
          if (this.detectionMode === 'auto' && !this.isAnalyzing) {
            this.prepareForAnalysis();
            this.startAnalysis();
          }
        }
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
          strictness: config.strictness ?? 'normal',
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
      } catch (e) {
        console.error('Failed to load config:', e);
      }
    }
  }
  
  private saveConfig(): void {
    const config = trendsDetector.getConfig();
    localStorage.setItem('trends-fft-detector-config', JSON.stringify({
      detectionMode: this.detectionMode,
      intervalMs: config.intervalMs,
      measurementsCount: config.measurementsCount,
    }));
  }
  
  private startAnalysis(): void {
    if (this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    
    audioAnalysis.start(this.currentStream || undefined);
    
    this.analysisInterval = window.setInterval(() => {
      const result = audioAnalysis.getLastResult();
      if (result) {
        trendsDetector.addSample(result.centroid, result.flux, result.rms);
      }
    }, trendsDetector.getConfig().intervalMs);
    
    if (this.detectionMode === 'auto') {
      trendsDetector.startCollection();
    }
    
    console.log(`📈 Trends FFT Analysis started in ${this.detectionMode} mode`);
  }
  
  private stopAnalysis(): void {
    if (!this.isAnalyzing) return;
    
    this.isAnalyzing = false;
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    audioAnalysis.stop();
    trendsDetector.stopCollection();
    
    console.log('📈 Trends FFT Analysis stopped');
  }
  
  private handleSampleCollected(data: { samplesCount: number; totalNeeded: number }): void {
    this.currentAnalysisProgress = (data.samplesCount / data.totalNeeded) * 100;
    
    // Обновляем состояния тактов
    this.updateTickStates(data.samplesCount, data.totalNeeded);
    
    if (data.samplesCount === 1) {
      this.lastDetectionResult = null;
      this.currentTickStates = [];
      //this.currentTickIndex = 0;
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
    //this.currentTickIndex = samplesCollected;
  }
  
  private async handleDetectionResult(result: TrendsDetectionResult): Promise<void> {
    console.log('📈 Trends detection result:', {
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
    
    if (this.settings.enableTelemetry && this.currentReportId) {
      try {
        const config = {
          intervalMs: trendsDetector.getConfig().intervalMs,
          measurementsCount: trendsDetector.getConfig().measurementsCount,
        };
        
        await trendsDetectionReport.generateReport(result, config, this.currentReportId);
        this.currentReportId = null;
      } catch (error) {
        console.error('[TrendsFFTDetector] ❌ Failed to generate report:', error);
        this.currentReportId = null;
      }
    }
    
    // ✅ Только в авторежиме автоматически запускаем новый анализ
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
        // Отображаем обнаруженное состояние для валидных тактов
        this.currentTickStates.push(result.state as TickState);
      } else {
        this.currentTickStates.push('pending');
      }
    }
    //this.currentTickIndex = neededSamples;
  }
  
  private handleStateDetected(result: TrendsDetectionResult): void {
    console.log(`🎯 STATE DETECTED: ${result.stateName} (${result.confidence.toFixed(1)}%)`);
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
    if (data.detectionMode && data.detectionMode !== this.detectionMode) {
      this.detectionMode = data.detectionMode;
      this.settings.detectionMode = this.detectionMode;
      this.saveConfig();
      
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
    
    trendsDetector.setConfig(newConfig);
    this.saveConfig();
    
    if (this.isAnalyzing) {
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
    
    // ✅ ПРИОРИТЕТ 1: Если есть результат последнего анализа - показываем состояния каждого такта
    if (this.lastDetectionResult && this.lastDetectionResult.samples && this.lastDetectionResult.samples.length > 0) {
      // Для каждого такта в результате анализа
      for (let i = 0; i < neededSamples; i++) {
        const sample = this.lastDetectionResult.samples[i];
        if (sample && sample.isValid) {
          // Валидный такт - показываем обнаруженное состояние
          // Но для разных тактов может быть разное состояние!
          // Нужно проверить, есть ли в sample информация о состоянии
          if (sample.state) {
            tickStates.push(sample.state as TickState);
          } else {
            // Если нет сохраненного состояния, используем общее состояние результата
            tickStates.push(this.lastDetectionResult.state as TickState);
          }
        } else {
          tickStates.push('pending');
        }
      }
      currentTickIndex = neededSamples;
    } 
    // ✅ ПРИОРИТЕТ 2: Если идет сбор данных - показываем прогресс
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
    // ✅ ПРИОРИТЕТ 3: Нет активного анализа
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
      tickStates, // ✅ Теперь правильно заполнены состояния каждого такта
      currentTickIndex,
      lastResult: this.lastDetectionResult,
      detectionHistory: this.detectionHistory,
    };
  }
  
  startDetection(): void {
    // ✅ Только в ручном режиме или если анализ уже активен
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
    trendsDetector.stopCollection();
    // Сбрасываем состояния тактов при остановке
    this.currentTickStates = [];
    //this.currentTickIndex = 0;
    this.currentAnalysisProgress = 0;
  }
  
  setDetectionMode(mode: DetectionMode): void {
    this.detectionMode = mode;
    this.settings.detectionMode = mode;
    this.saveConfig();
    
    if (mode === 'auto' && this.currentStream && !this.isAnalyzing) {
      this.startAnalysis();
    }
    if (mode === 'manual' && this.isAnalyzing) {
      this.stopAnalysis();
    }
    
    // Сбрасываем состояния при смене режима
    this.currentTickStates = [];
    //this.currentTickIndex = 0;
  }

  protected customPatterns: Record<string, any> = {};

  // Метод для установки пользовательских паттернов
  setCustomPatterns(patterns: Record<string, any>): void {
    this.customPatterns = patterns;
  
    // Объединяем стандартные и пользовательские паттерны
    const allPatterns = { ...SOUND_STATES, ...patterns };
  
    // Обновляем детектор (нужно добавить метод в TrendsDetectorServiceImpl)
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
      default:
        return null;
    }
  }
}

export const TrendsFFTDetectorPlugin = new TrendsFFTDetectorPluginClass();
