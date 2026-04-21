// src/plugins/microphone2/DetectorFFTPlugin.tsx

import { IPlugin, IPluginWidget, IPluginContext } from '../../../../types/plugins';
import DetectorFFTWidget from './widgets/DetectorFFTWidget';
import { audioAnalysis } from '../../../../services/AudioFFTAnalysisService';
import { fftDroneDetector, DetectionResult } from '../../../../services/FFTDroneDetectorService';
import { fftDetectionReport } from '../../../../services/FFTDetectionReport';
import { useTelemetryStore } from '../../../../store/telemetry.store';

type DetectionMode = 'manual' | 'auto';
export type TickState = 'pending' | 'passed' | 'drone';

class DetectorFFTPluginClass implements IPlugin {
  id = 'microphone2-fft-detector';
  name = 'FFT Детектор';
  version = '1.0.0';
  description = 'Анализ звука с помощью БПФ и детекция дронов';
  icon = '📊';
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
  private lastDetectionResult: DetectionResult | null = null;
  
  settings = {
    detectionMode: 'auto' as DetectionMode,
    enableTelemetry: true,
  };
  
  widget: IPluginWidget = {
    id: 'fft-detector-widget',
    pluginId: 'microphone2-fft-detector',
    title: 'FFT Анализатор',
    icon: '📊',
    position: 'bottom',
    order: 3,
    width: 'full',
    component: DetectorFFTWidget,
  };
  
  onActivate(context?: IPluginContext): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[FFTDetector] Модуль запущен`);
    console.log(`  Версия: ${this.version}`);
    console.log(`  Режим: ${this.detectionMode}`);
    console.log(`  Телеметрия: ${this.settings.enableTelemetry ? 'включена' : 'выключена'}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Регистрируем в телеметрии
    if (this.settings.enableTelemetry) {
        // ✅ registerModule возвращает string (moduleId)
        this.telemetryModuleId = useTelemetryStore.getState().registerModule('FFTDetector', {
        version: this.version,
        mode: this.detectionMode,
        });
        
        // ✅ Репортер сам будет отправлять данные в телеметрию
        // Передаём moduleId (он точно не null, так как registerModule всегда возвращает строку)
        if (this.telemetryModuleId) {
        fftDetectionReport.setModuleId(this.telemetryModuleId);
        }
    }
    
    // Подписываемся на события детектора
    fftDroneDetector.on('onDetectionResult', this.handleDetectionResult.bind(this));
    fftDroneDetector.on('onDroneDetected', this.handleDroneDetected.bind(this));
    fftDroneDetector.on('onSampleCollected', this.handleSampleCollected.bind(this));
    
    // Загружаем сохранённые настройки
    this.loadConfig();
    
    // Сохраняем ссылку на контекст
    if (context) {
        (this as any).context = context;
    }
  }
  
  onDeactivate(): void {
    console.log('📊 FFT Detector Plugin deactivated');
    
    this.stopAnalysis();
    fftDroneDetector.reset();
    
    if (this.telemetryModuleId) {
      useTelemetryStore.getState().unregisterModule(this.telemetryModuleId);
      this.telemetryModuleId = null;
    }
  }
  
  onModuleEvent(event: string, data: any): void {
    switch (event) {
      case 'recordingStarted':
        if (this.detectionMode === 'auto' && !this.isAnalyzing) {
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
            this.startAnalysis();
          }
        }
        break;
    }
  }
  
  private loadConfig(): void {
    const savedConfig = localStorage.getItem('fft-detector-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        this.detectionMode = config.detectionMode || 'auto';
        this.settings.detectionMode = this.detectionMode;
        
        const fullConfig = {
          parameters: {
            centroidMin: config.centroidMin ?? 200,
            centroidMax: config.centroidMax ?? 800,
            fluxMin: config.fluxMin ?? 0,
            fluxMax: config.fluxMax ?? 1.5,
            rmsMin: config.rmsMin ?? 0.01,
            rmsMax: config.rmsMax ?? 1.0,
          },
          intervalMs: config.intervalMs ?? 500,
          samplesCount: config.samplesCount ?? 3,
          strictness: config.strictness ?? 'normal',
        };
        fftDroneDetector.setConfig(fullConfig);
        audioAnalysis.setConfig({
          centroidMin: fullConfig.parameters.centroidMin,
          centroidMax: fullConfig.parameters.centroidMax,
          fluxMin: fullConfig.parameters.fluxMin,
          fluxMax: fullConfig.parameters.fluxMax,
          rmsMin: fullConfig.parameters.rmsMin,
          rmsMax: fullConfig.parameters.rmsMax,
          fftSize: 2048,
          smoothingTimeConstant: 0.8,
        });
      } catch (e) {
        console.error('Failed to load config:', e);
      }
    }
  }
  
  private saveConfig(): void {
    const config = fftDroneDetector.getConfig();
    localStorage.setItem('fft-detector-config', JSON.stringify({
      detectionMode: this.detectionMode,
      centroidMin: config.parameters.centroidMin,
      centroidMax: config.parameters.centroidMax,
      fluxMin: config.parameters.fluxMin,
      fluxMax: config.parameters.fluxMax,
      rmsMin: config.parameters.rmsMin,
      rmsMax: config.parameters.rmsMax,
      intervalMs: config.intervalMs,
      samplesCount: config.samplesCount,
      strictness: config.strictness,
    }));
  }
  
  private startAnalysis(): void {
    if (this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    
    audioAnalysis.start(this.currentStream || undefined);
    
    this.analysisInterval = window.setInterval(() => {
      const result = audioAnalysis.getLastResult();
      if (result) {
        fftDroneDetector.addSample(result.centroid, result.flux, result.rms);
      }
    }, fftDroneDetector.getConfig().intervalMs);
    
    if (this.detectionMode === 'auto') {
      fftDroneDetector.startCollection();
    }
    
    console.log(`📊 FFT Analysis started in ${this.detectionMode} mode`);
  }
  
  private stopAnalysis(): void {
    if (!this.isAnalyzing) return;
    
    this.isAnalyzing = false;
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    audioAnalysis.stop();
    fftDroneDetector.stopCollection();
    
    console.log('📊 FFT Analysis stopped');
  }

  // В методе handleSampleCollected (если есть) или в интервале сбора обновляем прогресс
  private handleSampleCollected(data: { samplesCount: number; totalNeeded: number }): void {
    // Обновляем прогресс текущего анализа
    this.currentAnalysisProgress = (data.samplesCount / data.totalNeeded) * 100;
    
    // При первом сэмпле нового анализа сбрасываем предыдущий результат
    if (data.samplesCount === 1) {
        this.lastDetectionResult = null;
    }
    }
  
  // В методе handleDetectionResult обновляем прогресс:
  private async handleDetectionResult(result: DetectionResult): Promise<void> {
    console.log('📊 Detection result:', result);
    
    this.totalAnalyses++;
    this.currentAnalysisProgress = 0;  // Сбрасываем прогресс после завершения
    this.lastDetectionResult = result;
    
    if (result.isDrone) {
        this.successfulDetections++;
        this.detectionCount++;
    }
    
    // Репортер сам отправляет все данные в телеметрию
    const config = fftDroneDetector.getConfig();
    await fftDetectionReport.generateReport(
        this.detectionCount,
        result,
        {
        centerOfMass: [config.parameters.centroidMin, config.parameters.centroidMax],
        spectralFlux: [config.parameters.fluxMin, config.parameters.fluxMax],
        loudness: [config.parameters.rmsMin, config.parameters.rmsMax]
        }
    );
    
    // В авторежиме после завершения анализа автоматически запускаем новый сбор
    if (this.detectionMode === 'auto' && this.isAnalyzing) {
        setTimeout(() => {
        if (this.isAnalyzing && this.detectionMode === 'auto') {
            fftDroneDetector.startCollection();
        }
        }, 500);
    }
  }
  
  private handleDroneDetected(result: DetectionResult): void {
    console.log(`🚁 DRONE DETECTED! (${result})`);
    
    // В авторежиме после обнаружения автоматически запускаем новый сбор
    if (this.detectionMode === 'auto' && this.isAnalyzing) {
      setTimeout(() => {
        if (this.isAnalyzing && this.detectionMode === 'auto') {
          fftDroneDetector.startCollection();
        }
      }, 500);
    }
  }
  
  getConfig(): any {
    const config = fftDroneDetector.getConfig();
    return {
      detectionMode: this.detectionMode,
      centroidMin: config.parameters.centroidMin,
      centroidMax: config.parameters.centroidMax,
      fluxMin: config.parameters.fluxMin,
      fluxMax: config.parameters.fluxMax,
      rmsMin: config.parameters.rmsMin,
      rmsMax: config.parameters.rmsMax,
      intervalMs: config.intervalMs,
      samplesCount: config.samplesCount,
      strictness: config.strictness,
    };
  }
  
  setConfig(data: any): void {
    if (data.detectionMode && data.detectionMode !== this.detectionMode) {
      this.detectionMode = data.detectionMode;
      this.settings.detectionMode = this.detectionMode;
      
      if (this.detectionMode === 'auto' && this.currentStream && !this.isAnalyzing) {
        this.startAnalysis();
      }
      if (this.detectionMode === 'manual' && this.isAnalyzing) {
        this.stopAnalysis();
      }
    }
    
    const config = fftDroneDetector.getConfig();
    const newConfig = {
      ...config,
      parameters: {
        centroidMin: data.centroidMin ?? config.parameters.centroidMin,
        centroidMax: data.centroidMax ?? config.parameters.centroidMax,
        fluxMin: data.fluxMin ?? config.parameters.fluxMin,
        fluxMax: data.fluxMax ?? config.parameters.fluxMax,
        rmsMin: data.rmsMin ?? config.parameters.rmsMin,
        rmsMax: data.rmsMax ?? config.parameters.rmsMax,
      },
      intervalMs: data.intervalMs ?? config.intervalMs,
      samplesCount: data.samplesCount ?? config.samplesCount,
      strictness: data.strictness ?? config.strictness,
    };
    
    fftDroneDetector.setConfig(newConfig);
    audioAnalysis.setConfig({
      centroidMin: newConfig.parameters.centroidMin,
      centroidMax: newConfig.parameters.centroidMax,
      fluxMin: newConfig.parameters.fluxMin,
      fluxMax: newConfig.parameters.fluxMax,
      rmsMin: newConfig.parameters.rmsMin,
      rmsMax: newConfig.parameters.rmsMax,
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
    });
    
    this.saveConfig();
    
    if (this.isAnalyzing) {
      this.stopAnalysis();
      this.startAnalysis();
    }
  }
  
  getStatus(): any {
    const detectorStatus = fftDroneDetector.getStatus();
    const config = fftDroneDetector.getConfig();
    const neededSamples = config.samplesCount;
    
    const tickStates: TickState[] = [];
    let currentTickIndex = 0;
    
    // Если есть результат последнего анализа
    if (this.lastDetectionResult && this.lastDetectionResult.samples) {
        // Отображаем результат последнего анализа
        for (let i = 0; i < neededSamples; i++) {
        const sample = this.lastDetectionResult.samples[i];
        if (sample && sample.isValid) {
            // Такт валидный
            if (this.lastDetectionResult.isDrone) {
            tickStates.push('drone');
            } else {
            tickStates.push('passed');
            }
        } else {
            tickStates.push('pending');
        }
        }
        currentTickIndex = neededSamples;
    } 
    // Если идёт сбор данных
    else if (detectorStatus.isCollecting) {
        for (let i = 0; i < neededSamples; i++) {
        if (i < detectorStatus.samplesCollected) {
            // Собранные такты показываем как пройденные (в процессе анализа)
            tickStates.push('passed');
        } else {
            tickStates.push('pending');
        }
        }
        currentTickIndex = detectorStatus.samplesCollected;
    } 
    // Нет активного анализа
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
    };
    }

  
  startDetection(): void {
    if (this.detectionMode === 'manual') {
      if (!this.isAnalyzing) {
        this.startAnalysis();
        fftDroneDetector.startCollection();
      } else {
        fftDroneDetector.startCollection();
      }
    } else {
      if (this.isAnalyzing) {
        fftDroneDetector.startCollection();
      }
    }
  }
  
  stopDetection(): void {
    fftDroneDetector.stopCollection();
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

export const DetectorFFTPlugin = new DetectorFFTPluginClass();