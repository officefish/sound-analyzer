// electron/preload.ts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getMediaPath: () => ipcRenderer.invoke('get-media-path'),
  saveAudioFile: (data: ArrayBuffer, filename: string, collectionName?: string) => 
    ipcRenderer.invoke('save-audio-file', data, filename, collectionName),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path),
  listMedia: () => ipcRenderer.invoke('list-media'),
  createCollection: (name: string) => ipcRenderer.invoke('create-collection', name),
  deleteCollection: (path: string) => ipcRenderer.invoke('delete-collection', path),
  moveFile: (filePath: string, targetCollectionPath: string) => 
    ipcRenderer.invoke('move-file', filePath, targetCollectionPath),
  renameCollection: (oldPath: string, newPath: string) => 
    ipcRenderer.invoke('rename-collection', oldPath, newPath),
  logError: (message: string) => ipcRenderer.send('log-error', message),
});