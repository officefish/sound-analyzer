// src/plugins/microphone2/widgets/RecorderWidget/RecordingStatus.tsx

import React, { useState, useEffect, useRef } from 'react';

interface RecordingStatusProps {
  isRecording: boolean;
  isAutoRecording: boolean;
  onAction: (action: string, data?: any) => any;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const RecordingStatus: React.FC<RecordingStatusProps> = ({ 
  isRecording, 
  isAutoRecording, 
  onAction 
}) => {
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!isRecording) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDuration(0);
      return;
    }
    
    const updateDuration = () => {
      // Используем единый метод для обоих режимов
      const displayTime = onAction('getDisplayTime');
      console.log('📊 updateDuration, displayTime:', displayTime);
      
      if (typeof displayTime === 'number') {
        setDuration(displayTime);
      } else {
        // Fallback: если метод не работает, пробуем getCurrentSegmentTime
        const fallbackTime = onAction('getCurrentSegmentTime');
        if (typeof fallbackTime === 'number') {
          setDuration(fallbackTime);
        }
      }
    };
    
    // Немедленное обновление
    updateDuration();
    
    // Обновляем каждую секунду
    intervalRef.current = window.setInterval(updateDuration, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRecording, isAutoRecording, onAction]);
  
  const getColors = () => {
    if (!isRecording) {
      return {
        bg: 'bg-base-300/50',
        border: 'border-base-300',
        led: 'bg-gray-500',
        text: 'text-gray-500',
      };
    }
    return {
      bg: 'bg-gradient-to-r from-green-500/20 to-green-500/10',
      border: 'border-green-500/30',
      led: 'bg-green-500',
      text: 'text-green-400',
    };
  };
  
  const colors = getColors();
  
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${colors.bg} ${colors.border}`}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${colors.led}`} />
          {isRecording && (
            <>
              <div className={`absolute inset-0 w-3 h-3 rounded-full ${colors.led} animate-ping opacity-75`} />
              <div className={`absolute inset-0 w-3 h-3 rounded-full ${colors.led} animate-pulse`} />
            </>
          )}
        </div>
        
        <div>
          <div className="text-sm font-semibold">
            {isRecording ? (
              <span className={colors.text}>
                {isAutoRecording ? '🔁 АВТОЗАПИСЬ' : '✋ РУЧНАЯ ЗАПИСЬ'}
              </span>
            ) : (
              <span className="text-gray-500">⏹️ ЗАПИСЬ НЕ ВЕДЁТСЯ</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {isRecording 
              ? `Длительность: ${formatDuration(duration)}`
              : 'Готов к записи'}
          </div>
        </div>
      </div>
      
      {isRecording && (
        <div className="text-right">
          <div className={`text-2xl font-mono font-bold ${colors.text}`}>
            {formatDuration(duration)}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(RecordingStatus);