import React, { useState, useEffect, useCallback, useRef } from 'react';
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
        console.log('🎛️ Devices update received:', devices.length, devices);
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
    
    // Загружаем устройства и обновляем состояние
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
    <div className="p-6">
      {/* Виджет громкости */}
      <VolumeWidget
        rawVolume={rawVolume}
        processedVolume={processedVolume}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
      />
      
      {/* Ошибка */}
      {error && (
        <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm text-center">
          {error}
        </div>
      )}
      
      {/* Кнопки управления */}
      <div className="grid grid-cols-2 gap-3 mt-8 mb-6">
        <button
          onClick={handleStartRecording}
          disabled={isRecording}
          className="btn bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🎙️ Включить
        </button>
        <button
          onClick={handleStopRecording}
          disabled={!isRecording}
          className="btn bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⏹️ Выключить
        </button>
      </div>
      
      {/* Выбор устройства */}
      <DeviceSelector
        devices={audioDevices}
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={handleDeviceChange}
        disabled={isRecording}
      />
      
      {/* Отладка: показываем количество устройств */}
      <div className="text-center text-xs text-gray-500 mt-2">
        Найдено устройств: {audioDevices.length}
      </div>
      
      {/* Виджеты плагинов */}
      {widgets.length > 0 && (
        <div className="space-y-3 mt-6">
          <div className="border-t border-white/10 pt-3">
            <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
              🔌 Плагины
            </h3>
          </div>
          {widgets.map((widget) => {
            const plugin = activePlugins.find(p => p.id === widget.pluginId);
            if (!plugin) return null;
            return (
              <div key={widget.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                {widget.title && (
                  <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center gap-2">
                    {widget.icon && <span className="text-sm">{widget.icon}</span>}
                    <span className="text-white text-xs font-medium">{widget.title}</span>
                  </div>
                )}
                <div className="p-3">
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
        </div>
      )}
      
      {/* Активные плагины индикатор */}
      {activePlugins.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center pt-3 border-t border-white/10 mt-6">
          {activePlugins.map(plugin => (
            <span
              key={plugin.id}
              className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1"
            >
              {plugin.icon} {plugin.name}
            </span>
          ))}
        </div>
      )}
      
      {/* Статус */}
      <div className="mt-4 text-center">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">
            {isRecording ? '🔴 Идёт запись...' : '⚪ Микрофон отключён'}
          </span>
          <span className="text-gray-400">
            {audioDevices.length} устройств найдено
          </span>
        </div>
      </div>
    </div>
  );
};

export default Microphone;

// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { useModulePlugins } from '../../hooks/useModulePlugins';
// import { MicrophoneService } from './microphone.service';
// import VolumeWidget from './components/VolumeWidget';
// import DeviceSelector from './components/DeviceSelector';
// import { MicrophoneState } from './types';

// // Начальное состояние
// const INITIAL_STATE: MicrophoneState = {
//   isRecording: false,
//   rawVolume: 0,
//   processedVolume: 0,
//   error: null,
//   audioDevices: [],
//   selectedDeviceId: '',
//   recordingDuration: 0,
// };

// const Microphone: React.FC = () => {
//   // Состояние
//   const [state, setState] = useState<MicrophoneState>(INITIAL_STATE);
  
//   const serviceRef = useRef<MicrophoneService | null>(null);
//   const isInitializedRef = useRef(false);
  
//   // Подключаем плагины
//   const {
//     activePlugins,
//     widgets,
//     emitEvent,
//     executeOnPlugins,
//   } = useModulePlugins<MicrophoneState>({
//     moduleId: 'microphone',
//     getInitialState: () => INITIAL_STATE,
//   });
  
//   // Создаём сервис синхронно
//   const getService = useCallback(() => {
//     if (!serviceRef.current) {
//       console.log('🔧 Creating MicrophoneService...');
      
//       const service = new MicrophoneService((volume) => {
//         const results = executeOnPlugins('processAudioFrame', { volume });
//         if (results.length > 0 && results[0] !== null && typeof results[0] === 'number') {
//           return results[0];
//         }
//         return volume;
//       });
      
//       // Подписываемся на события сервиса
//       service.on('onVolumeUpdate', (rawVolume, processedVolume) => {
//         setState(prev => ({ ...prev, rawVolume, processedVolume }));
//         emitEvent('volumeUpdate', { rawVolume, processedVolume });
//       });
      
//       service.on('onRecordingStart', () => {
//         console.log('🎤 Recording started event');
//         setState(prev => ({ ...prev, isRecording: true, error: null }));
//         emitEvent('recordingStarted');
//       });
      
//       service.on('onRecordingStop', (duration) => {
//         console.log('⏹️ Recording stopped event, duration:', duration);
//         setState(prev => ({ ...prev, isRecording: false, recordingDuration: duration }));
//         emitEvent('recordingStopped', { duration });
//       });
      
//       service.on('onError', (error) => {
//         setState(prev => ({ ...prev, error }));
//       });
      
//       service.on('onDevicesUpdate', (devices) => {
//         setState(prev => ({ ...prev, audioDevices: devices }));
//       });
      
//       service.on('onDeviceChange', (deviceId) => {
//         setState(prev => ({ ...prev, selectedDeviceId: deviceId }));
//       });

//       // Внутри getService, добавь подписку на onDurationUpdate:
//       service.on('onDurationUpdate', (duration) => {
//         setState(prev => ({ ...prev, recordingDuration: duration }));
//       });
      
//       serviceRef.current = service;
//     }
//     return serviceRef.current;
//   }, [emitEvent, executeOnPlugins]);
  
//   // Инициализация сервиса и загрузка устройств после монтирования
//   useEffect(() => {
//     if (isInitializedRef.current) return;
//     isInitializedRef.current = true;
    
//     const service = getService();
//     console.log('🎤 Initializing microphone, loading devices...');
//     service.getAudioDevices();
    
//     return () => {
//       console.log('🧹 Cleaning up microphone service');
//       if (serviceRef.current) {
//         serviceRef.current.dispose();
//         serviceRef.current = null;
//       }
//     };
//   }, [getService]);
  
//   // Обновляем обработчик звука при изменении плагинов
//   useEffect(() => {
//     if (serviceRef.current) {
//       serviceRef.current.setAudioProcessor((volume) => {
//         const results = executeOnPlugins('processAudioFrame', { volume });
//         if (results.length > 0 && results[0] !== null && typeof results[0] === 'number') {
//           return results[0];
//         }
//         return volume;
//       });
//     }
//   }, [executeOnPlugins]);
  
//   // Обработчики
//   const handleStartRecording = useCallback(async () => {
//     console.log('🎤 handleStartRecording called, current isRecording:', state.isRecording);
    
//     if (state.isRecording) {
//       console.log('⚠️ Already recording, ignoring start');
//       return;
//     }
    
//     const service = getService();
//     if (!service) {
//       console.error('❌ Service not available');
//       return;
//     }
    
//     console.log('🎤 Starting recording with device:', state.selectedDeviceId);
//     const success = await service.startRecording(state.selectedDeviceId || undefined);
    
//     if (success) {
//       console.log('✅ Recording started successfully');
//     } else {
//       console.error('❌ Failed to start recording');
//     }
//   }, [state.isRecording, state.selectedDeviceId, getService]);
  
//   const handleStopRecording = useCallback(() => {
//     console.log('⏹️ handleStopRecording called, current isRecording:', state.isRecording);
    
//     if (!state.isRecording) {
//       console.log('⚠️ Not recording, ignoring stop');
//       return;
//     }
    
//     const service = getService();
//     if (!service) {
//       console.error('❌ Service not available');
//       return;
//     }
    
//     console.log('⏹️ Stopping recording');
//     service.stopRecording();
//   }, [state.isRecording, getService]);
  
//   const handleDeviceChange = useCallback(async (deviceId: string) => {
//     console.log('🎛️ handleDeviceChange called:', deviceId);
//     const service = getService();
//     if (!service) {
//       console.error('❌ Service not available');
//       return;
//     }
//     await service.changeDevice(deviceId);
//   }, [getService]);
  
//   const { isRecording, rawVolume, processedVolume, error, audioDevices, selectedDeviceId, recordingDuration } = state;
  
//   // Контекст для виджетов плагинов
//   const widgetContext = {
//     isRecording,
//     rawVolume,
//     processedVolume,
//     duration: recordingDuration,
//   };
  
//   return (
//     <div className="p-6">
//       {/* Виджет громкости */}
//       <VolumeWidget
//         rawVolume={rawVolume}
//         processedVolume={processedVolume}
//         isRecording={isRecording}
//         recordingDuration={recordingDuration}
//       />
      
//       {/* Ошибка */}
//       {error && (
//         <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm text-center">
//           {error}
//         </div>
//       )}
      
//       {/* Кнопки управления */}
//       <div className="grid grid-cols-2 gap-3 mt-8 mb-6">
//         <button
//           onClick={handleStartRecording}
//           disabled={isRecording}
//           className="btn bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
//         >
//           🎙️ Включить
//         </button>
//         <button
//           onClick={handleStopRecording}
//           disabled={!isRecording}
//           className="btn bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
//         >
//           ⏹️ Выключить
//         </button>
//       </div>
      
//       {/* Выбор устройства */}
//       <DeviceSelector
//         devices={audioDevices}
//         selectedDeviceId={selectedDeviceId}
//         onDeviceChange={handleDeviceChange}
//         disabled={isRecording}
//       />
      
//       {/* Виджеты плагинов */}
//       {widgets.length > 0 && (
//         <div className="space-y-3 mt-6">
//           <div className="border-t border-white/10 pt-3">
//             <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">
//               🔌 Плагины
//             </h3>
//           </div>
//           {widgets.map((widget) => {
//             const plugin = activePlugins.find(p => p.id === widget.pluginId);
//             if (!plugin) return null;
//             return (
//               <div key={widget.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
//                 {widget.title && (
//                   <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center gap-2">
//                     {widget.icon && <span className="text-sm">{widget.icon}</span>}
//                     <span className="text-white text-xs font-medium">{widget.title}</span>
//                   </div>
//                 )}
//                 <div className="p-3">
//                   <widget.component
//                     plugin={plugin}
//                     context={widgetContext}
//                     onAction={(action, data) => plugin.execute?.(action, data)}
//                     isActive={plugin.enabled}
//                   />
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
      
//       {/* Активные плагины индикатор */}
//       {activePlugins.length > 0 && (
//         <div className="flex flex-wrap gap-1 justify-center pt-3 border-t border-white/10 mt-6">
//           {activePlugins.map(plugin => (
//             <span
//               key={plugin.id}
//               className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1"
//             >
//               {plugin.icon} {plugin.name}
//             </span>
//           ))}
//         </div>
//       )}
      
//       {/* Статус */}
//       <div className="mt-4 text-center">
//         <div className="flex justify-between text-xs">
//           <span className="text-gray-400">
//             {isRecording ? '🔴 Идёт запись...' : '⚪ Микрофон отключён'}
//           </span>
//           <span className="text-gray-400">
//             {audioDevices.length} устройств найдено
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Microphone;