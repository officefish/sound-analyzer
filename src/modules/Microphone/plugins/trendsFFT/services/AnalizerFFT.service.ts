// src/services/AudioFileAnalyzerService.ts

import { AudioAnalysisResult, unifiedAnalyzer } from "../../../../../services/fft/UnifiedAnalyzerFFT.service";
import { AudioAnalysisReport, AudioAnalysisReportGenerator } from '../reports/AnalyzerFFTReport';
import type { UserPatternTemplate } from '../types';

export interface AudioFileAnalysisConfig {
  intervalMs: number;
  fftSize: number;
  smoothingTimeConstant: number;
}

// Интерфейс для рекомендаций (частичный UserPatternTemplate без id и временных меток)
export interface PatternRecommendations {
  thresholds: {
    centroid: { min: number; max: number };
    flux: { min: number; max: number };
    rms: { min: number; max: number };
  };
  temporalPatterns: {
    centroidStd: { min: number; max: number };
    fluxStd: { min: number; max: number };
    rmsStd: { min: number; max: number };
    activityRatio: { min: number; max: number };
    avgSilenceDuration: { min: number; max: number };
    avgBurstDuration: { min: number; max: number };
    frequencyJumps: {
      enabled: boolean;
      minJumpsRequired: number;
      densityPerSecond: { max: number };
    };
    volumeTrend: string[];
    frequencyTrend: string[];
    longTermStability: string[];
    periodicity: string[];
    envelopeShape: string[];
    peakToAverageRatio: { min: number; max: number };
  };
}

export class AudioFileAnalyzerService {

    private lastReport: AudioAnalysisReport | null = null;

    async analyzeAudioFileWithReport(
        file: File,
        config: AudioFileAnalysisConfig,
        onProgress?: (progress: number, status: string) => void
    ): Promise<{ result: AudioAnalysisResult; report: AudioAnalysisReport }> {
    
        onProgress?.(5, 'Загрузка аудиофайла...');
    
        unifiedAnalyzer.updateConfig({
            intervalMs: config.intervalMs,
            fftSize: config.fftSize,
            smoothingTimeConstant: config.smoothingTimeConstant,
            minRMS: 0.02
        });
    
        onProgress?.(10, 'Декодирование аудио...');
        
        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        await audioContext.close();
        
        onProgress?.(15, 'Анализ аудиоданных...');
        
        // Сохраняем сырые фреймы до нормализации
        const rawFrames: any[] = [];
        
        // Получаем результат с возможностью захвата сырых данных
        const result = await unifiedAnalyzer.analyzeBufferWithRaw(
            audioBuffer,
            (_frame, rawFrame) => {
                rawFrames.push(rawFrame);
            },
            (progress, frame, total) => {
                const mappedProgress = 15 + (progress * 0.7);
                onProgress?.(mappedProgress, `Анализ фрейма ${frame + 1}/${total}`);
            }
        );
    
        onProgress?.(90, 'Нормализация результатов...');
        
        const normalizedResult = this.normalizeResult(result);
        const recommendations = this.generatePatternRecommendations(normalizedResult);
        
        // Генерируем отчет с новой сигнатурой (один объект параметров)
        const report = AudioAnalysisReportGenerator.generateReport({
            file,
            analysisConfig: config,
            rawFrames,
            normalizedFrames: normalizedResult.frames,
            statistics: normalizedResult.statistics,
            temporalPatterns: normalizedResult.temporalPatterns,
            recommendations,
            duration: normalizedResult.duration,
            sampleRate: normalizedResult.sampleRate
        });
        
        this.lastReport = report;
        
        onProgress?.(100, 'Готово!');
        
        return { result: normalizedResult, report };
    }
  
    getLastReport(): AudioAnalysisReport | null {
        return this.lastReport;
    }
  
    exportLastReportAsText(): string | null {
        if (!this.lastReport) return null;
        return AudioAnalysisReportGenerator.exportToText(this.lastReport);
    }
  
    exportLastReportAsJson(): string | null {
        if (!this.lastReport) return null;
        return AudioAnalysisReportGenerator.exportToJson(this.lastReport);
    }

    async analyzeAudioFile(
        file: File,
        config: AudioFileAnalysisConfig,
        onProgress?: (progress: number, status: string) => void
    ): Promise<AudioAnalysisResult> {
        
        onProgress?.(5, 'Загрузка аудиофайла...');
        
        unifiedAnalyzer.updateConfig({
            intervalMs: config.intervalMs,
            fftSize: config.fftSize,
            smoothingTimeConstant: config.smoothingTimeConstant,
            minRMS: 0.02
        });
        
        onProgress?.(10, 'Декодирование аудио...');
        
        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        await audioContext.close();
        
        onProgress?.(15, 'Анализ аудиоданных...');
        
        const result = await unifiedAnalyzer.analyzeBuffer(
            audioBuffer,
            (progress, frame, total) => {
                const mappedProgress = 15 + (progress * 0.7);
                onProgress?.(mappedProgress, `Анализ фрейма ${frame + 1}/${total}`);
            }
        );
        
        onProgress?.(90, 'Нормализация результатов...');
        
        const normalizedResult = this.normalizeResult(result);
        
        onProgress?.(100, 'Готово!');
        
        return normalizedResult;
    }
  
    private normalizeResult(result: AudioAnalysisResult): AudioAnalysisResult {
        const centroidRange = { min: 0, max: 5000 };
        const fluxRange = { min: 0, max: 2.0 };
        const rmsRange = { min: 0, max: 0.5 };
        
        const actualCentroidMin = Math.min(...result.frames.map(f => f.centroid));
        const actualCentroidMax = Math.max(...result.frames.map(f => f.centroid));
        const actualFluxMin = Math.min(...result.frames.map(f => f.flux));
        const actualFluxMax = Math.max(...result.frames.map(f => f.flux));
        const actualRmsMin = Math.min(...result.frames.map(f => f.rms));
        const actualRmsMax = Math.max(...result.frames.map(f => f.rms));
        
        console.log('[AudioFileAnalyzer] Raw ranges:', {
            centroid: { min: actualCentroidMin, max: actualCentroidMax },
            flux: { min: actualFluxMin, max: actualFluxMax },
            rms: { min: actualRmsMin, max: actualRmsMax }
        });
        
        const normalizedFrames = result.frames.map(frame => ({
            ...frame,
            centroid: this.normalizeValue(
                frame.centroid, 
                actualCentroidMin, 
                actualCentroidMax, 
                centroidRange.min, 
                centroidRange.max
            ),
            flux: this.normalizeValue(
                frame.flux, 
                actualFluxMin, 
                actualFluxMax, 
                fluxRange.min, 
                fluxRange.max
            ),
            rms: this.normalizeValue(
                frame.rms, 
                actualRmsMin, 
                actualRmsMax, 
                rmsRange.min, 
                rmsRange.max
            ),
            isActive: frame.rms > 0.05
        }));
        
        const normalizedStatistics = this.calculateNormalizedStatistics(normalizedFrames);
        const normalizedTemporalPatterns = this.calculateNormalizedTemporalPatterns(
            normalizedFrames, 
            result.duration
        );
        
        console.log('[AudioFileAnalyzer] Normalized ranges:', {
            centroid: { min: normalizedStatistics.centroid.min, max: normalizedStatistics.centroid.max },
            flux: { min: normalizedStatistics.flux.min, max: normalizedStatistics.flux.max },
            rms: { min: normalizedStatistics.rms.min, max: normalizedStatistics.rms.max }
        });
        
        return {
            ...result,
            frames: normalizedFrames,
            statistics: normalizedStatistics,
            temporalPatterns: normalizedTemporalPatterns
        };
    }
  
    private normalizeValue(
        value: number, 
        fromMin: number, 
        fromMax: number, 
        toMin: number, 
        toMax: number
    ): number {
        if (fromMax === fromMin) {
            return (toMin + toMax) / 2;
        }
        
        const normalized = (value - fromMin) / (fromMax - fromMin);
        let result = toMin + normalized * (toMax - toMin);
        return Math.max(toMin, Math.min(toMax, result));
    }
  
    private calculateNormalizedStatistics(frames: any[]): AudioAnalysisResult['statistics'] {
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
  
    private calculateNormalizedTemporalPatterns(frames: any[], duration: number): any {
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
        
        // Частотные скачки
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
  
    generatePatternRecommendations(analysisResult: AudioAnalysisResult): PatternRecommendations {
        const { temporalPatterns, statistics } = analysisResult;
        
        const margin = 0.2;
        const centroidMargin = (statistics.centroid.max - statistics.centroid.min) * margin;
        const fluxMargin = (statistics.flux.max - statistics.flux.min) * margin;
        const rmsMargin = (statistics.rms.max - statistics.rms.min) * margin;
        
        // Безопасно получаем actualJumps
        const actualJumps = temporalPatterns.frequencyJumps?.actualJumps || 0;
        const densityPerSecond = temporalPatterns.frequencyJumps?.densityPerSecond || 0;
        
        return {
            thresholds: {
                centroid: {
                    min: Math.max(0, Math.min(5000, (statistics.centroid.min - centroidMargin))),
                    max: Math.min(5000, Math.max(100, (statistics.centroid.max + centroidMargin)))
                },
                flux: {
                    min: Math.max(0, (statistics.flux.min - fluxMargin)),
                    max: Math.min(2.0, (statistics.flux.max + fluxMargin))
                },
                rms: {
                    min: Math.max(0, (statistics.rms.min - rmsMargin)),
                    max: Math.min(0.5, (statistics.rms.max + rmsMargin))
                }
            },
            temporalPatterns: {
                centroidStd: {
                    min: Math.max(0, temporalPatterns.centroidStd * 0.5),
                    max: Math.min(1000, temporalPatterns.centroidStd * 1.5)
                },
                fluxStd: {
                    min: Math.max(0, temporalPatterns.fluxStd * 0.5),
                    max: Math.min(1.0, temporalPatterns.fluxStd * 1.5)
                },
                rmsStd: {
                    min: Math.max(0, temporalPatterns.rmsStd * 0.5),
                    max: Math.min(0.3, temporalPatterns.rmsStd * 1.5)
                },
                activityRatio: {
                    min: Math.max(0, temporalPatterns.activityRatio - 0.2),
                    max: Math.min(1, temporalPatterns.activityRatio + 0.2)
                },
                avgSilenceDuration: {
                    min: 0,
                    max: temporalPatterns.avgSilenceDuration * 2
                },
                avgBurstDuration: {
                    min: 0,
                    max: temporalPatterns.avgBurstDuration * 2
                },
                frequencyJumps: {
                    enabled: actualJumps > 3,
                    minJumpsRequired: Math.max(3, Math.floor(actualJumps * 0.3)),
                    densityPerSecond: {
                        max: Math.min(20, densityPerSecond * 1.5)
                    }
                },
                volumeTrend: [temporalPatterns.volumeTrend],
                frequencyTrend: [temporalPatterns.frequencyTrend],
                longTermStability: [temporalPatterns.longTermStability],
                periodicity: [temporalPatterns.periodicity],
                envelopeShape: [temporalPatterns.envelopeShape],
                peakToAverageRatio: {
                    min: Math.max(1, temporalPatterns.peakToAverageRatio * 0.7),
                    max: temporalPatterns.peakToAverageRatio * 1.3
                }
            }
        };
    }
  
    // Статистические методы
    private calculateMean(values: number[]): number {
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
  
    private calculateStdDev(values: number[]): number {
        const mean = this.calculateMean(values);
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(this.calculateMean(squaredDiffs));
    }
  
    private calculateVariance(values: number[]): number {
        const mean = this.calculateMean(values);
        return this.calculateMean(values.map(v => Math.pow(v - mean, 2)));
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
  
    private calculateStability(frames: any[]): string {
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
        return peak / average;
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
}

export const audioFileAnalyzer = new AudioFileAnalyzerService();