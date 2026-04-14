// src/services/FileSystemService.ts

//import { IPluginContext } from "../../../../../types/plugins";

export interface SaveResult {
  success: boolean;
  path?: string;
  error?: string;
}

class FileSystemService {
  private mediaPath: string | null = null;
  private isElectron: boolean = typeof window !== 'undefined' && !!window.electronAPI;
  
  constructor() {
    if (this.isElectron) {
      this.initMediaPath();
    } else {
      console.warn('⚠️ FileSystemService: Not running in Electron, file saving will use fallback (download)');
    }
  }
  
  private async initMediaPath(): Promise<void> {
    try {
      this.mediaPath = await window.electronAPI!.getMediaPath();
      console.log(`📁 Media path initialized: ${this.mediaPath}`);
    } catch (error) {
      console.error('❌ Failed to get media path:', error);
    }
  }
  
  async saveAudioFile(blob: Blob, filename: string): Promise<SaveResult> {
    const arrayBuffer = await blob.arrayBuffer();
    
    // Если в Electron — сохраняем в файловую систему
    if (this.isElectron && window.electronAPI) {
      try {
        const result = await window.electronAPI.saveAudioFile(arrayBuffer, filename);
        if (result.success) {
          console.log(`✅ File saved: ${result.path}`);
          return { success: true, path: result.path };
        } else {
          console.error(`❌ Failed to save file: ${result.error}`);
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error('❌ Electron save failed:', error);
        return this.fallbackSave(blob, filename);
      }
    }
    
    // Fallback: скачивание через браузер
    return this.fallbackSave(blob, filename);
  }
  
  private fallbackSave(blob: Blob, filename: string): SaveResult {
    console.warn('⚠️ Using fallback save (download)');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, path: `download://${filename}` };
  }
  
  async getMediaPath(): Promise<string | null> {
    if (this.mediaPath) return this.mediaPath;
    if (this.isElectron && window.electronAPI) {
      await this.initMediaPath();
    }
    return this.mediaPath;
  }
  
  isAvailable(): boolean {
    return this.isElectron;
  }
}

export const fileSystemService = new FileSystemService();