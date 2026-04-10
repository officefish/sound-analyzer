import React, { useState, useRef, useEffect, useCallback } from 'react';

const Microphone: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Получение списка аудиоустройств
  const getAudioDevices = useCallback(async () => {
    try {
      // Запрашиваем разрешение сначала
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

  // Запуск записи
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      // Настройка AudioContext
      audioContextRef.current = new AudioContext();
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserNodeRef.current = audioContextRef.current.createAnalyser();
      
      analyserNodeRef.current.fftSize = 256;
      sourceNodeRef.current.connect(analyserNodeRef.current);
      
      await audioContextRef.current.resume();
      setIsRecording(true);
      
      // Запуск анализа громкости
      const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
      
      const updateVolume = () => {
        if (!analyserNodeRef.current || !isRecording) return;
        
        analyserNodeRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        const normalizedVolume = Math.min(1, average / 128);
        setVolume(normalizedVolume);
        
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
      
    } catch (err) {
      console.error('Ошибка доступа к микрофону:', err);
      setError('Не удалось получить доступ к микрофону. Проверьте разрешения.');
    }
  }, [selectedDeviceId, isRecording]);

  // Остановка записи
  const stopRecording = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
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
    
    setIsRecording(false);
    setVolume(0);
  }, []);

  // Получение устройств при монтировании
  useEffect(() => {
    getAudioDevices();
    
    return () => {
      stopRecording();
    };
  }, [getAudioDevices, stopRecording]);

  // Смена устройства
  useEffect(() => {
    if (isRecording) {
      stopRecording();
      setTimeout(() => startRecording(), 100);
    }
  }, [selectedDeviceId]);

  // Уровень громкости для визуализации
  const getVolumeColor = () => {
    if (volume < 0.3) return 'bg-green-500';
    if (volume < 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Визуализация уровня звука */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Анимация микрофона */}
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
        
        {/* Индикатор громкости */}
        <div className="w-64">
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${getVolumeColor()}`}
              style={{ width: `${volume * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-gray-400 text-xs mt-1">
            <span>Тихо</span>
            <span>Нормально</span>
            <span>Громко</span>
          </div>
        </div>
        
        {/* Текущий уровень */}
        {isRecording && (
          <div className="text-center">
            <div className="text-3xl font-mono text-green-400">
              {Math.round(volume * 100)}%
            </div>
            <div className="text-gray-500 text-xs mt-1">уровень сигнала</div>
          </div>
        )}
        
        {/* Ошибка */}
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
        <p className="text-gray-500 text-xs mt-2">
          ℹ️ Выберите устройство для захвата звука
        </p>
      </div>
      
      {/* Статус */}
      <div className="mt-4 pt-3 border-t border-white/10">
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