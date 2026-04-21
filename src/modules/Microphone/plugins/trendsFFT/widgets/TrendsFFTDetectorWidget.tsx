// src/plugins/microphone2/widgets/TrendsFFTDetectorWidget.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { SOUND_STATES } from '../types';
import { IPlugin } from '../../../../../types/plugins';
import PluginCard from '../../../../../components/ui/PluginCard';
import { TickState } from '../TrendsFFTDetectorPlugin';

import PatternManager from '../components/PattternManager';

type DetectionMode = 'auto' | 'manual';

interface TrendsDetectorFFTWidgetProps {
  plugin: IPlugin;
  context?: any;
  onAction: (action: string, data?: any) => any;
  isActive: boolean;
}

const TrendsFFTDetectorWidget: React.FC<TrendsDetectorFFTWidgetProps> = ({
  plugin,
  context,
  onAction,
  isActive,
}) => {
  const [status, setStatus] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [tickStates, setTickStates] = useState<TickState[]>([]);
  const [currentTickIndex, setCurrentTickIndex] = useState(0);

  // В начале компонента добавьте:
  const [activeTab, setActiveTab] = useState<'detector' | 'patterns'>('detector');
  const [
    //customPatterns
    , 
    setCustomPatterns] = useState<Record<string, any>>(SOUND_STATES);

  // Загрузка статуса и настроек
  useEffect(() => {
    const updateStatus = () => {
      if (!isActive) return;
      
      const currentStatus = onAction('getStatus');
      if (currentStatus) {
        setStatus(currentStatus);
        setDetectionMode(currentStatus.detectionMode || 'auto');
        
        // Обновляем состояния тактов
        if (currentStatus.tickStates) {
          setTickStates(currentStatus.tickStates);
          setCurrentTickIndex(currentStatus.currentTickIndex || 0);
        }
      }
      
      const currentConfig = onAction('getConfig');
      if (currentConfig) {
        setConfig(currentConfig);
      }
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 200); // 200ms для более плавного обновления
    
    return () => clearInterval(interval);
  }, [isActive, onAction]);

  const handleModeChange = (mode: DetectionMode) => {
    setDetectionMode(mode);
    onAction('setDetectionMode', mode);
  };

  const handleStart = () => {
    onAction('startDetection');
  };

  const handleStop = () => {
    onAction('stopDetection');
  };

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onAction('setConfig', { [key]: value });
  };

  const isMicActive = context?.isRecording || false;
  const canStartManual = detectionMode === 'manual' && !status?.isCollecting && isMicActive;
  const canStop = status?.isCollecting;
  
  // const getProgressColor = () => {
  //   if (!status?.currentAnalysisProgress) return 'progress-primary';
  //   if (status.currentAnalysisProgress < 30) return 'progress-error';
  //   if (status.currentAnalysisProgress < 70) return 'progress-warning';
  //   return 'progress-success';
  // };

  // Обработчик изменения паттернов
  const handlePatternsChange = useCallback((patterns: Record<string, any>) => {
    setCustomPatterns(patterns);
    // Отправляем паттерны в плагин
    onAction('setCustomPatterns', patterns);
  }, [onAction]);

  return (
    <PluginCard plugin={plugin} isActive={isActive}>

      {/* // В верстку добавьте вкладки перед основным контентом: */}
      <div className="flex gap-2 mb-3 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('detector')}
          className={`px-3 py-1.5 text-xs transition-colors ${
          activeTab === 'detector' 
            ? 'text-primary border-b-2 border-primary' 
            : 'text-gray-500 hover:text-gray-300'
          }`}
            >📊 Детектор
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={`px-3 py-1.5 text-xs transition-colors ${
          activeTab === 'patterns' 
            ? 'text-primary border-b-2 border-primary' 
            : 'text-gray-500 hover:text-gray-300'
          }`}
          >🎨 Мои паттерны
        </button>
      </div>

    {/* Контент вкладок */}
    {activeTab === 'detector' ? (
      // Существующий контент детектора

      <div className="space-y-3">
        {/* Переключатель режимов */}
        <div className="flex gap-1 p-0.5 rounded-lg bg-base-300/50">
          <button
            onClick={() => handleModeChange('auto')}
            className={`flex-1 py-1.5 text-xs rounded-md transition-all duration-200 ${
              detectionMode === 'auto' 
                ? 'bg-primary text-primary-content shadow-sm' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🔁 Авторежим
          </button>
          <button
            onClick={() => handleModeChange('manual')}
            className={`flex-1 py-1.5 text-xs rounded-md transition-all duration-200 ${
              detectionMode === 'manual' 
                ? 'bg-primary text-primary-content shadow-sm' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            ✋ Ручной режим
          </button>
        </div>

        {/* Статус и управление */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status?.isCollecting ? 'bg-green-500 animate-pulse' : status?.isAnalyzing ? 'bg-blue-500' : 'bg-gray-500'}`} />
            <span className="text-xs text-gray-400">
              {detectionMode === 'auto' ? (
                status?.isAnalyzing ? '🔁 Автоанализ активен' : '⏸ Ожидание микрофона'
              ) : (
                status?.isCollecting ? `📊 Сбор данных... ${status.samplesCollected}/${status?.neededSamples || 100}` : '⏹ Детекция остановлена'
              )}
            </span>
          </div>
          
          {detectionMode === 'manual' && (
            <div className="flex gap-2">
              <button
                onClick={handleStart}
                disabled={!canStartManual}
                className="text-[10px] bg-success/20 hover:bg-success/30 text-success px-2 py-1 rounded transition-colors disabled:opacity-50"
              >
                ▶ Старт
              </button>
              <button
                onClick={handleStop}
                disabled={!canStop}
                className="text-[10px] bg-error/20 hover:bg-error/30 text-error px-2 py-1 rounded transition-colors disabled:opacity-50"
              >
                ⏹ Стоп
              </button>
            </div>
          )}
        </div>

        {/* Визуализация тактов */}
        {status?.neededSamples > 0 && tickStates.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] text-gray-500">
              <span>Статус тактов:</span>
              <span>{status.samplesCollected || currentTickIndex}/{status.neededSamples}</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {tickStates.map((state: TickState, idx: number) => {
                let bgColor = 'bg-base-300';
                let textColor = 'text-base-content';
                let content = `${idx + 1}`;
                
                if (state !== 'pending' && state !== 'passed') {
                  const stateInfo = SOUND_STATES[state as keyof typeof SOUND_STATES];
                  if (stateInfo) {
                    return (
                      <div
                        key={idx}
                        className="tooltip"
                        data-tip={`Такт ${idx + 1}: ${stateInfo.name}`}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: stateInfo.color + '40', color: stateInfo.color }}
                        >
                          {stateInfo.icon}
                        </div>
                      </div>
                    );
                  }
                }
                
                // Текущий обрабатываемый такт
                if (status?.isCollecting && idx === currentTickIndex) {
                  return (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs bg-primary/30 border border-primary/50 animate-pulse text-primary"
                    >
                      {content}
                    </div>
                  );
                }
                
                // Пройденные такты
                if (state === 'passed') {
                  return (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs bg-base-300 border-2 border-primary text-primary"
                    >
                      ✓
                    </div>
                  );
                }
                
                // Ожидающие такты
                return (
                  <div
                    key={idx}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${bgColor} ${textColor}`}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-3 text-[8px] text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary" />
                <span>🚁 Обнаружено</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-base-300 border-2 border-primary" />
                <span>Пройден</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary/30 border border-primary/50 animate-pulse" />
                <span>Текущий</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-base-300 border border-base-300" />
                <span>Ожидание</span>
              </div>
            </div>
          </div>
        )}

        {/* Прогресс текущего анализа */}
        {status?.isCollecting && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Прогресс сбора:</span>
              <span className="text-primary font-mono">{Math.round(status.currentAnalysisProgress || 0)}%</span>
            </div>
            <div className="relative h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${status.currentAnalysisProgress || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Статистика анализов */}
        <div className="bg-base-300/30 rounded-lg p-2">
          <div className="text-[9px] text-gray-500 text-center mb-1">📊 Статистика анализов</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{status?.totalAnalyses || 0}</div>
              <div className="text-[8px] text-gray-500">Всего</div>
            </div>
            <div>
              <div className="text-lg font-bold text-warning">{status?.detectionCount || 0}</div>
              <div className="text-[8px] text-gray-500">Обнаружений</div>
            </div>
            <div>
              <div className="text-lg font-bold text-success">
                {status?.totalAnalyses > 0 
                  ? Math.round(((status?.successfulDetections || 0) / (status?.totalAnalyses || 1)) * 100)
                  : 0}%
              </div>
              <div className="text-[8px] text-gray-500">Успешность</div>
            </div>
          </div>
        </div>

        {/* Результат детекции */}
        {status?.lastResult && (
          <div className={`p-3 rounded-xl ${status.lastResult.isDetected ? 'bg-red-500/20 border border-red-500/30' : 'bg-green-500/10 border border-green-500/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{status.lastResult.stateIcon}</span>
                <span className={`text-sm font-bold ${status.lastResult.isDetected ? 'text-red-400' : 'text-green-400'}`}>
                  {status.lastResult.stateName}
                </span>
              </div>
              <div className="text-[10px] text-gray-500">
                {status.lastResult.timestamp ? new Date(status.lastResult.timestamp).toLocaleTimeString() : ''}
              </div>
            </div>
            
            <div className="mt-2">
              <div className="flex justify-between text-[10px] mb-1">
                <span>Достоверность</span>
                <span className="font-bold">{status.lastResult.confidence?.toFixed(1)}%</span>
              </div>
              <div className="relative h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${status.lastResult.confidence || 0}%` }}
                />
              </div>
            </div>
            
            {status.lastResult.analysis && (
              <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                <div>
                  <span className="text-gray-500">Центр:</span>
                  <span className="text-primary font-mono ml-1">
                    {status.lastResult.analysis.averageCentroid?.toFixed(0)} Гц
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Поток:</span>
                  <span className="text-primary font-mono ml-1">
                    {status.lastResult.analysis.averageFlux?.toFixed(3)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Активность:</span>
                  <span className="text-primary font-mono ml-1">
                    {((status.lastResult.analysis.activityRatio || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Настройки */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1 pt-1"
        >
          <span>{showSettings ? '▲' : '▼'}</span>
          <span>Настройки детектора</span>
        </button>

        {showSettings && (
          <div className="space-y-3 p-2 rounded-lg bg-base-300/30">
            {/* Интервал */}
            <div>
              <label className="text-gray-400 text-xs">⏱ Интервал (мс)</label>
              <input
                type="number"
                step="10"
                value={config?.intervalMs || 30}
                onChange={(e) => handleConfigChange('intervalMs', parseInt(e.target.value))}
                className="w-full bg-base-300 rounded px-2 py-1 text-xs text-right"
              />
            </div>

            {/* Количество замеров */}
            <div>
              <label className="text-gray-400 text-xs">📊 Количество замеров</label>
              <input
                type="number"
                step="10"
                value={config?.measurementsCount || 100}
                onChange={(e) => handleConfigChange('measurementsCount', parseInt(e.target.value))}
                className="w-full bg-base-300 rounded px-2 py-1 text-xs text-right"
              />
            </div>
            
            {/* Длительность анализа */}
            <div className="text-[10px] text-center text-gray-500">
              ⏱ Длительность анализа: {((config?.intervalMs || 30) * (config?.measurementsCount || 100) / 1000).toFixed(1)} сек
            </div>

            <div className="text-[9px] text-center text-gray-500">
              💡 Дрон даёт спектральный центр 200-800 Гц, низкий поток и стабильную громкость
            </div>
          </div>
        )}

        {/* История */}
        {status?.detectionHistory && status.detectionHistory.length > 0 && (
          <>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1 pt-2"
            >
              <span>{showHistory ? '▲' : '▼'}</span>
              <span>История обнаружений ({status.detectionHistory.length})</span>
            </button>

            {showHistory && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {status.detectionHistory.map((result: any, idx: number) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-base-300/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{result.stateIcon}</span>
                      <div>
                        <div className="text-xs font-semibold">{result.stateName}</div>
                        <div className="text-[9px] text-gray-500">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold" style={{ color: result.stateColor }}>
                        {result.confidence?.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="text-[10px] text-gray-500 flex justify-between">
          <span>{isMicActive ? '🎤 Микрофон активен' : '⏸ Микрофон выключен'}</span>
          <span>🎛️ v{plugin.version}</span>
        </div>
      </div>

    ) : (
      <PatternManager 
          onPatternsChange={handlePatternsChange}
          existingPatterns={SOUND_STATES}
          onAction={onAction}
      />
    )}
  </PluginCard>
  );
};

export default React.memo(TrendsFFTDetectorWidget);
