// src/services/AudioPlaybackService.ts

import { AudioFile } from '../types/audioLibrary';
import { audioLibrary } from '../lib/audioLibrary';

type PlaybackEvent = 'play' | 'pause' | 'stop' | 'timeupdate' | 'ended' | 'loadedmetadata';

type PlaybackEventMap = {
  play: { file: AudioFile };
  pause: void;
  stop: void;
  timeupdate: { currentTime: number };
  ended: void;
  loadedmetadata: { duration: number };
};

type PlaybackEventListener<K extends PlaybackEvent> = (data: PlaybackEventMap[K]) => void;

class AudioPlaybackService {
  private audioElement: HTMLAudioElement | null = null;
  private currentFile: AudioFile | null = null;
  private currentBlobUrl: string | null = null;
  private listeners: Map<PlaybackEvent, Set<Function>> = new Map();
  private waveformCache: Map<string, number[]> = new Map();

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

  private isElectron(): boolean {
    return !!(window.electronAPI);
  }

  private revokeCurrentUrl() {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }

  async play(file: AudioFile) {
    console.log('🎵 Playing file:', file.name);
    
    try {
      // Останавливаем текущее воспроизведение
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.src = '';
        this.audioElement = null;
      }
      this.revokeCurrentUrl();

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

      this.audioElement = new Audio();
      this.currentFile = file;
      
      // Принудительно загружаем метаданные
      this.audioElement.preload = 'metadata';
      
      // Обработчик загрузки метаданных
      this.audioElement.onloadedmetadata = () => {
        const duration = this.audioElement?.duration || 0;
        console.log('Metadata loaded, duration:', duration);
        this.emit('loadedmetadata', { duration });
      };
      
      this.audioElement.onerror = (e) => {
        console.error('Audio error:', e);
        console.error('Audio error code:', this.audioElement?.error?.code);
        console.error('Audio error message:', this.audioElement?.error?.message);
      };
      
      this.audioElement.onended = () => {
        console.log('Audio ended');
        this.stop();
      };
      
      this.audioElement.src = audioUrl;
      this.audioElement.load();
      
      // Пробуем воспроизвести
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Play failed:', error);
        });
      }
      
    } catch (err) {
      console.error('Failed to play audio:', err);
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.emit('pause', undefined);
    }
  }

  resume() {
    if (this.audioElement) {
      this.audioElement.play().catch(err => console.error('Resume failed:', err));
      this.emit('play', { file: this.currentFile! });
    }
  }

  stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    this.revokeCurrentUrl();
    this.currentFile = null;
    this.emit('stop', undefined);
  }

  seek(time: number) {
    if (this.audioElement) {
      this.audioElement.currentTime = time;
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

  async generateWaveform(file: AudioFile, barsCount: number = 200): Promise<number[]> {
    // Проверяем кэш
    if (this.waveformCache.has(file.id)) {
      return this.waveformCache.get(file.id)!;
    }

    // В Electron используем только псевдо-волну (без реального анализа)
    if (this.isElectron()) {
      console.log('Running in Electron, using pseudo-waveform');
      const pseudo = this.generatePseudoWaveform(file.name, barsCount);
      this.waveformCache.set(file.id, pseudo);
      return pseudo;
    }

    // В браузере пытаемся получить реальные амплитуды
    try {
      console.log('Running in browser, attempting real waveform analysis');
      const realWaveform = await this.analyzeFromTempElement(file, barsCount);
      this.waveformCache.set(file.id, realWaveform);
      return realWaveform;
    } catch (error) {
      console.warn('Failed to generate real waveform, using pseudo-waveform:', error);
      const pseudo = this.generatePseudoWaveform(file.name, barsCount);
      this.waveformCache.set(file.id, pseudo);
      return pseudo;
    }
  }

  private async analyzeFromTempElement(file: AudioFile, barsCount: number): Promise<number[]> {
    try {
      let arrayBuffer: ArrayBuffer;
      
      if (file.blob) {
        arrayBuffer = await file.blob.arrayBuffer();
      } else if (file.path) {
        const url = await audioLibrary.getFileUrl(file);
        const response = await fetch(url);
        arrayBuffer = await response.arrayBuffer();
        audioLibrary.revokeUrl(url);
      } else {
        throw new Error('No audio data');
      }

      const audioContext = new OfflineAudioContext({
        numberOfChannels: 1,
        length: 44100 * 10,
        sampleRate: 44100,
      });
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const rawData = audioBuffer.getChannelData(0);
      
      const samplesPerBar = Math.floor(rawData.length / barsCount);
      const bars: number[] = [];
      
      for (let i = 0; i < barsCount; i++) {
        let start = i * samplesPerBar;
        let end = start + samplesPerBar;
        if (end > rawData.length) end = rawData.length;
        let maxAmp = 0;
        for (let s = start; s < end; s++) {
          const val = Math.abs(rawData[s]);
          if (val > maxAmp) maxAmp = val;
        }
        bars.push(Math.min(1.0, maxAmp * 1.25));
      }
      
      // Сглаживание
      for (let i = 1; i < bars.length - 1; i++) {
        bars[i] = (bars[i - 1] + bars[i] + bars[i + 1]) / 3;
      }
      
      return bars;
      
    } catch (error) {
      console.warn('Failed to analyze from temp element:', error);
      throw error;
    }
  }

  private generatePseudoWaveform(seed: string, barsCount: number): number[] {
    const bars: number[] = [];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    
    for (let i = 0; i < barsCount; i++) {
      const t = i / barsCount;
      const value = 0.3 + 
        Math.sin(t * Math.PI * 3 + hash) * 0.3 +
        Math.sin(t * Math.PI * 7 + hash * 2) * 0.2;
      bars.push(Math.min(0.9, Math.max(0.2, value)));
    }
    
    return bars;
  }

  // Очистка ресурсов
  cleanup() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    this.revokeCurrentUrl();
    this.currentFile = null;
  }
}

export const audioPlayback = new AudioPlaybackService();

// // src/services/AudioPlaybackService.ts

// import { AudioFile } from '../types/audioLibrary';
// import { audioLibrary } from '../lib/audioLibrary';

// type PlaybackEvent = 'play' | 'pause' | 'stop' | 'timeupdate' | 'ended' | 'loadedmetadata';

// type PlaybackEventMap = {
//   play: { file: AudioFile };
//   pause: void;
//   stop: void;
//   timeupdate: { currentTime: number };
//   ended: void;
//   loadedmetadata: { duration: number };
// };

// type PlaybackEventListener<K extends PlaybackEvent> = (data: PlaybackEventMap[K]) => void;

// class AudioPlaybackService {
//   private audioElement: HTMLAudioElement | null = null;
//   private currentFile: AudioFile | null = null;
//   private currentBlobUrl: string | null = null;
//   private listeners: Map<PlaybackEvent, Set<Function>> = new Map();
//   private animationFrameId: number | null = null;
//   private lastTimeUpdate = 0;
//   private lastEmittedTime = 0;

//   private audioContext: AudioContext | null = null;
//   private sourceNode: MediaElementAudioSourceNode | null = null;
//   private analyserNode: AnalyserNode | null = null;
//   private waveformCache: Map<string, number[]> = new Map();
//   //private isAnalyzing: boolean = false;

//   // Публичное состояние (простое, без событий)
//   public state = {
//     currentFile: null as AudioFile | null,
//     isPlaying: false,
//     currentTime: 0,
//     duration: 0,
//   };

//   on<K extends PlaybackEvent>(event: K, callback: PlaybackEventListener<K>) {
//     if (!this.listeners.has(event)) {
//       this.listeners.set(event, new Set());
//     }
//     this.listeners.get(event)!.add(callback);
//   }

//   off<K extends PlaybackEvent>(event: K, callback: PlaybackEventListener<K>) {
//     this.listeners.get(event)?.delete(callback);
//   }

//   private emit<K extends PlaybackEvent>(event: K, data: PlaybackEventMap[K]) {
//     this.listeners.get(event)?.forEach(cb => cb(data));
//   }

//   private revokeCurrentUrl() {
//     if (this.currentBlobUrl) {
//       URL.revokeObjectURL(this.currentBlobUrl);
//       this.currentBlobUrl = null;
//     }
//   }

//   private updateState() {
//     this.state = {
//       currentFile: this.currentFile,
//       isPlaying: this.isPlaying(),
//       currentTime: this.getCurrentTime(),
//       duration: this.getDuration(),
//     };
//   }

//   private startProgressTracking() {
//     if (this.animationFrameId) {
//       cancelAnimationFrame(this.animationFrameId);
//       this.animationFrameId = null;
//     }
    
//     const updateProgress = () => {
//       if (this.audioElement && !this.audioElement.paused && !this.audioElement.ended) {
//         const now = Date.now();
//         // Ограничиваем частоту обновлений до 10 раз в секунду
//         if (now - this.lastTimeUpdate >= 100) {
//           this.lastTimeUpdate = now;
//           const currentTime = this.audioElement.currentTime;
//           // Обновляем состояние только если время изменилось значительно
//           if (Math.abs(currentTime - this.lastEmittedTime) > 0.05) {
//             this.lastEmittedTime = currentTime;
//             this.updateState();
//             this.emit('timeupdate', { currentTime });
//           }
//         }
//         this.animationFrameId = requestAnimationFrame(updateProgress);
//       } else {
//         this.animationFrameId = null;
//       }
//     };
    
//     if (this.audioElement && !this.audioElement.paused && !this.audioElement.ended) {
//       this.animationFrameId = requestAnimationFrame(updateProgress);
//     }
//   }

//   private stopProgressTracking() {
//     if (this.animationFrameId) {
//       cancelAnimationFrame(this.animationFrameId);
//       this.animationFrameId = null;
//     }
//   }

//   async play(file: AudioFile) {
//     console.log('🎵 Playing file:', file.name);
    
//     try {
//       // Очищаем предыдущий контекст
//       this.cleanup();

//       let audioUrl: string;

//       if (file.blob) {
//         audioUrl = URL.createObjectURL(file.blob);
//       } else if (file.path) {
//         audioUrl = await audioLibrary.getFileUrl(file);
//       } else {
//         throw new Error('No audio data available');
//       }

//       this.audioElement = new Audio(audioUrl);
//       this.currentFile = file;

//        this.audioElement.onloadedmetadata = () => {
//           console.log('Metadata loaded, duration:', this.audioElement?.duration);
//           this.emit('loadedmetadata', { duration: this.audioElement?.duration || 0 });
//         };

//         this.audioElement.oncanplay = () => {
//           console.log('Can play, duration:', this.audioElement?.duration);
//           if (this.audioElement?.duration) {
//             this.emit('loadedmetadata', { duration: this.audioElement.duration });
//           }
//         }
              
//       // ✅ В Electron не создаём AudioContext и AnalyserNode
//       if (!this.isElectron()) {
//         // В браузере создаём для возможной визуализации
//         try {
//           this.audioContext = new AudioContext();
//           this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
//           this.analyserNode = this.audioContext.createAnalyser();
//           this.analyserNode.fftSize = 256;
          
//           this.sourceNode.connect(this.analyserNode);
//           this.sourceNode.connect(this.audioContext.destination);
          
//           if (this.audioContext.state === 'suspended') {
//             await this.audioContext.resume();
//           }
//         } catch (err) {
//           console.warn('Failed to create audio context for visualization:', err);
//         }
//       }
      
//       this.audioElement.onerror = (e) => {
//         console.error('Audio error:', e);
//       };
      
//       this.audioElement.onended = () => {
//         console.log('Audio ended');
//         this.stop();
//       };
      
//       this.audioElement.src = audioUrl;
//       this.audioElement.load();
      
//       const playPromise = this.audioElement.play();
//       if (playPromise !== undefined) {
//         playPromise.catch(error => {
//           console.error('Play failed:', error);
//         });
//       }
      
      
//     } catch (err) {
//       console.error('Failed to play audio:', err);
//     }
//   }

//   pause() {
//     if (this.audioElement) {
//       this.audioElement.pause();
//       this.stopProgressTracking();
//       this.updateState();
//       this.emit('pause', undefined);
//     }
//   }

//   resume() {
//     if (this.audioElement) {
//       this.audioElement.play();
//       this.updateState();
//       this.emit('play', { file: this.currentFile! });
//       setTimeout(() => this.startProgressTracking(), 100);
//     }
//   }

//   stop() {
//     this.stopProgressTracking();
    
//     if (this.audioElement) {
//       this.audioElement.pause();
//       this.audioElement.src = '';
//       this.audioElement = null;
//     }
//     this.revokeCurrentUrl();
//     this.currentFile = null;
//     this.updateState();
//     this.emit('stop', undefined);
//   }

//   seek(time: number) {
//     if (this.audioElement) {
//       this.audioElement.currentTime = time;
//       this.lastEmittedTime = time;
//       this.updateState();
//       this.emit('timeupdate', { currentTime: time });
//     }
//   }

//   getCurrentFile(): AudioFile | null {
//     return this.currentFile;
//   }

//   isPlaying(): boolean {
//     return this.audioElement !== null && !this.audioElement.paused;
//   }

//   getCurrentTime(): number {
//     return this.audioElement?.currentTime || 0;
//   }

//   getDuration(): number {
//     return this.audioElement?.duration || 0;
//   }

//   getState() {
//     return { ...this.state };
//   }

//   getProgress(): number {
//     const duration = this.getDuration();
//     const currentTime = this.getCurrentTime();
//     if (duration === 0) return 0;
//     return (currentTime / duration) * 100;
//   }

//   private isElectron(): boolean {
//     return !!(window.electronAPI);
//   }

//   async generateWaveform(file: AudioFile, barsCount: number = 200): Promise<number[]> {
//     // Проверяем кэш
//     if (this.waveformCache.has(file.id)) {
//       return this.waveformCache.get(file.id)!;
//     }

//     // ✅ В Electron используем только псевдо-волну (без реального анализа)
//     if (this.isElectron()) {
//       console.log('Running in Electron, using pseudo-waveform');
//       const pseudo = this.generatePseudoWaveform(file.name, barsCount);
//       this.waveformCache.set(file.id, pseudo);
//       return pseudo;
//     }

//     // В браузере пытаемся получить реальные амплитуды
//     try {
//       console.log('Running in browser, attempting real waveform analysis');
//       const realWaveform = await this.analyzeFromTempElement(file, barsCount);
//       this.waveformCache.set(file.id, realWaveform);
//       return realWaveform;
//     } catch (error) {
//       console.warn('Failed to generate real waveform, using pseudo-waveform:', error);
//       const pseudo = this.generatePseudoWaveform(file.name, barsCount);
//       this.waveformCache.set(file.id, pseudo);
//       return pseudo;
//     }
//   }

//   // private async analyzeFromCurrentElement(barsCount: number): Promise<number[]> {
//   //   // ✅ Проверяем наличие analyserNode
//   //   if (!this.analyserNode) {
//   //     console.warn('No analyser node available');
//   //     return this.generatePseudoWaveform('no-analyser', barsCount);
//   //   }
    
//   //   try {
//   //     this.isAnalyzing = true;
      
//   //     // Получаем частотные данные
//   //     const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
//   //     this.analyserNode.getByteFrequencyData(dataArray);
      
//   //     // Преобразуем в амплитуды
//   //     const bars: number[] = [];
//   //     const step = dataArray.length / barsCount;
      
//   //     for (let i = 0; i < barsCount; i++) {
//   //       const start = Math.floor(i * step);
//   //       const end = Math.floor((i + 1) * step);
//   //       let sum = 0;
//   //       for (let j = start; j < end && j < dataArray.length; j++) {
//   //         sum += dataArray[j];
//   //       }
//   //       const avg = sum / (end - start);
//   //       const normalized = Math.min(1.0, avg / 128);
//   //       bars.push(normalized);
//   //     }
      
//   //     this.isAnalyzing = false;
//   //     return bars;
      
//   //   } catch (error) {
//   //     console.warn('Failed to analyze from current element:', error);
//   //     this.isAnalyzing = false;
//   //     return this.generatePseudoWaveform('error', barsCount);
//   //   }
//   // }

//   private async analyzeFromTempElement(file: AudioFile, barsCount: number): Promise<number[]> {
//     // Пробуем через OfflineAudioContext, если не получается — псевдо-волна
//     try {
//       let arrayBuffer: ArrayBuffer;
      
//       if (file.blob) {
//         arrayBuffer = await file.blob.arrayBuffer();
//       } else if (file.path) {
//         const url = await audioLibrary.getFileUrl(file);
//         const response = await fetch(url);
//         arrayBuffer = await response.arrayBuffer();
//         audioLibrary.revokeUrl(url);
//       } else {
//         throw new Error('No audio data');
//       }

//       const audioContext = new OfflineAudioContext({
//         numberOfChannels: 1,
//         length: 44100 * 10,
//         sampleRate: 44100,
//       });
      
//       const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
//       const rawData = audioBuffer.getChannelData(0);
      
//       const samplesPerBar = Math.floor(rawData.length / barsCount);
//       const bars: number[] = [];
      
//       for (let i = 0; i < barsCount; i++) {
//         let start = i * samplesPerBar;
//         let end = start + samplesPerBar;
//         if (end > rawData.length) end = rawData.length;
//         let maxAmp = 0;
//         for (let s = start; s < end; s++) {
//           const val = Math.abs(rawData[s]);
//           if (val > maxAmp) maxAmp = val;
//         }
//         bars.push(Math.min(1.0, maxAmp * 1.25));
//       }
      
//       // Сглаживание
//       for (let i = 1; i < bars.length - 1; i++) {
//         bars[i] = (bars[i - 1] + bars[i] + bars[i + 1]) / 3;
//       }
      
//       this.waveformCache.set(file.id, bars);
//       return bars;
      
//     } catch (error) {
//       console.warn('Failed to analyze from temp element:', error);
//       const pseudo = this.generatePseudoWaveform(file.name, barsCount);
//       this.waveformCache.set(file.id, pseudo);
//       return pseudo;
//     }
//   }

//   private generatePseudoWaveform(seed: string, barsCount: number): number[] {
//     const bars: number[] = [];
//     let hash = 0;
//     for (let i = 0; i < seed.length; i++) {
//       hash = ((hash << 5) - hash) + seed.charCodeAt(i);
//       hash |= 0;
//     }
    
//     for (let i = 0; i < barsCount; i++) {
//       const t = i / barsCount;
//       const value = 0.3 + 
//         Math.sin(t * Math.PI * 3 + hash) * 0.3 +
//         Math.sin(t * Math.PI * 7 + hash * 2) * 0.2;
//       bars.push(Math.min(0.9, Math.max(0.2, value)));
//     }
    
//     return bars;
//   }

//   // Очистка ресурсов
//   cleanup() {
//     if (this.sourceNode) {
//       this.sourceNode.disconnect();
//       this.sourceNode = null;
//     }
//     if (this.analyserNode) {
//       this.analyserNode.disconnect();
//       this.analyserNode = null;
//     }
//     if (this.audioContext) {
//       this.audioContext.close();
//       this.audioContext = null;
//     }
//   }

// }

// export const audioPlayback = new AudioPlaybackService();
