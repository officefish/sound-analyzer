// src/services/file/FileSystemService.ts
import { isAudioFile, getMimeType } from './audioUtils';

// Экспортируем утилиты для использования в других файлах
export { isAudioFile, getMimeType };

interface ElectronAPI {
  readFile: (path: string) => Promise<ArrayBuffer>;
  writeFile: (path: string, data: ArrayBuffer) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
  mkdir: (path: string) => Promise<void>;
  readdir: (path: string) => Promise<string[]>;
  copyFile: (from: string, to: string) => Promise<void>;
  moveFile: (from: string, to: string) => Promise<void>; // ✅ Добавляем moveFile
  getAppPath: () => string;
}

class FileSystemService {
  private basePath: string = '';
  private isElectron: boolean = false;
  private testStorage: Map<string, Blob> = new Map();

  constructor() {
    this.isElectron = !!window.electronAPI;
    this.initBasePath();
  }

  private async initBasePath() {
    if (this.isElectron && window.electronAPI) {
      try {
        const appPath = await window.electronAPI.getAppPath();
        this.basePath = `${appPath}/media`;
        await this.ensureDir(this.basePath);
        await this.ensureDir(`${this.basePath}/buffer`);
        await this.ensureDir(`${this.basePath}/collections`);
      } catch (error) {
        console.error('Failed to init base path:', error);
      }
    } else {
      this.basePath = 'virtual';
    }
  }

  private async ensureDir(path: string): Promise<void> {
    if (!this.isElectron) return;
    
    try {
      const exists = await window.electronAPI!.exists(path);
      if (!exists) {
        await window.electronAPI!.mkdir(path);
      }
    } catch (error) {
      console.error(`Failed to create directory ${path}:`, error);
    }
  }

  async saveFile(fileName: string, data: Blob, directory: string = 'buffer'): Promise<string> {
    const filePath = `${this.basePath}/${directory}/${fileName}`;
    
    if (this.isElectron && window.electronAPI) {
      const arrayBuffer = await data.arrayBuffer();
      await window.electronAPI.writeFile(filePath, arrayBuffer);
      return filePath;
    } else {
      this.testStorage.set(filePath, data);
      return filePath;
    }
  }

  async readFile(filePath: string): Promise<Blob> {
    if (this.isElectron && window.electronAPI) {
      const arrayBuffer = await window.electronAPI.readFile(filePath);
      return new Blob([arrayBuffer]);
    } else {
      const blob = this.testStorage.get(filePath);
      if (!blob) {
        throw new Error(`File not found: ${filePath}`);
      }
      return blob;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    if (this.isElectron && window.electronAPI) {
      await window.electronAPI.deleteFile(filePath);
    } else {
      this.testStorage.delete(filePath);
    }
  }

  async copyFile(fromPath: string, toPath: string): Promise<void> {
    if (this.isElectron && window.electronAPI) {
      await window.electronAPI.copyFile(fromPath, toPath);
    } else {
      const blob = await this.readFile(fromPath);
      this.testStorage.set(toPath, blob);
    }
  }

  // ✅ Добавляем метод moveFile
  async moveFile(oldPath: string, targetCollectionId: string, fileName: string): Promise<string> {
    const newPath = `${this.basePath}/${targetCollectionId}/${fileName}`;
    
    if (this.isElectron && window.electronAPI) {
      await window.electronAPI.moveFile(oldPath, newPath);
      return newPath;
    } else {
      // Для веб-версии: копируем и удаляем
      const blob = await this.readFile(oldPath);
      this.testStorage.set(newPath, blob);
      this.testStorage.delete(oldPath);
      return newPath;
    }
  }

  async listFiles(directory: string): Promise<string[]> {
    const dirPath = `${this.basePath}/${directory}`;
    
    if (this.isElectron && window.electronAPI) {
      return await window.electronAPI.readdir(dirPath);
    } else {
      const keys = Array.from(this.testStorage.keys());
      return keys.filter(key => key.startsWith(dirPath));
    }
  }

  // Для тестов
  clearTestStorage(): void {
    this.testStorage.clear();
  }

  getBasePath(): string {
    return this.basePath;
  }

  isElectronEnv(): boolean {
    return this.isElectron;
  }
}

export const fileSystemService = new FileSystemService();