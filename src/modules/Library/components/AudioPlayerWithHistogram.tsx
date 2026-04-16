// src/modules/Library/components/AudioPlayerWithHistogram.tsx

import React, { useState, useEffect, useRef } from 'react';
import { AudioFile } from '../../../types/audioLibrary';
import { audioPlayback } from '../../../services/AudioPlaybackService';
import { useAudioLibrary } from '../../../hooks/useAudioLibrary';

interface AudioPlayerWithHistogramProps {
  onPlay?: (file: AudioFile) => void;
  onStop?: () => void;
}

const AudioPlayerWithHistogram: React.FC<AudioPlayerWithHistogramProps> = ({
  onPlay,
  onStop,
}) => {
  const { isElectron } = useAudioLibrary();
  const [currentFile, setCurrentFile] = useState<AudioFile | null>(null);
  const [trackName, setTrackName] = useState<string>('Нет трека');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const [playedBarsCount, setPlayedBarsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMetadataLoaded, setIsMetadataLoaded] = useState<boolean>(false);
  
  const histogramContainerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Прогресс вычисляем напрямую
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Анимация обновления времени (только после загрузки метаданных)
  useEffect(() => {
    if (!isPlaying || !isMetadataLoaded) return;
    
    const updateTime = () => {
      const newTime = audioPlayback.getCurrentTime();
      const newDuration = audioPlayback.getDuration();
      setCurrentTime(newTime);
      if (newDuration > 0) {
        setDuration(newDuration);
        if (amplitudes.length > 0) {
          const progressRatio = newTime / newDuration;
          const played = Math.floor(progressRatio * amplitudes.length);
          setPlayedBarsCount(Math.min(amplitudes.length, Math.max(0, played)));
        }
      }
      animationRef.current = requestAnimationFrame(updateTime);
    };
    
    animationRef.current = requestAnimationFrame(updateTime);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, isMetadataLoaded, amplitudes.length]);

  // Подписка на события воспроизведения
  useEffect(() => {
    const handlePlay = async () => {
      const file = audioPlayback.getCurrentFile();
      if (file) {
        setCurrentFile(file);
        setTrackName(file.name.length > 42 ? file.name.slice(0, 39) + '...' : file.name);
        setIsPlaying(true);
        
        // Получаем duration напрямую
        const dur = audioPlayback.getDuration();
        if (dur > 0) {
          setDuration(dur);
          setIsMetadataLoaded(true);
        } else {
          // Если duration ещё не загружена, ждём немного
          setTimeout(() => {
            const newDur = audioPlayback.getDuration();
            if (newDur > 0) {
              setDuration(newDur);
              setIsMetadataLoaded(true);
            }
          }, 100);
        }
        
        onPlay?.(file);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleStop = () => {
      setCurrentFile(null);
      setTrackName('Нет трека');
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setPlayedBarsCount(0);
      setIsMetadataLoaded(false);
      onStop?.();
    };

    const handleLoadedMetadata = ({ duration: dur }: { duration: number }) => {
      setDuration(dur);
      setIsMetadataLoaded(true);
    };

    audioPlayback.on('play', handlePlay);
    audioPlayback.on('pause', handlePause);
    audioPlayback.on('stop', handleStop);
    audioPlayback.on('loadedmetadata', handleLoadedMetadata);

    return () => {
      audioPlayback.off('play', handlePlay);
      audioPlayback.off('pause', handlePause);
      audioPlayback.off('stop', handleStop);
      audioPlayback.off('loadedmetadata', handleLoadedMetadata);
    };
  }, [onPlay, onStop]);

  // Загрузка волны через сервис
  useEffect(() => {
    if (!currentFile) {
      setAmplitudes([]);
      return;
    }

    const loadWaveform = async () => {
      setIsLoading(true);
      const waveform = await audioPlayback.generateWaveform(currentFile, 200);
      setAmplitudes(waveform);
      setIsLoading(false);
    };

    loadWaveform();
  }, [currentFile]);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePlayPause = () => {
    if (currentFile && isPlaying) {
      audioPlayback.pause();
    } else if (currentFile && !isPlaying) {
      audioPlayback.resume();
    }
  };

  const handleBarClick = (index: number) => {
    if (currentFile && duration > 0 && amplitudes.length > 0) {
      const seekRatio = index / amplitudes.length;
      const newTime = seekRatio * duration;
      if (isFinite(newTime)) {
        audioPlayback.seek(newTime);
        setPlayedBarsCount(index + 1);
      }
    }
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === histogramContainerRef.current || (e.target as HTMLElement).classList?.contains('histogram-bars')) {
      if (currentFile && duration > 0 && histogramContainerRef.current && amplitudes.length > 0) {
        const rect = histogramContainerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        let ratio = Math.min(0.999, Math.max(0, clickX / rect.width));
        const newTime = ratio * duration;
        if (isFinite(newTime)) {
          audioPlayback.seek(newTime);
          const played = Math.floor(ratio * amplitudes.length);
          setPlayedBarsCount(Math.min(amplitudes.length, Math.max(0, played)));
        }
      }
    }
  };

  const rewindTen = () => {
    if (currentFile && duration > 0) {
      let newTime = currentTime - 10;
      if (newTime < 0) newTime = 0;
      audioPlayback.seek(newTime);
    }
  };

  const forwardTen = () => {
    if (currentFile && duration > 0) {
      let newTime = currentTime + 10;
      if (newTime > duration) newTime = duration;
      audioPlayback.seek(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    const audio = document.querySelector('audio');
    if (audio) audio.volume = newVolume;
  };

  return (
    <div className="bg-base-200 rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm text-base-content/50">Сейчас играет</div>
          <div className="font-medium text-base-content truncate">
            🎵 {trackName}
          </div>
        </div>
        <div className="volume-slider flex items-center gap-2">
          <span className="text-sm">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
      
      <div className="waveform-dom-container">
        <div 
          className="histogram-bars relative h-44 flex items-end gap-0.5 cursor-pointer" 
          ref={histogramContainerRef}
          onClick={handleContainerClick}
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
              <div className="animate-pulse">🎵 Загрузка波形...</div>
            </div>
          ) : amplitudes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
              🎧 Выберите трек, чтобы увидеть гистограмму
            </div>
          ) : (
            amplitudes.map((amp, idx) => {
              const height = amp * 170;
              const isPlayed = idx < playedBarsCount;
              return (
                <span
                  key={idx}
                  className={`flex-1 rounded-t-sm transition-all duration-75 cursor-pointer hover:scale-y-110 hover:brightness-110 ${
                    isPlayed ? 'bg-primary' : 'bg-primary/20'
                  }`}
                  style={{ height: `${Math.max(4, height)}px` }}
                  onClick={() => handleBarClick(idx)}
                  data-index={idx}
                />
              );
            })
          )}
        </div>
        
        <div className="relative mt-2">
          <div className="h-1 bg-base-300 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        
        <div className="flex justify-between text-xs text-base-content/50 mt-2">
          <span>🎵 {formatTime(currentTime)}</span>
          <span>⏵ {Math.floor(progressPercent)}%</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          className="w-10 h-10 rounded-full bg-base-300 hover:bg-base-400 transition-colors flex items-center justify-center"
          onClick={rewindTen}
          title="Назад 10 сек"
        >
          ⏪
        </button>
        <button
          className="w-14 h-14 rounded-full bg-primary text-primary-content hover:bg-primary/90 transition-colors flex items-center justify-center text-2xl"
          onClick={handlePlayPause}
          disabled={!currentFile}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          className="w-10 h-10 rounded-full bg-base-300 hover:bg-base-400 transition-colors flex items-center justify-center"
          onClick={forwardTen}
          title="Вперёд 10 сек"
        >
          ⏩
        </button>
      </div>
      
      <div className="text-center text-[10px] text-base-content/40 mt-3">
        ✨ Наведи на столбец — он подсвечивается | Клик — перемотка | Цветные = прослушано
      </div>
      
      {isElectron && amplitudes.length > 0 && (
        <div className="text-center text-[9px] text-base-content/30 mt-2">
          🎵 Визуализация — демонстрационная (псевдо-волна)
        </div>
      )}
    </div>
  );
};

export default AudioPlayerWithHistogram;