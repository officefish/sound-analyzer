import { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerTrack } from '../types';
import { audioLibraryService } from '../../../services/audio/AudioLibraryService';
import { AudioTrack } from '../../../types/audio';

export const usePlayer = () => {
  const [tracks, setTracks] = useState<PlayerTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const mapToPlayerTrack = useCallback((track: AudioTrack): PlayerTrack => ({
    id: track.id,
    name: track.name,
    duration: track.duration || 0,
    createdAt: new Date(track.createdAt),
    fileSize: track.fileSize || 0,
    source: track,
  }), []);

  const loadTracksFromBuffer = useCallback(() => {
    const buffer = audioLibraryService.getCollections().find((collection) => collection.name === 'Buffer');
    if (!buffer) {
      setTracks([]);
      return;
    }

    const bufferTracks = audioLibraryService.getTracksByCollection(buffer.id);
    setTracks(bufferTracks.map(mapToPlayerTrack));
  }, [mapToPlayerTrack]);

  useEffect(() => {
    loadTracksFromBuffer();

    const reload = () => loadTracksFromBuffer();
    audioLibraryService.on('tracks-updated', reload);
    audioLibraryService.on('collections-updated', reload);

    return () => {
      audioLibraryService.off('tracks-updated', reload);
      audioLibraryService.off('collections-updated', reload);
    };
  }, [loadTracksFromBuffer]);

  // Добавление трека
  const addTrack = useCallback(async (file: File) => {
    try {
      // ✅ Проверяем тип файла
      if (!file.type.startsWith('audio/')) {
        alert('Пожалуйста, выберите аудио файл');
        return null;
      }
      
      const buffer = audioLibraryService.getCollections().find((collection) => collection.name === 'Buffer');
      const savedTrack = await audioLibraryService.addTrack(file, buffer?.id);
      const playerTrack = mapToPlayerTrack(savedTrack);
      loadTracksFromBuffer();
      return playerTrack;
    } catch (error) {
      console.error('Failed to add track:', error);
      alert('Не удалось добавить трек');
      return null;
    }
  }, [loadTracksFromBuffer, mapToPlayerTrack]);

  // Удаление трека
  const removeTrack = useCallback(async (trackId: string) => {
    await audioLibraryService.deleteTrack(trackId);
    loadTracksFromBuffer();
    
    if (currentTrack?.id === trackId) {
      stop();
      setCurrentTrack(null);
    }
  }, [currentTrack, loadTracksFromBuffer]);

  // Воспроизведение трека
  const playTrack = useCallback(async (track: PlayerTrack) => {
    if (!audioRef.current) return;
    
    try {
      // Если другой трек или нет текущего
      if (currentTrack?.id !== track.id) {
        audioRef.current.pause();
        
        const url = await audioLibraryService.getFileUrl(track.source);
        audioRef.current.src = url;
        audioRef.current.load();
        
        // Ждем загрузки
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          
          const onCanPlay = () => {
            clearTimeout(timeout);
            audioRef.current?.removeEventListener('canplaythrough', onCanPlay);
            resolve(null);
          };
          
          audioRef.current?.addEventListener('canplaythrough', onCanPlay);
        });
        
        audioRef.current.currentTime = 0;
        setCurrentTrack(track);
        setCurrentTime(0);
        
      }
      
      // Воспроизводим
      await audioRef.current.play();
      setIsPlaying(true);
      
    } catch (error) {
      console.error('Failed to play track:', error);
      alert('Не удалось воспроизвести трек');
    }
  }, [currentTrack]);

  const getTrackExportUrl = useCallback(async (track: PlayerTrack) => {
    return audioLibraryService.getFileUrl(track.source);
  }, []);

  // Пауза
  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  // Продолжить
  const resume = useCallback(() => {
    if (audioRef.current && !isPlaying && currentTrack) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(error => console.error('Failed to resume:', error));
    }
  }, [isPlaying, currentTrack]);

  // Стоп
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

  // Перемотка
  const seek = useCallback((time: number) => {
    if (audioRef.current && currentTrack) {
      const newTime = Math.max(0, Math.min(time, currentTrack.duration));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [currentTrack]);

  // Изменение громкости
  const changeVolume = useCallback((newVolume: number) => {
    const vol = Math.max(0, Math.min(1, newVolume));
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  }, []);

  // Обновление времени
  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current && isPlaying) {
        setCurrentTime(audioRef.current.currentTime);
        animationRef.current = requestAnimationFrame(updateTime);
      }
    };
    
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateTime);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Инициализация аудио элемента
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };
    
    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    tracks,
    currentTrack,
    isPlaying,
    currentTime,
    volume,
    addTrack,
    removeTrack,
    playTrack,
    pause,
    resume,
    stop,
    seek,
    changeVolume,
    getTrackExportUrl,
  };
};