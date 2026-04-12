// src/plugins/microphone2/TuneMonitorPlugin.tsx

import { IPlugin, IPluginWidget } from '../../../types/plugins';
import PluginCard from '../../../components/ui/PluginCard';
import VolumeWidget from '../components/VolumeWidget';
import QualityWidget from '../components/QualityWidget';
import WaveformWidget from '../components/WaveformWidget';
import SpectrumWidget from '../components/SpectrumWidget';
import { useState, useEffect, useRef, useCallback } from 'react';

interface TuneMonitorState {
  rawVolume: number;
  processedVolume: number;
  volume: number;
  qualityScore: number;
  snr: number;
  noise: number;
  waveformData: number[];
  spectrumData: number[];
  isRecording: boolean;
}

const INITIAL_STATE: TuneMonitorState = {
  rawVolume: 0,
  processedVolume: 0,
  volume: 0,
  qualityScore: 0,
  snr: 0,
  noise: 0,
  waveformData: Array(200).fill(0),
  spectrumData: Array(32).fill(0),
  isRecording: false,
};

// ========== УТИЛИТЫ ДЛЯ РАСЧЁТОВ ==========

const calculateQuality = (volume: number): { qualityScore: number; snr: number; noise: number } => {
  const qualityScore = Math.min(100, Math.max(0, Math.round(volume * 100 + 20)));
  const snr = Math.min(60, Math.max(0, Math.round(volume * 50 + 10)));
  const noise = Math.min(40, Math.max(0, Math.round((1 - volume) * 40)));
  return { qualityScore, snr, noise };
};

const generateWaveform = (volume: number, length: number = 200): number[] => {
  const t = Date.now() / 1000;
  return Array.from({ length }, (_, i) => {
    return Math.sin(t * 10 + i * 0.1) * volume;
  });
};

const generateSpectrum = (volume: number, length: number = 32): number[] => {
  return Array.from({ length }, (_, i) => {
    return Math.min(1, Math.max(0, volume * (1 - i / 64) + Math.random() * 0.1));
  });
};

const smoothTransition = (current: number, target: number, factor: number = 0.3): number => {
  return current + (target - current) * factor;
};

// ========== КОМПОНЕНТ ВИДЖЕТА ==========

const TuneMonitorWidget: React.FC<{
  plugin: IPlugin;
  context?: any;
  onAction: (action: string, data?: any) => void;
  isActive: boolean;
}> = ({ plugin, context, isActive }) => {
  const [state, setState] = useState<TuneMonitorState>(INITIAL_STATE);
  const animationRef = useRef<number | null>(null);
  const lastVolumeRef = useRef<number>(0);
  
  const updateFromContext = useCallback(() => {
    const rawVolume = context?.rawVolume ?? 0;
    const processedVolume = context?.processedVolume ?? 0;
    const isRecording = context?.isRecording ?? false;
    
    const smoothedVolume = smoothTransition(lastVolumeRef.current, processedVolume, 0.3);
    lastVolumeRef.current = smoothedVolume;
    
    const { qualityScore, snr, noise } = calculateQuality(smoothedVolume);
    const waveformData = generateWaveform(smoothedVolume);
    const spectrumData = generateSpectrum(smoothedVolume);
    
    setState({
      rawVolume,
      processedVolume,
      volume: smoothedVolume,
      qualityScore,
      snr,
      noise,
      waveformData,
      spectrumData,
      isRecording,
    });
  }, [context?.rawVolume, context?.processedVolume, context?.isRecording]);
  
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
  
  const { 
    volume, 
    qualityScore, 
    snr, 
    noise, 
    waveformData, 
    spectrumData, 
    isRecording: isRec 
  } = state;
  
  const showVolume = (plugin as any).settings?.showVolume ?? true;
  const showQuality = (plugin as any).settings?.showQuality ?? true;
  const showWaveform = (plugin as any).settings?.showWaveform ?? true;
  const showSpectrum = (plugin as any).settings?.showSpectrum ?? true;
  
  return (
    <PluginCard plugin={plugin} isActive={isActive}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {showVolume && <VolumeWidget volume={volume} />}
          {showQuality && <QualityWidget qualityScore={qualityScore} snr={snr} noise={noise} />}
        </div>
        
        {showWaveform && <WaveformWidget waveformData={waveformData} />}
        {showSpectrum && <SpectrumWidget spectrumData={spectrumData} />}
        
        {!isRec && (
          <div className="text-center text-xs text-base-content/40 py-2">
            ⚪ Микрофон не активен
          </div>
        )}
      </div>
    </PluginCard>
  );
};

// Виджет
const tuneMonitorWidget: IPluginWidget = {
  id: 'tune-monitor-widget',
  pluginId: 'microphone2-tune-monitor',
  title: 'Tune Monitor',
  icon: '🎵',
  position: 'bottom',
  order: 1,
  width: 'full',
  component: TuneMonitorWidget,
};

// ========== КЛАСС ПЛАГИНА ==========

class TuneMonitorPluginClass implements IPlugin {
  id = 'microphone2-tune-monitor';
  name = 'Tune Monitor';
  version = '1.0.0';
  description = 'Визуализация звука: громкость, качество, волна и спектр';
  icon = '🎵';
  moduleId = 'microphone2' as const;
  enabled = false;
  
  availableActions = ['setWidgetState', 'getWidgetState', 'resetWidgets'];
  
  settings = {
    showVolume: true,
    showQuality: true,
    showWaveform: true,
    showSpectrum: true,
  };
  
  widget = tuneMonitorWidget;
  
  onActivate(): void {
    console.log('🎵 Tune Monitor Plugin activated');
  }
  
  onDeactivate(): void {
    console.log('🎵 Tune Monitor Plugin deactivated');
  }
  
  onModuleEvent(event: string, data: any): void {
    console.log(`🎵 Tune Monitor event: ${event}`, data);
  }
  
  execute(action: string, data?: any): any {
    console.log(`🎵 TuneMonitor execute: ${action}`, data);
    
    switch (action) {
      case 'setWidgetState':
        if (data) {
          Object.assign(this.settings, data);
        }
        return true;
        
      case 'getWidgetState':
        return { ...this.settings };
        
      case 'resetWidgets':
        this.settings = {
          showVolume: true,
          showQuality: true,
          showWaveform: true,
          showSpectrum: true,
        };
        return true;
      
      case 'processAudioFrame':
        if (data?.volume !== undefined) {
          const { qualityScore, snr, noise } = calculateQuality(data.volume);
          const waveformData = generateWaveform(data.volume);
          const spectrumData = generateSpectrum(data.volume);
          return {
            volume: data.volume,
            qualityScore,
            snr,
            noise,
            waveformData,
            spectrumData,
          };
        }
        return null;
        
      default:
        return null;
    }
  }
}

export const TuneMonitorPlugin = new TuneMonitorPluginClass();