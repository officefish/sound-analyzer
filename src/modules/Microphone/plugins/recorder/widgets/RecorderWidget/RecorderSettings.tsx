// src/plugins/microphone2/widgets/RecorderWidget/RecorderSettings.tsx

import React, { useState, useEffect } from 'react';
import ChunkManager from './ChunkManager';

interface RecorderSettingsProps {
  showSettings: boolean;
  onToggleSettings: () => void;
  recordingMode: 'manual' | 'auto';
  intervalSeconds: number;
  onIntervalChange: (seconds: number) => void;
  isRecording: boolean;
  format: string;
  onFormatChange: (format: string) => void;
  availableFormats: Array<{ format: string; label: string; available: boolean }>;
  isElectronAvailable: boolean;
  maxChunkSize: number;
  onMaxChunkSizeChange: (mb: number) => void;
  chunksCount: number;
  chunksSize: number;
  onClearChunks: () => void;
  availableSpace?: number; // Доступное место в MB (для Electron)
}

const PRESET_INTERVALS = [
  { label: '1 сек', value: 1, group: 'fast' },
  { label: '5 сек', value: 5, group: 'fast' },
  { label: '10 сек', value: 10, group: 'fast' },
  { label: '20 сек', value: 20, group: 'fast' },
  { label: '30 сек', value: 30, group: 'fast' },
  { label: '1 мин', value: 60, group: 'medium' },
  { label: '5 мин', value: 300, group: 'medium' },
  { label: '10 мин', value: 600, group: 'medium' },
  { label: '20 мин', value: 1200, group: 'medium' },
];

const formatInterval = (seconds: number): string => {
  if (seconds < 60) return `${seconds} сек`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins} мин`;
  return `${mins} мин ${secs} сек`;
};

const RecorderSettings: React.FC<RecorderSettingsProps> = ({
  showSettings,
  onToggleSettings,
  recordingMode,
  intervalSeconds,
  onIntervalChange,
  isRecording,
  format,
  onFormatChange,
  availableFormats,
  isElectronAvailable,
  maxChunkSize,
  onMaxChunkSizeChange,
  chunksCount,
  chunksSize,
  onClearChunks,
}) => {
  const [intervalInput, setIntervalInput] = useState(intervalSeconds.toString());
  
  useEffect(() => {
    setIntervalInput(intervalSeconds.toString());
  }, [intervalSeconds]);
  
  const handleIntervalInputChange = (value: string) => {
    setIntervalInput(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 1200) {
      onIntervalChange(numValue);
    }
  };
  
  const handleIntervalBlur = () => {
    let numValue = parseInt(intervalInput);
    if (isNaN(numValue)) numValue = intervalSeconds;
    numValue = Math.max(1, Math.min(1200, numValue));
    setIntervalInput(numValue.toString());
    onIntervalChange(numValue);
  };
  
  const handlePresetClick = (value: number) => {
    setIntervalInput(value.toString());
    onIntervalChange(value);
  };
  
  const isAutoMode = recordingMode === 'auto';
  
  // Группируем пресеты
  const fastIntervals = PRESET_INTERVALS.filter(i => i.group === 'fast');
  const mediumIntervals = PRESET_INTERVALS.filter(i => i.group === 'medium');
  
  return (
    <>
      <button
        onClick={onToggleSettings}
        className="w-full text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1 pt-1"
      >
        <span>{showSettings ? '▲' : '▼'}</span>
        <span>{isAutoMode ? 'Настройки записи' : 'Управление данными'}</span>
      </button>
      
      {showSettings && (
        <div className="space-y-3 p-3 rounded-lg bg-base-300/30">

          {/* Интервал записи — только для авторежима */}
          {isAutoMode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">📀 Интервал записи:</span>
                <span className="text-primary font-mono">
                  {formatInterval(intervalSeconds)}
                </span>
              </div>
              
              <input
                type="range"
                min={1}
                max={1200}
                step={1}
                value={intervalSeconds}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setIntervalInput(val.toString());
                  onIntervalChange(val);
                }}
                className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-3 
                  [&::-webkit-slider-thumb]:h-3 
                  [&::-webkit-slider-thumb]:rounded-full 
                  [&::-webkit-slider-thumb]:bg-primary 
                  [&::-webkit-slider-thumb]:cursor-pointer"
              />
              
              {/* Быстрые интервалы */}
              <div>
                <div className="text-[9px] text-gray-500 mb-1">Быстрые интервалы:</div>
                <div className="flex flex-wrap gap-1">
                  {fastIntervals.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handlePresetClick(preset.value)}
                      className={`
                        px-1.5 py-0.5 rounded text-[9px] transition-all duration-150
                        ${intervalSeconds === preset.value
                          ? 'bg-primary/30 text-primary font-bold'
                          : 'bg-base-300 text-gray-400 hover:bg-base-300/70 hover:text-gray-300'
                        }
                      `}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Длинные интервалы */}
              <div>
                <div className="text-[9px] text-gray-500 mb-1">Длинные интервалы:</div>
                <div className="flex flex-wrap gap-1">
                  {mediumIntervals.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handlePresetClick(preset.value)}
                      className={`
                        px-1.5 py-0.5 rounded text-[9px] transition-all duration-150
                        ${intervalSeconds === preset.value
                          ? 'bg-primary/30 text-primary font-bold'
                          : 'bg-base-300 text-gray-400 hover:bg-base-300/70 hover:text-gray-300'
                        }
                      `}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-gray-400 text-[10px]">Точное значение:</span>
                <input
                  type="number"
                  min={1}
                  max={1200}
                  step={1}
                  value={intervalInput}
                  onChange={(e) => handleIntervalInputChange(e.target.value)}
                  onBlur={handleIntervalBlur}
                  className="w-24 px-2 py-1 text-xs bg-base-300 rounded-lg border border-base-300 focus:border-primary focus:outline-none text-center"
                />
                <span className="text-gray-400 text-[10px]">секунд</span>
              </div>
            </div>
          )}
          
          {/* Формат — для обоих режимов */}
          <div className={`flex items-center justify-between text-xs ${isAutoMode ? 'pt-1 border-t border-base-300' : ''}`}>
            <span className="text-gray-400">Формат:</span>
            <div className="flex gap-2">
              {availableFormats.map((fmt) => (
                <button
                  key={fmt.format}
                  onClick={() => onFormatChange(fmt.format)}
                  disabled={!fmt.available || isRecording}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                    !fmt.available 
                      ? 'bg-base-300 text-gray-500 cursor-not-allowed opacity-50'
                      : format === fmt.format 
                        ? 'bg-primary/30 text-primary' 
                        : 'bg-base-300 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {fmt.label}
                  {!fmt.available && ' 🔒'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Управление чанками/файлами — сворачиваемое */}
           <ChunkManager
            isElectronAvailable={isElectronAvailable}
            maxChunkSize={maxChunkSize}
            onMaxChunkSizeChange={onMaxChunkSizeChange}
            chunksCount={chunksCount}
            chunksSize={chunksSize}
            onClearChunks={onClearChunks}
            totalStorageLimit={500} // Максимальный лимит 500 MB
          />
        </div>
      )}
    </>
  );
};

export default React.memo(RecorderSettings);

// src/plugins/microphone2/widgets/RecorderWidget/RecorderSettings.tsx


// ..