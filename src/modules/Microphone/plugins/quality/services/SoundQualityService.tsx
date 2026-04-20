import { 
    QualityMetrics, 
    QualityConfig, 
    QualityAnalysisResult, 
    QualityThresholds,
    SoundQualityStatus
} from '../types';

const DEFAULT_CONFIG: QualityConfig = {
  maxRms: 0.02,
  historySize: 100,
  snrMaxValue: 40,
  dynamicRangeMax: 40,
  updateIntervalMs: 100
};

const DEFAULT_THRESHOLDS: QualityThresholds = {
  excellent: 80,
  good: 60,
  fair: 40,
  poor: 20
};

export class SoundQualityService {

    private rmsHistory: number[] = [];
    private config: QualityConfig;
    private thresholds: QualityThresholds;
    private lastResult: QualityAnalysisResult | null = null;
    private listeners: Map<string, Set<Function>> = new Map();
  
    constructor(config?: Partial<QualityConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.thresholds = DEFAULT_THRESHOLDS;
    }

    /**
   * Обновление метрик качества на основе текущего RMS
   */
    updateMetrics(currentRms: number): QualityMetrics {
        // Добавляем в историю
        this.rmsHistory.push(currentRms);
    
        // Ограничиваем историю
        while (this.rmsHistory.length > this.config.historySize) {
            this.rmsHistory.shift();
        }
    
        // Расчет всех метрик
        const snr = this.calculateSNR(currentRms);
        const clarity = this.calculateClarity(currentRms);
        const dynamics = this.calculateDynamics();
        const peakLevel = this.calculatePeakLevel();
        const overall = this.calculateOverallQuality(currentRms, snr, clarity, dynamics);
    
        const metrics: QualityMetrics = {
            snr,
            clarity,
            dynamics,
            peakLevel,
            overall
        };
    
        // Сохраняем результат
        this.lastResult = {
            metrics,
            rating: this.getRating(overall),
            recommendation: this.getRecommendation(currentRms, metrics),
            timestamp: Date.now()
        };
    
        // Уведомляем слушателей
        this.emit('onMetricsUpdate', metrics);
        this.emit('onResultUpdate', this.lastResult);
    
        return metrics;
    }

    /**
    * Расчет SNR (Signal-to-Noise Ratio)
    */
    private calculateSNR(currentRms: number): number {
        const noiseFloor = this.estimateNoiseFloor();
        const snr = currentRms > 0 ? 20 * Math.log10(currentRms / noiseFloor) : 0;
        return Math.min(this.config.snrMaxValue, Math.max(0, snr));
    }

    /**
    * Оценка уровня шума (noise floor)
    */
    private estimateNoiseFloor(): number {
        if (this.rmsHistory.length < 20) {
            return 0.01;
        }
    
        const sorted = [...this.rmsHistory].sort((a, b) => a - b);
        const bottomCount = Math.floor(sorted.length * 0.1);
        const bottom10 = sorted.slice(0, bottomCount);
        const noiseFloor = bottom10.reduce((a, b) => a + b, 0) / bottom10.length;
    
        return Math.max(0.005, noiseFloor);
    }

    /**
    * Расчет четкости звука
    */
    private calculateClarity(currentRms: number): number {
        let score = 0;
        
        // Оценка уровня громкости
        if (currentRms > 0.01 && currentRms < 0.15) {
        score += 0.6;
        } else if (currentRms >= 0.15) {
        score += 0.3;
        } else {
        score += 0.2;
        }
        
        // Оценка стабильности сигнала
        if (this.rmsHistory.length >= 10) {
        const recent = this.rmsHistory.slice(-10);
        const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const variance = recent.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recent.length;
        const stability = Math.max(0, 1 - Math.sqrt(variance) / (mean || 1));
        score += stability * 0.4;
        } else {
        score += 0.2;
        }
        
        return Math.min(100, score * 100);
    }

    /**
    * Расчет динамического диапазона
    */
    private calculateDynamics(): number {
        if (this.rmsHistory.length < 20) {
            return 50;
        }
    
        const maxRMS = Math.max(...this.rmsHistory);
        const minRMS = Math.min(...this.rmsHistory);
    
        if (maxRMS === 0) return 0;
    
        const dynamicRange = 20 * Math.log10(maxRMS / minRMS);
        return Math.min(100, Math.max(0, (dynamicRange / this.config.dynamicRangeMax) * 100));
    }

    /**
    * Расчет пикового уровня
    */
    private calculatePeakLevel(): number {
        const recentPeak = Math.max(...this.rmsHistory.slice(-50));
    
        if (recentPeak === 0) return -60;
    
        const peakDB = 20 * Math.log10(recentPeak / this.config.maxRms);
        return Math.max(-60, Math.min(0, peakDB));
    }

    /**
   * Расчет общего качества
   */
    private calculateOverallQuality(
        currentRms: number, 
        snr: number, 
        clarity: number, 
        dynamics: number
    ): number {
        const snrScore = Math.min(100, (snr / this.config.snrMaxValue) * 100);
        const overloadScore = currentRms > this.config.maxRms ? 0 : 100;
    
        const overall = 
            snrScore * 0.3 +
            clarity * 0.3 +
            dynamics * 0.2 +
            overloadScore * 0.2;
    
        return Math.min(100, Math.max(0, overall));
    }

    /**
        * Получение текстовой оценки качества
    */
    getRating(quality: number): { text: string; class: string; color: string } {
        if (quality >= this.thresholds.excellent) {
            return { text: '🌟 Отличное', class: 'excellent', color: '#00ff00' };
        }
        if (quality >= this.thresholds.good) {
            return { text: '👍 Хорошее', class: 'good', color: '#88ff00' };
        }
        if (quality >= this.thresholds.fair) {
            return { text: '⚠️ Удовлетворительное', class: 'fair', color: '#ffcc00' };
        }
        if (quality >= this.thresholds.poor) {
            return { text: '🔴 Плохое', class: 'poor', color: '#ff6600' };
        }
        return { text: '💀 Очень плохое', class: 'bad', color: '#ff0000' };
    }

    /**
        * Получение рекомендации
    */
    getRecommendation(currentRms: number, metrics: QualityMetrics): string {
        if (currentRms > this.config.maxRms) {
            return '⚠️ ВНИМАНИЕ: Уровень сигнала слишком высокий! Уменьшите громкость.';
        }
        if (metrics.snr < 15) {
            return '⚠️ Низкое отношение сигнал/шум. Возможны помехи.';
        }
        if (metrics.clarity < 40) {
            return 'ℹ️ Низкая чёткость звука. Проверьте положение микрофона.';
        }
        if (metrics.overall >= 80) {
            return '✅ Отличное качество звука!';
        }
        if (metrics.overall >= 60) {
            return '👍 Хорошее качество звука для анализа.';
        }
        if (metrics.overall >= 40) {
            return '⚡ Удовлетворительное качество. Возможны погрешности.';
        }
        return '🔴 Плохое качество звука. Проверьте микрофон и обстановку.';
    }

    /**
    * Получение текущих метрик
    */
    getMetrics(): QualityMetrics | null {
        return this.lastResult?.metrics || null;
    }
  
    /**
    * Получение последнего результата
    */
    getLastResult(): QualityAnalysisResult | null {
        return this.lastResult;
    }

    /**
    * Получение текущего статуса
    */
    getStatus(currentRms: number = 0): SoundQualityStatus {
        return {
            isAnalyzing: true,
            currentRms,
            historyLength: this.rmsHistory.length,
            lastResult: this.lastResult
        };
    }

    /**
        * Обновление конфигурации
    */
    setConfig(config: Partial<QualityConfig>): void {
        this.config = { ...this.config, ...config };
        this.emit('onConfigChanged', this.config);
    }
  
    /**
    * Получение конфигурации
    */
    getConfig(): QualityConfig {
        return { ...this.config };
    }

    /**
    * Обновление порогов качества
    */
    setThresholds(thresholds: Partial<QualityThresholds>): void {
        this.thresholds = { ...this.thresholds, ...thresholds };
    }
  
    /**
        * Сброс истории
    */
    reset(): void {
        this.rmsHistory = [];
        this.lastResult = null;
        this.emit('onReset');
    }
  
    /**
    * Экспорт данных
    */
    exportData(format: 'json' | 'csv' = 'json'): string {
        const data = {
            config: this.config,
            history: this.rmsHistory,
            lastResult: this.lastResult,
            exportedAt: Date.now()
        };
    
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        }
    
        // CSV format
        const headers = ['timestamp', 'rms', 'snr', 'clarity', 'dynamics', 'peakLevel', 'overall'];
        const rows = [headers];
    
        if (this.lastResult) {
        rows.push([
            new Date(this.lastResult.timestamp).toISOString(),
            this.rmsHistory[this.rmsHistory.length - 1]?.toString() || '0',
            this.lastResult.metrics.snr.toString(),
            this.lastResult.metrics.clarity.toString(),
            this.lastResult.metrics.dynamics.toString(),
            this.lastResult.metrics.peakLevel.toString(),
            this.lastResult.metrics.overall.toString()
        ]);
        }
    
        return rows.map(row => row.join(',')).join('\n');
    }

    /**
    * Система событий
    */
    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: Function): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, ...args: any[]): void {
        this.listeners.get(event)?.forEach(callback => {
        try {
            callback(...args);
        } catch (error) {
            console.error(`[SoundQualityService] Error in ${event} handler:`, error);
        }
    });
    }
    
}

// Синглтон для использования во всем приложении
export const soundQualityService = new SoundQualityService();