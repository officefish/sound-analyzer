// src/services/AudioFFTAnalysisService.ts

export interface AnalysisResult {
  timestamp: number;
  isDetected: boolean;
  centroid: number;
  flux: number;
  rms: number;
  spectrum: number[];
  lowEnergyPercent?: number;
  stability?: number;
  highEnergyPercent?: number;
}

export interface AnalysisConfig {
  centroidMin: number;
  centroidMax: number;
  fluxMin: number;
  fluxMax: number;
  rmsMin: number;
  rmsMax: number;
  fftSize: number;
  smoothingTimeConstant: number;
}

class AudioFFTAnalysisService {
  private analyserNode: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastResult: AnalysisResult | null = null;
  private config: AnalysisConfig = {
    centroidMin: 200,
    centroidMax: 800,
    fluxMin: 0,
    fluxMax: 1.5,
    rmsMin: 0.01,
    rmsMax: 1.0,
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
  };
  
  private listeners: Map<string, Set<Function>> = new Map();
  
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
  
  setConfig(config: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.analyserNode) {
      this.analyserNode.fftSize = this.config.fftSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
    }
    console.log('[AudioFFTAnalysis] Config updated:', this.config);
  }
  
  getConfig(): AnalysisConfig {
    return { ...this.config };
  }
  
  async start(stream?: MediaStream): Promise<void> {
    if (this.isRunning) return;
    
    try {
      const targetStream = stream || await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.audioContext = new AudioContext();
      this.sourceNode = this.audioContext.createMediaStreamSource(targetStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.config.fftSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
      
      this.sourceNode.connect(this.analyserNode);
      await this.audioContext.resume();
      
      this.isRunning = true;
      this.emit('onStart');
      this.startAnalysisLoop();
      
    } catch (error) {
      console.error('Failed to start FFT analysis:', error);
      this.emit('onError', error);
    }
  }
  
  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isRunning = false;
    this.emit('onStop');
  }
  
  private startAnalysisLoop(): void {
    if (!this.analyserNode) return;
    
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    let prevSpectrum: number[] = [];
    
    const analyze = () => {
      if (!this.isRunning || !this.analyserNode) return;
      
      this.analyserNode.getByteFrequencyData(dataArray);
      const spectrum = Array.from(dataArray).map(v => v / 255);
      
      const centroid = this.calculateSpectralCentroid(spectrum);
      const flux = prevSpectrum.length > 0 ? this.calculateSpectralFlux(spectrum, prevSpectrum) : 0;
      const rms = this.calculateRMS(spectrum);
      const lowEnergyPercent = this.calculateLowEnergyPercent(spectrum);
      const highEnergyPercent = this.calculateHighEnergyPercent(spectrum);
      const stability = flux > 0 ? Math.max(0, 1 - flux / 2) : 1;
      
      // Детекция с использованием полных диапазонов
      const isDetected = this.detectDrone(centroid, flux, rms);
      
      const result: AnalysisResult = {
        timestamp: Date.now(),
        isDetected,
        centroid,
        flux,
        rms,
        spectrum,
        lowEnergyPercent,
        stability,
        highEnergyPercent,
      };
      
      this.lastResult = result;
      this.emit('onResult', result);
      
      prevSpectrum = spectrum;
      this.animationFrameId = requestAnimationFrame(analyze);
    };
    
    analyze();
  }
  
  private calculateSpectralCentroid(spectrum: number[]): number {
    let numerator = 0;
    let denominator = 0;
    const nyquist = this.audioContext?.sampleRate ? this.audioContext.sampleRate / 2 : 24000;
    
    for (let i = 0; i < spectrum.length; i++) {
      const freq = (i / spectrum.length) * nyquist;
      numerator += freq * spectrum[i];
      denominator += spectrum[i];
    }
    
    return denominator > 0 ? numerator / denominator : 0;
  }
  
  private calculateSpectralFlux(current: number[], prev: number[]): number {
    let flux = 0;
    for (let i = 0; i < current.length; i++) {
      const diff = current[i] - (prev[i] || 0);
      flux += diff * diff;
    }
    return Math.sqrt(flux);
  }
  
  private calculateRMS(spectrum: number[]): number {
    let sum = 0;
    for (let i = 0; i < spectrum.length; i++) {
      sum += spectrum[i] * spectrum[i];
    }
    return Math.sqrt(sum / spectrum.length);
  }
  
  private calculateLowEnergyPercent(spectrum: number[]): number {
    const lowBandCount = Math.floor(spectrum.length * 0.1);
    let lowEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      totalEnergy += spectrum[i];
      if (i < lowBandCount) {
        lowEnergy += spectrum[i];
      }
    }
    
    return totalEnergy > 0 ? (lowEnergy / totalEnergy) * 100 : 0;
  }
  
  private calculateHighEnergyPercent(spectrum: number[]): number {
    const highBandStart = Math.floor(spectrum.length * 0.5);
    let highEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      totalEnergy += spectrum[i];
      if (i >= highBandStart) {
        highEnergy += spectrum[i];
      }
    }
    
    return totalEnergy > 0 ? (highEnergy / totalEnergy) * 100 : 0;
  }
  
  private detectDrone(centroid: number, flux: number, rms: number): boolean {
    const centroidOk = centroid >= this.config.centroidMin && centroid <= this.config.centroidMax;
    const fluxOk = flux >= this.config.fluxMin && flux <= this.config.fluxMax;
    const rmsOk = rms >= this.config.rmsMin && rms <= this.config.rmsMax;
    
    return centroidOk && fluxOk && rmsOk;
  }
  
  getLastResult(): AnalysisResult | null {
    return this.lastResult;
  }
  
  isActive(): boolean {
    return this.isRunning;
  }
}

export const audioAnalysis = new AudioFFTAnalysisService();