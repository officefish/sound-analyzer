import React, { useEffect, useRef, useState } from 'react';

interface AudioWaveformProps {
  audioUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Реальный анализ аудио через Web Audio API
  useEffect(() => {
    if (!audioUrl) return;

    const analyzeAudio = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Получаем данные одного канала
        const channelData = audioBuffer.getChannelData(0);
        
        // Уменьшаем количество точек для отображения (200 точек)
        const points = 200;
        const blockSize = Math.floor(channelData.length / points);
        const waveform: number[] = [];
        
        for (let i = 0; i < points; i++) {
          const start = i * blockSize;
          const end = start + blockSize;
          let max = 0;
          for (let j = start; j < end && j < channelData.length; j++) {
            const abs = Math.abs(channelData[j]);
            if (abs > max) max = abs;
          }
          waveform.push(Math.min(1, max * 2)); // Нормализация
        }
        
        setWaveformData(waveform);
      } catch (error) {
        console.error('Failed to analyze audio:', error);
        // Fallback: генерируем случайную волну
        const fallback: number[] = [];
        for (let i = 0; i < 200; i++) {
          fallback.push(0.3 + Math.random() * 0.5);
        }
        setWaveformData(fallback);
      } finally {
        setIsLoading(false);
      }
    };

    analyzeAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  // Рисование волны на canvas
  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0 || isLoading) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / waveformData.length;
    const progress = duration > 0 ? currentTime / duration : 0;

    ctx.clearRect(0, 0, width, height);

    waveformData.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * height * 0.8;
      const y = (height - barHeight) / 2;
      const isPlayed = index / waveformData.length <= progress;

      ctx.fillStyle = isPlayed
        ? '#22c55e'  // зелёный для проигранного
        : '#4a5568';  // тёмно-серый для непроигранного

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
  }, [waveformData, currentTime, duration, isLoading]);

  // Анимация при воспроизведении
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx && waveformData.length > 0) {
            const width = canvasRef.current.width;
            const height = canvasRef.current.height;
            const barWidth = width / waveformData.length;
            const progress = duration > 0 ? currentTime / duration : 0;

            ctx.clearRect(0, 0, width, height);

            waveformData.forEach((value, index) => {
              const x = index * barWidth;
              const barHeight = value * height * 0.8;
              const y = (height - barHeight) / 2;
              const isPlayed = index / waveformData.length <= progress;

              ctx.fillStyle = isPlayed ? '#22c55e' : '#4a5568';
              ctx.fillRect(x, y, barWidth - 1, barHeight);
            });
          }
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, waveformData, currentTime, duration]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || !canvasRef.current || duration === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * duration;
    onSeek(newTime);
  };

  if (isLoading) {
    return (
      <div className="h-16 bg-base-300 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-xs text-base-content/50">Загрузка波形...</span>
      </div>
    );
  }

  if (waveformData.length === 0) {
    return (
      <div className="h-16 bg-base-300 rounded-lg flex items-center justify-center">
        <span className="text-xs text-base-content/50">Не удалось загрузить波形</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={64}
      className="w-full h-16 rounded-lg cursor-pointer"
      onClick={handleCanvasClick}
      style={{ display: 'block' }}
    />
  );
};

export default AudioWaveform;