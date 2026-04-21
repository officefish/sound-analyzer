// src/services/AudioAnalysisReport.ts

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
    centroid: {
      values: number[];
      min: number;
      max: number;
      mean: number;
      std: number;
    };
    flux: {
      values: number[];
      min: number;
      max: number;
      mean: number;
      std: number;
    };
    rms: {
      values: number[];
      min: number;
      max: number;
      mean: number;
      std: number;
    };
  };
  
  // Нормализованные данные
  normalizedData: {
    centroid: {
      values: number[];
      min: number;
      max: number;
      mean: number;
      std: number;
      targetRange: { min: number; max: number };
    };
    flux: {
      values: number[];
      min: number;
      max: number;
      mean: number;
      std: number;
      targetRange: { min: number; max: number };
    };
    rms: {
      values: number[];
      min: number;
      max: number;
      mean: number;
      std: number;
      targetRange: { min: number; max: number };
    };
  };
  
  // Временные паттерны
  temporalPatterns: {
    centroidStd: number;
    fluxStd: number;
    rmsStd: number;
    activityRatio: number;
    avgSilenceDuration: number;
    avgBurstDuration: number;
    frequencyJumps: {
      count: number;
      densityPerSecond: number;
      minMagnitude: number;
      maxMagnitude: number;
      avgMagnitude: number;
      magnitudes: number[];
    };
    volumeTrend: string;
    frequencyTrend: string;
    longTermStability: string;
    periodicity: string;
    envelopeShape: string;
    peakToAverageRatio: number;
  };
  
  // Рекомендации для паттерна
  recommendations: {
    thresholds: {
      centroid: { min: number; max: number };
      flux: { min: number; max: number };
      rms: { min: number; max: number };
    };
    temporalPatterns: any;
  };
  
  // Первые N фреймов для отладки
  sampleFrames: Array<{
    index: number;
    timestamp: number;
    rawCentroid: number;
    rawFlux: number;
    rawRms: number;
    normCentroid: number;
    normFlux: number;
    normRms: number;
    isActive: boolean;
  }>;
  
  timestamp: number;
}

export class AudioAnalysisReportGenerator {
  
  static generateReport(
    file: File,
    analysisConfig: any,
    rawFrames: any[],
    normalizedFrames: any[],
    statistics: any,
    temporalPatterns: any,
    recommendations: any,
    duration: number,
    sampleRate: number
  ): AudioAnalysisReport {

    if (statistics) {
        // proccess statistics here 
    }
    
    // Берем первые 20 фреймов для отладки
    const sampleCount = Math.min(20, rawFrames.length);
    const sampleFrames = [];
    
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
    
    return {
      fileInfo: {
        name: file.name,
        size: file.size,
        duration,
        sampleRate,
        channels: 1 // mono
      },
      analysisConfig: {
        intervalMs: analysisConfig.intervalMs,
        fftSize: analysisConfig.fftSize,
        smoothingTimeConstant: analysisConfig.smoothingTimeConstant,
        totalFrames: rawFrames.length
      },
      rawData: {
        centroid: {
          values: rawFrames.map(f => f.centroid),
          min: Math.min(...rawFrames.map(f => f.centroid)),
          max: Math.max(...rawFrames.map(f => f.centroid)),
          mean: this.calculateMean(rawFrames.map(f => f.centroid)),
          std: this.calculateStdDev(rawFrames.map(f => f.centroid))
        },
        flux: {
          values: rawFrames.map(f => f.flux),
          min: Math.min(...rawFrames.map(f => f.flux)),
          max: Math.max(...rawFrames.map(f => f.flux)),
          mean: this.calculateMean(rawFrames.map(f => f.flux)),
          std: this.calculateStdDev(rawFrames.map(f => f.flux))
        },
        rms: {
          values: rawFrames.map(f => f.rms),
          min: Math.min(...rawFrames.map(f => f.rms)),
          max: Math.max(...rawFrames.map(f => f.rms)),
          mean: this.calculateMean(rawFrames.map(f => f.rms)),
          std: this.calculateStdDev(rawFrames.map(f => f.rms))
        }
      },
      normalizedData: {
        centroid: {
          values: normalizedFrames.map(f => f.centroid),
          min: Math.min(...normalizedFrames.map(f => f.centroid)),
          max: Math.max(...normalizedFrames.map(f => f.centroid)),
          mean: this.calculateMean(normalizedFrames.map(f => f.centroid)),
          std: this.calculateStdDev(normalizedFrames.map(f => f.centroid)),
          targetRange: { min: 0, max: 5000 }
        },
        flux: {
          values: normalizedFrames.map(f => f.flux),
          min: Math.min(...normalizedFrames.map(f => f.flux)),
          max: Math.max(...normalizedFrames.map(f => f.flux)),
          mean: this.calculateMean(normalizedFrames.map(f => f.flux)),
          std: this.calculateStdDev(normalizedFrames.map(f => f.flux)),
          targetRange: { min: 0, max: 2.0 }
        },
        rms: {
          values: normalizedFrames.map(f => f.rms),
          min: Math.min(...normalizedFrames.map(f => f.rms)),
          max: Math.max(...normalizedFrames.map(f => f.rms)),
          mean: this.calculateMean(normalizedFrames.map(f => f.rms)),
          std: this.calculateStdDev(normalizedFrames.map(f => f.rms)),
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
      timestamp: Date.now()
    };
  }
  
  static exportToText(report: AudioAnalysisReport): string {
    let output = '';
    
    output += '='.repeat(80) + '\n';
    output += 'АУДИО АНАЛИЗ ОТЧЕТ\n';
    output += '='.repeat(80) + '\n\n';
    
    output += `Дата: ${new Date(report.timestamp).toLocaleString()}\n`;
    output += `Файл: ${report.fileInfo.name}\n`;
    output += `Размер: ${(report.fileInfo.size / 1024).toFixed(2)} KB\n`;
    output += `Длительность: ${report.fileInfo.duration.toFixed(2)} сек\n`;
    output += `Частота: ${report.fileInfo.sampleRate} Hz\n\n`;
    
    output += '-'.repeat(80) + '\n';
    output += 'ПАРАМЕТРЫ АНАЛИЗА\n';
    output += '-'.repeat(80) + '\n';
    output += `Интервал: ${report.analysisConfig.intervalMs} мс\n`;
    output += `Всего фреймов: ${report.analysisConfig.totalFrames}\n`;
    output += `FFT размер: ${report.analysisConfig.fftSize}\n\n`;
    
    output += '-'.repeat(80) + '\n';
    output += 'СЫРЫЕ ДАННЫЕ (ДО НОРМАЛИЗАЦИИ)\n';
    output += '-'.repeat(80) + '\n';
    output += `Centroid: min=${report.rawData.centroid.min.toFixed(2)} max=${report.rawData.centroid.max.toFixed(2)} mean=${report.rawData.centroid.mean.toFixed(2)} std=${report.rawData.centroid.std.toFixed(2)}\n`;
    output += `Flux:     min=${report.rawData.flux.min.toFixed(4)} max=${report.rawData.flux.max.toFixed(4)} mean=${report.rawData.flux.mean.toFixed(4)} std=${report.rawData.flux.std.toFixed(4)}\n`;
    output += `RMS:      min=${report.rawData.rms.min.toFixed(4)} max=${report.rawData.rms.max.toFixed(4)} mean=${report.rawData.rms.mean.toFixed(4)} std=${report.rawData.rms.std.toFixed(4)}\n\n`;
    
    output += '-'.repeat(80) + '\n';
    output += 'НОРМАЛИЗОВАННЫЕ ДАННЫЕ\n';
    output += '-'.repeat(80) + '\n';
    output += `Centroid: target=[${report.normalizedData.centroid.targetRange.min}-${report.normalizedData.centroid.targetRange.max}] actual=[${report.normalizedData.centroid.min.toFixed(2)}-${report.normalizedData.centroid.max.toFixed(2)}] mean=${report.normalizedData.centroid.mean.toFixed(2)}\n`;
    output += `Flux:     target=[${report.normalizedData.flux.targetRange.min}-${report.normalizedData.flux.targetRange.max}] actual=[${report.normalizedData.flux.min.toFixed(4)}-${report.normalizedData.flux.max.toFixed(4)}] mean=${report.normalizedData.flux.mean.toFixed(4)}\n`;
    output += `RMS:      target=[${report.normalizedData.rms.targetRange.min}-${report.normalizedData.rms.targetRange.max}] actual=[${report.normalizedData.rms.min.toFixed(4)}-${report.normalizedData.rms.max.toFixed(4)}] mean=${report.normalizedData.rms.mean.toFixed(4)}\n\n`;
    
    output += '-'.repeat(80) + '\n';
    output += 'ВРЕМЕННЫЕ ПАТТЕРНЫ\n';
    output += '-'.repeat(80) + '\n';
    output += `Активность: ${(report.temporalPatterns.activityRatio * 100).toFixed(1)}%\n`;
    output += `Средняя пауза: ${report.temporalPatterns.avgSilenceDuration.toFixed(3)} сек\n`;
    output += `Средний всплеск: ${report.temporalPatterns.avgBurstDuration.toFixed(3)} сек\n`;
    output += `Частотные скачки: ${report.temporalPatterns.frequencyJumps.count} (${report.temporalPatterns.frequencyJumps.densityPerSecond.toFixed(2)}/сек)\n`;
    output += `  - Амплитуда: min=${report.temporalPatterns.frequencyJumps.minMagnitude.toFixed(2)} max=${report.temporalPatterns.frequencyJumps.maxMagnitude.toFixed(2)} avg=${report.temporalPatterns.frequencyJumps.avgMagnitude.toFixed(2)}\n`;
    output += `Тренд громкости: ${report.temporalPatterns.volumeTrend}\n`;
    output += `Тренд частоты: ${report.temporalPatterns.frequencyTrend}\n`;
    output += `Стабильность: ${report.temporalPatterns.longTermStability}\n`;
    output += `Периодичность: ${report.temporalPatterns.periodicity}\n`;
    output += `Форма огибающей: ${report.temporalPatterns.envelopeShape}\n`;
    output += `Пик/среднее: ${report.temporalPatterns.peakToAverageRatio.toFixed(2)}\n\n`;
    
    output += '-'.repeat(80) + '\n';
    output += 'ПЕРВЫЕ 20 ФРЕЙМОВ\n';
    output += '-'.repeat(80) + '\n';
    output += `# | Время | Raw Cent | Raw Flux | Raw RMS | Norm Cent | Norm Flux | Norm RMS | Active\n`;
    output += '-'.repeat(80) + '\n';
    
    for (const frame of report.sampleFrames) {
      output += `${frame.index.toString().padStart(2)} | ${frame.timestamp.toFixed(2)}s | `;
      output += `${frame.rawCentroid.toFixed(0).padStart(7)} | `;
      output += `${frame.rawFlux.toFixed(3).padStart(8)} | `;
      output += `${frame.rawRms.toFixed(4).padStart(7)} | `;
      output += `${frame.normCentroid.toFixed(0).padStart(8)} | `;
      output += `${frame.normFlux.toFixed(3).padStart(8)} | `;
      output += `${frame.normRms.toFixed(4).padStart(7)} | `;
      output += `${frame.isActive ? 'YES' : 'NO'}\n`;
    }
    output += '\n';
    
    output += '-'.repeat(80) + '\n';
    output += 'РЕКОМЕНДАЦИИ ДЛЯ ПАТТЕРНА\n';
    output += '-'.repeat(80) + '\n';
    output += `Centroid: [${report.recommendations.thresholds.centroid.min.toFixed(0)} - ${report.recommendations.thresholds.centroid.max.toFixed(0)}]\n`;
    output += `Flux: [${report.recommendations.thresholds.flux.min.toFixed(3)} - ${report.recommendations.thresholds.flux.max.toFixed(3)}]\n`;
    output += `RMS: [${report.recommendations.thresholds.rms.min.toFixed(4)} - ${report.recommendations.thresholds.rms.max.toFixed(4)}]\n`;
    output += `Тренд громкости: ${report.recommendations.temporalPatterns.volumeTrend.join(', ')}\n`;
    output += `Тренд частоты: ${report.recommendations.temporalPatterns.frequencyTrend.join(', ')}\n`;
    output += `Стабильность: ${report.recommendations.temporalPatterns.longTermStability.join(', ')}\n`;
    output += `Периодичность: ${report.recommendations.temporalPatterns.periodicity.join(', ')}\n`;
    output += `Форма огибающей: ${report.recommendations.temporalPatterns.envelopeShape.join(', ')}\n`;
    
    output += '\n' + '='.repeat(80) + '\n';
    output += 'КОНЕЦ ОТЧЕТА\n';
    output += '='.repeat(80) + '\n';
    
    return output;
  }
  
  static exportToJson(report: AudioAnalysisReport): string {
    return JSON.stringify(report, null, 2);
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
}

