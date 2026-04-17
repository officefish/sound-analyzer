// src/plugins/microphone2/widgets/DetectorFFTWidget.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { IPlugin } from '../../../../../types/plugins';
import PluginCard from '../../../../../components/ui/PluginCard';
import TickStatus from '../components/TickStatus';
import { TickState } from '../DetectorFFTPlugin';
import DetectorFFTHelp from '../../../../../components/popup/DetectorFFTHelp';

type StrictnessLevel = 'sensitive' | 'normal' | 'rough';
type DetectionMode = 'auto' | 'manual';

const strictnessLabels = {
  sensitive: 'Чувствительный (3/3)',
  normal: 'Средний (2/3)',
  rough: 'Грубый (1/3)',
};

const samplesCountOptions = [3, 5, 7, 10];

interface DetectorFFTWidgetProps {
  plugin: IPlugin;
  context?: any;
  onAction: (action: string, data?: any) => any;
  isActive: boolean;
}

const DetectorFFTWidget: React.FC<DetectorFFTWidgetProps> = ({
  plugin,
  context,
  onAction,
  isActive,
}) => {
  // Состояния
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [samplesCollected, setSamplesCollected] = useState(0);
  const [neededSamples, setNeededSamples] = useState(3);
  const [detectionCount, setDetectionCount] = useState(0);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [successfulDetections, setSuccessfulDetections] = useState(0);
  const [currentAnalysisProgress, setCurrentAnalysisProgress] = useState(0);
  const [currentSample, setCurrentSample] = useState<any>(null);
  const [lastResult
    //, setLastResult
] = useState<any>(null);
  const [tickStates, setTickStates] = useState<TickState[]>([]);
  const [currentTickIndex, setCurrentTickIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [showHelpModal, setShowHelpModal] = useState(false);

  
  // Настройки детектора
  const [config, setConfig] = useState({
    centroidMin: 200,
    centroidMax: 800,
    fluxMin: 0,
    fluxMax: 1.5,
    rmsMin: 0.01,
    rmsMax: 1.0,
    intervalMs: 500,
    samplesCount: 3,
    strictness: 'normal' as StrictnessLevel,
  });

  // Загрузка статуса и настроек
  useEffect(() => {
    const updateStatus = () => {
        const status = onAction('getStatus');
        if (status) {
        setIsAnalyzing(status.isAnalyzing || false);
        setIsCollecting(status.isCollecting || false);
        setSamplesCollected(status.samplesCollected || 0);
        setNeededSamples(status.neededSamples || 3);
        setDetectionCount(status.detectionCount || 0);
        setTotalAnalyses(status.totalAnalyses || 0);
        setSuccessfulDetections(status.successfulDetections || 0);
        setCurrentAnalysisProgress(status.currentAnalysisProgress || 0);
        
        // ✅ Приоритет: сначала смотрим на lastResult, потом на tickStates
        if (lastResult && lastResult.samples && lastResult.samples.length > 0) {
            // Используем lastResult для определения состояний тактов
            const newStates: TickState[] = lastResult.samples.map((sample: any) => {
            if (sample.isValid && lastResult.isDrone) return 'drone';
            if (sample.isValid) return 'passed';
            return 'pending';
            });
            setTickStates(newStates);
            setCurrentTickIndex(lastResult.samples.length);
        } else if (status.tickStates) {
            setTickStates(status.tickStates);
            setCurrentTickIndex(status.currentTickIndex || 0);
        }
        
        if (status.currentSample) {
            setCurrentSample(status.currentSample);
        }
        }
        
        const currentConfig = onAction('getConfig');
        if (currentConfig) {
        setConfig(currentConfig);
        setDetectionMode(currentConfig.detectionMode || 'auto');
        setNeededSamples(currentConfig.samplesCount || 3);
        }
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 500);
    return () => clearInterval(interval);
    }, [isActive, onAction, lastResult]); // ✅ Добавляем lastResult в зависимости

  useEffect(() => {
    if (lastResult && lastResult.samples) {
        const newStates: TickState[] = lastResult.samples.map((sample: any) => {
        if (sample.isValid && lastResult.isDrone) return 'drone';
        if (sample.isValid) return 'passed';
        return 'pending';
        });
        setTickStates(newStates);
        setCurrentTickIndex(lastResult.samples.length);
    }
    }, [lastResult]);

  // Проверка параметров текущего сэмпла
  const getParamsStatus = useCallback(() => {
    if (!currentSample) return null;
    return {
      centroidOk: currentSample.centroid >= config.centroidMin && currentSample.centroid <= config.centroidMax,
      fluxOk: currentSample.flux >= config.fluxMin && currentSample.flux <= config.fluxMax,
      rmsOk: currentSample.rms >= config.rmsMin && currentSample.rms <= config.rmsMax,
    };
  }, [currentSample, config]);

  const paramsStatus = getParamsStatus();
  const isMicActive = context?.isRecording || false;
  //const progressPercent = neededSamples > 0 ? (samplesCollected / neededSamples) * 100 : 0;
  const successRate = totalAnalyses > 0 ? (successfulDetections / totalAnalyses) * 100 : 0;

  // Обработчики
  const handleStart = () => {
    onAction('startDetection');
  };

  const handleStop = () => {
    onAction('stopDetection');
  };

  const handleModeChange = (mode: DetectionMode) => {
    setDetectionMode(mode);
    onAction('setDetectionMode', mode);
  };

  const handleConfigChange = (key: string, value: number | string) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onAction('setConfig', { [key]: value });
  };

  // Кнопки управления
  const canStartManual = detectionMode === 'manual' && !isCollecting && isMicActive;
  const canStop = isCollecting;
  //const isAutoWaiting = detectionMode === 'auto' && !isAnalyzing && isMicActive;
  //const isAutoActive = detectionMode === 'auto' && isAnalyzing;

  return (
    <PluginCard plugin={plugin} isActive={isActive}>
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

        {/* Статус */}
        <div className="flex items-center justify-between">
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
        {neededSamples > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] text-gray-500">
              <span>Статус тактов:</span>
              <span>{samplesCollected}/{neededSamples}</span>
            </div>
            <TickStatus 
              total={neededSamples}
              completed={samplesCollected}
              states={tickStates}
              currentTick={currentTickIndex}
              isActive={isCollecting}
            />
           <div className="flex justify-center gap-3 text-[8px] text-gray-500">
            <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-primary" />
                <span>🚁 Дрон</span>
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
        {isCollecting && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Прогресс сбора:</span>
              <span className="text-primary font-mono">{Math.round(currentAnalysisProgress)}%</span>
            </div>
            <div className="relative h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${currentAnalysisProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Статистика анализов */}
        <div className="bg-base-300/30 rounded-lg p-2">
          <div className="text-[9px] text-gray-500 text-center mb-1">📊 Статистика анализов</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{totalAnalyses}</div>
              <div className="text-[8px] text-gray-500">Всего</div>
            </div>
            <div>
              <div className="text-lg font-bold text-warning">{detectionCount}</div>
              <div className="text-[8px] text-gray-500">Обнаружений</div>
            </div>
            <div>
              <div className="text-lg font-bold text-success">{successRate.toFixed(0)}%</div>
              <div className="text-[8px] text-gray-500">Успешность</div>
            </div>
          </div>
        </div>

        {/* Текущий сэмпл */}
        {currentSample && isCollecting && (
          <div className="bg-base-300/30 rounded-lg p-2 text-[10px]">
            <div className="flex justify-between text-gray-500 mb-1">
              <span>Текущий сэмпл</span>
              <span>{new Date(currentSample.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Центр:</span>
                  {paramsStatus && (
                    <span className={paramsStatus.centroidOk ? 'text-green-400' : 'text-red-400'}>
                      {paramsStatus.centroidOk ? '✓' : '✗'}
                    </span>
                  )}
                </div>
                <span className="text-primary font-mono">{Math.round(currentSample.centroid)} Гц</span>
                <div className="text-[8px] text-gray-500">
                  {config.centroidMin}-{config.centroidMax} Гц
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Поток:</span>
                  {paramsStatus && (
                    <span className={paramsStatus.fluxOk ? 'text-green-400' : 'text-red-400'}>
                      {paramsStatus.fluxOk ? '✓' : '✗'}
                    </span>
                  )}
                </div>
                <span className="text-primary font-mono">{currentSample.flux.toFixed(3)}</span>
                <div className="text-[8px] text-gray-500">
                  {config.fluxMin}-{config.fluxMax}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">RMS:</span>
                  {paramsStatus && (
                    <span className={paramsStatus.rmsOk ? 'text-green-400' : 'text-red-400'}>
                      {paramsStatus.rmsOk ? '✓' : '✗'}
                    </span>
                  )}
                </div>
                <span className="text-primary font-mono">{currentSample.rms.toFixed(4)}</span>
                <div className="text-[8px] text-gray-500">
                  {config.rmsMin}-{config.rmsMax}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Результат детекции */}
        {lastResult && (
          <div className={`p-3 rounded-xl ${lastResult.isDrone ? 'bg-red-500/20 border border-red-500/30' : 'bg-green-500/10 border border-green-500/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{lastResult.isDrone ? '🚁' : '✅'}</span>
                <span className={`text-sm font-bold ${lastResult.isDrone ? 'text-red-400' : 'text-green-400'}`}>
                  {lastResult.isDrone ? 'ДРОН ОБНАРУЖЕН!' : 'Нет дрона'}
                </span>
              </div>
              <div className="text-[10px] text-gray-500">
                {lastResult.timestamp ? new Date(lastResult.timestamp).toLocaleTimeString() : ''}
              </div>
            </div>
            
            {lastResult.detectionMethod && (
              <div className="text-[10px] text-gray-400 mt-1">
                {lastResult.detectionMethod}
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
              <div>
                <span className="text-gray-500">Валидных:</span>
                <span className="text-primary font-mono ml-1">{lastResult.validSamples}/{lastResult.samplesCount}</span>
              </div>
              <div>
                <span className="text-gray-500">Строгость:</span>
                <span className="font-mono ml-1">
                  {strictnessLabels[lastResult.strictness as StrictnessLevel]}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Обнаружений:</span>
                <span className="text-primary font-mono ml-1">{detectionCount}</span>
              </div>
            </div>
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
            {/* Спектральный центр */}
            <div>
              <label className="text-gray-400 text-xs">🎯 Спектральный центр (Гц)</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  value={config.centroidMin}
                  onChange={(e) => handleConfigChange('centroidMin', parseInt(e.target.value))}
                  className="flex-1 bg-base-300 rounded px-2 py-1 text-xs text-right"
                  placeholder="мин"
                />
                <input
                  type="number"
                  value={config.centroidMax}
                  onChange={(e) => handleConfigChange('centroidMax', parseInt(e.target.value))}
                  className="flex-1 bg-base-300 rounded px-2 py-1 text-xs text-right"
                  placeholder="макс"
                />
              </div>
            </div>

            {/* Спектральный поток */}
            <div>
              <label className="text-gray-400 text-xs">🌊 Спектральный поток</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  step="0.1"
                  value={config.fluxMin}
                  onChange={(e) => handleConfigChange('fluxMin', parseFloat(e.target.value))}
                  className="flex-1 bg-base-300 rounded px-2 py-1 text-xs text-right"
                  placeholder="мин"
                />
                <input
                  type="number"
                  step="0.1"
                  value={config.fluxMax}
                  onChange={(e) => handleConfigChange('fluxMax', parseFloat(e.target.value))}
                  className="flex-1 bg-base-300 rounded px-2 py-1 text-xs text-right"
                  placeholder="макс"
                />
              </div>
            </div>

            {/* Громкость */}
            <div>
              <label className="text-gray-400 text-xs">🔊 Громкость (RMS)</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  step="0.001"
                  value={config.rmsMin}
                  onChange={(e) => handleConfigChange('rmsMin', parseFloat(e.target.value))}
                  className="flex-1 bg-base-300 rounded px-2 py-1 text-xs text-right"
                  placeholder="мин"
                />
                <input
                  type="number"
                  step="0.001"
                  value={config.rmsMax}
                  onChange={(e) => handleConfigChange('rmsMax', parseFloat(e.target.value))}
                  className="flex-1 bg-base-300 rounded px-2 py-1 text-xs text-right"
                  placeholder="макс"
                />
              </div>
            </div>

            {/* Интервал */}
            <div>
              <label className="text-gray-400 text-xs">⏱ Интервал (мс)</label>
              <input
                type="number"
                step="50"
                value={config.intervalMs}
                onChange={(e) => handleConfigChange('intervalMs', parseInt(e.target.value))}
                className="w-full bg-base-300 rounded px-2 py-1 text-xs text-right"
              />
            </div>

            {/* Расширенные настройки */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full text-[9px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showAdvanced ? '▲ Скрыть расширенные' : '▼ Расширенные настройки'}
            </button>

            {showAdvanced && (
              <div className="space-y-2 pt-1">
                <div>
                  <label className="text-gray-400 text-xs">Количество тактов:</label>
                  <div className="flex gap-1 mt-1">
                    {samplesCountOptions.map(count => (
                      <button
                        key={count}
                        onClick={() => handleConfigChange('samplesCount', count)}
                        className={`flex-1 py-1 text-[10px] rounded transition-colors ${
                          config.samplesCount === count
                            ? 'bg-primary text-primary-content'
                            : 'bg-base-300 text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-xs">Уровень строгости:</label>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {(['sensitive', 'normal', 'rough'] as StrictnessLevel[]).map(level => (
                      <button
                        key={level}
                        onClick={() => handleConfigChange('strictness', level)}
                        className={`py-1 text-[10px] rounded transition-colors ${
                          config.strictness === level
                            ? 'bg-primary text-primary-content'
                            : 'bg-base-300 text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {level === 'sensitive' && '🔴 Чувств.'}
                        {level === 'normal' && '🟡 Средний'}
                        {level === 'rough' && '🟢 Грубый'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[9px] text-center text-gray-500">
                  💡 Чувствительный: все 3 параметра должны совпадать<br />
                  💡 Средний: 2 из 3 параметров должны совпадать<br />
                  💡 Грубый: 1 из 3 параметров должен совпадать
                </div>
              </div>
            )}

            <div className="text-[9px] text-center text-gray-500">
              🎯 Дрон даёт спектральный центр 200-800 Гц, низкий поток и стабильную громкость
            </div>
          </div>
        )}

        <div className="text-[10px] text-gray-500 flex justify-between">
          <span>{isMicActive ? '🎤 Микрофон активен' : '⏸ Микрофон выключен'}</span>
          <div>
                <button
                    onClick={() => setShowHelpModal(true)}
                    className="text-xs text-info hover:text-info/80 transition-colors"
                    title="Что означают параметры?"
                >
                    ❓ Справка
                </button>
                <span className='ml-4'>🎛️ v{plugin.version}</span>
            </div>
        </div>
      </div>
      <DetectorFFTHelp 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)} 
      />
    </PluginCard>
  );
};

export default React.memo(DetectorFFTWidget);