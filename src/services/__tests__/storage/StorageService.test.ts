// src/services/__tests__/StorageService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageService } from '../../storage/StorageService';
import type { AudioCollection, AudioTrack } from '../../../types/audio';

describe('StorageService', () => {
  const mockCollection: AudioCollection = {
    id: '1',
    name: 'Test Collection',
    trackIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTrack: AudioTrack = {
    id: '1',
    name: 'test.mp3',
    path: '/path/to/test.mp3',
    collectionId: '1',
    duration: 120,
    fileSize: 1024,
    createdAt: new Date(),
    updatedAt: new Date(),
    originalName: '',
    type: '', 
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Collections', () => {
    it('should save and load collections', async () => {
      await storageService.saveCollections([mockCollection]);
      const loaded = await storageService.loadCollections();
      
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe(mockCollection.name);
      expect(loaded[0].id).toBe(mockCollection.id);
    });

    it('should return empty array when no collections exist', async () => {
      const loaded = await storageService.loadCollections();
      expect(loaded).toEqual([]);
    });

    it('should handle malformed JSON', async () => {
      localStorage.setItem('audio_library_collections', 'invalid json');
      const loaded = await storageService.loadCollections();
      expect(loaded).toEqual([]);
    });
  });

  describe('Tracks', () => {
    it('should save and load tracks', async () => {
      await storageService.saveTracks([mockTrack]);
      const loaded = await storageService.loadTracks();
      
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe(mockTrack.name);
    });

    it('should return empty array when no tracks exist', async () => {
      const loaded = await storageService.loadTracks();
      expect(loaded).toEqual([]);
    });
  });

  describe('Clear operations', () => {
    it('should clear all data', async () => {
      await storageService.saveCollections([mockCollection]);
      await storageService.saveTracks([mockTrack]);
      await storageService.clearAll();
      
      const collections = await storageService.loadCollections();
      const tracks = await storageService.loadTracks();
      
      expect(collections).toEqual([]);
      expect(tracks).toEqual([]);
    });
  });
});