import React, { useEffect, useRef, useState } from 'react';
import { AudioFile } from '../../../types/audioLibrary';
import { audioLibrary } from '../../../lib/audioLibrary';

interface AudioWaveformMiniProps {
  file: AudioFile;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
}

const AudioWaveformMini: React.FC<AudioWaveformMiniProps> = ({
  file,
  isPlaying,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Загрузка и анализ аудио
  useEffect(() => {
    const loadAudio = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = await audioLibrary.getFileUrl(file);
        if (!url) {
          throw new Error('Failed to get audio URL');
        }
        blobUrlRef.current = url;

        // Создаём audio элемент для воспроизведения
        const audio = new Audio();
        audio.src = url;
        audio.preload = 'metadata';
        
        // Ожидаем загрузки метаданных
        await new Promise((resolve, reject) => {
          audio.addEventListener('loadedmetadata', resolve, { once: true });
          audio.addEventListener('error', reject, { once: true });
        });

        audioRef.current = audio;
        setDuration(audio.duration);

        // Получаем waveform через Web Audio API
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);

        // Уменьшаем количество точек (80 для компактного отображения)
        const points = 80;
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
          waveform.push(Math.min(1, max * 2));
        }

        setWaveformData(waveform);
        audioContext.close();

        // Обновление времени
        const updateTime = () => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        };
        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('ended', () => {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }
        });

      } catch (err) {
        console.error('Failed to load waveform:', err);
        setError('Не удалось загрузить波形');
        // Fallback: случайная волна
        const fallback: number[] = [];
        for (let i = 0; i < 80; i++) {
          fallback.push(0.3 + Math.random() * 0.5);
        }
        setWaveformData(fallback);
        setDuration(30); // фейковая длительность
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [file]);

  // Управление воспроизведением
  useEffect(() => {
    if (!audioRef.current) return;

    const playAudio = async () => {
      try {
        if (isPlaying) {
          await audioRef.current!.play();
          // Анимация прогресса
          const animate = () => {
            if (canvasRef.current && audioRef.current) {
              drawWaveform();
            }
            animationRef.current = requestAnimationFrame(animate);
          };
          animate();
        } else {
          audioRef.current!.pause();
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }
          drawWaveform();
        }
      } catch (err) {
        console.error('Playback error:', err);
        setError('Ошибка воспроизведения');
      }
    };

    playAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const drawWaveform = () => {
    if (!canvasRef.current || waveformData.length === 0) return;

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

      ctx.fillStyle = isPlayed ? '#22c55e' : '#4a5568';
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
  };

  useEffect(() => {
    if (!isLoading && waveformData.length > 0) {
      drawWaveform();
    }
  }, [waveformData, isLoading, currentTime, duration]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || !canvasRef.current || duration === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, x / rect.width));
    const newTime = percent * duration;
    onSeek(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="h-10 bg-base-300/50 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-[10px] text-base-content/50">Загрузка...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-10 bg-error/10 rounded-lg flex items-center justify-center">
        <span className="text-[10px] text-error">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <canvas
        ref={canvasRef}
        width={800}
        height={40}
        className="w-full h-10 rounded-lg cursor-pointer"
        onClick={handleCanvasClick}
      />
      <div className="flex justify-between text-[10px] text-base-content/50">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default AudioWaveformMini;