import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerAllPlugins } from './plugins';


interface ElectronAPI {
  getMediaPath: () => Promise<string>;
  saveAudioFile: (data: ArrayBuffer, filename: string, collectionName?: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  readFile: (path: string) => Promise<ArrayBuffer>;
  deleteFile: (path: string) => Promise<{ success: boolean; error?: string }>;
  listMedia: () => Promise<{ success: boolean; collections?: any[]; error?: string }>;
  createCollection: (name: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  deleteCollection: (path: string) => Promise<{ success: boolean; error?: string }>;
  moveFile: (filePath: string, targetCollectionPath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  logError: (message: string) => void;  // ✅ Добавлено

  //readFile: (path: string) => Promise<ArrayBuffer>;
  //deleteFile: (path: string) => Promise<void>;

  writeFile: (path: string, data: ArrayBuffer) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
  mkdir: (path: string) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  copyFile: (from: string, to: string) => Promise<void>;
  getAppPath: () => string;
}

// Типы для Electron
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

// Глобальный обработчик ошибок React
const originalConsoleError = console.error;
console.error = (...args) => {
  // Логируем ошибки в консоль, но не даём им ломать приложение
  originalConsoleError(...args);
  // Можно отправить в Electron main процесс для записи в файл
  if (window.electronAPI) {
    window.electronAPI.logError?.(args.join(' '));
  }
};

// Обработчик необработанных Promise ошибок
// Перехват ошибок до React
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  if (window.electronAPI?.logError) {
    window.electronAPI.logError(`Global error: ${event.error?.message}\n${event.error?.stack}`);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  if (window.electronAPI?.logError) {
    window.electronAPI.logError(`Unhandled rejection: ${event.reason}`);
  }
});

// Логируем начало загрузки
console.log('🚀 Starting Membrana application...');

// Инициализируем реестр плагинов
registerAllPlugins();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);