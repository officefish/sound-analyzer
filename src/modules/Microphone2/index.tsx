import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useModulePlugins } from '../../hooks/useModulePlugins';
import { MicrophoneService } from '../Microphone/microphone.service';
import DeviceSelector from './components/DeviceSelector';
import VolumeWidget from './components/VolumeWidget';
import QualityWidget from './components/QualityWidget';
import WaveformWidget from './components/WaveformWidget';
import SpectrumWidget from './components/SpectrumWidget';
import { MicrophoneState } from './types';

const INITIAL_STATE: MicrophoneState = {
  isRecording: false,
  volume: 0,
  rawVolume: 0,
  processedVolume: 0,
  error: null,
  audioDevices: [],
  selectedDeviceId: '',
  recordingDuration: 0,
  qualityScore: 0,
  snr: 0,
  noise: 0,
};

const Microphone2: React.FC = () => {
  const [state, setState] = useState<MicrophoneState>(INITIAL_STATE);
  const [waveformData, setWaveformData] = useState<number[]>(Array(200).fill(0));
  const [spectrumData, setSpectrumData] = useState<number[]>(Array(32).fill(0));
  
  const serviceRef = useRef<MicrophoneService | null>(null);
  const isInitializedRef = useRef(false);
  
  const {
    activePlugins,
    widgets,
    emitEvent,
    executeOnPlugins,
  } = useModulePlugins<MicrophoneState>({
    moduleId: 'microphone2',
    getInitialState: () => INITIAL_STATE,
  });
useEffect(() => {
  console.log('🔌 Microphone2: activePlugins changed, count:', activePlugins.length);
  console.log('🔌 Microphone2: widgets changed, count:', widgets.length);
}, [activePlugins, widgets]);

  // ✅ Стабильная функция для обработки звука
  const audioProcessor = useCallback((volume: number) => {
    const results = executeOnPlugins('processAudioFrame', { volume });
    if (results.length > 0 && results[0] !== null && typeof results[0] === 'number') {
      return results[0];
    }
    return volume;
  }, [executeOnPlugins]);
  
  // ✅ Создание сервиса (только один раз)
  const initService = useCallback(() => {
    if (serviceRef.current) return serviceRef.current;
    
    console.log('🔧 Creating MicrophoneService for Microphone2...');
    const service = new MicrophoneService(audioProcessor);
    
    // Подписываемся на события
    service.on('onVolumeUpdate', (rawVolume, processedVolume) => {
      setState(prev => ({ ...prev, rawVolume, processedVolume, volume: processedVolume }));
      emitEvent('volumeUpdate', { rawVolume, processedVolume });
      
      // Генерация waveform
      const newWaveform = Array.from({ length: 200 }, (_, i) => {
        const t = Date.now() / 1000;
        return Math.sin(t * 10 + i * 0.1) * processedVolume;
      });
      setWaveformData(newWaveform);
      
      //Генерация spectrum
      const newSpectrum = Array.from({ length: 32 }, (_, i) => {
        return Math.min(1, Math.max(0, processedVolume * (1 - i / 64) + Math.random() * 0.1));
      });
      setSpectrumData(newSpectrum);
      
      // Расчет качества
      const quality = Math.min(100, Math.max(0, Math.round(processedVolume * 100 + 20)));
      const snr = Math.min(60, Math.max(0, Math.round(processedVolume * 50 + 10)));
      const noise = Math.min(40, Math.max(0, Math.round((1 - processedVolume) * 40)));
      setState(prev => ({ ...prev, qualityScore: quality, snr, noise }));
    });
    
    service.on('onRecordingStart', () => {
      console.log('🎤 Recording started in Microphone2');
      setState(prev => ({ ...prev, isRecording: true, error: null }));
      emitEvent('recordingStarted');
    });
    
    service.on('onRecordingStop', (duration) => {
      console.log('⏹️ Recording stopped in Microphone2, duration:', duration);
      setState(prev => ({ ...prev, isRecording: false, recordingDuration: duration, volume: 0 }));
      emitEvent('recordingStopped', { duration });
      setWaveformData(Array(200).fill(0));
      setSpectrumData(Array(32).fill(0));
    });
    
    service.on('onError', (error) => {
      setState(prev => ({ ...prev, error }));
    });
    
    service.on('onDevicesUpdate', (devices) => {
      console.log('🎛️ Devices updated:', devices.length);
      setState(prev => ({ ...prev, audioDevices: devices }));
    });
    
    service.on('onDeviceChange', (deviceId) => {
      console.log('🎛️ Device changed to:', deviceId);
      setState(prev => ({ ...prev, selectedDeviceId: deviceId }));
    });
    
    serviceRef.current = service;
    return service;
  }, [audioProcessor, emitEvent]);
  
  // Инициализация
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    const service = initService();
    console.log('🎤 Initializing Microphone2, loading devices...');
    
    service.getAudioDevices().then(devices => {
      console.log('📋 Devices loaded:', devices.length);
      if (devices.length > 0) {
        setState(prev => ({
          ...prev,
          audioDevices: devices,
          selectedDeviceId: devices[0].deviceId
        }));
      }
    });
    
    return () => {
      console.log('🧹 Cleaning up Microphone2 service');
      if (serviceRef.current) {
        serviceRef.current.dispose();
        serviceRef.current = null;
      }
    };
  }, [initService]);
  
  // ✅ Обработчик старта записи
  const handleStartMonitoring = useCallback(async () => {
    console.log('🎤 handleStartMonitoring called, selectedDeviceId:', state.selectedDeviceId);
    
    const service = initService();
    if (!service) {
      console.error('❌ Service not available');
      return;
    }
    
    const success = await service.startRecording(state.selectedDeviceId || undefined);
    console.log('Start recording result:', success);
    
    if (!success) {
      setState(prev => ({ ...prev, error: 'Не удалось запустить микрофон' }));
    }
  }, [state.selectedDeviceId, initService]);
  
  // ✅ Обработчик остановки записи
  const handleStopMonitoring = useCallback(() => {
    console.log('⏹️ handleStopMonitoring called');
    const service = initService();
    if (!service) return;
    service.stopRecording();
  }, [initService]);
  
  // ✅ Обработчик смены устройства
  const handleDeviceChange = useCallback(async (deviceId: string) => {
    console.log('🎛️ handleDeviceChange called:', deviceId);
    setState(prev => ({ ...prev, selectedDeviceId: deviceId }));
    
    const service = initService();
    if (!service) return;
    
    await service.changeDevice(deviceId);
  }, [initService]);
  
  const { isRecording, volume, audioDevices, selectedDeviceId, 
    qualityScore, snr, noise, 
    error } = state;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(220,20%,8%)] to-[hsl(220,20%,10%)] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="relative p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-cyan-400">
                <path d="M16.247 7.761a6 6 0 0 1 0 8.478" />
                <path d="M19.075 4.933a10 10 0 0 1 0 14.134" />
                <path d="M4.925 19.067a10 10 0 0 1 0-14.134" />
                <path d="M7.753 16.239a6 6 0 0 1 0-8.478" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              MicMonitor
            </h1>
          </div>
          <p className="text-sm text-[hsl(210,15%,50%)]">
            Real-time microphone switching &amp; audio quality analysis
          </p>
        </div>
        
        {/* Ошибка */}
        {error && (
          <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-3 text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        
        {/* Device Selector */}
        <DeviceSelector
          devices={audioDevices}
          selectedDeviceId={selectedDeviceId}
          onDeviceChange={handleDeviceChange}
          onStartMonitoring={handleStartMonitoring}
          onStopMonitoring={handleStopMonitoring}
          isRecording={isRecording}
        />
        
        {/* Виджеты */}
        
          <>
            <div className="grid grid-cols-2 gap-4">
              <VolumeWidget volume={volume} />
              <QualityWidget qualityScore={qualityScore} snr={snr} noise={noise} />
            </div>
            
            <WaveformWidget waveformData={waveformData} />
            <SpectrumWidget spectrumData={spectrumData} />
          </>
        
        
        {/* Плагины */}
        {widgets.length > 0 
        //&& isRecording 
        
        && (
          <div className="space-y-3">
            <div className="divider text-xs text-base-content/50">🔌 Плагины</div>
            {widgets.map((widget) => {
              const plugin = activePlugins.find(p => p.id === widget.pluginId);
              if (!plugin) return null;
              return (
                <div key={widget.id} className="rounded-2xl bg-base-200 border border-base-300 overflow-hidden">
                  {widget.title && (
                    <div className="px-3 py-2 bg-base-300/50 border-b border-base-300 flex items-center gap-2">
                      {widget.icon && <span className="text-sm">{widget.icon}</span>}
                      <span className="text-white text-xs font-medium">{widget.title}</span>
                    </div>
                  )}
                  <div className="p-3">
                    <widget.component
                      plugin={plugin}
                      context={{ volume, isRecording }}
                      onAction={(action, data) => plugin.execute?.(action, data)}
                      isActive={plugin.enabled}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

         {activePlugins.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center pt-3 border-t border-white/10">
          {activePlugins.map(plugin => (
            <span key={plugin.id} className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              {plugin.icon} {plugin.name}
            </span>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default Microphone2;
