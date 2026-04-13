// src/modules/Microphone2/index.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useModulePlugins } from '../../hooks/useModulePlugins';
import { MicrophoneService } from './services/MicrophoneService';
import DeviceSelector from './components/DeviceSelector';
import { MicrophoneState } from './types';
import { IPluginContext } from '../../types/plugins';
import ModuleHeader from '../../components/ui/ModuleHeader';

const MODULE_ID = 'microphone';

const INITIAL_STATE: MicrophoneState = {
  isRecording: false,
  rawVolume: 0,
  processedVolume: 0,
  error: null,
  audioDevices: [],
  selectedDeviceId: '',
  recordingDuration: 0,
  // ❌ Удаляем qualityScore, snr, noise, waveformData, spectrumData
};

const Microphone: React.FC = () => {
  const [state, setState] = useState<MicrophoneState>(INITIAL_STATE);
  
  const serviceRef = useRef<MicrophoneService | null>(null);
  const isInitializedRef = useRef(false);
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // ✅ Передаём только сырые данные
  const pluginContext: IPluginContext = {
    moduleId: MODULE_ID as any,
    moduleState: state,
    dispatch: (action: string, payload?: any) => {
      console.log(`[Microphone2] Dispatch ${action}`, payload);
      switch (action) {
        case 'startMonitoring':
          handleStartMonitoring();
          break;
        case 'stopMonitoring':
          handleStopMonitoring();
          break;
        case 'changeDevice':
          if (payload?.deviceId) handleDeviceChange(payload.deviceId);
          break;
      }
    },
    getData: () => stateRef.current,
    setData: (data: any) => {
      setState(prev => ({ ...prev, ...data }));
    },
    
    // ✅ Только сырые данные от микрофона
    rawVolume: state.rawVolume,
    processedVolume: state.processedVolume,
    isRecording: state.isRecording,
  };
  
  const {
    activePlugins,
    widgets,
    emitEvent,
    executeOnPlugins,
  } = useModulePlugins<MicrophoneState>({
    moduleId: MODULE_ID as any,
    getInitialState: () => INITIAL_STATE,
  });
  
  const getService = useCallback(() => {
    if (!serviceRef.current) {
      const service = new MicrophoneService((volume) => {
        const results = executeOnPlugins('processAudioFrame', { volume });
        if (results.length > 0 && results[0] !== null && typeof results[0] === 'number') {
          return results[0];
        }
        return volume;
      });
      
      service.on('onVolumeUpdate', (rawVolume, processedVolume) => {
        setState(prev => ({ ...prev, rawVolume, processedVolume }));
        emitEvent('volumeUpdate', { rawVolume, processedVolume });
      });
      
      service.on('onRecordingStart', () => {
        setState(prev => ({ ...prev, isRecording: true, error: null }));
        emitEvent('recordingStarted');
      });
      
      service.on('onRecordingStop', (duration) => {
        setState(prev => ({ ...prev, isRecording: false, recordingDuration: duration }));
        emitEvent('recordingStopped', { duration });
      });
      
      service.on('onDurationUpdate', (duration) => {
        setState(prev => ({ ...prev, recordingDuration: duration }));
      });
      
      service.on('onError', (error) => {
        setState(prev => ({ ...prev, error }));
      });
      
      service.on('onDevicesUpdate', (devices) => {
        setState(prev => ({ ...prev, audioDevices: devices }));
      });
      
      service.on('onDeviceChange', (deviceId) => {
        setState(prev => ({ ...prev, selectedDeviceId: deviceId }));
      });
      
      serviceRef.current = service;
    }
    return serviceRef.current;
  }, [emitEvent, executeOnPlugins]);
  
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    const service = getService();
    service.getAudioDevices().then(devices => {
      if (devices.length > 0) {
        setState(prev => ({
          ...prev,
          audioDevices: devices,
          selectedDeviceId: devices[0].deviceId
        }));
      }
    });
    
    return () => {
      if (serviceRef.current) {
        serviceRef.current.dispose();
        serviceRef.current = null;
      }
    };
  }, [getService]);
  
  const handleStartMonitoring = useCallback(async () => {
    const service = getService();
    if (!service) return;
    await service.startRecording(state.selectedDeviceId || undefined);
  }, [state.selectedDeviceId, getService]);
  
  const handleStopMonitoring = useCallback(() => {
    const service = getService();
    if (!service) return;
    service.stopRecording();
  }, [getService]);
  
  const handleDeviceChange = useCallback(async (deviceId: string) => {
    const service = getService();
    if (!service) return;
    setState(prev => ({ ...prev, selectedDeviceId: deviceId }));
    await service.changeDevice(deviceId);
  }, [getService]);
  
  const { isRecording, audioDevices, selectedDeviceId, error } = state;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(220,20%,8%)] to-[hsl(220,20%,10%)] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-5">
        
        <ModuleHeader
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.247 7.761a6 6 0 0 1 0 8.478" />
              <path d="M19.075 4.933a10 10 0 0 1 0 14.134" />
              <path d="M4.925 19.067a10 10 0 0 1 0-14.134" />
              <path d="M7.753 16.239a6 6 0 0 1 0-8.478" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          }
          title="Microphone"
          description="Real-time microphone switching & audio quality analysis"
        />
        
        {error && (
          <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-3 text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        
        <DeviceSelector
          devices={audioDevices}
          selectedDeviceId={selectedDeviceId}
          onDeviceChange={handleDeviceChange}
          onStartMonitoring={handleStartMonitoring}
          onStopMonitoring={handleStopMonitoring}
          isRecording={isRecording}
        />
        
        {activePlugins.length > 0 && 
        //isRecording && 
        (
          <div className="space-y-4">
            {widgets.map((widget) => {
              const plugin = activePlugins.find(p => p.id === widget.pluginId);
              if (!plugin) return null;
              return (
                <div key={widget.id}>
                  <widget.component
                    plugin={plugin}
                    context={pluginContext}
                    onAction={(action, data) => plugin.execute?.(action, data, pluginContext)}
                    isActive={plugin.enabled}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Microphone;
