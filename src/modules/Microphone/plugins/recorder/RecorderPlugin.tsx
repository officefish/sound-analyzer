// src/plugins/microphone2/RecorderPlugin.tsx

import { IPlugin, IPluginWidget, 
  //IPluginContext 
} from '../../../../types/plugins';
import RecorderWidget from './widgets/RecorderWidget';
import { fileSystemService } from './services/FileSystemService';
import { audioLibrary } from '../../../../lib/audioLibrary';

interface ChunkData {
  id: string;
  timestamp: number;
  size: number;
  blob: Blob;
}

// Определяем поддерживаемые MIME типы
const getSupportedFormats = (): Array<{ format: 'wav' | 'webm' | 'mp4'; mimeType: string; label: string }> => {
  const supported: Array<{ format: 'wav' | 'webm' | 'mp4'; mimeType: string; label: string }> = [];
  
  // WebM (обычно поддерживается везде)
  if (MediaRecorder.isTypeSupported('audio/webm')) {
    supported.push({ format: 'webm', mimeType: 'audio/webm', label: 'WEBM' });
  } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    supported.push({ format: 'webm', mimeType: 'audio/webm;codecs=opus', label: 'WEBM' });
  }
  
  // MP4
  if (MediaRecorder.isTypeSupported('audio/mp4')) {
    supported.push({ format: 'mp4', mimeType: 'audio/mp4', label: 'MP4' });
  }
  
  // OGG
  if (MediaRecorder.isTypeSupported('audio/ogg')) {
    supported.push({ format: 'webm', mimeType: 'audio/ogg', label: 'OGG' });
  }
  
  // WAV — MediaRecorder не поддерживает WAV напрямую, только через конвертацию
  // Пока добавляем как недоступный, позже можно добавить конвертацию
  // supported.push({ format: 'wav', mimeType: 'audio/wav', label: 'WAV (скоро)' });
  
  // Если ничего не поддерживается, добавляем дефолтный
  if (supported.length === 0) {
    supported.push({ format: 'webm', mimeType: '', label: 'AUDIO' });
  }
  
  return supported;
};

class RecorderPluginClass implements IPlugin {
  id = 'microphone2-recorder';
  name = 'Audio Recorder';
  version = '1.0.0';
  description = 'Записывает звук с микрофона интервальными сегментами';
  icon = '🎙️';
  moduleId = 'microphone' as const;
  enabled = false;
  
  availableActions = [
    'start', 'stop', 'saveSegment', 'setInterval', 
    'getStats', 'isElectronAvailable', 'setFormat',
    'setAutoSave', 'getChunks', 'clearChunks', 'setMaxChunkSize',
    'startAutoRecording', 'stopAutoRecording', 'isAutoRecording'
  ];
  
  settings = {
    intervalSeconds: 30,
    autoSave: true,
    format: 'wav',
    maxChunkSize: 50 * 1024 * 1024,
    autoRecording: false, // Режим автозаписи
  };
  
  widget: IPluginWidget = {
    id: 'recorder-widget',
    pluginId: 'microphone2-recorder',
    title: 'Audio Recorder',
    icon: '🎙️',
    position: 'bottom',
    order: 2,
    width: 'full',
    component: RecorderWidget,
  };
  
  // Приватные поля
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecordingFlag = false;
  private isAutoRecordingFlag = false;
  private recordingStartTime = 0;
  private currentStream: MediaStream | null = null;
  private segmentCount = 0;
  private totalRecordings = 0;
  private recentFiles: string[] = [];
  private intervalSeconds = 30;
  private segmentTimer: number | null = null;
  private currentSegmentStart = 0;
  //private currentSegmentDuration: number = 0; // Текущая длительность сегмента
  private chunks: ChunkData[] = [];
  private currentChunkSize = 0;
  private maxChunkSize = 50 * 1024 * 1024;

  // Система событий для связи с виджетом
  private eventListeners: Map<string, Set<Function>> = new Map();
  
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }
  
  off(event: string, callback: Function): void {
    this.eventListeners.get(event)?.delete(callback);
  }
  
  private emit(event: string, data?: any): void {
    this.eventListeners.get(event)?.forEach(callback => callback(data));
  }
  
  // Добавляем поле для хранения поддерживаемых форматов
  private supportedFormats = getSupportedFormats();
  
  // Получение статистики
  private getStats() {
    // Получаем файлы из коллекции 'buffer' через audioLibrary
    const bufferFiles = audioLibrary.getFilesByCollection('buffer');
    const totalSize = bufferFiles.reduce((sum, f) => sum + f.size, 0);
    
    return {
      totalRecordings: this.totalRecordings,
      recentFiles: this.recentFiles,
      segmentCount: this.segmentCount,
      isRecording: this.isRecordingFlag,
      isAutoRecording: this.isAutoRecordingFlag,
      chunksCount: bufferFiles.length,
      chunksTotalSize: totalSize,
      currentChunkSize: totalSize,
      maxChunkSize: this.maxChunkSize,
    };
  }

  // Метод для автоматического старта автозаписи (вызывается при старте микрофона)
  // Метод для автоматического старта автозаписи (вызывается при старте микрофона)
  private tryStartAutoRecording(): void {
    if (this.settings.autoSave && !this.isRecordingFlag && this.currentStream) {
      console.log('🔁 Auto-recording: starting automatically');
      this.startAutoRecording(this.currentStream);
    }
  }
  
  // Сохранение сегмента
 // src/plugins/microphone2/RecorderPlugin.tsx


// ... внутри класса RecorderPluginClass

private async saveSegment(isManual = false): Promise<{ success: boolean; path?: string; error?: string; savedToChunk?: boolean }> {
  if (this.audioChunks.length === 0) {
    console.warn('No audio chunks to save');
    return { success: false, error: 'No audio data' };
  }

  // Если автосохранение выключено и это не ручное сохранение — пропускаем
  if (!this.settings.autoSave && !isManual) {
    console.log('Auto-save disabled, skipping segment save');
    return { success: false, error: 'Auto-save disabled' };
  }

  // Определяем MIME-тип
  const mimeType = this.settings.format === 'wav' ? 'audio/wav' : 'audio/webm';
  const blob = new Blob(this.audioChunks, { type: mimeType });

  const duration = Date.now() - this.currentSegmentStart;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `recording_${timestamp}_${duration}ms.${this.settings.format}`;

  // Сохраняем через audioLibrary (единый интерфейс для Electron и браузера)
  const savedFile = await audioLibrary.saveAudioFile(blob, filename, 'buffer');

  if (savedFile) {
    // Успешно сохранили (в файловую систему или в память)
    this.totalRecordings++;
    this.recentFiles = [filename, ...this.recentFiles].slice(0, 5);
    this.audioChunks = [];
    this.currentSegmentStart = Date.now();
    this.segmentCount++;
    this.emit('onSegmentSaved', this.segmentCount);

    return {
      success: true,
      path: savedFile.path || savedFile.id,
      savedToChunk: !savedFile.path, // если нет пути, значит сохранили в память (чанк)
    };
  }

  // Если сохранение не удалось (например, нет прав или ошибка)
  console.error('Failed to save audio file via audioLibrary');
  return { success: false, error: 'Save failed' };
}

  // private async saveSegment(isManual = false): Promise<{ success: boolean; path?: string; error?: string; savedToChunk?: boolean }> {
  //   if (this.audioChunks.length === 0) {
  //     console.warn('No audio chunks to save');
  //     return { success: false, error: 'No audio data' };
  //   }
    
  //   // Если автосохранение выключено и это не ручное сохранение — пропускаем
  //   if (!this.settings.autoSave && !isManual) {
  //     console.log('Auto-save disabled, skipping segment save');
  //     return { success: false, error: 'Auto-save disabled' };
  //   }
    
  //   const blob = new Blob(this.audioChunks, { type: this.settings.format === 'wav' ? 'audio/wav' : 'audio/webm' });
    
  //   const duration = Date.now() - this.currentSegmentStart;
  //   const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  //   const filename = `recording_${timestamp}_${duration}ms.${this.settings.format}`;
    
  //   const isElectronAvailable = fileSystemService.isAvailable();
    
  //   if (isElectronAvailable && this.settings.autoSave) {
  //     const result = await fileSystemService.saveAudioFile(blob, filename);
  //     if (result.success) {
  //       this.totalRecordings++;
  //       this.recentFiles = [filename, ...this.recentFiles].slice(0, 5);
  //       this.audioChunks = [];
  //       this.currentSegmentStart = Date.now();
  //       this.segmentCount++;
  //       return { success: true, path: result.path };
  //     }
  //   }
    
  //   // Fallback: сохраняем в чанк
  //   const chunk: ChunkData = {
  //     id: `chunk_${timestamp}`,
  //     timestamp: Date.now(),
  //     size: blob.size,
  //     blob,
  //   };
    
  //   this.chunks.push(chunk);
  //   this.currentChunkSize += blob.size;
  //   this.totalRecordings++;
    
  //   this.audioChunks = [];
  //   this.currentSegmentStart = Date.now();
  //   this.segmentCount++;
    
  //   while (this.currentChunkSize > this.maxChunkSize && this.chunks.length > 1) {
  //     const removed = this.chunks.shift();
  //     if (removed) {
  //       this.currentChunkSize -= removed.size;
  //     }
  //   }

  //   this.segmentCount++;
  //   this.emit('onSegmentSaved', this.segmentCount);
    
  //   console.log(`📦 Saved to chunk: ${filename}, total chunks: ${this.chunks.length}`);
  //   return { success: true, savedToChunk: true };
  // }
  
  // Запуск интервального таймера для автозаписи
  private startSegmentTimer(): void {
    if (this.segmentTimer) clearInterval(this.segmentTimer);
    
    // Запускаем таймер, который срабатывает каждую секунду для обновления UI
    this.segmentTimer = window.setInterval(async () => {
      if (this.isRecordingFlag && this.isAutoRecordingFlag) {
        const currentTime = Math.floor((Date.now() - this.currentSegmentStart) / 1000);
        
        // Проверяем, не пора ли сохранить сегмент
        if (currentTime >= this.intervalSeconds && this.audioChunks.length > 0) {
          console.log(`📀 Auto-saving segment after ${currentTime}s (interval: ${this.intervalSeconds}s)`);
          await this.saveSegment(false);
        }
        
        // Отправляем событие обновления прогресса
        this.emit('onProgressUpdate', {
          progress: this.getCurrentSegmentProgress(),
          remaining: this.getRemainingTime(),
          currentTime,
          interval: this.intervalSeconds,
        });
      }
    }, 1000);
  }
  
  private stopSegmentTimer(): void {
    if (this.segmentTimer) {
      clearInterval(this.segmentTimer);
      this.segmentTimer = null;
    }
  }

  // Инициализация рекордера с правильным MIME типом
  private initRecorder(stream: MediaStream): boolean {
    try {
      this.audioChunks = [];
      
      // Находим поддерживаемый MIME тип для выбранного формата
      let mimeType = '';
      let selectedFormat = this.supportedFormats.find(f => f.format === this.settings.format);
      
      if (selectedFormat) {
        mimeType = selectedFormat.mimeType;
      } else if (this.supportedFormats.length > 0) {
        // Если выбранный формат не поддерживается, берём первый доступный
        selectedFormat = this.supportedFormats[0];
        mimeType = selectedFormat.mimeType;
        this.settings.format = selectedFormat.format;
        console.log(`⚠️ Format ${this.settings.format} not supported, falling back to ${selectedFormat.format}`);
      }
      
      console.log(`🎙️ Initializing recorder with format: ${this.settings.format}, mimeType: ${mimeType || 'default'}`);
      
      if (mimeType) {
        this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      } else {
        this.mediaRecorder = new MediaRecorder(stream);
      }
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = async () => {
        if (this.audioChunks.length > 0) {
          await this.saveSegment(true);
        }
        this.stopSegmentTimer();
      };
      
      return true;
    } catch (error) {
      console.error('Failed to init recorder:', error);
      return false;
    }
  }
  
  private resetState(): void {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecordingFlag = false;
    this.recordingStartTime = 0;
    this.segmentCount = 0;
    this.stopSegmentTimer();
  }
  
  // Запуск записи (общий)
  // Приватные методы записи
  private startRecordingInternal(stream?: MediaStream): boolean {
    if (this.isRecordingFlag) return false;
    
    const targetStream = stream || this.currentStream;
    if (!targetStream) return false;
    
    if (!this.initRecorder(targetStream)) return false;
    
    this.mediaRecorder?.start(1000);
    this.isRecordingFlag = true;

    this.recordingStartTime = Date.now();
    this.currentSegmentStart = Date.now();
    
    this.currentStream = targetStream;
    this.audioChunks = [];
    this.segmentCount = 0;
    
    if (this.isAutoRecordingFlag) {
      this.startSegmentTimer();
    }
    
    console.log(`🎙️ Recording started, auto-recording: ${this.isAutoRecordingFlag}, interval: ${this.intervalSeconds}s`);
    return true;
  }
  
  private stopRecordingInternal(): void {
    if (!this.isRecordingFlag || !this.mediaRecorder) return;
    
    this.mediaRecorder.stop();
    this.isRecordingFlag = false;
    this.isAutoRecordingFlag = false;
    this.mediaRecorder = null;
    this.stopSegmentTimer();
    
    console.log(`⏹️ Recording stopped. Total recordings: ${this.totalRecordings}`);
  }
  
  // Публичные методы API

    // Метод для получения списка поддерживаемых форматов (для виджета)
  getAvailableFormats(): Array<{ format: string; label: string; available: boolean }> {
    return [
      { format: 'webm', label: 'WEBM', available: this.supportedFormats.some(f => f.format === 'webm') },
      { format: 'mp4', label: 'MP4', available: this.supportedFormats.some(f => f.format === 'mp4') },
      { format: 'wav', label: 'WAV', available: false }, // WAV через конвертацию пока недоступен
    ];
  }

  getSegmentCount(): number {
    return this.segmentCount;
  }
  
  getInterval(): number {
    return this.intervalSeconds;
  }
  
  startManualRecording(stream?: MediaStream): boolean {
    if (this.isRecordingFlag) {
      this.stopRecordingInternal();
    }
    this.isAutoRecordingFlag = false;
    return this.startRecordingInternal(stream);
  }
  
  stopManualRecording(): void {
    this.stopRecordingInternal();
  }
  
  startAutoRecording(stream?: MediaStream): boolean {
    if (this.isRecordingFlag) {
      this.stopRecordingInternal();
    }
    this.isAutoRecordingFlag = true;
    const started = this.startRecordingInternal(stream);
    if (started) {
      this.startSegmentTimer();
    }
    return started;
  }
  
  stopAutoRecording(): void {
    this.stopRecordingInternal();
  }
  
  isAutoRecording(): boolean {
    return this.isAutoRecordingFlag;
  }

  forceSaveSegment(): Promise<{ success: boolean; path?: string; error?: string; savedToChunk?: boolean }> {
    return this.saveSegment(true);
  }
  
   // Сеттер для интервала с перезапуском таймера
  setInterval(seconds: number): void {
    const newValue = Math.max(1, Math.min(1200, seconds));
    if (this.intervalSeconds === newValue) return;
    
    const oldValue = this.intervalSeconds;
    this.intervalSeconds = newValue;
    this.settings.intervalSeconds = this.intervalSeconds;
    
    console.log(`📀 Interval changed from ${oldValue}s to ${this.intervalSeconds}s`);
    
    // Если идёт автозапись
    if (this.isRecordingFlag && this.isAutoRecordingFlag) {
      const currentSegmentTime = Math.floor((Date.now() - this.currentSegmentStart) / 1000);
      
      // Если новый интервал МЕНЬШЕ текущей длительности сегмента
      if (this.intervalSeconds < currentSegmentTime) {
        console.log(`📀 New interval (${this.intervalSeconds}s) is less than current segment (${currentSegmentTime}s), saving segment immediately`);
        // Немедленно сохраняем текущий сегмент
        this.saveSegment(false).then(() => {
          // Запускаем новый таймер с новым интервалом
          this.stopSegmentTimer();
          this.startSegmentTimer();
        });
      } else {
        // Если новый интервал БОЛЬШЕ, просто перезапускаем таймер
        console.log(`📀 New interval (${this.intervalSeconds}s) is greater than current segment (${currentSegmentTime}s), restarting timer`);
        this.stopSegmentTimer();
        this.startSegmentTimer();
      }
    }
  }

  getCurrentSegmentProgress(): number {
    if (!this.isRecordingFlag || !this.isAutoRecordingFlag) return 0;
    const currentTime = Math.floor((Date.now() - this.currentSegmentStart) / 1000);
    const progress = (currentTime / this.intervalSeconds) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }

  // Получить оставшееся время текущего сегмента
  getRemainingTime(): number {
    if (!this.isRecordingFlag || !this.isAutoRecordingFlag) return this.intervalSeconds;
    const currentTime = Math.floor((Date.now() - this.currentSegmentStart) / 1000);
    return Math.max(0, this.intervalSeconds - currentTime);
  }
  
  setFormat(format: 'wav' | 'webm'): void {
    this.settings.format = format;
  }
  
   // При изменении настроек автосохранения
  // При изменении настроек автосохранения
  setAutoSave(enabled: boolean): void {
    this.settings.autoSave = enabled;
    console.log(`💾 Auto-save: ${enabled}`);
    
    // Если включили автосохранение и есть поток — начинаем автозапись
    if (enabled && this.currentStream && !this.isRecordingFlag) {
      this.startAutoRecording(this.currentStream);
    }
    // Если выключили автосохранение и идёт автозапись — останавливаем
    if (!enabled && this.isAutoRecordingFlag) {
      this.stopAutoRecording();
    }
  }
  
  setMaxChunkSize(mb: number): void {
    this.maxChunkSize = Math.max(10, Math.min(500, mb)) * 1024 * 1024;
    this.settings.maxChunkSize = this.maxChunkSize;
  }
  
  getChunks(): ChunkData[] {
    return this.chunks;
  }
  
  private clearChunks(): void {
    const bufferFiles = audioLibrary.getFilesByCollection('buffer');
    bufferFiles.forEach(async (file) => {
      await audioLibrary.deleteFile(file.id);
    });
    this.totalRecordings = 0;
    this.recentFiles = [];
    console.log('🗑️ All buffer files cleared');
  }
  
  downloadChunk(chunkId: string): void {
    const chunk = this.chunks.find(c => c.id === chunkId);
    if (chunk) {
      const url = URL.createObjectURL(chunk.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chunkId}.${this.settings.format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
  
  setStream(stream: MediaStream): void {
    this.currentStream = stream;
  }
  
  isElectronAvailable(): boolean {
    return fileSystemService.isAvailable();
  }
  
  // Методы жизненного цикла
  onModuleEvent(event: string, data: any, 
    //context?: IPluginContext
  ): void {
    switch (event) {
      case 'streamAvailable':
        if (data?.stream) {
          this.setStream(data.stream);
          this.tryStartAutoRecording();
        }
        break;
      case 'recordingStarted':
        console.log('🎤 Microphone started, checking auto-recording');
        this.tryStartAutoRecording();
        break;
      case 'recordingStopped':
        if (this.isRecordingFlag) {
          this.stopAutoRecording();
        }
        break;
    }
  }
  
  onActivate(
    //context?: IPluginContext
  ): void {
    console.log('🎙️ Recorder Plugin activated');
    this.resetState();
  }
  
  onDeactivate(
    //context?: IPluginContext
  ): void {
    console.log('🎙️ Recorder Plugin deactivated');
    if (this.isRecordingFlag) {
      this.stopRecordingInternal();
    }
    this.resetState();
  }

  getCurrentSegmentTime(): number {
    if (!this.isRecordingFlag) return 0;
    
    // В авторежиме используем начало сегмента
    if (this.isAutoRecordingFlag) {
      return Math.floor((Date.now() - this.currentSegmentStart) / 1000);
    }
    
    // В ручном режиме используем общее начало записи
    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }

  // Получить текущую длительность для отображения в UI
  getDisplayTime(): number {
    
    /*
    console.log('🔍 getDisplayTime called', {
      isRecordingFlag: this.isRecordingFlag,
      isAutoRecordingFlag: this.isAutoRecordingFlag,
    });
    */
    
    if (!this.isRecordingFlag) return 0;
    
    // В авторежиме — длительность текущего сегмента
    if (this.isAutoRecordingFlag) {
      const elapsed = Math.floor((Date.now() - this.currentSegmentStart) / 1000);
      //console.log('  Auto mode, elapsed:', elapsed);
      return elapsed;
    }
    
    // В ручном режиме — общая длительность записи
    const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
    //console.log('  Manual mode, elapsed:', elapsed);
    return elapsed;
  }
  
  execute(action: string, data?: any, 
    //context?: IPluginContext
  ): any {
    switch (action) {
       case 'start':
        return this.startManualRecording(data?.stream);
      case 'stop':
        return this.stopManualRecording();
      case 'startAutoRecording':
        return this.startAutoRecording(data?.stream);
      case 'stopAutoRecording':
        return this.stopAutoRecording();
      case 'isAutoRecording':
        return this.isAutoRecording();
      case 'saveSegment':
        return this.forceSaveSegment();
       case 'getInterval':
        return this.getInterval();
      case 'setInterval':
        return this.setInterval(data);
      case 'setAutoSave':
        return this.setAutoSave(data);
      case 'getStats':
        return this.getStats();
      case 'isElectronAvailable':
        return this.isElectronAvailable();
      case 'setFormat':
        return this.setFormat(data);
      case 'setMaxChunkSize':
        return this.setMaxChunkSize(data);
      case 'getChunks':
        return this.getChunks();
      case 'clearChunks':
        return this.clearChunks();
      case 'downloadChunk':
        return this.downloadChunk(data);
      case 'isRecording':
        return this.isRecordingFlag;
      case 'getDuration':
        return this.isRecordingFlag ? (Date.now() - this.recordingStartTime) / 1000 : 0;
      case 'setStream':
        return this.setStream(data?.stream);
      case 'getAvailableFormats':
        return this.getAvailableFormats();

      case 'getCurrentSegmentProgress':
        return this.getCurrentSegmentProgress();

      case 'getDisplayTime':
        return this.getDisplayTime();
      case 'getCurrentSegmentTime': // оставляем для совместимости
        return this.getDisplayTime();
     
      case 'getRemainingTime':
        return this.getRemainingTime();
      case 'getSegmentCount':
        return this.getSegmentCount();
      
        default:
        return null;
    }
  }
}

export const RecorderPlugin = new RecorderPluginClass();

