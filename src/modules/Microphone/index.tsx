import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from 'react-daisyui';
import { useModulePlugins } from '../../hooks/useModulePlugins';
import { MicrophoneService } from './microphone.service';
import VolumeWidget from './components/VolumeWidget';
import DeviceSelector from './components/DeviceSelector';
import { MicrophoneState } from './types';

// Начальное состояние
const INITIAL_STATE: MicrophoneState = {
  isRecording: false,
  rawVolume: 0,
  processedVolume: 0,
  error: null,
  audioDevices: [],
  selectedDeviceId: '',
  recordingDuration: 0,
};

const Microphone: React.FC = () => {
  // Состояние
  const [state, setState] = useState<MicrophoneState>(INITIAL_STATE);
  
  const serviceRef = useRef<MicrophoneService | null>(null);
  const isInitializedRef = useRef(false);
  
  // Подключаем плагины
  const {
    activePlugins,
    widgets,
    emitEvent,
    executeOnPlugins,
  } = useModulePlugins<MicrophoneState>({
    moduleId: 'microphone',
    getInitialState: () => INITIAL_STATE,
  });
  
  // Создаём сервис синхронно
  const getService = useCallback(() => {
    if (!serviceRef.current) {
      console.log('🔧 Creating MicrophoneService...');
      
      const service = new MicrophoneService((volume) => {
        const results = executeOnPlugins('processAudioFrame', { volume });
        if (results.length > 0 && results[0] !== null && typeof results[0] === 'number') {
          return results[0];
        }
        return volume;
      });
      
      // Подписываемся на события сервиса
      service.on('onVolumeUpdate', (rawVolume, processedVolume) => {
        setState(prev => ({ ...prev, rawVolume, processedVolume }));
        emitEvent('volumeUpdate', { rawVolume, processedVolume });
      });
      
      service.on('onRecordingStart', () => {
        console.log('🎤 Recording started event');
        setState(prev => ({ ...prev, isRecording: true, error: null }));
        emitEvent('recordingStarted');
      });
      
      service.on('onRecordingStop', (duration) => {
        console.log('⏹️ Recording stopped event, duration:', duration);
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
        console.log('🎛️ Devices update received:', devices.length);
        setState(prev => ({ ...prev, audioDevices: devices }));
      });
      
      service.on('onDeviceChange', (deviceId) => {
        console.log('🎛️ Device change event:', deviceId);
        setState(prev => ({ ...prev, selectedDeviceId: deviceId }));
      });
      
      serviceRef.current = service;
    }
    return serviceRef.current;
  }, [emitEvent, executeOnPlugins]);
  
  // Инициализация сервиса и загрузка устройств после монтирования
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    const service = getService();
    console.log('🎤 Initializing microphone, loading devices...');
    
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
      console.log('🧹 Cleaning up microphone service');
      if (serviceRef.current) {
        serviceRef.current.dispose();
        serviceRef.current = null;
      }
    };
  }, [getService]);
  
  // Обновляем обработчик звука при изменении плагинов
  useEffect(() => {
    if (serviceRef.current) {
      serviceRef.current.setAudioProcessor((volume) => {
        const results = executeOnPlugins('processAudioFrame', { volume });
        if (results.length > 0 && results[0] !== null && typeof results[0] === 'number') {
          return results[0];
        }
        return volume;
      });
    }
  }, [executeOnPlugins]);
  
  // Обработчики
  const handleStartRecording = useCallback(async () => {
    console.log('🎤 handleStartRecording called, current isRecording:', state.isRecording);
    
    if (state.isRecording) {
      console.log('⚠️ Already recording, ignoring start');
      return;
    }
    
    const service = getService();
    if (!service) {
      console.error('❌ Service not available');
      return;
    }
    
    console.log('🎤 Starting recording with device:', state.selectedDeviceId);
    const success = await service.startRecording(state.selectedDeviceId || undefined);
    
    if (success) {
      console.log('✅ Recording started successfully');
    } else {
      console.error('❌ Failed to start recording');
    }
  }, [state.isRecording, state.selectedDeviceId, getService]);
  
  const handleStopRecording = useCallback(() => {
    console.log('⏹️ handleStopRecording called, current isRecording:', state.isRecording);
    
    if (!state.isRecording) {
      console.log('⚠️ Not recording, ignoring stop');
      return;
    }
    
    const service = getService();
    if (!service) {
      console.error('❌ Service not available');
      return;
    }
    
    console.log('⏹️ Stopping recording');
    service.stopRecording();
  }, [state.isRecording, getService]);
  
  const handleDeviceChange = useCallback(async (deviceId: string) => {
    console.log('🎛️ handleDeviceChange called:', deviceId);
    const service = getService();
    if (!service) {
      console.error('❌ Service not available');
      return;
    }
    setState(prev => ({ ...prev, selectedDeviceId: deviceId }));
    await service.changeDevice(deviceId);
  }, [getService]);
  
  const { isRecording, rawVolume, processedVolume, error, audioDevices, selectedDeviceId, recordingDuration } = state;
  
  // Контекст для виджетов плагинов
  const widgetContext = {
    isRecording,
    rawVolume,
    processedVolume,
    duration: recordingDuration,
  };
  
  return (
    <div className="p-6 space-y-4">
      {/* Виджет громкости */}
      <VolumeWidget
        rawVolume={rawVolume}
        processedVolume={processedVolume}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
      />
      
      {/* Ошибка */}
      {error && (
        <div className="alert alert-error shadow-lg">
          <span>❌ {error}</span>
        </div>
      )}
      
      {/* Кнопки управления */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={handleStartRecording}
          disabled={isRecording}
          color="success"
          size="md"
          fullWidth
          startIcon="🎙️"
        >
          Включить
        </Button>
        <Button
          onClick={handleStopRecording}
          disabled={!isRecording}
          color="error"
          size="md"
          fullWidth
          startIcon="⏹️"
        >
          Выключить
        </Button>
      </div>
      
      {/* Выбор устройства */}
      <DeviceSelector
        devices={audioDevices}
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={handleDeviceChange}
        disabled={isRecording}
      />
      
      {/* Виджеты плагинов */}
      {widgets.length > 0 && (
        <div className="divider text-xs text-base-content/50">🔌 Плагины</div>
      )}
      
      {widgets.map((widget) => {
        const plugin = activePlugins.find(p => p.id === widget.pluginId);
        if (!plugin) return null;
        return (
          <div key={widget.id} className="card bg-base-200 shadow-xl">
            {widget.title && (
              <div className="card-header p-3 border-b border-base-300">
                <div className="flex items-center gap-2">
                  {widget.icon && <span className="text-sm">{widget.icon}</span>}
                  <span className="text-white text-xs font-medium">{widget.title}</span>
                </div>
              </div>
            )}
            <div className="card-body p-3">
              <widget.component
                plugin={plugin}
                context={widgetContext}
                onAction={(action, data) => plugin.execute?.(action, data)}
                isActive={plugin.enabled}
              />
            </div>
          </div>
        );
      })}
      
      {/* Активные плагины индикатор */}
      {activePlugins.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {activePlugins.map(plugin => (
            <div key={plugin.id} className="badge badge-primary badge-sm gap-1">
              {plugin.icon} {plugin.name}
            </div>
          ))}
        </div>
      )}
      
      {/* Статус */}
      <div className="text-center">
        <div className="flex justify-between text-xs text-base-content/50">
          <span>
            {isRecording ? '🔴 Идёт запись...' : '⚪ Микрофон отключён'}
          </span>
          <span>
            {audioDevices.length} устройств найдено
          </span>
        </div>
      </div>
    </div>
  );
};

export default Microphone;