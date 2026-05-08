// src/modules/Library/hooks/useAlternateAudioLibrary.ts
import { useEffect, useState, useCallback } from 'react';
import { audioLibraryService } from '../services/audio/AudioLibraryService';
import type { AudioTrack, AudioCollection } from '../types/audio';

export const useAlternateAudioLibrary = () => {
  const [collections, setCollections] = useState<AudioCollection[]>([]);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка начальных данных
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setCollections(audioLibraryService.getCollections());
        setTracks(audioLibraryService.getTracks());
        setIsElectron(audioLibraryService.isElectron());
        
        // Устанавливаем Buffer как активную коллекцию по умолчанию
        const bufferCollection = audioLibraryService.getCollections().find(c => c.name === 'Buffer');
        if (bufferCollection) {
          setActiveCollectionId(bufferCollection.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load library');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();

    // Подписка на обновления
    const handleCollectionsUpdate = (updatedCollections: AudioCollection[]) => {
      setCollections(updatedCollections);
    };
    
    const handleTracksUpdate = (updatedTracks: AudioTrack[]) => {
      setTracks(updatedTracks);
    };
    
    audioLibraryService.on('collections-updated', handleCollectionsUpdate);
    audioLibraryService.on('tracks-updated', handleTracksUpdate);
    
    return () => {
      audioLibraryService.off('collections-updated', handleCollectionsUpdate);
      audioLibraryService.off('tracks-updated', handleTracksUpdate);
    };
  }, []);

  // Добавим forceRefresh метод

    const [refreshTrigger, setRefreshTrigger] = useState(0);

        // Добавим forceRefresh функцию
        const forceRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
        setCollections(audioLibraryService.getCollections());
        setTracks(audioLibraryService.getTracks());
        }, []);

        // Обновляем addFiles
    const addFiles = useCallback(async (files: FileList | File[], targetCollectionId?: string) => {
    const collectionId = targetCollectionId || activeCollectionId;
    if (!collectionId) {
        throw new Error('No collection selected');
    }
    
    const addedTracks: AudioTrack[] = [];
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    
    for (const file of fileArray) {
        // ✅ Проверяем аудио формат по расширению
        const isAudio = file.type.startsWith('audio/') || 
                        /\.(mp3|wav|ogg|webm|m4a|flac|aac|opus)$/i.test(file.name);
        
        if (isAudio) {
        try {
            const track = await audioLibraryService.addTrack(file, collectionId);
            addedTracks.push(track);
        } catch (err) {
            console.error(`Failed to add file ${file.name}:`, err);
            setError(`Failed to add ${file.name}`);
        }
        } else {
        console.warn('Skipping non-audio file:', file.name);
        setError(`Skipping non-audio file: ${file.name}`);
        }
    }
    
    // ✅ Принудительно обновляем состояние
    forceRefresh();
    
    return addedTracks;
    }, [activeCollectionId, forceRefresh]);

    // Обновляем moveTrack
    const moveTrack = useCallback(async (trackId: string, targetCollectionId: string) => {
    try {
        setError(null);
        await audioLibraryService.moveTrackToCollection(trackId, targetCollectionId);
        // ✅ Принудительно обновляем состояние
        forceRefresh();
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to move track');
        throw err;
    }
    }, [forceRefresh]);

    // Обновляем deleteTrack
    const deleteTrack = useCallback(async (trackId: string) => {
    try {
        setError(null);
        await audioLibraryService.deleteTrack(trackId);
        forceRefresh();
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete track');
        throw err;
    }
    }, [forceRefresh]);

    // ✅ Экспорт файла в систему
    const exportTrack = useCallback(async (track: AudioTrack) => {
        try {
        const url = await audioLibraryService.getFileUrl(track);
        const a = document.createElement('a');
        a.href = url;
        a.download = track.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
        
        return true;
        } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to export file');
        throw err;
        }
    }, []);

    // ✅ Создание коллекции
    const createCollection = useCallback(async (name: string, description?: string) => {
        try {
        setError(null);
        const newCollection = await audioLibraryService.createCollection(name, description);
        return newCollection;
        } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create collection');
        throw err;
        }
    }, []);

    // ✅ Удаление коллекции
    const deleteCollection = useCallback(async (collectionId: string) => {
        try {
        setError(null);
        await audioLibraryService.deleteCollection(collectionId);
        
        // Если удалили активную коллекцию, переключаемся на Buffer
        if (activeCollectionId === collectionId) {
            const bufferCollection = collections.find(c => c.name === 'Buffer');
            if (bufferCollection) {
            setActiveCollectionId(bufferCollection.id);
            }
        }
        } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete collection');
        throw err;
        }
    }, [activeCollectionId, collections]);

    // ✅ Обновление коллекции
    const updateCollection = useCallback(async (id: string, updates: Partial<AudioCollection>) => {
        try {
        setError(null);
        await audioLibraryService.updateCollection(id, updates);
        } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update collection');
        throw err;
        }
    }, []);

    // ✅ Получение треков коллекции
    const getTracksByCollection = useCallback((collectionId: string) => {
        return tracks.filter(t => t.collectionId === collectionId);
    }, [tracks]);

    // ✅ Получение URL для воспроизведения
    const getTrackUrl = useCallback(async (track: AudioTrack) => {
        try {
        return await audioLibraryService.getFileUrl(track);
        } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get track URL');
        throw err;
        }
    }, []);

    // ✅ Освобождение URL
    const revokeUrl = useCallback((url: string) => {
        audioLibraryService.revokeUrl(url);
    }, []);

    // ✅ Проверка, является ли коллекция Buffer
    const isBufferCollection = useCallback((collectionId: string) => {
        const collection = collections.find(c => c.id === collectionId);
        return collection?.name === 'Buffer';
    }, [collections]);

  return {
    // Состояние
    collections,
    tracks,
    activeCollectionId,
    isElectron,
    isLoading,
    error,
    
    // Действия
    setActiveCollectionId,
    addFiles,              // ✅ Добавлено
    exportTrack,           // ✅ Добавлено
    createCollection,
    deleteCollection,
    updateCollection,
    moveTrack,             // ✅ Добавлено
    deleteTrack,
    getTracksByCollection,
    getTrackUrl,
    revokeUrl,
    isBufferCollection,    // ✅ Добавлено
    forceRefresh, // Добавляем если нужно для ручного обновления
  };
};