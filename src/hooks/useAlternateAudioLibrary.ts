// src/modules/Library/hooks/useAudioLibrary.ts
import { useEffect, useState } from 'react';
import { audioLibraryService } from '../services/audio/AudioLibraryService';
import type { AudioTrack, AudioCollection } from '../types/audio';

export const useAlternateAudioLibrary = () => {
  const [collections, setCollections] = useState<AudioCollection[]>([]);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Подписка на изменения
  useEffect(() => {
    // Загружаем начальные данные
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setCollections(audioLibraryService.getCollections());
        setTracks(audioLibraryService.getTracks());
        setIsElectron(audioLibraryService.isElectron());
        
        // Устанавливаем активную коллекцию по умолчанию
        const bufferCollection = audioLibraryService.getCollections().find(c => c.name === 'Buffer');
        if (bufferCollection && !activeCollectionId) {
          setActiveCollectionId(bufferCollection.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load library');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();

    // Подписываемся на обновления
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

  // Методы для работы с библиотекой
  const createCollection = async (name: string, description?: string) => {
    try {
      setError(null);
      return await audioLibraryService.createCollection(name, description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection');
      throw err;
    }
  };

  const updateCollection = async (id: string, updates: Partial<AudioCollection>) => {
    try {
      setError(null);
      await audioLibraryService.updateCollection(id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update collection');
      throw err;
    }
  };

  const deleteCollection = async (id: string) => {
    try {
      setError(null);
      await audioLibraryService.deleteCollection(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
      throw err;
    }
  };

  const addTrack = async (file: File, collectionId?: string) => {
    try {
      setError(null);
      return await audioLibraryService.addTrack(file, collectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add track');
      throw err;
    }
  };

  const deleteTrack = async (trackId: string) => {
    try {
      setError(null);
      await audioLibraryService.deleteTrack(trackId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete track');
      throw err;
    }
  };

  const moveTrackToCollection = async (trackId: string, targetCollectionId: string) => {
    try {
      setError(null);
      await audioLibraryService.moveTrackToCollection(trackId, targetCollectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move track');
      throw err;
    }
  };

  const getFileUrl = async (track: AudioTrack) => {
    try {
      setError(null);
      return await audioLibraryService.getFileUrl(track);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get file URL');
      throw err;
    }
  };

  const revokeUrl = (url: string) => {
    audioLibraryService.revokeUrl(url);
  };

  const getTracksByCollection = (collectionId: string) => {
    return tracks.filter(t => t.collectionId === collectionId);
  };

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
    createCollection,
    updateCollection,
    deleteCollection,
    addTrack,
    deleteTrack,
    moveTrackToCollection,
    getFileUrl,
    revokeUrl,
    getTracksByCollection,
  };
};