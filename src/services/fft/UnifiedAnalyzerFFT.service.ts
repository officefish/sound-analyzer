// // src/services/UnifiedAudioAnalyzer.ts



import { FFTService
    , FFT 
} from './FFTCore.service';

// src/services/UnifiedAudioAnalyzer.ts


export interface AudioAnalysisConfig {
  intervalMs: number;
  fftSize: number;
  smoothingTimeConstant: number;
  minRMS: number;
  frequencyRange: {
    min: number;
    max: number;
  };
}

export interface AudioFrame {
  index: number;
  timestamp: number;
  centroid: number;
  flux: number;
  rms: number;
  isActive: boolean;
}

export interface CompleteTemporalPatterns {
  centroidStd: number;
  fluxStd: number;
  rmsStd: number;
  activityRatio: number;
  avgSilenceDuration: number;
  avgBurstDuration: number;
  frequencyJumps: {
    enabled: boolean;
    actualJumps: number;
    densityPerSecond: number;
    minMagnitude: number;
    maxMagnitude: number;
    avgMagnitude: number;
    magnitudes: number[];
  };
  volumeTrend: 'stable' | 'increasing' | 'decreasing' | 'oscillating' | 'modulated' | 'fluctuating';
  frequencyTrend: 'stable' | 'increasing' | 'decreasing' | 'oscillating' | 'modulated' | 'fluctuating';
  longTermStability: 'veryLow' | 'low' | 'medium' | 'high' | 'veryHigh';
  stabilityScore: number;
  periodicity: 'none' | 'irregular' | 'semiRegular' | 'regular';
  periodicityStrength: number;
  envelopeShape: 'impulsive' | 'attackDecay' | 'sustained' | 'pluck' | 'complex';
  attackTime: number;
  decayTime: number;
  attackSlope: number;
  decaySlope: number;
  peakToAverageRatio: number;
  zeroCrossingRate: number;
  spectralRolloff: number;
  spectralFlatness: number;
}

export interface AudioAnalysisResult {
  frames: AudioFrame[];
  duration: number;
  totalFrames: number;
  sampleRate: number;
  statistics: {
    centroid: { min: number; max: number; mean: number; std: number };
    flux: { min: number; max: number; mean: number; std: number };
    rms: { min: number; max: number; mean: number; std: number };
    activityRatio: number;
  };
  temporalPatterns: CompleteTemporalPatterns;
}

class UnifiedAudioAnalyzer {
  private config: AudioAnalysisConfig;
  private previousMagnitudes: Float32Array | null = null;
  private previousSpectrum: Float32Array | null = null;
  private fft: FFTService;
  private complexArray: Float64Array;
  
  constructor(config?: Partial<AudioAnalysisConfig>) {
    this.config = {
      intervalMs: 30,
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      minRMS: 0.02,
      frequencyRange: {
        min: 50,
        max: 15000
      },
      ...config
    };
    
    this.fft = new FFTService(this.config.fftSize);
    this.complexArray = this.fft.createComplexArray();
  }
  
  updateConfig(config: Partial<AudioAnalysisConfig>): void {
    const oldFftSize = this.config.fftSize;
    this.config = { ...this.config, ...config };
    
    if (config.fftSize && config.fftSize !== oldFftSize) {
      this.fft = new FFTService(this.config.fftSize);
      this.complexArray = this.fft.createComplexArray();
    }
  }
  
  /**
   * Анализ AudioBuffer из файла
   */
  async analyzeBuffer(
    audioBuffer: AudioBuffer,
    onProgress?: (progress: number, frame: number, total: number) => void
  ): Promise<AudioAnalysisResult> {
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const intervalSeconds = this.config.intervalMs / 1000;
    const totalFrames = Math.floor(duration / intervalSeconds);
    
    const frames: AudioFrame[] = [];
    const channelData = audioBuffer.getChannelData(0);
    
    this.previousMagnitudes = null;
    this.previousSpectrum = null;
    
    const rmsValues: number[] = [];
    const centroidValues: number[] = [];
    const fluxValues: number[] = [];
    const zeroCrossings: number[] = [];
    
    for (let i = 0; i < totalFrames; i++) {
      const startSample = Math.floor(i * intervalSeconds * sampleRate);
      const endSample = Math.min(
        startSample + Math.floor(intervalSeconds * sampleRate),
        channelData.length
      );
      
      const timeData = new Float32Array(this.config.fftSize);
      const segmentLength = endSample - startSample;
      
      for (let s = 0; s < Math.min(segmentLength, this.config.fftSize); s++) {
        timeData[s] = channelData[startSample + s];
      }
      
      this.fft.realTransform(this.complexArray, timeData);
      const magnitudes = this.fft.getMagnitudes(this.complexArray);
      
      const filteredMagnitudes = this.applyFrequencyFilter(
        magnitudes, 
        sampleRate,
        this.config.frequencyRange.min,
        this.config.frequencyRange.max
      );
      
      const centroid = this.calculateCenterOfMass(filteredMagnitudes, sampleRate);
      const flux = this.calculateSpectralFlux(filteredMagnitudes);
      const rms = this.calculateRMS(timeData);
      const zeroCrossing = this.calculateZeroCrossingRate(timeData);
      
      const normalizedRms = Math.min(rms * 2, 0.5);
      
      frames.push({
        index: i,
        timestamp: i * intervalSeconds,
        centroid: centroid,
        flux: Math.min(flux, 3.0),
        rms: normalizedRms,
        isActive: normalizedRms > this.config.minRMS
      });
      
      centroidValues.push(centroid);
      fluxValues.push(flux);
      rmsValues.push(normalizedRms);
      zeroCrossings.push(zeroCrossing);
      
      if (onProgress && i % Math.max(1, Math.floor(totalFrames / 20)) === 0) {
        onProgress((i / totalFrames) * 100, i, totalFrames);
      }
    }
    
    const statistics = this.calculateStatistics(frames);
    const temporalPatterns = this.calculateCompleteTemporalPatterns(
      frames, 
      centroidValues, 
      fluxValues, 
      rmsValues,
      zeroCrossings,
      duration,
      sampleRate
    );
    
    return {
      frames,
      duration,
      totalFrames,
      sampleRate,
      statistics,
      temporalPatterns
    };
  }
  
  /**
   * Анализ live-фрейма из микрофона
   */
  analyzeLiveFrame(
    timeData: Float32Array,
    sampleRate: number
  ): { centroid: number; flux: number; rms: number; isActive: boolean } {
    this.fft.realTransform(this.complexArray, timeData);
    const magnitudes = this.fft.getMagnitudes(this.complexArray);
    
    const filteredMagnitudes = this.applyFrequencyFilter(
      magnitudes,
      sampleRate,
      this.config.frequencyRange.min,
      this.config.frequencyRange.max
    );
    
    const centroid = this.calculateCenterOfMass(filteredMagnitudes, sampleRate);
    const flux = this.calculateSpectralFlux(filteredMagnitudes);
    const rms = this.calculateRMS(timeData);
    
    const normalizedRms = Math.min(rms * 2, 0.5);
    
    return {
      centroid: centroid,
      flux: Math.min(flux, 3.0),
      rms: normalizedRms,
      isActive: normalizedRms > this.config.minRMS
    };
  }
  
  /**
   * Полный расчет всех временных паттернов
   */
  private calculateCompleteTemporalPatterns(
    frames: AudioFrame[],
    centroidValues: number[],
    fluxValues: number[],
    rmsValues: number[],
    zeroCrossings: number[],
    duration: number,
    sampleRate: number
  ): CompleteTemporalPatterns {
    
    const centroidStd = this.calculateStdDev(centroidValues);
    const fluxStd = this.calculateStdDev(fluxValues);
    const rmsStd = this.calculateStdDev(rmsValues);
    
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
    
    const jumps: number[] = [];
    for (let i = 1; i < centroidValues.length; i++) {
      const jump = Math.abs(centroidValues[i] - centroidValues[i - 1]);
      if (jump > 30) {
        jumps.push(jump);
      }
    }
    
    const frequencyJumps = {
      enabled: jumps.length > 10,
      actualJumps: jumps.length,
      densityPerSecond: jumps.length / duration,
      minMagnitude: jumps.length > 0 ? Math.min(...jumps) : 0,
      maxMagnitude: jumps.length > 0 ? Math.max(...jumps) : 0,
      avgMagnitude: jumps.length > 0 ? this.calculateMean(jumps) : 0,
      magnitudes: jumps
    };
    
    const volumeTrend = this.analyzeTrendDetailed(rmsValues);
    const frequencyTrend = this.analyzeTrendDetailed(centroidValues);
    
    const rmsVariance = this.calculateVariance(rmsValues);
    const centroidVariance = this.calculateVariance(centroidValues) / 1000;
    const stabilityScore = (1 - (rmsVariance + centroidVariance) / 2) * 100;
    
    let longTermStability: 'veryLow' | 'low' | 'medium' | 'high' | 'veryHigh';
    if (stabilityScore > 80) longTermStability = 'veryHigh';
    else if (stabilityScore > 60) longTermStability = 'high';
    else if (stabilityScore > 40) longTermStability = 'medium';
    else if (stabilityScore > 20) longTermStability = 'low';
    else longTermStability = 'veryLow';
    
    const { periodicity, strength: periodicityStrength } = this.detectPeriodicityWithStrength(rmsValues);
    const envelopeAnalysis = this.analyzeEnvelopeDetailed(rmsValues, segmentDuration);
    const peakToAverageRatio = this.calculatePeakToAverage(rmsValues);
    const zeroCrossingRate = this.calculateMean(zeroCrossings);
    const spectralRolloff = this.calculateSpectralRolloff(frames, sampleRate);
    const spectralFlatness = this.calculateSpectralFlatness(frames);
    
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
      stabilityScore,
      periodicity,
      periodicityStrength,
      envelopeShape: envelopeAnalysis.shape,
      attackTime: envelopeAnalysis.attackTime,
      decayTime: envelopeAnalysis.decayTime,
      attackSlope: envelopeAnalysis.attackSlope,
      decaySlope: envelopeAnalysis.decaySlope,
      peakToAverageRatio,
      zeroCrossingRate,
      spectralRolloff,
      spectralFlatness
    };
  }
  
  /**
   * Детальный анализ тренда
   */
  private analyzeTrendDetailed(values: number[]): 'stable' | 'increasing' | 'decreasing' | 'oscillating' | 'modulated' | 'fluctuating' {
    if (values.length < 10) return 'stable';
    
    const segments = 4;
    const segmentSize = Math.floor(values.length / segments);
    const segmentMeans: number[] = [];
    
    for (let i = 0; i < segments; i++) {
      const start = i * segmentSize;
      const end = (i + 1) * segmentSize;
      const segment = values.slice(start, end);
      segmentMeans.push(this.calculateMean(segment));
    }
    
    let increasing = 0;
    let decreasing = 0;
    for (let i = 1; i < segmentMeans.length; i++) {
      if (segmentMeans[i] > segmentMeans[i - 1]) increasing++;
      else if (segmentMeans[i] < segmentMeans[i - 1]) decreasing++;
    }
    
    if (increasing > decreasing && increasing >= 2) return 'increasing';
    if (decreasing > increasing && decreasing >= 2) return 'decreasing';
    
    const variance = this.calculateVariance(values);
    const mean = this.calculateMean(values);
    const relativeVariance = variance / mean;
    
    if (relativeVariance > 0.3) return 'oscillating';
    if (relativeVariance > 0.15) return 'modulated';
    if (relativeVariance > 0.08) return 'fluctuating';
    
    return 'stable';
  }
  
  /**
   * Детекция периодичности с оценкой силы
   */
  private detectPeriodicityWithStrength(values: number[]): { periodicity: 'none' | 'irregular' | 'semiRegular' | 'regular'; strength: number } {
    const autocorr = this.autocorrelate(values);
    const peaks = this.findPeaks(autocorr);
    const significantPeaks = peaks.filter(p => p.value > 0.3);
    
    if (significantPeaks.length === 0) {
      return { periodicity: 'none', strength: 0 };
    }
    
    if (significantPeaks.length < 3) {
      return { periodicity: 'irregular', strength: 0.3 };
    }
    
    const intervals = [];
    for (let i = 1; i < significantPeaks.length; i++) {
      intervals.push(significantPeaks[i].index - significantPeaks[i - 1].index);
    }
    
    const intervalStd = this.calculateStdDev(intervals);
    const intervalMean = this.calculateMean(intervals);
    const cv = intervalStd / intervalMean;
    const strength = Math.max(0, Math.min(1, 1 - cv));
    
    if (cv < 0.15) return { periodicity: 'regular', strength };
    if (cv < 0.35) return { periodicity: 'semiRegular', strength };
    return { periodicity: 'irregular', strength };
  }
  
  /**
   * Детальный анализ огибающей
   */
  private analyzeEnvelopeDetailed(
    rmsValues: number[], 
    segmentDuration: number
  ): {
    shape: 'impulsive' | 'attackDecay' | 'sustained' | 'pluck' | 'complex';
    attackTime: number;
    decayTime: number;
    attackSlope: number;
    decaySlope: number;
  } {
    let maxIndex = 0;
    let maxValue = 0;
    for (let i = 0; i < rmsValues.length; i++) {
      if (rmsValues[i] > maxValue) {
        maxValue = rmsValues[i];
        maxIndex = i;
      }
    }
    
    const attack = maxIndex > 0 ? rmsValues.slice(0, maxIndex + 1) : [rmsValues[0]];
    const attackTime = attack.length * segmentDuration;
    const attackSlope = attack.length > 1 ? 
      (maxValue - attack[0]) / attack.length : 0;
    
    const decay = maxIndex < rmsValues.length - 1 ? 
      rmsValues.slice(maxIndex) : [rmsValues[rmsValues.length - 1]];
    const decayTime = decay.length * segmentDuration;
    const decaySlope = decay.length > 1 ?
      (decay[0] - decay[decay.length - 1]) / decay.length : 0;
    
    let shape: 'impulsive' | 'attackDecay' | 'sustained' | 'pluck' | 'complex';
    
    if (attackSlope > 0.3 && decaySlope > 0.3) {
      shape = 'attackDecay';
    } else if (attackSlope > 0.3 && decaySlope < 0.05) {
      shape = 'impulsive';
    } else if (attackSlope < 0.05 && decaySlope < 0.05) {
      shape = 'sustained';
    } else if (attackSlope > 0.15 && decaySlope > 0.1 && attackTime < 0.1) {
      shape = 'pluck';
    } else {
      shape = 'complex';
    }
    
    return {
      shape,
      attackTime,
      decayTime,
      attackSlope,
      decaySlope
    };
  }
  
  /**
   * Вычисление peak to average ratio
   */
  private calculatePeakToAverage(values: number[]): number {
    if (values.length === 0) return 1;
    const peak = Math.max(...values);
    const average = this.calculateMean(values);
    return average > 0 ? peak / average : 1;
  }
  
  /**
   * Частота пересечения нуля
   */
  private calculateZeroCrossingRate(data: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0 && data[i - 1] < 0) || (data[i] < 0 && data[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / data.length;
  }
  
  /**
   * Спектральный спад
   */
  private calculateSpectralRolloff(frames: AudioFrame[], sampleRate: number): number {
    if (frames.length === 0) return 0;
    const centroids = frames.map(f => f.centroid);
    const meanCentroid = this.calculateMean(centroids);
    const stdCentroid = this.calculateStdDev(centroids);
    return meanCentroid + stdCentroid;
  }
  
  /**
   * Спектральная плоскостность
   */
  private calculateSpectralFlatness(frames: AudioFrame[]): number {
    if (frames.length === 0) return 0;
    const centroids = frames.map(f => f.centroid);
    const meanCentroid = this.calculateMean(centroids);
    const stdCentroid = this.calculateStdDev(centroids);
    const flatness = Math.min(1, stdCentroid / meanCentroid);
    return flatness;
  }
  
  /**
   * Фильтрация частотного диапазона
   */
  private applyFrequencyFilter(
    magnitudes: Float32Array,
    sampleRate: number,
    minFreq: number,
    maxFreq: number
  ): Float32Array {
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / (magnitudes.length - 1);
    
    const minBin = Math.max(0, Math.floor(minFreq / binWidth));
    const maxBin = Math.min(magnitudes.length - 1, Math.ceil(maxFreq / binWidth));
    
    const filtered = new Float32Array(magnitudes.length);
    
    for (let i = minBin; i <= maxBin; i++) {
      filtered[i] = magnitudes[i];
    }
    
    return filtered;
  }
  
  /**
   * Вычисление спектрального центра масс
   */
  private calculateCenterOfMass(magnitudes: Float32Array, sampleRate: number): number {
    let numerator = 0;
    let denominator = 0;
    
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / (magnitudes.length - 1);
    
    for (let i = 0; i < magnitudes.length; i++) {
      const frequency = i * binWidth;
      const magnitude = magnitudes[i];
      numerator += frequency * magnitude;
      denominator += magnitude;
    }
    
    return denominator > 0 ? numerator / denominator : 0;
  }
  
  /**
   * Вычисление спектрального потока
   */
  private calculateSpectralFlux(currentMagnitudes: Float32Array): number {
    if (!this.previousMagnitudes) {
      this.previousMagnitudes = new Float32Array(currentMagnitudes);
      return 0;
    }
    
    let flux = 0;
    for (let i = 0; i < currentMagnitudes.length; i++) {
      const diff = currentMagnitudes[i] - this.previousMagnitudes[i];
      flux += diff * diff;
    }
    
    flux = Math.sqrt(flux) / currentMagnitudes.length;
    this.previousMagnitudes = new Float32Array(currentMagnitudes);
    
    return flux;
  }
  
  /**
   * Вычисление RMS
   */
  private calculateRMS(timeData: Float32Array): number {
    let sumSquares = 0;
    for (let i = 0; i < timeData.length; i++) {
      sumSquares += timeData[i] * timeData[i];
    }
    return Math.sqrt(sumSquares / timeData.length);
  }
  
  /**
   * Вычисление статистики
   */
  private calculateStatistics(frames: AudioFrame[]): AudioAnalysisResult['statistics'] {
    const centroids = frames.map(f => f.centroid);
    const fluxes = frames.map(f => f.flux);
    const rmsValues = frames.map(f => f.rms);
    const activeFrames = frames.filter(f => f.isActive);
    
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
      },
      activityRatio: activeFrames.length / frames.length
    };
  }
  
  /**
   * Автокорреляция
   */
  private autocorrelate(values: number[]): number[] {
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
  private findPeaks(values: number[]): Array<{ index: number; value: number }> {
    const peaks = [];
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push({ index: i, value: values[i] });
      }
    }
    return peaks;
  }
  
  /**
   * Среднее значение
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
    }
    return sum / values.length;
  }
  
  /**
   * Дисперсия
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    let sumSquaredDiff = 0;
    for (let i = 0; i < values.length; i++) {
      sumSquaredDiff += Math.pow(values[i] - mean, 2);
    }
    return sumSquaredDiff / values.length;
  }
  
  /**
   * Стандартное отклонение
   */
  private calculateStdDev(values: number[]): number {
    return Math.sqrt(this.calculateVariance(values));
  }

  // Добавьте этот метод в класс UnifiedAudioAnalyzer:

    /**
     * Анализ AudioBuffer с возможностью захвата сырых данных для отчета
     */
    async analyzeBufferWithRaw(
    audioBuffer: AudioBuffer,
    onRawFrame?: (frame: AudioFrame, rawFrame: { centroid: number; flux: number; rms: number; timestamp: number }) => void,
    onProgress?: (progress: number, frame: number, total: number) => void
    ): Promise<AudioAnalysisResult> {
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const intervalSeconds = this.config.intervalMs / 1000;
    const totalFrames = Math.floor(duration / intervalSeconds);
    
    const frames: AudioFrame[] = [];
    const channelData = audioBuffer.getChannelData(0);
    
    this.previousMagnitudes = null;
    this.previousSpectrum = null;
    
    const rmsValues: number[] = [];
    const centroidValues: number[] = [];
    const fluxValues: number[] = [];
    const zeroCrossings: number[] = [];
    
    for (let i = 0; i < totalFrames; i++) {
        const startSample = Math.floor(i * intervalSeconds * sampleRate);
        const endSample = Math.min(
        startSample + Math.floor(intervalSeconds * sampleRate),
        channelData.length
        );
        
        const timeData = new Float32Array(this.config.fftSize);
        const segmentLength = endSample - startSample;
        
        for (let s = 0; s < Math.min(segmentLength, this.config.fftSize); s++) {
        timeData[s] = channelData[startSample + s];
        }
        
        // FFT
        this.fft.realTransform(this.complexArray, timeData);
        const magnitudes = this.fft.getMagnitudes(this.complexArray);
        
        const filteredMagnitudes = this.applyFrequencyFilter(
        magnitudes, 
        sampleRate,
        this.config.frequencyRange.min,
        this.config.frequencyRange.max
        );
        
        const centroid = this.calculateCenterOfMass(filteredMagnitudes, sampleRate);
        const flux = this.calculateSpectralFlux(filteredMagnitudes);
        const rms = this.calculateRMS(timeData);
        const zeroCrossing = this.calculateZeroCrossingRate(timeData);
        
        // Сохраняем сырые значения до нормализации
        const rawCentroid = centroid;
        const rawFlux = flux;
        const rawRms = rms;
        
        const normalizedRms = Math.min(rms * 2, 0.5);
        
        const frame: AudioFrame = {
        index: i,
        timestamp: i * intervalSeconds,
        centroid: centroid,
        flux: Math.min(flux, 3.0),
        rms: normalizedRms,
        isActive: normalizedRms > this.config.minRMS
        };
        
        frames.push(frame);
        centroidValues.push(centroid);
        fluxValues.push(flux);
        rmsValues.push(normalizedRms);
        zeroCrossings.push(zeroCrossing);
        
        // Вызываем callback с сырыми данными, если он предоставлен
        if (onRawFrame) {
        onRawFrame(frame, {
            centroid: rawCentroid,
            flux: rawFlux,
            rms: rawRms,
            timestamp: i * intervalSeconds
        });
        }
        
        if (onProgress && i % Math.max(1, Math.floor(totalFrames / 20)) === 0) {
        onProgress((i / totalFrames) * 100, i, totalFrames);
        }
    }
    
    const statistics = this.calculateStatistics(frames);
    const temporalPatterns = this.calculateCompleteTemporalPatterns(
        frames, 
        centroidValues, 
        fluxValues, 
        rmsValues,
        zeroCrossings,
        duration,
        sampleRate
    );
    
    return {
        frames,
        duration,
        totalFrames,
        sampleRate,
        statistics,
        temporalPatterns
    };
    }
}

export const unifiedAnalyzer = new UnifiedAudioAnalyzer();

// export interface AudioAnalysisConfig {
//   intervalMs: number;
//   fftSize: number;
//   smoothingTimeConstant: number;
//   minRMS: number;
//   frequencyRange: {
//     min: number;
//     max: number;
//   };
// }

// export interface AudioFrame {
//   index: number;
//   timestamp: number;
//   centroid: number;
//   flux: number;
//   rms: number;
//   isActive: boolean;
// }

// export interface AudioAnalysisResult {
//   frames: AudioFrame[];
//   duration: number;
//   totalFrames: number;
//   sampleRate: number;
//   statistics: {
//     centroid: { min: number; max: number; mean: number; std: number };
//     flux: { min: number; max: number; mean: number; std: number };
//     rms: { min: number; max: number; mean: number; std: number };
//     activityRatio: number;
//   };
//   temporalPatterns: any;
// }

// class UnifiedAudioAnalyzer {
//   private config: AudioAnalysisConfig;
//   private previousMagnitudes: Float32Array | null = null;
//   private fftService: FFTService;
  
//   constructor(config?: Partial<AudioAnalysisConfig>) {
//     this.config = {
//       intervalMs: 30,
//       fftSize: 2048,
//       smoothingTimeConstant: 0.8,
//       minRMS: 0.02,
//       frequencyRange: {
//         min: 50,
//         max: 15000
//       },
//       ...config
//     };
    
//     this.fftService = new FFTService(this.config.fftSize);
//   }
  
//   updateConfig(config: Partial<AudioAnalysisConfig>): void {
//     this.config = { ...this.config, ...config };
//     // Пересоздаем FFT сервис если изменился размер
//     if (config.fftSize && config.fftSize !== this.config.fftSize) {
//       this.fftService = new FFTService(this.config.fftSize);
//     }
//   }
  
//   /**
//    * Анализ AudioBuffer из файла
//    */
//   async analyzeBuffer(
//     audioBuffer: AudioBuffer,
//     onProgress?: (progress: number, frame: number, total: number) => void
//   ): Promise<AudioAnalysisResult> {
//     const sampleRate = audioBuffer.sampleRate;
//     const duration = audioBuffer.duration;
//     const intervalSeconds = this.config.intervalMs / 1000;
//     const totalFrames = Math.floor(duration / intervalSeconds);
    
//     const frames: AudioFrame[] = [];
//     const channelData = audioBuffer.getChannelData(0);
    
//     // Сбрасываем предыдущий спектр для расчета потока
//     this.previousMagnitudes = null;
    
//     for (let i = 0; i < totalFrames; i++) {
//       const startSample = Math.floor(i * intervalSeconds * sampleRate);
//       const endSample = Math.min(
//         startSample + Math.floor(intervalSeconds * sampleRate),
//         channelData.length
//       );
      
//       // 1. Берем сегмент данных и подготавливаем для FFT
//       const timeData = new Float32Array(this.config.fftSize);
//       const segmentLength = endSample - startSample;
      
//       for (let s = 0; s < Math.min(segmentLength, this.config.fftSize); s++) {
//         timeData[s] = channelData[startSample + s];
//       }
      
//       // 2. Выполняем FFT
//       const complexSpectrum = this.fftService.forward(timeData);
//       const magnitudes = this.fftService.getMagnitudes(complexSpectrum);
      
//       // 3. Фильтрация частот (50–15000 Гц)
//       const filteredMagnitudes = this.applyFrequencyFilter(
//         magnitudes, 
//         sampleRate,
//         this.config.frequencyRange.min,
//         this.config.frequencyRange.max
//       );
      
//       // 4. Вычисляем метрики
//       const centroid = this.calculateCenterOfMass(filteredMagnitudes, sampleRate);
//       const flux = this.calculateSpectralFlux(filteredMagnitudes);
//       const rms = this.calculateRMS(timeData);
      
//       // Нормализуем RMS к диапазону 0-0.5 (типичные значения)
//       const normalizedRms = Math.min(rms * 2, 0.5);
      
//       frames.push({
//         index: i,
//         timestamp: i * intervalSeconds,
//         centroid: centroid,
//         flux: Math.min(flux, 3.0),
//         rms: normalizedRms,
//         isActive: normalizedRms > this.config.minRMS
//       });
      
//       if (onProgress && i % Math.max(1, Math.floor(totalFrames / 20)) === 0) {
//         onProgress((i / totalFrames) * 100, i, totalFrames);
//       }
//     }
    
//     // Вычисляем статистику и паттерны
//     const statistics = this.calculateStatistics(frames);
//     const temporalPatterns = this.analyzeTemporalPatterns(frames, duration);
    
//     return {
//       frames,
//       duration,
//       totalFrames,
//       sampleRate,
//       statistics,
//       temporalPatterns
//     };
//   }
  
//   /**
//    * Анализ live-фрейма из микрофона (для реального времени)
//    */
//   analyzeLiveFrame(
//     timeData: Float32Array,
//     sampleRate: number
//   ): { centroid: number; flux: number; rms: number; isActive: boolean } {
//     // Выполняем FFT
//     const complexSpectrum = this.fftService.forward(timeData);
//     const magnitudes = this.fftService.getMagnitudes(complexSpectrum);
    
//     // Фильтрация частот
//     const filteredMagnitudes = this.applyFrequencyFilter(
//       magnitudes,
//       sampleRate,
//       this.config.frequencyRange.min,
//       this.config.frequencyRange.max
//     );
    
//     // Вычисляем метрики
//     const centroid = this.calculateCenterOfMass(filteredMagnitudes, sampleRate);
//     const flux = this.calculateSpectralFlux(filteredMagnitudes);
//     const rms = this.calculateRMS(timeData);
    
//     // Нормализуем
//     const normalizedRms = Math.min(rms * 2, 0.5);
    
//     return {
//       centroid: centroid,
//       flux: Math.min(flux, 3.0),
//       rms: normalizedRms,
//       isActive: normalizedRms > this.config.minRMS
//     };
//   }
  
//   /**
//    * Фильтрация частотного диапазона
//    */
//   private applyFrequencyFilter(
//     magnitudes: Float32Array,
//     sampleRate: number,
//     minFreq: number,
//     maxFreq: number
//   ): Float32Array {
//     const nyquist = sampleRate / 2;
//     const binWidth = nyquist / (magnitudes.length - 1);
    
//     const minBin = Math.max(0, Math.floor(minFreq / binWidth));
//     const maxBin = Math.min(magnitudes.length - 1, Math.ceil(maxFreq / binWidth));
    
//     const filtered = new Float32Array(magnitudes.length);
    
//     for (let i = minBin; i <= maxBin; i++) {
//       filtered[i] = magnitudes[i];
//     }
    
//     return filtered;
//   }
  
//   /**
//    * Вычисление спектрального центра масс
//    */
//   private calculateCenterOfMass(
//     magnitudes: Float32Array,
//     sampleRate: number
//   ): number {
//     let numerator = 0;
//     let denominator = 0;
    
//     const nyquist = sampleRate / 2;
//     const binWidth = nyquist / (magnitudes.length - 1);
    
//     for (let i = 0; i < magnitudes.length; i++) {
//       const frequency = i * binWidth;
//       const magnitude = magnitudes[i];
//       numerator += frequency * magnitude;
//       denominator += magnitude;
//     }
    
//     return denominator > 0 ? numerator / denominator : 0;
//   }
  
//   /**
//    * Вычисление спектрального потока
//    */
//   private calculateSpectralFlux(currentMagnitudes: Float32Array): number {
//     if (!this.previousMagnitudes) {
//       this.previousMagnitudes = new Float32Array(currentMagnitudes);
//       return 0;
//     }
    
//     let flux = 0;
//     for (let i = 0; i < currentMagnitudes.length; i++) {
//       const diff = currentMagnitudes[i] - this.previousMagnitudes[i];
//       flux += diff * diff;
//     }
    
//     flux = Math.sqrt(flux) / currentMagnitudes.length;
    
//     // Сохраняем для следующего раза
//     this.previousMagnitudes = new Float32Array(currentMagnitudes);
    
//     return flux;
//   }
  
//   /**
//    * Вычисление RMS (среднеквадратичной амплитуды)
//    */
//   private calculateRMS(timeData: Float32Array): number {
//     let sumSquares = 0;
//     for (let i = 0; i < timeData.length; i++) {
//       sumSquares += timeData[i] * timeData[i];
//     }
//     return Math.sqrt(sumSquares / timeData.length);
//   }
  
//   /**
//    * Вычисление статистики
//    */
//   private calculateStatistics(frames: AudioFrame[]): AudioAnalysisResult['statistics'] {
//     const centroids = frames.map(f => f.centroid);
//     const fluxes = frames.map(f => f.flux);
//     const rmsValues = frames.map(f => f.rms);
//     const activeFrames = frames.filter(f => f.isActive);
    
//     return {
//       centroid: {
//         min: Math.min(...centroids),
//         max: Math.max(...centroids),
//         mean: this.calculateMean(centroids),
//         std: this.calculateStdDev(centroids)
//       },
//       flux: {
//         min: Math.min(...fluxes),
//         max: Math.max(...fluxes),
//         mean: this.calculateMean(fluxes),
//         std: this.calculateStdDev(fluxes)
//       },
//       rms: {
//         min: Math.min(...rmsValues),
//         max: Math.max(...rmsValues),
//         mean: this.calculateMean(rmsValues),
//         std: this.calculateStdDev(rmsValues)
//       },
//       activityRatio: activeFrames.length / frames.length
//     };
//   }
  
//   /**
//    * Анализ временных паттернов
//    */
//   private analyzeTemporalPatterns(frames: AudioFrame[], duration: number): any {
//     const rmsValues = frames.map(f => f.rms);
//     const centroidValues = frames.map(f => f.centroid);
//     const fluxValues = frames.map(f => f.flux);
    
//     const centroidStd = this.calculateStdDev(centroidValues);
//     const fluxStd = this.calculateStdDev(fluxValues);
//     const rmsStd = this.calculateStdDev(rmsValues);
    
//     const segmentDuration = duration / frames.length;
//     let activeFrames = 0;
//     let silenceDuration = 0;
//     let silenceCount = 0;
//     let currentSilence = 0;
//     let burstDuration = 0;
//     let burstCount = 0;
//     let currentBurst = 0;
    
//     for (const frame of frames) {
//       if (frame.isActive) {
//         activeFrames++;
//         if (currentSilence > 0) {
//           silenceDuration += currentSilence * segmentDuration;
//           silenceCount++;
//           currentSilence = 0;
//         }
//         currentBurst++;
//       } else {
//         if (currentBurst > 0) {
//           burstDuration += currentBurst * segmentDuration;
//           burstCount++;
//           currentBurst = 0;
//         }
//         currentSilence++;
//       }
//     }
    
//     if (currentBurst > 0) {
//       burstDuration += currentBurst * segmentDuration;
//       burstCount++;
//     }
    
//     const activityRatio = activeFrames / frames.length;
//     const avgSilenceDuration = silenceCount > 0 ? silenceDuration / silenceCount : 0;
//     const avgBurstDuration = burstCount > 0 ? burstDuration / burstCount : 0;
    
//     const jumps: number[] = [];
//     for (let i = 1; i < frames.length; i++) {
//       const jump = Math.abs(frames[i].centroid - frames[i-1].centroid);
//       if (jump > 30) {
//         jumps.push(jump);
//       }
//     }
    
//     const frequencyJumps = {
//       enabled: jumps.length > 3,
//       minJumpsRequired: 5,
//       actualJumps: jumps.length,
//       densityPerSecond: jumps.length / duration,
//       magnitudeRange: jumps.length > 0 ? {
//         min: Math.min(...jumps),
//         max: Math.max(...jumps),
//         avg: this.calculateMean(jumps)
//       } : { min: 0, max: 0, avg: 0 },
//       magnitudes: jumps
//     };
    
//     const volumeTrend = this.analyzeTrend(rmsValues);
//     const frequencyTrend = this.analyzeTrend(centroidValues);
//     const longTermStability = this.calculateStability(frames);
//     const periodicity = this.detectPeriodicity(rmsValues);
//     const envelopeShape = this.analyzeEnvelopeShape(rmsValues);
//     const peakToAverageRatio = this.calculatePeakToAverage(rmsValues);
    
//     return {
//       centroidStd,
//       fluxStd,
//       rmsStd,
//       activityRatio,
//       avgSilenceDuration,
//       avgBurstDuration,
//       frequencyJumps,
//       volumeTrend,
//       frequencyTrend,
//       longTermStability,
//       periodicity,
//       envelopeShape,
//       peakToAverageRatio
//     };
//   }
  
//   private analyzeTrend(values: number[]): string {
//     if (values.length < 10) return 'stable';
    
//     const firstHalf = values.slice(0, Math.floor(values.length / 2));
//     const secondHalf = values.slice(Math.floor(values.length / 2));
//     const firstAvg = this.calculateMean(firstHalf);
//     const secondAvg = this.calculateMean(secondHalf);
    
//     const ratio = secondAvg / firstAvg;
    
//     if (ratio > 1.5) return 'increasing';
//     if (ratio < 0.67) return 'decreasing';
    
//     const variance = this.calculateVariance(values);
//     if (variance > 0.1 * firstAvg) return 'oscillating';
    
//     return 'stable';
//   }
  
//   private calculateStability(frames: AudioFrame[]): string {
//     const rmsVariance = this.calculateVariance(frames.map(f => f.rms));
//     const centroidVariance = this.calculateVariance(frames.map(f => f.centroid)) / 1000;
    
//     const normalizedStability = 1 - (rmsVariance + centroidVariance) / 2;
    
//     if (normalizedStability > 0.8) return 'veryHigh';
//     if (normalizedStability > 0.6) return 'high';
//     if (normalizedStability > 0.4) return 'medium';
//     if (normalizedStability > 0.2) return 'low';
//     return 'veryLow';
//   }
  
//   private detectPeriodicity(values: number[]): string {
//     const autocorr = this.autocorrelate(values);
//     const peaks = this.findPeaks(autocorr);
//     const significantPeaks = peaks.filter(p => p.value > 0.3);
    
//     if (significantPeaks.length === 0) return 'none';
//     if (significantPeaks.length < 3) return 'irregular';
    
//     const intervals = [];
//     for (let i = 1; i < significantPeaks.length; i++) {
//       intervals.push(significantPeaks[i].index - significantPeaks[i - 1].index);
//     }
    
//     const intervalStd = this.calculateStdDev(intervals);
//     const intervalMean = this.calculateMean(intervals);
    
//     if (intervalStd / intervalMean < 0.2) return 'regular';
//     if (intervalStd / intervalMean < 0.5) return 'semiRegular';
//     return 'irregular';
//   }
  
//   private analyzeEnvelopeShape(rmsValues: number[]): string {
//     const maxIndex = rmsValues.indexOf(Math.max(...rmsValues));
//     const maxValue = rmsValues[maxIndex];
    
//     const attack = maxIndex > 0 ? rmsValues.slice(0, maxIndex) : [];
//     const attackSlope = attack.length > 1 ? 
//       (maxValue - attack[0]) / attack.length : 0;
    
//     const decay = maxIndex < rmsValues.length - 1 ? 
//       rmsValues.slice(maxIndex) : [];
//     const decaySlope = decay.length > 1 ?
//       (decay[0] - decay[decay.length - 1]) / decay.length : 0;
    
//     if (attackSlope > 0.5 && decaySlope < 0.1) return 'impulsive';
//     if (attackSlope > 0.2 && decaySlope > 0.2) return 'attackDecay';
//     if (attackSlope < 0.05 && decaySlope < 0.05) return 'sustained';
//     if (attackSlope > 0.1 && decaySlope < 0.05) return 'pluck';
    
//     return 'complex';
//   }
  
//   private calculatePeakToAverage(rmsValues: number[]): number {
//     const peak = Math.max(...rmsValues);
//     const average = this.calculateMean(rmsValues);
//     return average > 0 ? peak / average : 1;
//   }
  
//   private autocorrelate(values: number[]): number[] {
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
  
//   private findPeaks(values: number[]): Array<{ index: number; value: number }> {
//     const peaks = [];
//     for (let i = 1; i < values.length - 1; i++) {
//       if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
//         peaks.push({ index: i, value: values[i] });
//       }
//     }
//     return peaks;
//   }
  
//   private calculateMean(values: number[]): number {
//     if (values.length === 0) return 0;
//     let sum = 0;
//     for (let i = 0; i < values.length; i++) {
//       sum += values[i];
//     }
//     return sum / values.length;
//   }
  
//   private calculateVariance(values: number[]): number {
//     if (values.length === 0) return 0;
//     const mean = this.calculateMean(values);
//     let sumSquaredDiff = 0;
//     for (let i = 0; i < values.length; i++) {
//       sumSquaredDiff += Math.pow(values[i] - mean, 2);
//     }
//     return sumSquaredDiff / values.length;
//   }
  
//   private calculateStdDev(values: number[]): number {
//     return Math.sqrt(this.calculateVariance(values));
//   }

//   // ... существующие свойства и методы ...

//   /**
//    * Анализ AudioBuffer с возможностью захвата сырых данных для отчета
//    */
//   async analyzeBufferWithRaw(
//     audioBuffer: AudioBuffer,
//     onRawFrame?: (frame: AudioFrame, rawFrame: { centroid: number; flux: number; rms: number; timestamp: number }) => void,
//     onProgress?: (progress: number, frame: number, total: number) => void
//   ): Promise<AudioAnalysisResult> {
//     const sampleRate = audioBuffer.sampleRate;
//     const duration = audioBuffer.duration;
//     const intervalSeconds = this.config.intervalMs / 1000;
//     const totalFrames = Math.floor(duration / intervalSeconds);
    
//     const frames: AudioFrame[] = [];
//     const channelData = audioBuffer.getChannelData(0);
    
//     // Сбрасываем предыдущий спектр для расчета потока
//     this.previousMagnitudes = null;
    
//     for (let i = 0; i < totalFrames; i++) {
//       const startSample = Math.floor(i * intervalSeconds * sampleRate);
//       const endSample = Math.min(
//         startSample + Math.floor(intervalSeconds * sampleRate),
//         channelData.length
//       );
      
//       // 1. Берем сегмент данных размером fftSize
//       const timeData = new Float32Array(this.config.fftSize);
//       const segmentLength = endSample - startSample;
      
//       for (let s = 0; s < Math.min(segmentLength, this.config.fftSize); s++) {
//         timeData[s] = channelData[startSample + s];
//       }
      
//       // 2. Выполняем FFT через наш сервис
//       const complexSpectrum = this.fftService.forward(timeData);
//       const magnitudes = FFT.fftMag(complexSpectrum);
      
//       // 3. Фильтрация частот (50–15000 Гц)
//       const filteredMagnitudes = this.applyFrequencyFilter(
//         magnitudes, 
//         sampleRate,
//         this.config.frequencyRange.min,
//         this.config.frequencyRange.max
//       );
      
//       // 4. Вычисляем метрики
//       const centroid = this.calculateCenterOfMass(filteredMagnitudes, sampleRate);
//       const flux = this.calculateSpectralFlux(filteredMagnitudes);
//       const rms = this.calculateRMS(timeData);
      
//       // Сохраняем сырые значения до нормализации
//       const rawCentroid = centroid;
//       const rawFlux = flux;
//       const rawRms = rms;
      
//       // Нормализуем
//       const normalizedRms = Math.min(rms * 2, 0.5);
      
//       const frame: AudioFrame = {
//         index: i,
//         timestamp: i * intervalSeconds,
//         centroid: centroid,
//         flux: Math.min(flux, 3.0),
//         rms: normalizedRms,
//         isActive: normalizedRms > this.config.minRMS
//       };
      
//       frames.push(frame);
      
//       // Если передан callback для сырых данных, вызываем его
//       if (onRawFrame) {
//         onRawFrame(frame, {
//           centroid: rawCentroid,
//           flux: rawFlux,
//           rms: rawRms,
//           timestamp: i * intervalSeconds
//         });
//       }
      
//       if (onProgress && i % Math.max(1, Math.floor(totalFrames / 20)) === 0) {
//         onProgress((i / totalFrames) * 100, i, totalFrames);
//       }
//     }
    
//     // Вычисляем статистику и паттерны
//     const statistics = this.calculateStatistics(frames);
//     const temporalPatterns = this.analyzeTemporalPatterns(frames, duration);
    
//     return {
//       frames,
//       duration,
//       totalFrames,
//       sampleRate,
//       statistics,
//       temporalPatterns
//     };
//   }

// }

// export const unifiedAnalyzer = new UnifiedAudioAnalyzer();
