import { useEffect, useState, useCallback } from 'react';
import { audioLibraryService } from '../services/audio/AudioLibraryService';
import type { AudioTrack, AudioCollection } from '../types/audio';

export const useFileManagerLibrary = () => {
  const [collections, setCollections] = useState<AudioCollection[]>([]);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setCollections(audioLibraryService.getCollections());
        setTracks(audioLibraryService.getTracks());
        setIsElectron(audioLibraryService.isElectron());

        const bufferCollection = audioLibraryService.getCollections().find((c) => c.name === 'Buffer');
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

  const forceRefresh = useCallback(() => {
    setCollections(audioLibraryService.getCollections());
    setTracks(audioLibraryService.getTracks());
  }, []);

  const addFiles = useCallback(async (files: FileList | File[], targetCollectionId?: string) => {
    const collectionId = targetCollectionId || activeCollectionId;
    if (!collectionId) {
      throw new Error('No collection selected');
    }

    const addedTracks: AudioTrack[] = [];
    const fileArray = Array.isArray(files) ? files : Array.from(files);

    for (const file of fileArray) {
      const isAudio =
        file.type.startsWith('audio/') || /\.(mp3|wav|ogg|webm|m4a|flac|aac|opus)$/i.test(file.name);

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

    forceRefresh();
    return addedTracks;
  }, [activeCollectionId, forceRefresh]);

  const moveTrack = useCallback(async (trackId: string, targetCollectionId: string) => {
    try {
      setError(null);
      await audioLibraryService.moveTrackToCollection(trackId, targetCollectionId);
      forceRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move track');
      throw err;
    }
  }, [forceRefresh]);

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
      }, 100);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export file');
      throw err;
    }
  }, []);

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

  const deleteCollection = useCallback(async (collectionId: string) => {
    try {
      setError(null);
      await audioLibraryService.deleteCollection(collectionId);

      if (activeCollectionId === collectionId) {
        const bufferCollection = collections.find((c) => c.name === 'Buffer');
        if (bufferCollection) {
          setActiveCollectionId(bufferCollection.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
      throw err;
    }
  }, [activeCollectionId, collections]);

  const updateCollection = useCallback(async (id: string, updates: Partial<AudioCollection>) => {
    try {
      setError(null);
      await audioLibraryService.updateCollection(id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update collection');
      throw err;
    }
  }, []);

  const getTracksByCollection = useCallback((collectionId: string) => {
    return tracks.filter((t) => t.collectionId === collectionId);
  }, [tracks]);

  const getTrackUrl = useCallback(async (track: AudioTrack) => {
    try {
      return await audioLibraryService.getFileUrl(track);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get track URL');
      throw err;
    }
  }, []);

  const revokeUrl = useCallback((url: string) => {
    audioLibraryService.revokeUrl(url);
  }, []);

  const isBufferCollection = useCallback((collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    return collection?.name === 'Buffer';
  }, [collections]);

  return {
    collections,
    tracks,
    activeCollectionId,
    isElectron,
    isLoading,
    error,
    setActiveCollectionId,
    addFiles,
    exportTrack,
    createCollection,
    deleteCollection,
    updateCollection,
    moveTrack,
    deleteTrack,
    getTracksByCollection,
    getTrackUrl,
    revokeUrl,
    isBufferCollection,
    forceRefresh,
  };
};
