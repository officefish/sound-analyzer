// src/store/audioLibraryStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AudioLibraryState, AudioLibraryActions, AudioFile, AudioCollection } from '../types/audioLibrary';

declare global {
  interface Window {
    electronAPI?: {
      saveAudioFile: (data: ArrayBuffer, filename: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      getMediaPath: () => Promise<string>;
      readFile: (path: string) => Promise<ArrayBuffer>;
      deleteFile: (path: string) => Promise<boolean>;
      listFiles: (dir: string) => Promise<string[]>;
    };
  }
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_COLLECTION: AudioCollection = {
  id: 'buffer',
  name: 'Buffer',
  createdAt: Date.now(),
  fileIds: [],
};

const INITIAL_STATE: AudioLibraryState = {
  collections: [DEFAULT_COLLECTION],
  files: [],
  activeCollectionId: 'buffer',
  isElectron: false,
  mediaPath: null,
};

export const useAudioLibraryStore = create<AudioLibraryState & AudioLibraryActions>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      init: async () => {
        const isElectron = !!window.electronAPI;
        let mediaPath: string | null = null;
        
        if (isElectron && window.electronAPI) {
          try {
            mediaPath = await window.electronAPI.getMediaPath();
            console.log(`📁 Media path: ${mediaPath}`);
            
            // TODO: загрузить существующие файлы из папки buffer
            // const files = await window.electronAPI.listFiles(`${mediaPath}/buffer`);
            // преобразовать в AudioFile[]
          } catch (error) {
            console.error('Failed to get media path:', error);
          }
        }
        set({ isElectron, mediaPath });
      },

      saveAudioFile: async (blob: Blob, fileName: string, collectionId: string = 'buffer') => {
        const { isElectron, mediaPath } = get();
        const fileId = generateId();
        const createdAt = Date.now();
        
        let newFile: AudioFile | null = null;
        
        if (isElectron && mediaPath && window.electronAPI) {
          // Electron: сохраняем в файловую систему
          const arrayBuffer = await blob.arrayBuffer();
          const result = await window.electronAPI.saveAudioFile(arrayBuffer, `${collectionId}/${fileName}`);
          
          if (result.success && result.path) {
            newFile = {
              id: fileId,
              name: fileName,
              originalName: fileName,
              size: blob.size,
              type: blob.type,
              path: result.path,
              createdAt,
              collectionId,
            };
            console.log('💾 Saved to filesystem:', result.path);
          } else {
            console.error('Failed to save file:', result.error);
            return null;
          }
        } else {
          // Браузер: сохраняем в память (blob)
          newFile = {
            id: fileId,
            name: fileName,
            originalName: fileName,
            size: blob.size,
            type: blob.type,
            blob,
            createdAt,
            collectionId,
          };
          console.log('📀 Saved to memory (blob)');
        }
        
        if (newFile) {
          set((state) => ({
            files: [...state.files, newFile!],
            collections: state.collections.map(c =>
              c.id === collectionId ? { ...c, fileIds: [...c.fileIds, fileId] } : c
            ),
          }));
        }
        
        return newFile;
      },

      getFilesByCollection: (collectionId: string) => {
        const { files, collections } = get();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return [];
        return files.filter(f => collection.fileIds.includes(f.id));
      },

      deleteFile: async (fileId: string) => {
        const { files, isElectron } = get();
        const file = files.find(f => f.id === fileId);
        
        if (isElectron && file?.path && window.electronAPI) {
          await window.electronAPI.deleteFile(file.path);
          console.log('🗑️ Deleted from filesystem:', file.path);
        }
        
        set((state) => {
          const newFiles = state.files.filter(f => f.id !== fileId);
          const newCollections = state.collections.map(c => ({
            ...c,
            fileIds: c.fileIds.filter(id => id !== fileId),
          }));
          return { files: newFiles, collections: newCollections };
        });
        return true;
      },

      deleteCollection: async (collectionId: string) => {
        if (collectionId === 'buffer') return false;
        const { //files, 
        collections } = get();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return false;

        for (const fileId of collection.fileIds) {
          await get().deleteFile(fileId);
        }
        set((state) => ({
          collections: state.collections.filter(c => c.id !== collectionId),
        }));
        return true;
      },

      createCollection: async (name: string) => {
        const newCollection: AudioCollection = {
          id: generateId(),
          name,
          createdAt: Date.now(),
          fileIds: [],
        };
        set((state) => ({
          collections: [...state.collections, newCollection],
        }));
        return newCollection;
      },

      updateCollection: async (id: string, newName: string) => {
        if (id === 'buffer') return false;
        set((state) => ({
          collections: state.collections.map(c =>
            c.id === id ? { ...c, name: newName } : c
          ),
        }));
        return true;
      },

      moveFileToCollection: async (fileId: string, targetCollectionId: string) => {
        const { files, isElectron, mediaPath } = get();
        const file = files.find(f => f.id === fileId);
        if (!file) return false;
        
        // В Electron нужно физически переместить файл
        if (isElectron && file.path && mediaPath && window.electronAPI) {
          const oldPath = file.path;
          const newPath = oldPath.replace(/\/[^\/]+\//, `/${targetCollectionId}/`);
          // TODO: реализовать перемещение файла в main процессе
          console.log('Move file:', oldPath, '->', newPath);
        }
        
        const oldCollectionId = file.collectionId;
        set((state) => ({
          files: state.files.map(f =>
            f.id === fileId ? { ...f, collectionId: targetCollectionId } : f
          ),
          collections: state.collections.map(c => {
            if (c.id === oldCollectionId) {
              return { ...c, fileIds: c.fileIds.filter(id => id !== fileId) };
            }
            if (c.id === targetCollectionId) {
              return { ...c, fileIds: [...c.fileIds, fileId] };
            }
            return c;
          }),
        }));
        return true;
      },

      getFileUrl: async (file: AudioFile) => {
        const { isElectron } = get();
        
        if (isElectron && file.path && window.electronAPI) {
          // Electron: читаем файл и создаём blob URL
          const arrayBuffer = await window.electronAPI.readFile(file.path);
          const blob = new Blob([arrayBuffer], { type: file.type });
          return URL.createObjectURL(blob);
        } else if (file.blob) {
          // Браузер: используем blob
          return URL.createObjectURL(file.blob);
        }
        
        throw new Error('No audio data available');
      },

      revokeUrl: (url: string) => {
        URL.revokeObjectURL(url);
      },

      setActiveCollectionId: (id) => set({ activeCollectionId: id }),
    }),
    {
      name: 'audio-library',
      // Сохраняем только коллекции, активную коллекцию и метаданные файлов (без blob и path)
      partialize: (state) => ({
        collections: state.collections,
        activeCollectionId: state.activeCollectionId,
        // files: state.files.map(f => ({ ...f, blob: undefined, path: f.path })), // можно сохранить метаданные
      }),
    }
  )
);