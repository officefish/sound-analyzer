import { IPlugin, IPluginContext } from './plugins';

// Типы состояний для анализаторов
export type AnalysisState = string | number | symbol;

// Базовые метрики анализа
export interface IAnalysisMetrics {
  confidence: number;
  timestamp: number;
  duration?: number;
  [key: string]: any;
}

// Результат анализа
export interface IAnalysisResult<T = any> {
  id: string;
  type: string;
  state: AnalysisState;
  confidence: number;
  data: T;
  metrics: IAnalysisMetrics;
  samples?: any[];
  isDetected: boolean;
}

// Конфигурация анализатора
export interface IAnalyzerConfig {
  enabled: boolean;
  autoStart: boolean;
  intervalMs: number;
  numSamples: number;
  bufferSize: number;
  [key: string]: any;
}

// Статус анализатора
export interface IAnalyzerStatus {
  isAnalyzing: boolean;
  isCollecting: boolean;
  progress: number;
  samplesCollected: number;
  totalSamples: number;
  lastResult: IAnalysisResult | null;
  detectionCount: number;
  error?: string;
}

// События анализатора
export interface IAnalyzerEvents {
  onStart: () => void;
  onStop: () => void;
  onProgress: (progress: number) => void;
  onResult: (result: IAnalysisResult) => void;
  onStateDetected: (state: AnalysisState, result: IAnalysisResult) => void;
  onError: (error: Error) => void;
}

// Интерфейс для анализатора данных
export interface IDataAnalyzer extends IPlugin {
  // Основные методы анализа
  startAnalysis(context?: IPluginContext): void;
  stopAnalysis(): void;
  analyze(data: any): Promise<IAnalysisResult>;
  
  // Управление данными
  addSample(sample: any): void;
  getSamples(): any[];
  clearSamples(): void;
  
  // Конфигурация
  getConfig(): IAnalyzerConfig;
  setConfig(config: Partial<IAnalyzerConfig>): void;
  
  // Статус и метрики
  getStatus(): IAnalyzerStatus;
  getMetrics(): Record<string, number>;
  resetMetrics(): void;
  
  // Обработчики событий
  on(event: keyof IAnalyzerEvents, handler: Function): void;
  off(event: keyof IAnalyzerEvents, handler: Function): void;
  emit(event: keyof IAnalyzerEvents, ...args: any[]): void;
  
  // Работа с отчетами
  generateReport(result: IAnalysisResult): Promise<any>;
  exportData(format: 'json' | 'csv'): string;
  
  // Валидация
  validateSample(sample: any): boolean;
  validateConfig(config: Partial<IAnalyzerConfig>): boolean;
}





