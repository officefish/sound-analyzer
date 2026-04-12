import { MicrophoneState, MicrophoneServiceEvents } from './types';

export class MicrophoneService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private durationIntervalId: number | null = null;
  private recordingStartTime: number = 0;
  private currentDuration: number = 0;
  private isRecordingFlag: boolean = false;
  private currentDeviceId: string = '';
  
  private events: MicrophoneServiceEvents = {};
  private onProcessAudio?: (volume: number) => number;
  
  constructor(onProcessAudio?: (volume: number) => number) {
    this.onProcessAudio = onProcessAudio;
  }
  
  // Подписка на события
  public on<K extends keyof MicrophoneServiceEvents>(
    event: K,
    callback: NonNullable<MicrophoneServiceEvents[K]>
  ): void {
    this.events[event] = callback;
  }
  
  // Установка обработчика для аудио (плагины)
  public setAudioProcessor(processor: (volume: number) => number): void {
    this.onProcessAudio = processor;
  }
  
  // Получение списка устройств
  public async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      this.events.onDevicesUpdate?.(audioInputs);
      
      if (audioInputs.length > 0 && !this.currentDeviceId) {
        this.currentDeviceId = audioInputs[0].deviceId;
        this.events.onDeviceChange?.(this.currentDeviceId);
      }
      
      return audioInputs;
    } catch (err) {
      const errorMsg = 'Не удалось получить доступ к микрофону. Проверьте разрешения.';
      this.events.onError?.(errorMsg);
      return [];
    }
  }
  
  // Запуск записи
  public async startRecording(deviceId?: string): Promise<boolean> {
    
    console.log(`Microphone service startRecoding called`)
    
    if (this.isRecordingFlag) {
      console.log('Already recording, ignoring start');
      return false;
    }
    
    try {
      this.events.onError?.(null as any);
      
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;
      this.currentDeviceId = deviceId || '';
      
      this.audioContext = new AudioContext();
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.sourceNode.connect(this.analyserNode);
      
      await this.audioContext.resume();
      this.isRecordingFlag = true;
      this.recordingStartTime = Date.now();
      this.currentDuration = 0;
      
      // ✅ Таймер длительности — обновляем состояние, но НЕ вызываем onRecordingStop
      this.durationIntervalId = window.setInterval(() => {
        if (this.isRecordingFlag) {
          this.currentDuration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
          // ✅ Отправляем событие обновления длительности (новое событие)
          this.events.onDurationUpdate?.(this.currentDuration);
        }
      }, 1000);
      
      // Запуск анализа громкости
      this.startVolumeAnalysis();
      
      this.events.onRecordingStart?.();
      
      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      const errorMsg = 'Не удалось получить доступ к микрофону. Проверьте разрешения.';
      this.events.onError?.(errorMsg);
      return false;
    }
  }
  
  // Остановка записи
  public stopRecording(): void {
    if (!this.isRecordingFlag) {
      console.log('Not recording, ignoring stop');
      return;
    }
    
    console.log('Stopping recording...');
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.durationIntervalId) {
      clearInterval(this.durationIntervalId);
      this.durationIntervalId = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    const finalDuration = this.currentDuration;
    this.isRecordingFlag = false;
    this.currentDuration = 0;
    this.recordingStartTime = 0;
    
    // ✅ Только один раз вызываем остановку
    this.events.onRecordingStop?.(finalDuration);
  }
  
  // Смена устройства
  public async changeDevice(deviceId: string): Promise<void> {
    if (this.currentDeviceId === deviceId) return;
    
    const wasRecording = this.isRecordingFlag;
    
    if (wasRecording) {
      this.stopRecording();
    }
    
    this.currentDeviceId = deviceId;
    this.events.onDeviceChange?.(deviceId);
    
    if (wasRecording) {
      // Даём время на освобождение ресурсов
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.startRecording(deviceId);
    }
  }
  
  // Получение текущего состояния
  public getState(): Partial<MicrophoneState> {
    return {
      isRecording: this.isRecordingFlag,
      recordingDuration: this.currentDuration,
      selectedDeviceId: this.currentDeviceId,
    };
  }
  
  // Освобождение ресурсов
  public dispose(): void {
    this.stopRecording();
    this.events = {};
  }
  
  // Приватный метод: анализ громкости
  private startVolumeAnalysis(): void {
    if (!this.analyserNode) return;
    
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    
    const updateVolume = () => {
      if (!this.analyserNode || !this.isRecordingFlag) return;
      
      this.analyserNode.getByteFrequencyData(dataArray);
      let average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      let normalizedVolume = Math.min(1, average / 128);
      
      let processedVolume = normalizedVolume;
      if (this.onProcessAudio) {
        processedVolume = this.onProcessAudio(normalizedVolume);
      }
      
      this.events.onVolumeUpdate?.(normalizedVolume, processedVolume);
      
      this.animationFrameId = requestAnimationFrame(updateVolume);
    };
    
    updateVolume();
  }
}