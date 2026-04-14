import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AudioLibraryState, AudioLibraryActions, AudioFile, AudioCollection } from '../types/audioLibrary';

// Генерация ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Имя хранилища в localStorage
const STORAGE_KEY = 'audio-library';

// Дефолтная коллекция "Buffer"
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
            // TODO: загрузить существующие файлы из папки media/buffer
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
        let savedFile: AudioFile | null = null;

        if (isElectron && mediaPath && window.electronAPI) {
          // Сохраняем в файловую систему
          const arrayBuffer = await blob.arrayBuffer();
          
          //const fullPath = `${mediaPath}/${collectionId}/${fileName}`;

          // Создаём папку если нужно
          // Упрощённо: предполагаем, что папка существует или создаётся в main процессе
          const result = await window.electronAPI.saveAudioFile(arrayBuffer, `${collectionId}/${fileName}`);
          if (result.success && result.path) {
            savedFile = {
              id: fileId,
              name: fileName,
              originalName: fileName,
              size: blob.size,
              type: blob.type,
              path: result.path,
              createdAt,
              collectionId,
            };
          } else {
            console.error('Save failed:', result.error);
          }
        } else {
          // Браузер: храним в памяти (blob)
          savedFile = {
            id: fileId,
            name: fileName,
            originalName: fileName,
            size: blob.size,
            type: blob.type,
            blob,
            createdAt,
            collectionId,
          };
        }

        if (savedFile) {
          set((state) => {
            // Добавляем файл в коллекцию
            const collections = state.collections.map(c =>
              c.id === collectionId ? { ...c, fileIds: [...c.fileIds, fileId] } : c
            );
            return {
              files: [...state.files, savedFile!],
              collections,
            };
          });
        }
        return savedFile;
      },

      getFilesByCollection: (collectionId: string) => {
        const { files, collections } = get();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return [];
        return files.filter(f => collection.fileIds.includes(f.id));
      },

      deleteFile: async (fileId: string) => {
        const { 
            files, 
            //collections, 
            isElectron } = get();
        const file = files.find(f => f.id === fileId);
        if (!file) return false;

        if (isElectron && file.path && window.electronAPI) {
          // Удаляем физический файл
          await window.electronAPI.deleteFile(file.path);
        }
        // Удаляем из store
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
        if (collectionId === 'buffer') return false; // Не удаляем буфер
        const { 
            //files, 
            collections } = get();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return false;

        // Удаляем все файлы коллекции
        for (const fileId of collection.fileIds) {
          await get().deleteFile(fileId);
        }
        // Удаляем коллекцию
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

      moveFileToCollection: async (fileId: string, targetCollectionId: string) => {
        const { files, collections } = get();
        const file = files.find(f => f.id === fileId);
        if (!file) return false;
        const targetCollection = collections.find(c => c.id === targetCollectionId);
        if (!targetCollection) return false;

        // Удаляем из старой коллекции
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
        if (file.path && get().isElectron && window.electronAPI) {
          // Для Electron: читаем файл и создаём blob URL
          const arrayBuffer = await window.electronAPI.readFile(file.path);
          const blob = new Blob([arrayBuffer], { type: file.type });
          return URL.createObjectURL(blob);
        } else if (file.blob) {
          return URL.createObjectURL(file.blob);
        }
        return '';
      },

      revokeUrl: (url: string) => {
        URL.revokeObjectURL(url);
      },

      setActiveCollectionId: (id) => set({ activeCollectionId: id }),

      updateCollection: async (id, newName) => {
        const { collections } = get();
        const collection = collections.find(c => c.id === id);
        if (!collection) return false;
        if (collection.id === 'buffer') return false; // Не переименовываем Buffer
        
        set({
            collections: collections.map(c =>
            c.id === id ? { ...c, name: newName } : c
            ),
        });
        return true;
      },
      
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        collections: state.collections,
        files: state.files.map(f => ({
          ...f,
          blob: undefined, // не сохраняем blob в localStorage
          path: f.path,
        })),
        activeCollectionId: state.activeCollectionId,
      }),
    }
  )
);