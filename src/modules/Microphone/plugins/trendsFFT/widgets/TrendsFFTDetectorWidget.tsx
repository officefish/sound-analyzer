// src/plugins/microphone2/widgets/TrendsFFTDetectorWidget.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { SOUND_STATES } from '../types';
import { IPlugin } from '../../../../../types/plugins';
import PluginCard from '../../../../../components/ui/PluginCard';
import { TickState } from '../TrendsFFTDetectorPlugin';

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
  
  const getProgressColor = () => {
    if (!status?.currentAnalysisProgress) return 'progress-primary';
    if (status.currentAnalysisProgress < 30) return 'progress-error';
    if (status.currentAnalysisProgress < 70) return 'progress-warning';
    return 'progress-success';
  };

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
    </PluginCard>
  );
};

export default React.memo(TrendsFFTDetectorWidget);

// src/plugins/microphone2/widgets/TrendsFFTDetectorWidget.tsx

// import React, { useEffect, useState } from 'react';
// import { TrendsFFTDetectorPlugin } from '../TrendsFFTDetectorPlugin';
// import { SOUND_STATES } from '../types';
// import { IPlugin } from '../../../../../types/plugins';
// import PluginCard from '../../../../../components/ui/PluginCard';
// import AutoModeToggle, { DetectionMode } from '../../../../../components/ui/plugin/AutoModeToggle';
// import PluginProcessStatus from '../../../../../components/ui/plugin/PluginProccessStatus';
// import PluginAnalysesStats from '../../../../../components/ui/plugin/PluginAnalysesStats';

// // interface AnalysisHistory {
// //   state: string;
// //   stateName: string;
// //   stateIcon: string;
// //   confidence: number;
// //   timestamp: number;
// // }

// interface TrendsDetectorFFTWidgetProps {
//   plugin: IPlugin;
//   context?: any;
//   onAction: (action: string, data?: any) => any;
//   isActive: boolean;
// }

// const TrendsFFTDetectorWidget: React.FC<TrendsDetectorFFTWidgetProps> = ({
//   plugin,
//   context,
//   onAction,
//   isActive,
// }) => {

//   const [status, setStatus] = useState<any>(null);
//   const [config, setConfig] = useState<any>(null);
//   const [isExpanded, setIsExpanded] = useState(false);
//   const [activeTab, setActiveTab] = useState<'analysis' | 'history' | 'settings'>('analysis');
  
//   const [detectionMode, setDetectionMode] = useState<DetectionMode>('auto');
//   const [isCollecting, setIsCollecting] = useState<boolean>(false);
//   const [showSettings, setShowSettings] = useState(false);
//   const [showHistory, setShowHistory] = useState(false);

//   const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
//   const [samplesCollected, setSamplesCollected] = useState<number>(0);
//   const [neededSamples] = useState<number>(100);

//   const handleModeChange = (mode: DetectionMode): void => {
//     setDetectionMode(mode);
//     // Логика смены режима
//     if (mode === 'auto') {
//       setIsCollecting(false);
//       setIsAnalyzing(true);
//     } else {
//       setIsAnalyzing(false);
//     }
//   };

//   /*
//  const handleStart = () => {
//     onAction('startDetection');
//   };

//   const handleStop = () => {
//     onAction('stopDetection');
//   };

//   const handleModeChange = (mode: DetectionMode) => {
//     setDetectionMode(mode);
//     onAction('setDetectionMode', mode);
//   };
//   */

//   const handleStart = (): void => {
//     setIsCollecting(true);
//     onAction('startDetection');
    
//     //handleStartDetection();
//     TrendsFFTDetectorPlugin.startDetection();
//     // Логика старта сбора данных
//   };

//   const handleStop = (): void => {
//     setIsCollecting(false);
//     setSamplesCollected(0);
    
//     TrendsFFTDetectorPlugin.stopDetection();
//     //onAction('stopDetection');
//     //handleStopDetection();
//     // Логика остановки
//   };

//   const canStartManual: boolean = !isCollecting && detectionMode === 'manual';
//   const canStop: boolean = isCollecting;


//   useEffect(() => {
//     // Загружаем конфиг только если он еще не загружен
//     const loadConfig = () => {
//       if (config !== null) return; // Добавляем проверку
      
//       const savedConfig = localStorage.getItem('trends-fft-detector-config');
//       if (savedConfig) {
//         try {
//           const parsed = JSON.parse(savedConfig);
//           setConfig(parsed);
//         } catch (e) {
//           console.error('Failed to load config:', e);
//         }
//       } else {
//         setConfig({
//           intervalMs: 30,
//           measurementsCount: 100,
//           strictness: 'normal',
//         });
//       }
//     };
    
//     loadConfig();
    
//     // Обновляем статус каждые 100мс
//     const interval = setInterval(() => {
//       if (TrendsFFTDetectorPlugin.enabled) {
//         const newStatus = TrendsFFTDetectorPlugin.getStatus();
//         setStatus(newStatus);
//       }
//     }, 100);
    
//     return () => clearInterval(interval);
//   }, [[isActive, onAction]]);
  
//   const handleConfigChange = (key: string, value: any) => {
//     const newConfig = { ...config, [key]: value };
//     setConfig(newConfig);
//     TrendsFFTDetectorPlugin.setConfig(newConfig);
//     localStorage.setItem('trends-fft-detector-config', JSON.stringify(newConfig));
//   };
  
//   const getProgressColor = () => {
//     if (!status?.currentAnalysisProgress) return 'progress-primary';
//     if (status.currentAnalysisProgress < 30) return 'progress-error';
//     if (status.currentAnalysisProgress < 70) return 'progress-warning';
//     return 'progress-success';
//   };
  
//   if (!TrendsFFTDetectorPlugin.enabled) {
//     return (
//       <div className="card bg-base-100 shadow-xl">
//         <div className="card-body items-center text-center">
//           <div className="text-4xl mb-2">📈</div>
//           <h2 className="card-title">Trends FFT Детектор</h2>
//           <p className="text-base-content/70">Плагин отключён</p>
//           <div className="card-actions justify-end mt-4">
//             <button 
//               className="btn btn-primary btn-sm"
//               onClick={() => TrendsFFTDetectorPlugin.enabled = true}
//             >
//               Включить
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }
  
//   return (
//     <PluginCard plugin={plugin} isActive={isActive}>
      
//       {/* Заголовок с кнопками управления */}
   
//           <div className="space-y-3">
//             <AutoModeToggle
//               detectionMode={detectionMode} 
//               onModeChange={handleModeChange} 
//             />
//             <PluginProcessStatus
//               isCollecting={isCollecting}
//               isAnalyzing={isAnalyzing}
//               detectionMode={detectionMode}
//               samplesCollected={samplesCollected}
//               neededSamples={neededSamples}
//               onStart={handleStart}
//               onStop={handleStop}
//               canStartManual={canStartManual}
//               canStop={canStop}
//             />

//           </div>  
      
//           {/* </div> */}
          
//           {/* Статус анализа */}
//           {status?.isAnalyzing && (
//             <div className="mt-3">
//               <div className="flex justify-between text-xs mb-1">
//                 <span>Анализ звука</span>
//                 <span>{status.isCollecting ? 'Сбор данных...' : 'Ожидание'}</span>
//               </div>
//               <progress 
//                 className={`progress ${getProgressColor()} w-full h-2`} 
//                 value={status.currentAnalysisProgress || 0} 
//                 max="100"
//               />
//               <div className="flex justify-between text-xs mt-1 text-base-content/60">
//                 <span>Интервал: {config?.intervalMs || 30} мс</span>
//                 <span>Замеров: {status.samplesCollected || 0}/{status.neededSamples || 100}</span>
//               </div>
//             </div>
//           )}
          
//           {/* Визуализация тиков */}
//           {status?.tickStates && status.tickStates.length > 0 && (
//             <div className="mt-3">
//               <div className="flex gap-1 flex-wrap">
//                 {status.tickStates.map((state: string, idx: number) => {
//                   let bgColor = 'bg-base-300';
//                   let textColor = 'text-base-content';
                  
//                   if (state !== 'pending' && state !== 'passed') {
//                     const stateInfo = SOUND_STATES[state as keyof typeof SOUND_STATES];
//                     if (stateInfo) {
//                       bgColor = '';
//                       textColor = '';
//                       return (
//                         <div
//                           key={idx}
//                           className="tooltip"
//                           data-tip={`Такт ${idx + 1}: ${stateInfo.name}`}
//                         >
//                           <div 
//                             className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
//                             style={{ backgroundColor: stateInfo.color + '40', color: stateInfo.color }}
//                           >
//                             {stateInfo.icon}
//                           </div>
//                         </div>
//                       );
//                     }
//                   }       
//                   return (
//                     <div
//                       key={idx}
//                       className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${bgColor} ${textColor}`}
//                       data-tip={`Такт ${idx + 1}: ${state === 'passed' ? 'Пройден' : 'Ожидание'}`}
//                     >
//                       {state === 'passed' ? '✓' : idx + 1}
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )}

//        {/* Статистика анализов */}
//        <PluginAnalysesStats
//         totalAnalyses={status?.totalAnalyses || 0}
//         detectionCount={status?.successfulDetections || 0}
//         />

//         {/* Настройки */}
//         <button
//           onClick={() => setShowSettings(!showSettings)}
//           className="w-full text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1 pt-1"
//         >
//           <span>{showSettings ? '▲' : '▼'}</span>
//           <span>Настройки детектора</span>
//         </button>

//        {showSettings && (
//           <div className="space-y-3 p-2 rounded-lg bg-base-300/30">           
            
//             {/* Интервал */}
//             <div>
//               <label className="text-gray-400 text-xs">⏱ Интервал (мс)</label>
//               <input
//                 type="number"
//                 step="10"
//                 value={config.intervalMs}
//                 onChange={(e) => handleConfigChange('intervalMs', parseInt(e.target.value))}
//                 className="w-full bg-base-300 rounded px-2 py-1 text-xs text-right"
//               />
//             </div>

//             {/* Количество замеров */}
//             <div>
//               <label className="text-gray-400 text-xs">⏱ Общее число замеров</label>
//               <input
//                 type="number"
//                 step="10"
//                 value={config?.measurementsCount || 100}
//                 onChange={(e) => handleConfigChange('measurementsCount', parseInt(e.target.value))}
//                 className="w-full bg-base-300 rounded px-2 py-1 text-xs text-right"
//               />
//             </div>
            
//             {/* Длительность анализа */}
//             <div className="form-control">
//               <label className="label text-xs text-primary">
//                 <span className="label-text">Длительность анализа</span>
//                 <span className="label-text-alt">
//                   {((config?.intervalMs || 30) * (config?.measurementsCount || 100) / 1000).toFixed(1)} сек
//                 </span>
//               </label>
//             </div>

//             {/* Предупреждение об авторежиме */}
//             <div className="alert alert-info">
//               <span className="text-sm">
//                   💡 В режиме "Авто" анализ запускается автоматически при обнаружении звука.
//                   В режиме "Ручной" запуск происходит по кнопке.
//               </span>
//             </div>
//         </div>  
//        )}

//       {/* История */}
//       <button
//         onClick={() => setShowHistory(!showHistory)}
//         className="w-full text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1 pt-4"
//         >
//           <span>{showSettings ? '▲' : '▼'}</span>
//           <span>История</span>
//       </button>

//       {showHistory && (
//           <div className="space-y-2 max-h-96 overflow-y-auto">
//               {status?.detectionHistory?.length > 0 ? (
//                 status.detectionHistory.map((result: any, idx: number) => {
//                   //const stateInfo = SOUND_STATES[result.state as keyof typeof SOUND_STATES];
//                   return (
//                     <div 
//                       key={idx}
//                       className="flex items-center justify-between p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
//                       onClick={() => {
//                         setStatus({ ...status, lastResult: result });
//                         setActiveTab('analysis');
//                       }}
//                     >
//                       <div className="flex items-center gap-3">
//                         <div className="text-2xl">{result.stateIcon}</div>
//                         <div>
//                           <div className="font-semibold">{result.stateName}</div>
//                           <div className="text-xs text-base-content/70">
//                             {new Date(result.timestamp).toLocaleTimeString()}
//                           </div>
//                         </div>
//                       </div>
//                       <div className="text-right">
//                         <div className="font-bold" style={{ color: result.stateColor }}>
//                           {result.confidence.toFixed(1)}%
//                         </div>
//                         <div className="text-xs text-base-content/70">
//                           {result.isDetected ? 'Обнаружен' : 'Фон'}
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })
//               ) : (
//                 <div className="text-center text-base-content/70 py-8">
//                   <div className="text-4xl mb-2">📭</div>
//                   <p>История анализов пуста</p>
//                   <p className="text-sm">Начните анализ для получения результатов</p>
//                 </div>
//               )}
//             </div>
//       )}



//       {/* Табы */}
//       {<div className="tabs tabs-boxed bg-base-200 p-1">
//         <button 
//           className={`tab ${activeTab === 'analysis' ? 'tab-active' : ''}`}
//           onClick={() => setActiveTab('analysis')}
//         >
//           📊 Анализ
//         </button>
//         <button 
//           className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
//           onClick={() => setActiveTab('history')}
//         >
//           📜 История
//         </button>
//         <button 
//           className={`tab ${activeTab === 'settings' ? 'tab-active' : ''}`}
//           onClick={() => setActiveTab('settings')}
//         >
//           ⚙️ Настройки
//         </button>
//       </div>}
      
//       {/* Контент вкладок */}
//       <div className="card bg-base-100 shadow-xl">
//         <div className="card-body p-4">
          
//           {/* Вкладка анализа */}
//           {activeTab === 'analysis' && status?.lastResult && (
//             <div className="space-y-4">
//               {/* Результат анализа */}
//               <div 
//                 className="rounded-xl p-4 text-center"
//                 style={{ backgroundColor: status.lastResult.stateColor + '20' }}
//               >
//                 <div className="text-6xl mb-2">
//                   {status.lastResult.stateIcon}
//                 </div>
//                 <div className="text-2xl font-bold" style={{ color: status.lastResult.stateColor }}>
//                   {status.lastResult.stateName}
//                 </div>
//                 <div className="text-sm text-base-content/70 mt-1">
//                   {SOUND_STATES[status.lastResult.state as keyof typeof SOUND_STATES]?.description}
//                 </div>
//                 <div className="mt-3">
//                   <div className="flex justify-between text-sm mb-1">
//                     <span>Достоверность</span>
//                     <span className="font-bold">{status.lastResult.confidence.toFixed(1)}%</span>
//                   </div>
//                   <progress 
//                     className="progress progress-primary w-full h-2" 
//                     value={status.lastResult.confidence} 
//                     max="100"
//                   />
//                 </div>
//               </div>
              
//               {/* Детальная статистика */}
//               <div className="grid grid-cols-2 gap-3 text-sm">
//                 <div className="stat bg-base-200 rounded-lg p-3">
//                   <div className="stat-title text-xs">Центр масс</div>
//                   <div className="stat-value text-lg">
//                     {status.lastResult.analysis?.averageCentroid?.toFixed(0) || 0} Hz
//                   </div>
//                   <div className="stat-desc text-xs">σ: {status.lastResult.analysis?.centroidStd?.toFixed(0) || 0}</div>
//                 </div>
//                 <div className="stat bg-base-200 rounded-lg p-3">
//                   <div className="stat-title text-xs">Спектральный поток</div>
//                   <div className="stat-value text-lg">
//                     {status.lastResult.analysis?.averageFlux?.toFixed(3) || 0}
//                   </div>
//                   <div className="stat-desc text-xs">σ: {status.lastResult.analysis?.fluxStd?.toFixed(3) || 0}</div>
//                 </div>
//                 <div className="stat bg-base-200 rounded-lg p-3">
//                   <div className="stat-title text-xs">Громкость (RMS)</div>
//                   <div className="stat-value text-lg">
//                     {status.lastResult.analysis?.averageRms?.toFixed(4) || 0}
//                   </div>
//                   <div className="stat-desc text-xs">σ: {status.lastResult.analysis?.rmsStd?.toFixed(4) || 0}</div>
//                 </div>
//                 <div className="stat bg-base-200 rounded-lg p-3">
//                   <div className="stat-title text-xs">Активность</div>
//                   <div className="stat-value text-lg">
//                     {((status.lastResult.analysis?.activityRatio || 0) * 100).toFixed(0)}%
//                   </div>
//                   <div className="stat-desc text-xs">
//                     {status.lastResult.analysis?.activityRatio > 0.7 ? 'Высокая' : status.lastResult.analysis?.activityRatio > 0.3 ? 'Средняя' : 'Низкая'}
//                   </div>
//                 </div>
//               </div>
              
//               {/* Тренды */}
//               <div className="bg-base-200 rounded-lg p-3">
//                 <div className="text-sm font-semibold mb-2">📈 Выявленные тренды</div>
//                 <div className="grid grid-cols-3 gap-2 text-xs">
//                   <div>
//                     <div className="text-base-content/70">Громкость</div>
//                     <div className="font-medium">
//                       {status.lastResult.analysis?.rmsTrend === 'increasing' && '📈 Возрастает'}
//                       {status.lastResult.analysis?.rmsTrend === 'decreasing' && '📉 Убывает'}
//                       {status.lastResult.analysis?.rmsTrend === 'stable' && '➡️ Стабильна'}
//                       {status.lastResult.analysis?.rmsTrend === 'fluctuating' && '🔄 Колеблется'}
//                     </div>
//                   </div>
//                   <div>
//                     <div className="text-base-content/70">Частота</div>
//                     <div className="font-medium">
//                       {status.lastResult.analysis?.centroidTrend === 'increasing' && '📈 Возрастает'}
//                       {status.lastResult.analysis?.centroidTrend === 'decreasing' && '📉 Убывает'}
//                       {status.lastResult.analysis?.centroidTrend === 'stable' && '➡️ Стабильна'}
//                       {status.lastResult.analysis?.centroidTrend === 'fluctuating' && '🔄 Колеблется'}
//                     </div>
//                   </div>
//                   <div>
//                     <div className="text-base-content/70">Периодичность</div>
//                     <div className="font-medium">
//                       {status.lastResult.analysis?.periodicity === 'regular' && '🔁 Регулярная'}
//                       {status.lastResult.analysis?.periodicity === 'semiRegular' && '🔄 Полурегулярная'}
//                       {status.lastResult.analysis?.periodicity === 'irregular' && '🎲 Нерегулярная'}
//                       {status.lastResult.analysis?.periodicity === 'random' && '🎯 Случайная'}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
          
//           {/* Вкладка истории */}
//           {activeTab === 'history' && (
//             <div className="space-y-2 max-h-96 overflow-y-auto">
//               {status?.detectionHistory?.length > 0 ? (
//                 status.detectionHistory.map((result: any, idx: number) => {
//                   const stateInfo = SOUND_STATES[result.state as keyof typeof SOUND_STATES];
//                   return (
//                     <div 
//                       key={idx}
//                       className="flex items-center justify-between p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
//                       onClick={() => {
//                         setStatus({ ...status, lastResult: result });
//                         setActiveTab('analysis');
//                       }}
//                     >
//                       <div className="flex items-center gap-3">
//                         <div className="text-2xl">{result.stateIcon}</div>
//                         <div>
//                           <div className="font-semibold">{result.stateName}</div>
//                           <div className="text-xs text-base-content/70">
//                             {new Date(result.timestamp).toLocaleTimeString()}
//                           </div>
//                         </div>
//                       </div>
//                       <div className="text-right">
//                         <div className="font-bold" style={{ color: result.stateColor }}>
//                           {result.confidence.toFixed(1)}%
//                         </div>
//                         <div className="text-xs text-base-content/70">
//                           {result.isDetected ? 'Обнаружен' : 'Фон'}
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })
//               ) : (
//                 <div className="text-center text-base-content/70 py-8">
//                   <div className="text-4xl mb-2">📭</div>
//                   <p>История анализов пуста</p>
//                   <p className="text-sm">Начните анализ для получения результатов</p>
//                 </div>
//               )}
//             </div>
//           )}
          
//           {/* Вкладка настроек */}
//           {activeTab === 'settings' && (
//             <div className="space-y-4">
//               <div className="form-control">
//                 <label className="label">
//                   <span className="label-text">Режим детекции</span>
//                 </label>
//                 <div className="flex gap-2">
//                   <button 
//                     className={`btn btn-sm ${status?.detectionMode === 'auto' ? 'btn-primary' : 'btn-ghost'}`}
//                     onClick={() => TrendsFFTDetectorPlugin.setDetectionMode('auto')}
//                   >
//                     🤖 Авто
//                   </button>
//                   <button 
//                     className={`btn btn-sm ${status?.detectionMode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
//                     onClick={() => TrendsFFTDetectorPlugin.setDetectionMode('manual')}
//                   >
//                     👆 Ручной
//                   </button>
//                 </div>
//               </div>
              
//               <div className="form-control">
//                 <label className="label">
//                   <span className="label-text">Интервал между замерами (мс)</span>
//                   <span className="label-text-alt">{config?.intervalMs || 30} мс</span>
//                 </label>
//                 <input 
//                   type="range" 
//                   min="10" 
//                   max="100" 
//                   step="5"
//                   value={config?.intervalMs || 30}
//                   onChange={(e) => handleConfigChange('intervalMs', parseInt(e.target.value))}
//                   className="range range-primary range-sm"
//                 />
//                 <div className="flex justify-between text-xs px-2 mt-1">
//                   <span>Быстрее</span>
//                   <span>Точнее</span>
//                 </div>
//               </div>
              
//               <div className="form-control">
//                 <label className="label">
//                   <span className="label-text">Количество замеров</span>
//                   <span className="label-text-alt">{config?.measurementsCount || 100}</span>
//                 </label>
//                 <input 
//                   type="range" 
//                   min="20" 
//                   max="300" 
//                   step="10"
//                   value={config?.measurementsCount || 100}
//                   onChange={(e) => handleConfigChange('measurementsCount', parseInt(e.target.value))}
//                   className="range range-primary range-sm"
//                 />
//                 <div className="flex justify-between text-xs px-2 mt-1">
//                   <span>Быстрее</span>
//                   <span>Точнее</span>
//                 </div>
//               </div>
              
//               <div className="form-control">
//                 <label className="label">
//                   <span className="label-text">Длительность анализа</span>
//                   <span className="label-text-alt">
//                     {((config?.intervalMs || 30) * (config?.measurementsCount || 100) / 1000).toFixed(1)} сек
//                   </span>
//                 </label>
//               </div>
              
//               <div className="alert alert-info">
//                 <span className="text-sm">
//                   💡 В режиме "Авто" анализ запускается автоматически при обнаружении звука.
//                   В режиме "Ручной" запуск происходит по кнопке.
//                 </span>
//               </div>
//             </div>
//           )}
          
//         </div>
//       </div>
      
//     </PluginCard>
//   );
// };

// export default TrendsFFTDetectorWidget;