import { useAudioLibraryStore } from '../store/audioLibrary.store';
import { AudioFile, AudioCollection } from '../types/audioLibrary';

// Для использования в классах и сервисах (без React)
export const audioLibrary = {
  // Инициализация (вызывать один раз при старте приложения)
  init: async () => {
    await useAudioLibraryStore.getState().init();
  },
  
  saveAudioFile: async (blob: Blob, fileName: string, collectionId?: string): Promise<AudioFile | null> => {
    return useAudioLibraryStore.getState().saveAudioFile(blob, fileName, collectionId);
  },
  
  getFilesByCollection: (collectionId: string): AudioFile[] => {
    return useAudioLibraryStore.getState().getFilesByCollection(collectionId);
  },
  
  deleteFile: async (fileId: string): Promise<boolean> => {
    return useAudioLibraryStore.getState().deleteFile(fileId);
  },
  
  deleteCollection: async (collectionId: string): Promise<boolean> => {
    return useAudioLibraryStore.getState().deleteCollection(collectionId);
  },
  
  createCollection: async (name: string): Promise<AudioCollection> => {
    return useAudioLibraryStore.getState().createCollection(name);
  },
  
  moveFileToCollection: async (fileId: string, targetCollectionId: string): Promise<boolean> => {
    return useAudioLibraryStore.getState().moveFileToCollection(fileId, targetCollectionId);
  },
  
  getFileUrl: async (file: AudioFile): Promise<string> => {
    return useAudioLibraryStore.getState().getFileUrl(file);
  },
  
  revokeUrl: (url: string): void => {
    useAudioLibraryStore.getState().revokeUrl(url);
  },
  
  // Дополнительно: получение состояния (только чтение)
  getCollections: (): AudioCollection[] => {
    return useAudioLibraryStore.getState().collections;
  },
  
  getFiles: (): AudioFile[] => {
    return useAudioLibraryStore.getState().files;
  },
  
  isElectron: (): boolean => {
    return useAudioLibraryStore.getState().isElectron;
  },
};

// Для React-компонентов — хук (просто обёртка над функциями, чтобы не импортировать audioLibrary напрямую)
// Но можно и не делать, достаточно использовать audioLibrary везде.