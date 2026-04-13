// src/plugins/microphone2/widgets/RecorderWidget/AutoRecordingProgress.tsx

import React, { useState, useEffect, useRef } from 'react';

interface AutoRecordingProgressProps {
  isRecording: boolean;
  isAutoRecording: boolean;
  intervalSeconds: number;
  onAction: (action: string, data?: any) => any;
}

const AutoRecordingProgress: React.FC<AutoRecordingProgressProps> = ({ 
  isRecording, 
  isAutoRecording, 
  intervalSeconds,
  onAction,
}) => {
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(intervalSeconds);
  const [currentTime, setCurrentTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  
  // Функция обновления прогресса
  const updateProgress = () => {
    if (!isRecording || !isAutoRecording) {
      setProgress(0);
      setRemaining(intervalSeconds);
      setCurrentTime(0);
      return;
    }
    
    // Получаем актуальные данные из плагина
    const newProgress = onAction('getCurrentSegmentProgress');
    const newRemaining = onAction('getRemainingTime');
    const newCurrentTime = onAction('getCurrentSegmentTime');
    
    if (typeof newProgress === 'number') setProgress(newProgress);
    if (typeof newRemaining === 'number') setRemaining(newRemaining);
    if (typeof newCurrentTime === 'number') setCurrentTime(newCurrentTime);
    
    // Продолжаем анимацию
    animationRef.current = requestAnimationFrame(updateProgress);
  };
  
  useEffect(() => {
    if (isRecording && isAutoRecording) {
      updateProgress();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setProgress(0);
      setRemaining(intervalSeconds);
      setCurrentTime(0);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isRecording, isAutoRecording, intervalSeconds]);
  
  if (!isRecording || !isAutoRecording) return null;
  
  // Форматирование времени
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}м ${secs}с`;
    }
    return `${secs}с`;
  };
  
  return (
    <div className="space-y-2 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">📀 Прогресс сохранения</span>
        <span className="text-primary font-mono font-bold">
          {progress}%
        </span>
      </div>
      
      <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse" />
        </div>
      </div>
      
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>Начало сегмента</span>
        <span className="text-primary font-mono">
          {formatTime(remaining)}
        </span>
        <span>Сохранение</span>
      </div>
      
      <div className="text-center text-[9px] text-gray-500">
        Текущий сегмент: {formatTime(currentTime)} / {formatTime(intervalSeconds)}
      </div>
    </div>
  );
};

export default React.memo(AutoRecordingProgress);