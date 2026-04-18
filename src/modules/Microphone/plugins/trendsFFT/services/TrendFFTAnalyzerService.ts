// src/services/TrendsDetectorService.ts

import { 
  TrendsSample, 
  TrendsDetectionResult, 
  TrendsDetectorConfig,
  SOUND_STATES,
} from '../types';
import { getSoundStateByKey } from '../soundStateUtils';

// Простой EventEmitter
class SimpleEventEmitter {
  private events: Map<string, Function[]> = new Map();
  
  on(event: string, callback: Function): void {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event)!.push(callback);
  }
  
  off(event: string, callback: Function): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    }
  }
  
  emit(event: string, data: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try { callback(data); } catch (error) { console.error(error); }
      });
    }
  }
  
  removeAllListeners(event?: string): void {
    if (event) this.events.delete(event);
    else this.events.clear();
  }
}

class TemporalPatternAnalyzer {
  private sampleRate: number;
  
  constructor(sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
  }
  
  analyzeTemporalPatterns(samples: TrendsSample[]): any {
    const segmentDuration = 0.05; // 50ms сегменты
    const segments = samples.map(sample => ({
      rms: sample.rms,
      centroid: sample.centroid,
      flux: sample.flux,
    }));
    
    // Анализ паттернов
    const patterns = {
      // Статистики
      centroidStd: this.calculateStdDev(segments.map(s => s.centroid)),
      fluxStd: this.calculateStdDev(segments.map(s => s.flux)),
      rmsStd: this.calculateStdDev(segments.map(s => s.rms)),
      
      // Активность и паузы
      activityRatio: this.calculateActivityRatio(segments),
      avgSilenceDuration: this.calculateAvgSilenceDuration(segments, segmentDuration),
      avgBurstDuration: this.calculateAvgBurstDuration(segments, segmentDuration),
      
      // Частотные скачки
      frequencyJumps: this.detectFrequencyJumps(segments, samples.length * 0.03), // примерная длительность
      
      // Тренды
      volumeTrend: this.analyzeTrend(segments.map(s => s.rms)),
      frequencyTrend: this.analyzeTrend(segments.map(s => s.centroid)),
      
      // Стабильность
      longTermStability: this.calculateStability(segments),
      periodicity: this.detectPeriodicity(segments.map(s => s.rms)),
      
      // Огибающая
      envelopeShape: this.analyzeEnvelopeShape(segments.map(s => s.rms)),
      peakToAverageRatio: this.calculatePeakToAverage(segments.map(s => s.rms)),
    };
    
    return patterns;
  }
  
  detectFrequencyJumps(segments: any[], duration: number): any {
    const jumps: number[] = [];
    for (let i = 1; i < segments.length; i++) {
      const jump = Math.abs(segments[i].centroid - segments[i-1].centroid);
      if (jump > 50) { // Минимальный порог скачка
        jumps.push(jump);
      }
    }
    
    const jumpsPerSecond = jumps.length / duration;
    
    return {
      enabled: jumps.length > 3,
      magnitudeRange: jumps.length > 0 ? {
        min: Math.min(...jumps),
        max: Math.max(...jumps),
        avg: jumps.reduce((a, b) => a + b, 0) / jumps.length
      } : { min: 0, max: 0, avg: 0 },
      densityPerSecond: jumpsPerSecond,
      minJumpsRequired: 5,
      actualJumps: jumps.length,
      magnitudes: jumps
    };
  }
  
  analyzeTrend(values: number[]): string {
    if (values.length < 10) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length/2));
    const secondHalf = values.slice(Math.floor(values.length/2));
    const firstAvg = this.average(firstHalf);
    const secondAvg = this.average(secondHalf);
    
    const ratio = secondAvg / firstAvg;
    
    if (ratio > 1.5) return 'increasing';
    if (ratio < 0.67) return 'decreasing';
    
    // Проверка на колебания
    const variance = this.calculateVariance(values);
    if (variance > 0.1 * firstAvg) return 'oscillating';
    
    return 'stable';
  }
  
  calculateStability(segments: any[]): string {
    const rmsVariance = this.calculateVariance(segments.map(s => s.rms));
    const centroidVariance = this.calculateVariance(segments.map(s => s.centroid));
    
    const normalizedStability = 1 - (rmsVariance + centroidVariance / 1000) / 2;
    
    if (normalizedStability > 0.8) return 'veryHigh';
    if (normalizedStability > 0.6) return 'high';
    if (normalizedStability > 0.4) return 'medium';
    if (normalizedStability > 0.2) return 'low';
    return 'veryLow';
  }
  
  detectPeriodicity(values: number[]): string {
    // Автокорреляционный анализ
    const autocorr = this.autocorrelate(values);
    
    // Ищем пики в автокорреляции
    const peaks = this.findPeaks(autocorr);
    const significantPeaks = peaks.filter(p => p.value > 0.3);
    
    if (significantPeaks.length === 0) return 'none';
    if (significantPeaks.length < 3) return 'irregular';
    
    // Проверяем регулярность пиков
    const intervals = [];
    for (let i = 1; i < significantPeaks.length; i++) {
      intervals.push(significantPeaks[i].index - significantPeaks[i-1].index);
    }
    
    const intervalStd = this.calculateStdDev(intervals);
    const intervalMean = this.average(intervals);
    
    if (intervalStd / intervalMean < 0.2) return 'regular';
    if (intervalStd / intervalMean < 0.5) return 'semiRegular';
    return 'irregular';
  }
  
  analyzeEnvelopeShape(rmsValues: number[]): string {
    // Находим максимальный пик
    const maxIndex = rmsValues.indexOf(Math.max(...rmsValues));
    const maxValue = rmsValues[maxIndex];
    
    // Анализ атаки (до пика)
    const attack = maxIndex > 0 ? rmsValues.slice(0, maxIndex) : [];
    const attackSlope = attack.length > 1 ? 
      (maxValue - attack[0]) / attack.length : 0;
    
    // Анализ спада (после пика)
    const decay = maxIndex < rmsValues.length - 1 ? 
      rmsValues.slice(maxIndex) : [];
    const decaySlope = decay.length > 1 ?
      (decay[0] - decay[decay.length-1]) / decay.length : 0;
    
    if (attackSlope > 0.5 && decaySlope < 0.1) return 'impulsive';
    if (attackSlope > 0.2 && decaySlope > 0.2) return 'attackDecay';
    if (attackSlope < 0.05 && decaySlope < 0.05) return 'sustained';
    if (attackSlope > 0.1 && decaySlope < 0.05) return 'pluck';
    
    return 'complex';
  }
  
  calculatePeakToAverage(rmsValues: number[]): number {
    const peak = Math.max(...rmsValues);
    const average = this.average(rmsValues);
    return peak / average;
  }
  
  calculateActivityRatio(segments: any[]): number {
    const activeSegments = segments.filter(s => s.rms > 0.02);
    return activeSegments.length / segments.length;
  }
  
  calculateAvgSilenceDuration(segments: any[], segmentDuration: number): number {
    let silenceDuration = 0;
    let silenceCount = 0;
    let currentSilence = 0;
    
    for (const seg of segments) {
      if (seg.rms < 0.02) {
        currentSilence++;
      } else if (currentSilence > 0) {
        silenceDuration += currentSilence * segmentDuration;
        silenceCount++;
        currentSilence = 0;
      }
    }
    
    return silenceCount > 0 ? silenceDuration / silenceCount : 0;
  }
  
  calculateAvgBurstDuration(segments: any[], segmentDuration: number): number {
    let burstDuration = 0;
    let burstCount = 0;
    let currentBurst = 0;
    
    for (const seg of segments) {
      if (seg.rms >= 0.02) {
        currentBurst++;
      } else if (currentBurst > 0) {
        burstDuration += currentBurst * segmentDuration;
        burstCount++;
        currentBurst = 0;
      }
    }
    
    return burstCount > 0 ? burstDuration / burstCount : 0;
  }
  
  // Вспомогательные методы
  calculateStdDev(values: number[]): number {
    const mean = this.average(values);
    const variance = this.calculateVariance(values);
    return Math.sqrt(variance);
  }
  
  calculateVariance(values: number[]): number {
    const mean = this.average(values);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += Math.pow(values[i] - mean, 2);
    }
    return sum / values.length;
  }
  
  average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  autocorrelate(values: number[]): number[] {
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
  
  findPeaks(values: number[]): { index: number; value: number }[] {
    const peaks = [];
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i-1] && values[i] > values[i+1]) {
        peaks.push({ index: i, value: values[i] });
      }
    }
    return peaks;
  }
}

class TrendsDetectorServiceImpl extends SimpleEventEmitter {
  private config: TrendsDetectorConfig = {
    intervalMs: 30,
    measurementsCount: 100,
  };
  
  private samplesBuffer: TrendsSample[] = [];
  private isCollecting: boolean = false;
  private collectionTimeout: number | null = null;
  private currentSampleIndex: number = 0;
  private patternAnalyzer: TemporalPatternAnalyzer;
  
  constructor() {
    super();
    this.patternAnalyzer = new TemporalPatternAnalyzer(44100);
    console.log('[TrendsDetector] Initialized - Advanced Temporal Pattern Analysis');
  }
  
  setConfig(config: Partial<TrendsDetectorConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('onConfigChanged', this.config);
  }
  
  getConfig(): TrendsDetectorConfig {
    return { ...this.config };
  }
  
  addSample(centroid: number, flux: number, rms: number): void {
    const sample: TrendsSample = {
      centroid,
      flux,
      rms,
      timestamp: Date.now(),
      isValid: this.validateSample(centroid, flux, rms),
    };
    
    this.samplesBuffer.push(sample);
    
    while (this.samplesBuffer.length > this.config.measurementsCount * 2) {
      this.samplesBuffer.shift();
    }
    
    if (this.isCollecting) {
      this.currentSampleIndex++;
      this.emit('onSampleCollected', {
        samplesCount: this.currentSampleIndex,
        totalNeeded: this.config.measurementsCount,
      });
      
      if (this.currentSampleIndex >= this.config.measurementsCount) {
        this.finalizeCollection();
      }
    }
  }
  
  private validateSample(centroid: number, flux: number, rms: number): boolean {
    return !isNaN(centroid) && !isNaN(flux) && !isNaN(rms) && 
           centroid >= 0 && flux >= 0 && rms >= 0;
  }
  
  startCollection(): void {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    this.currentSampleIndex = 0;
    this.emit('onCollectionStarted', {});
    
    const maxDuration = this.config.intervalMs * this.config.measurementsCount * 2;
    this.collectionTimeout = window.setTimeout(() => {
      if (this.isCollecting && this.currentSampleIndex > 0) {
        console.warn('[TrendsDetector] Collection timeout, finalizing with partial data');
        this.finalizeCollection();
      }
    }, maxDuration);
  }
  
  stopCollection(): void {
    if (!this.isCollecting) return;
    
    this.isCollecting = false;
    if (this.collectionTimeout) {
      window.clearTimeout(this.collectionTimeout);
      this.collectionTimeout = null;
    }
    this.emit('onCollectionStopped', {});
  }
  
  reset(): void {
    this.stopCollection();
    this.samplesBuffer = [];
    this.currentSampleIndex = 0;
  }
  
  private finalizeCollection(): void {
    if (!this.isCollecting) return;
    
    this.stopCollection();
    
    const samples = this.samplesBuffer.slice(-this.config.measurementsCount);
    const result = this.analyzeTrends(samples);
    
    this.emit('onDetectionResult', result);
    this.emit('onStateDetected', result);
  }
  
  private analyzeTrends(samples: TrendsSample[]): TrendsDetectionResult {
    console.log('[TrendsDetector] analyzeTrends called with samples:', samples.length);
    console.log('[TrendsDetector] First sample:', samples[0]);
    console.log('[TrendsDetector] Last sample:', samples[samples.length - 1]);
    
    if (samples.length === 0) {
      console.warn('[TrendsDetector] No samples to analyze!');
      return {
        isDetected: true,
        state: 'UNKNOWN',
        stateName: 'Неизвестно',
        stateIcon: '❓',
        stateColor: '#999',
        confidence: 0,
        samples: [],
        analysis: null,
        timestamp: Date.now(),
      };
    }
    
    // Получаем временные паттерны из сэмплов
    const actualPatterns = this.patternAnalyzer.analyzeTemporalPatterns(samples);
    
    // Рассчитываем спектральные характеристики
    const centroidValues = samples.map(s => s.centroid);
    const fluxValues = samples.map(s => s.flux);
    const rmsValues = samples.map(s => s.rms);
    
    const spectralAnalysis = {
      centroidMean: this.calculateMean(centroidValues),
      fluxMean: this.calculateMean(fluxValues),
      rmsMean: this.calculateMean(rmsValues),
    };
    
    // Оценка соответствия каждому состоянию
    const scores: { state: string; score: number; details: any }[] = [];
    
    for (const [stateKey, state] of Object.entries(SOUND_STATES)) {
      // Оценка спектральных характеристик
      let spectralScore = 0;
      let spectralWeight = 0;
      
      // Центр масс
      if (state.thresholds.centroid) {
        const centroidScore = this.calculateMembership(
          spectralAnalysis.centroidMean,
          state.thresholds.centroid.min,
          state.thresholds.centroid.max
        );
        spectralScore += centroidScore * 0.35;
        spectralWeight += 0.35;
      }
      
      // Спектральный поток
      if (state.thresholds.flux) {
        const fluxScore = this.calculateMembership(
          spectralAnalysis.fluxMean,
          state.thresholds.flux.min,
          state.thresholds.flux.max
        );
        spectralScore += fluxScore * 0.25;
        spectralWeight += 0.25;
      }
      
      // Громкость
      if (state.thresholds.rms) {
        const rmsScore = this.calculateMembership(
          spectralAnalysis.rmsMean,
          state.thresholds.rms.min,
          state.thresholds.rms.max
        );
        spectralScore += rmsScore * 0.2;
        spectralWeight += 0.2;
      }
      
      spectralScore = spectralWeight > 0 ? spectralScore / spectralWeight : 0;
      
      // Оценка временных паттернов
      const temporalScore = this.calculateTemporalScore(actualPatterns, state.temporalPatterns);
      
      // Итоговая оценка (40% спектр, 60% временные паттерны)
      const totalScore = (spectralScore * 0.4 + temporalScore * 0.6) * 100;
      
      scores.push({
        state: stateKey,
        score: totalScore,
        details: {
          spectralScore: spectralScore * 100,
          temporalScore: temporalScore * 100,
          patterns: actualPatterns,
        },
      });
    }
    
    // Сортируем по убыванию
    scores.sort((a, b) => b.score - a.score);
    const bestMatch = scores[0];
    const state = getSoundStateByKey(bestMatch.state);

     
    const result = {
      isDetected: true,
      state: bestMatch.state,
      stateName: state?.name || 'Неизвестно',
      stateIcon: state?.icon || '❓',
      stateColor: state?.color || '#999',
      confidence: bestMatch.score,
      samples: samples,
      analysis: {
        scores,
        patterns: actualPatterns,
        spectral: spectralAnalysis,
        bestMatchDetails: bestMatch.details,
      },
      timestamp: Date.now(),
    };
  
    console.log('[TrendsDetector] Analysis result:', {
      state: bestMatch.state,
      stateName: state?.name,
      confidence: bestMatch.score,
      hasAnalysis: !!result.analysis,
    });
    
    return result;
  }
  
  
  private calculateTemporalScore(actualPatterns: any, expectedPatterns: any): number {
    let score = 0;
    let totalWeight = 0;
    
    // Статистики
    const stats = ['centroidStd', 'fluxStd', 'rmsStd'];
    for (const stat of stats) {
      if (expectedPatterns[stat] && actualPatterns[stat] !== undefined) {
        const statScore = this.calculateMembership(
          actualPatterns[stat],
          expectedPatterns[stat].min,
          expectedPatterns[stat].max
        );
        score += statScore * 0.1;
        totalWeight += 0.1;
      }
    }
    
    // Активность
    if (expectedPatterns.activityRatio && actualPatterns.activityRatio !== undefined) {
      const activityScore = this.calculateMembership(
        actualPatterns.activityRatio,
        expectedPatterns.activityRatio.min,
        expectedPatterns.activityRatio.max
      );
      score += activityScore * 0.15;
      totalWeight += 0.15;
    }
    
    // Паузы
    if (expectedPatterns.avgSilenceDuration && actualPatterns.avgSilenceDuration !== undefined) {
      const silenceScore = this.calculateMembership(
        actualPatterns.avgSilenceDuration,
        expectedPatterns.avgSilenceDuration.min,
        expectedPatterns.avgSilenceDuration.max
      );
      score += silenceScore * 0.1;
      totalWeight += 0.1;
    }
    
    // Длительность всплесков
    if (expectedPatterns.avgBurstDuration && actualPatterns.avgBurstDuration !== undefined) {
      const burstScore = this.calculateMembership(
        actualPatterns.avgBurstDuration,
        expectedPatterns.avgBurstDuration.min,
        expectedPatterns.avgBurstDuration.max
      );
      score += burstScore * 0.1;
      totalWeight += 0.1;
    }
    
    // Частотные скачки
    if (expectedPatterns.frequencyJumps && expectedPatterns.frequencyJumps.enabled && actualPatterns.frequencyJumps) {
      const jumps = actualPatterns.frequencyJumps;
      const expectedJumps = expectedPatterns.frequencyJumps;
      
      if (jumps.actualJumps >= expectedJumps.minJumpsRequired) {
        const densityScore = Math.min(1, jumps.densityPerSecond / expectedJumps.densityPerSecond.max);
        score += densityScore * 0.15;
        totalWeight += 0.15;
      } else if (expectedJumps.enabled === false) {
        // Если скачки не ожидаются, штрафуем за их наличие
        const noJumpsScore = jumps.actualJumps === 0 ? 1 : Math.max(0, 1 - jumps.actualJumps / 10);
        score += noJumpsScore * 0.15;
        totalWeight += 0.15;
      }
    }
    
    // Тренды
    if (expectedPatterns.volumeTrend && actualPatterns.volumeTrend) {
      const trendMatch = expectedPatterns.volumeTrend.includes(actualPatterns.volumeTrend);
      score += (trendMatch ? 1 : 0.3) * 0.1;
      totalWeight += 0.1;
    }
    
    if (expectedPatterns.frequencyTrend && actualPatterns.frequencyTrend) {
      const trendMatch = expectedPatterns.frequencyTrend.includes(actualPatterns.frequencyTrend);
      score += (trendMatch ? 1 : 0.3) * 0.1;
      totalWeight += 0.1;
    }
    
    // Стабильность
    if (expectedPatterns.longTermStability && actualPatterns.longTermStability) {
      const stabilityLevels = ['veryLow', 'low', 'medium', 'high', 'veryHigh'];
      const expectedIndex = stabilityLevels.indexOf(expectedPatterns.longTermStability[0]);
      const actualIndex = stabilityLevels.indexOf(actualPatterns.longTermStability);
      const stabilityScore = 1 - Math.abs(expectedIndex - actualIndex) / 4;
      score += stabilityScore * 0.1;
      totalWeight += 0.1;
    }
    
    // Периодичность
    if (expectedPatterns.periodicity && actualPatterns.periodicity) {
      const periodicityMatch = expectedPatterns.periodicity.includes(actualPatterns.periodicity);
      score += (periodicityMatch ? 1 : 0.4) * 0.1;
      totalWeight += 0.1;
    }
    
    // Форма огибающей
    if (expectedPatterns.envelopeShape && actualPatterns.envelopeShape) {
      const envelopeMatch = expectedPatterns.envelopeShape.includes(actualPatterns.envelopeShape);
      score += (envelopeMatch ? 1 : 0.3) * 0.05;
      totalWeight += 0.05;
    }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }
  
  private calculateMembership(value: number, min: number, max: number): number {
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
  
  private calculateMean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  getStatus(): {
    isCollecting: boolean;
    samplesCollected: number;
    currentSample: number;
    bufferSize: number;
  } {
    return {
      isCollecting: this.isCollecting,
      samplesCollected: this.currentSampleIndex,
      currentSample: this.currentSampleIndex,
      bufferSize: this.samplesBuffer.length,
    };
  }
}

export const trendsDetector = new TrendsDetectorServiceImpl();