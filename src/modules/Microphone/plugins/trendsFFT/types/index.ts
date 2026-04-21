export interface TrendsSample {
  centroid: number;
  flux: number;
  rms: number;
  timestamp: number;
  isValid: boolean;
  state?: string | null;           // ✅ Добавляем - состояние для каждого сэмпла
  stateConfidence?: number;        // ✅ Добавляем - уверенность для каждого сэмпла
}

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'veryLow';

export interface TrendsDetectionResult {
  isDetected: boolean;
  state: string;
  stateName: string;
  stateIcon: string;
  stateColor: string;
  confidence: number;
  confidenceLevel?: ConfidenceLevel; // Явно перечисляем все возможные значения
  samples: TrendsSample[];
  analysis: any;
  timestamp: number;
}

export interface TrendsDetectorConfig {
  intervalMs: number;
  measurementsCount: number;
  //strictness: 'low' | 'normal' | 'high';
}


export interface TemporalPatterns {
  centroidStd: { min: number; max: number };
  fluxStd: { min: number; max: number };
  rmsStd: { min: number; max: number };
  activityRatio: { min: number; max: number };
  avgSilenceDuration?: { min: number; max: number };
  avgBurstDuration?: { min: number; max: number };
  frequencyJumps?: {
    enabled: boolean;
    magnitudeRange: { min: number; max: number };
    densityPerSecond: { min: number; max: number };
    minJumpsRequired: number;
  };
  volumeTrend: string[];
  frequencyTrend: string[];
  longTermStability: string[];
  periodicity: string[];
  envelopeShape?: string[];
  attackPattern?: string[];
  decayPattern?: string[];
}

// Состояния звуков
export const SOUND_STATES: Record<string, {
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  temporalPatterns: TemporalPatterns;
  thresholds: {
    centroid: { min: number; max: number };
    flux: { min: number; max: number };
    rms: { min: number; max: number };
  };
}> = {
 
  OFFICE_NOISE_PATTERN: {
    key: 'OFFICE',
    name: 'Офис',
    icon: '💨',
    color: '#8521ac',
    description: 'Неровный шум с элементами звуков телевизора',
    thresholds: {
      centroid: { min: 1500, max: 5000 },    // Сужу диапазон
      flux: { min: 0.3, max: 1.5 },
      rms: { min: 0.05, max: 0.25 }
    },
    temporalPatterns: {
      centroidStd: { min: 300, max: 800 },    // Как у вас (753)
      fluxStd: {min: 0.2, max: 0.62 },
      rmsStd: { min: 0.03, max: 0.1 },       // Как у вас (0.062)
      activityRatio: { min: 0.8, max: 1.0 }, // Как у вас (0.987)
      avgSilenceDuration: { min: 0, max: 0.2 }, // Небольшие паузы
      avgBurstDuration: { min: 2, max: 10 },    // Длинные всплески
       volumeTrend: ['increasing', 'fluctuating', 'modulated'],
      frequencyTrend: ['oscillating', 'modulated', 'fluctuating'],
      longTermStability: ['veryLow', 'low'],
      periodicity: ['irregular', 'none'],
      envelopeShape: ['sustained', 'complex'],
    }
  },

  WIND: {
    key: 'WIND',
    name: 'Ветер',
    icon: '💨',
    color: '#a0c4ff',
    description: 'Постоянный ровный шум',
    temporalPatterns: {
      centroidStd: { min: 20, max: 150 },
      fluxStd: { min: 0.05, max: 0.3 },
      rmsStd: { min: 0.005, max: 0.04 },
      activityRatio: { min: 0.9, max: 1.0 },
      volumeTrend: ['stable'],
      frequencyTrend: ['stable'],
      periodicity: ['random', 'irregular'],
      attackPattern: ['smooth'],
      decayPattern: ['smooth'],
      longTermStability: ['high'],
    },
    thresholds: {
      centroid: { min: 100, max: 700 },
      flux: { min: 0.25, max: 1.0 },
      rms: { min: 0.04, max: 0.22 },
    },
  },
  DRONE: {
    key: 'DRONE',
    name: 'Дрон',
    icon: '🚁',
    color: '#ff6b6b',
    description: 'Низкочастотный стабильный гул',
    temporalPatterns: {
      centroidStd: { min: 200, max: 1200 },
      fluxStd: { min: 0.2, max: 0.5 },
      rmsStd: { min: 0.15, max: 0.7 },
      activityRatio: { min: 0.95, max: 1.0 },
      volumeTrend: ['stable'],
      frequencyTrend: ['stable'],
      periodicity: ['regular', 'semiRegular'],
      attackPattern: ['sustained'],
      decayPattern: ['sustained'],
      longTermStability: ['veryHigh', 'high'],
    },
    thresholds: {
      centroid: { min: 150, max: 900 },
      flux: { min: 0.15, max: 1.2 },
      rms: { min: 0.08, max: 0.45 },
    },
  },
  // EXPLOSION: {
  //   key: 'EXPLOSION',
  //   name: 'Взрыв',
  //   icon: '💥',
  //   color: '#ff0000',
  //   description: 'Резкий импульсный звук',
  //   temporalPatterns: {
  //     centroidStd: { min: 200, max: 1000 },
  //     fluxStd: { min: 1.0, max: 3.0 },
  //     rmsStd: { min: 0.1, max: 0.4 },
  //     activityRatio: { min: 0.05, max: 0.3 },
  //     volumeTrend: ['peak', 'decreasing'],
  //     frequencyTrend: ['downwardSweep', 'decreasing'],
  //     periodicity: ['none', 'irregular'],
  //     attackPattern: ['impulsive', 'rapid'],
  //     decayPattern: ['exponential', 'rapid'],
  //     longTermStability: ['veryLow', 'low'],
  //   },
  //   thresholds: {
  //     centroid: { min: 500, max: 3000 },
  //     flux: { min: 2.0, max: 5.0 },
  //     rms: { min: 0.35, max: 1.2 },
  //   },
  // },
  QUIET: {
    key: 'QUIET',
    name: 'Тишина',
    icon: '😴',
    color: '#6c5ce7',
    description: 'Минимальный фоновый шум',
    temporalPatterns: {
      centroidStd: { min: 0, max: 300 },
      fluxStd: { min: 0, max: 0.5 },
      rmsStd: { min: 0, max: 0.2 },
      activityRatio: { min: 0, max: 0.1 },
      volumeTrend: ['stable', 'decreasing'],
      frequencyTrend: ['stable'],
      periodicity: ['none'],
      attackPattern: ['none'],
      decayPattern: ['none'],
      longTermStability: ['veryHigh', 'high'],
    },
    thresholds: {
      centroid: { min: 0, max: 150 },
      flux: { min: 0, max: 0.08 },
      rms: { min: 0, max: 0.015 },
    },
  },
};

export type SoundStateKey = keyof typeof SOUND_STATES;

// Добавляем интерфейс для ScoreItem
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

// Добавляем интерфейс для трендов
export interface TrendsData {
  statistics: {
    centroidStd: number;
    fluxStd: number;
    rmsStd: number;
  };
  activity: {
    activityRatio: number;
    avgSilenceDuration: number;
    avgBurstDuration: number;
  };
  frequencyJumps: {
    enabled: boolean;
    actualJumps: number;
    densityPerSecond: number;
    avgMagnitude: number;
    minMagnitude: number;
    maxMagnitude: number;
  };
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
  }>; // Упрощено - только нужные поля
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
    // Центр масс
    centroidMin: number;
    centroidMax: number;
    centroidStd: number;
    // Спектральный поток
    fluxMin: number;
    fluxMax: number;
    fluxStd: number;
    // Громкость
    rmsMin: number;
    rmsMax: number;
    rmsStd: number;
  };
  trends: TrendsData;
  tags: string[];
}