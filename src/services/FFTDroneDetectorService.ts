// src/services/FFTDroneDetectorService.ts

export interface DetectionParameters {
  centroidMin: number;
  centroidMax: number;
  fluxMin: number;
  fluxMax: number;
  rmsMin: number;
  rmsMax: number;
}

export type StrictnessLevel = 'sensitive' | 'normal' | 'rough';

export interface DetectorConfig {
  parameters: DetectionParameters;
  intervalMs: number;
  samplesCount: number;
  strictness: StrictnessLevel;
}

export interface RawSample {
  timestamp: number;
  centroid: number;
  flux: number;
  rms: number;
}

export interface SampleResult {
  isValid: boolean;
  details: {
    centroidOk: boolean;
    fluxOk: boolean;
    rmsOk: boolean;
    centroidValue: number;
    fluxValue: number;
    rmsValue: number;
  };
}

export interface DetectionResult {
  isDrone: boolean;
  timestamp: number;
  strictness: StrictnessLevel;
  samplesCount: number;
  validSamples: number;
  requiredValid: number;
  samples: SampleResult[];
  detectionMethod: string;
}

class FFTDroneDetectorService {
  private config: DetectorConfig;
  private samples: RawSample[] = [];
  private isCollecting: boolean = false;
  private collectionTimeout: number | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private currentRawSample: RawSample | null = null;
  
  constructor() {
    this.config = {
      parameters: {
        centroidMin: 200,
        centroidMax: 800,
        fluxMin: 0,
        fluxMax: 1.5,
        rmsMin: 0.01,
        rmsMax: 1.0,
      },
      intervalMs: 500,
      samplesCount: 3,
      strictness: 'normal',
    };
  }
  
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }
  
  private emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
  
  setConfig(config: Partial<DetectorConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('onConfigChanged', this.config);
  }
  
  getConfig(): DetectorConfig {
    return { ...this.config };
  }
  
  addSample(centroid: number, flux: number, rms: number): void {
    const sample: RawSample = {
      timestamp: Date.now(),
      centroid,
      flux,
      rms,
    };
    
    this.currentRawSample = sample;
    
    if (this.isCollecting) {
      this.samples.push(sample);
      this.emit('onSampleCollected', { 
        sample, 
        samplesCount: this.samples.length, 
        totalNeeded: this.config.samplesCount 
      });
      
      if (this.samples.length >= this.config.samplesCount) {
        this.stopCollection();
        this.analyzeAndDetect();
      }
    }
  }
  
  getCurrentRawSample(): RawSample | null {
    return this.currentRawSample;
  }
  
  startCollection(): void {
    if (this.isCollecting) return;
    
    this.samples = [];
    this.isCollecting = true;
    this.emit('onCollectionStarted', { samplesCount: this.config.samplesCount });
    
    const timeout = this.config.intervalMs * this.config.samplesCount + 1000;
    this.collectionTimeout = window.setTimeout(() => {
      if (this.isCollecting && this.samples.length > 0) {
        this.stopCollection();
        this.analyzeAndDetect();
      }
    }, timeout);
  }
  
  stopCollection(): void {
    if (!this.isCollecting) return;
    
    this.isCollecting = false;
    if (this.collectionTimeout) {
      clearTimeout(this.collectionTimeout);
      this.collectionTimeout = null;
    }
    this.emit('onCollectionStopped', { samplesCount: this.samples.length });
  }
  
  private analyzeAndDetect(): void {
    if (this.samples.length === 0) {
    this.emit('onNoSamples');
    return;
  }
  
  const { parameters, strictness, samplesCount } = this.config;
  
  // Определяем, сколько параметров нужно для прохождения такта
  let requiredParamsPerSample: number;
  switch (strictness) {
    case 'sensitive':
      requiredParamsPerSample = 3;
      break;
    case 'normal':
      requiredParamsPerSample = 2;
      break;
    case 'rough':
      requiredParamsPerSample = 1;
      break;
    default:
      requiredParamsPerSample = 2;
  }
  
    const samplesResults: SampleResult[] = this.samples.map(sample => {
        const centroidOk = sample.centroid >= parameters.centroidMin && sample.centroid <= parameters.centroidMax;
        const fluxOk = sample.flux >= parameters.fluxMin && sample.flux <= parameters.fluxMax;
        const rmsOk = sample.rms >= parameters.rmsMin && sample.rms <= parameters.rmsMax;
        
        // ✅ Подсчитываем количество совпавших параметров
        let paramsOkCount = 0;
        if (centroidOk) paramsOkCount++;
        if (fluxOk) paramsOkCount++;
        if (rmsOk) paramsOkCount++;
        
        // ✅ Такт считается валидным, если количество совпавших параметров >= requiredParamsPerSample
        const isValid = paramsOkCount >= requiredParamsPerSample;
        
        return {
        isValid,
        details: {
            centroidOk,
            fluxOk,
            rmsOk,
            centroidValue: sample.centroid,
            fluxValue: sample.flux,
            rmsValue: sample.rms,
        },
        };
    });
    
    const validSamplesPerParam = { centroid: 0, flux: 0, rms: 0 };
    
    const sampleValidity: boolean[] = samplesResults.map(result => {
      let paramsOk = 0;
      if (result.details.centroidOk) paramsOk++;
      if (result.details.fluxOk) paramsOk++;
      if (result.details.rmsOk) paramsOk++;
      
      if (result.details.centroidOk) validSamplesPerParam.centroid++;
      if (result.details.fluxOk) validSamplesPerParam.flux++;
      if (result.details.rmsOk) validSamplesPerParam.rms++;
      
      return paramsOk >= requiredParamsPerSample;
    });
    
    const validSamplesCount = sampleValidity.filter(v => v).length;
    const requiredValid = samplesCount;
    const isDrone = validSamplesCount >= requiredValid;
    
    const detectionMethod = this.buildDetectionMethod(
        //requiredParamsPerSample, 
        validSamplesPerParam);
    
    const result: DetectionResult = {
      isDrone,
      timestamp: Date.now(),
      strictness,
      samplesCount: this.samples.length,
      validSamples: validSamplesCount,
      requiredValid,
      samples: samplesResults,
      detectionMethod,
    };
    
    this.emit('onDetectionResult', result);
    
    if (isDrone) {
      this.emit('onDroneDetected', result);
    }
  }
  
  private buildDetectionMethod(
    //requiredParamsPerSample: number, 
    validSamplesPerParam: { centroid: number; flux: number; rms: number }): string {
    const strictnessText = {
      sensitive: 'чувствительный (3/3 параметра)',
      normal: 'средний (2/3 параметра)',
      rough: 'грубый (1/3 параметра)',
    }[this.config.strictness];
    
    const paramStats = [];
    if (validSamplesPerParam.centroid >= this.config.samplesCount) paramStats.push('центр масс');
    if (validSamplesPerParam.flux >= this.config.samplesCount) paramStats.push('спектральный поток');
    if (validSamplesPerParam.rms >= this.config.samplesCount) paramStats.push('громкость');
    
    const paramText = paramStats.length > 0 ? `по параметрам: ${paramStats.join(', ')}` : 'ни один параметр не стабилен';
    
    return `Частотный анализ (${this.config.samplesCount} тактов, ${strictnessText}), ${paramText}`;
  }
  
  reset(): void {
    this.stopCollection();
    this.samples = [];
    this.currentRawSample = null;
    this.emit('onReset');
  }
  
  getStatus(): {
    isCollecting: boolean;
    samplesCollected: number;
    neededSamples: number;
    currentSample: RawSample | null;
  } {
    return {
      isCollecting: this.isCollecting,
      samplesCollected: this.samples.length,
      neededSamples: this.config.samplesCount,
      currentSample: this.currentRawSample,
    };
  }
}

export const fftDroneDetector = new FFTDroneDetectorService();