// export interface UserPattern {
//   id: string;
//   name: string;
//   icon: string;
//   color: string;
//   description: string;
//   createdAt: number;
//   updatedAt: number;
//   isCustom: boolean;
//   source: 'manual' | 'audio_file'; // откуда создан
//   audioFile?: {
//     name: string;
//     duration: number;
//     sampleRate: number;
//   };
//   thresholds: {
//     centroid: { min: number; max: number };
//     flux: { min: number; max: number };
//     rms: { min: number; max: number };
//   };
//   temporalPatterns: {
//     centroidStd: { min: number; max: number };
//     fluxStd: { min: number; max: number };
//     rmsStd: { min: number; max: number };
    
//     activityRatio: { min: number; max: number };
//     avgSilenceDuration: { min: number; max: number };
//     avgBurstDuration: { min: number; max: number };
    
//     frequencyJumps: { 
//         enabled: boolean; 
//         minJumpsRequired: number; 
//         densityPerSecond: { max: number };
//         //magnitudeRange?: { min?: number; max?: number };
//     };
    
//     volumeTrend: string[];
//     frequencyTrend: string[];
    
//     longTermStability: string[];
//     periodicity: string[];
    
//     envelopeShape: string[];
//     peakToAverageRatio: { min: number; max: number };

//     attackPattern?: string[];
//     decayPattern?: string[];
//   };
// }

// export interface PatternCreationFormData {
//   name: string;
//   icon: string;
//   color: string;
//   description: string;
//   thresholds: {
//     centroid: { min: number; max: number };
//     flux: { min: number; max: number };
//     rms: { min: number; max: number };
//   };
//   temporalPatterns: {
//     volumeTrend: string[];
//     frequencyTrend: string[];
//     longTermStability: string[];
//     periodicity: string[];
//     envelopeShape: string[];
//   };
// }

// export const DEFAULT_PATTERN_FORM: PatternCreationFormData = {
//   name: '',
//   icon: '🎵',
//   color: '#6bcf7f',
//   description: '',
//   thresholds: {
//     centroid: { min: 500, max: 3000 },
//     flux: { min: 0.3, max: 2.0 },
//     rms: { min: 0.05, max: 0.3 },
//   },
//   temporalPatterns: {
//     volumeTrend: ['stable'],
//     frequencyTrend: ['stable'],
//     longTermStability: ['medium'],
//     periodicity: ['irregular'],
//     envelopeShape: ['sustained'],
//   },
// };