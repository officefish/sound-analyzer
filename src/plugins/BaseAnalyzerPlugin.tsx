// src/plugins/BaseAnalyzerPlugin.ts

import { 
    IDataAnalyzer, 
    IAnalyzerConfig, 
    IAnalyzerStatus, 
    IAnalysisResult } from '../types/analyzers';
import { IPluginContext, IPluginWidget } from '../types/plugins';
import { ModuleType } from '../types/modules';

// Тип для обработчиков событий
type EventHandler = (...args: any[]) => void;

export abstract class BaseAnalyzerPlugin implements IDataAnalyzer {
  // Базовые свойства плагина
  abstract id: string;
  abstract name: string;
  abstract version: string;
  abstract description: string;
  abstract icon: string;
  abstract moduleId: ModuleType;
  
  enabled = false;
  settings: Record<string, any> = {};
  abstract widget?: IPluginWidget;
  
  // Свойства анализатора
  protected isAnalyzingFlag = false;
  protected isCollectingFlag = false;
  protected samples: any[] = [];
  protected lastResult: IAnalysisResult | null = null;
  protected detectionCount = 0;
  protected error: Error | null = null;
  protected analysisInterval: number | null = null;
  protected currentStream: any = null;
  protected currentReportId: string | null = null;
  
  // Конфигурация по умолчанию
  protected defaultConfig: IAnalyzerConfig = {
    enabled: true,
    autoStart: false,
    intervalMs: 3000,
    bufferSize: 100,
    numSamples: 1
  };
  
  protected currentConfig: IAnalyzerConfig;
  
  // Метрики
  protected metrics: Record<string, number> = {
    totalAnalyses: 0,
    successfulDetections: 0,
    averageConfidence: 0,
    lastAnalysisDuration: 0,
  };
  
  // Обработчики событий
  private eventHandlers: Map<keyof any, Set<EventHandler>> = new Map();
  
  constructor() {
    this.currentConfig = { ...this.defaultConfig };
  }
  
  // ==================== Жизненный цикл ====================
  
  onActivate(context?: IPluginContext): void {
    console.log(`[${this.name}] Activating analyzer plugin v${this.version}`);
    
    if (this.currentConfig.autoStart) {
      this.startAnalysis(context);
    }
  }
  
  onDeactivate(): void {
    console.log(`[${this.name}] Deactivating analyzer plugin`);
    this.stopAnalysis();
    this.clearSamples();
    this.removeAllListeners();
  }
  
  onModuleEvent(event: string, data: any, context?: IPluginContext): void {
    switch (event) {
      case 'recordingStarted':
      case 'streamAvailable':
        if (this.currentConfig.autoStart && !this.isAnalyzingFlag) {
          if (data?.stream) this.currentStream = data.stream;
          this.startAnalysis(context);
        }
        break;
        
      case 'recordingStopped':
        if (this.currentConfig.autoStart && this.isAnalyzingFlag) {
          this.stopAnalysis();
        }
        break;
        
      case 'dataAvailable':
        if (data?.sample && this.validateSample(data.sample)) {
          this.addSample(data.sample);
        }
        break;
    }
  }
  
  // ==================== Основные методы анализа ====================
  
  startAnalysis(
    context?: IPluginContext
  ): void {

    if (context) {
        // do something with context here
    } 

    
    if (this.isAnalyzingFlag) {
      console.warn(`[${this.name}] Analysis already in progress`);
      return;
    }
    
    this.isAnalyzingFlag = true;
    this.error = null;
    this.prepareForAnalysis();
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    
    this.analysisInterval = window.setInterval(() => {
      if (this.samples.length > 0) {
        this.processSamples();
      }
    }, this.currentConfig.intervalMs);
    
    this.emit('onStart');
    console.log(`[${this.name}] Analysis started (interval: ${this.currentConfig.intervalMs}ms)`);
  }
  
  stopAnalysis(): void {
    if (!this.isAnalyzingFlag) return;
    
    this.isAnalyzingFlag = false;
    this.isCollectingFlag = false;
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    this.emit('onStop');
    console.log(`[${this.name}] Analysis stopped`);
  }
  
  abstract analyze(data: any): Promise<IAnalysisResult>;
  
  // ==================== Управление данными ====================
  
  addSample(sample: any): void {
    if (!this.validateSample(sample)) {
      console.warn(`[${this.name}] Invalid sample rejected`);
      return;
    }
    
    this.samples.push(sample);
    
    // Ограничиваем размер буфера
    if (this.samples.length > this.currentConfig.bufferSize) {
      this.samples.shift();
    }
    
    const progress = (this.samples.length / this.currentConfig.bufferSize) * 100;
    this.emit('onProgress', progress);
  }
  
  getSamples(): any[] {
    return [...this.samples];
  }
  
  clearSamples(): void {
    this.samples = [];
    this.lastResult = null;
    console.log(`[${this.name}] Samples cleared`);
  }
  
  // ==================== Конфигурация ====================
  
  getConfig(): IAnalyzerConfig {
    return { ...this.currentConfig };
  }
  
  setConfig(config: Partial<IAnalyzerConfig>): void {
    if (!this.validateConfig(config)) {
      throw new Error(`[${this.name}] Invalid configuration`);
    }
    
    const wasAnalyzing = this.isAnalyzingFlag;
    
    if (wasAnalyzing) {
      this.stopAnalysis();
    }
    
    this.currentConfig = { ...this.currentConfig, ...config };
    
    if (wasAnalyzing && this.currentConfig.enabled) {
      this.startAnalysis();
    }
    
    this.saveConfig();
    console.log(`[${this.name}] Configuration updated:`, this.currentConfig);
  }
  
  // ==================== Статус и метрики ====================
  
  getStatus(): IAnalyzerStatus {
    return {
      isAnalyzing: this.isAnalyzingFlag,
      isCollecting: this.isCollectingFlag,
      progress: this.samples.length / this.currentConfig.bufferSize,
      samplesCollected: this.samples.length,
      totalSamples: this.currentConfig.bufferSize,
      lastResult: this.lastResult,
      detectionCount: this.detectionCount,
      error: this.error?.message,
    };
  }
  
  getMetrics(): Record<string, number> {
    return { ...this.metrics };
  }
  
  resetMetrics(): void {
    this.metrics = {
      totalAnalyses: 0,
      successfulDetections: 0,
      averageConfidence: 0,
      lastAnalysisDuration: 0,
    };
    this.detectionCount = 0;
  }
  
  // ==================== Обработчики событий ====================
  
  on(event: keyof any, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }
  
  off(event: keyof any, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }
  
  emit(event: keyof any, ...args: any[]): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`[${this.name}] Error in event handler for ${String(event)}:`, error);
      }
    });
  }
  
  removeAllListeners(): void {
    this.eventHandlers.clear();
  }
  
  // ==================== Работа с отчетами ====================
  
  abstract generateReport(result: IAnalysisResult): Promise<any>;
  
  exportData(format: 'json' | 'csv'): string {
    const data = {
      config: this.currentConfig,
      metrics: this.metrics,
      samples: this.samples,
      lastResult: this.lastResult,
      detectionCount: this.detectionCount,
    };
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      return this.convertToCSV(data);
    }
    
    return '';
  }
  
  // ==================== Валидация ====================
  
  validateSample(sample: any): boolean {
    return sample !== null && sample !== undefined;
  }
  
  validateConfig(config: Partial<IAnalyzerConfig>): boolean {
    if (config.intervalMs !== undefined && (config.intervalMs < 10 || config.intervalMs > 10000)) {
      return false;
    }
    if (config.bufferSize !== undefined && (config.bufferSize < 10 || config.bufferSize > 10000)) {
      return false;
    }
    return true;
  }
  
  // ==================== Вспомогательные методы ====================
  
  protected prepareForAnalysis(): void {
    this.currentReportId = this.generateReportUniqueId();
    console.log(`[${this.name}] Generated report ID: ${this.currentReportId}`);
  }
  
  protected generateReportUniqueId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${this.id}_${timestamp}_${random}`;
  }
  
  protected async processSamples(): Promise<void> {
    if (this.samples.length === 0) return;
    
    const startTime = performance.now();
    
    try {
      const result = await this.analyze(this.samples);
      await this.handleAnalysisResult(result);
      
      this.metrics.lastAnalysisDuration = performance.now() - startTime;
      this.metrics.totalAnalyses++;
      
      if (result.isDetected) {
        this.metrics.successfulDetections++;
        this.detectionCount++;
      }
      
      this.metrics.averageConfidence = 
        (this.metrics.averageConfidence * (this.metrics.totalAnalyses - 1) + result.confidence) 
        / this.metrics.totalAnalyses;
      
    } catch (error) {
      this.handleError(error as Error);
    }
  }
  
  protected async handleAnalysisResult(result: IAnalysisResult): Promise<void> {
    this.lastResult = result;
    this.emit('onResult', result);
    
    if (result.isDetected) {
      this.emit('onStateDetected', result.state, result);
      await this.generateReport(result);
    }
    
    // Очищаем образцы после обработки
    this.clearSamples();
  }
  
  protected handleError(error: Error): void {
    this.error = error;
    this.emit('onError', error);
    console.error(`[${this.name}] Analysis error:`, error);
  }
  
  protected saveConfig(): void {
    try {
      localStorage.setItem(`${this.id}-config`, JSON.stringify(this.currentConfig));
    } catch (error) {
      console.error(`[${this.name}] Failed to save config:`, error);
    }
  }
  
  protected loadConfig(): void {
    try {
      const saved = localStorage.getItem(`${this.id}-config`);
      if (saved) {
        const config = JSON.parse(saved);
        this.currentConfig = { ...this.currentConfig, ...config };
      }
    } catch (error) {
      console.error(`[${this.name}] Failed to load config:`, error);
    }
  }
  
  private convertToCSV(data: any): string {

    if (data) {
        // Override this method for real esports 
    } 

    // Базовая реализация CSV экспорта
    const headers = ['timestamp', 'state', 'confidence', 'isDetected'];
    const rows = [headers];
    
    if (this.lastResult) {
      rows.push([
        new Date().toISOString(),
        String(this.lastResult.state),
        String(this.lastResult.confidence),
        String(this.lastResult.isDetected),
      ]);
    }
    
    return rows.map(row => row.join(',')).join('\n');
  }
  
  // ==================== Абстрактные методы для переопределения ====================
  
  abstract execute(action: string, data?: any, context?: IPluginContext): any;
}