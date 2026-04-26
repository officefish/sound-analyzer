// src/plugins/microphone2/widgets/TrendsFFTDetectorWidget.tsx

import React, { useState, useEffect, useCallback } from 'react';
import type { IPlugin } from '../../../../../types/plugins';
import PluginCard from '../../../../../components/ui/PluginCard';
import SoundTemplateList from '../components/SoundTemplateList';
import SoundTemplateEditor from '../components/SoundTemplateEditor';
import { usePatternTemplatesStore } from '../stores/patterns.store';
import { AudioAnalysisReport, AudioAnalysisReportGenerator } from '../reports/AnalyzerFFTReport';
import { SOUND_STATES } from '../types';

type DetectionMode = 'auto' | 'manual';
export type TickState = 'pending' | 'passed' | 'BIRDS' | 'PEOPLE' | 'WIND' | 'DRONE' | 'EXPLOSION' | 'TRAFFIC' | 'QUIET';

interface TrendsDetectorFFTWidgetProps {
  plugin: IPlugin;
  context?: any;
  onAction: (action: string, data?: any) => any;
  isActive: boolean;
}

// Функция для получения информации о состоянии
const getStateInfoFromStore = (stateKey: string) => {
  // Проверяем в системных состояниях
  if (SOUND_STATES[stateKey]) {
    return SOUND_STATES[stateKey];
  }
  
  // Проверяем в пользовательских шаблонах из store
  const templates = usePatternTemplatesStore.getState().templates;
  const userTemplate = templates.find(t => t.key === stateKey || t.name === stateKey);
  if (userTemplate) {
    return {
      name: userTemplate.name,
      icon: userTemplate.icon,
      color: userTemplate.color,
      description: userTemplate.description,
    };
  }
  
  return {
    name: stateKey,
    icon: '❓',
    color: '#888888',
    description: `Неизвестное состояние: ${stateKey}`,
  };
};

const TrendsFFTDetectorWidget: React.FC<TrendsDetectorFFTWidgetProps> = ({
  plugin,
  context,
  onAction,
  isActive,
}) => {
  // Переименовываем status в detectorStatus
  const [detectorStatus, setDetectorStatus] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [tickStates, setTickStates] = useState<TickState[]>([]);
  const [currentTickIndex, setCurrentTickIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'detector' | 'templates' | 'editor'>('detector');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [currentReport, setCurrentReport] = useState<AudioAnalysisReport | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const templates = usePatternTemplatesStore((state) => state.templates);
  const enabledCount = templates.filter(t => t.isEnabled).length;
  const totalCount = templates.length;

  // Загрузка статуса детектора
  useEffect(() => {
    const updateDetectorStatus = () => {
      if (!isActive) return;
      
      const currentStatus = onAction('getStatus');
      if (currentStatus) {
        setDetectorStatus(currentStatus);
        setDetectionMode(currentStatus.detectionMode || 'auto');
        
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
    
    updateDetectorStatus();
    const interval = setInterval(updateDetectorStatus, 200);
    
    return () => clearInterval(interval);
  }, [isActive, onAction]);

  // Загрузка отчета
  useEffect(() => {
    const loadReport = () => {
      const reportId = (detectorStatus?.lastResult as any)?.reportId;
      
      if (reportId && detectorStatus?.lastResult?.isDetected) {
        setIsLoadingReport(true);
        try {
          const report = onAction('getReport', reportId);
          if (report) {
            setCurrentReport(report);
          }
        } catch (error) {
          console.error('[Widget] Failed to load report:', error);
        } finally {
          setIsLoadingReport(false);
        }
      } else if (detectorStatus?.lastResult?.isDetected && !reportId && !currentReport) {
        // Генерируем отчет из результата
        setIsLoadingReport(true);
        try {
          const report = AudioAnalysisReportGenerator.generateFromDetectionResult(
            detectorStatus.lastResult,
            {
              intervalMs: config?.intervalMs || 30,
              measurementsCount: config?.measurementsCount || 100,
            },
            detectorStatus.lastResult.samples || []
          );
          setCurrentReport(report);
        } catch (error) {
          console.error('[Widget] Failed to generate report:', error);
        } finally {
          setIsLoadingReport(false);
        }
      }
    };
    
    loadReport();
  }, [detectorStatus?.lastResult, onAction, config, currentReport]);

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

  const handleExportReport = useCallback((format: 'txt' | 'json' | 'csv' = 'json') => {
    if (currentReport) {
      AudioAnalysisReportGenerator.saveReport(currentReport, format);
    }
  }, [currentReport]);

  const isMicActive = context?.isRecording || false;
  const canStartManual = detectionMode === 'manual' && !detectorStatus?.isCollecting && isMicActive;
  const canStop = detectorStatus?.isCollecting;

  // Функция для получения информации о состоянии
  const getStateInfo = useCallback((stateKey: string) => {
    return getStateInfoFromStore(stateKey);
  }, []);

  return (
    <PluginCard plugin={plugin} isActive={isActive}>
      {/* Вкладки */}
      <div className="flex gap-2 mb-3 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('detector')}
          className={`px-3 py-1.5 text-xs transition-colors ${
            activeTab === 'detector' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          📊 Детектор
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-3 py-1.5 text-xs transition-colors ${
            activeTab === 'templates' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          📋 Шаблоны ({enabledCount}/{totalCount})
        </button>
        <button
          onClick={() => {
            setSelectedTemplate(null);
            setActiveTab('editor');
          }}
          className={`px-3 py-1.5 text-xs transition-colors ${
            activeTab === 'editor' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          🎨 Редактор
        </button>
      </div>

      {/* Контент вкладок */}
      {activeTab === 'detector' ? (
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
              <div className={`w-2 h-2 rounded-full ${
                detectorStatus?.isCollecting 
                  ? 'bg-green-500 animate-pulse' 
                  : detectorStatus?.isAnalyzing 
                    ? 'bg-blue-500' 
                    : 'bg-gray-500'
              }`} />
              <span className="text-xs text-gray-400">
                {detectionMode === 'auto' ? (
                  detectorStatus?.isAnalyzing ? '🔁 Автоанализ активен' : '⏸ Ожидание микрофона'
                ) : (
                  detectorStatus?.isCollecting 
                    ? `📊 Сбор данных... ${detectorStatus.samplesCollected}/${detectorStatus?.neededSamples || 100}` 
                    : '⏹ Детекция остановлена'
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
          {detectorStatus?.neededSamples > 0 && tickStates.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] text-gray-500">
                <span>Статус тактов:</span>
                <span>{detectorStatus.samplesCollected || currentTickIndex}/{detectorStatus.neededSamples}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {tickStates.map((state: TickState, idx: number) => {
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
                  
                  if (detectorStatus?.isCollecting && idx === currentTickIndex) {
                    return (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs bg-primary/30 border border-primary/50 animate-pulse text-primary"
                      >
                        {content}
                      </div>
                    );
                  }
                  
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
                  
                  return (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs bg-base-300 text-base-content"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-3 text-[8px] text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span>Обнаружено</span>
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
                  <div className="w-3 h-3 rounded bg-base-300" />
                  <span>Ожидание</span>
                </div>
              </div>
            </div>
          )}

          {/* Прогресс текущего анализа */}
          {detectorStatus?.isCollecting && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Прогресс сбора:</span>
                <span className="text-primary font-mono">{Math.round(detectorStatus.currentAnalysisProgress || 0)}%</span>
              </div>
              <div className="relative h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${detectorStatus.currentAnalysisProgress || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Статистика анализов */}
          <div className="bg-base-300/30 rounded-lg p-2">
            <div className="text-[9px] text-gray-500 text-center mb-1">📊 Статистика анализов</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-primary">{detectorStatus?.totalAnalyses || 0}</div>
                <div className="text-[8px] text-gray-500">Всего</div>
              </div>
              <div>
                <div className="text-lg font-bold text-warning">{detectorStatus?.detectionCount || 0}</div>
                <div className="text-[8px] text-gray-500">Обнаружений</div>
              </div>
              <div>
                <div className="text-lg font-bold text-success">
                  {detectorStatus?.totalAnalyses > 0 
                    ? Math.round(((detectorStatus?.successfulDetections || 0) / (detectorStatus?.totalAnalyses || 1)) * 100)
                    : 0}%
                </div>
                <div className="text-[8px] text-gray-500">Успешность</div>
              </div>
            </div>
          </div>

          {/* Результат детекции */}
          {detectorStatus?.lastResult && (
            <div className={`p-3 rounded-xl ${
              detectorStatus.lastResult.isDetected 
                ? 'bg-red-500/20 border border-red-500/30' 
                : 'bg-green-500/10 border border-green-500/20'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {getStateInfo(detectorStatus.lastResult.state).icon}
                  </span>
                  <span className={`text-sm font-bold ${
                    detectorStatus.lastResult.isDetected ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {getStateInfo(detectorStatus.lastResult.state).name}
                  </span>
                  {detectorStatus.lastResult.confidence && (
                    <span className="text-[10px] bg-primary/20 px-1.5 py-0.5 rounded">
                      {detectorStatus.lastResult.confidence.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500">
                  {detectorStatus.lastResult.timestamp ? new Date(detectorStatus.lastResult.timestamp).toLocaleTimeString() : ''}
                </div>
              </div>
              
              <div className="mt-2">
                <div className="flex justify-between text-[10px] mb-1">
                  <span>Достоверность</span>
                  <span className="font-bold">{detectorStatus.lastResult.confidence?.toFixed(1)}%</span>
                </div>
                <div className="relative h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${detectorStatus.lastResult.confidence || 0}%` }}
                  />
                </div>
              </div>
              
              {detectorStatus.lastResult.analysis && (
                <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                  <div>
                    <span className="text-gray-500">Центр:</span>
                    <span className="text-primary font-mono ml-1">
                      {detectorStatus.lastResult.analysis.averageCentroid?.toFixed(0)} Гц
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Поток:</span>
                    <span className="text-primary font-mono ml-1">
                      {detectorStatus.lastResult.analysis.averageFlux?.toFixed(3)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Активность:</span>
                    <span className="text-primary font-mono ml-1">
                      {((detectorStatus.lastResult.analysis.activityRatio || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
              
              {/* Кнопка отчета */}
              {(currentReport || isLoadingReport) && detectorStatus.lastResult.isDetected && (
                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => setShowFullReport(!showFullReport)}
                    className="w-full text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <span>{showFullReport ? '▲' : '▼'}</span>
                    <span>
                      {isLoadingReport 
                        ? '⏳ Загрузка отчета...' 
                        : showFullReport 
                          ? 'Скрыть детальный отчет' 
                          : 'Показать детальный отчет'}
                    </span>
                  </button>
                  
                  {showFullReport && currentReport && !isLoadingReport && (
                    <div className="mt-2 p-3 bg-base-300/30 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-semibold text-gray-400">📊 Детальный отчет</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleExportReport('txt')}
                            className="text-[9px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded"
                          >
                            TXT
                          </button>
                          <button
                            onClick={() => handleExportReport('json')}
                            className="text-[9px] bg-green-500/20 hover:bg-green-500/30 text-green-400 px-1.5 py-0.5 rounded"
                          >
                            JSON
                          </button>
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-400 space-y-1">
                        <div>ID: {currentReport.reportId}</div>
                        <div>Фреймов: {currentReport.analysisConfig.totalFrames}</div>
                        <div>Активность: {(currentReport.temporalPatterns.activityRatio * 100).toFixed(1)}%</div>
                        <div>Центр: {currentReport.rawData.centroid.min.toFixed(0)}-{currentReport.rawData.centroid.max.toFixed(0)} Гц</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* История обнаружений */}
          {detectorStatus?.detectionHistory && detectorStatus.detectionHistory.length > 0 && (
            <>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1 pt-2"
              >
                <span>{showHistory ? '▲' : '▼'}</span>
                <span>История обнаружений ({detectorStatus.detectionHistory.length})</span>
              </button>

              {showHistory && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detectorStatus.detectionHistory.map((result: any, idx: number) => {
                    const stateInfo = getStateInfo(result.state);
                    return (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-base-300/30"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{stateInfo.icon}</span>
                          <div>
                            <div className="text-xs font-semibold">{stateInfo.name}</div>
                            <div className="text-[9px] text-gray-500">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold" style={{ color: stateInfo.color }}>
                            {result.confidence?.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
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
              <div className="text-[10px] text-center text-gray-500">
                ⏱ Длительность анализа: {((config?.intervalMs || 30) * (config?.measurementsCount || 100) / 1000).toFixed(1)} сек
              </div>
              <div className="text-[9px] text-center text-gray-500">
                💡 Дрон даёт спектральный центр 200-800 Гц, низкий поток и стабильную громкость
              </div>
            </div>
          )}

          <div className="text-[10px] text-gray-500 flex justify-between">
            <span>{isMicActive ? '🎤 Микрофон активен' : '⏸ Микрофон выключен'}</span>
            <span>🎛️ v{plugin.version}</span>
          </div>
        </div>
      ) : activeTab === 'templates' ? (
        <SoundTemplateList 
          onTemplateSelect={(template) => {
            setSelectedTemplate(template);
            setActiveTab('editor');
          }}
        />
      ) : (
        <SoundTemplateEditor 
          template={selectedTemplate}
          onSave={() => {
            setActiveTab('templates');
            setSelectedTemplate(null);
          }}
          onCancel={() => {
            setActiveTab('templates');
            setSelectedTemplate(null);
          }}
          onDelete={() => {
            setActiveTab('templates');
            setSelectedTemplate(null);
          }}
        />
      )}
    </PluginCard>
  );
};

export default React.memo(TrendsFFTDetectorWidget);