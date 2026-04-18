// src/plugins/microphone2/TrendsFFTDetectorPlugin.tsx

import { IPlugin, IPluginWidget, IPluginContext } from '../../../../types/plugins';
import TrendsFFTDetectorWidget from './widgets/TrendsFFTDetectorWidget';
import { audioAnalysis } from '../../../../services/AudioFFTAnalysisService';
import { trendsDetector } from './services/TrendFFTAnalyzerService';
import { trendsDetectionReport } from '../../../../services/TrendsDetectionReport';
import { useTelemetryStore } from '../../../../store/telemetry.store';

import { TrendsDetectionResult } from './types';

// Определяем окружение
//const isElectron = typeof process !== 'undefined' && process.versions != null && process.versions.electron != null;

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
  
  // Генерация уникального ID для отчёта
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
    //console.log(`  Окружение: ${isElectron ? 'Electron (Node.js доступен)' : 'Browser'}`);
    console.log(`  Телеметрия: ${this.settings.enableTelemetry ? 'включена' : 'выключена'}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Регистрируем в телеметрии
    if (this.settings.enableTelemetry) {
      this.telemetryModuleId = useTelemetryStore.getState().registerModule('TrendsFFTDetector', {
        version: this.version,
        mode: this.detectionMode,
        //environment: isElectron ? 'electron' : 'browser',
      });
      
      if (this.telemetryModuleId) {
        trendsDetectionReport.setModuleId(this.telemetryModuleId);
      }
    }
    
    // Подписываемся на события детектора
    trendsDetector.on('onDetectionResult', this.handleDetectionResult.bind(this));
    trendsDetector.on('onStateDetected', this.handleStateDetected.bind(this));
    trendsDetector.on('onSampleCollected', this.handleSampleCollected.bind(this));
    
    // Загружаем сохранённые настройки
    this.loadConfig();
    
    // Сохраняем ссылку на контекст
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

  // ✅ Новый метод для подготовки к анализу (генерация ID)
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
    
    if (data.samplesCount === 1) {
      this.lastDetectionResult = null;
    }
  }
  
  // Обновляем handleDetectionResult для использования сгенерированного ID
  private async handleDetectionResult(result: TrendsDetectionResult): Promise<void> {
    
    console.log('📈 Trends detection result FULL:', JSON.stringify(result, null, 2));
    console.log('📈 Result samples count:', result.samples?.length);
    console.log('📈 Result analysis:', result.analysis);
    console.log('📈 Result confidence:', result.confidence);
    
    console.log('📈 Trends detection result:', {
      state: result.stateName,
      confidence: result.confidence,
      isDetected: result.isDetected,
      hasAnalysis: !!result.analysis,
      samplesCount: result.samples.length,
    });
    
    this.totalAnalyses++;
    this.currentAnalysisProgress = 0;
    this.lastDetectionResult = result;
    
    if (result.isDetected) {
      this.successfulDetections++;
      this.detectionCount++;
      this.detectionHistory.unshift(result);
      
      if (this.detectionHistory.length > 20) {
        this.detectionHistory.pop();
      }
    }
    
    // ✅ Используем предварительно сгенерированный ID
    if (this.settings.enableTelemetry && this.currentReportId) {
      try {
        const config = {
          intervalMs: trendsDetector.getConfig().intervalMs,
          measurementsCount: trendsDetector.getConfig().measurementsCount,
        };
        
        console.log(`[TrendsFFTDetector] Generating report with pre-generated ID: ${this.currentReportId}`);
        
        const report = await trendsDetectionReport.generateReport(result, config, this.currentReportId);
        
        if (report) {
          console.log(`[TrendsFFTDetector] ✅ Report generated successfully:`, {
            reportId: report.id,
            detectionNumber: report.detectionNumber,
            isDetected: report.isDetected,
            state: report.detectedStateName,
            confidence: report.confidence,
          });
        } else {
          console.warn(`[TrendsFFTDetector] ⚠️ Report generation failed (duplicate or rejected)`);
        }
        
        // Сбрасываем ID после использования
        this.currentReportId = null;
        
      } catch (error) {
        console.error('[TrendsFFTDetector] ❌ Failed to generate report:', error);
        this.currentReportId = null;
      }
    } else if (!this.currentReportId) {
      console.warn('[TrendsFFTDetector] ⚠️ No report ID generated, skipping report generation');
    }
    
    // Автоматический перезапуск
    if (this.detectionMode === 'auto' && this.isAnalyzing) {
      setTimeout(() => {
        if (this.isAnalyzing && this.detectionMode === 'auto') {
          // ✅ Генерируем новый ID для следующего анализа
          this.currentReportId = this.generateReportUniqueId();
          console.log(`[TrendsFFTDetector] 📝 Generated new report ID for next analysis: ${this.currentReportId}`);
          
          trendsDetector.startCollection();
        }
      }, 500);
    }
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
    
    const tickStates: TickState[] = [];
    let currentTickIndex = 0;
    
    if (this.lastDetectionResult && this.lastDetectionResult.samples) {
        for (let i = 0; i < neededSamples; i++) {
        const sample = this.lastDetectionResult.samples[i];
        if (sample && sample.isValid) {
            tickStates.push(this.lastDetectionResult.state as TickState);
        } else {
            tickStates.push('pending');
        }
        }
        currentTickIndex = neededSamples;
    } else if (detectorStatus.isCollecting) {
        for (let i = 0; i < neededSamples; i++) {
        if (i < detectorStatus.samplesCollected) {
            tickStates.push('passed');
        } else {
            tickStates.push('pending');
        }
        }
        currentTickIndex = detectorStatus.samplesCollected;
    } else {
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
    if (this.detectionMode === 'manual') {
      if (!this.isAnalyzing) {
        // ✅ Генерируем ID при старте анализа
        this.currentReportId = this.generateReportUniqueId();
        console.log(`[TrendsFFTDetector] 📝 Generated report ID for new analysis: ${this.currentReportId}`);
        this.prepareForAnalysis();
        this.startAnalysis();
        trendsDetector.startCollection();
      } else {
        // ✅ Генерируем ID при старте сбора
        this.currentReportId = this.generateReportUniqueId();
        console.log(`[TrendsFFTDetector] 📝 Generated report ID for new collection: ${this.currentReportId}`);
        
        trendsDetector.startCollection();
      }
    } else {
      if (this.isAnalyzing) {
        // ✅ Генерируем ID при старте сбора
        this.currentReportId = this.generateReportUniqueId();
        console.log(`[TrendsFFTDetector] 📝 Generated report ID for new collection: ${this.currentReportId}`);
        
        trendsDetector.startCollection();
      }
    }
  }
  
  stopDetection(): void {
    trendsDetector.stopCollection();
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