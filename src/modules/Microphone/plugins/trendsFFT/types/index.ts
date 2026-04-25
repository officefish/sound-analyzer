// src/plugins/microphone2/types/index.ts - исправленные типы

// ============ Базовые интерфейсы ============

export interface Range {
  min: number;
  max: number;
}

export interface OptionalRange {
  min?: number;
  max?: number;
}

// ============ Спектральные пороги ============

export interface SpectralThresholds {
  centroid: Range;
  flux: Range;
  rms: Range;
}

// ============ Временные паттерны (базовые) ============

export interface BaseTemporalPatterns {
  volumeTrend: string[];
  frequencyTrend: string[];
  longTermStability: string[];
  periodicity: string[];
  envelopeShape: string[];
}

// ============ Расширенные временные паттерны ============

export interface AdvancedTemporalPatterns extends BaseTemporalPatterns {
  centroidStd: Range;
  fluxStd: Range;
  rmsStd: Range;
  activityRatio: Range;
  avgSilenceDuration: Range;
  avgBurstDuration: Range;
  frequencyJumps: FrequencyJumpsConfig;
  peakToAverageRatio: Range;
  attackPattern?: string[];
  decayPattern?: string[];
}

// ============ Конфигурация частотных скачков ============

export interface FrequencyJumpsConfig {
  enabled: boolean;
  minJumpsRequired: number;
  densityPerSecond: OptionalRange;
  magnitudeRange?: OptionalRange;
}

// ============ Полные временные паттерны (с optional полями для гибкости) ============

export interface TemporalPatterns extends BaseTemporalPatterns {
  centroidStd?: Range;
  fluxStd?: Range;
  rmsStd?: Range;
  activityRatio?: Range;
  avgSilenceDuration?: Range;
  avgBurstDuration?: Range;
  frequencyJumps?: FrequencyJumpsConfig;
  peakToAverageRatio?: Range;
  attackPattern?: string[];
  decayPattern?: string[];
}

// ============ Базовый шаблон звука ============

export interface BaseSoundTemplate {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  thresholds: SpectralThresholds;
  temporalPatterns: TemporalPatterns;
  isEnabled: boolean;
}

// ============ Системный шаблон ============

export interface SystemPatternTemplate extends BaseSoundTemplate {
  isSystem: true;
}

// ============ Пользовательский шаблон ============

export interface UserPatternTemplate extends BaseSoundTemplate {
  isSystem: false;
  source: 'manual' | 'audio_file';
  confidence?: number;
  audioFile?: {
    name: string;
    duration: number;
    sampleRate: number;
  };
  createdAt: number;
  updatedAt: number;
}

// ============ Общий тип для шаблонов в store ============

export type PatternTemplate = SystemPatternTemplate | UserPatternTemplate;

// ============ Данные для анализа ============

export interface TrendsSample {
  centroid: number;
  flux: number;
  rms: number;
  timestamp: number;
  isValid: boolean;
  state?: string | null;
  stateConfidence?: number;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'veryLow';

export interface TrendsDetectionResult {
  isDetected: boolean;
  state: string;
  stateName: string;
  stateIcon: string;
  stateColor: string;
  confidence: number;
  confidenceLevel?: ConfidenceLevel;
  samples: TrendsSample[];
  analysis: any;
  timestamp: number;
}

export interface TrendsDetectorConfig {
  intervalMs: number;
  measurementsCount: number;
}

// ============ Статистика и тренды ============

export interface TrendsStatistics {
  centroidStd: number;
  fluxStd: number;
  rmsStd: number;
}

export interface TrendsActivity {
  activityRatio: number;
  avgSilenceDuration: number;
  avgBurstDuration: number;
}

export interface TrendsFrequencyJumps {
  enabled: boolean;
  actualJumps: number;
  densityPerSecond: number;
  avgMagnitude: number;
  minMagnitude: number;
  maxMagnitude: number;
}

export interface TrendsData {
  statistics: TrendsStatistics;
  activity: TrendsActivity;
  frequencyJumps: TrendsFrequencyJumps;
  trends: {
    volumeTrend: string;
    frequencyTrend: string;
  };
  stability: {
    longTermStability: string;
    periodicity: string;
    stabilityScore: number;
  };
  envelope: {
    shape: string;
    peakToAverageRatio: number;
    attackPattern?: string;
    decayPattern?: string;
  };
}

// ============ Отчеты и скоринг ============

export interface ScoreItem {
  state: string;
  stateName: string;
  stateIcon: string;
  score: number;
  spectralScore: number;
  temporalScore: number;
}

export interface AlternativeState {
  state: string;
  stateName: string;
  score: number;
}

export interface TrendsAnalysisReport {
  id: string;
  timestamp: number;
  detectionNumber: number;
  samplesCount: number;
  validSamples: number;
  isDetected: boolean;
  detectedState: string;
  detectedStateName: string;
  detectedStateIcon: string;
  confidence: number;
  method: string;
  intervalMs: number;
  totalAnalysisTimeMs: number;
  parameters: {
    intervalMs: number;
    measurementsCount: number;
  };
  tactData: Array<{
    tact: number;
    centroid: number;
    flux: number;
    rms: number;
  }>;
  stateScores: ScoreItem[];
  summary: {
    primaryState: string;
    primaryStateName: string;
    primaryStateIcon: string;
    confidence: number;
    alternativeStates: AlternativeState[];
    stabilityScore: number;
    activityRatio: number;
  };
  averages: {
    centroidMin: number;
    centroidMax: number;
    centroidStd: number;
    fluxMin: number;
    fluxMax: number;
    fluxStd: number;
    rmsMin: number;
    rmsMax: number;
    rmsStd: number;
  };
  trends: TrendsData;
  tags: string[];
}

// ============ Формы для создания/редактирования ============

export interface TemplateFormData {
  name: string;
  icon: string;
  color: string;
  description: string;
  thresholds: SpectralThresholds;
  temporalPatterns: AdvancedTemporalPatterns;
}

export const DEFAULT_TEMPLATE_FORM_DATA: TemplateFormData = {
  name: '',
  icon: '🎵',
  color: '#6bcf7f',
  description: '',
  thresholds: {
    centroid: { min: 100, max: 3000 },
    flux: { min: 0.1, max: 2.0 },
    rms: { min: 0.02, max: 0.5 },
  },
  temporalPatterns: {
    volumeTrend: ['stable'],
    frequencyTrend: ['stable'],
    longTermStability: ['medium'],
    periodicity: ['irregular'],
    envelopeShape: ['sustained'],
    centroidStd: { min: 50, max: 500 },
    fluxStd: { min: 0.1, max: 0.8 },
    rmsStd: { min: 0.01, max: 0.1 },
    activityRatio: { min: 0.4, max: 0.9 },
    avgSilenceDuration: { min: 0.05, max: 0.5 },
    avgBurstDuration: { min: 0.1, max: 1.0 },
    frequencyJumps: {
      enabled: false,
      minJumpsRequired: 5,
      densityPerSecond: { max: 20 }
    },
    peakToAverageRatio: { min: 1.5, max: 5.0 },
  },
};

// ============ Системные состояния звуков ============

export const SOUND_STATES: Record<string, Omit<SystemPatternTemplate, 'id' | 'isEnabled' | 'isSystem'>> = {
  WIND: {
    key: 'WIND',
    name: 'Ветер',
    icon: '💨',
    color: '#a0c4ff',
    description: 'Постоянный ровный шум с низкой частотой, высокая стабильность',
    thresholds: {
      centroid: { min: 100, max: 800 },
      flux: { min: 0.1, max: 0.6 },
      rms: { min: 0.04, max: 0.18 },
    },
    temporalPatterns: {
      centroidStd: { min: 5, max: 80 },
      fluxStd: { min: 0.02, max: 0.15 },
      rmsStd: { min: 0.005, max: 0.04 },
      activityRatio: { min: 0.9, max: 1.0 },
      avgSilenceDuration: { min: 0, max: 0.05 },
      avgBurstDuration: { min: 5, max: 60 },
      frequencyJumps: { 
        enabled: false,
        minJumpsRequired: 10,
        densityPerSecond: { max: 2 }
      },
      volumeTrend: ['stable'],
      frequencyTrend: ['stable'],
      longTermStability: ['high', 'veryHigh'],
      periodicity: ['none', 'irregular'],
      envelopeShape: ['sustained'],
      peakToAverageRatio: { min: 1.0, max: 1.5 }
    }
  },
  // ... остальные состояния (BIRDS, DRONE, OFFICE, TRAFFIC, QUIET, VOICE)
};

export type SoundStateKey = keyof typeof SOUND_STATES;

// ============ Props для компонентов ============

export interface SoundTemplateListProps {
  onTemplateToggle?: (templateId: string, enabled: boolean) => void;
  onTemplateSelect?: (template: PatternTemplate) => void;
  compact?: boolean;
}

export interface SoundTemplateEditorProps {
  template?: PatternTemplate | null;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: (templateId: string) => void;
}

// ============ Helper functions ============

export const isUserPattern = (template: PatternTemplate): template is UserPatternTemplate => {
  return !template.isSystem;
};

export const isSystemPattern = (template: PatternTemplate): template is SystemPatternTemplate => {
  return template.isSystem;
};