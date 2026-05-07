// src/test/mocks/fileSystemService.ts
//import { vi } from 'vitest';

export class MockFileSystemService {
  private storage = new Map<string, Blob>();
  basePath = 'virtual';
  isElectron = false;

  async saveFile(fileName: string, data: Blob, directory: string = 'buffer'): Promise<string> {
    const filePath = `${this.basePath}/${directory}/${fileName}`;
    this.storage.set(filePath, data);
    return filePath;
  }

  async readFile(filePath: string): Promise<Blob> {
    const blob = this.storage.get(filePath);
    if (!blob) {
      throw new Error(`File not found: ${filePath}`);
    }
    return blob;
  }

  async deleteFile(filePath: string): Promise<void> {
    this.storage.delete(filePath);
  }

  async copyFile(fromPath: string, toPath: string): Promise<void> {
    const blob = await this.readFile(fromPath);
    this.storage.set(toPath, blob);
  }

  async listFiles(directory: string): Promise<string[]> {
    const prefix = `${this.basePath}/${directory}/`;
    return Array.from(this.storage.keys()).filter(key => key.startsWith(prefix));
  }

  clearTestStorage(): void {
    this.storage.clear();
  }

  getBasePath(): string {
    return this.basePath;
  }

  isElectronEnv(): boolean {
    return this.isElectron;
  }
}

export const mockFileSystemService = new MockFileSystemService();