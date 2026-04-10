import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePlugins } from '../../hooks/usePlugins';
import { usePluginsStore } from '../../store/plugins.store';
import Footer from '../../components/Layout/Footer';
import { LapHistoryPlugin } from './plugins/LapHistoryPlugin';
import { SoundEffectPlugin } from './plugins/SoundEffectPlugin';

interface Lap {
  id: number;
  number: number;
  time: string;
}

const Stopwatch: React.FC = () => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lapCounterRef = useRef<number>(0);
  
  // Подключаем плагины
  const { activePlugins, executeOnAll, emitEvent } = usePlugins('stopwatch', {
    moduleId: 'stopwatch',
    moduleState: { elapsedTime, isRunning, laps },
    dispatch: (action, payload) => {
      switch (action) {
        case 'addLap': addLap(); break;
        case 'reset': reset(); break;
        case 'pause': pause(); break;
        case 'start': start(); break;
      }
    },
    getData: () => ({ elapsedTime, isRunning, laps }),
    setData: (data) => {
      if (data.elapsedTime !== undefined) setElapsedTime(data.elapsedTime);
      if (data.laps !== undefined) setLaps(data.laps);
    },
  });
  
  // Регистрируем плагины при монтировании
  useEffect(() => {
    const state = usePluginsStore.getState();
    
    const existingPlugins = state.getPluginsByModule('stopwatch');
    const existingIds = existingPlugins.map(p => p.id);
    
    if (!existingIds.includes(LapHistoryPlugin.id)) {
      state.registerPlugin(LapHistoryPlugin);
    }
    if (!existingIds.includes(SoundEffectPlugin.id)) {
      state.registerPlugin(SoundEffectPlugin);
    }
  }, []);
  
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
    setElapsedTime(elapsed);
  }, []);
  
  const start = useCallback(() => {
    if (isRunning) return;
    
    startTimeRef.current = Date.now() - elapsedTime;
    timerRef.current = window.setInterval(tick, 10);
    setIsRunning(true);
    
    emitEvent('start', { time: elapsedTime });
    executeOnAll('onStart', { time: elapsedTime });
  }, [isRunning, elapsedTime, tick, emitEvent, executeOnAll]);
  
  const pause = useCallback(() => {
    if (!isRunning) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    
    emitEvent('pause', { time: elapsedTime });
    executeOnAll('onPause', { time: elapsedTime });
  }, [isRunning, elapsedTime, emitEvent, executeOnAll]);
  
  const reset = useCallback(() => {
    pause();
    setElapsedTime(0);
    setLaps([]);
    lapCounterRef.current = 0;
    
    emitEvent('reset');
    executeOnAll('onReset');
  }, [pause, emitEvent, executeOnAll]);
  
  const addLap = useCallback(() => {
    if (!isRunning) return;
    
    lapCounterRef.current++;
    const newLap: Lap = {
      id: Date.now(),
      number: lapCounterRef.current,
      time: formatTime(elapsedTime),
    };
    
    setLaps(prev => [...prev, newLap]);
    
    emitEvent('lap', { lap: newLap });
    executeOnAll('onLap', { lap: newLap });
  }, [isRunning, elapsedTime, formatTime, emitEvent, executeOnAll]);
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
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
    <div className="h-full flex flex-col relative">
      {/* Рендерим UI компоненты активных плагинов */}
      {activePlugins.map(plugin => 
        plugin.UIComponent && (
          <plugin.UIComponent
            isActive={true}
            key={plugin.id}
            context={{ elapsedTime, isRunning, laps }}
            onAction={(action, data) => {
              if (plugin.execute) {
                plugin.execute(action, data);
              }
            }}
          />
        )
      )}
      
      {/* Дисплей */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-slate-900 text-green-400 text-6xl font-mono font-bold py-8 px-6 rounded-2xl shadow-inner animate-glow tracking-wider">
          {formatTime(elapsedTime)}
        </div>
      </div>
      
      {/* Кнопки */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={start}
          disabled={isRunning}
          className="btn bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
        >
          ▶ Старт
        </button>
        <button
          onClick={pause}
          disabled={!isRunning}
          className="btn bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-900/30 disabled:opacity-50"
        >
          ⏸ Пауза
        </button>
        <button
          onClick={reset}
          className="btn bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/30"
        >
          🔄 Сброс
        </button>
        <button
          onClick={addLap}
          disabled={!isRunning}
          className="btn bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/30 disabled:opacity-50"
        >
          ⏱ Круг
        </button>
      </div>
      
      {/* Список кругов */}
      <div className="bg-black/30 rounded-xl p-4 max-h-48 overflow-y-auto scrollbar-custom">
        <h3 className="text-white text-sm font-semibold mb-2">📋 Круги</h3>
        <ul className="text-gray-300 text-sm">
          {laps.length === 0 ? (
            <li className="text-gray-500 text-center py-4">Нет кругов</li>
          ) : (
            laps.map((lap) => (
              <li
                key={lap.id}
                className="py-1.5 px-2 border-b border-white/10 font-mono"
              >
                Круг {lap.number}: {lap.time}
              </li>
            ))
          )}
        </ul>
      </div>
      
      {/* Активные плагины индикатор */}
      {activePlugins.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 justify-center">
          {activePlugins.map(plugin => (
            <span
              key={plugin.id}
              className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1"
            >
              {plugin.icon} {plugin.name}
            </span>
          ))}
        </div>
      )}
      
      {/* Горячие клавиши */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <small className="text-gray-400 text-xs">
          ⌨️ Пробел (Старт/Пауза) | R (Сброс) | L (Круг)
        </small>
      </div>
      
      <Footer />
    </div>
  );
};

export default Stopwatch;