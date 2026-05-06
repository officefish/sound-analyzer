import React, { useState, useEffect, useRef } from 'react';
import { AudioFile } from '../../../../types/audioLibrary';
import { audioPlayback } from '../../../../services/AudioPlaybackService';
import { useAudioLibrary } from '../../../../hooks/useAudioLibrary';
import WaveformRenderer from './WaveformRenderer';

interface AudioPlayerWithHistogramProps {
  currentFile: AudioFile | null;
  onPlay?: (file: AudioFile) => void;
  onStop?: () => void;
}

const AudioPlayerWithHistogram: React.FC<AudioPlayerWithHistogramProps> = ({
  currentFile,
  onPlay,
  onStop,
}) => {
  const { isElectron } = useAudioLibrary();
  const [trackName, setTrackName] = useState<string>('Нет трека');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Preloader состояние
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const [playedBarsCount, setPlayedBarsCount] = useState<number>(0);
  const [isWaveformLoading, setIsWaveformLoading] = useState<boolean>(false);
  const [isFileReady, setIsFileReady] = useState<boolean>(false);
  
  const histogramContainerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const previousFileIdRef = useRef<string | null>(null);
  const preloadTimeoutRef = useRef<number | null>(null);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ✅ Предзагрузка файла и waveform
  const preloadFile = async (file: AudioFile) => {
    if (!file) return;
    
    // Если тот же файл, не перезагружаем
    if (previousFileIdRef.current === file.id && isFileReady) {
      return;
    }
    
    setIsLoading(true);
    setIsFileReady(false);
    
    try {
      // Загружаем waveform (это может занять время)
      setIsWaveformLoading(true);
      const waveform = await audioPlayback.generateWaveform(file, 200);
      setAmplitudes(waveform);
      setIsWaveformLoading(false);
      
      // Предзагружаем аудио в память (через создание скрытого Audio элемента)
      const preloadAudio = new Audio();
      const blob = file.blob || await loadBlobFromPath(file.path);
      if (blob) {
        const url = URL.createObjectURL(blob);
        preloadAudio.src = url;
        preloadAudio.load(); // Принудительно загружаем
        preloadAudio.oncanplaythrough = () => {
          URL.revokeObjectURL(url);
          setIsFileReady(true);
          setIsLoading(false);
          setTrackName(file.name.length > 42 ? file.name.slice(0, 39) + '...' : file.name);
        };
        preloadAudio.onerror = () => {
          URL.revokeObjectURL(url);
          setIsLoading(false);
          setIsFileReady(false);
        };
        
        // Таймаут на случай долгой загрузки
        preloadTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          setIsFileReady(true); // Всё равно пытаемся играть
        }, 3000);
      } else {
        throw new Error('Cannot load blob');
      }
      
    } catch (error) {
      console.error('Failed to preload file:', error);
      setIsLoading(false);
      setIsFileReady(true); // Пытаемся играть даже если не загрузилось
    }
  };

  // Вспомогательная функция загрузки blob
  const loadBlobFromPath = async (path?: string): Promise<Blob | null> => {
    if (!path) return null;
    try {
      const response = await fetch(path);
      return await response.blob();
    } catch (error) {
      console.error('Failed to load blob from path:', error);
      return null;
    }
  };

  // ✅ При смене файла - предзагружаем
  useEffect(() => {
    if (!currentFile) {
      setAmplitudes([]);
      setTrackName('Нет трека');
      setIsFileReady(false);
      setIsLoading(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      previousFileIdRef.current = null;
      return;
    }

    preloadFile(currentFile);
    
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [currentFile]);

  // Анимация обновления времени
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
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
  }, [isPlaying, amplitudes.length]);

  // Подписка на события воспроизведения
  useEffect(() => {
    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
      const file = audioPlayback.getCurrentFile();
      if (file) {
        onPlay?.(file);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleStop = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setPlayedBarsCount(0);
      onStop?.();
    };

    const handleSeek = ({ time }: { time: number }) => {
      setCurrentTime(time);
      if (duration > 0 && amplitudes.length > 0) {
        const progressRatio = time / duration;
        const played = Math.floor(progressRatio * amplitudes.length);
        setPlayedBarsCount(Math.min(amplitudes.length, Math.max(0, played)));
      }
    };

    const handleLoadedMetadata = ({ duration: dur }: { duration: number }) => {
      setDuration(dur);
    };

    audioPlayback.on('play', handlePlay);
    audioPlayback.on('pause', handlePause);
    audioPlayback.on('stop', handleStop);
    audioPlayback.on('seek', handleSeek);
    audioPlayback.on('loadedmetadata', handleLoadedMetadata);

    return () => {
      audioPlayback.off('play', handlePlay);
      audioPlayback.off('pause', handlePause);
      audioPlayback.off('stop', handleStop);
      audioPlayback.off('seek', handleSeek);
      audioPlayback.off('loadedmetadata', handleLoadedMetadata);
    };
  }, [onPlay, onStop, duration, amplitudes.length]);

  // ✅ Синхронизация UI с плеером
  useEffect(() => {
    if (currentFile) {
      const currentlyPlaying = audioPlayback.getCurrentFile();
      const isThisFilePlaying = currentlyPlaying?.id === currentFile.id;
      
      if (!isThisFilePlaying) {
        // Не этот файл играет, сбрасываем UI
        setIsPlaying(false);
        setCurrentTime(0);
        setPlayedBarsCount(0);
      } else {
        // Этот файл играет, синхронизируем состояние
        setIsPlaying(!audioPlayback.isPaused());
        setCurrentTime(audioPlayback.getCurrentTime());
        const dur = audioPlayback.getDuration();
        if (dur > 0) setDuration(dur);
      }
    }
  }, [currentFile]);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ✅ Улучшенный обработчик play/pause с повторным воспроизведением
  const handlePlayPause = async () => {
    if (!currentFile) return;
    
    const currentlyPlaying = audioPlayback.getCurrentFile();
    const isCurrentFilePlaying = currentlyPlaying?.id === currentFile.id;
    
    // Если играет другой файл или ничего не играет
    if (!isCurrentFilePlaying) {
      setIsLoading(true);
      try {
        await audioPlayback.play(currentFile);
        // После успешного начала воспроизведения, isPlaying обновится через событие
      } catch (error) {
        console.error('Failed to play:', error);
        setIsLoading(false);
      }
    } 
    // Если играет текущий файл
    else if (isPlaying) {
      audioPlayback.pause();
    } 
    // Если файл на паузе
    else if (audioPlayback.isPaused()) {
      audioPlayback.resume();
    }
    // Если файл закончился - начинаем сначала
    else if (currentTime >= duration && duration > 0) {
      setIsLoading(true);
      try {
        await audioPlayback.play(currentFile);
      } catch (error) {
        console.error('Failed to replay:', error);
        setIsLoading(false);
      }
    }
  };

  const handleBarClick = (index: number) => {
    if (currentFile && duration > 0 && amplitudes.length > 0 && isFileReady) {
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
      if (currentFile && duration > 0 && histogramContainerRef.current && amplitudes.length > 0 && isFileReady) {
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
          <div className="font-medium text-base-content truncate flex items-center gap-2">
            🎵 {trackName}
            {isLoading && (
              <span className="loading loading-spinner loading-xs"></span>
            )}
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
          {isWaveformLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-pulse">🎵 Анализ аудио...</div>
                <div className="loading loading-spinner loading-md"></div>
              </div>
            </div>
          ) : amplitudes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
              {currentFile ? '⚡ Обработка волны...' : '🎧 Выберите трек, чтобы увидеть гистограмму'}
            </div>
          ) : (
            <WaveformRenderer
              amplitudes={amplitudes}
              isPlaying={isPlaying}
              playedBarsCount={playedBarsCount}
              onSeek={handleBarClick}
              height={176}
              barWidth={3}
              barGap={1}
              useCanvas={true}
              centerLine={true}
              colorPlayed="#3b82f6"
              colorUnplayed="#3b82f620"
              className="w-full"
            />
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
          className="w-14 h-14 rounded-full bg-primary text-primary-content hover:bg-primary/90 transition-colors flex items-center justify-center text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handlePlayPause}
          disabled={!currentFile || isLoading}
        >
          {isLoading ? (
            <div className="loading loading-spinner loading-md"></div>
          ) : isPlaying ? (
            '⏸'
          ) : (
            '▶'
          )}
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
        ✨ Клик на гистограмму - перемотка | Цветные столбики = прослушано
        {!isFileReady && currentFile && !isLoading && (
          <div className="text-warning mt-1">⏳ Идет загрузка файла...</div>
        )}
      </div>
      
      {isElectron && amplitudes.length > 0 && (
        <div className="text-center text-[9px] text-base-content/30 mt-2">
          🎵 Визуализация аудио-волны
        </div>
      )}
    </div>
  );
};

export default AudioPlayerWithHistogram;

// interface AudioPlayerWithHistogramProps {
//   currentFile: AudioFile | null;  // ✅ получаем извне
//   onPlay?: (file: AudioFile) => void;
//   onStop?: () => void;
// }

// const AudioPlayerWithHistogram: React.FC<AudioPlayerWithHistogramProps> = ({
//   currentFile,  // ✅ принимаем из пропсов
//   onPlay,
//   onStop,
// }) => {
//   const { isElectron } = useAudioLibrary();
//   const [trackName, setTrackName] = useState<string>('Нет трека');
//   const [isPlaying, setIsPlaying] = useState<boolean>(false);
//   const [currentTime, setCurrentTime] = useState<number>(0);
//   const [duration, setDuration] = useState<number>(0);
//   const [volume, setVolume] = useState<number>(0.8);
//   const [amplitudes, setAmplitudes] = useState<number[]>([]);
//   const [playedBarsCount, setPlayedBarsCount] = useState<number>(0);
//   const [isLoadingWaveform, setIsLoadingWaveform] = useState<boolean>(false);
  
//   const histogramContainerRef = useRef<HTMLDivElement | null>(null);
//   const animationRef = useRef<number | null>(null);
//   const previousFileIdRef = useRef<string | null>(null);

//   const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

//   // ✅ Предзагрузка waveform при смене файла (до воспроизведения)
//   useEffect(() => {
//     if (!currentFile) {
//       setAmplitudes([]);
//       setIsLoadingWaveform(false);
//       return;
//     }

//     // Загружаем waveform сразу при выборе файла, не дожидаясь play
//     const preloadWaveform = async () => {
//       // Проверяем, не тот же ли файл
//       if (previousFileIdRef.current === currentFile.id && amplitudes.length > 0) {
//         return;
//       }
      
//       setIsLoadingWaveform(true);
//       try {
//         const waveform = await audioPlayback.generateWaveform(currentFile, 200);
//         setAmplitudes(waveform);
//         previousFileIdRef.current = currentFile.id;
//         setTrackName(currentFile.name.length > 42 ? currentFile.name.slice(0, 39) + '...' : currentFile.name);
//       } catch (error) {
//         console.error('Failed to load waveform:', error);
//         setAmplitudes([]);
//       } finally {
//         setIsLoadingWaveform(false);
//       }
//     };

//     preloadWaveform();
//   }, [currentFile]); // ✅ зависимость от currentFile

//   // Анимация обновления времени
//   useEffect(() => {
//     if (!isPlaying) {
//       if (animationRef.current) {
//         cancelAnimationFrame(animationRef.current);
//         animationRef.current = null;
//       }
//       return;
//     }
    
//     const updateTime = () => {
//       const newTime = audioPlayback.getCurrentTime();
//       const newDuration = audioPlayback.getDuration();
//       setCurrentTime(newTime);
      
//       if (newDuration > 0) {
//         setDuration(newDuration);
//         if (amplitudes.length > 0) {
//           const progressRatio = newTime / newDuration;
//           const played = Math.floor(progressRatio * amplitudes.length);
//           setPlayedBarsCount(Math.min(amplitudes.length, Math.max(0, played)));
//         }
//       }
//       animationRef.current = requestAnimationFrame(updateTime);
//     };
    
//     animationRef.current = requestAnimationFrame(updateTime);
    
//     return () => {
//       if (animationRef.current) {
//         cancelAnimationFrame(animationRef.current);
//         animationRef.current = null;
//       }
//     };
//   }, [isPlaying, amplitudes.length]);

//   // Подписка на события воспроизведения
//   useEffect(() => {
//     const handlePlay = () => {
//       setIsPlaying(true);
//       const file = audioPlayback.getCurrentFile();
//       if (file) {
//         onPlay?.(file);
//       }
//     };

//     const handlePause = () => {
//       setIsPlaying(false);
//     };

//     const handleStop = () => {
//       setIsPlaying(false);
//       setCurrentTime(0);
//       setPlayedBarsCount(0);
//       onStop?.();
//     };

//     const handleSeek = ({ time }: { time: number }) => {
//       setCurrentTime(time);
//       if (duration > 0 && amplitudes.length > 0) {
//         const progressRatio = time / duration;
//         const played = Math.floor(progressRatio * amplitudes.length);
//         setPlayedBarsCount(Math.min(amplitudes.length, Math.max(0, played)));
//       }
//     };

//     audioPlayback.on('play', handlePlay);
//     audioPlayback.on('pause', handlePause);
//     audioPlayback.on('stop', handleStop);
//     audioPlayback.on('seek', handleSeek);

//     return () => {
//       audioPlayback.off('play', handlePlay);
//       audioPlayback.off('pause', handlePause);
//       audioPlayback.off('stop', handleStop);
//       audioPlayback.off('seek', handleSeek);
//     };
//   }, [onPlay, onStop, duration, amplitudes.length]);

//   // ✅ Синхронизация с currentFile извне
//   useEffect(() => {
//     if (currentFile) {
//       const currentlyPlaying = audioPlayback.getCurrentFile();
//       const isThisFilePlaying = currentlyPlaying?.id === currentFile.id;
      
//       if (!isThisFilePlaying) {
//         setIsPlaying(false);
//         setCurrentTime(0);
//         setPlayedBarsCount(0);
//       } else {
//         setIsPlaying(!audioPlayback.isPaused());
//         setCurrentTime(audioPlayback.getCurrentTime());
//         const dur = audioPlayback.getDuration();
//         if (dur > 0) setDuration(dur);
//       }
//     }
//   }, [currentFile]);

//     const formatTime = (seconds: number): string => {
//     if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
//     const mins = Math.floor(seconds / 60);
//     const secs = Math.floor(seconds % 60);
//     return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
//   };

//   const handleBarClick = (index: number) => {
//     if (currentFile && duration > 0 && amplitudes.length > 0) {
//       const seekRatio = index / amplitudes.length;
//       const newTime = seekRatio * duration;
//       if (isFinite(newTime)) {
//         audioPlayback.seek(newTime);
//         setPlayedBarsCount(index + 1);
//       }
//     }
//   };

//   const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
//     if (e.target === histogramContainerRef.current || (e.target as HTMLElement).classList?.contains('histogram-bars')) {
//       if (currentFile && duration > 0 && histogramContainerRef.current && amplitudes.length > 0) {
//         const rect = histogramContainerRef.current.getBoundingClientRect();
//         const clickX = e.clientX - rect.left;
//         let ratio = Math.min(0.999, Math.max(0, clickX / rect.width));
//         const newTime = ratio * duration;
//         if (isFinite(newTime)) {
//           audioPlayback.seek(newTime);
//           const played = Math.floor(ratio * amplitudes.length);
//           setPlayedBarsCount(Math.min(amplitudes.length, Math.max(0, played)));
//         }
//       }
//     }
//   };

//   const rewindTen = () => {
//     if (currentFile && duration > 0) {
//       let newTime = currentTime - 10;
//       if (newTime < 0) newTime = 0;
//       audioPlayback.seek(newTime);
//     }
//   };

//   const forwardTen = () => {
//     if (currentFile && duration > 0) {
//       let newTime = currentTime + 10;
//       if (newTime > duration) newTime = duration;
//       audioPlayback.seek(newTime);
//     }
//   };

//   const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const newVolume = parseFloat(e.target.value);
//     setVolume(newVolume);
//     const audio = document.querySelector('audio');
//     if (audio) audio.volume = newVolume;
//   };

//   const handlePlayPause = () => {
//     if (!currentFile) return;
    
//     const currentlyPlaying = audioPlayback.getCurrentFile();
    
//     // Если сейчас играет другой файл или ничего не играет
//     if (currentlyPlaying?.id !== currentFile.id) {
//       audioPlayback.play(currentFile);  // ✅ гарантированно начинаем с начала
//     } else if (isPlaying) {
//       audioPlayback.pause();
//     } else {
//       audioPlayback.resume();
//     }
//   };

//   return (
//     <div className="bg-base-200 rounded-2xl p-4 mb-6">
      
//       <div className="flex items-center justify-between mb-4">
//          <div className="flex-1">
//            <div className="text-sm text-base-content/50">Сейчас играет</div>
//            <div className="font-medium text-base-content truncate">
//              🎵 {trackName}
//            </div>
//          </div>
//          <div className="volume-slider flex items-center gap-2">
//            <span className="text-sm">🔊</span>
//            <input
//             type="range"
//             min="0"
//             max="1"
//             step="0.01"
//             value={volume}
//             onChange={handleVolumeChange}
//             className="w-24 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
//           />
//         </div>
//       </div>
      
//       <div className="waveform-dom-container">

//         <WaveformRenderer
//           amplitudes={amplitudes}
//           isPlaying={isPlaying}
//           playedBarsCount={playedBarsCount}
//           onSeek={(index) => {
//             if (currentFile && duration > 0 && amplitudes.length > 0) {
//               const seekRatio = index / amplitudes.length;
//               const newTime = seekRatio * duration;
//               audioPlayback.seek(newTime);
//               setPlayedBarsCount(index + 1);
//             }
//           }}
//           height={176}
//           barWidth={3}
//           barGap={1}
//           useCanvas={true}  // true - Canvas (быстрее), false - DOM (гибче)
//           centerLine={true}  // true - зеркальное отображение, false - обычное
//           colorPlayed="#3b82f6"
//           colorUnplayed="#3b82f620"
//           className="mb-2"
//         />  

//          {/* Прогресс-бар */}
//         <div className="relative mt-2">
//           <div className="h-1 bg-base-300 rounded-full overflow-hidden">
//             <div 
//               className="h-full bg-primary rounded-full transition-all duration-100"
//               style={{ width: `${progressPercent}%` }}
//             />
//           </div>
//         </div>

//         {/* <div 
//           className="histogram-bars relative h-44 flex items-end gap-0.5 cursor-pointer" 
//           ref={histogramContainerRef}
//           onClick={handleContainerClick}
//         > */}
//           {/* {isLoadingWaveform ? (
//             <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
//               <div className="animate-pulse">🎵 Загрузка волны...</div>
//             </div>
//           ) : amplitudes.length === 0 ? (
//             <div className="absolute inset-0 flex items-center justify-center text-base-content/50">
//               {currentFile ? '⚡ Обработка аудио...' : '🎧 Выберите трек, чтобы увидеть гистограмму'}
//             </div>
//           ) : (
//             amplitudes.map((amp, idx) => {
//               const height = amp * 170;
//               const isPlayed = idx < playedBarsCount;
//               return (
//                 <span
//                   key={idx}
//                   className={`flex-1 rounded-t-sm transition-all duration-75 cursor-pointer hover:scale-y-110 hover:brightness-110 ${
//                     isPlayed ? 'bg-primary' : 'bg-primary/20'
//                   }`}
//                   style={{ height: `${Math.max(4, height)}px` }}
//                   onClick={() => handleBarClick(idx)}
//                   data-index={idx}
//                 />
//               );
//             })
//           )} */}
//         {/* </div> */}

//           <div className="relative mt-2">
//            <div className="h-1 bg-base-300 rounded-full overflow-hidden">
//              <div 
//                className="h-full bg-primary rounded-full transition-all duration-100"
//                style={{ width: `${progressPercent}%` }}
//              />
//            </div>
//          </div>
        
//          <div className="flex justify-between text-xs text-base-content/50 mt-2">
//            <span>🎵 {formatTime(currentTime)}</span>
//            <span>⏵ {Math.floor(progressPercent)}%</span>
//            <span>{formatTime(duration)}</span>
//          </div>
//        </div>
      
//        <div className="flex items-center justify-center gap-4 mt-4">
//          <button
//            className="w-10 h-10 rounded-full bg-base-300 hover:bg-base-400 transition-colors flex items-center justify-center"
//            onClick={rewindTen}
//            title="Назад 10 сек"
//          >
//            ⏪
//          </button>
//          <button
//            className="w-14 h-14 rounded-full bg-primary text-primary-content hover:bg-primary/90 transition-colors flex items-center justify-center text-2xl"
//            onClick={handlePlayPause}
//            disabled={!currentFile}
//          >
//            {isPlaying ? '⏸' : '▶'}
//          </button>
//          <button
//            className="w-10 h-10 rounded-full bg-base-300 hover:bg-base-400 transition-colors flex items-center justify-center"
//            onClick={forwardTen}
//            title="Вперёд 10 сек"
//          >
//            ⏩
//          </button>
//        </div>
      
//        <div className="text-center text-[10px] text-base-content/40 mt-3">
//          ✨ Наведи на столбец — он подсвечивается | Клик — перемотка | Цветные = прослушано
//        </div>
      
//        {isElectron && amplitudes.length > 0 && (
//          <div className="text-center text-[9px] text-base-content/30 mt-2">
//            🎵 Визуализация — демонстрационная (псевдо-волна)
//          </div>
//        )}
//      </div>
      
//   );
// };

// export default AudioPlayerWithHistogram;
