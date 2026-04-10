import React, { useCallback, useEffect, useRef } from 'react';
import { useModulePlugins } from '../../hooks/useModulePlugins';
import { IPluginContext } from '../../types/plugins';

interface Lap {
  id: number;
  number: number;
  time: string;
}

interface StopwatchState {
  elapsedTime: number;
  isRunning: boolean;
  laps: Lap[];
}

interface StopwatchProps {
  onContextReady?: (context: IPluginContext) => void;
}

const Stopwatch: React.FC<StopwatchProps> = ({ onContextReady }) => {
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lapCounterRef = useRef<number>(0);
  
  // Используем универсальный хук
  const {
    state,
    setState,
    activePlugins,
    widgets,
    emitEvent,
    executeOnPlugins,
    pluginContext, // ✅ Получаем полный контекст
  } = useModulePlugins<StopwatchState>({
    moduleId: 'stopwatch',
    getInitialState: () => ({
      elapsedTime: 0,
      isRunning: false,
      laps: [],
    }),
    getContext: (state, setState) => ({
      moduleId: 'stopwatch',
      moduleState: state,
      dispatch: (action, payload) => {
        switch (action) {
          case 'addLap': addLap(); break;
          case 'reset': reset(); break;
          case 'pause': pause(); break;
          case 'start': start(); break;
        }
      },
      getData: () => state,
      setData: (data) => {
        if (data.elapsedTime !== undefined) setState({ elapsedTime: data.elapsedTime });
        if (data.laps !== undefined) setState({ laps: data.laps });
      },
      elapsedTime: state.elapsedTime,
      isRunning: state.isRunning,
      laps: state.laps,
      onContextReady,
    }),
  });
  
  const { elapsedTime, isRunning, laps } = state;
  
  const formatTime = useCallback((ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }, []);
  
  const tick = useCallback(() => {
    const currentTime = Date.now();
    const elapsed = currentTime - startTimeRef.current;
    setState({ elapsedTime: elapsed });
  }, [setState]);
  
  const start = useCallback(() => {
    if (isRunning) return;
    startTimeRef.current = Date.now() - elapsedTime;
    timerRef.current = window.setInterval(tick, 10);
    setState({ isRunning: true });
    emitEvent('start', { time: elapsedTime });
    executeOnPlugins('onStart', { time: elapsedTime });
  }, [isRunning, elapsedTime, tick, setState, emitEvent, executeOnPlugins]);
  
  const pause = useCallback(() => {
    if (!isRunning) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState({ isRunning: false });
    emitEvent('pause', { time: elapsedTime });
    executeOnPlugins('onPause', { time: elapsedTime });
  }, [isRunning, elapsedTime, setState, emitEvent, executeOnPlugins]);
  
  const reset = useCallback(() => {
    pause();
    setState({ elapsedTime: 0, laps: [], isRunning: false });
    lapCounterRef.current = 0;
    emitEvent('reset');
    executeOnPlugins('onReset');
  }, [pause, setState, emitEvent, executeOnPlugins]);
  
  const addLap = useCallback(() => {
    if (!isRunning) return;
    lapCounterRef.current++;
    const newLap: Lap = {
      id: Date.now(),
      number: lapCounterRef.current,
      time: formatTime(elapsedTime),
    };
    setState({ laps: [...laps, newLap] });
    emitEvent('lap', { lap: newLap });
    executeOnPlugins('onLap', { lap: newLap });
  }, [isRunning, elapsedTime, formatTime, laps, setState, emitEvent, executeOnPlugins]);
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
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
  
  // ✅ Создаём упрощённый контекст для виджетов
  const widgetContext = {
    elapsedTime,
    isRunning,
    laps,
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-center mb-8">
        <div className="bg-slate-900 text-green-400 text-6xl font-mono font-bold py-8 px-6 rounded-2xl shadow-inner animate-glow tracking-wider">
          {formatTime(elapsedTime)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button onClick={start} disabled={isRunning} className="btn bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50">▶ Старт</button>
        <button onClick={pause} disabled={!isRunning} className="btn bg-amber-500 hover:bg-amber-400 disabled:opacity-50">⏸ Пауза</button>
        <button onClick={reset} className="btn bg-rose-600 hover:bg-rose-500">🔄 Сброс</button>
        <button onClick={addLap} disabled={!isRunning} className="btn bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">⏱ Круг</button>
      </div>
      
      <div className="bg-black/30 rounded-xl p-4 max-h-48 overflow-y-auto scrollbar-custom mb-6">
        <h3 className="text-white text-sm font-semibold mb-2">📋 Круги</h3>
        <ul className="text-gray-300 text-sm">
          {laps.length === 0 ? (
            <li className="text-gray-500 text-center py-4">Нет кругов</li>
          ) : (
            laps.map((lap) => (
              <li key={lap.id} className="py-1.5 px-2 border-b border-white/10 font-mono">
                Круг {lap.number}: {lap.time}
              </li>
            ))
          )}
        </ul>
      </div>
      
      {widgets.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="border-t border-white/10 pt-3">
            <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">🔌 Плагины</h3>
          </div>
          {widgets.map((widget) => {
            const plugin = activePlugins.find(p => p.id === widget.pluginId);
            if (!plugin) return null;
            return (
              <div key={widget.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                {widget.title && (
                  <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center gap-2">
                    {widget.icon && <span className="text-sm">{widget.icon}</span>}
                    <span className="text-white text-xs font-medium">{widget.title}</span>
                  </div>
                )}
                <div className="p-3">
                  <widget.component
                    plugin={plugin}
                    context={widgetContext}
                    onAction={(action, data) => plugin.execute?.(action, data)}
                    isActive={plugin.enabled}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {activePlugins.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center pt-3 border-t border-white/10">
          {activePlugins.map(plugin => (
            <span key={plugin.id} className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              {plugin.icon} {plugin.name}
            </span>
          ))}
        </div>
      )}
      
      <div className="mt-4 text-center">
        <small className="text-gray-400 text-xs">⌨️ Пробел (Старт/Пауза) | R (Сброс) | L (Круг)</small>
      </div>
    </div>
  );
};

export default Stopwatch;