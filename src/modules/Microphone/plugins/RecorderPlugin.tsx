import { IPlugin, IPluginContext } from '../../../types/plugins';

class RecorderPluginClass implements IPlugin {
  id = 'microphone-recorder';
  name = 'Запись звука';
  version = '1.0.0';
  description = 'Записывает звук с микрофона и сохраняет в файл';
  icon = '🎙️';
  moduleId = 'microphone' as const;
  enabled = false;
  
  availableActions = ['start', 'stop', 'save', 'isRecording', 'getDuration', 'pause', 'resume', 'getStatus', 'setStream'];
  
  settings = {
    format: 'wav' as const,
    quality: 'high' as const,
    autoSave: false,
    maxDuration: 300,
  };
  
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecordingFlag = false;
  private recordingStartTime = 0;
  private recordedBlob: Blob | null = null;
  private isPaused = false;
  private currentStream: MediaStream | null = null;
  
  private initRecorder(stream: MediaStream): boolean {
    try {
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };
      this.mediaRecorder.onstop = () => {
        this.recordedBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
      };
      return true;
    } catch (error) {
      console.error('Failed to init recorder:', error);
      return false;
    }
  }
  
  private updateDuration(): number {
    return this.isRecordingFlag ? (Date.now() - this.recordingStartTime) / 1000 : 0;
  }
  
  private createDownloadLink(blob: Blob, filename: string): string {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return filename;
  }
  
  private generateFilename(): string {
    return `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`;
  }
  
  private resetState(): void {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecordingFlag = false;
    this.recordingStartTime = 0;
    this.recordedBlob = null;
    this.isPaused = false;
  }
  
  startRecording(stream?: MediaStream): boolean {
    if (this.isRecordingFlag) return false;
    
    const targetStream = stream || this.currentStream;
    if (!targetStream) return false;
    
    if (!this.initRecorder(targetStream)) return false;
    
    this.mediaRecorder?.start(1000);
    this.isRecordingFlag = true;
    this.recordingStartTime = Date.now();
    this.currentStream = targetStream;
    
    return true;
  }
  
  stopRecording(): Blob | null {
    if (!this.isRecordingFlag || !this.mediaRecorder) return null;
    
    this.mediaRecorder.stop();
    this.isRecordingFlag = false;
    this.mediaRecorder = null;
    
    return this.recordedBlob;
  }
  
  saveRecording(filename?: string): string | null {
    if (!this.recordedBlob) return null;
    const finalName = filename || this.generateFilename();
    return this.createDownloadLink(this.recordedBlob, finalName);
  }
  
  pauseRecording(): boolean {
    if (this.mediaRecorder && !this.isPaused) {
      this.mediaRecorder.pause();
      this.isPaused = true;
      return true;
    }
    return false;
  }
  
  resumeRecording(): boolean {
    if (this.mediaRecorder && this.isPaused) {
      this.mediaRecorder.resume();
      this.isPaused = false;
      return true;
    }
    return false;
  }
  
  getStatus(): object {
    return {
      isRecording: this.isRecordingFlag,
      isPaused: this.isPaused,
      duration: this.updateDuration(),
      hasData: this.recordedBlob !== null,
      dataSize: this.recordedBlob?.size || 0,
    };
  }
  
  setStream(stream: MediaStream): void {
    this.currentStream = stream;
  }
  
  onModuleEvent(event: string, data: any, context?: IPluginContext): void {
    switch (event) {
      case 'streamAvailable':
        if (data?.stream) {
          this.setStream(data.stream);
        }
        break;
      case 'recordingStopped':
        if (this.settings.autoSave && this.recordedBlob) {
          this.saveRecording();
        }
        break;
    }
  }
  
  onActivate(): void {
    console.log('🎙️ Recorder Plugin activated');
    this.resetState();
  }
  
  onDeactivate(): void {
    console.log('🎙️ Recorder Plugin deactivated');
    if (this.isRecordingFlag) {
      this.stopRecording();
    }
    this.resetState();
  }
  
  execute(action: string, data?: any, context?: IPluginContext): any {
    switch (action) {
      case 'start':
        return this.startRecording(data?.stream);
      case 'stop':
        return this.stopRecording();
      case 'save':
        return this.saveRecording(data?.filename);
      case 'isRecording':
        return this.isRecordingFlag;
      case 'getDuration':
        return this.updateDuration();
      case 'pause':
        return this.pauseRecording();
      case 'resume':
        return this.resumeRecording();
      case 'getStatus':
        return this.getStatus();
      case 'setStream':
        return this.setStream(data?.stream);
      case 'reset':
        return this.resetState();
      default:
        return null;
    }
  }
}

export const RecorderPlugin = new RecorderPluginClass();