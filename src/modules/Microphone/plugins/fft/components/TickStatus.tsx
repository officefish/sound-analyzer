// src/plugins/microphone2/widgets/TickStatus.tsx

import React from 'react';
import { TickState } from '../DetectorFFTPlugin';


interface TickStatusProps {
  total: number;
  completed: number;
  states: TickState[];
  currentTick: number;
  isActive: boolean;
}

const TickStatus: React.FC<TickStatusProps> = ({
  total,
  completed,
  states,
  currentTick,
  isActive,
}) => {
  const getTickStyle = (index: number): string => {
    const state = states[index];    
    const isCurrent = index === currentTick && isActive;
    
    // ✅ Drone — полная заливка
    if (state === 'drone') {
        return 'bg-primary border-primary shadow-sm shadow-primary/30 text-primary-content';
    }
    
    // ✅ Passed — только рамка (не залит)
    if (state === 'passed') {
        return 'bg-base-300 border-2 border-primary text-base-content';
    }
    
    // ✅ Текущий такт (pending и активный)
    if (isCurrent) {
        return 'bg-primary/30 border border-primary/50 animate-pulse text-base-content';
    }
    
    // ✅ Обычный pending
    return 'bg-base-300 border border-base-300 text-base-content/50';
    };
  
  const getTickLabel = (index: number): string => {
    const state = states[index];
    if (state === 'drone') return '🚁';
    if (state === 'passed') return '✓';
    return `${index + 1}`;
  };
  
  return (
    <div className="flex gap-1 justify-center">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`
            w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono transition-all duration-300
            ${getTickStyle(index)}
          `}
          title={
            states[index] === 'drone' ? 'Дрон обнаружен' :
            states[index] === 'passed' ? 'Тест пройден' :
            index < completed ? 'Ожидание анализа' :
            index === currentTick ? 'Текущий такт' :
            'Ожидание'
          }
        >
          {getTickLabel(index)}
        </div>
      ))}
    </div>
  );
};

export default React.memo(TickStatus);