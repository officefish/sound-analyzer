import React from 'react';
import { DetectionMode } from './AutoModeToggle';

interface StatusPanelProps {
  isCollecting: boolean;
  isAnalyzing: boolean;
  detectionMode: DetectionMode;
  samplesCollected: number;
  neededSamples: number;
  onStart: () => void;
  onStop: () => void;
  canStartManual: boolean;
  canStop: boolean;
}

const PluginProccessStatus: React.FC<StatusPanelProps> = ({
  isCollecting,
  isAnalyzing,
  detectionMode,
  samplesCollected,
  neededSamples,
  onStart,
  onStop,
  canStartManual,
  canStop
}) => {
  return (
    <div className="flex items-center justify-between">
      {/* Левая часть - индикатор статуса */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isCollecting ? 'bg-green-500 animate-pulse' : isAnalyzing ? 'bg-blue-500' : 'bg-gray-500'}`} />
        <span className="text-xs text-gray-400">
          {detectionMode === 'auto' ? (
            isAnalyzing ? '🔁 Автоанализ активен' : '⏸ Ожидание микрофона'
          ) : (
            isCollecting ? `📊 Сбор данных... ${samplesCollected}/${neededSamples}` : '⏹ Детекция остановлена'
          )}
        </span>
      </div>
      
      {/* Правая часть - кнопки управления (только для ручного режима) */}
      {detectionMode === 'manual' && (
        <div className="flex gap-2">
          <button
            onClick={onStart}
            disabled={!canStartManual}
            className="text-[10px] bg-success/20 hover:bg-success/30 text-success px-2 py-1 rounded transition-colors disabled:opacity-50"
          >
            ▶ Старт
          </button>
          <button
            onClick={onStop}
            disabled={!canStop}
            className="text-[10px] bg-error/20 hover:bg-error/30 text-error px-2 py-1 rounded transition-colors disabled:opacity-50"
          >
            ⏹ Стоп
          </button>
        </div>
      )}
    </div>
  );
};

export default PluginProccessStatus;