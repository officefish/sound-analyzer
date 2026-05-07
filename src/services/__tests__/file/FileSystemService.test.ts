// src/services/__tests__/file/FileSystemService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockFileSystemService } from '../../../test/mocks/fileSystemService';

describe('FileSystemService', () => {
  const testContent = 'test audio content for testing';
  const testBlob = new Blob([testContent], { type: 'audio/mpeg' });
  const testFileName = 'test_audio.mp3';

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFileSystemService.clearTestStorage();
  });

  describe('File operations', () => {
    it('should save file', async () => {
      const filePath = await mockFileSystemService.saveFile(testFileName, testBlob, 'buffer');
      expect(filePath).toBeDefined();
      expect(filePath).toContain(testFileName);
    });

    it('should read file', async () => {
      const filePath = await mockFileSystemService.saveFile(testFileName, testBlob, 'buffer');
      const readBlob = await mockFileSystemService.readFile(filePath);
      
      expect(readBlob).toBeInstanceOf(Blob);
      
      const originalText = await testBlob.text();
      const readText = await readBlob.text();
      expect(readText).toBe(originalText);
    });

    it('should delete file', async () => {
      const filePath = await mockFileSystemService.saveFile(testFileName, testBlob, 'buffer');
      
      // Проверяем что файл существует
      const blob = await mockFileSystemService.readFile(filePath);
      expect(blob).toBeDefined();
      
      // Удаляем
      await mockFileSystemService.deleteFile(filePath);
      
      // Проверяем что файл удален
      await expect(mockFileSystemService.readFile(filePath)).rejects.toThrow();
    });

    it('should copy file', async () => {
      const sourcePath = await mockFileSystemService.saveFile('source_' + testFileName, testBlob, 'buffer');
      const targetPath = sourcePath.replace('source_', 'target_');
      
      await mockFileSystemService.copyFile(sourcePath, targetPath);
      
      const targetBlob = await mockFileSystemService.readFile(targetPath);
      expect(targetBlob).toBeInstanceOf(Blob);
      
      const originalText = await testBlob.text();
      const targetText = await targetBlob.text();
      expect(targetText).toBe(originalText);
    });
  });

  describe('Initialization', () => {
    it('should detect Electron environment', () => {
      const isElectron = mockFileSystemService.isElectronEnv();
      expect(typeof isElectron).toBe('boolean');
    });

    it('should initialize base path', () => {
      const basePath = mockFileSystemService.getBasePath();
      expect(basePath).toBeDefined();
    });
  });
});