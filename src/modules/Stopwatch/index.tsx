import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useModulePlugins } from '../../hooks/useModulePlugins';
import { StopwatchService, Lap, StopwatchState } from './services/stopwatch.service'
import { Button, Card, Badge } from '../../components/ui';
import { IPluginContext } from '../../types/plugins';
import ModuleHeader from '../../components/ui/ModuleHeader';

const MODULE_ID = 'stopwatch';

const INITIAL_STATE: StopwatchState = {
  elapsedTime: 0,
  isRunning: false,
  laps: [],
};

const Stopwatch: React.FC = () => {
  const [state, setState] = useState<StopwatchState>(INITIAL_STATE);
  const serviceRef = useRef<StopwatchService | null>(null);
  const isInitializedRef = useRef(false);
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const { activePlugins, widgets, emitEvent, executeOnPlugins } = useModulePlugins<StopwatchState>({
    moduleId: MODULE_ID as any,
    getInitialState: () => INITIAL_STATE,
  });
  
  // ✅ Создаём сервис синхронно
  const getService = useCallback(() => {
    if (!serviceRef.current) {
      console.log('🔧 Creating StopwatchService...');
      const service = new StopwatchService();
      
      service.on('onTick', (elapsedTime: number) => {
        console.log('🕐 Tick:', elapsedTime);
        setState(prev => ({ ...prev, elapsedTime }));
        emitEvent('tick', { elapsedTime });
      });
      
      service.on('onStart', () => {
        console.log('▶️ Start');
        setState(prev => ({ ...prev, isRunning: true }));
        emitEvent('start');
        executeOnPlugins('onStart');
      });
      
      service.on('onPause', () => {
        console.log('⏸️ Pause');
        setState(prev => ({ ...prev, isRunning: false }));
        emitEvent('pause');
        executeOnPlugins('onPause');
      });
      
      service.on('onReset', () => {
        console.log('🔄 Reset');
        setState(prev => ({ ...prev, elapsedTime: 0, laps: [] }));
        emitEvent('reset');
        executeOnPlugins('onReset');
      });
      
      service.on('onLap', (lap: Lap) => {
        console.log('⏱️ Lap:', lap);
        setState(prev => ({ ...prev, laps: [...prev.laps, lap] }));
        emitEvent('lap', { lap });
        executeOnPlugins('onLap', { lap });
      });
      
      serviceRef.current = service;
    }
    return serviceRef.current;
  }, [emitEvent, executeOnPlugins]);
  
  // Инициализация при монтировании (загружаем начальное состояние, если нужно)
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    const service = getService();
    console.log('✅ StopwatchService initialized');
    
    return () => {
      if (service) {
        service.dispose();
        serviceRef.current = null;
      }
    };
  }, [getService]);
  
  // Контекст для плагинов
  const pluginContext: IPluginContext = {
    moduleId: MODULE_ID as any,
    moduleState: state,
    dispatch: (action: string
      //, payload?: any
    ) => {
      switch (action) {
        case 'start': start(); break;
        case 'pause': pause(); break;
        case 'reset': reset(); break;
        case 'lap': addLap(); break;
      }
    },
    getData: () => stateRef.current,
    setData: (data: any) => {
      if (data.elapsedTime !== undefined) {
        setState(prev => ({ ...prev, elapsedTime: data.elapsedTime }));
      }
      if (data.laps !== undefined) {
        setState(prev => ({ ...prev, laps: data.laps }));
      }
    },
    elapsedTime: state.elapsedTime,
    isRunning: state.isRunning,
    laps: state.laps,
  };
  
  
  
  const start = useCallback(() => {
    console.log('🎯 Start button clicked, serviceRef:', serviceRef.current);
    const service = getService();
    service.start();
  }, [getService]);
  
  const pause = useCallback(() => {
    console.log('🎯 Pause button clicked, serviceRef:', serviceRef.current);
    const service = getService();
    service.pause();
  }, [getService]);
  
  const reset = useCallback(() => {
    console.log('🎯 Reset button clicked, serviceRef:', serviceRef.current);
    const service = getService();
    service.reset();
  }, [getService]);
  
  const addLap = useCallback(() => {
    console.log('🎯 Lap button clicked, serviceRef:', serviceRef.current);
    const service = getService();
    service.addLap();
  }, [getService]);
  
  const { elapsedTime, isRunning, laps } = state;
  
  const formatDisplay = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };
  
  // Горячие клавиши
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isRunning) pause();
          else start();
          break;
        case 'KeyR':
          reset();
          break;
        case 'KeyL':
          addLap();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRunning, start, pause, reset, addLap]);
  
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <ModuleHeader
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        }
        title="Секундомер"
        description="Измерение времени с точностью до миллисекунды"
      />
      
      <Card className="mb-8 text-center">
        <div className="py-8">
          <div className="text-6xl sm:text-7xl font-mono font-bold text-primary tracking-wider animate-glow">
            {formatDisplay(elapsedTime)}
          </div>
          {/* {isRunning && (
            <Badge variant="success" size="md" className="mt-3">
              ● RUNNING
            </Badge>
          )} */}
        </div>
      </Card>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Button onClick={start} disabled={isRunning} variant="success" size="lg">
          ▶ Старт
        </Button>
        <Button onClick={pause} disabled={!isRunning} variant="warning" size="lg">
          ⏸ Пауза
        </Button>
        <Button onClick={reset} variant="danger" size="lg">
          🔄 Сброс
        </Button>
        <Button onClick={addLap} disabled={!isRunning} variant="primary" size="lg">
          ⏱ Круг
        </Button>
      </div>
      
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-base-300">
          <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">
            📋 История кругов
          </h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {laps.length === 0 ? (
            <div className="text-center text-base-content/40 py-8">
              Нет сохранённых кругов
            </div>
          ) : (
            <div className="divide-y divide-base-300">
              {laps.slice().reverse().map((lap) => (
                <div key={lap.id} className="flex items-center justify-between p-3 hover:bg-base-200/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant="info" size="sm">
                      #{lap.number}
                    </Badge>
                    <span className="text-sm text-base-content/60">
                      {new Date(lap.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="font-mono text-lg font-bold text-primary">
                    {lap.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      
      <div className="mt-4 text-center text-xs text-base-content/40">
        ⌨️ Горячие клавиши: Пробел (Старт/Пауза) | R (Сброс) | L (Круг)
      </div>
      
      {activePlugins.length > 0 && (
        <div className="mt-6 space-y-4">
          {widgets.map((widget) => {
            const plugin = activePlugins.find(p => p.id === widget.pluginId);
            if (!plugin) return null;
            return (
              <widget.component
                key={widget.id}
                plugin={plugin}
                context={pluginContext}
                onAction={(action, data) => plugin.execute?.(action, data, pluginContext)}
                isActive={plugin.enabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Stopwatch;

// import React, { useCallback, useEffect, useRef, useMemo } from 'react';
// import { useModulePlugins } from '../../hooks/useModulePlugins';
// import ModuleHeader from '../../components/ui/ModuleHeader';

// interface Lap {
//   id: number;
//   number: number;
//   time: string;
// }

// interface StopwatchState {
//   elapsedTime: number;
//   isRunning: boolean;
//   laps: Lap[];
// }

// const Stopwatch: React.FC = () => {
//   const timerRef = useRef<number | null>(null);
//   const startTimeRef = useRef<number>(0);
//   const lapCounterRef = useRef<number>(0);
  
//   const {
//     state,
//     setState,
//     activePlugins,
//     widgets,
//     emitEvent,
//     executeOnPlugins,
//   } = useModulePlugins<StopwatchState>({
//     moduleId: 'stopwatch',
//     getInitialState: () => ({
//       elapsedTime: 0,
//       isRunning: false,
//       laps: [],
//     }),
//   });

//    useEffect(() => {
//       console.log('activePlugins.length: ' + activePlugins.length)
//     }, [activePlugins])
  
//   const { elapsedTime, isRunning, laps } = state;
  
//   const formatTime = useCallback((ms: number): string => {
//     const hours = Math.floor(ms / 3600000);
//     const minutes = Math.floor((ms % 3600000) / 60000);
//     const seconds = Math.floor((ms % 60000) / 1000);
//     const milliseconds = Math.floor((ms % 1000) / 10);
//     return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
//   }, []);
  
//   const tick = useCallback(() => {
//     const currentTime = Date.now();
//     const elapsed = currentTime - startTimeRef.current;
//     setState({ elapsedTime: elapsed });
//   }, [setState]);
  
//   const start = useCallback(() => {
//     if (isRunning) return;
//     startTimeRef.current = Date.now() - elapsedTime;
//     timerRef.current = window.setInterval(tick, 10);
//     setState({ isRunning: true });
//     emitEvent('start', { time: elapsedTime });
//     executeOnPlugins('onStart', { time: elapsedTime });
//   }, [isRunning, elapsedTime, tick, setState, emitEvent, executeOnPlugins]);
  
//   const pause = useCallback(() => {
//     if (!isRunning) return;
//     if (timerRef.current) {
//       clearInterval(timerRef.current);
//       timerRef.current = null;
//     }
//     setState({ isRunning: false });
//     emitEvent('pause', { time: elapsedTime });
//     executeOnPlugins('onPause', { time: elapsedTime });
//   }, [isRunning, elapsedTime, setState, emitEvent, executeOnPlugins]);
  
//   const reset = useCallback(() => {
//     pause();
//     setState({ elapsedTime: 0, laps: [], isRunning: false });
//     lapCounterRef.current = 0;
//     emitEvent('reset');
//     executeOnPlugins('onReset');
//   }, [pause, setState, emitEvent, executeOnPlugins]);
  
//   const addLap = useCallback(() => {
//     if (!isRunning) return;
//     lapCounterRef.current++;
//     const newLap: Lap = {
//       id: Date.now(),
//       number: lapCounterRef.current,
//       time: formatTime(elapsedTime),
//     };
//     setState({ laps: [...laps, newLap] });
//     emitEvent('lap', { lap: newLap });
//     executeOnPlugins('onLap', { lap: newLap });
//   }, [isRunning, elapsedTime, formatTime, laps, setState, emitEvent, executeOnPlugins]);
  
//   // Очистка таймера при размонтировании
//   useEffect(() => {
//     return () => {
//       if (timerRef.current) {
//         clearInterval(timerRef.current);
//       }
//     };
//   }, []);
  
//   // Горячие клавиши
//   useEffect(() => {
//     const handleKeyPress = (e: KeyboardEvent) => {
//       if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
//       switch (e.code) {
//         case 'Space':
//           e.preventDefault();
//           if (isRunning) pause();
//           else start();
//           break;
//         case 'KeyR':
//           reset();
//           break;
//         case 'KeyL':
//           addLap();
//           break;
//       }
//     };
//     window.addEventListener('keydown', handleKeyPress);
//     return () => window.removeEventListener('keydown', handleKeyPress);
//   }, [isRunning, start, pause, reset, addLap]);
  
//   // Упрощённый контекст для виджетов
//   const widgetContext = useMemo(() => ({
//     elapsedTime,
//     isRunning,
//     laps,
//   }), [elapsedTime, isRunning, laps]);
  
//   return (
//     <div className="p-6">
//       <div className="flex justify-center mb-8">


//         <ModuleHeader
//           icon={
//             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//               <circle cx="12" cy="12" r="10" />
//               <polyline points="12 6 12 12 16 14" />
//             </svg>
//           }
//           title="Секундомер"
//           description="Измерение времени с точностью до миллисекунды"
//         />

//         <div className="bg-slate-900 text-green-400 text-6xl font-mono font-bold py-8 px-6 rounded-2xl shadow-inner animate-glow tracking-wider">
//           {formatTime(elapsedTime)}
//         </div>
//       </div>
      
//       <div className="grid grid-cols-2 gap-3 mb-8">
//         <button onClick={start} disabled={isRunning} className="btn bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">▶ Старт</button>
//         <button onClick={pause} disabled={!isRunning} className="btn bg-amber-500 hover:bg-amber-400 disabled:opacity-50">⏸ Пауза</button>
//         <button onClick={reset} className="btn bg-rose-600 hover:bg-rose-500">🔄 Сброс</button>
//         <button onClick={addLap} disabled={!isRunning} className="btn bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">⏱ Круг</button>
//       </div>
      
//       <div className="bg-black/30 rounded-xl p-4 max-h-48 overflow-y-auto scrollbar-custom mb-6">
//         <h3 className="text-white text-sm font-semibold mb-2">📋 Круги</h3>
//         <ul className="text-gray-300 text-sm">
//           {laps.length === 0 ? (
//             <li className="text-gray-500 text-center py-4">Нет кругов</li>
//           ) : (
//             laps.map((lap) => (
//               <li key={lap.id} className="py-1.5 px-2 border-b border-white/10 font-mono">
//                 Круг {lap.number}: {lap.time}
//               </li>
//             ))
//           )}
//         </ul>
//       </div>
      
//       {widgets.length > 0 && (
//         <div className="space-y-3 mb-6">
//           <div className="border-t border-white/10 pt-3">
//             <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">🔌 Плагины</h3>
//           </div>
//           {widgets.map((widget) => {
//             const plugin = activePlugins.find(p => p.id === widget.pluginId);
//             if (!plugin) return null;
//             return (
//               <div key={widget.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
//                 {widget.title && (
//                   <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center gap-2">
//                     {widget.icon && <span className="text-sm">{widget.icon}</span>}
//                     <span className="text-white text-xs font-medium">{widget.title}</span>
//                   </div>
//                 )}
//                 <div className="p-3">
//                   <widget.component
//                     plugin={plugin}
//                     context={widgetContext}
//                     onAction={(action, data) => plugin.execute?.(action, data)}
//                     isActive={plugin.enabled}
//                   />
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
      
//       {activePlugins.length > 0 && (
//         <div className="flex flex-wrap gap-1 justify-center pt-3 border-t border-white/10">
//           {activePlugins.map(plugin => (
//             <span key={plugin.id} className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1">
//               {plugin.icon} {plugin.name}
//             </span>
//           ))}
//         </div>
//       )}
      
//       <div className="mt-4 text-center">
//         <small className="text-gray-400 text-xs">⌨️ Пробел (Старт/Пауза) | R (Сброс) | L (Круг)</small>
//       </div>
//     </div>
//   );
// };

// export default Stopwatch;