// 1. Сначала определим точные типы для всех признаков

import { getSoundStateByKey } from "../soundStateUtils";
import { ConfidenceLevel, SOUND_STATES, TrendsDetectionResult, TrendsSample } from "../types";
import { TrendsDetectorServiceImpl } from "./TrendFFTAnalyzerService";

type TemporalPatternName = 
  | 'centroidStd'
  | 'fluxStd'
  | 'rmsStd'
  | 'activityRatio'
  | 'avgSilenceDuration'
  | 'avgBurstDuration'
  | 'frequencyJumps'
  | 'volumeTrend'
  | 'frequencyTrend'
  | 'longTermStability'
  | 'periodicity'
  | 'envelopeShape'
  | 'peakToAverageRatio';

type SpectralPatternName = 'centroid' | 'flux' | 'rms';

interface TemporalWeights {
  centroidStd: number;
  fluxStd: number;
  rmsStd: number;
  activityRatio: number;
  avgSilenceDuration: number;
  avgBurstDuration: number;
  frequencyJumps: number;
  volumeTrend: number;
  frequencyTrend: number;
  longTermStability: number;
  periodicity: number;
  envelopeShape: number;
  peakToAverageRatio: number;
}

interface SpectralWeights {
  centroid: number;
  flux: number;
  rms: number;
}

interface FeatureWeights {
  temporal: TemporalWeights;
  spectral: SpectralWeights;
}

// 2. Дефолтные веса с правильной типизацией
const DEFAULT_WEIGHTS: FeatureWeights = {
  temporal: {
    centroidStd: 0.12,
    fluxStd: 0.08,
    rmsStd: 0.08,
    activityRatio: 0.15,
    avgSilenceDuration: 0.10,
    avgBurstDuration: 0.08,
    frequencyJumps: 0.12,
    volumeTrend: 0.10,
    frequencyTrend: 0.10,
    longTermStability: 0.10,
    periodicity: 0.10,
    envelopeShape: 0.07,
    peakToAverageRatio: 0.08,
  },
  spectral: {
    centroid: 0.40,
    flux: 0.35,
    rms: 0.25,
  },
};

// 3. Интерфейс для breakdown (чтобы избежать any)
interface TemporalBreakdownItem {
  expected: any;
  actual: any;
  score: number;
  weight: number;
}

interface SpectralBreakdownItem {
  score: number;
  weight: number;
}

interface ScoreBreakdown {
  temporal: {
    score: number;
    details: Record<TemporalPatternName, TemporalBreakdownItem>;
  };
  spectral: {
    score: number;
    details: Record<SpectralPatternName, SpectralBreakdownItem>;
  };
  final: number;
}

// 4. Улучшенный класс с правильной типизацией
class ImprovedTrendsDetector extends TrendsDetectorServiceImpl {
  private featureWeights: FeatureWeights = DEFAULT_WEIGHTS;
  private confidenceThresholds = {
    high: 75,
    medium: 55,
    low: 35,
  };

  /**
   * Основной метод оценки - с приоритетом временных паттернов
   */
  private calculateStateScore(
    stateKey: string,
    state: typeof SOUND_STATES[string],
    spectral: { centroidMean: number; fluxMean: number; rmsMean: number },
    temporal: any
  ): { score: number; breakdown: ScoreBreakdown } {
    
    let temporalScore = 0;
    let temporalWeightSum = 0;
    const temporalDetails = {} as Record<TemporalPatternName, TemporalBreakdownItem>;
    
    // 1. Анализируем ВСЕ временные паттерны
    const temporalPatternNames: TemporalPatternName[] = [
      'centroidStd', 'fluxStd', 'rmsStd', 'activityRatio',
      'avgSilenceDuration', 'avgBurstDuration', 'frequencyJumps',
      'volumeTrend', 'frequencyTrend', 'longTermStability',
      'periodicity', 'envelopeShape', 'peakToAverageRatio'
    ];
    
    for (const patternName of temporalPatternNames) {
      const expectedValue = state.temporalPatterns[patternName as keyof typeof state.temporalPatterns];
      if (expectedValue === undefined) continue;
      
      const actualValue = temporal[patternName];
      if (actualValue === undefined) continue;
      
      const weight = this.featureWeights.temporal[patternName];
      let patternScore = 0;
      
      // Обработка разных типов паттернов
      if (Array.isArray(expectedValue)) {
        patternScore = this.matchCategoricalPattern(actualValue, expectedValue);
      } else if (expectedValue && typeof expectedValue === 'object' && 'min' in expectedValue) {
        patternScore = this.calculateMembership(
          actualValue,
          expectedValue.min,
          expectedValue.max
        );
      } else if (patternName === 'frequencyJumps' && expectedValue.enabled !== undefined) {
        patternScore = this.calculateFrequencyJumpsScore(actualValue, expectedValue);
      }
      
      temporalScore += patternScore * weight;
      temporalWeightSum += weight;
      temporalDetails[patternName] = {
        expected: expectedValue,
        actual: actualValue,
        score: patternScore,
        weight: weight
      };
    }
    
    temporalScore = temporalWeightSum > 0 ? temporalScore / temporalWeightSum : 0;
    
    // 2. Спектральный анализ
    let spectralScore = 0;
    let spectralWeightSum = 0;
    const spectralDetails = {} as Record<SpectralPatternName, SpectralBreakdownItem>;
    
    const spectralPatterns: SpectralPatternName[] = ['centroid', 'flux', 'rms'];
    const spectralValues = {
      centroid: spectral.centroidMean,
      flux: spectral.fluxMean,
      rms: spectral.rmsMean
    };
    
    for (const patternName of spectralPatterns) {
      const threshold = state.thresholds[patternName];
      if (!threshold) continue;
      
      const score = this.calculateMembership(
        spectralValues[patternName],
        threshold.min,
        threshold.max
      );
      const weight = this.featureWeights.spectral[patternName];
      spectralScore += score * weight;
      spectralWeightSum += weight;
      spectralDetails[patternName] = { score, weight };
    }
    
    spectralScore = spectralWeightSum > 0 ? spectralScore / spectralWeightSum : 0;
    
    // 3. ИТОГОВЫЙ СЧЁТ: 70% временные паттерны, 30% спектральные
    const totalScore = (temporalScore * 0.7 + spectralScore * 0.3) * 100;
    
    return {
      score: totalScore,
      breakdown: {
        temporal: { score: temporalScore * 100, details: temporalDetails },
        spectral: { score: spectralScore * 100, details: spectralDetails },
        final: totalScore
      }
    };
  }
  
  /**
   * Сопоставление категориальных паттернов
   */
  private matchCategoricalPattern(actual: string, expected: string[]): number {
    if (!actual || !expected.length) return 0;
    
    // Точное совпадение
    if (expected.includes(actual)) return 1.0;
    
    // Семантическая близость
    const semanticMap: Record<string, string[]> = {
      'stable': ['veryHigh', 'high', 'constant', 'steady'],
      'fluctuating': ['modulated', 'oscillating', 'variable', 'unstable'],
      'modulated': ['fluctuating', 'oscillating', 'variable'],
      'oscillating': ['modulated', 'fluctuating', 'varying'],
      'increasing': ['upward', 'rising', 'growing'],
      'decreasing': ['downward', 'falling', 'declining'],
      'impulsive': ['rapid', 'peak', 'sharp', 'attack'],
      'sustained': ['constant', 'stable', 'continuous'],
      'irregular': ['random', 'none', 'chaotic'],
      'regular': ['periodic', 'rhythmic', 'consistent'],
      'veryLow': ['low', 'unstable', 'volatile'],
      'high': ['veryHigh', 'stable', 'steady'],
      'medium': ['moderate', 'average'],
    };
    
    const similarToActual = semanticMap[actual] || [];
    for (const expectedVal of expected) {
      if (similarToActual.includes(expectedVal)) return 0.7;
      // Проверка обратного соответствия
      const similarToExpected = semanticMap[expectedVal] || [];
      if (similarToExpected.includes(actual)) return 0.7;
    }
    
    return 0.2;
  }
  
  /**
   * Специальный скоринг для частотных скачков
   */
  private calculateFrequencyJumpsScore(actual: any, expected: any): number {
    if (!actual || !expected) return 0;
    
    const { actualJumps, densityPerSecond, magnitudeRange } = actual;
    const { minJumpsRequired, densityPerSecond: expectedDensity, enabled } = expected;
    
    // Если скачки не ожидаются
    if (!enabled) {
      return actualJumps === 0 ? 1.0 : Math.max(0, 1 - actualJumps / 10);
    }
    
    // Если скачки ожидаются
    let score = 0;
    let weightSum = 0;
    
    // Количество скачков
    if (actualJumps >= minJumpsRequired) {
      score += 1.0;
    } else if (actualJumps > 0) {
      score += actualJumps / minJumpsRequired;
    }
    weightSum += 1;
    
    // Плотность скачков
    if (expectedDensity && expectedDensity.max) {
      const densityScore = Math.min(1, densityPerSecond / expectedDensity.max);
      score += densityScore;
      weightSum += 1;
    }
    
    // Амплитуда скачков
    if (expected.magnitudeExpected && magnitudeRange) {
      const magnitudeScore = Math.min(1, magnitudeRange.avg / expected.magnitudeExpected);
      score += magnitudeScore;
      weightSum += 1;
    }
    
    return weightSum > 0 ? score / weightSum : 0;
  }
  
  /**
   * Переопределяем основной метод анализа
   */
  public analyzeTrendsWithPriority(samples: TrendsSample[]): TrendsDetectionResult {
    if (samples.length === 0) {
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
    
    // Получаем временные паттерны
    const temporalPatterns = this.patternAnalyzer.analyzeTemporalPatterns(samples);
    
    // Спектральные характеристики
    const spectralAnalysis = {
      centroidMean: this.calculateMean(samples.map(s => s.centroid)),
      fluxMean: this.calculateMean(samples.map(s => s.flux)),
      rmsMean: this.calculateMean(samples.map(s => s.rms)),
    };
    
    // Оцениваем каждый звук
    const scores: { state: string; score: number; breakdown: ScoreBreakdown }[] = [];
    
    for (const [stateKey, state] of Object.entries(SOUND_STATES)) {
      const { score, breakdown } = this.calculateStateScore(
        stateKey, state, spectralAnalysis, temporalPatterns
      );
      
      scores.push({
        state: stateKey,
        score: score,
        breakdown: breakdown,
      });
    }
    
    // Сортируем по убыванию
    scores.sort((a, b) => b.score - a.score);
    
    const bestMatch = scores[0];
    const secondBest = scores[1];
    const state = getSoundStateByKey(bestMatch.state);
    
    // Определяем уровень уверенности
    const confidenceLevel = this.getConfidenceLevel(bestMatch.score, secondBest?.score);
    
    const result: TrendsDetectionResult = {
      isDetected: true,
      state: bestMatch.state,
      stateName: state?.name || 'Неизвестно',
      stateIcon: state?.icon || '❓',
      stateColor: state?.color || '#999',
      confidence: bestMatch.score,
      confidenceLevel: confidenceLevel,
      samples: samples,
      analysis: {
        scores: scores.map(s => ({ state: s.state, score: s.score })),
        patterns: temporalPatterns,
        spectral: spectralAnalysis,
        detailedBreakdown: bestMatch.breakdown,
        alternatives: scores.slice(1, 4).map(s => ({ state: s.state, score: s.score })),
      },
      timestamp: Date.now(),
    };
    
    console.log('[ImprovedTrendsDetector] Analysis complete:', {
      winner: bestMatch.state,
      confidence: bestMatch.score.toFixed(1) + '%',
      confidenceLevel: confidenceLevel,
      temporalWeight: '70%',
      spectralWeight: '30%',
      gapToSecond: (bestMatch.score - (secondBest?.score || 0)).toFixed(1) + '%'
    });
    
    return result;
  }
  
  /**
   * Определение уровня уверенности
   */

  private getConfidenceLevel(winnerScore: number, secondScore: number = 0): ConfidenceLevel {
    const gap = winnerScore - secondScore;
    
    if (winnerScore >= this.confidenceThresholds.high && gap >= 15) return 'high';
    if (winnerScore >= this.confidenceThresholds.medium && gap >= 8) return 'medium';
    if (winnerScore >= this.confidenceThresholds.low) return 'low';
    return 'veryLow';
  }
  
  /**
   * Настройка весов для конкретного звука
   */
  public setCustomWeights(
    temporalWeights: Partial<TemporalWeights>,
    spectralWeights: Partial<SpectralWeights>
  ): void {
    this.featureWeights = {
      temporal: { ...this.featureWeights.temporal, ...temporalWeights },
      spectral: { ...this.featureWeights.spectral, ...spectralWeights },
    };
    console.log('[ImprovedTrendsDetector] Custom weights applied:', this.featureWeights);
  }
  
  /**
   * Сброс к стандартным весам
   */
  public resetWeights(): void {
    this.featureWeights = DEFAULT_WEIGHTS;
    console.log('[ImprovedTrendsDetector] Weights reset to defaults');
  }
  
  protected calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
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
}

export const trendsDetector = new ImprovedTrendsDetector();
