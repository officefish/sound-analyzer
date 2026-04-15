// src/modules/Library/components/AudioPlayerWithHistogram.tsx

import React, { useState, useEffect, useRef
  //, useCallback 
} from 'react';
import { AudioFile } from '../../../types/audioLibrary';
import { audioLibrary } from '../../../lib/audioLibrary';
import { audioPlayback } from '../../../services/AudioPlaybackService';

interface AudioPlayerWithHistogramProps {
  onPlay?: (file: AudioFile) => void;
  onStop?: () => void;
}

const AudioPlayerWithHistogram: React.FC<AudioPlayerWithHistogramProps> = ({
  onPlay,
  onStop,
}) => {
  const [currentFile, setCurrentFile] = useState<AudioFile | null>(null);
  const [trackName, setTrackName] = useState<string>('Нет трека');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const [playedBarsCount, setPlayedBarsCount] = useState<number>(0);
  
  const histogramContainerRef = useRef<HTMLDivElement | null>(null);

  // Подписка на изменения состояния воспроизведения
  useEffect(() => {
    // В компоненте AudioPlayerWithHistogram, добавим эффект для отслеживания currentTime

    // Уже есть useEffect для подписки на statechange, он должен обновлять playedBarsCount.
    // Проверим, что в handleStateChange правильно обновляется playedBarsCount:

    const handleStateChange = (state: any) => {
      console.log('🎵 Player state changed:', state);
      
      if (state.currentFile) {
        setCurrentFile(state.currentFile);
        setTrackName(state.currentFile.name.length > 42 
          ? state.currentFile.name.slice(0, 39) + '...' 
          : state.currentFile.name);
        setIsPlaying(state.isPlaying);
        setCurrentTime(state.currentTime);
        setDuration(state.duration);
        
        // Синхронизируем playedBarsCount из состояния
        if (amplitudes.length > 0 && state.duration > 0) {
          const progressRatio = state.currentTime / state.duration;
          const played = Math.floor(progressRatio * amplitudes.length);
          setPlayedBarsCount(Math.min(amplitudes.length, Math.max(0, played)));
        }
        
        if (state.isPlaying) {
          onPlay?.(state.currentFile);
        }
      } else {
        setCurrentFile(null);
        setTrackName('Нет трека');
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setPlayedBarsCount(0);
        onStop?.();
      }
    };

    const handleStop = () => {
      setCurrentFile(null);
      setTrackName('Нет трека');
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setPlayedBarsCount(0);
      onStop?.();
    };

    audioPlayback.on('statechange', handleStateChange);
    audioPlayback.on('stop', handleStop);
    audioPlayback.on('ended', handleStop);

    return () => {
      audioPlayback.off('statechange', handleStateChange);
      audioPlayback.off('stop', handleStop);
      audioPlayback.off('ended', handleStop);
    };
  }, [amplitudes.length, onPlay, onStop]);

  // Загрузка амплитуд при смене файла
  useEffect(() => {
    if (!currentFile) {
      setAmplitudes([]);
      return;
    }

    const loadAmplitudes = async () => {
      try {
        let blob: Blob;
        if (currentFile.blob) {
          blob = currentFile.blob;
        } else if (currentFile.path) {
          const url = await audioLibrary.getFileUrl(currentFile);
          const response = await fetch(url);
          blob = await response.blob();
          audioLibrary.revokeUrl(url);
        } else {
          throw new Error('No audio data');
        }

        const computedAmplitudes = await computeAmplitudesFromBlob(blob);
        setAmplitudes(computedAmplitudes);
      } catch (err) {
        console.error('Ошибка при анализе аудио:', err);
        setAmplitudes([]);
      }
    };

    loadAmplitudes();
  }, [currentFile]);

  // Получение амплитуд из аудиофайла
  const computeAmplitudesFromBlob = async (blob: Blob): Promise<number[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const decoded = await audioContext.decodeAudioData(arrayBuffer);
          const rawData = decoded.getChannelData(0);
          const targetBars = 200;
          const samplesPerBar = Math.floor(rawData.length / targetBars);
          
          if (samplesPerBar < 1) {
            const shortBars = Array.from(rawData).map(v => Math.min(1.0, Math.abs(v) * 1.5));
            resolve(shortBars);
            audioContext.close();
            return;
          }
          
          const bars: number[] = [];
          for (let i = 0; i < targetBars; i++) {
            let start = i * samplesPerBar;
            let end = start + samplesPerBar;
            if (end > rawData.length) end = rawData.length;
            let maxAmp = 0;
            for (let s = start; s < end; s++) {
              const val = Math.abs(rawData[s]);
              if (val > maxAmp) maxAmp = val;
            }
            let normalized = Math.min(1.0, maxAmp * 1.25);
            bars.push(normalized);
          }
          
          // Сглаживание
          for (let i = 1; i < bars.length - 1; i++) {
            bars[i] = (bars[i - 1] + bars[i] + bars[i + 1]) / 3;
          }
          
          audioContext.close();
          resolve(bars);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  };

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
        // Обновляем локально для мгновенного отклика
        const played = Math.min(amplitudes.length, Math.max(0, index + 1));
        setPlayedBarsCount(played);
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
          // Обновляем локально для мгновенного отклика
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

  const progressPercent = amplitudes.length > 0 
  ? (playedBarsCount / amplitudes.length) * 100 
  : 0;

  return (
    <div className="bg-base-200 rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm text-primary">Сейчас играет</div>
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
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none 
              [&::-webkit-slider-thumb]:w-3 
              [&::-webkit-slider-thumb]:h-3 
              [&::-webkit-slider-thumb]:rounded-full 
              [&::-webkit-slider-thumb]:bg-primary 
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      </div>
      
      <div className="waveform-dom-container">
        <div 
          className="histogram-bars relative h-44 flex items-end gap-0.5 cursor-pointer" 
          ref={histogramContainerRef}
          onClick={handleContainerClick}
        >
          {amplitudes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
              🎧 Выберите трек, чтобы увидеть гистограмму
            </div>
          ) : (
            amplitudes.map((amp, idx) => {
              const height = Math.min(1.0, amp * 1.15) * 170;
              const isPlayed = idx < playedBarsCount;
              return (
                <span
                  key={idx}
                  className={`flex-1 rounded-t-sm transition-all duration-75 cursor-pointer hover:scale-y-110 ${
                    isPlayed 
                      ? 'bg-primary shadow-[0_0_4px_rgba(var(--primary),0.5)]' 
                      : 'bg-base-300'
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
      
      <div className="text-center text-[10px] text-info mt-3">
        ✨ Наведи на столбец — он подсвечивается | Клик — перемотка | Цветные = прослушано
      </div>
    </div>
  );
};

export default AudioPlayerWithHistogram;