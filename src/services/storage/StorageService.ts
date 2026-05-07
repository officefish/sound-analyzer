// src/services/storage/StorageService.ts
import { AudioCollection, AudioTrack } from '../../types/audio';

class StorageService {
  private readonly COLLECTIONS_KEY = 'audio_library_collections';
  private readonly TRACKS_KEY = 'audio_library_tracks';

  async saveCollections(collections: AudioCollection[]): Promise<void> {
    try {
      const data = JSON.stringify(collections);
      localStorage.setItem(this.COLLECTIONS_KEY, data);
    } catch (error) {
      console.error('Failed to save collections:', error);
      throw error;
    }
  }

  async loadCollections(): Promise<AudioCollection[]> {
    try {
      const data = localStorage.getItem(this.COLLECTIONS_KEY);
      if (!data) return [];
      
      const collections = JSON.parse(data);
      return collections.map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to load collections...');  
      //console.error('Failed to load collections: ', error);
      return [];
    }
  }

  async saveTracks(tracks: AudioTrack[]): Promise<void> {
    try {
      const data = JSON.stringify(tracks);
      localStorage.setItem(this.TRACKS_KEY, data);
    } catch (error) {
      console.error('Failed to save tracks:', error);
      throw error;
    }
  }

  async loadTracks(): Promise<AudioTrack[]> {
    try {
      const data = localStorage.getItem(this.TRACKS_KEY);
      if (!data) return [];
      
      const tracks = JSON.parse(data);
      return tracks.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to load tracks:', error);
      return [];
    }
  }

  async clearAll(): Promise<void> {
    localStorage.removeItem(this.COLLECTIONS_KEY);
    localStorage.removeItem(this.TRACKS_KEY);
  }
}

export const storageService = new StorageService();