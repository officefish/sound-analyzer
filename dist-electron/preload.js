"use strict";
// electron/preload.ts
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getMediaPath: () => electron_1.ipcRenderer.invoke('get-media-path'),
    saveAudioFile: (data, filename, collectionName) => electron_1.ipcRenderer.invoke('save-audio-file', data, filename, collectionName),
    readFile: (path) => electron_1.ipcRenderer.invoke('read-file', path),
    deleteFile: (path) => electron_1.ipcRenderer.invoke('delete-file', path),
    listMedia: () => electron_1.ipcRenderer.invoke('list-media'),
    createCollection: (name) => electron_1.ipcRenderer.invoke('create-collection', name),
    deleteCollection: (path) => electron_1.ipcRenderer.invoke('delete-collection', path),
    moveFile: (filePath, targetCollectionPath) => electron_1.ipcRenderer.invoke('move-file', filePath, targetCollectionPath),
    renameCollection: (oldPath, newPath) => electron_1.ipcRenderer.invoke('rename-collection', oldPath, newPath),
});
