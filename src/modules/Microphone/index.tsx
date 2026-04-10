import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePlugins } from '../../hooks/usePlugins';
import { usePluginsStore } from '../../store/plugins.store';
import Footer from '../../components/Layout/Footer';
import { NoiseGatePlugin } from './plugins/NoiseGatePlugin';
import { RecorderPlugin } from './plugins/RecorderPlugin';

const Microphone: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [rawVolume, setRawVolume] = useState<number>(0);
  const [processedVolume, setProcessedVolume] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  
  // Подключаем плагины
  const { activePlugins, executeOnAll, emitEvent, registerPlugin } = usePlugins('microphone', {
    moduleId: 'microphone',
    moduleState: { isRecording, rawVolume, processedVolume },
    dispatch: (action, payload) => {
      switch (action) {
        case 'startRecording': startRecording(); break;
        case 'stopRecording': stopRecording(); break;
      }
    },
    getData: () => ({ isRecording, rawVolume, processedVolume, stream: mediaStreamRef.current }),
    setData: (data) => {
      if (data.processedVolume !== undefined) setProcessedVolume(data.processedVolume);
    },
  });
  
  // Регистрируем плагины при монтировании (используем импортированный store)
  useEffect(() => {
    // Получаем состояние store напрямую через импортированный хук
    const state = usePluginsStore.getState();
    
    // Регистрируем плагины, если они ещё не зарегистрированы
    const existingPlugins = state.getPluginsByModule('microphone');
    const existingIds = existingPlugins.map(p => p.id);
    
    if (!existingIds.includes(NoiseGatePlugin.id)) {
      state.registerPlugin(NoiseGatePlugin);
    }
    if (!existingIds.includes(RecorderPlugin.id)) {
      state.registerPlugin(RecorderPlugin);
    }
  }, []);
  
  const getAudioDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setAudioDevices(audioInputs);
      
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Ошибка получения устройств:', err);
    }
  }, [selectedDeviceId]);
  
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      // Уведомляем плагины о новом стриме
      emitEvent('streamAvailable', { stream });
      
      audioContextRef.current = new AudioContext();
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserNodeRef.current = audioContextRef.current.createAnalyser();
      
      analyserNodeRef.current.fftSize = 256;
      sourceNodeRef.current.connect(analyserNodeRef.current);
      
      await audioContextRef.current.resume();
      setIsRecording(true);
      
      // Таймер длительности записи
      let duration = 0;
      durationIntervalRef.current = window.setInterval(() => {
        duration++;
        setRecordingDuration(duration);
      }, 1000);
      
      const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
      
      const updateVolume = () => {
        if (!analyserNodeRef.current || !isRecording) return;
        
        analyserNodeRef.current.getByteFrequencyData(dataArray);
        let average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        let normalizedVolume = Math.min(1, average / 128);
        
        setRawVolume(normalizedVolume);
        
        // Отправляем фрейм в плагины для обработки
        let processed = normalizedVolume;
        const results = executeOnAll('processAudioFrame', { volume: normalizedVolume });
        if (results.length > 0 && results[0] !== null) {
          processed = results[0];
        }
        
        setProcessedVolume(processed);
        
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
      
      emitEvent('recordingStarted', { stream });
      
    } catch (err) {
      console.error('Ошибка доступа к микрофону:', err);
      setError('Не удалось получить доступ к микрофону. Проверьте разрешения.');
    }
  }, [selectedDeviceId, isRecording, emitEvent, executeOnAll]);
  
  const stopRecording = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    
    if (analyserNodeRef.current) {
      analyserNodeRef.current.disconnect();
      analyserNodeRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    emitEvent('recordingStopped', { duration: recordingDuration });
    
    setIsRecording(false);
    setRawVolume(0);
    setProcessedVolume(0);
    setRecordingDuration(0);
  }, [emitEvent, recordingDuration]);
  
  useEffect(() => {
    getAudioDevices();
    
    return () => {
      stopRecording();
    };
  }, [getAudioDevices, stopRecording]);
  
  useEffect(() => {
    if (isRecording) {
      stopRecording();
      setTimeout(() => startRecording(), 100);
    }
  }, [selectedDeviceId]);
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getVolumeColor = (volume: number) => {
    if (volume < 0.3) return 'bg-green-500';
    if (volume < 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Визуализация разницы между сырым и обработанным звуком
  const showNoiseGateEffect = processedVolume !== rawVolume;
  
  return (
    <div className="h-full flex flex-col relative">
      {/* Рендерим UI компоненты активных плагинов */}
      {activePlugins.map(plugin => 
        plugin.UIComponent && (
          <plugin.UIComponent
            isActive={true}
            key={plugin.id}
            context={{ isRecording, rawVolume, processedVolume, duration: recordingDuration }}
            onAction={(action, data) => {
              if (plugin.execute) {
                plugin.execute(action, data);
              }
            }}
          />
        )
      )}
      
      {/* Визуализация уровня звука */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className={`
            text-8xl transition-all duration-100
            ${isRecording ? 'scale-110' : 'scale-100'}
          `}>
            🎤
          </div>
          
          {isRecording && (
            <>
              <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500/30 -z-10"></div>
              <div className="absolute inset-0 rounded-full animate-pulse bg-indigo-500/20 -z-10"></div>
            </>
          )}
        </div>
        
        {/* Raw уровень */}
        <div className="w-64">
          <div className="flex justify-between text-gray-400 text-xs mb-1">
            <span>🎧 Входной сигнал</span>
            <span>{Math.round(rawVolume * 100)}%</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${getVolumeColor(rawVolume)}`}
              style={{ width: `${rawVolume * 100}%` }}
            />
          </div>
        </div>
        
        {/* Обработанный уровень (если есть активные плагины обработки) */}
        {showNoiseGateEffect && (
          <div className="w-64">
            <div className="flex justify-between text-gray-400 text-xs mb-1">
              <span>🔧 После обработки</span>
              <span>{Math.round(processedVolume * 100)}%</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${getVolumeColor(processedVolume)}`}
                style={{ width: `${processedVolume * 100}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Текущий уровень */}
        {isRecording && (
          <div className="text-center">
            <div className="text-3xl font-mono text-green-400">
              {Math.round((showNoiseGateEffect ? processedVolume : rawVolume) * 100)}%
            </div>
            <div className="text-gray-500 text-xs mt-1">
              {showNoiseGateEffect ? 'уровень после фильтрации' : 'уровень сигнала'}
            </div>
            <div className="text-gray-600 text-xs mt-1">
              ⏱ {formatDuration(recordingDuration)}
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>
      
      {/* Кнопки управления */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="btn bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
        >
          🎙️ Включить
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="btn bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/30 disabled:opacity-50"
        >
          ⏹️ Выключить
        </button>
      </div>
      
      {/* Выбор устройства */}
      <div className="bg-black/30 rounded-xl p-4">
        <h3 className="text-white text-sm font-semibold mb-2">🎛️ Аудиоустройства</h3>
        <select
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          className="w-full bg-slate-800 text-white text-sm rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:border-indigo-500"
        >
          {audioDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Микрофон ${device.deviceId.slice(0, 8)}...`}
            </option>
          ))}
          {audioDevices.length === 0 && (
            <option disabled>Нет доступных микрофонов</option>
          )}
        </select>
      </div>
      
      {/* Активные плагины индикатор */}
      {activePlugins.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 justify-center">
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
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">
            {isRecording ? '🔴 Идёт запись...' : '⚪ Микрофон отключён'}
          </span>
          <span className="text-gray-400">
            {audioDevices.length} устройств найдено
          </span>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Microphone;