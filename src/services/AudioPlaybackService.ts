// AudioPlaybackService.ts
import { AudioFile } from '../types/audioLibrary';

type EventCallback = (...args: any[]) => void;

class AudioPlaybackService {
  private audioElement: HTMLAudioElement | null = null;
  private currentFile: AudioFile | null = null;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private isPausedState: boolean = false;

  constructor() {
    this.initAudioElement();
  }

  private initAudioElement() {
    this.audioElement = new Audio();
    this.audioElement.addEventListener('loadedmetadata', () => {
      this.emit('loadedmetadata', { duration: this.audioElement?.duration || 0 });
    });
    this.audioElement.addEventListener('ended', () => {
      this.stop();
    });
    this.audioElement.addEventListener('timeupdate', () => {
      // Можно добавить событие timeupdate если нужно
    });
  }

  private async loadAudioBlob(source: string | Blob | undefined): Promise<Blob | undefined> {
    if (!source) {
      console.error('Audio source is undefined');
      return undefined;
    }
    
    if (source instanceof Blob) {
      return source;
    }
    
    // Если это строка (путь или URL)
    if (typeof source === 'string') {
      try {
        // Для Electron окружения
        if (window.electronAPI?.readFile) {
          const buffer = await window.electronAPI.readFile(source);
          return new Blob([buffer], { type: 'audio/mpeg' });
        }
        
        // Для веб-окружения (через fetch)
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.blob();
      } catch (error) {
        console.error('Failed to load audio blob from path:', error);
        return undefined;
      }
    }
    
    return undefined;
  }

  // ✅ Исправленный метод generateWaveform
  async generateWaveform(audioFile: AudioFile, bars: number = 200): Promise<number[]> {
    try {
      // Сначала пробуем использовать blob, если есть
      let blob = audioFile.blob;
      
      // Если blob нет, пробуем загрузить по пути
      if (!blob && audioFile.path) {
        blob = await this.loadAudioBlob(audioFile.path) || undefined;
      }
      
      // Если всё еще нет blob, генерируем синтетическую waveform
      if (!blob) {
        console.warn('No audio data available, generating synthetic waveform');
        return this.generateSyntheticWaveform(bars);
      }
      
      const arrayBuffer = await blob.arrayBuffer();
      
      // Создаем AudioContext только когда нужен
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0); // Левый канал
        
        const samplesPerBar = Math.floor(channelData.length / bars);
        const amplitudes: number[] = [];
        
        // Для более реалистичной waveform используем RMS (Root Mean Square)
        for (let i = 0; i < bars; i++) {
          const start = i * samplesPerBar;
          const end = Math.min(start + samplesPerBar, channelData.length);
          
          let sumSquares = 0;
          let peak = 0;
          
          for (let j = start; j < end; j++) {
            const sample = Math.abs(channelData[j]);
            sumSquares += sample * sample;
            if (sample > peak) peak = sample;
          }
          
          // Используем комбинацию RMS и Peak для лучшего визуального эффекта
          const rms = Math.sqrt(sumSquares / (end - start));
          const amplitude = Math.min(1, (rms + peak * 0.3) * 1.5);
          
          amplitudes.push(amplitude);
        }
        
        // Применяем сглаживание для плавных переходов
        const smoothedAmplitudes = this.smoothArray(amplitudes, 3);
        
        // Нормализуем для лучшей видимости
        const maxAmp = Math.max(...smoothedAmplitudes);
        const normalizedAmplitudes = maxAmp > 0 
          ? smoothedAmplitudes.map(a => Math.min(1, a / maxAmp * 0.9)) 
          : smoothedAmplitudes;
        
        return normalizedAmplitudes;
        
      } finally {
        await audioContext.close();
      }
      
    } catch (error) {
      console.error('Error generating waveform:', error);
      // Возвращаем реалистичную синтетическую waveform
      return this.generateSyntheticWaveform(bars);
    }
  }

  // ✅ Сглаживание массива
  private smoothArray(arr: number[], windowSize: number): number[] {
    const result: number[] = [];
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let i = 0; i < arr.length; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = -halfWindow; j <= halfWindow; j++) {
        const index = i + j;
        if (index >= 0 && index < arr.length) {
          sum += arr[index];
          count++;
        }
      }
      
      result.push(sum / count);
    }
    
    return result;
  }

  // ✅ Генерация синтетической waveform
  private generateSyntheticWaveform(bars: number): number[] {
    const amplitudes: number[] = [];
    
    // Создаем несколько "секций" с разной громкостью (как в реальной музыке)
    const sections = [
      { start: 0, end: 0.15, intensity: 0.3 },   // Интро - тихо
      { start: 0.15, end: 0.35, intensity: 0.7 }, // Вступление - средняя громкость
      { start: 0.35, end: 0.65, intensity: 0.9 }, // Припев/Кульминация - громко
      { start: 0.65, end: 0.85, intensity: 0.6 }, // Бридж - средняя
      { start: 0.85, end: 1.0, intensity: 0.4 }    // Затихание
    ];
    
    for (let i = 0; i < bars; i++) {
      const position = i / bars;
      
      // Находим текущую секцию
      let currentSection = sections[0];
      for (const section of sections) {
        if (position >= section.start && position <= section.end) {
          currentSection = section;
          break;
        }
      }
      
      // Базовый envelope
      let amplitude = currentSection.intensity;
      
      // Добавляем ритмические паттерны (удары барабанов)
      const beatPosition = (position * 4) % 1; // 4/4 такт
      const isBeat = beatPosition < 0.1 || (beatPosition > 0.45 && beatPosition < 0.55);
      const beatBoost = isBeat ? 0.15 : 0;
      
      // Добавляем небольшие флуктуации
      const fluctuation = Math.sin(position * Math.PI * 12) * 0.08;
      const microRandom = (Math.random() - 0.5) * 0.05;
      
      amplitude += beatBoost + fluctuation + microRandom;
      
      // Ограничиваем и добавляем небольшой минимальный уровень
      amplitude = Math.min(0.95, Math.max(0.08, amplitude));
      
      amplitudes.push(amplitude);
    }
    
    // Применяем сильное сглаживание для реалистичности
    const smoothed = this.smoothArray(amplitudes, 5);
    
    // Добавляем эффект "атаки" в начале каждого такта
    for (let i = 0; i < smoothed.length; i++) {
      const beatPhase = (i / smoothed.length * 4) % 1;
      if (beatPhase < 0.05) {
        smoothed[i] = Math.min(1, smoothed[i] * 1.2);
      }
    }
    
    return smoothed;
  }

  async play(file: AudioFile): Promise<void> {
    if (!this.audioElement) return;
    
    try {
      this.stop();
      this.currentFile = file;
      
      // Получаем blob из файла
      let blob = file.blob;
      
      if (!blob && file.path) {
        blob = await this.loadAudioBlob(file.path);
      }
      
      // ✅ Проверяем, что blob не null
      if (!blob) {
        throw new Error('No audio data available - blob is null');
      }
      
      // ✅ Теперь TypeScript знает, что blob точно не null
      const url = URL.createObjectURL(blob);
      
      this.audioElement.src = url;
      this.audioElement.volume = 0.8;
      
      await this.audioElement.play();
      this.isPausedState = false;
      
      this.emit('play', file);
      
      // Очищаем URL после загрузки
      this.audioElement.onloadeddata = () => {
        URL.revokeObjectURL(url);
      };
      
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  }

  pause(): void {
    if (this.audioElement && this.currentFile && !this.audioElement.paused) {
      this.audioElement.pause();
      this.isPausedState = true;
      this.emit('pause');
    }
  }

  resume(): void {
    if (this.audioElement && this.currentFile && this.audioElement.paused) {
      this.audioElement.play();
      this.isPausedState = false;
      this.emit('play', this.currentFile);
    }
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      if (this.audioElement.src) {
        URL.revokeObjectURL(this.audioElement.src);
        this.audioElement.src = '';
      }
      this.currentFile = null;
      this.isPausedState = false;
      this.emit('stop');
    }
  }

  seek(time: number): void {
    if (this.audioElement && this.currentFile && !isNaN(time)) {
      this.audioElement.currentTime = Math.min(time, this.audioElement.duration);
      this.emit('seek', { time });
    }
  }

  getCurrentTime(): number {
    return this.audioElement?.currentTime || 0;
  }

  getDuration(): number {
    return this.audioElement?.duration || 0;
  }

  getCurrentFile(): AudioFile | null {
    return this.currentFile;
  }

  isPaused(): boolean {
    return this.isPausedState || (this.audioElement?.paused ?? true);
  }

  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }
}

export const audioPlayback = new AudioPlaybackService();

// src/services/AudioPlaybackService.ts

// import { AudioFile } from '../types/audioLibrary';
// import { audioLibrary } from '../lib/audioLibrary';

// type PlaybackEvent = 'play' | 'pause' | 'stop' | 'timeupdate' | 'ended' | 'loadedmetadata' | 'seek';

// type PlaybackEventMap = {
//   play: { file: AudioFile };
//   pause: void;
//   stop: void;
//   timeupdate: { currentTime: number };
//   ended: void;
//   seek: {time: number};
//   loadedmetadata: { duration: number };
//   isPaused: boolean;
// };

// type PlaybackEventListener<K extends PlaybackEvent> = (data: PlaybackEventMap[K]) => void;

// class AudioPlaybackService {
//   private audioElement: HTMLAudioElement | null = null;
//   private currentFile: AudioFile | null = null;
//   private currentBlobUrl: string | null = null;
//   private listeners: Map<PlaybackEvent, Set<Function>> = new Map();
//   private waveformCache: Map<string, number[]> = new Map();
  
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

//   private isElectron(): boolean {
//     return !!(window.electronAPI);
//   }

//   private revokeCurrentUrl() {
//     if (this.currentBlobUrl) {
//       URL.revokeObjectURL(this.currentBlobUrl);
//       this.currentBlobUrl = null;
//     }
//   }

//   async play(file: AudioFile) {
//     console.log('🎵 Playing file:', file.name);    
//     try {
//       // Останавливаем текущее воспроизведение
//       if (this.audioElement) {
//         this.audioElement.pause();
//         this.audioElement.src = '';
//         this.audioElement = null;
//       }
//       this.revokeCurrentUrl();

//       let audioUrl: string;

//       if (file.blob) {
//         audioUrl = URL.createObjectURL(file.blob);
//         this.currentBlobUrl = audioUrl;
//       } else if (file.path) {
//         audioUrl = await audioLibrary.getFileUrl(file);
//         this.currentBlobUrl = audioUrl;
//       } else {
//         throw new Error('No audio data available');
//       }

//       this.audioElement = new Audio();
//       this.currentFile = file;
      
//       // Принудительно загружаем метаданные
//       this.audioElement.preload = 'metadata';
      
//       // Обработчик загрузки метаданных
//       this.audioElement.onloadedmetadata = () => {
//         const duration = this.audioElement?.duration || 0;
//         console.log('Metadata loaded, duration:', duration);
//         this.emit('loadedmetadata', { duration });
//       };
      
//       this.audioElement.onerror = (e) => {
//         console.error('Audio error:', e);
//         console.error('Audio error code:', this.audioElement?.error?.code);
//         console.error('Audio error message:', this.audioElement?.error?.message);
//       };
      
//       this.audioElement.onended = () => {
//         console.log('Audio ended');
//         this.stop();
//       };
      
//       this.audioElement.src = audioUrl;
//       this.audioElement.load();
      
//       // Пробуем воспроизвести
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
//       this.emit('pause', undefined);
//     }
//   }

//   resume() {
//     if (this.audioElement) {
//       this.audioElement.play().catch(err => console.error('Resume failed:', err));
//       this.emit('play', { file: this.currentFile! });
//     }
//   }

//   stop() {
//     if (this.audioElement) {
//       this.audioElement.pause();
//       this.audioElement.src = '';
//       this.audioElement = null;
//     }
//     this.revokeCurrentUrl();
//     this.currentFile = null;
//     this.emit('stop', undefined);
//   }

//   seek(time: number) {
//     if (this.audioElement) {
//       this.audioElement.currentTime = time;
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

//   async generateRealWaveform(audioFile: AudioFile, bars: number = 200): Promise<number[]> {
//   return new Promise(async (resolve, reject) => {
//     try {
//       const blob = audioFile.blob || await this.loadAudioBlob(audioFile.path);
//       const arrayBuffer = await blob.arrayBuffer();
//       const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
//       const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
//       const channelData = audioBuffer.getChannelData(0); // Левый канал
      
//       const samplesPerBar = Math.floor(channelData.length / bars);
//       const amplitudes: number[] = [];
      
//       // Сглаживание для более реалистичного вида
//       const smoothingWindow = 5;
      
//       for (let i = 0; i < bars; i++) {
//         let sum = 0;
//         const start = i * samplesPerBar;
//         const end = Math.min(start + samplesPerBar, channelData.length);
        
//         // Находим пиковое значение в этом сегменте
//         for (let j = start; j < end; j++) {
//           sum += Math.abs(channelData[j]);
//         }
        
//         let amplitude = sum / samplesPerBar;
//         amplitude = Math.min(1, Math.max(0, amplitude * 2)); // Нормализуем
        
//         amplitudes.push(amplitude);
//       }
      
//       // Применяем сглаживание для плавных переходов
//       const smoothedAmplitudes = amplitudes.map((_, i) => {
//         let sum = 0;
//         let count = 0;
//         for (let j = -smoothingWindow; j <= smoothingWindow; j++) {
//           if (amplitudes[i + j] !== undefined) {
//             sum += amplitudes[i + j];
//             count++;
//           }
//         }
//         return sum / count;
//       });
      
//       // Добавляем небольшой шум для натуральности (опционально)
//       const finalAmplitudes = smoothedAmplitudes.map(amp => {
//         const noise = Math.random() * 0.05;
//         return Math.min(1, amp + noise);
//       });
      
//       await audioContext.close();
//       resolve(finalAmplitudes);
      
//     } catch (error) {
//       console.error('Error generating waveform:', error);
//       // Возвращаем синтетическую, но реалистичную waveform
//       resolve(this.generateSyntheticWaveform(bars));
//     }
//   });
// }

// // Синтетическая, но реалистичная waveform для демо
// private generateSyntheticWaveform(bars: number): number[] {
//   const amplitudes: number[] = [];
  
//   for (let i = 0; i < bars; i++) {
//     // Создаем паттерны, похожие на реальную музыку
//     const position = i / bars; // 0..1
    
//     // Огибающая - тише в начале и конце, громче в середине
//     const envelope = Math.sin(position * Math.PI);
    
//     // Ритмические паттерны
//     const beatPattern = Math.sin(position * Math.PI * 8) * 0.3;
//     const fillPattern = Math.sin(position * Math.PI * 16) * 0.15;
    
//     // Случайные вариации
//     const random = Math.random() * 0.2;
    
//     let amplitude = envelope + beatPattern + fillPattern + random;
//     amplitude = Math.min(0.9, Math.max(0.1, amplitude));
    
//     amplitudes.push(amplitude);
//   }
  
//   // Применяем сглаживание
//   for (let i = 0; i < amplitudes.length; i++) {
//     const neighbors = amplitudes.slice(Math.max(0, i - 2), Math.min(amplitudes.length, i + 3));
//     amplitudes[i] = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
//   }
  
//   return amplitudes;
// }

//   private async analyzeFromTempElement(file: AudioFile, barsCount: number): Promise<number[]> {
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
      
//       return bars;
      
//     } catch (error) {
//       console.warn('Failed to analyze from temp element:', error);
//       throw error;
//     }
//   }

  

//   // Очистка ресурсов
//   cleanup() {
//     if (this.audioElement) {
//       this.audioElement.pause();
//       this.audioElement.src = '';
//       this.audioElement = null;
//     }
//     this.revokeCurrentUrl();
//     this.currentFile = null;
//   }
// }

// export const audioPlayback = new AudioPlaybackService();
