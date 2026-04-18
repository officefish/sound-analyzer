// src/services/TrendsDetectionReport.ts

import { TrendsAnalysisReport, TrendsDetectionResult, ScoreItem } from "../modules/Microphone/plugins/trendsFFT/types";
import { useTelemetryStore } from '../store/telemetry.store';

import { getSoundStateByKey } from "../modules/Microphone/plugins/trendsFFT/soundStateUtils";

interface AlternativeState {
  state: string;
  stateName: string;
  score: number;
}

// src/services/TrendsDetectionReport.ts


// Интерфейс для данных трендов
interface TrendData {
  statistics: {
    centroidStd: number;
    fluxStd: number;
    rmsStd: number;
    centroidMin: number;
    centroidMax: number;
    fluxMin: number;
    fluxMax: number;
    rmsMin: number;
    rmsMax: number;
  };
  activity: {
    activityRatio: number;
    avgSilenceDuration: number;
    avgBurstDuration: number;
  };
  frequencyJumps: {
    enabled: boolean;
    actualJumps: number;
    densityPerSecond: number;
    avgMagnitude: number;
    minMagnitude: number;
    maxMagnitude: number;
  };
  trends: {
    volumeTrend: string;
    frequencyTrend: string;
  };
  stability: {
    longTermStability: string;
    periodicity: string;
    stabilityScore: number;
  };
  envelope: {
    shape: string;
    peakToAverageRatio: number;
    attackPattern?: string;
    decayPattern?: string;
  };
}

class TrendsDetectionReportService {
  private moduleId: string | null = null;
  private moduleName: string = 'TrendsFFTDetector';
  private detectionNumber: number = 0;
  
  setModuleId(id: string): void {
    this.moduleId = id;
  }
  
  private getMethodDescription(config: { measurementsCount: number; intervalMs: number; }): string {
    return `Трендовый FFT анализ (${config.measurementsCount} замеров по ${config.intervalMs}мс), анализ спектральных характеристик и временных паттернов.`;
  }
  
  public async generateReport(
    result: TrendsDetectionResult,
    config: {
      intervalMs: number;
      measurementsCount: number;
    },
    reportUniqueId: string // Принимаем ID от плагина
  ): Promise<TrendsAnalysisReport | null> {
    this.detectionNumber++;
    
    console.log(`[TrendsDetectionReport] Generating report with provided ID: ${reportUniqueId}`);
    
    // Извлекаем данные о трендах из анализа
    const patterns = result.analysis?.patterns || {};
    const spectral = result.analysis?.spectral || {};
    
    // Получаем все значения для вычисления min/max
    const centroidValues = result.samples.map(s => s.centroid);
    const fluxValues = result.samples.map(s => s.flux);
    const rmsValues = result.samples.map(s => s.rms);
    
    // Формируем детальные данные о трендах с min/max
    const trendData: TrendData = {
      statistics: {
        centroidStd: patterns.centroidStd || 0,
        fluxStd: patterns.fluxStd || 0,
        rmsStd: patterns.rmsStd || 0,
        centroidMin: Math.min(...centroidValues),
        centroidMax: Math.max(...centroidValues),
        fluxMin: Math.min(...fluxValues),
        fluxMax: Math.max(...fluxValues),
        rmsMin: Math.min(...rmsValues),
        rmsMax: Math.max(...rmsValues),
      },
      activity: {
        activityRatio: patterns.activityRatio || 0,
        avgSilenceDuration: patterns.avgSilenceDuration || 0,
        avgBurstDuration: patterns.avgBurstDuration || 0,
      },
      frequencyJumps: {
        enabled: patterns.frequencyJumps?.enabled || false,
        actualJumps: patterns.frequencyJumps?.actualJumps || 0,
        densityPerSecond: patterns.frequencyJumps?.densityPerSecond || 0,
        avgMagnitude: patterns.frequencyJumps?.magnitudeRange?.avg || 0,
        minMagnitude: patterns.frequencyJumps?.magnitudeRange?.min || 0,
        maxMagnitude: patterns.frequencyJumps?.magnitudeRange?.max || 0,
      },
      trends: {
        volumeTrend: patterns.volumeTrend || 'unknown',
        frequencyTrend: patterns.frequencyTrend || 'unknown',
      },
      stability: {
        longTermStability: patterns.longTermStability || 'unknown',
        periodicity: patterns.periodicity || 'unknown',
        stabilityScore: Math.max(0, 100 - ((patterns.centroidStd || 0) / 20)),
      },
      envelope: {
        shape: patterns.envelopeShape || 'unknown',
        peakToAverageRatio: patterns.peakToAverageRatio || 0,
        attackPattern: patterns.attackPattern,
        decayPattern: patterns.decayPattern,
      },
    };
    
    // Формируем данные по тактам
    const tactData = result.samples.map((sample, idx) => ({
      tact: idx + 1,
      centroid: sample.centroid,
      flux: sample.flux,
      rms: sample.rms,
    }));
    
    // Формируем оценки по состояниям
    const stateScores: ScoreItem[] = (result.analysis?.scores || []).map((score: any) => {
      const state = getSoundStateByKey(score.state);
      return {
        state: score.state,
        stateName: state?.name || score.state,
        stateIcon: state?.icon || '❓',
        score: score.score,
        spectralScore: score.details?.spectralScore || 0,
        temporalScore: score.details?.temporalScore || 0,
      };
    });
    
    stateScores.sort((a: ScoreItem, b: ScoreItem) => b.score - a.score);
    
    const alternativeStates: AlternativeState[] = stateScores.slice(1, 4).map((s: ScoreItem) => ({
      state: s.state,
      stateName: s.stateName,
      score: s.score,
    }));
    
    const totalAnalysisTimeMs = config.intervalMs * config.measurementsCount;
    
    const tags: string[] = [
      'analysis',
      'trends-fft',
      result.state.toLowerCase(),
      trendData.trends.volumeTrend,
      trendData.stability.periodicity,
    ];
    
    const report: TrendsAnalysisReport = {
      id: reportUniqueId, // Используем ID от плагина
      timestamp: result.timestamp,
      detectionNumber: this.detectionNumber,
      samplesCount: config.measurementsCount,
      validSamples: result.samples.length,
      isDetected: result.isDetected,
      detectedState: result.state,
      detectedStateName: result.stateName,
      detectedStateIcon: result.stateIcon,
      confidence: result.confidence,
      method: this.getMethodDescription(config),
      intervalMs: config.intervalMs,
      totalAnalysisTimeMs,
      parameters: {
        intervalMs: config.intervalMs,
        measurementsCount: config.measurementsCount,
      },
      tactData,
      stateScores,
      summary: {
        primaryState: result.state,
        primaryStateName: result.stateName,
        primaryStateIcon: result.stateIcon,
        confidence: result.confidence,
        alternativeStates,
        stabilityScore: trendData.stability.stabilityScore,
        activityRatio: trendData.activity.activityRatio,
      },
      averages: {
        centroidMin: trendData.statistics.centroidMin,
        centroidMax: trendData.statistics.centroidMax,
        centroidStd: trendData.statistics.centroidStd,
        fluxMin: trendData.statistics.fluxMin,
        fluxMax: trendData.statistics.fluxMax,
        fluxStd: trendData.statistics.fluxStd,
        rmsMin: trendData.statistics.rmsMin,
        rmsMax: trendData.statistics.rmsMax,
        rmsStd: trendData.statistics.rmsStd,
      },
      trends: trendData,
      tags,
    };
    
    await this.sendToTelemetry(report);
    this.printToConsole(report);
    
    return report;
  }
  
  private async sendToTelemetry(report: TrendsAnalysisReport): Promise<void> {
    if (!this.moduleId) {
      console.error('[TrendsDetectionReport] Cannot send to telemetry: moduleId is not set');
      return;
    }
    
    try {
      const telemetryStore = useTelemetryStore.getState();
      
      if (!telemetryStore || typeof telemetryStore.addReportEntry !== 'function') {
        console.error('[TrendsDetectionReport] Telemetry store not available or missing addReportEntry method');
        return;
      }
      
      const entry = {
        type: 'analysis' as const,
        moduleId: this.moduleId,
        moduleName: this.moduleName,
        data: {
          reportUniqueId: report.id, // Уникальный ID от плагина
          id: report.id,
          detectionNumber: report.detectionNumber,
          samplesCount: report.samplesCount,
          validSamples: report.validSamples,
          isDetected: report.isDetected,
          detectedState: report.detectedState,
          detectedStateName: report.detectedStateName,
          confidence: report.confidence,
          method: report.method,
          timestamp: report.timestamp,
          intervalMs: report.intervalMs,
          totalAnalysisTimeMs: report.totalAnalysisTimeMs,
          parameters: report.parameters,
          tactData: report.tactData,
          stateScores: report.stateScores,
          summary: report.summary,
          averages: report.averages,
          trends: report.trends,
          tags: report.tags,
        },
        tags: report.tags,
      };
      
      const entryId = telemetryStore.addReportEntry(entry);
      
      if (entryId) {
        console.log(`[TrendsDetectionReport] ✅ Report ${report.id} added to telemetry store (entry: ${entryId})`);
      } else {
        console.warn(`[TrendsDetectionReport] ⚠️ Report ${report.id} was rejected by telemetry store (duplicate detected)`);
      }
      
    } catch (error) {
      console.error('[TrendsDetectionReport] Error sending to telemetry:', error);
    }
  }
  
  private printToConsole(report: TrendsAnalysisReport): void {
    const statusIcon = '🎯';
    const totalTimeSec = (report.totalAnalysisTimeMs / 1000).toFixed(1);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${statusIcon} [TrendsFFTDetector] ANALYSIS REPORT ${statusIcon}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`  Report ID: ${report.id}`);
    console.log(`  Confidence: ${report.confidence.toFixed(1)}%`);
    console.log(`  Samples: ${report.validSamples}/${report.samplesCount} valid`);
    console.log(`  Interval: ${report.intervalMs}ms | Total analysis time: ${totalTimeSec}s`);
    console.log(`  Timestamp: ${new Date(report.timestamp).toLocaleString()}`);
    
    console.log(`\n  📊 SPECTRAL ANALYSIS:`);
    console.log(`    Center of Mass: min=${report.averages.centroidMin.toFixed(1)} max=${report.averages.centroidMax.toFixed(1)} Hz (σ: ${report.averages.centroidStd.toFixed(1)})`);
    console.log(`    Spectral Flux: min=${report.averages.fluxMin.toFixed(3)} max=${report.averages.fluxMax.toFixed(3)} (σ: ${report.averages.fluxStd.toFixed(3)})`);
    console.log(`    Loudness: min=${report.averages.rmsMin.toFixed(4)} max=${report.averages.rmsMax.toFixed(4)} (σ: ${report.averages.rmsStd.toFixed(4)})`);
    
    console.log(`\n  📈 TEMPORAL PATTERNS:`);
    console.log(`    Activity Ratio: ${(report.trends.activity.activityRatio * 100).toFixed(1)}%`);
    console.log(`    Avg Silence: ${(report.trends.activity.avgSilenceDuration * 1000).toFixed(0)}ms`);
    console.log(`    Avg Burst: ${(report.trends.activity.avgBurstDuration * 1000).toFixed(0)}ms`);
    console.log(`    Frequency Jumps: ${report.trends.frequencyJumps.actualJumps} (${report.trends.frequencyJumps.densityPerSecond.toFixed(1)}/s, avg: ${report.trends.frequencyJumps.avgMagnitude.toFixed(0)}Hz)`);
    
    console.log(`\n  📉 TRENDS:`);
    console.log(`    Volume Trend: ${report.trends.trends.volumeTrend}`);
    console.log(`    Frequency Trend: ${report.trends.trends.frequencyTrend}`);
    console.log(`    Long-term Stability: ${report.trends.stability.longTermStability}`);
    console.log(`    Periodicity: ${report.trends.stability.periodicity}`);
    console.log(`    Envelope Shape: ${report.trends.envelope.shape}`);
    console.log(`    Peak/Average Ratio: ${report.trends.envelope.peakToAverageRatio.toFixed(2)}`);
    
    console.log(`\n  📊 STATE SCORES:`);
    report.stateScores.slice(0, 5).forEach((score: ScoreItem) => {
      const barLength = Math.floor(score.score / 5);
      const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
      console.log(`    ${score.stateIcon} ${score.stateName.padEnd(20)} ${bar} ${score.score.toFixed(1)}%`);
    });
    
    console.log(`\n  📈 SUMMARY:`);
    console.log(`    Primary State: ${report.summary.primaryStateIcon} ${report.summary.primaryStateName} (${report.summary.confidence.toFixed(1)}%)`);
    console.log(`    Stability Score: ${report.summary.stabilityScore.toFixed(1)}%`);
    
    if (report.summary.alternativeStates.length > 0) {
      console.log(`    Alternative States:`);
      report.summary.alternativeStates.forEach((alt: AlternativeState) => {
        console.log(`      - ${alt.stateName} (${alt.score.toFixed(1)}%)`);
      });
    }
    
    console.log(`\n  🏷️ TAGS: ${report.tags.join(', ')}`);
    console.log(`${'='.repeat(80)}\n`);
  }
  
  resetDetectionCounter(): void {
    this.detectionNumber = 0;
  }
}

export const trendsDetectionReport = new TrendsDetectionReportService();