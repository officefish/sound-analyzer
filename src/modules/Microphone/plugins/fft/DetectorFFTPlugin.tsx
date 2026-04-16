// src/plugins/microphone2/FFTDetectorPlugin.tsx

import { IPlugin, IPluginWidget, IPluginContext } from '../../../../types/plugins';
import DetectorFFTWidget from './widgets/DetectorFFTWidget';
import { audioAnalysis } from '../../../../services/AudioFFTAnalysisService';
import { fftDroneDetector, DetectionResult, RawSample } from '../../../../services/FFTDroneDetectorService';
import { useTelemetryStore } from '../../../../store/telemetry.store';

type DetectionMode = 'manual' | 'auto';
export type TickState = 'pending' | 'passed' | 'drone';

class FFTDetectorPluginClass implements IPlugin {
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

  // Добавляем новые поля в класс
  private totalAnalyses: number = 0;        // Всего выполненных анализов
  private successfulDetections: number = 0; // Успешных обнаружений
  private currentAnalysisProgress: number = 0; // Прогресс текущего анализа (0-100)
  private lastDetectionResult: DetectionResult | null = null;  // ✅ Добавлено

  
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
    console.log('📊 FFT Detector Plugin activated');
    
    // Регистрируем в телеметрии
    if (this.settings.enableTelemetry) {
      this.telemetryModuleId = useTelemetryStore.getState().registerModule('FFTDetector', {
        version: this.version,
        mode: this.detectionMode,
      });
    }
    
    // Подписываемся на события детектора
    fftDroneDetector.on('onDetectionResult', this.handleDetectionResult.bind(this));
    fftDroneDetector.on('onDroneDetected', this.handleDroneDetected.bind(this));
    fftDroneDetector.on('onSampleCollected', this.handleSampleCollected.bind(this));
    
    // Загружаем сохранённые настройки
    this.loadConfig();
    
    // Подписываемся на события модуля (если есть контекст)
    if (context) {
      // Сохраняем ссылку на контекст для получения стрима
      (this as any).context = context;
    }
  }
  
  onDeactivate(context?: IPluginContext): void {
    console.log('📊 FFT Detector Plugin deactivated');
    
    this.stopAnalysis();
    fftDroneDetector.reset();
    
    if (this.telemetryModuleId) {
      useTelemetryStore.getState().unregisterModule(this.telemetryModuleId);
      this.telemetryModuleId = null;
    }
  }
  
  // Обработка событий от модуля (микрофон)
  onModuleEvent(event: string, data: any, context?: IPluginContext): void {
    //console.log(`📊 FFT Detector event: ${event}`, data);
    
    switch (event) {
      case 'recordingStarted':
        // Микрофон включился
        if (this.detectionMode === 'auto' && !this.isAnalyzing) {
          this.startAnalysis();
        }
        break;
      case 'recordingStopped':
        // Микрофон выключился
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
    
    // Запускаем audioAnalysis
    audioAnalysis.start(this.currentStream || undefined);
    
    // Запускаем сбор сэмплов
    this.analysisInterval = window.setInterval(() => {
        const result = audioAnalysis.getLastResult();
        if (result) {
        fftDroneDetector.addSample(result.centroid, result.flux, result.rms);
        }
    }, fftDroneDetector.getConfig().intervalMs);
    
    // ✅ В авторежиме автоматически запускаем сбор тактов
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
  
  private handleDetectionResult(result: DetectionResult): void {
    console.log('📊 Detection result:', result);
  
    this.totalAnalyses++;
    this.currentAnalysisProgress = 0;
    
    if (result.isDrone) {
        this.successfulDetections++;
    }
    
    // ✅ В авторежиме после завершения анализа автоматически запускаем новый сбор
    if (this.detectionMode === 'auto' && this.isAnalyzing) {
        // Небольшая задержка перед новым сбором
        setTimeout(() => {
        if (this.isAnalyzing && this.detectionMode === 'auto') {
            fftDroneDetector.startCollection();
        }
        }, 500);
    }
    
    if (this.telemetryModuleId && this.settings.enableTelemetry) {
      result.samples.forEach((sample, index) => {
        useTelemetryStore.getState().addEntry({
          type: 'metric',
          moduleId: this.telemetryModuleId,
          data: {
            metric: `sample_${index + 1}`,
            centroid: sample.details.centroidValue,
            flux: sample.details.fluxValue,
            rms: sample.details.rmsValue,
            centroidOk: sample.details.centroidOk,
            fluxOk: sample.details.fluxOk,
            rmsOk: sample.details.rmsOk,
          },
          tags: ['analysis', `sample_${index + 1}`],
        });
      });
      
      useTelemetryStore.getState().addEntry({
        type: 'detection',
        moduleId: this.telemetryModuleId,
        data: {
          isDrone: result.isDrone,
          strictness: result.strictness,
          samplesCount: result.samplesCount,
          validSamples: result.validSamples,
          requiredValid: result.requiredValid,
          detectionMethod: result.detectionMethod,
        },
        tags: ['analysis', result.isDrone ? 'drone' : 'normal'],
      });
    }
  }
  
  private handleDroneDetected(result: DetectionResult): void {
     this.detectionCount++;
  
    console.log(`🚁 DRONE DETECTED! (${this.detectionCount})`);
    
    // ✅ В авторежиме после обнаружения автоматически запускаем новый сбор
    if (this.detectionMode === 'auto' && this.isAnalyzing) {
        // Небольшая задержка перед новым сбором
        setTimeout(() => {
        if (this.isAnalyzing && this.detectionMode === 'auto') {
            fftDroneDetector.startCollection();
        }
        }, 500);
    }

    if (this.telemetryModuleId && this.settings.enableTelemetry) {
      useTelemetryStore.getState().addEventEntry(
        this.telemetryModuleId,
        'drone_detected',
        {
          detectionNumber: this.detectionCount,
          strictness: result.strictness,
          samplesCount: result.samplesCount,
          validSamples: result.validSamples,
          method: result.detectionMethod,
          timestamp: result.timestamp,
        }
      );
    }
  }
  
  private handleSampleCollected(data: { sample: RawSample; samplesCount: number; totalNeeded: number }): void {
    // Обновляем прогресс текущего анализа
    this.currentAnalysisProgress = (data.samplesCount / data.totalNeeded) * 100;
    
    // ✅ В авторежиме, если сбор завершён, он автоматически перезапустится в handleDetectionResult
    }

  // Методы для execute (виджет вызывает их)
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
    // Обновляем режим работы
    if (data.detectionMode && data.detectionMode !== this.detectionMode) {
      this.detectionMode = data.detectionMode;
      this.settings.detectionMode = this.detectionMode;
      
      // Если переключаемся в авторежим и микрофон активен — запускаем анализ
      if (this.detectionMode === 'auto' && this.currentStream && !this.isAnalyzing) {
        this.startAnalysis();
      }
      // Если переключаемся в ручной режим и анализ идёт — останавливаем
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
    
    // Перезапускаем анализ если он активен
    if (this.isAnalyzing) {
      this.stopAnalysis();
      this.startAnalysis();
    }
  }
  
  // В getStatus добавляем новую статистику
  // В методе getStatus, правильная логика определения состояния такта

getStatus(): any {
  const detectorStatus = fftDroneDetector.getStatus();
  const config = fftDroneDetector.getConfig();
  const { strictness } = config;
  
  const tickStates: TickState[] = [];
  let currentTickIndex = 0;
  
  if (this.lastDetectionResult && this.lastDetectionResult.samples) {
    // Есть результат анализа — показываем его
    for (let i = 0; i < this.lastDetectionResult.samplesCount; i++) {
      const sample = this.lastDetectionResult.samples[i];
      if (sample) {
        const isTickValid = sample.isValid === true;
        const isDroneTick = isTickValid && this.lastDetectionResult.isDrone;
        
        if (isDroneTick) {
          tickStates.push('drone');
        } else if (isTickValid) {
          tickStates.push('passed');
        } else {
          tickStates.push('pending');
        }
      } else {
        tickStates.push('pending');
      }
    }
    // Если есть результат, текущий индекс — последний такт
    currentTickIndex = this.lastDetectionResult.samplesCount;
  } else if (detectorStatus.isCollecting) {
    // Идёт сбор данных — показываем прогресс
    for (let i = 0; i < detectorStatus.neededSamples; i++) {
      if (i < detectorStatus.samplesCollected) {
        // Собранные такты показываем как пройденные (временные)
        tickStates.push('passed');
      } else {
        tickStates.push('pending');
      }
    }
    currentTickIndex = detectorStatus.samplesCollected;
  } else {
    // Неактивно — все такты pending
    for (let i = 0; i < (detectorStatus.neededSamples || 5); i++) {
      tickStates.push('pending');
    }
    currentTickIndex = 0;
  }
  
  return {
    isAnalyzing: this.isAnalyzing,
    isCollecting: detectorStatus.isCollecting,
    samplesCollected: detectorStatus.samplesCollected,
    neededSamples: detectorStatus.neededSamples,
    currentSample: detectorStatus.currentSample,
    detectionCount: this.detectionCount,
    detectionMode: this.detectionMode,
    totalAnalyses: this.totalAnalyses,
    successfulDetections: this.successfulDetections,
    currentAnalysisProgress: this.currentAnalysisProgress,
    tickStates,
    currentTickIndex,  // ✅ Исправленный индекс
    lastResult: this.lastDetectionResult,
  };
}
  
  startDetection(): void {
    if (this.detectionMode === 'manual') {
      // В ручном режиме запускаем анализ один раз
      if (!this.isAnalyzing) {
        this.startAnalysis();
        fftDroneDetector.startCollection();
      } else {
        // Если анализ уже идёт, запускаем сбор сэмплов
        fftDroneDetector.startCollection();
      }
    } else {
      // В авторежиме просто запускаем сбор, если анализ уже идёт
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
  
  execute(action: string, data?: any, context?: IPluginContext): any {
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
      case 'recordingStarted':
        if (this.detectionMode === 'auto' && !this.isAnalyzing) {
            this.startAnalysis();
        } else if (this.detectionMode === 'auto' && this.isAnalyzing) {
            // Если анализ уже идёт, но сбор не активен, запускаем сбор
            const status = fftDroneDetector.getStatus();
            if (!status.isCollecting) {
            fftDroneDetector.startCollection();
            }
        }
        break;
      default:
        return null;
    }
  }
}

export const DetectorFFTPlugin = new FFTDetectorPluginClass();