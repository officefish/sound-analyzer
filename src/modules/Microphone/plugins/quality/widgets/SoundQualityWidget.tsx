// src/plugins/microphone/SoundQualityAnalyzer/widgets/SoundQualityWidget.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IPlugin } from '../../../../../types/plugins';
import { soundQualityService } from '../services/SoundQualityService';


// ========== КОМПОНЕНТ ВИДЖЕТА ==========

interface SoundQualityWidgetProps {
  plugin: IPlugin;
  context?: any;
  onAction: (action: string, data?: any) => void;
  isActive: boolean;
}

const SoundQualityWidget: React.FC<SoundQualityWidgetProps> = ({ 
  plugin, 
  context, 
  onAction, 
  isActive 
}) => {
  const [quality, setQuality] = useState<number>(0);
  const [rating, setRating] = useState<{ text: string; class: string; color: string } | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const animationRef = useRef<number | null>(null);
  
  const updateFromContext = useCallback(() => {
    // Получаем RMS из контекста (как в TuneMonitor)
    const rms = context?.rms ?? context?.volume ?? context?.processedVolume ?? 0;
    const isRecording = context?.isRecording ?? false;
    
    if (isRecording && rms > 0) {
      // Обновляем метрики через сервис
      const qualityMetrics = soundQualityService.updateMetrics(rms);
      const lastResult = soundQualityService.getLastResult();
      
      setQuality(qualityMetrics.overall);
      setRating(lastResult?.rating || null);
      setRecommendation(lastResult?.recommendation || '');
      
      // Получаем все метрики для отображения
      const allMetrics = plugin.execute('getMetrics');
      setMetrics(allMetrics);
      setIsAnalyzing(true);
    } else {
      setIsAnalyzing(false);
    }
  }, [context?.rms, context?.volume, context?.processedVolume, context?.isRecording]);
  
  useEffect(() => {
    if (!isActive) return;
    
    const animate = () => {
      updateFromContext();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, updateFromContext]);
  
  if (!isActive) return null;
  
  return (
    <div className="card bg-base-100 shadow-xl border border-base-200">
      <div className="card-body p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-base-200">
          <h2 className="card-title text-lg font-bold">
            <span className="text-2xl">🎵</span>
            Общее качество звука
          </h2>
          <div className={`badge ${rating?.class === 'excellent' ? 'badge-success' : rating?.class === 'good' ? 'badge-warning' : 'badge-ghost'} badge-lg gap-2`}>
            {rating?.text || '—'}
          </div>
        </div>
        
        {/* Quality Meter */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-base-content/70">Качество сигнала</span>
            <span className="text-sm font-bold text-base-content">{quality.toFixed(1)}%</span>
          </div>
          <progress 
            className={`progress ${quality >= 80 ? 'progress-success' : quality >= 60 ? 'progress-warning' : quality >= 40 ? 'progress-info' : 'progress-error'} w-full h-4`} 
            value={quality} 
            max="100"
          />
        </div>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stats bg-base-200 shadow-sm">
            <div className="stat p-3">
              <div className="stat-figure text-primary">📊</div>
              <div className="stat-title text-xs">SNR</div>
              <div className="stat-value text-lg">{metrics?.currentSnr?.toFixed(1) || '—'}</div>
              <div className="stat-desc text-xs">dB</div>
            </div>
          </div>
          
          <div className="stats bg-base-200 shadow-sm">
            <div className="stat p-3">
              <div className="stat-figure text-secondary">🎯</div>
              <div className="stat-title text-xs">Clarity</div>
              <div className="stat-value text-lg">{metrics?.currentClarity?.toFixed(1) || '—'}</div>
              <div className="stat-desc text-xs">%</div>
            </div>
          </div>
          
          <div className="stats bg-base-200 shadow-sm">
            <div className="stat p-3">
              <div className="stat-figure text-accent">⚡</div>
              <div className="stat-title text-xs">Dynamics</div>
              <div className="stat-value text-lg">{metrics?.currentDynamics?.toFixed(1) || '—'}</div>
              <div className="stat-desc text-xs">%</div>
            </div>
          </div>
          
          <div className="stats bg-base-200 shadow-sm">
            <div className="stat p-3">
              <div className="stat-figure text-info">🔊</div>
              <div className="stat-title text-xs">Peak</div>
              <div className="stat-value text-lg">{metrics?.currentPeakLevel?.toFixed(1) || '—'}</div>
              <div className="stat-desc text-xs">dB</div>
            </div>
          </div>
        </div>
        
        {/* Recommendation Alert */}
        {recommendation && (
          <div className={`alert mb-6 ${
            recommendation.includes('⚠️') ? 'alert-warning' :
            recommendation.includes('✅') ? 'alert-success' :
            recommendation.includes('ℹ️') ? 'alert-info' :
            'alert-error'
          }`}>
            <div className="flex-1">
              <span>{recommendation}</span>
            </div>
          </div>
        )}
        
        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 pt-3 border-t border-base-200">
          <div className={`badge ${isAnalyzing ? 'badge-success' : 'badge-ghost'} gap-2`}>
            <span className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-success animate-pulse' : 'bg-base-400'}`}></span>
            {isAnalyzing ? 'Анализ активен' : 'Ожидание сигнала'}
          </div>
          {isAnalyzing && (
            <div className="badge badge-ghost gap-2">
              <span className="loading loading-spinner loading-xs"></span>
              Анализ в реальном времени
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SoundQualityWidget);