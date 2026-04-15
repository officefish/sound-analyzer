// src/plugins/microphone2/widgets/RecorderWidget/index.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IPlugin } from '../../../../../../types/plugins';
import PluginCard from '../../../../../../components/ui/PluginCard';
import RecordingStatus from './RecordingStatus';
import AutoRecordingProgress from './AutoRecordingProgress';
import ManualControls from './ManualControls';
import AutoControls from './AutoControls';
import RecorderSettings from './RecorderSettings';
import RecorderStats from './RecorderStats';

interface RecorderWidgetProps {
  plugin: IPlugin;
  context?: any;
  onAction: (action: string, data?: any) => any;
  isActive: boolean;
}

type RecordingMode = 'manual' | 'auto';
interface FormatOption {
  format: string;
  label: string;
  available: boolean;
}

const RecorderWidget: React.FC<RecorderWidgetProps> = ({ plugin, context, onAction, isActive }) => {
  // Состояние записи
  const [isRecording, setIsRecording] = useState(false);
  const [isAutoRecording, setIsAutoRecording] = useState(false);
  //const [duration, setDuration] = useState(0);
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('manual');
  
  // Настройки
  const [intervalSeconds, setIntervalSeconds] = useState(30);
  //const [nextSaveIn, setNextSaveIn] = useState(30);
  const [format, setFormat] = useState('webm');
  const [availableFormats, setAvailableFormats] = useState<FormatOption[]>([
    { format: 'webm', label: 'WEBM', available: true },
  ]);
  
  // Статистика
  const [savedFiles, setSavedFiles] = useState<string[]>([]);
  const [totalRecordings, setTotalRecordings] = useState(0);
  const [isElectronAvailable, setIsElectronAvailable] = useState(false);
  const [chunksCount, setChunksCount] = useState(0);
  const [chunksSize, setChunksSize] = useState(0);
  const [maxChunkSize, setMaxChunkSize] = useState(50);
  
  // UI состояние
  const [showSettings, setShowSettings] = useState(false);
  
  const durationRef = useRef<number | null>(null);
  const statsIntervalRef = useRef<number | null>(null);
  //const [showChunks, setShowChunks] = useState(false);

// И функции:
const handleMaxChunkSizeChange = (mb: number) => {
  const newValue = Math.max(10, Math.min(500, mb));
  setMaxChunkSize(newValue);
  onAction('setMaxChunkSize', newValue);
};


  // Загрузка начальных настроек
  useEffect(() => {
    if (!isActive) return;

    // ✅ Загружаем интервал из плагина
    const savedInterval = onAction('getInterval');
    if (typeof savedInterval === 'number') {
      setIntervalSeconds(savedInterval);
    }
    
    const pluginSettings = (plugin as any).settings;
    if (pluginSettings) {
      setMaxChunkSize((pluginSettings.maxChunkSize || 50 * 1024 * 1024) / 1024 / 1024);
      const mode = pluginSettings.autoSave !== false ? 'auto' : 'manual';
      setRecordingMode(mode);
    }
    
    const formats = onAction('getAvailableFormats');
    if (formats && Array.isArray(formats)) {
      setAvailableFormats(formats);
      const firstAvailable = formats.find(f => f.available);
      if (firstAvailable) {
        setFormat(firstAvailable.format);
        onAction('setFormat', firstAvailable.format);
      }
    }
    
    const checkElectron = async () => {
      const result = onAction('isElectronAvailable');
      const isAvailable = result instanceof Promise ? await result : result;
      setIsElectronAvailable(!!isAvailable);
    };
    checkElectron();
    
    const updateStats = () => {
      const stats = onAction('getStats');
      if (stats && typeof stats === 'object') {
        setTotalRecordings(stats.totalRecordings || 0);
        setSavedFiles(stats.recentFiles || []);
        setChunksCount(stats.chunksCount || 0);
        setChunksSize(stats.chunksTotalSize || 0);
        setIsRecording(stats.isRecording || false);
        setIsAutoRecording(stats.isAutoRecording || false);
      }
    };
    updateStats();
    
    statsIntervalRef.current = window.setInterval(updateStats, 1000);
    
    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [isActive, onAction, plugin]);
  
  // Таймер длительности записи
  useEffect(() => {
    if (isRecording) {
      //durationRef.current = window.setInterval(() => {
        //setDuration(prev => prev + 1);
      //}, 1000);
    } else {
      if (durationRef.current) {
        //clearInterval(durationRef.current);
        durationRef.current = null;
      }
      //setDuration(0);
    }
    
    return () => {
      //if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [isRecording]);
  
  // Таймер для UI интервала
  /*
  useEffect(() => {
    if (isRecording && isAutoRecording) {
      
      const timer = setInterval(() => {
        setNextSaveIn(prev => {
          if (prev <= 1) return intervalSeconds;
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
      
    } else {
      //setNextSaveIn(intervalSeconds);
    }
  }, [isRecording, isAutoRecording, intervalSeconds]);
  */
  
  // Переключение режима
  const handleModeChange = (mode: RecordingMode) => {
    setRecordingMode(mode);
    onAction('setAutoSave', mode === 'auto');
    
    if (mode === 'auto' && isMicActive && !isRecording) {
      const stream = context?.getStream?.();
      if (stream) {
        console.log('🔁 Switching to auto mode, starting auto recording');
        onAction('startAutoRecording', { stream });
      }
    }
    
    if (mode === 'manual' && isRecording && isAutoRecording) {
      console.log('✋ Switching to manual mode, stopping auto recording');
      onAction('stopAutoRecording');
    }
  };
  
  // Обработчики для ручного режима
  const handleStartManual = () => {
    const stream = context?.getStream?.();
    if (!stream) {
      console.error('No stream available');
      return;
    }
    onAction('start', { stream });
  };
  
  const handleStopManual = () => {
    onAction('stop');
  };
  
   // ✅ Обработчик изменения интервала — отправляем в плагин
  const handleIntervalChange = useCallback((seconds: number) => {
    const newValue = Math.max(1, Math.min(1200, seconds));
    setIntervalSeconds(newValue);
    onAction('setInterval', newValue);
  }, [onAction]);
  
  const handleFormatChange = (newFormat: string) => {
    const formatOption = availableFormats.find(f => f.format === newFormat);
    if (!formatOption?.available) return;
    setFormat(newFormat);
    onAction('setFormat', newFormat);
  };
  
  const handleClearChunks = () => {
    if (confirm(`Очистить ${chunksCount} чанков (${(chunksSize / 1024 / 1024).toFixed(2)} MB)?`)) {
        onAction('clearChunks');
        setChunksCount(0);
        setChunksSize(0);
    }
  };
  
  const isMicActive = context?.isRecording || false;

  const testActions = () => {
  console.log('🧪 Testing onAction:');
  console.log('  getCurrentSegmentTime:', onAction('getCurrentSegmentTime'));
  console.log('  getSegmentCount:', onAction('getSegmentCount'));
  console.log('  getCurrentRecordingTime:', onAction('getCurrentRecordingTime'));
};
  
  return (
    <PluginCard plugin={plugin} isActive={isActive}>
      <div className="space-y-3">
        {/* Статус Electron */}
        {!isElectronAvailable && (
          <div className="text-[10px] text-warning bg-warning/10 p-2 rounded-lg">
            ⚠️ Режим браузера: файлы сохраняются в память (чанки)
          </div>
        )}

        <button onClick={testActions} className="text-[8px] text-gray-500">
        🧪 Test
        </button>
        
        {/* Переключатель режимов */}
        <div className="flex gap-1 p-0.5 rounded-lg bg-base-300/50">
          <button
            onClick={() => handleModeChange('manual')}
            className={`flex-1 py-1.5 text-xs rounded-md transition-all duration-200 ${
              recordingMode === 'manual' 
                ? 'bg-primary text-primary-content shadow-sm' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            ✋ Ручной режим
          </button>
          <button
            onClick={() => handleModeChange('auto')}
            className={`flex-1 py-1.5 text-xs rounded-md transition-all duration-200 ${
              recordingMode === 'auto' 
                ? 'bg-primary text-primary-content shadow-sm' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🔁 Авторежим
          </button>
        </div>
        
        {/* Статус записи */}
       <RecordingStatus 
        isRecording={isRecording}
        isAutoRecording={isAutoRecording}
        onAction={onAction}
        />
        
        {/* Прогресс автозаписи (только для авторежима) */}
       <AutoRecordingProgress 
        isRecording={isRecording}
        isAutoRecording={isAutoRecording}
        intervalSeconds={intervalSeconds}
        onAction={onAction}
        />
        
        {/* Кнопки управления */}
        {recordingMode === 'manual' ? (
          <ManualControls 
            isRecording={isRecording}
            isMicActive={isMicActive}
            onStart={handleStartManual}
            onStop={handleStopManual}
          />
        ) : (
          <AutoControls 
            isRecording={isRecording}
            isMicActive={isMicActive}
          />
        )}
        
        {/* Настройки */}
       <RecorderSettings
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
        recordingMode={recordingMode}
        intervalSeconds={intervalSeconds}
        onIntervalChange={handleIntervalChange}
        isRecording={isRecording}
        format={format}
        onFormatChange={handleFormatChange}
        availableFormats={availableFormats}
        isElectronAvailable={isElectronAvailable}
        maxChunkSize={maxChunkSize}
        onMaxChunkSizeChange={handleMaxChunkSizeChange}
        chunksCount={chunksCount}
        chunksSize={chunksSize}
        onClearChunks={handleClearChunks}
        availableSpace={1024} // 1 GB лимит для примера, можно получить из Electron
        />
        
        {/* Статистика и управление файлами/чанками */}
        <RecorderStats
          totalRecordings={totalRecordings}
          savedFiles={savedFiles}
          isElectronAvailable={isElectronAvailable}
          pluginVersion={plugin.version}
          isMicActive={isMicActive}
          chunksCount={chunksCount}
          chunksSize={chunksSize}
          onClearChunks={handleClearChunks}
        />
      </div>
    </PluginCard>
  );
};

export default React.memo(RecorderWidget);