// src/services/storage/StorageService.ts
import { AudioCollection, AudioTrack } from '../../types/audio';

class StorageService {
  private readonly COLLECTIONS_KEY = 'audio_library_collections';
  private readonly TRACKS_KEY = 'audio_library_tracks';
  private readonly BLOBS_DB_NAME = 'audio_library_blobs';
  private readonly BLOBS_STORE_NAME = 'track_blobs';
  private readonly BLOBS_DB_VERSION = 1;

  private openBlobsDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.BLOBS_DB_NAME, this.BLOBS_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.BLOBS_STORE_NAME)) {
          db.createObjectStore(this.BLOBS_STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    });
  }

  async saveTrackBlob(trackId: string, blob: Blob): Promise<void> {
    const db = await this.openBlobsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.BLOBS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.BLOBS_STORE_NAME);
      store.put(blob, trackId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save blob'));
    });
    db.close();
  }

  async loadTrackBlob(trackId: string): Promise<Blob | null> {
    const db = await this.openBlobsDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(this.BLOBS_STORE_NAME, 'readonly');
      const store = tx.objectStore(this.BLOBS_STORE_NAME);
      const request = store.get(trackId);
      request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('Failed to load blob'));
    });
    db.close();
    return blob;
  }

  async deleteTrackBlob(trackId: string): Promise<void> {
    const db = await this.openBlobsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.BLOBS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.BLOBS_STORE_NAME);
      store.delete(trackId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to delete blob'));
    });
    db.close();
  }

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
      const serializableTracks = tracks.map((track) => ({
        ...track,
        blob: undefined,
        blobData: undefined,
      }));

      const data = JSON.stringify(serializableTracks);
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
        blob: undefined,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
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