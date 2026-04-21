
import { TrendsDetectorServiceImpl } from './TrendFFTAnalyzerService';

import { 
  TrendsSample, 
  TrendsDetectionResult, 
  //TrendsDetectorConfig,
  SOUND_STATES 
} from '../types';
import { getSoundStateByKey } from '../soundStateUtils';
//import { TrendsDetectorServiceImpl } from './TrendsDetectorService';

export interface ConfidenceThresholds {
  high: number
  medium: number
  low: number
}

/**
 * Улучшенный детектор трендов с приоритетом временных паттернов (70%)
 * Наследует все методы от TrendsDetectorServiceImpl:
 * - EventEmitter методы (on, off, emit, removeAllListeners)
 * - reset(), startCollection(), stopCollection()
 * - addSample(), setConfig(), getConfig()
 * - setPatterns(), getStatus()
 */

export class ImprovedTrendsDetector extends TrendsDetectorServiceImpl {
  protected confidenceThresholds:ConfidenceThresholds = {
    high: 75,
    medium: 55,
    low: 35,
  };
  
  // Сохраняем ссылку на patternAnalyzer из родителя через protected геттер
  protected getPatternAnalyzer(): any {
    return (this as any).patternAnalyzer;
  }
  
  protected getSamplesBuffer(): TrendsSample[] {
    return (this as any).samplesBuffer || [];
  }
  
  protected getCurrentWindowStates(): Map<number, string> {
    return (this as any).currentWindowStates || new Map();
  }

  constructor() {
    super();
    console.log('[ImprovedTrendsDetector] Initialized with priority on temporal patterns (70%)');
  }

  /**
   * Переопределяем метод analyzeTrends с приоритетом временных паттернов (70%)
   */
  protected analyzeTrends(samples: TrendsSample[]): TrendsDetectionResult {
    console.log('[ImprovedTrendsDetector] analyzeTrends called with samples:', samples.length);
    
    if (samples.length === 0) {
      console.warn('[ImprovedTrendsDetector] No samples to analyze!');
      return this.createUnknownResult();
    }
    
    // Получаем временные паттерны через родительский анализатор
    const patternAnalyzer = this.getPatternAnalyzer();
    const actualPatterns = patternAnalyzer?.analyzeTemporalPatterns(samples) || this.calculatePatternsManually(samples);
    
    const centroidValues = samples.map(s => s.centroid);
    const fluxValues = samples.map(s => s.flux);
    const rmsValues = samples.map(s => s.rms);
    
    const spectralAnalysis = {
      centroidMean: this.calculateMean(centroidValues),
      fluxMean: this.calculateMean(fluxValues),
      rmsMean: this.calculateMean(rmsValues),
    };
    
    const scores: Array<{ state: string; score: number; details: any }> = [];
    
    // Используем паттерны из родительского класса
    const patterns = (this as any).patterns || SOUND_STATES;
    
    for (const [stateKey, state] of Object.entries(patterns)) {
      // Спектральная оценка (30% веса)
      const spectralScore = this.calculateSpectralScore(state as any, spectralAnalysis);
      
      // Временная оценка (70% веса) - с улучшенным скорингом
      const temporalScore = this.calculateTemporalScoreImproved(actualPatterns, (state as any).temporalPatterns);
      
      const totalScore = (spectralScore * 0.3 + temporalScore * 0.7) * 100;
      
      scores.push({
        state: stateKey,
        score: totalScore,
        details: {
          spectralScore: spectralScore * 100,
          temporalScore: temporalScore * 100,
        },
      });
    }
    
    scores.sort((a, b) => b.score - a.score);
    const bestMatch = scores[0];
    const secondBest = scores[1];
    const state = getSoundStateByKey(bestMatch.state);
    
    // Определяем уровень уверенности
    const confidenceLevel = this.getConfidenceLevel(bestMatch.score, secondBest?.score);
    
    // Обогащаем сэмплы состояниями из окон
    const enrichedSamples = this.enrichSamplesWithStates(samples);
    
    const result: TrendsDetectionResult = {
      isDetected: true,
      state: bestMatch.state,
      stateName: state?.name || 'Неизвестно',
      stateIcon: state?.icon || '❓',
      stateColor: state?.color || '#999',
      confidence: Math.round(bestMatch.score),
      confidenceLevel: confidenceLevel,
      samples: enrichedSamples,
      analysis: {
        scores: scores.map(s => ({ state: s.state, score: Math.round(s.score) })),
        patterns: actualPatterns,
        spectral: spectralAnalysis,
        bestMatchDetails: bestMatch.details,
        alternatives: scores.slice(1, 4).map(s => ({ 
          state: s.state, 
          score: Math.round(s.score) 
        })),
        temporalWeight: '70%',
        spectralWeight: '30%',
      },
      timestamp: Date.now(),
    };
  
    console.log('[ImprovedTrendsDetector] Analysis result:', {
      state: bestMatch.state,
      stateName: state?.name,
      confidence: Math.round(bestMatch.score),
      confidenceLevel: confidenceLevel,
      gapToSecond: Math.round(bestMatch.score - (secondBest?.score || 0)) + '%'
    });
    
    return result;
  }

  /**
   * Ручной расчет паттернов, если patternAnalyzer недоступен
   */
  protected calculatePatternsManually(samples: TrendsSample[]): any {
    const rmsValues = samples.map(s => s.rms);
    const centroidValues = samples.map(s => s.centroid);
    const fluxValues = samples.map(s => s.flux);
    
    return {
      centroidStd: this.calculateStdDev(centroidValues),
      fluxStd: this.calculateStdDev(fluxValues),
      rmsStd: this.calculateStdDev(rmsValues),
      activityRatio: rmsValues.filter(v => v > 0.02).length / rmsValues.length,
      volumeTrend: this.analyzeTrendManual(rmsValues),
      frequencyTrend: this.analyzeTrendManual(centroidValues),
      frequencyJumps: this.detectFrequencyJumpsManual(centroidValues, samples.length * 0.03),
      longTermStability: this.calculateStabilityManual(rmsValues, centroidValues),
      periodicity: this.detectPeriodicityManual(rmsValues),
      envelopeShape: this.analyzeEnvelopeShapeManual(rmsValues),
      peakToAverageRatio: Math.max(...rmsValues) / (this.calculateMean(rmsValues) || 1),
    };
  }

  /**
   * Ручной анализ тренда
   */
  protected analyzeTrendManual(values: number[]): string {
    if (values.length < 10) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = this.calculateMean(firstHalf);
    const secondAvg = this.calculateMean(secondHalf);
    
    const ratio = secondAvg / firstAvg;
    
    if (ratio > 1.5) return 'increasing';
    if (ratio < 0.67) return 'decreasing';
    
    const variance = this.calculateVariance(values);
    if (variance > 0.1 * firstAvg) return 'oscillating';
    
    return 'stable';
  }

  /**
   * Ручной детект частотных скачков
   */
  protected detectFrequencyJumpsManual(centroidValues: number[], duration: number): any {
    const jumps: number[] = [];
    for (let i = 1; i < centroidValues.length; i++) {
      const jump = Math.abs(centroidValues[i] - centroidValues[i - 1]);
      if (jump > 50) {
        jumps.push(jump);
      }
    }
    
    return {
      enabled: jumps.length > 3,
      magnitudeRange: jumps.length > 0 ? {
        min: Math.min(...jumps),
        max: Math.max(...jumps),
        avg: this.calculateMean(jumps)
      } : { min: 0, max: 0, avg: 0 },
      densityPerSecond: jumps.length / duration,
      minJumpsRequired: 5,
      actualJumps: jumps.length,
      magnitudes: jumps
    };
  }

  /**
   * Ручной расчет стабильности
   */
  protected calculateStabilityManual(rmsValues: number[], centroidValues: number[]): string {
    const rmsVariance = this.calculateVariance(rmsValues);
    const centroidVariance = this.calculateVariance(centroidValues) / 1000;
    
    const normalizedStability = 1 - (rmsVariance + centroidVariance) / 2;
    
    if (normalizedStability > 0.8) return 'veryHigh';
    if (normalizedStability > 0.6) return 'high';
    if (normalizedStability > 0.4) return 'medium';
    if (normalizedStability > 0.2) return 'low';
    return 'veryLow';
  }

  /**
   * Ручной детект периодичности
   */
  protected detectPeriodicityManual(values: number[]): string {
    const autocorr = this.autocorrelate(values);
    const peaks = this.findPeaks(autocorr);
    const significantPeaks = peaks.filter(p => p.value > 0.3);
    
    if (significantPeaks.length === 0) return 'none';
    if (significantPeaks.length < 3) return 'irregular';
    
    const intervals = [];
    for (let i = 1; i < significantPeaks.length; i++) {
      intervals.push(significantPeaks[i].index - significantPeaks[i - 1].index);
    }
    
    const intervalStd = this.calculateStdDev(intervals);
    const intervalMean = this.calculateMean(intervals);
    
    if (intervalStd / intervalMean < 0.2) return 'regular';
    if (intervalStd / intervalMean < 0.5) return 'semiRegular';
    return 'irregular';
  }

  /**
   * Ручной анализ формы огибающей
   */
  protected analyzeEnvelopeShapeManual(rmsValues: number[]): string {
    const maxIndex = rmsValues.indexOf(Math.max(...rmsValues));
    const maxValue = rmsValues[maxIndex];
    
    const attack = maxIndex > 0 ? rmsValues.slice(0, maxIndex) : [];
    const attackSlope = attack.length > 1 ? 
      (maxValue - attack[0]) / attack.length : 0;
    
    const decay = maxIndex < rmsValues.length - 1 ? 
      rmsValues.slice(maxIndex) : [];
    const decaySlope = decay.length > 1 ?
      (decay[0] - decay[decay.length - 1]) / decay.length : 0;
    
    if (attackSlope > 0.5 && decaySlope < 0.1) return 'impulsive';
    if (attackSlope > 0.2 && decaySlope > 0.2) return 'attackDecay';
    if (attackSlope < 0.05 && decaySlope < 0.05) return 'sustained';
    if (attackSlope > 0.1 && decaySlope < 0.05) return 'pluck';
    
    return 'complex';
  }

  /**
   * Автокорреляция
   */
  protected autocorrelate(values: number[]): number[] {
    const result = new Array(values.length);
    for (let i = 0; i < values.length; i++) {
      let sum = 0;
      for (let j = 0; j < values.length - i; j++) {
        sum += values[j] * values[j + i];
      }
      result[i] = sum / (values.length - i);
    }
    return result;
  }

  /**
   * Поиск пиков
   */
  protected findPeaks(values: number[]): Array<{ index: number; value: number }> {
    const peaks = [];
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push({ index: i, value: values[i] });
      }
    }
    return peaks;
  }

  /**
   * Вычисление спектральной оценки
   */
  protected calculateSpectralScore(state: any, spectralAnalysis: any): number {
    let spectralScore = 0;
    let spectralWeight = 0;
    
    if (state.thresholds?.centroid) {
      const centroidScore = this.calculateMembership(
        spectralAnalysis.centroidMean,
        state.thresholds.centroid.min,
        state.thresholds.centroid.max
      );
      spectralScore += centroidScore * 0.35;
      spectralWeight += 0.35;
    }
    
    if (state.thresholds?.flux) {
      const fluxScore = this.calculateMembership(
        spectralAnalysis.fluxMean,
        state.thresholds.flux.min,
        state.thresholds.flux.max
      );
      spectralScore += fluxScore * 0.25;
      spectralWeight += 0.25;
    }
    
    if (state.thresholds?.rms) {
      const rmsScore = this.calculateMembership(
        spectralAnalysis.rmsMean,
        state.thresholds.rms.min,
        state.thresholds.rms.max
      );
      spectralScore += rmsScore * 0.2;
      spectralWeight += 0.2;
    }
    
    return spectralWeight > 0 ? spectralScore / spectralWeight : 0;
  }

  /**
   * Улучшенная версия calculateTemporalScore с приоритетом трендов
   */
  protected calculateTemporalScoreImproved(actualPatterns: any, expectedPatterns: any): number {
    if (!expectedPatterns) return 0;
    
    let score = 0;
    let totalWeight = 0;
    
    // Обновленные веса - отдаем приоритет трендам и активности
    const weights: Record<string, number> = {
      centroidStd: 0.06,
      fluxStd: 0.06,
      rmsStd: 0.06,
      activityRatio: 0.12,
      avgSilenceDuration: 0.08,
      avgBurstDuration: 0.08,
      frequencyJumps: 0.12,
      volumeTrend: 0.14,
      frequencyTrend: 0.14,
      longTermStability: 0.10,
      periodicity: 0.06,
      envelopeShape: 0.04,
      peakToAverageRatio: 0.04,
    };
    
    for (const [patternName, weight] of Object.entries(weights)) {
      const expected = expectedPatterns[patternName];
      const actual = actualPatterns?.[patternName];
      
      if (!expected || actual === undefined) continue;
      
      const patternScore = this.calculatePatternScore(patternName, actual, expected);
      score += patternScore * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Вычисление оценки для отдельного паттерна
   */
  protected calculatePatternScore(patternName: string, actual: any, expected: any): number {
    // Frequency Jumps специальная обработка
    if (patternName === 'frequencyJumps') {
      return this.calculateFrequencyJumpsScoreImproved(actual, expected);
    }
    
    // Категориальные паттерны (массивы строк)
    if (Array.isArray(expected)) {
      return this.matchCategoricalPatternImproved(actual, expected);
    }
    
    // Числовые диапазоны
    if (typeof expected === 'object' && expected !== null && 'min' in expected && 'max' in expected) {
      return this.calculateMembership(actual, expected.min, expected.max);
    }
    
    // Прямое сравнение строк
    if (typeof expected === 'string') {
      return expected === actual ? 1 : 0.3;
    }
    
    return 0;
  }

  /**
   * Улучшенное сопоставление категориальных паттернов
   */
  protected matchCategoricalPatternImproved(actual: string, expected: string[]): number {
    if (!actual || !expected.length) return 0;
    
    // Точное совпадение
    if (expected.includes(actual)) return 1.0;
    
    // Семантическая близость
    const semanticGroups: Record<string, string[]> = {
      'stable': ['constant', 'steady', 'unchanging'],
      'increasing': ['rising', 'growing', 'upward'],
      'decreasing': ['falling', 'declining', 'downward'],
      'fluctuating': ['variable', 'unstable', 'changing'],
      'modulated': ['varying', 'fluctuating', 'oscillating'],
      'oscillating': ['vibrating', 'pulsating', 'modulated'],
      'veryLow': ['low', 'unstable', 'volatile'],
      'low': ['veryLow', 'unstable'],
      'medium': ['moderate', 'average'],
      'high': ['veryHigh', 'stable'],
      'veryHigh': ['high', 'stable', 'constant'],
      'none': ['random', 'chaotic', 'aperiodic'],
      'irregular': ['random', 'none', 'sporadic'],
      'semiRegular': ['irregular', 'regular'],
      'regular': ['periodic', 'rhythmic', 'consistent'],
      'impulsive': ['sharp', 'peak', 'transient'],
      'attackDecay': ['pluck', 'percussive'],
      'sustained': ['continuous', 'constant', 'steady'],
      'pluck': ['attackDecay', 'impulsive'],
      'complex': ['irregular', 'variable'],
    };
    
    const similarToActual = semanticGroups[actual] || [];
    for (const expectedVal of expected) {
      if (similarToActual.includes(expectedVal)) return 0.7;
      const similarToExpected = semanticGroups[expectedVal] || [];
      if (similarToExpected.includes(actual)) return 0.7;
    }
    
    return 0.2;
  }

  /**
   * Улучшенный скоринг частотных скачков
   */
  protected calculateFrequencyJumpsScoreImproved(actual: any, expected: any): number {
    if (!actual || !expected) return 0;
    
    const actualJumps = actual.actualJumps || 0;
    const { minJumpsRequired, enabled, densityPerSecond: expectedDensity } = expected;
    
    if (!enabled) {
      if (actualJumps === 0) return 1.0;
      return Math.max(0, 1 - Math.log10(actualJumps + 1) / 2);
    }
    
    let score = 0;
    let weightSum = 0;
    
    if (actualJumps >= minJumpsRequired) {
      score += 1.0;
    } else if (actualJumps > 0) {
      score += actualJumps / minJumpsRequired;
    }
    weightSum += 1;
    
    if (expectedDensity?.max && actual.densityPerSecond !== undefined) {
      const densityScore = Math.min(1, actual.densityPerSecond / expectedDensity.max);
      score += densityScore;
      weightSum += 1;
    }
    
    return weightSum > 0 ? score / weightSum : 0;
  }

  /**
   * Определение уровня уверенности
   */
  protected getConfidenceLevel(winnerScore: number, secondScore: number = 0): 'high' | 'medium' | 'low' | 'veryLow' {
    const gap = winnerScore - secondScore;
    
    if (winnerScore >= this.confidenceThresholds.high && gap >= 15) return 'high';
    if (winnerScore >= this.confidenceThresholds.medium && gap >= 8) return 'medium';
    if (winnerScore >= this.confidenceThresholds.low) return 'low';
    return 'veryLow';
  }

  /**
   * Обогащение сэмплов состояниями из окон
   */
  protected enrichSamplesWithStates(samples: TrendsSample[]): TrendsSample[] {
    const currentWindowStates = this.getCurrentWindowStates();
    const samplesBuffer = this.getSamplesBuffer();
    
    return samples.map((sample, index) => {
      const globalIndex = samplesBuffer.length - samples.length + index;
      const windowState = currentWindowStates.get(globalIndex);
      if (windowState && !sample.state) {
        return { ...sample, state: windowState };
      }
      return sample;
    });
  }

  /**
   * Создание результата для неизвестного звука
   */
  protected createUnknownResult(): TrendsDetectionResult {
    return {
      isDetected: true,
      state: 'UNKNOWN',
      stateName: 'Неизвестно',
      stateIcon: '❓',
      stateColor: '#999',
      confidence: 0,
      confidenceLevel: 'veryLow',
      samples: [],
      analysis: null,
      timestamp: Date.now(),
    };
  }

  /**
   * Переопределяем метод analyzeTrendsForWindow
   */
  protected analyzeTrendsForWindow(samples: TrendsSample[]): TrendsDetectionResult {
    return this.analyzeTrends(samples);
  }

  /**
   * Вычисление дисперсии
   */
  protected calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  /**
   * Вычисление среднеквадратичного отклонения
   */
  protected calculateStdDev(values: number[]): number {
    return Math.sqrt(this.calculateVariance(values));
  }

  /**
   * Вычисление среднего
   */
  protected calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Вычисление принадлежности к диапазону
   */
  protected calculateMembership(value: number, min: number, max: number): number {
    if (value >= min && value <= max) return 1;
    if (value < min) {
      const diff = min - value;
      const maxDiff = min;
      return Math.max(0, 1 - diff / maxDiff);
    }
    const diff = value - max;
    const maxDiff = max * 2;
    return Math.max(0, 1 - diff / maxDiff);
  }

  /**
   * Публичный метод для получения информации о весах
   */
  public getWeightsInfo(): {
    temporalWeight: string;
    spectralWeight: string;
    confidenceThresholds: ConfidenceThresholds;
  } {
    return {
      temporalWeight: '70%',
      spectralWeight: '30%',
      confidenceThresholds: this.confidenceThresholds,
    };
  }
}

// Экспортируем экземпляр
export const trendsDetector = new ImprovedTrendsDetector();

// Экспортируем экземпляр с улучшенной логикой
//export const trendsDetector = new ImprovedTrendsDetector();

// // 1. Сначала определим точные типы для всех признаков

// import { getSoundStateByKey } from "../soundStateUtils";
// import { ConfidenceLevel, SOUND_STATES, TrendsDetectionResult, TrendsSample } from "../types";
// import { TrendsDetectorServiceImpl } from "./TrendFFTAnalyzerService";

// type TemporalPatternName = 
//   | 'centroidStd'
//   | 'fluxStd'
//   | 'rmsStd'
//   | 'activityRatio'
//   | 'avgSilenceDuration'
//   | 'avgBurstDuration'
//   | 'frequencyJumps'
//   | 'volumeTrend'
//   | 'frequencyTrend'
//   | 'longTermStability'
//   | 'periodicity'
//   | 'envelopeShape'
//   | 'peakToAverageRatio';

// type SpectralPatternName = 'centroid' | 'flux' | 'rms';

// interface TemporalWeights {
//   centroidStd: number;
//   fluxStd: number;
//   rmsStd: number;
//   activityRatio: number;
//   avgSilenceDuration: number;
//   avgBurstDuration: number;
//   frequencyJumps: number;
//   volumeTrend: number;
//   frequencyTrend: number;
//   longTermStability: number;
//   periodicity: number;
//   envelopeShape: number;
//   peakToAverageRatio: number;
// }

// interface SpectralWeights {
//   centroid: number;
//   flux: number;
//   rms: number;
// }

// interface FeatureWeights {
//   temporal: TemporalWeights;
//   spectral: SpectralWeights;
// }

// // 2. Дефолтные веса с правильной типизацией
// const DEFAULT_WEIGHTS: FeatureWeights = {
//   temporal: {
//     centroidStd: 0.12,
//     fluxStd: 0.08,
//     rmsStd: 0.08,
//     activityRatio: 0.15,
//     avgSilenceDuration: 0.10,
//     avgBurstDuration: 0.08,
//     frequencyJumps: 0.12,
//     volumeTrend: 0.10,
//     frequencyTrend: 0.10,
//     longTermStability: 0.10,
//     periodicity: 0.10,
//     envelopeShape: 0.07,
//     peakToAverageRatio: 0.08,
//   },
//   spectral: {
//     centroid: 0.40,
//     flux: 0.35,
//     rms: 0.25,
//   },
// };

// // 3. Интерфейс для breakdown (чтобы избежать any)
// interface TemporalBreakdownItem {
//   expected: any;
//   actual: any;
//   score: number;
//   weight: number;
// }

// interface SpectralBreakdownItem {
//   score: number;
//   weight: number;
// }

// interface ScoreBreakdown {
//   temporal: {
//     score: number;
//     details: Record<TemporalPatternName, TemporalBreakdownItem>;
//   };
//   spectral: {
//     score: number;
//     details: Record<SpectralPatternName, SpectralBreakdownItem>;
//   };
//   final: number;
// }

// // 4. Улучшенный класс с правильной типизацией
// class ImprovedTrendsDetector extends TrendsDetectorServiceImpl {
//   private featureWeights: FeatureWeights = DEFAULT_WEIGHTS;
//   private confidenceThresholds = {
//     high: 75,
//     medium: 55,
//     low: 35,
//   };

//   /**
//    * Основной метод оценки - с приоритетом временных паттернов
//    */
//   private calculateStateScore(
//     stateKey: string,
//     state: typeof SOUND_STATES[string],
//     spectral: { centroidMean: number; fluxMean: number; rmsMean: number },
//     temporal: any
//   ): { score: number; breakdown: ScoreBreakdown } {
    
//     let temporalScore = 0;
//     let temporalWeightSum = 0;
//     const temporalDetails = {} as Record<TemporalPatternName, TemporalBreakdownItem>;
    
//     // 1. Анализируем ВСЕ временные паттерны
//     const temporalPatternNames: TemporalPatternName[] = [
//       'centroidStd', 'fluxStd', 'rmsStd', 'activityRatio',
//       'avgSilenceDuration', 'avgBurstDuration', 'frequencyJumps',
//       'volumeTrend', 'frequencyTrend', 'longTermStability',
//       'periodicity', 'envelopeShape', 'peakToAverageRatio'
//     ];
    
//     for (const patternName of temporalPatternNames) {
//       const expectedValue = state.temporalPatterns[patternName as keyof typeof state.temporalPatterns];
//       if (expectedValue === undefined) continue;
      
//       const actualValue = temporal[patternName];
//       if (actualValue === undefined) continue;
      
//       const weight = this.featureWeights.temporal[patternName];
//       let patternScore = 0;
      
//       // Обработка разных типов паттернов
//       if (Array.isArray(expectedValue)) {
//         patternScore = this.matchCategoricalPattern(actualValue, expectedValue);
//       } else if (expectedValue && typeof expectedValue === 'object' && 'min' in expectedValue) {
//         patternScore = this.calculateMembership(
//           actualValue,
//           expectedValue.min,
//           expectedValue.max
//         );
//       } else if (patternName === 'frequencyJumps' && expectedValue.enabled !== undefined) {
//         patternScore = this.calculateFrequencyJumpsScore(actualValue, expectedValue);
//       }
      
//       temporalScore += patternScore * weight;
//       temporalWeightSum += weight;
//       temporalDetails[patternName] = {
//         expected: expectedValue,
//         actual: actualValue,
//         score: patternScore,
//         weight: weight
//       };
//     }
    
//     temporalScore = temporalWeightSum > 0 ? temporalScore / temporalWeightSum : 0;
    
//     // 2. Спектральный анализ
//     let spectralScore = 0;
//     let spectralWeightSum = 0;
//     const spectralDetails = {} as Record<SpectralPatternName, SpectralBreakdownItem>;
    
//     const spectralPatterns: SpectralPatternName[] = ['centroid', 'flux', 'rms'];
//     const spectralValues = {
//       centroid: spectral.centroidMean,
//       flux: spectral.fluxMean,
//       rms: spectral.rmsMean
//     };
    
//     for (const patternName of spectralPatterns) {
//       const threshold = state.thresholds[patternName];
//       if (!threshold) continue;
      
//       const score = this.calculateMembership(
//         spectralValues[patternName],
//         threshold.min,
//         threshold.max
//       );
//       const weight = this.featureWeights.spectral[patternName];
//       spectralScore += score * weight;
//       spectralWeightSum += weight;
//       spectralDetails[patternName] = { score, weight };
//     }
    
//     spectralScore = spectralWeightSum > 0 ? spectralScore / spectralWeightSum : 0;
    
//     // 3. ИТОГОВЫЙ СЧЁТ: 70% временные паттерны, 30% спектральные
//     const totalScore = (temporalScore * 0.7 + spectralScore * 0.3) * 100;
    
//     return {
//       score: totalScore,
//       breakdown: {
//         temporal: { score: temporalScore * 100, details: temporalDetails },
//         spectral: { score: spectralScore * 100, details: spectralDetails },
//         final: totalScore
//       }
//     };
//   }
  
//   /**
//    * Сопоставление категориальных паттернов
//    */
//   private matchCategoricalPattern(actual: string, expected: string[]): number {
//     if (!actual || !expected.length) return 0;
    
//     // Точное совпадение
//     if (expected.includes(actual)) return 1.0;
    
//     // Семантическая близость
//     const semanticMap: Record<string, string[]> = {
//       'stable': ['veryHigh', 'high', 'constant', 'steady'],
//       'fluctuating': ['modulated', 'oscillating', 'variable', 'unstable'],
//       'modulated': ['fluctuating', 'oscillating', 'variable'],
//       'oscillating': ['modulated', 'fluctuating', 'varying'],
//       'increasing': ['upward', 'rising', 'growing'],
//       'decreasing': ['downward', 'falling', 'declining'],
//       'impulsive': ['rapid', 'peak', 'sharp', 'attack'],
//       'sustained': ['constant', 'stable', 'continuous'],
//       'irregular': ['random', 'none', 'chaotic'],
//       'regular': ['periodic', 'rhythmic', 'consistent'],
//       'veryLow': ['low', 'unstable', 'volatile'],
//       'high': ['veryHigh', 'stable', 'steady'],
//       'medium': ['moderate', 'average'],
//     };
    
//     const similarToActual = semanticMap[actual] || [];
//     for (const expectedVal of expected) {
//       if (similarToActual.includes(expectedVal)) return 0.7;
//       // Проверка обратного соответствия
//       const similarToExpected = semanticMap[expectedVal] || [];
//       if (similarToExpected.includes(actual)) return 0.7;
//     }
    
//     return 0.2;
//   }
  
//   /**
//    * Специальный скоринг для частотных скачков
//    */
//   private calculateFrequencyJumpsScore(actual: any, expected: any): number {
//     if (!actual || !expected) return 0;
    
//     const { actualJumps, densityPerSecond, magnitudeRange } = actual;
//     const { minJumpsRequired, densityPerSecond: expectedDensity, enabled } = expected;
    
//     // Если скачки не ожидаются
//     if (!enabled) {
//       return actualJumps === 0 ? 1.0 : Math.max(0, 1 - actualJumps / 10);
//     }
    
//     // Если скачки ожидаются
//     let score = 0;
//     let weightSum = 0;
    
//     // Количество скачков
//     if (actualJumps >= minJumpsRequired) {
//       score += 1.0;
//     } else if (actualJumps > 0) {
//       score += actualJumps / minJumpsRequired;
//     }
//     weightSum += 1;
    
//     // Плотность скачков
//     if (expectedDensity && expectedDensity.max) {
//       const densityScore = Math.min(1, densityPerSecond / expectedDensity.max);
//       score += densityScore;
//       weightSum += 1;
//     }
    
//     // Амплитуда скачков
//     if (expected.magnitudeExpected && magnitudeRange) {
//       const magnitudeScore = Math.min(1, magnitudeRange.avg / expected.magnitudeExpected);
//       score += magnitudeScore;
//       weightSum += 1;
//     }
    
//     return weightSum > 0 ? score / weightSum : 0;
//   }
  
//   /**
//    * Переопределяем основной метод анализа
//    */
//   public analyzeTrendsWithPriority(samples: TrendsSample[]): TrendsDetectionResult {
//     if (samples.length === 0) {
//       return {
//         isDetected: true,
//         state: 'UNKNOWN',
//         stateName: 'Неизвестно',
//         stateIcon: '❓',
//         stateColor: '#999',
//         confidence: 0,
//         confidenceLevel: 'veryLow',
//         samples: [],
//         analysis: null,
//         timestamp: Date.now(),
//       };
//     }
    
//     // Получаем временные паттерны
//     const temporalPatterns = this.patternAnalyzer.analyzeTemporalPatterns(samples);
    
//     // Спектральные характеристики
//     const spectralAnalysis = {
//       centroidMean: this.calculateMean(samples.map(s => s.centroid)),
//       fluxMean: this.calculateMean(samples.map(s => s.flux)),
//       rmsMean: this.calculateMean(samples.map(s => s.rms)),
//     };
    
//     // Оцениваем каждый звук
//     const scores: { state: string; score: number; breakdown: ScoreBreakdown }[] = [];
    
//     for (const [stateKey, state] of Object.entries(SOUND_STATES)) {
//       const { score, breakdown } = this.calculateStateScore(
//         stateKey, state, spectralAnalysis, temporalPatterns
//       );
      
//       scores.push({
//         state: stateKey,
//         score: score,
//         breakdown: breakdown,
//       });
//     }
    
//     // Сортируем по убыванию
//     scores.sort((a, b) => b.score - a.score);
    
//     const bestMatch = scores[0];
//     const secondBest = scores[1];
//     const state = getSoundStateByKey(bestMatch.state);
    
//     // Определяем уровень уверенности
//     const confidenceLevel = this.getConfidenceLevel(bestMatch.score, secondBest?.score);
    
//     const result: TrendsDetectionResult = {
//       isDetected: true,
//       state: bestMatch.state,
//       stateName: state?.name || 'Неизвестно',
//       stateIcon: state?.icon || '❓',
//       stateColor: state?.color || '#999',
//       confidence: bestMatch.score,
//       confidenceLevel: confidenceLevel,
//       samples: samples,
//       analysis: {
//         scores: scores.map(s => ({ state: s.state, score: s.score })),
//         patterns: temporalPatterns,
//         spectral: spectralAnalysis,
//         detailedBreakdown: bestMatch.breakdown,
//         alternatives: scores.slice(1, 4).map(s => ({ state: s.state, score: s.score })),
//       },
//       timestamp: Date.now(),
//     };
    
//     console.log('[ImprovedTrendsDetector] Analysis complete:', {
//       winner: bestMatch.state,
//       confidence: bestMatch.score.toFixed(1) + '%',
//       confidenceLevel: confidenceLevel,
//       temporalWeight: '70%',
//       spectralWeight: '30%',
//       gapToSecond: (bestMatch.score - (secondBest?.score || 0)).toFixed(1) + '%'
//     });
    
//     return result;
//   }
  
//   /**
//    * Определение уровня уверенности
//    */

//   private getConfidenceLevel(winnerScore: number, secondScore: number = 0): ConfidenceLevel {
//     const gap = winnerScore - secondScore;
    
//     if (winnerScore >= this.confidenceThresholds.high && gap >= 15) return 'high';
//     if (winnerScore >= this.confidenceThresholds.medium && gap >= 8) return 'medium';
//     if (winnerScore >= this.confidenceThresholds.low) return 'low';
//     return 'veryLow';
//   }
  
//   /**
//    * Настройка весов для конкретного звука
//    */
//   public setCustomWeights(
//     temporalWeights: Partial<TemporalWeights>,
//     spectralWeights: Partial<SpectralWeights>
//   ): void {
//     this.featureWeights = {
//       temporal: { ...this.featureWeights.temporal, ...temporalWeights },
//       spectral: { ...this.featureWeights.spectral, ...spectralWeights },
//     };
//     console.log('[ImprovedTrendsDetector] Custom weights applied:', this.featureWeights);
//   }
  
//   /**
//    * Сброс к стандартным весам
//    */
//   public resetWeights(): void {
//     this.featureWeights = DEFAULT_WEIGHTS;
//     console.log('[ImprovedTrendsDetector] Weights reset to defaults');
//   }
  
//   protected calculateMean(values: number[]): number {
//     if (values.length === 0) return 0;
//     return values.reduce((a, b) => a + b, 0) / values.length;
//   }
  
//   protected calculateMembership(value: number, min: number, max: number): number {
//     if (value >= min && value <= max) return 1;
//     if (value < min) {
//       const diff = min - value;
//       const maxDiff = min;
//       return Math.max(0, 1 - diff / maxDiff);
//     }
//     const diff = value - max;
//     const maxDiff = max * 2;
//     return Math.max(0, 1 - diff / maxDiff);
//   }
// }

// export const trendsDetector = new ImprovedTrendsDetector();
