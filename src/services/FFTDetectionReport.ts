// src/services/FFTDetectionReport.ts

import { DetectionResult } from './FFTDroneDetectorService';
import { useTelemetryStore } from '../store/telemetry.store';

export interface AnalysisReport {
  id: string;
  timestamp: number;
  detectionNumber: number;
  strictness: string;
  samplesCount: number;
  validSamples: number;
  isDrone: boolean;
  method: string;
  intervalMs: number;
  totalAnalysisTimeMs: number;
  parameters: {
    centerOfMass: {
      threshold: [number, number];
    };
    spectralFlux: {
      threshold: [number, number];
    };
    loudness: {
      threshold: [number, number];
    };
  };
  tactData: Array<{
    tact: number;
    centerOfMass: number;
    spectralFlux: number;
    loudness: number;
    centerOfMassDetected: boolean;
    spectralFluxDetected: boolean;
    loudnessDetected: boolean;
    overallDetected: boolean;
  }>;
  summary: {
    totalDetections: number;
    detectionRate: string;
    centerOfMassDetectionRate: string;
    spectralFluxDetectionRate: string;
    loudnessDetectionRate: string;
  };
  averages: {
    centerOfMass: number;
    spectralFlux: number;
    loudness: number;
  };
  tags: string[];
}

class FFTDetectionReport {
  private moduleId: string | null = null;
  private moduleName: string = 'FFTDetector';
  
  setModuleId(id: string): void {
    this.moduleId = id;
  }
  
  private isInThreshold(value: number, threshold: [number, number]): boolean {
    return value >= threshold[0] && value <= threshold[1];
  }
  
  private getMethodDescription(strictness: string, samplesCount: number, requiredValid: number): string {
    return `Частотный анализ (${samplesCount} тактов, средний (${requiredValid}/${samplesCount} параметра)), по параметрам: центр масс, спектральный поток, громкость. Уровень строгости: ${strictness}`;
  }
  
  public async generateReport(
    detectionNumber: number,
    result: DetectionResult,
    thresholds: {
      centerOfMass: [number, number];
      spectralFlux: [number, number];
      loudness: [number, number];
    },
    intervalMs: number = 500
  ): Promise<AnalysisReport> {
    // Формируем данные по тактам
    const tactData = result.samples.map((sample, idx) => {
      const cmValue = sample.details.centroidValue;
      const sfValue = sample.details.fluxValue;
      const loudValue = sample.details.rmsValue;
      
      return {
        tact: idx + 1,
        centerOfMass: cmValue,
        spectralFlux: sfValue,
        loudness: loudValue,
        centerOfMassDetected: this.isInThreshold(cmValue, thresholds.centerOfMass),
        spectralFluxDetected: this.isInThreshold(sfValue, thresholds.spectralFlux),
        loudnessDetected: this.isInThreshold(loudValue, thresholds.loudness),
        overallDetected: this.isInThreshold(cmValue, thresholds.centerOfMass) &&
                        this.isInThreshold(sfValue, thresholds.spectralFlux) &&
                        this.isInThreshold(loudValue, thresholds.loudness)
      };
    });
    
    // Подсчёт статистики обнаружений
    const totalDetections = tactData.filter(t => t.overallDetected).length;
    const cmDetections = tactData.filter(t => t.centerOfMassDetected).length;
    const sfDetections = tactData.filter(t => t.spectralFluxDetected).length;
    const loudDetections = tactData.filter(t => t.loudnessDetected).length;
    const totalTacts = tactData.length;
    
    // ✅ Вычисляем средние значения параметров
    const avgCenterOfMass = totalTacts > 0
      ? tactData.reduce((sum, t) => sum + t.centerOfMass, 0) / totalTacts
      : 0;
    const avgSpectralFlux = totalTacts > 0
      ? tactData.reduce((sum, t) => sum + t.spectralFlux, 0) / totalTacts
      : 0;
    const avgLoudness = totalTacts > 0
      ? tactData.reduce((sum, t) => sum + t.loudness, 0) / totalTacts
      : 0;
    
    const totalAnalysisTimeMs = intervalMs * result.samplesCount;
    
    // ✅ Формируем теги
    const tags = [
      'analysis',
      'fft',
      result.strictness,
      result.isDrone ? 'drone' : 'calm'
    ];
    
    const report: AnalysisReport = {
      id: `${Date.now()}_${detectionNumber}`,
      timestamp: result.timestamp,
      detectionNumber,
      strictness: result.strictness,
      samplesCount: result.samplesCount,
      validSamples: result.validSamples,
      isDrone: result.isDrone,
      method: this.getMethodDescription(result.strictness, result.samplesCount, result.requiredValid),
      intervalMs,
      totalAnalysisTimeMs,
      parameters: {
        centerOfMass: { threshold: thresholds.centerOfMass },
        spectralFlux: { threshold: thresholds.spectralFlux },
        loudness: { threshold: thresholds.loudness }
      },
      tactData,
      summary: {
        totalDetections,
        detectionRate: `${Math.round((totalDetections / totalTacts) * 100)}%`,
        centerOfMassDetectionRate: `${Math.round((cmDetections / totalTacts) * 100)}%`,
        spectralFluxDetectionRate: `${Math.round((sfDetections / totalTacts) * 100)}%`,
        loudnessDetectionRate: `${Math.round((loudDetections / totalTacts) * 100)}%`
      },
      // ✅ Добавляем средние значения
      averages: {
        centerOfMass: avgCenterOfMass,
        spectralFlux: avgSpectralFlux,
        loudness: avgLoudness
      },
      tags
    };
    
    // Отправляем в телеметрию
    await this.sendToTelemetry(report);
    
    // Выводим в консоль
    this.printToConsole(report);
    
    return report;
  }
  
  private async sendToTelemetry(report: AnalysisReport): Promise<void> {
    if (!this.moduleId) return;
    
    const telemetryStore = useTelemetryStore.getState();
    
    telemetryStore.addEntry({
      type: 'analysis',
      moduleId: this.moduleId,
      moduleName: this.moduleName,
      data: {
        detectionNumber: report.detectionNumber,
        strictness: report.strictness,
        samplesCount: report.samplesCount,
        validSamples: report.validSamples,
        isDrone: report.isDrone,
        method: report.method,
        timestamp: report.timestamp,
        intervalMs: report.intervalMs,
        totalAnalysisTimeMs: report.totalAnalysisTimeMs,
        parameters: report.parameters,
        tactData: report.tactData,
        summary: report.summary,
        averages: report.averages,        // ✅ Добавляем средние значения
        tags: report.tags,                // ✅ Добавляем теги
      },
      tags: report.tags,                  // ✅ Используем теги из отчёта
    });
  }
  
  private printToConsole(report: AnalysisReport): void {
    const status = report.isDrone ? '🚁 DRONE DETECTED' : '❌ NO DRONE';
    const statusIcon = report.isDrone ? '🔴' : '⚪';
    const totalTimeSec = (report.totalAnalysisTimeMs / 1000).toFixed(1);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${statusIcon} [FFTDetector] ANALYSIS REPORT ${statusIcon}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`  Detection #${report.detectionNumber} | Strictness: ${report.strictness} | Result: ${status}`);
    console.log(`  Samples: ${report.validSamples}/${report.samplesCount} valid`);
    console.log(`  Interval: ${report.intervalMs}ms | Total analysis time: ${totalTimeSec}s`);
    console.log(`  Timestamp: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`\n  📊 AVERAGE VALUES:`);
    console.log(`    Center of Mass: ${report.averages.centerOfMass.toFixed(1)} Hz`);
    console.log(`    Spectral Flux: ${report.averages.spectralFlux.toFixed(3)}`);
    console.log(`    Loudness: ${report.averages.loudness.toFixed(3)}`);
    console.log(`\n  📊 PARAMETERS:`);
    console.log(`    Center of Mass threshold: [${report.parameters.centerOfMass.threshold[0]}-${report.parameters.centerOfMass.threshold[1]} Hz]`);
    console.log(`    Spectral Flux threshold: [${report.parameters.spectralFlux.threshold[0]}-${report.parameters.spectralFlux.threshold[1]}]`);
    console.log(`    Loudness threshold: [${report.parameters.loudness.threshold[0]}-${report.parameters.loudness.threshold[1]}]`);
    console.log(`\n  📋 TACT DATA:`);
    report.tactData.forEach(tact => {
      const tactStatus = tact.overallDetected ? '✅ DRONE' : '❌ NORMAL';
      console.log(`    Tact ${tact.tact}: CM=${tact.centerOfMass.toFixed(1)}Hz, SF=${tact.spectralFlux.toFixed(3)}, L=${tact.loudness.toFixed(3)} | ${tactStatus}`);
    });
    console.log(`\n  📈 SUMMARY:`);
    console.log(`    Total detections: ${report.summary.totalDetections}/${report.tactData.length} (${report.summary.detectionRate})`);
    console.log(`    Center of Mass detection rate: ${report.summary.centerOfMassDetectionRate}`);
    console.log(`    Spectral Flux detection rate: ${report.summary.spectralFluxDetectionRate}`);
    console.log(`    Loudness detection rate: ${report.summary.loudnessDetectionRate}`);
    console.log(`\n  🏷️ TAGS: ${report.tags.join(', ')}`);
    console.log(`${'='.repeat(80)}\n`);
  }
}

export const fftDetectionReport = new FFTDetectionReport();