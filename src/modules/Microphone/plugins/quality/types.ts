export interface QualityMetrics {
  snr: number;        // Signal-to-Noise Ratio (dB)
  clarity: number;    // Четкость (%)
  dynamics: number;   // Динамический диапазон (%)
  peakLevel: number;  // Пиковый уровень (dB)
  overall: number;    // Общее качество (%)
}

export interface QualityThresholds {
  excellent: number;  // >= 80%
  good: number;       // >= 60%
  fair: number;       // >= 40%
  poor: number;       // >= 20%
}

export interface QualityConfig {
  maxRms: number;           // Максимальное значение RMS для нормализации
  historySize: number;      // Размер истории для анализа
  snrMaxValue: number;      // Максимальное значение SNR (dB)
  dynamicRangeMax: number;  // Максимальный динамический диапазон (dB)
  updateIntervalMs: number; // Интервал обновления (мс)
}

export interface QualityAnalysisResult {
  metrics: QualityMetrics;
  rating: {
    text: string;
    class: string;
    color: string;
  };
  recommendation: string;
  timestamp: number;
}

export interface SoundQualityStatus {
  isAnalyzing: boolean;
  currentRms: number;
  historyLength: number;
  lastResult: QualityAnalysisResult | null;
}

