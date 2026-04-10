import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { useModulePlugins } from '../../hooks/useModulePlugins';
//import { IPluginContext } from '../../types/plugins';

interface MicrophoneState {
  isRecording: boolean;
  rawVolume: number;
  processedVolume: number;
  error: string | null;
  audioDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  recordingDuration: number;
}

const Microphone: React.FC = () => {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);
  
  const {
    state,
    setState,
    activePlugins,
    widgets,
    emitEvent,
    executeOnPlugins,
  } = useModulePlugins<MicrophoneState>({
    moduleId: 'microphone',
    getInitialState: () => ({
      isRecording: false,
      rawVolume: 0,
      processedVolume: 0,
      error: null,
      audioDevices: [],
      selectedDeviceId: '',
      recordingDuration: 0,
    }),
  });
  
  const { isRecording, rawVolume, processedVolume, error, audioDevices, selectedDeviceId, recordingDuration } = state;
  
  const getAudioDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setState({ audioDevices: audioInputs });
      
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setState({ selectedDeviceId: audioInputs[0].deviceId });
      }
    } catch (err) {
      console.error('Ошибка получения устройств:', err);
    }
  }, [selectedDeviceId, setState]);
  
  const startRecording = useCallback(async () => {
    if (isRecording) return;
    
    try {
      setState({ error: null });
      
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      emitEvent('streamAvailable', { stream });
      
      audioContextRef.current = new AudioContext();
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserNodeRef.current = audioContextRef.current.createAnalyser();
      
      analyserNodeRef.current.fftSize = 256;
      sourceNodeRef.current.connect(analyserNodeRef.current);
      
      await audioContextRef.current.resume();
      setState({ isRecording: true });
      
      durationIntervalRef.current = window.setInterval(() => {
        setState((prev: MicrophoneState) => ({
          ...prev,
          recordingDuration: prev.recordingDuration + 1
        }));
      }, 1000);
      
      const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
      
      const updateVolume = () => {
        if (!analyserNodeRef.current || !isRecording) return;
        
        analyserNodeRef.current.getByteFrequencyData(dataArray);
        let average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        let normalizedVolume = Math.min(1, average / 128);
        
        setState({ rawVolume: normalizedVolume });
        
        let processed = normalizedVolume;
        const results = executeOnPlugins('processAudioFrame', { volume: normalizedVolume });
        if (results.length > 0 && results[0] !== null && typeof results[0] === 'number') {
          processed = results[0];
        }
        
        setState({ processedVolume: processed });
        
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
      
      emitEvent('recordingStarted', { stream });
      
    } catch (err) {
      console.error('Ошибка доступа к микрофону:', err);
      setState({ error: 'Не удалось получить доступ к микрофону. Проверьте разрешения.' });
    }
  }, [isRecording, selectedDeviceId, emitEvent, executeOnPlugins, setState]);
  
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
    
    setState({
      isRecording: false,
      rawVolume: 0,
      processedVolume: 0,
      recordingDuration: 0,
    });
  }, [emitEvent, recordingDuration, setState]);
  
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      getAudioDevices();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (analyserNodeRef.current) {
        analyserNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [getAudioDevices]);
  
  useEffect(() => {
    if (isRecording && selectedDeviceId) {
      stopRecording();
      const timer = setTimeout(() => startRecording(), 100);
      return () => clearTimeout(timer);
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
  
  const showNoiseGateEffect = processedVolume !== rawVolume;
  
  const widgetContext = useMemo(() => ({
    isRecording,
    rawVolume,
    processedVolume,
    duration: recordingDuration,
  }), [isRecording, rawVolume, processedVolume, recordingDuration]);
  
  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center gap-6 mb-8">
        <div className="relative">
          <div className={`text-8xl transition-all duration-100 ${isRecording ? 'scale-110' : 'scale-100'}`}>
            🎤
          </div>
          {isRecording && (
            <>
              <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500/30 -z-10"></div>
              <div className="absolute inset-0 rounded-full animate-pulse bg-indigo-500/20 -z-10"></div>
            </>
          )}
        </div>
        
        <div className="w-64">
          <div className="flex justify-between text-gray-400 text-xs mb-1">
            <span>🎧 Входной сигнал</span>
            <span>{Math.round(rawVolume * 100)}%</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-75 ${getVolumeColor(rawVolume)}`} style={{ width: `${rawVolume * 100}%` }} />
          </div>
        </div>
        
        {showNoiseGateEffect && (
          <div className="w-64">
            <div className="flex justify-between text-gray-400 text-xs mb-1">
              <span>🔧 После обработки</span>
              <span>{Math.round(processedVolume * 100)}%</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-75 ${getVolumeColor(processedVolume)}`} style={{ width: `${processedVolume * 100}%` }} />
            </div>
          </div>
        )}
        
        {isRecording && (
          <div className="text-center">
            <div className="text-3xl font-mono text-green-400">{Math.round((showNoiseGateEffect ? processedVolume : rawVolume) * 100)}%</div>
            <div className="text-gray-500 text-xs mt-1">{showNoiseGateEffect ? 'уровень после фильтрации' : 'уровень сигнала'}</div>
            <div className="text-gray-600 text-xs mt-1">⏱ {formatDuration(recordingDuration)}</div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button onClick={startRecording} disabled={isRecording} className="btn bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">🎙️ Включить</button>
        <button onClick={stopRecording} disabled={!isRecording} className="btn bg-rose-600 hover:bg-rose-500 disabled:opacity-50">⏹️ Выключить</button>
      </div>
      
      <div className="bg-black/30 rounded-xl p-4 mb-6">
        <h3 className="text-white text-sm font-semibold mb-2">🎛️ Аудиоустройства</h3>
        <select
          value={selectedDeviceId}
          onChange={(e) => setState({ selectedDeviceId: e.target.value })}
          className="w-full bg-slate-800 text-white text-sm rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:border-indigo-500"
        >
          {audioDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Микрофон ${device.deviceId.slice(0, 8)}...`}
            </option>
          ))}
          {audioDevices.length === 0 && <option disabled>Нет доступных микрофонов</option>}
        </select>
      </div>
      
      {widgets.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="border-t border-white/10 pt-3">
            <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">🔌 Плагины</h3>
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
      
      {activePlugins.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center pt-3 border-t border-white/10">
          {activePlugins.map(plugin => (
            <span key={plugin.id} className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              {plugin.icon} {plugin.name}
            </span>
          ))}
        </div>
      )}
      
      <div className="mt-4 text-center">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">{isRecording ? '🔴 Идёт запись...' : '⚪ Микрофон отключён'}</span>
          <span className="text-gray-400">{audioDevices.length} устройств найдено</span>
        </div>
      </div>
    </div>
  );
};

export default Microphone;