// src/plugins/microphone2/widgets/TrendsFFTDetectorWidget.tsx

import React, { useEffect, useState } from 'react';
import { TrendsFFTDetectorPlugin } from '../TrendsFFTDetectorPlugin';
import { SOUND_STATES } from '../types';

interface AnalysisHistory {
  state: string;
  stateName: string;
  stateIcon: string;
  confidence: number;
  timestamp: number;
}

const TrendsFFTDetectorWidget: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'history' | 'settings'>('analysis');
  
  useEffect(() => {
    // Загружаем конфиг
    const loadConfig = () => {
      const savedConfig = localStorage.getItem('trends-fft-detector-config');
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          setConfig(parsed);
        } catch (e) {
          console.error('Failed to load config:', e);
        }
      } else {
        setConfig({
          intervalMs: 30,
          measurementsCount: 100,
          strictness: 'normal',
        });
      }
    };
    
    loadConfig();
    
    // Обновляем статус каждые 100мс
    const interval = setInterval(() => {
      if (TrendsFFTDetectorPlugin.enabled) {
        const newStatus = TrendsFFTDetectorPlugin.getStatus();
        setStatus(newStatus);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleStartDetection = () => {
    TrendsFFTDetectorPlugin.startDetection();
  };
  
  const handleStopDetection = () => {
    TrendsFFTDetectorPlugin.stopDetection();
  };
  
  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    TrendsFFTDetectorPlugin.setConfig(newConfig);
    localStorage.setItem('trends-fft-detector-config', JSON.stringify(newConfig));
  };
  
  const getProgressColor = () => {
    if (!status?.currentAnalysisProgress) return 'progress-primary';
    if (status.currentAnalysisProgress < 30) return 'progress-error';
    if (status.currentAnalysisProgress < 70) return 'progress-warning';
    return 'progress-success';
  };
  
  if (!TrendsFFTDetectorPlugin.enabled) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <div className="text-4xl mb-2">📈</div>
          <h2 className="card-title">Trends FFT Детектор</h2>
          <p className="text-base-content/70">Плагин отключён</p>
          <div className="card-actions justify-end mt-4">
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => TrendsFFTDetectorPlugin.enabled = true}
            >
              Включить
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Заголовок с кнопками управления */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📈</div>
              <div>
                <h2 className="card-title text-lg">Trends FFT Детектор</h2>
                <p className="text-xs text-base-content/70">
                  Анализ звука с учётом временных трендов и паттернов
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!status?.isCollecting ? (
                <button 
                  className="btn btn-success btn-sm"
                  onClick={handleStartDetection}
                  disabled={!status?.isAnalyzing}
                >
                  ▶ Старт
                </button>
              ) : (
                <button 
                  className="btn btn-error btn-sm"
                  onClick={handleStopDetection}
                >
                  ⏹ Стоп
                </button>
              )}
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? '▲' : '▼'}
              </button>
            </div>
          </div>
          
          {/* Статус анализа */}
          {status?.isAnalyzing && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Анализ звука</span>
                <span>{status.isCollecting ? 'Сбор данных...' : 'Ожидание'}</span>
              </div>
              <progress 
                className={`progress ${getProgressColor()} w-full h-2`} 
                value={status.currentAnalysisProgress || 0} 
                max="100"
              />
              <div className="flex justify-between text-xs mt-1 text-base-content/60">
                <span>Интервал: {config?.intervalMs || 30} мс</span>
                <span>Замеров: {status.samplesCollected || 0}/{status.neededSamples || 100}</span>
                <span>Режим: {status.detectionMode === 'auto' ? 'Авто' : 'Ручной'}</span>
              </div>
            </div>
          )}
          
          {/* Визуализация тиков */}
          {status?.tickStates && status.tickStates.length > 0 && (
            <div className="mt-3">
              <div className="flex gap-1 flex-wrap">
                {status.tickStates.map((state: string, idx: number) => {
                  let bgColor = 'bg-base-300';
                  let textColor = 'text-base-content';
                  
                  if (state !== 'pending' && state !== 'passed') {
                    const stateInfo = SOUND_STATES[state as keyof typeof SOUND_STATES];
                    if (stateInfo) {
                      bgColor = '';
                      textColor = '';
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
                  
                  return (
                    <div
                      key={idx}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${bgColor} ${textColor}`}
                      data-tip={`Такт ${idx + 1}: ${state === 'passed' ? 'Пройден' : 'Ожидание'}`}
                    >
                      {state === 'passed' ? '✓' : idx + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Табы */}
      <div className="tabs tabs-boxed bg-base-200 p-1">
        <button 
          className={`tab ${activeTab === 'analysis' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          📊 Анализ
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 История
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Настройки
        </button>
      </div>
      
      {/* Контент вкладок */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-4">
          
          {/* Вкладка анализа */}
          {activeTab === 'analysis' && status?.lastResult && (
            <div className="space-y-4">
              {/* Результат анализа */}
              <div 
                className="rounded-xl p-4 text-center"
                style={{ backgroundColor: status.lastResult.stateColor + '20' }}
              >
                <div className="text-6xl mb-2">
                  {status.lastResult.stateIcon}
                </div>
                <div className="text-2xl font-bold" style={{ color: status.lastResult.stateColor }}>
                  {status.lastResult.stateName}
                </div>
                <div className="text-sm text-base-content/70 mt-1">
                  {SOUND_STATES[status.lastResult.state as keyof typeof SOUND_STATES]?.description}
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Достоверность</span>
                    <span className="font-bold">{status.lastResult.confidence.toFixed(1)}%</span>
                  </div>
                  <progress 
                    className="progress progress-primary w-full h-2" 
                    value={status.lastResult.confidence} 
                    max="100"
                  />
                </div>
              </div>
              
              {/* Детальная статистика */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="stat bg-base-200 rounded-lg p-3">
                  <div className="stat-title text-xs">Центр масс</div>
                  <div className="stat-value text-lg">
                    {status.lastResult.analysis?.averageCentroid?.toFixed(0) || 0} Hz
                  </div>
                  <div className="stat-desc text-xs">σ: {status.lastResult.analysis?.centroidStd?.toFixed(0) || 0}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-3">
                  <div className="stat-title text-xs">Спектральный поток</div>
                  <div className="stat-value text-lg">
                    {status.lastResult.analysis?.averageFlux?.toFixed(3) || 0}
                  </div>
                  <div className="stat-desc text-xs">σ: {status.lastResult.analysis?.fluxStd?.toFixed(3) || 0}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-3">
                  <div className="stat-title text-xs">Громкость (RMS)</div>
                  <div className="stat-value text-lg">
                    {status.lastResult.analysis?.averageRms?.toFixed(4) || 0}
                  </div>
                  <div className="stat-desc text-xs">σ: {status.lastResult.analysis?.rmsStd?.toFixed(4) || 0}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-3">
                  <div className="stat-title text-xs">Активность</div>
                  <div className="stat-value text-lg">
                    {((status.lastResult.analysis?.activityRatio || 0) * 100).toFixed(0)}%
                  </div>
                  <div className="stat-desc text-xs">
                    {status.lastResult.analysis?.activityRatio > 0.7 ? 'Высокая' : status.lastResult.analysis?.activityRatio > 0.3 ? 'Средняя' : 'Низкая'}
                  </div>
                </div>
              </div>
              
              {/* Тренды */}
              <div className="bg-base-200 rounded-lg p-3">
                <div className="text-sm font-semibold mb-2">📈 Выявленные тренды</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-base-content/70">Громкость</div>
                    <div className="font-medium">
                      {status.lastResult.analysis?.rmsTrend === 'increasing' && '📈 Возрастает'}
                      {status.lastResult.analysis?.rmsTrend === 'decreasing' && '📉 Убывает'}
                      {status.lastResult.analysis?.rmsTrend === 'stable' && '➡️ Стабильна'}
                      {status.lastResult.analysis?.rmsTrend === 'fluctuating' && '🔄 Колеблется'}
                    </div>
                  </div>
                  <div>
                    <div className="text-base-content/70">Частота</div>
                    <div className="font-medium">
                      {status.lastResult.analysis?.centroidTrend === 'increasing' && '📈 Возрастает'}
                      {status.lastResult.analysis?.centroidTrend === 'decreasing' && '📉 Убывает'}
                      {status.lastResult.analysis?.centroidTrend === 'stable' && '➡️ Стабильна'}
                      {status.lastResult.analysis?.centroidTrend === 'fluctuating' && '🔄 Колеблется'}
                    </div>
                  </div>
                  <div>
                    <div className="text-base-content/70">Периодичность</div>
                    <div className="font-medium">
                      {status.lastResult.analysis?.periodicity === 'regular' && '🔁 Регулярная'}
                      {status.lastResult.analysis?.periodicity === 'semiRegular' && '🔄 Полурегулярная'}
                      {status.lastResult.analysis?.periodicity === 'irregular' && '🎲 Нерегулярная'}
                      {status.lastResult.analysis?.periodicity === 'random' && '🎯 Случайная'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Вкладка истории */}
          {activeTab === 'history' && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {status?.detectionHistory?.length > 0 ? (
                status.detectionHistory.map((result: any, idx: number) => {
                  const stateInfo = SOUND_STATES[result.state as keyof typeof SOUND_STATES];
                  return (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
                      onClick={() => {
                        setStatus({ ...status, lastResult: result });
                        setActiveTab('analysis');
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{result.stateIcon}</div>
                        <div>
                          <div className="font-semibold">{result.stateName}</div>
                          <div className="text-xs text-base-content/70">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold" style={{ color: result.stateColor }}>
                          {result.confidence.toFixed(1)}%
                        </div>
                        <div className="text-xs text-base-content/70">
                          {result.isDetected ? 'Обнаружен' : 'Фон'}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-base-content/70 py-8">
                  <div className="text-4xl mb-2">📭</div>
                  <p>История анализов пуста</p>
                  <p className="text-sm">Начните анализ для получения результатов</p>
                </div>
              )}
            </div>
          )}
          
          {/* Вкладка настроек */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Режим детекции</span>
                </label>
                <div className="flex gap-2">
                  <button 
                    className={`btn btn-sm ${status?.detectionMode === 'auto' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => TrendsFFTDetectorPlugin.setDetectionMode('auto')}
                  >
                    🤖 Авто
                  </button>
                  <button 
                    className={`btn btn-sm ${status?.detectionMode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => TrendsFFTDetectorPlugin.setDetectionMode('manual')}
                  >
                    👆 Ручной
                  </button>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Интервал между замерами (мс)</span>
                  <span className="label-text-alt">{config?.intervalMs || 30} мс</span>
                </label>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  step="5"
                  value={config?.intervalMs || 30}
                  onChange={(e) => handleConfigChange('intervalMs', parseInt(e.target.value))}
                  className="range range-primary range-sm"
                />
                <div className="flex justify-between text-xs px-2 mt-1">
                  <span>Быстрее</span>
                  <span>Точнее</span>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Количество замеров</span>
                  <span className="label-text-alt">{config?.measurementsCount || 100}</span>
                </label>
                <input 
                  type="range" 
                  min="20" 
                  max="300" 
                  step="10"
                  value={config?.measurementsCount || 100}
                  onChange={(e) => handleConfigChange('measurementsCount', parseInt(e.target.value))}
                  className="range range-primary range-sm"
                />
                <div className="flex justify-between text-xs px-2 mt-1">
                  <span>Быстрее</span>
                  <span>Точнее</span>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Длительность анализа</span>
                  <span className="label-text-alt">
                    {((config?.intervalMs || 30) * (config?.measurementsCount || 100) / 1000).toFixed(1)} сек
                  </span>
                </label>
              </div>
              
              <div className="alert alert-info">
                <span className="text-sm">
                  💡 В режиме "Авто" анализ запускается автоматически при обнаружении звука.
                  В режиме "Ручной" запуск происходит по кнопке.
                </span>
              </div>
            </div>
          )}
          
        </div>
      </div>
      
      {/* Статус бар */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-3">
          <div className="flex justify-between text-xs text-base-content/70">
            <div>📊 Всего анализов: {status?.totalAnalyses || 0}</div>
            <div>✅ Обнаружено: {status?.successfulDetections || 0}</div>
            <div>🎯 Точность: {status?.totalAnalyses ? ((status.successfulDetections / status.totalAnalyses) * 100).toFixed(0) : 0}%</div>
            <div>🔊 Статус: {status?.isAnalyzing ? 'Активен' : 'Остановлен'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendsFFTDetectorWidget;