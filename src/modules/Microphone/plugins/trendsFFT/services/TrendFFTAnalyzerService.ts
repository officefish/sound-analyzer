import { 
  TrendsSample, 
  TrendsDetectionResult, 
  TrendsDetectorConfig,
  SOUND_STATES,
} from '../types';
import { getSoundStateByKey } from '../soundStateUtils';
import { 
    unifiedAnalyzer, 
    AudioFrame } from '../../../../../services/fft/UnifiedAnalyzerFFT.service';

// Простой EventEmitter (оставляем без изменений)
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

export class TrendsDetectorServiceImpl extends SimpleEventEmitter {
  private config: TrendsDetectorConfig = {
    intervalMs: 30,
    measurementsCount: 100,
  };
  
  private samplesBuffer: TrendsSample[] = [];
  private framesBuffer: AudioFrame[] = []; // Новый буфер для унифицированных фреймов
  private isCollecting: boolean = false;
  private collectionTimeout: number | null = null;
  private currentSampleIndex: number = 0;
  private currentWindowStates: Map<number, string> = new Map();
  private patterns: Record<string, any> = SOUND_STATES;

  constructor() {
    super();
    // Обновляем конфигурацию унифицированного анализатора
    unifiedAnalyzer.updateConfig({
      intervalMs: this.config.intervalMs,
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      minRMS: 0.02
    });
    console.log('[TrendsDetector] Initialized with UnifiedAudioAnalyzer');
  }
  
  setConfig(config: Partial<TrendsDetectorConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Синхронизируем конфигурацию с унифицированным анализатором
    unifiedAnalyzer.updateConfig({
      intervalMs: this.config.intervalMs
    });
    
    this.emit('onConfigChanged', this.config);
  }
  
  getConfig(): TrendsDetectorConfig {
    return { ...this.config };
  }
  
  addSample(centroid: number, flux: number, rms: number): void {
    const timestamp = Date.now();
    
    const sample: TrendsSample = {
      centroid,
      flux,
      rms,
      timestamp,
      isValid: this.validateSample(centroid, flux, rms),
      state: null,
      stateConfidence: 0,
    };
    
    // Создаем унифицированный фрейм
    const frame: AudioFrame = {
      index: this.samplesBuffer.length,
      timestamp: timestamp / 1000,
      centroid,
      flux,
      rms,
      isActive: rms > 0.02
    };
    
    this.samplesBuffer.push(sample);
    this.framesBuffer.push(frame);
    
    // Ограничиваем размер буфера
    while (this.samplesBuffer.length > this.config.measurementsCount * 2) {
      this.samplesBuffer.shift();
      this.framesBuffer.shift();
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
  
  protected analyzeCurrentWindow(): void {
    const windowSize = Math.max(5, Math.floor(this.config.measurementsCount / 20));
    const currentWindowStart = Math.max(0, this.currentSampleIndex - windowSize);
    const windowFrames = this.framesBuffer.slice(currentWindowStart, this.currentSampleIndex);
    
    if (windowFrames.length >= windowSize / 2) {
      // Используем унифицированный анализатор для окна
      const windowResult = this.analyzeWithUnifiedAnalyzer(windowFrames);
      
      for (let i = 0; i < windowFrames.length; i++) {
        const sampleIndex = currentWindowStart + i;
        if (this.samplesBuffer[sampleIndex]) {
          this.samplesBuffer[sampleIndex].state = windowResult.state;
          this.samplesBuffer[sampleIndex].stateConfidence = windowResult.confidence;
          this.currentWindowStates.set(sampleIndex, windowResult.state);
        }
      }
      
      this.emit('onWindowAnalyzed', {
        windowIndex: Math.floor(currentWindowStart / windowSize),
        state: windowResult.state,
        stateName: windowResult.stateName,
        confidence: windowResult.confidence,
      });
    }
  }
  
  /**
   * НОВЫЙ МЕТОД: Использует унифицированный анализатор для вычисления паттернов
   */
  protected analyzeWithUnifiedAnalyzer(frames: AudioFrame[]): TrendsDetectionResult {
    if (frames.length === 0) {
      return this.createUnknownResult();
    }
    
    // Вычисляем статистику и паттерны через унифицированный анализатор
    const statistics = this.calculateStatistics(frames);
    const duration = frames.length > 0 
      ? frames[frames.length - 1].timestamp - frames[0].timestamp 
      : 0;
    const temporalPatterns = this.analyzeTemporalPatternsFromFrames(frames, duration);
    
    const spectralAnalysis = {
      centroidMean: statistics.centroid.mean,
      fluxMean: statistics.flux.mean,
      rmsMean: statistics.rms.mean,
    };
    
    // Оцениваем каждый паттерн
    const scores: { state: string; score: number; details: any }[] = [];
    
    for (const [stateKey, state] of Object.entries(this.patterns)) {
      // Спектральная оценка (30% веса)
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
      
      spectralScore = spectralWeight > 0 ? spectralScore / spectralWeight : 0;
      
      // Временная оценка (70% веса) - используем unified паттерны
      const temporalScore = this.calculateTemporalScoreUnified(temporalPatterns, state.temporalPatterns);
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
    const state = getSoundStateByKey(bestMatch.state);
    
    return {
      isDetected: true,
      state: bestMatch.state,
      stateName: state?.name || 'Неизвестно',
      stateIcon: state?.icon || '❓',
      stateColor: state?.color || '#999',
      confidence: bestMatch.score,
      samples: this.framesToSamples(frames),
      analysis: {
        scores,
        patterns: temporalPatterns,
        spectral: spectralAnalysis,
        bestMatchDetails: bestMatch.details,
      },
      timestamp: Date.now(),
    };
  }
  
  /**
   * Вычисление статистики из фреймов
   */
  protected calculateStatistics(frames: AudioFrame[]): {
    centroid: { min: number; max: number; mean: number; std: number };
    flux: { min: number; max: number; mean: number; std: number };
    rms: { min: number; max: number; mean: number; std: number };
  } {
    const centroids = frames.map(f => f.centroid);
    const fluxes = frames.map(f => f.flux);
    const rmsValues = frames.map(f => f.rms);
    
    return {
      centroid: {
        min: Math.min(...centroids),
        max: Math.max(...centroids),
        mean: this.calculateMean(centroids),
        std: this.calculateStdDev(centroids)
      },
      flux: {
        min: Math.min(...fluxes),
        max: Math.max(...fluxes),
        mean: this.calculateMean(fluxes),
        std: this.calculateStdDev(fluxes)
      },
      rms: {
        min: Math.min(...rmsValues),
        max: Math.max(...rmsValues),
        mean: this.calculateMean(rmsValues),
        std: this.calculateStdDev(rmsValues)
      }
    };
  }
  
  /**
   * Анализ временных паттернов из фреймов (унифицированная версия)
   */
  protected analyzeTemporalPatternsFromFrames(frames: AudioFrame[], duration: number): any {
    const rmsValues = frames.map(f => f.rms);
    const centroidValues = frames.map(f => f.centroid);
    const fluxValues = frames.map(f => f.flux);
    
    // Вариабельность
    const centroidStd = this.calculateStdDev(centroidValues);
    const fluxStd = this.calculateStdDev(fluxValues);
    const rmsStd = this.calculateStdDev(rmsValues);
    
    // Активность и паузы
    const segmentDuration = duration / frames.length;
    let activeFrames = 0;
    let silenceDuration = 0;
    let silenceCount = 0;
    let currentSilence = 0;
    let burstDuration = 0;
    let burstCount = 0;
    let currentBurst = 0;
    
    for (const frame of frames) {
      if (frame.isActive) {
        activeFrames++;
        if (currentSilence > 0) {
          silenceDuration += currentSilence * segmentDuration;
          silenceCount++;
          currentSilence = 0;
        }
        currentBurst++;
      } else {
        if (currentBurst > 0) {
          burstDuration += currentBurst * segmentDuration;
          burstCount++;
          currentBurst = 0;
        }
        currentSilence++;
      }
    }
    
    if (currentBurst > 0) {
      burstDuration += currentBurst * segmentDuration;
      burstCount++;
    }
    
    const activityRatio = activeFrames / frames.length;
    const avgSilenceDuration = silenceCount > 0 ? silenceDuration / silenceCount : 0;
    const avgBurstDuration = burstCount > 0 ? burstDuration / burstCount : 0;
    
    // Частотные скачки
    const jumps: number[] = [];
    for (let i = 1; i < frames.length; i++) {
      const jump = Math.abs(frames[i].centroid - frames[i-1].centroid);
      if (jump > 50) jumps.push(jump);
    }
    
    const frequencyJumps = {
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
    
    // Тренды
    const volumeTrend = this.analyzeTrend(rmsValues);
    const frequencyTrend = this.analyzeTrend(centroidValues);
    
    // Стабильность
    const longTermStability = this.calculateStability(frames);
    
    // Периодичность
    const periodicity = this.detectPeriodicity(rmsValues);
    
    // Форма огибающей
    const envelopeShape = this.analyzeEnvelopeShape(rmsValues);
    const peakToAverageRatio = this.calculatePeakToAverage(rmsValues);
    
    return {
      centroidStd,
      fluxStd,
      rmsStd,
      activityRatio,
      avgSilenceDuration,
      avgBurstDuration,
      frequencyJumps,
      volumeTrend,
      frequencyTrend,
      longTermStability,
      periodicity,
      envelopeShape,
      peakToAverageRatio
    };
  }
  
  /**
   * Унифицированная версия calculateTemporalScore
   */
  protected calculateTemporalScoreUnified(actualPatterns: any, expectedPatterns: any): number {
    let score = 0;
    let totalWeight = 0;
    
    // Веса для разных паттернов (отдаем приоритет трендам)
    const weights = {
      centroidStd: 0.08,
      fluxStd: 0.08,
      rmsStd: 0.08,
      activityRatio: 0.12,
      avgSilenceDuration: 0.08,
      avgBurstDuration: 0.08,
      frequencyJumps: 0.12,
      volumeTrend: 0.12,
      frequencyTrend: 0.12,
      longTermStability: 0.08,
      periodicity: 0.06,
      envelopeShape: 0.04,
      peakToAverageRatio: 0.04,
    };
    
    for (const [key, weight] of Object.entries(weights)) {
      const expected = expectedPatterns[key];
      const actual = actualPatterns[key];
      
      if (expected && actual !== undefined) {
        let patternScore = 0;
        
        if (key === 'frequencyJumps' && expected.enabled !== undefined) {
          // Специальная обработка для скачков
          if (expected.enabled) {
            patternScore = actual.actualJumps >= expected.minJumpsRequired ? 1 : 
                          actual.actualJumps / expected.minJumpsRequired;
          } else {
            patternScore = actual.actualJumps === 0 ? 1 : Math.max(0, 1 - actual.actualJumps / 10);
          }
        } 
        else if (Array.isArray(expected)) {
          // Категориальные паттерны
          patternScore = expected.includes(actual) ? 1 : 0.3;
        }
        else if (expected.min !== undefined && expected.max !== undefined) {
          // Числовые диапазоны
          patternScore = this.calculateMembership(actual, expected.min, expected.max);
        }
        else if (typeof expected === 'string') {
          // Прямое сравнение строк
          patternScore = expected === actual ? 1 : 0.4;
        }
        
        score += patternScore * weight;
        totalWeight += weight;
      }
    }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }
  
  protected analyzeTrend(values: number[]): string {
    if (values.length < 10) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length/2));
    const secondHalf = values.slice(Math.floor(values.length/2));
    const firstAvg = this.calculateMean(firstHalf);
    const secondAvg = this.calculateMean(secondHalf);
    
    const ratio = secondAvg / firstAvg;
    
    if (ratio > 1.5) return 'increasing';
    if (ratio < 0.67) return 'decreasing';
    
    const variance = this.calculateVariance(values);
    if (variance > 0.1 * firstAvg) return 'oscillating';
    
    return 'stable';
  }
  
  protected calculateStability(frames: AudioFrame[]): string {
    const rmsVariance = this.calculateVariance(frames.map(f => f.rms));
    const centroidVariance = this.calculateVariance(frames.map(f => f.centroid)) / 1000;
    
    const normalizedStability = 1 - (rmsVariance + centroidVariance) / 2;
    
    if (normalizedStability > 0.8) return 'veryHigh';
    if (normalizedStability > 0.6) return 'high';
    if (normalizedStability > 0.4) return 'medium';
    if (normalizedStability > 0.2) return 'low';
    return 'veryLow';
  }
  
  protected detectPeriodicity(values: number[]): string {
    const autocorr = this.autocorrelate(values);
    const peaks = this.findPeaks(autocorr);
    const significantPeaks = peaks.filter(p => p.value > 0.3);
    
    if (significantPeaks.length === 0) return 'none';
    if (significantPeaks.length < 3) return 'irregular';
    
    const intervals = [];
    for (let i = 1; i < significantPeaks.length; i++) {
      intervals.push(significantPeaks[i].index - significantPeaks[i-1].index);
    }
    
    const intervalStd = this.calculateStdDev(intervals);
    const intervalMean = this.calculateMean(intervals);
    
    if (intervalStd / intervalMean < 0.2) return 'regular';
    if (intervalStd / intervalMean < 0.5) return 'semiRegular';
    return 'irregular';
  }
  
  protected analyzeEnvelopeShape(rmsValues: number[]): string {
    const maxIndex = rmsValues.indexOf(Math.max(...rmsValues));
    const maxValue = rmsValues[maxIndex];
    
    const attack = maxIndex > 0 ? rmsValues.slice(0, maxIndex) : [];
    const attackSlope = attack.length > 1 ? 
      (maxValue - attack[0]) / attack.length : 0;
    
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
  
  protected calculatePeakToAverage(rmsValues: number[]): number {
    const peak = Math.max(...rmsValues);
    const average = this.calculateMean(rmsValues);
    return peak / average;
  }
  
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
  
  protected findPeaks(values: number[]): { index: number; value: number }[] {
    const peaks = [];
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i-1] && values[i] > values[i+1]) {
        peaks.push({ index: i, value: values[i] });
      }
    }
    return peaks;
  }
  
  protected framesToSamples(frames: AudioFrame[]): TrendsSample[] {
    return frames.map(frame => ({
      centroid: frame.centroid,
      flux: frame.flux,
      rms: frame.rms,
      timestamp: frame.timestamp * 1000,
      isValid: frame.rms > 0,
      state: null,
      stateConfidence: 0
    }));
  }
  
  protected validateSample(centroid: number, flux: number, rms: number): boolean {
    return !isNaN(centroid) && !isNaN(flux) && !isNaN(rms) && 
           centroid >= 0 && flux >= 0 && rms >= 0;
  }
  
  startCollection(): void {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    this.currentSampleIndex = 0;
    this.currentWindowStates.clear();
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
    this.framesBuffer = [];
    this.currentSampleIndex = 0;
    this.currentWindowStates.clear();
  }
  
  protected finalizeCollection(): void {
    if (!this.isCollecting) return;
    
    this.stopCollection();
    
    const frames = this.framesBuffer.slice(-this.config.measurementsCount);
    const result = this.analyzeWithUnifiedAnalyzer(frames);
    
    this.emit('onDetectionResult', result);
    this.emit('onStateDetected', result);
  }
  
  protected createUnknownResult(): TrendsDetectionResult {
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
  
  protected calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  protected calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
  
  protected calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  setPatterns(patterns: Record<string, any>): void {
    this.patterns = patterns;
    console.log('[TrendsDetector] Patterns updated:', Object.keys(patterns));
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


// // Простой EventEmitter
// class SimpleEventEmitter {
//   private events: Map<string, Function[]> = new Map();
  
//   on(event: string, callback: Function): void {
//     if (!this.events.has(event)) this.events.set(event, []);
//     this.events.get(event)!.push(callback);
//   }
  
//   off(event: string, callback: Function): void {
//     const callbacks = this.events.get(event);
//     if (callbacks) {
//       const index = callbacks.indexOf(callback);
//       if (index !== -1) callbacks.splice(index, 1);
//     }
//   }
  
//   emit(event: string, data: any): void {
//     const callbacks = this.events.get(event);
//     if (callbacks) {
//       callbacks.forEach(callback => {
//         try { callback(data); } catch (error) { console.error(error); }
//       });
//     }
//   }
  
//   removeAllListeners(event?: string): void {
//     if (event) this.events.delete(event);
//     else this.events.clear();
//   }
// }

// class TemporalPatternAnalyzer {
//   private sampleRate: number;
  
//   constructor(sampleRate: number = 44100) {
//     this.sampleRate = sampleRate;
//   }
  
//   analyzeTemporalPatterns(samples: TrendsSample[]): any {
//     const segmentDuration = 0.05; // 50ms сегменты
//     const segments = samples.map(sample => ({
//       rms: sample.rms,
//       centroid: sample.centroid,
//       flux: sample.flux,
//     }));
    
//     // Анализ паттернов
//     const patterns = {
//       // Статистики
//       centroidStd: this.calculateStdDev(segments.map(s => s.centroid)),
//       fluxStd: this.calculateStdDev(segments.map(s => s.flux)),
//       rmsStd: this.calculateStdDev(segments.map(s => s.rms)),
      
//       // Активность и паузы
//       activityRatio: this.calculateActivityRatio(segments),
//       avgSilenceDuration: this.calculateAvgSilenceDuration(segments, segmentDuration),
//       avgBurstDuration: this.calculateAvgBurstDuration(segments, segmentDuration),
      
//       // Частотные скачки
//       frequencyJumps: this.detectFrequencyJumps(segments, samples.length * 0.03),
      
//       // Тренды
//       volumeTrend: this.analyzeTrend(segments.map(s => s.rms)),
//       frequencyTrend: this.analyzeTrend(segments.map(s => s.centroid)),
      
//       // Стабильность
//       longTermStability: this.calculateStability(segments),
//       periodicity: this.detectPeriodicity(segments.map(s => s.rms)),
      
//       // Огибающая
//       envelopeShape: this.analyzeEnvelopeShape(segments.map(s => s.rms)),
//       peakToAverageRatio: this.calculatePeakToAverage(segments.map(s => s.rms)),
//     };
    
//     return patterns;
//   }
  
//   detectFrequencyJumps(segments: any[], duration: number): any {
//     const jumps: number[] = [];
//     for (let i = 1; i < segments.length; i++) {
//       const jump = Math.abs(segments[i].centroid - segments[i-1].centroid);
//       if (jump > 50) {
//         jumps.push(jump);
//       }
//     }
    
//     const jumpsPerSecond = jumps.length / duration;
    
//     return {
//       enabled: jumps.length > 3,
//       magnitudeRange: jumps.length > 0 ? {
//         min: Math.min(...jumps),
//         max: Math.max(...jumps),
//         avg: jumps.reduce((a, b) => a + b, 0) / jumps.length
//       } : { min: 0, max: 0, avg: 0 },
//       densityPerSecond: jumpsPerSecond,
//       minJumpsRequired: 5,
//       actualJumps: jumps.length,
//       magnitudes: jumps
//     };
//   }
  
//   analyzeTrend(values: number[]): string {
//     if (values.length < 10) return 'stable';
    
//     const firstHalf = values.slice(0, Math.floor(values.length/2));
//     const secondHalf = values.slice(Math.floor(values.length/2));
//     const firstAvg = this.average(firstHalf);
//     const secondAvg = this.average(secondHalf);
    
//     const ratio = secondAvg / firstAvg;
    
//     if (ratio > 1.5) return 'increasing';
//     if (ratio < 0.67) return 'decreasing';
    
//     const variance = this.calculateVariance(values);
//     if (variance > 0.1 * firstAvg) return 'oscillating';
    
//     return 'stable';
//   }
  
//   calculateStability(segments: any[]): string {
//     const rmsVariance = this.calculateVariance(segments.map(s => s.rms));
//     const centroidVariance = this.calculateVariance(segments.map(s => s.centroid));
    
//     const normalizedStability = 1 - (rmsVariance + centroidVariance / 1000) / 2;
    
//     if (normalizedStability > 0.8) return 'veryHigh';
//     if (normalizedStability > 0.6) return 'high';
//     if (normalizedStability > 0.4) return 'medium';
//     if (normalizedStability > 0.2) return 'low';
//     return 'veryLow';
//   }
  
//   detectPeriodicity(values: number[]): string {
//     const autocorr = this.autocorrelate(values);
//     const peaks = this.findPeaks(autocorr);
//     const significantPeaks = peaks.filter(p => p.value > 0.3);
    
//     if (significantPeaks.length === 0) return 'none';
//     if (significantPeaks.length < 3) return 'irregular';
    
//     const intervals = [];
//     for (let i = 1; i < significantPeaks.length; i++) {
//       intervals.push(significantPeaks[i].index - significantPeaks[i-1].index);
//     }
    
//     const intervalStd = this.calculateStdDev(intervals);
//     const intervalMean = this.average(intervals);
    
//     if (intervalStd / intervalMean < 0.2) return 'regular';
//     if (intervalStd / intervalMean < 0.5) return 'semiRegular';
//     return 'irregular';
//   }
  
//   analyzeEnvelopeShape(rmsValues: number[]): string {
//     const maxIndex = rmsValues.indexOf(Math.max(...rmsValues));
//     const maxValue = rmsValues[maxIndex];
    
//     const attack = maxIndex > 0 ? rmsValues.slice(0, maxIndex) : [];
//     const attackSlope = attack.length > 1 ? 
//       (maxValue - attack[0]) / attack.length : 0;
    
//     const decay = maxIndex < rmsValues.length - 1 ? 
//       rmsValues.slice(maxIndex) : [];
//     const decaySlope = decay.length > 1 ?
//       (decay[0] - decay[decay.length-1]) / decay.length : 0;
    
//     if (attackSlope > 0.5 && decaySlope < 0.1) return 'impulsive';
//     if (attackSlope > 0.2 && decaySlope > 0.2) return 'attackDecay';
//     if (attackSlope < 0.05 && decaySlope < 0.05) return 'sustained';
//     if (attackSlope > 0.1 && decaySlope < 0.05) return 'pluck';
    
//     return 'complex';
//   }
  
//   calculatePeakToAverage(rmsValues: number[]): number {
//     const peak = Math.max(...rmsValues);
//     const average = this.average(rmsValues);
//     return peak / average;
//   }
  
//   calculateActivityRatio(segments: any[]): number {
//     const activeSegments = segments.filter(s => s.rms > 0.02);
//     return activeSegments.length / segments.length;
//   }
  
//   calculateAvgSilenceDuration(segments: any[], segmentDuration: number): number {
//     let silenceDuration = 0;
//     let silenceCount = 0;
//     let currentSilence = 0;
    
//     for (const seg of segments) {
//       if (seg.rms < 0.02) {
//         currentSilence++;
//       } else if (currentSilence > 0) {
//         silenceDuration += currentSilence * segmentDuration;
//         silenceCount++;
//         currentSilence = 0;
//       }
//     }
    
//     return silenceCount > 0 ? silenceDuration / silenceCount : 0;
//   }
  
//   calculateAvgBurstDuration(segments: any[], segmentDuration: number): number {
//     let burstDuration = 0;
//     let burstCount = 0;
//     let currentBurst = 0;
    
//     for (const seg of segments) {
//       if (seg.rms >= 0.02) {
//         currentBurst++;
//       } else if (currentBurst > 0) {
//         burstDuration += currentBurst * segmentDuration;
//         burstCount++;
//         currentBurst = 0;
//       }
//     }
    
//     return burstCount > 0 ? burstDuration / burstCount : 0;
//   }
  
//   calculateStdDev(values: number[]): number {
//     const mean = this.average(values);
//     const variance = this.calculateVariance(values);
//     return Math.sqrt(variance);
//   }
  
//   calculateVariance(values: number[]): number {
//     const mean = this.average(values);
//     let sum = 0;
//     for (let i = 0; i < values.length; i++) {
//       sum += Math.pow(values[i] - mean, 2);
//     }
//     return sum / values.length;
//   }
  
//   average(values: number[]): number {
//     if (values.length === 0) return 0;
//     return values.reduce((a, b) => a + b, 0) / values.length;
//   }
  
//   autocorrelate(values: number[]): number[] {
//     const result = new Array(values.length);
//     for (let i = 0; i < values.length; i++) {
//       let sum = 0;
//       for (let j = 0; j < values.length - i; j++) {
//         sum += values[j] * values[j + i];
//       }
//       result[i] = sum / (values.length - i);
//     }
//     return result;
//   }
  
//   findPeaks(values: number[]): { index: number; value: number }[] {
//     const peaks = [];
//     for (let i = 1; i < values.length - 1; i++) {
//       if (values[i] > values[i-1] && values[i] > values[i+1]) {
//         peaks.push({ index: i, value: values[i] });
//       }
//     }
//     return peaks;
//   }
// }

// export class TrendsDetectorServiceImpl extends SimpleEventEmitter {
//   private config: TrendsDetectorConfig = {
//     intervalMs: 30,
//     measurementsCount: 100,
//   };
  
//   private samplesBuffer: TrendsSample[] = [];
//   private isCollecting: boolean = false;
//   private collectionTimeout: number | null = null;
//   private currentSampleIndex: number = 0;
//   private currentWindowStates: Map<number, string> = new Map(); // ✅ Храним состояния для каждого окна
//   private patterns: Record<string, any> = SOUND_STATES;

//   protected  patternAnalyzer: TemporalPatternAnalyzer;

//   constructor() {
//     super();
//     this.patternAnalyzer = new TemporalPatternAnalyzer(44100);
//     console.log('[TrendsDetector] Initialized - Advanced Temporal Pattern Analysis');
//   }
  
//   setConfig(config: Partial<TrendsDetectorConfig>): void {
//     this.config = { ...this.config, ...config };
//     this.emit('onConfigChanged', this.config);
//   }
  
//   getConfig(): TrendsDetectorConfig {
//     return { ...this.config };
//   }
  
//   addSample(centroid: number, flux: number, rms: number): void {
//     const sample: TrendsSample = {
//       centroid,
//       flux,
//       rms,
//       timestamp: Date.now(),
//       isValid: this.validateSample(centroid, flux, rms),
//       state: null, // ✅ Добавляем поле для состояния
//       stateConfidence: 0, // ✅ Добавляем поле для уверенности
//     };
    
//     this.samplesBuffer.push(sample);
    
//     // ✅ Если идет сбор данных, анализируем каждое окно
//     if (this.isCollecting && this.currentSampleIndex > 0) {
//       this.analyzeCurrentWindow();
//     }
    
//     while (this.samplesBuffer.length > this.config.measurementsCount * 2) {
//       this.samplesBuffer.shift();
//     }
    
//     if (this.isCollecting) {
//       this.currentSampleIndex++;
//       this.emit('onSampleCollected', {
//         samplesCount: this.currentSampleIndex,
//         totalNeeded: this.config.measurementsCount,
//       });
      
//       if (this.currentSampleIndex >= this.config.measurementsCount) {
//         this.finalizeCollection();
//       }
//     }
//   }
  
//   // ✅ Новый метод: анализ текущего окна для определения состояния каждого сэмпла
//   private analyzeCurrentWindow(): void {
//     const windowSize = Math.max(5, Math.floor(this.config.measurementsCount / 20)); // 20 окон
//     const currentWindowStart = Math.max(0, this.currentSampleIndex - windowSize);
//     const windowSamples = this.samplesBuffer.slice(currentWindowStart, this.currentSampleIndex);
    
//     if (windowSamples.length >= windowSize / 2) {
//       const windowResult = this.analyzeTrendsForWindow(windowSamples);
      
//       // Сохраняем состояние для каждого сэмпла в окне
//       for (let i = 0; i < windowSamples.length; i++) {
//         const sampleIndex = currentWindowStart + i;
//         if (this.samplesBuffer[sampleIndex]) {
//           this.samplesBuffer[sampleIndex].state = windowResult.state;
//           this.samplesBuffer[sampleIndex].stateConfidence = windowResult.confidence;
//           this.currentWindowStates.set(sampleIndex, windowResult.state);
//         }
//       }
      
//       this.emit('onWindowAnalyzed', {
//         windowIndex: Math.floor(currentWindowStart / windowSize),
//         state: windowResult.state,
//         stateName: windowResult.stateName,
//         confidence: windowResult.confidence,
//       });
//     }
//   }
  
//   // ✅ Анализ окна сэмплов (быстрый, для промежуточных результатов)
//   private analyzeTrendsForWindow(samples: TrendsSample[]): TrendsDetectionResult {
//     if (samples.length === 0) {
//       return {
//         isDetected: true,
//         state: 'UNKNOWN',
//         stateName: 'Неизвестно',
//         stateIcon: '❓',
//         stateColor: '#999',
//         confidence: 0,
//         samples: samples,
//         analysis: null,
//         timestamp: Date.now(),
//       };
//     }
    
//     const actualPatterns = this.patternAnalyzer.analyzeTemporalPatterns(samples);
    
//     const centroidValues = samples.map(s => s.centroid);
//     const fluxValues = samples.map(s => s.flux);
//     const rmsValues = samples.map(s => s.rms);
    
//     const spectralAnalysis = {
//       centroidMean: this.calculateMean(centroidValues),
//       fluxMean: this.calculateMean(fluxValues),
//       rmsMean: this.calculateMean(rmsValues),
//     };
    
//     const scores: { state: string; score: number; details: any }[] = [];
    
//     for (const [stateKey, state] of Object.entries(SOUND_STATES)) {
//       let spectralScore = 0;
//       let spectralWeight = 0;
      
//       if (state.thresholds.centroid) {
//         const centroidScore = this.calculateMembership(
//           spectralAnalysis.centroidMean,
//           state.thresholds.centroid.min,
//           state.thresholds.centroid.max
//         );
//         spectralScore += centroidScore * 0.35;
//         spectralWeight += 0.35;
//       }
      
//       if (state.thresholds.flux) {
//         const fluxScore = this.calculateMembership(
//           spectralAnalysis.fluxMean,
//           state.thresholds.flux.min,
//           state.thresholds.flux.max
//         );
//         spectralScore += fluxScore * 0.25;
//         spectralWeight += 0.25;
//       }
      
//       if (state.thresholds.rms) {
//         const rmsScore = this.calculateMembership(
//           spectralAnalysis.rmsMean,
//           state.thresholds.rms.min,
//           state.thresholds.rms.max
//         );
//         spectralScore += rmsScore * 0.2;
//         spectralWeight += 0.2;
//       }
      
//       spectralScore = spectralWeight > 0 ? spectralScore / spectralWeight : 0;
      
//       const temporalScore = this.calculateTemporalScore(actualPatterns, state.temporalPatterns);
//       const totalScore = (spectralScore * 0.4 + temporalScore * 0.6) * 100;
      
//       scores.push({
//         state: stateKey,
//         score: totalScore,
//         details: {
//           spectralScore: spectralScore * 100,
//           temporalScore: temporalScore * 100,
//         },
//       });
//     }
    
//     scores.sort((a, b) => b.score - a.score);
//     const bestMatch = scores[0];
//     const state = getSoundStateByKey(bestMatch.state);
    
//     return {
//       isDetected: true,
//       state: bestMatch.state,
//       stateName: state?.name || 'Неизвестно',
//       stateIcon: state?.icon || '❓',
//       stateColor: state?.color || '#999',
//       confidence: bestMatch.score,
//       samples: samples,
//       analysis: {
//         scores,
//         patterns: actualPatterns,
//         spectral: spectralAnalysis,
//         bestMatchDetails: bestMatch.details,
//       },
//       timestamp: Date.now(),
//     };
//   }
  
//   private validateSample(centroid: number, flux: number, rms: number): boolean {
//     return !isNaN(centroid) && !isNaN(flux) && !isNaN(rms) && 
//            centroid >= 0 && flux >= 0 && rms >= 0;
//   }
  
//   startCollection(): void {
//     if (this.isCollecting) return;
    
//     this.isCollecting = true;
//     this.currentSampleIndex = 0;
//     this.currentWindowStates.clear();
//     this.emit('onCollectionStarted', {});
    
//     const maxDuration = this.config.intervalMs * this.config.measurementsCount * 2;
//     this.collectionTimeout = window.setTimeout(() => {
//       if (this.isCollecting && this.currentSampleIndex > 0) {
//         console.warn('[TrendsDetector] Collection timeout, finalizing with partial data');
//         this.finalizeCollection();
//       }
//     }, maxDuration);
//   }
  
//   stopCollection(): void {
//     if (!this.isCollecting) return;
    
//     this.isCollecting = false;
//     if (this.collectionTimeout) {
//       window.clearTimeout(this.collectionTimeout);
//       this.collectionTimeout = null;
//     }
//     this.emit('onCollectionStopped', {});
//   }
  
//   reset(): void {
//     this.stopCollection();
//     this.samplesBuffer = [];
//     this.currentSampleIndex = 0;
//     this.currentWindowStates.clear();
//   }
  
//   private finalizeCollection(): void {
//     if (!this.isCollecting) return;
    
//     this.stopCollection();
    
//     const samples = this.samplesBuffer.slice(-this.config.measurementsCount);
//     const result = this.analyzeTrends(samples);
    
//     this.emit('onDetectionResult', result);
//     this.emit('onStateDetected', result);
//   }
  
//   private analyzeTrends(samples: TrendsSample[]): TrendsDetectionResult {
//     console.log('[TrendsDetector] analyzeTrends called with samples:', samples.length);
    
//     if (samples.length === 0) {
//       console.warn('[TrendsDetector] No samples to analyze!');
//       return {
//         isDetected: true,
//         state: 'UNKNOWN',
//         stateName: 'Неизвестно',
//         stateIcon: '❓',
//         stateColor: '#999',
//         confidence: 0,
//         samples: [],
//         analysis: null,
//         timestamp: Date.now(),
//       };
//     }
    
//     const actualPatterns = this.patternAnalyzer.analyzeTemporalPatterns(samples);
    
//     const centroidValues = samples.map(s => s.centroid);
//     const fluxValues = samples.map(s => s.flux);
//     const rmsValues = samples.map(s => s.rms);
    
//     const spectralAnalysis = {
//       centroidMean: this.calculateMean(centroidValues),
//       fluxMean: this.calculateMean(fluxValues),
//       rmsMean: this.calculateMean(rmsValues),
//     };
    
//     const scores: { state: string; score: number; details: any }[] = [];
    
//     for (const [stateKey, state] of Object.entries(SOUND_STATES)) {
//       let spectralScore = 0;
//       let spectralWeight = 0;
      
//       if (state.thresholds.centroid) {
//         const centroidScore = this.calculateMembership(
//           spectralAnalysis.centroidMean,
//           state.thresholds.centroid.min,
//           state.thresholds.centroid.max
//         );
//         spectralScore += centroidScore * 0.35;
//         spectralWeight += 0.35;
//       }
      
//       if (state.thresholds.flux) {
//         const fluxScore = this.calculateMembership(
//           spectralAnalysis.fluxMean,
//           state.thresholds.flux.min,
//           state.thresholds.flux.max
//         );
//         spectralScore += fluxScore * 0.25;
//         spectralWeight += 0.25;
//       }
      
//       if (state.thresholds.rms) {
//         const rmsScore = this.calculateMembership(
//           spectralAnalysis.rmsMean,
//           state.thresholds.rms.min,
//           state.thresholds.rms.max
//         );
//         spectralScore += rmsScore * 0.2;
//         spectralWeight += 0.2;
//       }
      
//       spectralScore = spectralWeight > 0 ? spectralScore / spectralWeight : 0;
      
//       const temporalScore = this.calculateTemporalScore(actualPatterns, state.temporalPatterns);
//       const totalScore = (spectralScore * 0.4 + temporalScore * 0.6) * 100;
      
//       scores.push({
//         state: stateKey,
//         score: totalScore,
//         details: {
//           spectralScore: spectralScore * 100,
//           temporalScore: temporalScore * 100,
//           patterns: actualPatterns,
//         },
//       });
//     }
    
//     scores.sort((a, b) => b.score - a.score);
//     const bestMatch = scores[0];
//     const state = getSoundStateByKey(bestMatch.state);
    
//     // ✅ Добавляем состояния для каждого сэмпла из сохраненных окон
//     const enrichedSamples = samples.map((sample, index) => {
//       const globalIndex = this.samplesBuffer.length - samples.length + index;
//       const windowState = this.currentWindowStates.get(globalIndex);
//       if (windowState && !sample.state) {
//         sample.state = windowState;
//       }
//       return sample;
//     });
    
//     const result = {
//       isDetected: true,
//       state: bestMatch.state,
//       stateName: state?.name || 'Неизвестно',
//       stateIcon: state?.icon || '❓',
//       stateColor: state?.color || '#999',
//       confidence: bestMatch.score,
//       samples: enrichedSamples,
//       analysis: {
//         scores,
//         patterns: actualPatterns,
//         spectral: spectralAnalysis,
//         bestMatchDetails: bestMatch.details,
//       },
//       timestamp: Date.now(),
//     };
  
//     console.log('[TrendsDetector] Analysis result:', {
//       state: bestMatch.state,
//       stateName: state?.name,
//       confidence: bestMatch.score,
//       hasAnalysis: !!result.analysis,
//       samplesWithState: enrichedSamples.filter(s => s.state).length,
//     });
    
//     return result;
//   }
  
//   calculateTemporalScore(actualPatterns: any, expectedPatterns: any): number {
//     let score = 0;
//     let totalWeight = 0;
    
//     const stats = ['centroidStd', 'fluxStd', 'rmsStd'];
//     for (const stat of stats) {
//       if (expectedPatterns[stat] && actualPatterns[stat] !== undefined) {
//         const statScore = this.calculateMembership(
//           actualPatterns[stat],
//           expectedPatterns[stat].min,
//           expectedPatterns[stat].max
//         );
//         score += statScore * 0.1;
//         totalWeight += 0.1;
//       }
//     }
    
//     if (expectedPatterns.activityRatio && actualPatterns.activityRatio !== undefined) {
//       const activityScore = this.calculateMembership(
//         actualPatterns.activityRatio,
//         expectedPatterns.activityRatio.min,
//         expectedPatterns.activityRatio.max
//       );
//       score += activityScore * 0.15;
//       totalWeight += 0.15;
//     }
    
//     if (expectedPatterns.avgSilenceDuration && actualPatterns.avgSilenceDuration !== undefined) {
//       const silenceScore = this.calculateMembership(
//         actualPatterns.avgSilenceDuration,
//         expectedPatterns.avgSilenceDuration.min,
//         expectedPatterns.avgSilenceDuration.max
//       );
//       score += silenceScore * 0.1;
//       totalWeight += 0.1;
//     }
    
//     if (expectedPatterns.avgBurstDuration && actualPatterns.avgBurstDuration !== undefined) {
//       const burstScore = this.calculateMembership(
//         actualPatterns.avgBurstDuration,
//         expectedPatterns.avgBurstDuration.min,
//         expectedPatterns.avgBurstDuration.max
//       );
//       score += burstScore * 0.1;
//       totalWeight += 0.1;
//     }
    
//     if (expectedPatterns.frequencyJumps && expectedPatterns.frequencyJumps.enabled && actualPatterns.frequencyJumps) {
//       const jumps = actualPatterns.frequencyJumps;
//       const expectedJumps = expectedPatterns.frequencyJumps;
      
//       if (jumps.actualJumps >= expectedJumps.minJumpsRequired) {
//         const densityScore = Math.min(1, jumps.densityPerSecond / expectedJumps.densityPerSecond.max);
//         score += densityScore * 0.15;
//         totalWeight += 0.15;
//       } else if (expectedJumps.enabled === false) {
//         const noJumpsScore = jumps.actualJumps === 0 ? 1 : Math.max(0, 1 - jumps.actualJumps / 10);
//         score += noJumpsScore * 0.15;
//         totalWeight += 0.15;
//       }
//     }
    
//     if (expectedPatterns.volumeTrend && actualPatterns.volumeTrend) {
//       const trendMatch = expectedPatterns.volumeTrend.includes(actualPatterns.volumeTrend);
//       score += (trendMatch ? 1 : 0.3) * 0.1;
//       totalWeight += 0.1;
//     }
    
//     if (expectedPatterns.frequencyTrend && actualPatterns.frequencyTrend) {
//       const trendMatch = expectedPatterns.frequencyTrend.includes(actualPatterns.frequencyTrend);
//       score += (trendMatch ? 1 : 0.3) * 0.1;
//       totalWeight += 0.1;
//     }
    
//     if (expectedPatterns.longTermStability && actualPatterns.longTermStability) {
//       const stabilityLevels = ['veryLow', 'low', 'medium', 'high', 'veryHigh'];
//       const expectedIndex = stabilityLevels.indexOf(expectedPatterns.longTermStability[0]);
//       const actualIndex = stabilityLevels.indexOf(actualPatterns.longTermStability);
//       const stabilityScore = 1 - Math.abs(expectedIndex - actualIndex) / 4;
//       score += stabilityScore * 0.1;
//       totalWeight += 0.1;
//     }
    
//     if (expectedPatterns.periodicity && actualPatterns.periodicity) {
//       const periodicityMatch = expectedPatterns.periodicity.includes(actualPatterns.periodicity);
//       score += (periodicityMatch ? 1 : 0.4) * 0.1;
//       totalWeight += 0.1;
//     }
    
//     if (expectedPatterns.envelopeShape && actualPatterns.envelopeShape) {
//       const envelopeMatch = expectedPatterns.envelopeShape.includes(actualPatterns.envelopeShape);
//       score += (envelopeMatch ? 1 : 0.3) * 0.05;
//       totalWeight += 0.05;
//     }
    
//     return totalWeight > 0 ? score / totalWeight : 0;
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
  
//   protected calculateMean(values: number[]): number {
//     return values.reduce((a, b) => a + b, 0) / values.length;
//   }

//   setPatterns(patterns: Record<string, any>): void {
//     this.patterns = patterns;
//     console.log('[TrendsDetector] Patterns updated:', Object.keys(patterns));
//   }
  
//   getStatus(): {
//     isCollecting: boolean;
//     samplesCollected: number;
//     currentSample: number;
//     bufferSize: number;
//   } {
//     return {
//       isCollecting: this.isCollecting,
//       samplesCollected: this.currentSampleIndex,
//       currentSample: this.currentSampleIndex,
//       bufferSize: this.samplesBuffer.length,
//     };
//   }


// }

// export const trendsDetector = new TrendsDetectorServiceImpl();

