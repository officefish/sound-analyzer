// src/services/__tests__/audio/AudioLibraryService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { audioLibraryService } from '../../audio/AudioLibraryService';

describe('AudioLibraryService', () => {
  const mockFile = new File(['test audio content for testing'], 'test.mp3', { type: 'audio/mpeg' });

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    // Очищаем IndexedDB
    if (typeof indexedDB !== 'undefined') {
      const request = indexedDB.deleteDatabase('AudioLibraryDB');
      await new Promise((resolve) => {
        request.onsuccess = resolve;
        request.onerror = resolve;
      });
    }
    // Переинициализируем сервис
    await audioLibraryService['init']();
  });

  describe('Collections', () => {
    it('should create default Buffer collection', () => {
      const collections = audioLibraryService.getCollections();
      // ✅ Исправлено: ищем 'Buffer' вместо 'Буфер'
      const bufferCollection = collections.find(c => c.name === 'Buffer');
      
      expect(bufferCollection).toBeDefined();
      expect(bufferCollection?.name).toBe('Buffer');
    });

    it('should create new collection', async () => {
      const newCollection = await audioLibraryService.createCollection('Rock', 'Rock music');
      
      expect(newCollection.name).toBe('Rock');
      expect(newCollection.description).toBe('Rock music');
      
      const collections = audioLibraryService.getCollections();
      expect(collections.length).toBeGreaterThan(1);
    });

    it('should update collection', async () => {
      const collection = await audioLibraryService.createCollection('Jazz');
      await audioLibraryService.updateCollection(collection.id, { 
        name: 'Modern Jazz',
        description: 'Updated'
      });
      
      const updated = audioLibraryService.getCollection(collection.id);
      expect(updated?.name).toBe('Modern Jazz');
      expect(updated?.description).toBe('Updated');
    });

    it('should not delete Buffer collection', async () => {
      // ✅ Исправлено: ищем 'Buffer'
      const bufferCollection = audioLibraryService.getCollections().find(c => c.name === 'Buffer')!;
      await expect(audioLibraryService.deleteCollection(bufferCollection.id))
        .rejects.toThrow('Cannot delete Buffer collection');
    });
  });

  describe('Tracks', () => {
    it('should add track to Buffer', async () => {
      const track = await audioLibraryService.addTrack(mockFile);
      
      expect(track.name).toBe('test.mp3');
      expect(track.fileSize).toBe(mockFile.size);
      
      // ✅ Исправлено: ищем 'Buffer'
      const bufferCollection = audioLibraryService.getCollections().find(c => c.name === 'Buffer')!;
      const updatedBuffer = audioLibraryService.getCollection(bufferCollection.id);
      expect(updatedBuffer?.trackIds).toContain(track.id);
    });

    it('should add track to specific collection', async () => {
      const collection = await audioLibraryService.createCollection('Classical');
      const track = await audioLibraryService.addTrack(mockFile, collection.id);
      
      expect(track.collectionId).toBe(collection.id);
      
      const updatedCollection = audioLibraryService.getCollection(collection.id);
      expect(updatedCollection?.trackIds).toContain(track.id);
    });

    it('should move track between collections', async () => {
      const col1 = await audioLibraryService.createCollection('Col1');
      const col2 = await audioLibraryService.createCollection('Col2');
      const track = await audioLibraryService.addTrack(mockFile, col1.id);
      
      // Небольшая задержка для синхронизации
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Проверяем начальное состояние
      const beforeCol1 = audioLibraryService.getCollection(col1.id);
      const beforeCol2 = audioLibraryService.getCollection(col2.id);
      
      expect(beforeCol1?.trackIds).toContain(track.id);
      expect(beforeCol2?.trackIds).not.toContain(track.id);
      
      // Перемещаем трек
      await audioLibraryService.moveTrackToCollection(track.id, col2.id);
      
      // Небольшая задержка для применения изменений
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Проверяем результат
      const afterCol1 = audioLibraryService.getCollection(col1.id);
      const afterCol2 = audioLibraryService.getCollection(col2.id);
      const movedTrack = audioLibraryService.getTrack(track.id);
      
      expect(movedTrack?.collectionId).toBe(col2.id);
      expect(afterCol1?.trackIds).not.toContain(track.id);
      expect(afterCol2?.trackIds).toContain(track.id);
    });

    it('should delete track', async () => {
      const track = await audioLibraryService.addTrack(mockFile);
      
      expect(audioLibraryService.getTrack(track.id)).toBeDefined();
      
      await audioLibraryService.deleteTrack(track.id);
      
      expect(audioLibraryService.getTrack(track.id)).toBeUndefined();
    });
  });
});