import { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerTrack } from '../types';

export const usePlayer = () => {
  const [tracks, setTracks] = useState<PlayerTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Загрузка треков из буфера (localStorage или IndexedDB)
  useEffect(() => {
    loadTracksFromBuffer();
  }, []);

  const loadTracksFromBuffer = async () => {
    try {
      // Загружаем из localStorage
      const savedTracks = localStorage.getItem('player_tracks');
      
      // ✅ Проверяем, есть ли сохраненные треки
      if (!savedTracks) {
        console.log('No saved tracks found');
        setTracks([]);
        return;
      }
      
      const trackData = JSON.parse(savedTracks);
      
      // ✅ Проверяем, что данные не пустые
      if (!trackData || !Array.isArray(trackData) || trackData.length === 0) {
        console.log('Empty tracks data');
        setTracks([]);
        return;
      }
      
      // Восстанавливаем Blob из base64 или URL
      const restoredTracks: PlayerTrack[] = [];
      
      for (const track of trackData) {
        try {
          // ✅ Проверяем существование blobUrl
          if (!track.blobUrl) {
            console.warn(`No blobUrl for track ${track.id}`);
            continue;
          }
          
          // Пытаемся загрузить blob
          const response = await fetch(track.blobUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch blob for track ${track.id}`);
            continue;
          }
          
          const blob = await response.blob();
          
          restoredTracks.push({
            id: track.id,
            name: track.name,
            blob: blob,
            duration: track.duration || 0,
            createdAt: new Date(track.createdAt),
            fileSize: track.fileSize || blob.size
          });
        } catch (error) {
          console.error(`Error restoring track ${track.id}:`, error);
          // Пропускаем проблемный трек
          continue;
        }
      }
      
      setTracks(restoredTracks);
      
      // ✅ Очищаем localStorage если все треки были повреждены
      if (restoredTracks.length === 0 && trackData.length > 0) {
        localStorage.removeItem('player_tracks');
      }
      
    } catch (error) {
      console.error('Failed to load tracks:', error);
      // ✅ В случае ошибки очищаем состояние
      setTracks([]);
      localStorage.removeItem('player_tracks');
    }
  };

  // Сохранение треков в буфер
  const saveTracksToBuffer = useCallback(async (newTracks: PlayerTrack[]) => {
    try {
      // ✅ Если треков нет, очищаем localStorage
      if (!newTracks || newTracks.length === 0) {
        localStorage.removeItem('player_tracks');
        setTracks([]);
        return;
      }
      
      // Конвертируем Blob в URL для хранения
      const tracksForStorage = await Promise.all(
        newTracks.map(async (track) => {
          // ✅ Создаем временный URL для blob
          const blobUrl = URL.createObjectURL(track.blob);
          
          return {
            id: track.id,
            name: track.name,
            blobUrl: blobUrl,
            duration: track.duration,
            createdAt: track.createdAt.toISOString(),
            fileSize: track.fileSize
          };
        })
      );
      
      localStorage.setItem('player_tracks', JSON.stringify(tracksForStorage));
      setTracks(newTracks);
      
      // ✅ Очищаем URL через некоторое время (они нужны для загрузки)
      setTimeout(() => {
        tracksForStorage.forEach(track => {
          URL.revokeObjectURL(track.blobUrl);
        });
      }, 1000);
      
    } catch (error) {
      console.error('Failed to save tracks:', error);
    }
  }, []);

  // Добавление трека
  const addTrack = useCallback(async (file: File) => {
    try {
      // ✅ Проверяем тип файла
      if (!file.type.startsWith('audio/')) {
        alert('Пожалуйста, выберите аудио файл');
        return null;
      }
      
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      
      // Получаем длительность
      const duration = await getAudioDuration(blob);
      
      const newTrack: PlayerTrack = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        name: file.name,
        blob: blob,
        duration: duration,
        createdAt: new Date(),
        fileSize: file.size
      };
      
      const updatedTracks = [newTrack, ...tracks];
      await saveTracksToBuffer(updatedTracks);
      
      return newTrack;
    } catch (error) {
      console.error('Failed to add track:', error);
      alert('Не удалось добавить трек');
      return null;
    }
  }, [tracks, saveTracksToBuffer]);

  // Получение длительности аудио
  const getAudioDuration = (blob: Blob): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(blob);
      
      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.removeEventListener('loadedmetadata', onLoad);
        audio.removeEventListener('error', onError);
      };
      
      const onLoad = () => {
        const duration = audio.duration;
        cleanup();
        resolve(isNaN(duration) ? 0 : duration);
      };
      
      const onError = () => {
        cleanup();
        resolve(0);
      };
      
      audio.addEventListener('loadedmetadata', onLoad);
      audio.addEventListener('error', onError);
      audio.src = url;
      
      // Таймаут на всякий случай
      setTimeout(() => {
        cleanup();
        resolve(0);
      }, 5000);
    });
  };

  // Удаление трека
  const removeTrack = useCallback(async (trackId: string) => {
    const updatedTracks = tracks.filter(t => t.id !== trackId);
    await saveTracksToBuffer(updatedTracks);
    
    if (currentTrack?.id === trackId) {
      stop();
      setCurrentTrack(null);
    }
  }, [tracks, currentTrack, saveTracksToBuffer]);

  // Воспроизведение трека
  const playTrack = useCallback(async (track: PlayerTrack) => {
    if (!audioRef.current) return;
    
    try {
      // Если другой трек или нет текущего
      if (currentTrack?.id !== track.id) {
        audioRef.current.pause();
        
        // ✅ Создаем новый URL для blob
        const url = URL.createObjectURL(track.blob);
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
        
        // Очищаем старый URL
        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
      
      // Воспроизводим
      await audioRef.current.play();
      setIsPlaying(true);
      
    } catch (error) {
      console.error('Failed to play track:', error);
      alert('Не удалось воспроизвести трек');
    }
  }, [currentTrack]);

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
    changeVolume
  };
};