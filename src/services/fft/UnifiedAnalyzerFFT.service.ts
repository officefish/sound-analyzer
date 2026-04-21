// src/services/UnifiedAudioAnalyzer.ts

export interface AudioAnalysisConfig {
  intervalMs: number;
  fftSize: number;
  smoothingTimeConstant: number;
  minRMS: number;
}

export interface AudioFrame {
  index: number;
  timestamp: number;
  centroid: number;
  flux: number;
  rms: number;
  isActive: boolean;
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
  temporalPatterns: {
    centroidStd: number;
    fluxStd: number;
    rmsStd: number;
    activityRatio: number;
    avgSilenceDuration: number;
    avgBurstDuration: number;
    frequencyJumps: {
      enabled: boolean;
      minJumpsRequired: number;
      actualJumps: number;
      densityPerSecond: number;
      magnitudeRange: { min: number; max: number; avg: number };
      magnitudes: number[];
    };
    volumeTrend: string;
    frequencyTrend: string;
    longTermStability: string;
    periodicity: string;
    envelopeShape: string;
    peakToAverageRatio: number;
  };
}

class UnifiedAudioAnalyzer {
  private config: AudioAnalysisConfig;
  
  constructor(config?: Partial<AudioAnalysisConfig>) {
    this.config = {
      intervalMs: 30,
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      minRMS: 0.02,
      ...config
    };
  }
  
  updateConfig(config: Partial<AudioAnalysisConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  async analyzeBuffer(
    audioBuffer: AudioBuffer,
    onProgress?: (progress: number, frame: number, total: number) => void
  ): Promise<AudioAnalysisResult> {
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const intervalSeconds = this.config.intervalMs / 1000;
    const totalFrames = Math.floor(duration / intervalSeconds);
    
    const frames: AudioFrame[] = [];
    //const channelData = audioBuffer.getChannelData(0);
    
    // Создаем offline контекст для FFT
    const offlineContext = new OfflineAudioContext(
      1,
      audioBuffer.length,
      sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    const analyser = offlineContext.createAnalyser();
    analyser.fftSize = this.config.fftSize;
    analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
    
    source.connect(analyser);
    source.connect(offlineContext.destination);
    
    source.start();
    
    // Рендерим аудио для получения спектральных данных
    const renderedBuffer = await offlineContext.startRendering();
    const renderedData = renderedBuffer.getChannelData(0);
    
    // Для расчета спектрального потока нужен предыдущий спектр
    let previousSpectrum: Float32Array | null = null;
    
    for (let i = 0; i < totalFrames; i++) {
      const startSample = Math.floor(i * intervalSeconds * sampleRate);
      const endSample = Math.min(
        startSample + Math.floor(intervalSeconds * sampleRate),
        renderedData.length
      );
      
      // 1. Вычисляем RMS для сегмента
      let sumSquares = 0;
      for (let s = startSample; s < endSample; s++) {
        const sample = renderedData[s];
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / (endSample - startSample));
      
      // 2. Вычисляем спектральные характеристики для сегмента
      const segment = new Float32Array(endSample - startSample);
      for (let s = startSample; s < endSample; s++) {
        segment[s - startSample] = renderedData[s];
      }
      
      // Применяем окно Ханна
      this.applyHanningWindow(segment);
      
      // Вычисляем спектр через FFT (упрощенная версия)
      const spectrum = this.computeFFT(segment);
      
      // 3. Вычисляем спектральный центр масс
      let centroid = 0;
      let totalMagnitude = 0;
      const nyquist = sampleRate / 2;
      const binWidth = nyquist / (spectrum.length - 1);
      
      for (let j = 0; j < spectrum.length; j++) {
        const frequency = j * binWidth;
        const magnitude = spectrum[j];
        centroid += frequency * magnitude;
        totalMagnitude += magnitude;
      }
      centroid = totalMagnitude > 0 ? centroid / totalMagnitude : 0;
      
      // 4. Вычисляем спектральный поток
      let flux = 0;
      if (previousSpectrum) {
        for (let j = 0; j < spectrum.length; j++) {
          const diff = spectrum[j] - previousSpectrum[j];
          flux += diff * diff;
        }
        flux = Math.sqrt(flux) / spectrum.length;
      }
      previousSpectrum = spectrum;
      
      // Нормализуем RMS к диапазону 0-1 (типичные значения 0-0.5)
      const normalizedRms = Math.min(rms * 2, 0.5);
      
      frames.push({
        index: i,
        timestamp: i * intervalSeconds,
        centroid: centroid,
        flux: Math.min(flux, 3.0),
        rms: normalizedRms,
        isActive: normalizedRms > this.config.minRMS
      });
      
      if (onProgress && i % Math.max(1, Math.floor(totalFrames / 20)) === 0) {
        onProgress((i / totalFrames) * 100, i, totalFrames);
      }
    }
    
    // Вычисляем статистику и паттерны
    const statistics = this.calculateStatistics(frames);
    const temporalPatterns = this.analyzeTemporalPatterns(frames, duration);
    
    return {
      frames,
      duration,
      totalFrames,
      sampleRate,
      statistics,
      temporalPatterns
    };
  }
  
  private applyHanningWindow(data: Float32Array): void {
    for (let i = 0; i < data.length; i++) {
      const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (data.length - 1)));
      data[i] *= multiplier;
    }
  }
  
  private computeFFT(data: Float32Array): Float32Array {
    // Упрощенная версия - возвращает magnitude spectrum
    // В реальном коде используйте библиотеку FFT
    const spectrum = new Float32Array(data.length / 2);
    for (let i = 0; i < spectrum.length; i++) {
      // Симуляция спектра - в реальности тут должен быть настоящий FFT
      spectrum[i] = Math.abs(data[i]) || 0;
    }
    return spectrum;
  }
  
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
  
  private analyzeTemporalPatterns(frames: AudioFrame[], duration: number): AudioAnalysisResult['temporalPatterns'] {
    const rmsValues = frames.map(f => f.rms);
    const centroidValues = frames.map(f => f.centroid);
    const fluxValues = frames.map(f => f.flux);
    
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
    for (let i = 1; i < frames.length; i++) {
      const jump = Math.abs(frames[i].centroid - frames[i-1].centroid);
      if (jump > 30) {
        jumps.push(jump);
      }
    }
    
    const frequencyJumps = {
      enabled: jumps.length > 3,
      minJumpsRequired: 5,
      actualJumps: jumps.length,
      densityPerSecond: jumps.length / duration,
      magnitudeRange: jumps.length > 0 ? {
        min: Math.min(...jumps),
        max: Math.max(...jumps),
        avg: this.calculateMean(jumps)
      } : { min: 0, max: 0, avg: 0 },
      magnitudes: jumps
    };
    
    const volumeTrend = this.analyzeTrend(rmsValues);
    const frequencyTrend = this.analyzeTrend(centroidValues);
    const longTermStability = this.calculateStability(frames);
    const periodicity = this.detectPeriodicity(rmsValues);
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
  
  private analyzeTrend(values: number[]): string {
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
  
  private calculateStability(frames: AudioFrame[]): string {
    const rmsVariance = this.calculateVariance(frames.map(f => f.rms));
    const centroidVariance = this.calculateVariance(frames.map(f => f.centroid)) / 1000;
    
    const normalizedStability = 1 - (rmsVariance + centroidVariance) / 2;
    
    if (normalizedStability > 0.8) return 'veryHigh';
    if (normalizedStability > 0.6) return 'high';
    if (normalizedStability > 0.4) return 'medium';
    if (normalizedStability > 0.2) return 'low';
    return 'veryLow';
  }
  
  private detectPeriodicity(values: number[]): string {
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
  
  private analyzeEnvelopeShape(rmsValues: number[]): string {
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
  
  private calculatePeakToAverage(rmsValues: number[]): number {
    const peak = Math.max(...rmsValues);
    const average = this.calculateMean(rmsValues);
    return average > 0 ? peak / average : 1;
  }
  
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
  
  private findPeaks(values: number[]): Array<{ index: number; value: number }> {
    const peaks = [];
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push({ index: i, value: values[i] });
      }
    }
    return peaks;
  }
  
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
    }
    return sum / values.length;
  }
  
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    let sumSquaredDiff = 0;
    for (let i = 0; i < values.length; i++) {
      sumSquaredDiff += Math.pow(values[i] - mean, 2);
    }
    return sumSquaredDiff / values.length;
  }
  
  private calculateStdDev(values: number[]): number {
    return Math.sqrt(this.calculateVariance(values));
  }

  async analyzeBufferWithRaw(
    audioBuffer: AudioBuffer,
    onFrame?: (frame: AudioFrame, rawFrame: any) => void,
    onProgress?: (progress: number, frame: number, total: number) => void
    ): Promise<AudioAnalysisResult> {

    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const intervalSeconds = this.config.intervalMs / 1000;
    const totalFrames = Math.floor(duration / intervalSeconds);
    
    const frames: AudioFrame[] = [];
    //const channelData = audioBuffer.getChannelData(0);
    
    // Создаем offline контекст для FFT
    const offlineContext = new OfflineAudioContext(
      1,
      audioBuffer.length,
      sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    const analyser = offlineContext.createAnalyser();
    analyser.fftSize = this.config.fftSize;
    analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
    
    source.connect(analyser);
    source.connect(offlineContext.destination);
    
    source.start();
    
    // Рендерим аудио для получения спектральных данных
    const renderedBuffer = await offlineContext.startRendering();
    const renderedData = renderedBuffer.getChannelData(0);
    
    // Для расчета спектрального потока нужен предыдущий спектр
    let previousSpectrum: Float32Array | null = null;
    
    for (let i = 0; i < totalFrames; i++) {
      
      const startSample = Math.floor(i * intervalSeconds * sampleRate);
      const endSample = Math.min(
        startSample + Math.floor(intervalSeconds * sampleRate),
        renderedData.length
      );
      
      // 1. Вычисляем RMS для сегмента
      let sumSquares = 0;
      for (let s = startSample; s < endSample; s++) {
        const sample = renderedData[s];
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / (endSample - startSample));
      
      // 2. Вычисляем спектральные характеристики для сегмента
      const segment = new Float32Array(endSample - startSample);
      for (let s = startSample; s < endSample; s++) {
        segment[s - startSample] = renderedData[s];
      }
      
      // Применяем окно Ханна
      this.applyHanningWindow(segment);
      
      // Вычисляем спектр через FFT (упрощенная версия)
      const spectrum = this.computeFFT(segment);
      
      // 3. Вычисляем спектральный центр масс
      let centroid = 0;
      let totalMagnitude = 0;
      const nyquist = sampleRate / 2;
      const binWidth = nyquist / (spectrum.length - 1);
      
      for (let j = 0; j < spectrum.length; j++) {
        const frequency = j * binWidth;
        const magnitude = spectrum[j];
        centroid += frequency * magnitude;
        totalMagnitude += magnitude;
      }
      centroid = totalMagnitude > 0 ? centroid / totalMagnitude : 0;
      
      // 4. Вычисляем спектральный поток
      let flux = 0;
      if (previousSpectrum) {
        for (let j = 0; j < spectrum.length; j++) {
          const diff = spectrum[j] - previousSpectrum[j];
          flux += diff * diff;
        }
        flux = Math.sqrt(flux) / spectrum.length;
      }
      previousSpectrum = spectrum;
      
      // Нормализуем RMS к диапазону 0-1 (типичные значения 0-0.5)
      const normalizedRms = Math.min(rms * 2, 0.5);

      const frame = {
        index: i,
        timestamp: i * intervalSeconds,
        centroid: centroid,
        flux: Math.min(flux, 3.0),
        rms: normalizedRms,
        isActive: normalizedRms > this.config.minRMS
      }

      // При создании каждого фрейма:
      const rawFrame = {
        centroid: frame.centroid,
        flux: frame.flux,
        rms: frame.rms,
        timestamp: i * intervalSeconds
      };
  
      if (onFrame) {
        onFrame(frame, rawFrame);
      }
      
      frames.push(frame);
      
      if (onProgress && i % Math.max(1, Math.floor(totalFrames / 20)) === 0) {
        onProgress((i / totalFrames) * 100, i, totalFrames);
      }
    }
    
    // Вычисляем статистику и паттерны
    const statistics = this.calculateStatistics(frames);
    const temporalPatterns = this.analyzeTemporalPatterns(frames, duration);
    
    return {
      frames,
      duration,
      totalFrames,
      sampleRate,
      statistics,
      temporalPatterns
    };
}}

export const unifiedAnalyzer = new UnifiedAudioAnalyzer();