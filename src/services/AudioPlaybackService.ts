// src/services/AudioPlaybackService.ts

import { AudioFile } from '../types/audioLibrary';
import { audioLibrary } from '../lib/audioLibrary';

type PlaybackEvent = 'play' | 'pause' | 'stop' | 'timeupdate' | 'ended' | 'loadedmetadata' | 'statechange';

interface PlaybackState {
  currentFile: AudioFile | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
}

type PlaybackEventMap = {
  play: { file: AudioFile };
  pause: void;
  stop: void;
  timeupdate: { currentTime: number };
  ended: void;
  loadedmetadata: { duration: number };
  statechange: PlaybackState;
};

type PlaybackEventListener<K extends PlaybackEvent> = (data: PlaybackEventMap[K]) => void;

class AudioPlaybackService {
  private audioElement: HTMLAudioElement | null = null;
  private currentFile: AudioFile | null = null;
  private currentBlobUrl: string | null = null;
  private listeners: Map<PlaybackEvent, Set<Function>> = new Map();
  private animationFrameId: number | null = null;
  
  // Публичное состояние
  public state: PlaybackState = {
    currentFile: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    progress: 0,
  };

  on<K extends PlaybackEvent>(event: K, callback: PlaybackEventListener<K>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<K extends PlaybackEvent>(event: K, callback: PlaybackEventListener<K>) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit<K extends PlaybackEvent>(event: K, data: PlaybackEventMap[K]) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  private updateState() {
    this.state = {
      currentFile: this.currentFile,
      isPlaying: this.isPlaying(),
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
      progress: this.getProgress(),
    };
    this.emit('statechange', this.state);
  }

  private revokeCurrentUrl() {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }

  private startProgressTracking() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    const updateProgress = () => {
      if (this.audioElement && !this.audioElement.paused) {
        this.emit('timeupdate', { currentTime: this.audioElement.currentTime });
        this.updateState();
        this.animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        this.animationFrameId = null;
      }
    };
    
    updateProgress();
  }

  private stopProgressTracking() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // async play(file: AudioFile) {
  //   console.log('🎵 Playing file:', file.name);
    
  //   this.stop();

  //   let audioUrl: string;

  //   if (file.blob) {
  //     audioUrl = URL.createObjectURL(file.blob);
  //     this.currentBlobUrl = audioUrl;
  //   } else if (file.path) {
  //     audioUrl = await audioLibrary.getFileUrl(file);
  //     this.currentBlobUrl = audioUrl;
  //   } else {
  //     throw new Error('No audio data available');
  //   }

  //   this.audioElement = new Audio(audioUrl);
  //   this.currentFile = file;

  //   this.audioElement.addEventListener('loadedmetadata', () => {
  //     this.updateState();
  //     this.emit('loadedmetadata', { duration: this.audioElement?.duration || 0 });
  //   });

  //   this.audioElement.addEventListener('ended', () => {
  //     this.emit('ended', undefined);
  //     this.stop();
  //   });

  //   this.audioElement.addEventListener('error', (e) => {
  //     console.error('Audio playback error:', e);
  //     this.stop();
  //   });

  //   await this.audioElement.play();
  //   this.startProgressTracking();
  //   this.updateState();
  //   this.emit('play', { file });
  // }

  async play(file: AudioFile) {
    console.log('🎵 Playing file:', file.name);
    
    try {
      this.stop();

      let audioUrl: string;

      if (file.blob) {
        audioUrl = URL.createObjectURL(file.blob);
        this.currentBlobUrl = audioUrl;
      } else if (file.path) {
        audioUrl = await audioLibrary.getFileUrl(file);
        this.currentBlobUrl = audioUrl;
      } else {
        throw new Error('No audio data available');
      }

      this.audioElement = new Audio(audioUrl);
      this.currentFile = file;

      // Ждём загрузки метаданных, чтобы получить длительность
      await new Promise((resolve) => {
        this.audioElement!.addEventListener('loadedmetadata', resolve, { once: true });
      });

      console.log('Duration loaded:', this.audioElement.duration);

      this.audioElement.addEventListener('loadedmetadata', () => {
        this.updateState();
        this.emit('loadedmetadata', { duration: this.audioElement?.duration || 0 });
      });

      this.audioElement.addEventListener('ended', () => {
        this.emit('ended', undefined);
        this.stop();
      });

      this.audioElement.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        this.stop();
      });

      this.updateState();
      await this.audioElement.play();
      this.startProgressTracking();
      this.emit('play', { file });
      
    } catch (err) {
      console.error('Failed to play audio:', err);
      this.currentFile = null;
      this.updateState();
    }
  }

  async preloadMetadata(file: AudioFile): Promise<number> {
  return new Promise(async (resolve) => {
    let audioUrl: string;
    
    if (file.blob) {
      audioUrl = URL.createObjectURL(file.blob);
    } else if (file.path) {
      audioUrl = await audioLibrary.getFileUrl(file);
    } else {
      resolve(0);
      return;
    }
    
    const audio = new Audio(audioUrl);
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      URL.revokeObjectURL(audioUrl);
      resolve(duration);
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(audioUrl);
      resolve(0);
    });
    audio.load();
  });
}


  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.stopProgressTracking();
      this.updateState();
      this.emit('pause', undefined);
    }
  }

  resume() {
    if (this.audioElement) {
      this.audioElement.play();
      this.startProgressTracking();
      this.updateState();
      this.emit('play', { file: this.currentFile! });
    }
  }

  stop() {
    this.stopProgressTracking();
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    this.revokeCurrentUrl();
    this.currentFile = null;
    this.updateState();
    this.emit('stop', undefined);
  }

  seek(time: number) {
    if (this.audioElement) {
      this.audioElement.currentTime = time;
      this.updateState();
      // Принудительно отправляем timeupdate для мгновенного обновления
      this.emit('timeupdate', { currentTime: time });
    }
  }

  getCurrentFile(): AudioFile | null {
    return this.currentFile;
  }

  isPlaying(): boolean {
    return this.audioElement !== null && !this.audioElement.paused;
  }

  getCurrentTime(): number {
    return this.audioElement?.currentTime || 0;
  }

  getDuration(): number {
    return this.audioElement?.duration || 0;
  }

  getProgress(): number {
    const duration = this.getDuration();
    const currentTime = this.getCurrentTime();
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  }

  getState(): PlaybackState {
    return { ...this.state };
  }
}

export const audioPlayback = new AudioPlaybackService();