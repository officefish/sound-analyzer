import { audioLibrary } from '../lib/audioLibrary';
import { useAudioLibraryStore } from '../store/audioLibrary.store';

export const useAudioLibrary = () => {
  // Для состояния используем стор (чтобы компоненты перерендеривались при изменениях)
  const collections = useAudioLibraryStore((state) => state.collections);
  const files = useAudioLibraryStore((state) => state.files);
  const activeCollectionId = useAudioLibraryStore((state) => state.activeCollectionId);
  const isElectron = useAudioLibraryStore((state) => state.isElectron);
  const mediaPath = useAudioLibraryStore((state) => state.mediaPath);
  
  // Действия берём из статического объекта (они не меняются)
  return {
    // Состояние
    collections,
    files,
    activeCollectionId,
    isElectron,
    mediaPath,
    // Действия
    init: audioLibrary.init,
    saveAudioFile: audioLibrary.saveAudioFile,
    getFilesByCollection: audioLibrary.getFilesByCollection,
    deleteFile: audioLibrary.deleteFile,
    deleteCollection: audioLibrary.deleteCollection,
    createCollection: audioLibrary.createCollection,
    moveFileToCollection: audioLibrary.moveFileToCollection,
    getFileUrl: audioLibrary.getFileUrl,
    revokeUrl: audioLibrary.revokeUrl,
    setActiveCollectionId: audioLibrary.setActiveCollectionId,
    updateCollection: audioLibrary.updateCollection,
  };
};