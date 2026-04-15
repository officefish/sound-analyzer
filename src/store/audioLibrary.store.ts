// src/store/audioLibraryStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AudioLibraryState, AudioLibraryActions, AudioFile, AudioCollection } from '../types/audioLibrary';

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

      // Инициализация
      init: async () => {
        const isElectron = !!window.electronAPI;
        let mediaPath: string | null = null;
        
        if (isElectron && window.electronAPI) {
          try {
            mediaPath = await window.electronAPI.getMediaPath();
            console.log(`📁 Media path: ${mediaPath}`);
            
            // Загружаем существующие коллекции из файловой системы
            await get().loadFromFileSystem();
          } catch (error) {
            console.error('Failed to get media path:', error);
          }
        }
        set({ isElectron, mediaPath });
      },

      // Загрузка из файловой системы (только для Electron)
      loadFromFileSystem: async () => {
        const { isElectron } = get();
        if (!isElectron || !window.electronAPI) return;
        
        try {
          const result = await window.electronAPI.listMedia();
          if (result.success && result.collections) {
            const collections: AudioCollection[] = [DEFAULT_COLLECTION];
            const files: AudioFile[] = [];
            
            for (const col of result.collections) {
              if (col.name === 'buffer') continue; // Буфер уже есть
              
              const collectionId = col.name;
              const fileIds: string[] = [];
              
              for (const file of col.files) {
                const fileId = generateId();
                fileIds.push(fileId);
                files.push({
                  id: fileId,
                  name: file.name,
                  originalName: file.name,
                  size: file.size,
                  type: getMimeType(file.name),
                  path: file.path,
                  createdAt: file.modified,
                  collectionId: collectionId,
                });
              }
              
              collections.push({
                id: collectionId,
                name: collectionId,
                createdAt: Date.now(),
                fileIds,
              });
            }
            
            set({ collections, files });
            console.log(`📚 Loaded ${collections.length} collections with ${files.length} files from filesystem`);
          }
        } catch (error) {
          console.error('Failed to load from filesystem:', error);
        }
      },

      // Сохранение файла
      saveAudioFile: async (blob: Blob, fileName: string, collectionId: string = 'buffer') => {
        const { isElectron, mediaPath } = get();
        const fileId = generateId();
        const createdAt = Date.now();
        
        let newFile: AudioFile | null = null;
        
        if (isElectron && mediaPath && window.electronAPI) {
          // Electron: сохраняем в файловую систему
          const arrayBuffer = await blob.arrayBuffer();
          const result = await window.electronAPI.saveAudioFile(arrayBuffer, fileName, collectionId);
          
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
          // Браузер: сохраняем в память
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

      // Получение файлов коллекции
      getFilesByCollection: (collectionId: string) => {
        const { files, collections } = get();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return [];
        return files.filter(f => collection.fileIds.includes(f.id));
      },

      // Удаление файла
      deleteFile: async (fileId: string) => {
        const { files, isElectron } = get();
        const file = files.find(f => f.id === fileId);
        if (!file) return false;
        
        if (isElectron && file.path && window.electronAPI) {
          const result = await window.electronAPI.deleteFile(file.path);
          if (!result.success) {
            console.error('Failed to delete file from filesystem:', result.error);
            return false;
          }
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

      // Удаление коллекции
      deleteCollection: async (collectionId: string) => {
        if (collectionId === 'buffer') return false;
        
        const { collections, isElectron, mediaPath } = get();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return false;
        
        // Удаляем все файлы коллекции
        for (const fileId of collection.fileIds) {
          await get().deleteFile(fileId);
        }
        
        // В Electron удаляем папку коллекции
        if (isElectron && mediaPath && window.electronAPI) {
          const collectionPath = `${mediaPath}/${collectionId}`;
          const result = await window.electronAPI.deleteCollection(collectionPath);
          if (!result.success) {
            console.error('Failed to delete collection from filesystem:', result.error);
          }
        }
        
        set((state) => ({
          collections: state.collections.filter(c => c.id !== collectionId),
        }));
        return true;
      },

      // Создание коллекции
      createCollection: async (name: string) => {
        const { isElectron, mediaPath, collections } = get();
        
        // Проверяем, существует ли уже коллекция с таким именем
        if (collections.some(c => c.name === name)) {
          console.warn('Collection already exists:', name);
          return null;
        }
        
        const collectionId = name;
        const newCollection: AudioCollection = {
          id: collectionId,
          name,
          createdAt: Date.now(),
          fileIds: [],
        };
        
        // В Electron создаём папку на диске
        if (isElectron && mediaPath && window.electronAPI) {
          const result = await window.electronAPI.createCollection(name);
          if (!result.success) {
            console.error('Failed to create collection on filesystem:', result.error);
            return null;
          }
          console.log('📁 Created collection folder:', result.path);
        }
        
        set((state) => ({
          collections: [...state.collections, newCollection],
        }));
        
        return newCollection;
      },

      // Обновление названия коллекции
      updateCollection: async (id: string, newName: string) => {
        if (id === 'buffer') return false;
        
        const { collections, isElectron, mediaPath
          //, files 
        } = get();
        const collection = collections.find(c => c.id === id);
        if (!collection) return false;
        
        // В Electron переименовываем папку
        if (isElectron && mediaPath && window.electronAPI) {
          //const oldPath = `${mediaPath}/${id}`;
          //const newPath = `${mediaPath}/${newName}`;
          // TODO: добавить IPC метод для rename
          console.log('Rename not implemented yet');
        }
        
        // Обновляем в store
        set((state) => ({
          collections: state.collections.map(c =>
            c.id === id ? { ...c, name: newName, id: newName } : c
          ),
          files: state.files.map(f =>
            f.collectionId === id ? { ...f, collectionId: newName } : f
          ),
        }));
        
        return true;
      },

      // Перемещение файла между коллекциями
      moveFileToCollection: async (fileId: string, targetCollectionId: string) => {
        const { files, collections, isElectron, mediaPath } = get();
        const file = files.find(f => f.id === fileId);
        if (!file) return false;
        const targetCollection = collections.find(c => c.id === targetCollectionId);
        if (!targetCollection) return false;
        
        const oldCollectionId = file.collectionId;
        
        // В Electron физически перемещаем файл
        if (isElectron && file.path && mediaPath && window.electronAPI) {
          const targetPath = `${mediaPath}/${targetCollectionId}`;
          const result = await window.electronAPI.moveFile(file.path, targetPath);
          if (!result.success) {
            console.error('Failed to move file on filesystem:', result.error);
            return false;
          }
          console.log('📦 Moved file on filesystem:', result.path);
        }
        
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

      // Получение URL для воспроизведения
      getFileUrl: async (file: AudioFile) => {
        const { isElectron } = get();
        
        if (isElectron && file.path && window.electronAPI) {
          const arrayBuffer = await window.electronAPI.readFile(file.path);
          const blob = new Blob([arrayBuffer], { type: file.type });
          return URL.createObjectURL(blob);
        } else if (file.blob) {
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
      partialize: (state) => ({
        collections: state.collections,
        activeCollectionId: state.activeCollectionId,
      }),
    }
  )
);

// Вспомогательная функция для определения MIME типа
function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    case 'webm': return 'audio/webm';
    case 'm4a': return 'audio/mp4';
    default: return 'audio/mpeg';
  }
}