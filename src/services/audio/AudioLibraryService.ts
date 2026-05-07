// src/services/audio/AudioLibraryService.ts
import { AudioTrack, AudioCollection } from '../../types/audio';
import { fileSystemService } from '../file/FileSystemService';
import { storageService } from '../storage/StorageService';

type EventCallback = (...args: any[]) => void;

class AudioLibraryService {
  private collections: AudioCollection[] = [];
  private tracks: AudioTrack[] = [];
  private listeners: Map<string, EventCallback[]> = new Map();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.isInitialized) return;
    await this.loadData();
    this.isInitialized = true;
  }

  private async loadData() {
    this.collections = await storageService.loadCollections();
    this.tracks = await storageService.loadTracks();
    
    // Создаем стандартную коллекцию "Buffer" если её нет
    if (!this.collections.find(c => c.name === 'Buffer')) {
      await this.createCollection('Buffer', 'Temporary storage for imported tracks');
    }
  }

  private emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(...args));
    }
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  async createCollection(name: string, description?: string): Promise<AudioCollection> {
    const newCollection: AudioCollection = {
      id: this.generateId(),
      name,
      description,
      trackIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.collections.push(newCollection);
    await this.saveAll();
    this.emit('collections-updated', this.collections);
    
    return newCollection;
  }

  async updateCollection(id: string, updates: Partial<AudioCollection>): Promise<void> {
    const index = this.collections.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Collection not found');
    
    this.collections[index] = {
      ...this.collections[index],
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveAll();
    this.emit('collections-updated', this.collections);
  }

  async deleteCollection(id: string): Promise<void> {
    const collection = this.collections.find(c => c.id === id);
    if (!collection) throw new Error('Collection not found');
    if (collection.name === 'Buffer') throw new Error('Cannot delete Buffer collection');
    
    // Перемещаем треки в буфер
    const bufferCollection = this.collections.find(c => c.name === 'Buffer')!;
    for (const trackId of collection.trackIds) {
      await this.moveTrackToCollection(trackId, bufferCollection.id);
    }
    
    // Удаляем коллекцию
    this.collections = this.collections.filter(c => c.id !== id);
    await this.saveAll();
    this.emit('collections-updated', this.collections);
  }

  async addTrack(file: File, collectionId?: string): Promise<AudioTrack> {
    // Получаем коллекцию
    let targetCollectionId = collectionId;
    if (!targetCollectionId) {
      const bufferCollection = this.collections.find(c => c.name === 'Buffer');
      if (!bufferCollection) throw new Error('Buffer collection not found');
      targetCollectionId = bufferCollection.id;
    }

    // Сохраняем файл в файловую систему
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = await fileSystemService.saveFile(fileName, file, targetCollectionId);
    
    // Получаем длительность
    const duration = await this.getAudioDuration(file);
    
    // Создаем трек
    const newTrack: AudioTrack = {
      id: this.generateId(),
      name: file.name,
      originalName: file.name,
      path: filePath,
      collectionId: targetCollectionId,
      duration,
      fileSize: file.size,
      type: file.type,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.tracks.push(newTrack);
    
    // Добавляем в коллекцию
    const targetCollection = this.collections.find(c => c.id === targetCollectionId);
    if (targetCollection) {
      targetCollection.trackIds.push(newTrack.id);
      targetCollection.updatedAt = new Date();
    }
    
    await this.saveAll();
    this.emit('tracks-updated', this.tracks);
    this.emit('collections-updated', this.collections);
    
    return newTrack;
  }

  async moveTrackToCollection(trackId: string, targetCollectionId: string): Promise<void> {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) throw new Error('Track not found');
    
    const oldCollection = this.collections.find(c => c.id === track.collectionId);
    const newCollection = this.collections.find(c => c.id === targetCollectionId);
    
    if (!oldCollection || !newCollection) throw new Error('Collection not found');
    
    // Удаляем из старой коллекции
    oldCollection.trackIds = oldCollection.trackIds.filter(id => id !== trackId);
    oldCollection.updatedAt = new Date();
    
    // Добавляем в новую
    newCollection.trackIds.push(trackId);
    newCollection.updatedAt = new Date();
    
    // Обновляем трек
    track.collectionId = targetCollectionId;
    track.updatedAt = new Date();
    
    await this.saveAll();
    this.emit('tracks-updated', this.tracks);
    this.emit('collections-updated', this.collections);
  }

  async deleteTrack(trackId: string): Promise<void> {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) throw new Error('Track not found');
    
    // Удаляем файл
    await fileSystemService.deleteFile(track.path);
    
    // Удаляем из коллекции
    const collection = this.collections.find(c => c.id === track.collectionId);
    if (collection) {
      collection.trackIds = collection.trackIds.filter(id => id !== trackId);
      collection.updatedAt = new Date();
    }
    
    // Удаляем трек
    this.tracks = this.tracks.filter(t => t.id !== trackId);
    
    await this.saveAll();
    this.emit('tracks-updated', this.tracks);
    this.emit('collections-updated', this.collections);
  }

  async getFileUrl(track: AudioTrack): Promise<string> {
    const blob = await fileSystemService.readFile(track.path);
    return URL.createObjectURL(blob);
  }

  revokeUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  private async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.removeEventListener('loadedmetadata', onLoad);
        audio.removeEventListener('error', onError);
      };
      
      const onLoad = () => {
        const duration = audio.duration;
        cleanup();
        resolve(isNaN(duration) ? 0 : duration);
      };
      
      const onError = () => {
        cleanup();
        resolve(0);
      };
      
      audio.addEventListener('loadedmetadata', onLoad);
      audio.addEventListener('error', onError);
      audio.src = url;
      
      setTimeout(() => {
        cleanup();
        resolve(0);
      }, 5000);
    });
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveAll() {
    await storageService.saveCollections(this.collections);
    await storageService.saveTracks(this.tracks);
  }

  // Геттеры для стора
  getCollections(): AudioCollection[] {
    return [...this.collections];
  }

  getTracks(): AudioTrack[] {
    return [...this.tracks];
  }

  getTracksByCollection(collectionId: string): AudioTrack[] {
    return this.tracks.filter(t => t.collectionId === collectionId);
  }

  getTrack(trackId: string): AudioTrack | undefined {
    return this.tracks.find(t => t.id === trackId);
  }

  getCollection(collectionId: string): AudioCollection | undefined {
    return this.collections.find(c => c.id === collectionId);
  }

  isElectron(): boolean {
    return fileSystemService.isElectronEnv();
  }
}

export const audioLibraryService = new AudioLibraryService();