// src/services/AudioAnalysisReport.ts

//import { AudioFrame, CompleteTemporalPatterns } from '../../../../../services/fft/UnifiedAnalyzerFFT.service';
//import { AudioFileAnalysisConfig } from '../services/AnalizerFFT.service';

import { TrendsDetectionResult, TrendsSample } from '../types';

// ============ Вспомогательные интерфейсы ============

export interface DataStatistics {
  values: number[];
  min: number;
  max: number;
  mean: number;
  std: number;
}

export interface NormalizedDataStatistics extends DataStatistics {
  targetRange: { min: number; max: number };
}

export interface FrequencyJumpsData {
  count: number;
  densityPerSecond: number;
  minMagnitude: number;
  maxMagnitude: number;
  avgMagnitude: number;
  magnitudes: number[];
}

export interface TemporalPatternsData {
  centroidStd: number;
  fluxStd: number;
  rmsStd: number;
  activityRatio: number;
  avgSilenceDuration: number;
  avgBurstDuration: number;
  frequencyJumps: FrequencyJumpsData;
  volumeTrend: string;
  frequencyTrend: string;
  longTermStability: string;
  periodicity: string;
  envelopeShape: string;
  peakToAverageRatio: number;
}

export interface Thresholds {
  centroid: { min: number; max: number };
  flux: { min: number; max: number };
  rms: { min: number; max: number };
}

export interface SampleFrame {
  index: number;
  timestamp: number;
  rawCentroid: number;
  rawFlux: number;
  rawRms: number;
  normCentroid: number;
  normFlux: number;
  normRms: number;
  isActive: boolean;
}

// ============ Основной интерфейс отчета ============

export interface AudioAnalysisReport {
  // Общая информация
  fileInfo: {
    name: string;
    size: number;
    duration: number;
    sampleRate: number;
    channels: number;
  };
  
  // Параметры анализа
  analysisConfig: {
    intervalMs: number;
    fftSize: number;
    smoothingTimeConstant: number;
    totalFrames: number;
  };
  
  // Сырые данные (до нормализации)
  rawData: {
    centroid: DataStatistics;
    flux: DataStatistics;
    rms: DataStatistics;
  };
  
  // Нормализованные данные
  normalizedData: {
    centroid: NormalizedDataStatistics;
    flux: NormalizedDataStatistics;
    rms: NormalizedDataStatistics;
  };
  
  // Временные паттерны
  temporalPatterns: TemporalPatternsData;
  
  // Рекомендации для паттерна
  recommendations: {
    thresholds: Thresholds;
    temporalPatterns: {
      volumeTrend: string[];
      frequencyTrend: string[];
      longTermStability: string[];
      periodicity: string[];
      envelopeShape: string[];
    };
  };
  
  // Первые N фреймов для отладки
  sampleFrames: SampleFrame[];
  
  // Результат детекции (опционально)
  detectionResult?: {
    detectedState: string;
    detectedStateName: string;
    detectedStateIcon: string;
    confidence: number;
    stateScores: Array<{
      state: string;
      name: string;
      score: number;
    }>;
  };
  
  timestamp: number;
  reportId?: string;
}

// ============ Параметры для создания отчета ============

export interface ReportGenerationParams {
  file: File;
  analysisConfig: {
    intervalMs: number;
    fftSize: number;
    smoothingTimeConstant: number;
  };
  rawFrames: Array<{
    timestamp: number;
    centroid: number;
    flux: number;
    rms: number;
  }>;
  normalizedFrames: Array<{
    centroid: number;
    flux: number;
    rms: number;
    isActive: boolean;
  }>;
  statistics: {
    centroid: { std: number };
    flux: { std: number };
    rms: { std: number };
  };
  temporalPatterns: {
    centroidStd: number;
    fluxStd: number;
    rmsStd: number;
    activityRatio: number;
    avgSilenceDuration: number;
    avgBurstDuration: number;
    frequencyJumps?: {
      actualJumps: number;
      densityPerSecond: number;
      magnitudeRange?: { min: number; max: number; avg: number };
      magnitudes?: number[];
    };
    volumeTrend: string;
    frequencyTrend: string;
    longTermStability: string;
    periodicity: string;
    envelopeShape: string;
    peakToAverageRatio: number;
  };
  recommendations: {
    thresholds: Thresholds;
    temporalPatterns: {
      volumeTrend: string[];
      frequencyTrend: string[];
      longTermStability: string[];
      periodicity: string[];
      envelopeShape: string[];
    };
  };
  duration: number;
  sampleRate: number;
}

// ============ Генератор отчетов ============

export class AudioAnalysisReportGenerator {
  
  /**
   * Генерация отчета из результатов анализа аудиофайла
   */
  static generateReport(params: ReportGenerationParams): AudioAnalysisReport {
    const {
      file,
      analysisConfig,
      rawFrames,
      normalizedFrames,
      temporalPatterns,
      recommendations,
      duration,
      sampleRate
    } = params;
    
    // Берем первые 20 фреймов для отладки
    const sampleCount = Math.min(20, rawFrames.length);
    const sampleFrames: SampleFrame[] = [];
    
    for (let i = 0; i < sampleCount; i++) {
      sampleFrames.push({
        index: i,
        timestamp: rawFrames[i].timestamp,
        rawCentroid: rawFrames[i].centroid,
        rawFlux: rawFrames[i].flux,
        rawRms: rawFrames[i].rms,
        normCentroid: normalizedFrames[i].centroid,
        normFlux: normalizedFrames[i].flux,
        normRms: normalizedFrames[i].rms,
        isActive: normalizedFrames[i].isActive
      });
    }
    
    // Вычисляем статистику для сырых данных
    const rawCentroidValues = rawFrames.map(f => f.centroid);
    const rawFluxValues = rawFrames.map(f => f.flux);
    const rawRmsValues = rawFrames.map(f => f.rms);
    
    // Вычисляем статистику для нормализованных данных
    const normCentroidValues = normalizedFrames.map(f => f.centroid);
    const normFluxValues = normalizedFrames.map(f => f.flux);
    const normRmsValues = normalizedFrames.map(f => f.rms);
    
    return {
      fileInfo: {
        name: file.name,
        size: file.size,
        duration,
        sampleRate,
        channels: 1
      },
      analysisConfig: {
        intervalMs: analysisConfig.intervalMs,
        fftSize: analysisConfig.fftSize,
        smoothingTimeConstant: analysisConfig.smoothingTimeConstant,
        totalFrames: rawFrames.length
      },
      rawData: {
        centroid: this.calculateStatistics(rawCentroidValues),
        flux: this.calculateStatistics(rawFluxValues),
        rms: this.calculateStatistics(rawRmsValues)
      },
      normalizedData: {
        centroid: {
          ...this.calculateStatistics(normCentroidValues),
          targetRange: { min: 0, max: 5000 }
        },
        flux: {
          ...this.calculateStatistics(normFluxValues),
          targetRange: { min: 0, max: 2.0 }
        },
        rms: {
          ...this.calculateStatistics(normRmsValues),
          targetRange: { min: 0, max: 0.5 }
        }
      },
      temporalPatterns: {
        centroidStd: temporalPatterns.centroidStd,
        fluxStd: temporalPatterns.fluxStd,
        rmsStd: temporalPatterns.rmsStd,
        activityRatio: temporalPatterns.activityRatio,
        avgSilenceDuration: temporalPatterns.avgSilenceDuration,
        avgBurstDuration: temporalPatterns.avgBurstDuration,
        frequencyJumps: {
          count: temporalPatterns.frequencyJumps?.actualJumps || 0,
          densityPerSecond: temporalPatterns.frequencyJumps?.densityPerSecond || 0,
          minMagnitude: temporalPatterns.frequencyJumps?.magnitudeRange?.min || 0,
          maxMagnitude: temporalPatterns.frequencyJumps?.magnitudeRange?.max || 0,
          avgMagnitude: temporalPatterns.frequencyJumps?.magnitudeRange?.avg || 0,
          magnitudes: temporalPatterns.frequencyJumps?.magnitudes || []
        },
        volumeTrend: temporalPatterns.volumeTrend,
        frequencyTrend: temporalPatterns.frequencyTrend,
        longTermStability: temporalPatterns.longTermStability,
        periodicity: temporalPatterns.periodicity,
        envelopeShape: temporalPatterns.envelopeShape,
        peakToAverageRatio: temporalPatterns.peakToAverageRatio
      },
      recommendations,
      sampleFrames,
      timestamp: Date.now(),
      reportId: this.generateReportId()
    };
  }
  
  /**
   * Генерация отчета из результата детекции
   */
  static generateFromDetectionResult(
    result: TrendsDetectionResult,
    config: { intervalMs: number; measurementsCount: number },
    samples: TrendsSample[]
  ): AudioAnalysisReport {
    // Вычисляем статистику по сэмплам
    const validSamples = samples.filter(s => s.isValid);
    const centroids = validSamples.map(s => s.centroid);
    const fluxes = validSamples.map(s => s.flux);
    const rmsValues = validSamples.map(s => s.rms);
    
    // Создаем простой файловый объект
    const fileInfo = {
      name: `detection_${Date.now()}.audio`,
      size: 0,
      duration: samples.length * (config.intervalMs / 1000),
      sampleRate: 44100,
      channels: 1
    };
    
    // Создаем фреймы для отчета
    const sampleFrames: SampleFrame[] = samples.slice(0, 20).map((sample, idx) => ({
      index: idx,
      timestamp: sample.timestamp,
      rawCentroid: sample.centroid,
      rawFlux: sample.flux,
      rawRms: sample.rms,
      normCentroid: sample.centroid / 5000,
      normFlux: sample.flux / 2,
      normRms: sample.rms / 0.5,
      isActive: sample.isValid
    }));
    
    // Вычисляем рекомендации на основе результата
    const recommendations = {
      thresholds: {
        centroid: {
          min: result.analysis?.averageCentroid ? result.analysis.averageCentroid * 0.7 : 100,
          max: result.analysis?.averageCentroid ? result.analysis.averageCentroid * 1.3 : 3000
        },
        flux: {
          min: result.analysis?.averageFlux ? result.analysis.averageFlux * 0.5 : 0.1,
          max: result.analysis?.averageFlux ? result.analysis.averageFlux * 1.5 : 2.0
        },
        rms: {
          min: result.analysis?.averageRms ? result.analysis.averageRms * 0.5 : 0.02,
          max: result.analysis?.averageRms ? result.analysis.averageRms * 1.5 : 0.5
        }
      },
      temporalPatterns: {
        volumeTrend: [result.analysis?.volumeTrend || 'stable'],
        frequencyTrend: [result.analysis?.frequencyTrend || 'stable'],
        longTermStability: ['medium'],
        periodicity: ['irregular'],
        envelopeShape: ['sustained']
      }
    };
    
    return {
      fileInfo,
      analysisConfig: {
        intervalMs: config.intervalMs,
        fftSize: 2048,
        smoothingTimeConstant: 0.8,
        totalFrames: samples.length
      },
      rawData: {
        centroid: this.calculateStatistics(centroids),
        flux: this.calculateStatistics(fluxes),
        rms: this.calculateStatistics(rmsValues)
      },
      normalizedData: {
        centroid: {
          ...this.calculateStatistics(centroids.map(c => c / 5000)),
          targetRange: { min: 0, max: 5000 }
        },
        flux: {
          ...this.calculateStatistics(fluxes.map(f => f / 2)),
          targetRange: { min: 0, max: 2.0 }
        },
        rms: {
          ...this.calculateStatistics(rmsValues.map(r => r / 0.5)),
          targetRange: { min: 0, max: 0.5 }
        }
      },
      temporalPatterns: {
        centroidStd: this.calculateStdDev(centroids),
        fluxStd: this.calculateStdDev(fluxes),
        rmsStd: this.calculateStdDev(rmsValues),
        activityRatio: validSamples.length / samples.length,
        avgSilenceDuration: 0,
        avgBurstDuration: 0,
        frequencyJumps: {
          count: 0,
          densityPerSecond: 0,
          minMagnitude: 0,
          maxMagnitude: 0,
          avgMagnitude: 0,
          magnitudes: []
        },
        volumeTrend: result.analysis?.volumeTrend || 'stable',
        frequencyTrend: result.analysis?.frequencyTrend || 'stable',
        longTermStability: 'medium',
        periodicity: 'irregular',
        envelopeShape: 'sustained',
        peakToAverageRatio: 1.5
      },
      recommendations,
      sampleFrames,
      timestamp: Date.now(),
      reportId: this.generateReportId(),
      detectionResult: {
        detectedState: result.state,
        detectedStateName: result.stateName,
        detectedStateIcon: result.stateIcon,
        confidence: result.confidence,
        stateScores: result.analysis?.stateScores || []
      }
    };
  }
  
  /**
   * Экспорт отчета в текстовый формат
   */
  static exportToText(report: AudioAnalysisReport): string {
    const sections: string[] = [];
    
    // Заголовок
    sections.push(this.createSection('АУДИО АНАЛИЗ ОТЧЕТ', '='));
    sections.push('');
    
    // Основная информация
    sections.push(this.createSection('ОСНОВНАЯ ИНФОРМАЦИЯ', '-'));
    sections.push(`Дата: ${new Date(report.timestamp).toLocaleString()}`);
    sections.push(`ID отчета: ${report.reportId || 'N/A'}`);
    sections.push(`Файл: ${report.fileInfo.name}`);
    sections.push(`Размер: ${(report.fileInfo.size / 1024).toFixed(2)} KB`);
    sections.push(`Длительность: ${report.fileInfo.duration.toFixed(2)} сек`);
    sections.push(`Частота: ${report.fileInfo.sampleRate} Hz`);
    sections.push(`Каналы: ${report.fileInfo.channels}`);
    sections.push('');
    
    // Результат детекции (если есть)
    if (report.detectionResult) {
      sections.push(this.createSection('РЕЗУЛЬТАТ ДЕТЕКЦИИ', '-'));
      sections.push(`Обнаружен: ${report.detectionResult.detectedStateName}`);
      sections.push(`Иконка: ${report.detectionResult.detectedStateIcon}`);
      sections.push(`Уверенность: ${report.detectionResult.confidence.toFixed(1)}%`);
      sections.push('');
    }
    
    // Параметры анализа
    sections.push(this.createSection('ПАРАМЕТРЫ АНАЛИЗА', '-'));
    sections.push(`Интервал: ${report.analysisConfig.intervalMs} мс`);
    sections.push(`Всего фреймов: ${report.analysisConfig.totalFrames}`);
    sections.push(`FFT размер: ${report.analysisConfig.fftSize}`);
    sections.push(`Сглаживание: ${report.analysisConfig.smoothingTimeConstant}`);
    sections.push('');
    
    // Сырые данные
    sections.push(this.createSection('СЫРЫЕ ДАННЫЕ (ДО НОРМАЛИЗАЦИИ)', '-'));
    this.addDataStatistics(sections, 'Centroid', report.rawData.centroid, 'Hz');
    this.addDataStatistics(sections, 'Flux', report.rawData.flux);
    this.addDataStatistics(sections, 'RMS', report.rawData.rms);
    sections.push('');
    
    // Нормализованные данные
    sections.push(this.createSection('НОРМАЛИЗОВАННЫЕ ДАННЫЕ', '-'));
    this.addNormalizedDataStatistics(sections, 'Centroid', report.normalizedData.centroid);
    this.addNormalizedDataStatistics(sections, 'Flux', report.normalizedData.flux);
    this.addNormalizedDataStatistics(sections, 'RMS', report.normalizedData.rms);
    sections.push('');
    
    // Временные паттерны
    sections.push(this.createSection('ВРЕМЕННЫЕ ПАТТЕРНЫ', '-'));
    sections.push(`Активность: ${(report.temporalPatterns.activityRatio * 100).toFixed(1)}%`);
    sections.push(`Средняя пауза: ${report.temporalPatterns.avgSilenceDuration.toFixed(3)} сек`);
    sections.push(`Средний всплеск: ${report.temporalPatterns.avgBurstDuration.toFixed(3)} сек`);
    sections.push(`Станд. отклонение центра: ${report.temporalPatterns.centroidStd.toFixed(2)}`);
    sections.push(`Станд. отклонение потока: ${report.temporalPatterns.fluxStd.toFixed(4)}`);
    sections.push(`Станд. отклонение громкости: ${report.temporalPatterns.rmsStd.toFixed(4)}`);
    sections.push(``);
    sections.push(`Частотные скачки: ${report.temporalPatterns.frequencyJumps.count} (${report.temporalPatterns.frequencyJumps.densityPerSecond.toFixed(2)}/сек)`);
    sections.push(`  - Амплитуда: min=${report.temporalPatterns.frequencyJumps.minMagnitude.toFixed(2)} max=${report.temporalPatterns.frequencyJumps.maxMagnitude.toFixed(2)} avg=${report.temporalPatterns.frequencyJumps.avgMagnitude.toFixed(2)}`);
    sections.push(`Тренд громкости: ${report.temporalPatterns.volumeTrend}`);
    sections.push(`Тренд частоты: ${report.temporalPatterns.frequencyTrend}`);
    sections.push(`Стабильность: ${report.temporalPatterns.longTermStability}`);
    sections.push(`Периодичность: ${report.temporalPatterns.periodicity}`);
    sections.push(`Форма огибающей: ${report.temporalPatterns.envelopeShape}`);
    sections.push(`Пик/среднее: ${report.temporalPatterns.peakToAverageRatio.toFixed(2)}`);
    sections.push('');
    
    // Первые фреймы
    sections.push(this.createSection(`ПЕРВЫЕ ${report.sampleFrames.length} ФРЕЙМОВ`, '-'));
    sections.push(`# | Время | Raw Cent | Raw Flux | Raw RMS | Norm Cent | Norm Flux | Norm RMS | Active`);
    sections.push('-'.repeat(80));
    
    for (const frame of report.sampleFrames) {
      sections.push(
        `${frame.index.toString().padStart(2)} | ${frame.timestamp.toFixed(2)}s | ` +
        `${frame.rawCentroid.toFixed(0).padStart(7)} | ` +
        `${frame.rawFlux.toFixed(3).padStart(8)} | ` +
        `${frame.rawRms.toFixed(4).padStart(7)} | ` +
        `${frame.normCentroid.toFixed(0).padStart(8)} | ` +
        `${frame.normFlux.toFixed(3).padStart(8)} | ` +
        `${frame.normRms.toFixed(4).padStart(7)} | ` +
        `${frame.isActive ? 'YES' : 'NO'}`
      );
    }
    sections.push('');
    
    // Рекомендации
    sections.push(this.createSection('РЕКОМЕНДАЦИИ ДЛЯ ПАТТЕРНА', '-'));
    sections.push(`Centroid: [${report.recommendations.thresholds.centroid.min.toFixed(0)} - ${report.recommendations.thresholds.centroid.max.toFixed(0)}]`);
    sections.push(`Flux: [${report.recommendations.thresholds.flux.min.toFixed(3)} - ${report.recommendations.thresholds.flux.max.toFixed(3)}]`);
    sections.push(`RMS: [${report.recommendations.thresholds.rms.min.toFixed(4)} - ${report.recommendations.thresholds.rms.max.toFixed(4)}]`);
    sections.push(`Тренд громкости: ${report.recommendations.temporalPatterns.volumeTrend.join(', ')}`);
    sections.push(`Тренд частоты: ${report.recommendations.temporalPatterns.frequencyTrend.join(', ')}`);
    sections.push(`Стабильность: ${report.recommendations.temporalPatterns.longTermStability.join(', ')}`);
    sections.push(`Периодичность: ${report.recommendations.temporalPatterns.periodicity.join(', ')}`);
    sections.push(`Форма огибающей: ${report.recommendations.temporalPatterns.envelopeShape.join(', ')}`);
    sections.push('');
    
    // Footer
    sections.push(this.createSection('КОНЕЦ ОТЧЕТА', '='));
    
    return sections.join('\n');
  }
  
  /**
   * Экспорт отчета в JSON формат
   */
  static exportToJson(report: AudioAnalysisReport): string {
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * Экспорт отчета в CSV формат
   */
  static exportToCsv(report: AudioAnalysisReport): string {
    const headers = [
      'Index', 'Timestamp', 'RawCentroid', 'RawFlux', 'RawRMS',
      'NormCentroid', 'NormFlux', 'NormRMS', 'IsActive'
    ];
    
    const rows = report.sampleFrames.map(frame => [
      frame.index,
      frame.timestamp.toFixed(3),
      frame.rawCentroid.toFixed(2),
      frame.rawFlux.toFixed(4),
      frame.rawRms.toFixed(6),
      frame.normCentroid.toFixed(2),
      frame.normFlux.toFixed(4),
      frame.normRms.toFixed(6),
      frame.isActive ? 1 : 0
    ].join(','));
    
    return [headers.join(','), ...rows].join('\n');
  }
  
  /**
   * Сохранение отчета в файл
   */
  static saveReport(report: AudioAnalysisReport, format: 'txt' | 'json' | 'csv' = 'json'): void {
    let content: string;
    let extension: string;
    let mimeType: string;
    
    switch (format) {
      case 'txt':
        content = this.exportToText(report);
        extension = 'txt';
        mimeType = 'text/plain';
        break;
      case 'csv':
        content = this.exportToCsv(report);
        extension = 'csv';
        mimeType = 'text/csv';
        break;
      default:
        content = this.exportToJson(report);
        extension = 'json';
        mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio_analysis_${report.reportId || Date.now()}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  // ============ Приватные вспомогательные методы ============
  
  private static generateReportId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private static createSection(title: string, char: string = '-'): string {
    return char.repeat(80) + '\n' + title + '\n' + char.repeat(80);
  }
  
  private static calculateStatistics(values: number[]): DataStatistics {
    if (values.length === 0) {
      return {
        values: [],
        min: 0,
        max: 0,
        mean: 0,
        std: 0
      };
    }
    
    const mean = this.calculateMean(values);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const std = this.calculateStdDev(values);
    
    return {
      values,
      min,
      max,
      mean,
      std
    };
  }
  
  private static calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  private static calculateStdDev(values: number[]): number {
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(this.calculateMean(squaredDiffs));
  }
  
  private static addDataStatistics(
    sections: string[],
    name: string,
    stats: DataStatistics,
    unit: string = ''
  ): void {
    sections.push(`${name}:`);
    sections.push(`  min=${stats.min.toFixed(2)}${unit} max=${stats.max.toFixed(2)}${unit}`);
    sections.push(`  mean=${stats.mean.toFixed(2)}${unit} std=${stats.std.toFixed(2)}${unit}`);
  }
  
  private static addNormalizedDataStatistics(
    sections: string[],
    name: string,
    stats: NormalizedDataStatistics
  ): void {
    sections.push(`${name}:`);
    sections.push(`  target=[${stats.targetRange.min}-${stats.targetRange.max}]`);
    sections.push(`  actual=[${stats.min.toFixed(2)}-${stats.max.toFixed(2)}]`);
    sections.push(`  mean=${stats.mean.toFixed(2)} std=${stats.std.toFixed(2)}`);
  }
}

// ============ Экспорт типа для удобства ============
export type AudioAnalysisReportFormat = 'txt' | 'json' | 'csv';

// // src/services/AudioAnalysisReport.ts

// export interface AudioAnalysisReport {
//   // Общая информация
//   fileInfo: {
//     name: string;
//     size: number;
//     duration: number;
//     sampleRate: number;
//     channels: number;
//   };
  
//   // Параметры анализа
//   analysisConfig: {
//     intervalMs: number;
//     fftSize: number;
//     smoothingTimeConstant: number;
//     totalFrames: number;
//   };
  
//   // Сырые данные (до нормализации)
//   rawData: {
//     centroid: {
//       values: number[];
//       min: number;
//       max: number;
//       mean: number;
//       std: number;
//     };
//     flux: {
//       values: number[];
//       min: number;
//       max: number;
//       mean: number;
//       std: number;
//     };
//     rms: {
//       values: number[];
//       min: number;
//       max: number;
//       mean: number;
//       std: number;
//     };
//   };
  
//   // Нормализованные данные
//   normalizedData: {
//     centroid: {
//       values: number[];
//       min: number;
//       max: number;
//       mean: number;
//       std: number;
//       targetRange: { min: number; max: number };
//     };
//     flux: {
//       values: number[];
//       min: number;
//       max: number;
//       mean: number;
//       std: number;
//       targetRange: { min: number; max: number };
//     };
//     rms: {
//       values: number[];
//       min: number;
//       max: number;
//       mean: number;
//       std: number;
//       targetRange: { min: number; max: number };
//     };
//   };
  
//   // Временные паттерны
//   temporalPatterns: {
//     centroidStd: number;
//     fluxStd: number;
//     rmsStd: number;
//     activityRatio: number;
//     avgSilenceDuration: number;
//     avgBurstDuration: number;
//     frequencyJumps: {
//       count: number;
//       densityPerSecond: number;
//       minMagnitude: number;
//       maxMagnitude: number;
//       avgMagnitude: number;
//       magnitudes: number[];
//     };
//     volumeTrend: string;
//     frequencyTrend: string;
//     longTermStability: string;
//     periodicity: string;
//     envelopeShape: string;
//     peakToAverageRatio: number;
//   };
  
//   // Рекомендации для паттерна
//   recommendations: {
//     thresholds: {
//       centroid: { min: number; max: number };
//       flux: { min: number; max: number };
//       rms: { min: number; max: number };
//     };
//     temporalPatterns: any;
//   };
  
//   // Первые N фреймов для отладки
//   sampleFrames: Array<{
//     index: number;
//     timestamp: number;
//     rawCentroid: number;
//     rawFlux: number;
//     rawRms: number;
//     normCentroid: number;
//     normFlux: number;
//     normRms: number;
//     isActive: boolean;
//   }>;
  
//   timestamp: number;
// }

// export class AudioAnalysisReportGenerator {
  
//   static generateReport(
//     file: File,
//     analysisConfig: any,
//     rawFrames: any[],
//     normalizedFrames: any[],
//     statistics: any,
//     temporalPatterns: any,
//     recommendations: any,
//     duration: number,
//     sampleRate: number
//   ): AudioAnalysisReport {

//     if (statistics) {
//         // proccess statistics here 
//     }
    
//     // Берем первые 20 фреймов для отладки
//     const sampleCount = Math.min(20, rawFrames.length);
//     const sampleFrames = [];
    
//     for (let i = 0; i < sampleCount; i++) {
//       sampleFrames.push({
//         index: i,
//         timestamp: rawFrames[i].timestamp,
//         rawCentroid: rawFrames[i].centroid,
//         rawFlux: rawFrames[i].flux,
//         rawRms: rawFrames[i].rms,
//         normCentroid: normalizedFrames[i].centroid,
//         normFlux: normalizedFrames[i].flux,
//         normRms: normalizedFrames[i].rms,
//         isActive: normalizedFrames[i].isActive
//       });
//     }
    
//     return {
//       fileInfo: {
//         name: file.name,
//         size: file.size,
//         duration,
//         sampleRate,
//         channels: 1 // mono
//       },
//       analysisConfig: {
//         intervalMs: analysisConfig.intervalMs,
//         fftSize: analysisConfig.fftSize,
//         smoothingTimeConstant: analysisConfig.smoothingTimeConstant,
//         totalFrames: rawFrames.length
//       },
//       rawData: {
//         centroid: {
//           values: rawFrames.map(f => f.centroid),
//           min: Math.min(...rawFrames.map(f => f.centroid)),
//           max: Math.max(...rawFrames.map(f => f.centroid)),
//           mean: this.calculateMean(rawFrames.map(f => f.centroid)),
//           std: this.calculateStdDev(rawFrames.map(f => f.centroid))
//         },
//         flux: {
//           values: rawFrames.map(f => f.flux),
//           min: Math.min(...rawFrames.map(f => f.flux)),
//           max: Math.max(...rawFrames.map(f => f.flux)),
//           mean: this.calculateMean(rawFrames.map(f => f.flux)),
//           std: this.calculateStdDev(rawFrames.map(f => f.flux))
//         },
//         rms: {
//           values: rawFrames.map(f => f.rms),
//           min: Math.min(...rawFrames.map(f => f.rms)),
//           max: Math.max(...rawFrames.map(f => f.rms)),
//           mean: this.calculateMean(rawFrames.map(f => f.rms)),
//           std: this.calculateStdDev(rawFrames.map(f => f.rms))
//         }
//       },
//       normalizedData: {
//         centroid: {
//           values: normalizedFrames.map(f => f.centroid),
//           min: Math.min(...normalizedFrames.map(f => f.centroid)),
//           max: Math.max(...normalizedFrames.map(f => f.centroid)),
//           mean: this.calculateMean(normalizedFrames.map(f => f.centroid)),
//           std: this.calculateStdDev(normalizedFrames.map(f => f.centroid)),
//           targetRange: { min: 0, max: 5000 }
//         },
//         flux: {
//           values: normalizedFrames.map(f => f.flux),
//           min: Math.min(...normalizedFrames.map(f => f.flux)),
//           max: Math.max(...normalizedFrames.map(f => f.flux)),
//           mean: this.calculateMean(normalizedFrames.map(f => f.flux)),
//           std: this.calculateStdDev(normalizedFrames.map(f => f.flux)),
//           targetRange: { min: 0, max: 2.0 }
//         },
//         rms: {
//           values: normalizedFrames.map(f => f.rms),
//           min: Math.min(...normalizedFrames.map(f => f.rms)),
//           max: Math.max(...normalizedFrames.map(f => f.rms)),
//           mean: this.calculateMean(normalizedFrames.map(f => f.rms)),
//           std: this.calculateStdDev(normalizedFrames.map(f => f.rms)),
//           targetRange: { min: 0, max: 0.5 }
//         }
//       },
//       temporalPatterns: {
//         centroidStd: temporalPatterns.centroidStd,
//         fluxStd: temporalPatterns.fluxStd,
//         rmsStd: temporalPatterns.rmsStd,
//         activityRatio: temporalPatterns.activityRatio,
//         avgSilenceDuration: temporalPatterns.avgSilenceDuration,
//         avgBurstDuration: temporalPatterns.avgBurstDuration,
//         frequencyJumps: {
//           count: temporalPatterns.frequencyJumps?.actualJumps || 0,
//           densityPerSecond: temporalPatterns.frequencyJumps?.densityPerSecond || 0,
//           minMagnitude: temporalPatterns.frequencyJumps?.magnitudeRange?.min || 0,
//           maxMagnitude: temporalPatterns.frequencyJumps?.magnitudeRange?.max || 0,
//           avgMagnitude: temporalPatterns.frequencyJumps?.magnitudeRange?.avg || 0,
//           magnitudes: temporalPatterns.frequencyJumps?.magnitudes || []
//         },
//         volumeTrend: temporalPatterns.volumeTrend,
//         frequencyTrend: temporalPatterns.frequencyTrend,
//         longTermStability: temporalPatterns.longTermStability,
//         periodicity: temporalPatterns.periodicity,
//         envelopeShape: temporalPatterns.envelopeShape,
//         peakToAverageRatio: temporalPatterns.peakToAverageRatio
//       },
//       recommendations,
//       sampleFrames,
//       timestamp: Date.now()
//     };
//   }
  
//   static exportToText(report: AudioAnalysisReport): string {
//     let output = '';
    
//     output += '='.repeat(80) + '\n';
//     output += 'АУДИО АНАЛИЗ ОТЧЕТ\n';
//     output += '='.repeat(80) + '\n\n';
    
//     output += `Дата: ${new Date(report.timestamp).toLocaleString()}\n`;
//     output += `Файл: ${report.fileInfo.name}\n`;
//     output += `Размер: ${(report.fileInfo.size / 1024).toFixed(2)} KB\n`;
//     output += `Длительность: ${report.fileInfo.duration.toFixed(2)} сек\n`;
//     output += `Частота: ${report.fileInfo.sampleRate} Hz\n\n`;
    
//     output += '-'.repeat(80) + '\n';
//     output += 'ПАРАМЕТРЫ АНАЛИЗА\n';
//     output += '-'.repeat(80) + '\n';
//     output += `Интервал: ${report.analysisConfig.intervalMs} мс\n`;
//     output += `Всего фреймов: ${report.analysisConfig.totalFrames}\n`;
//     output += `FFT размер: ${report.analysisConfig.fftSize}\n\n`;
    
//     output += '-'.repeat(80) + '\n';
//     output += 'СЫРЫЕ ДАННЫЕ (ДО НОРМАЛИЗАЦИИ)\n';
//     output += '-'.repeat(80) + '\n';
//     output += `Centroid: min=${report.rawData.centroid.min.toFixed(2)} max=${report.rawData.centroid.max.toFixed(2)} mean=${report.rawData.centroid.mean.toFixed(2)} std=${report.rawData.centroid.std.toFixed(2)}\n`;
//     output += `Flux:     min=${report.rawData.flux.min.toFixed(4)} max=${report.rawData.flux.max.toFixed(4)} mean=${report.rawData.flux.mean.toFixed(4)} std=${report.rawData.flux.std.toFixed(4)}\n`;
//     output += `RMS:      min=${report.rawData.rms.min.toFixed(4)} max=${report.rawData.rms.max.toFixed(4)} mean=${report.rawData.rms.mean.toFixed(4)} std=${report.rawData.rms.std.toFixed(4)}\n\n`;
    
//     output += '-'.repeat(80) + '\n';
//     output += 'НОРМАЛИЗОВАННЫЕ ДАННЫЕ\n';
//     output += '-'.repeat(80) + '\n';
//     output += `Centroid: target=[${report.normalizedData.centroid.targetRange.min}-${report.normalizedData.centroid.targetRange.max}] actual=[${report.normalizedData.centroid.min.toFixed(2)}-${report.normalizedData.centroid.max.toFixed(2)}] mean=${report.normalizedData.centroid.mean.toFixed(2)}\n`;
//     output += `Flux:     target=[${report.normalizedData.flux.targetRange.min}-${report.normalizedData.flux.targetRange.max}] actual=[${report.normalizedData.flux.min.toFixed(4)}-${report.normalizedData.flux.max.toFixed(4)}] mean=${report.normalizedData.flux.mean.toFixed(4)}\n`;
//     output += `RMS:      target=[${report.normalizedData.rms.targetRange.min}-${report.normalizedData.rms.targetRange.max}] actual=[${report.normalizedData.rms.min.toFixed(4)}-${report.normalizedData.rms.max.toFixed(4)}] mean=${report.normalizedData.rms.mean.toFixed(4)}\n\n`;
    
//     output += '-'.repeat(80) + '\n';
//     output += 'ВРЕМЕННЫЕ ПАТТЕРНЫ\n';
//     output += '-'.repeat(80) + '\n';
//     output += `Активность: ${(report.temporalPatterns.activityRatio * 100).toFixed(1)}%\n`;
//     output += `Средняя пауза: ${report.temporalPatterns.avgSilenceDuration.toFixed(3)} сек\n`;
//     output += `Средний всплеск: ${report.temporalPatterns.avgBurstDuration.toFixed(3)} сек\n`;
//     output += `Частотные скачки: ${report.temporalPatterns.frequencyJumps.count} (${report.temporalPatterns.frequencyJumps.densityPerSecond.toFixed(2)}/сек)\n`;
//     output += `  - Амплитуда: min=${report.temporalPatterns.frequencyJumps.minMagnitude.toFixed(2)} max=${report.temporalPatterns.frequencyJumps.maxMagnitude.toFixed(2)} avg=${report.temporalPatterns.frequencyJumps.avgMagnitude.toFixed(2)}\n`;
//     output += `Тренд громкости: ${report.temporalPatterns.volumeTrend}\n`;
//     output += `Тренд частоты: ${report.temporalPatterns.frequencyTrend}\n`;
//     output += `Стабильность: ${report.temporalPatterns.longTermStability}\n`;
//     output += `Периодичность: ${report.temporalPatterns.periodicity}\n`;
//     output += `Форма огибающей: ${report.temporalPatterns.envelopeShape}\n`;
//     output += `Пик/среднее: ${report.temporalPatterns.peakToAverageRatio.toFixed(2)}\n\n`;
    
//     output += '-'.repeat(80) + '\n';
//     output += 'ПЕРВЫЕ 20 ФРЕЙМОВ\n';
//     output += '-'.repeat(80) + '\n';
//     output += `# | Время | Raw Cent | Raw Flux | Raw RMS | Norm Cent | Norm Flux | Norm RMS | Active\n`;
//     output += '-'.repeat(80) + '\n';
    
//     for (const frame of report.sampleFrames) {
//       output += `${frame.index.toString().padStart(2)} | ${frame.timestamp.toFixed(2)}s | `;
//       output += `${frame.rawCentroid.toFixed(0).padStart(7)} | `;
//       output += `${frame.rawFlux.toFixed(3).padStart(8)} | `;
//       output += `${frame.rawRms.toFixed(4).padStart(7)} | `;
//       output += `${frame.normCentroid.toFixed(0).padStart(8)} | `;
//       output += `${frame.normFlux.toFixed(3).padStart(8)} | `;
//       output += `${frame.normRms.toFixed(4).padStart(7)} | `;
//       output += `${frame.isActive ? 'YES' : 'NO'}\n`;
//     }
//     output += '\n';
    
//     output += '-'.repeat(80) + '\n';
//     output += 'РЕКОМЕНДАЦИИ ДЛЯ ПАТТЕРНА\n';
//     output += '-'.repeat(80) + '\n';
//     output += `Centroid: [${report.recommendations.thresholds.centroid.min.toFixed(0)} - ${report.recommendations.thresholds.centroid.max.toFixed(0)}]\n`;
//     output += `Flux: [${report.recommendations.thresholds.flux.min.toFixed(3)} - ${report.recommendations.thresholds.flux.max.toFixed(3)}]\n`;
//     output += `RMS: [${report.recommendations.thresholds.rms.min.toFixed(4)} - ${report.recommendations.thresholds.rms.max.toFixed(4)}]\n`;
//     output += `Тренд громкости: ${report.recommendations.temporalPatterns.volumeTrend.join(', ')}\n`;
//     output += `Тренд частоты: ${report.recommendations.temporalPatterns.frequencyTrend.join(', ')}\n`;
//     output += `Стабильность: ${report.recommendations.temporalPatterns.longTermStability.join(', ')}\n`;
//     output += `Периодичность: ${report.recommendations.temporalPatterns.periodicity.join(', ')}\n`;
//     output += `Форма огибающей: ${report.recommendations.temporalPatterns.envelopeShape.join(', ')}\n`;
    
//     output += '\n' + '='.repeat(80) + '\n';
//     output += 'КОНЕЦ ОТЧЕТА\n';
//     output += '='.repeat(80) + '\n';
    
//     return output;
//   }
  
//   static exportToJson(report: AudioAnalysisReport): string {
//     return JSON.stringify(report, null, 2);
//   }
  
//   private static calculateMean(values: number[]): number {
//     if (values.length === 0) return 0;
//     return values.reduce((a, b) => a + b, 0) / values.length;
//   }
  
//   private static calculateStdDev(values: number[]): number {
//     const mean = this.calculateMean(values);
//     const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
//     return Math.sqrt(this.calculateMean(squaredDiffs));
//   }
// }

