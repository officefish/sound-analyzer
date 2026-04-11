export interface MicrophoneState {
  isRecording: boolean;
  rawVolume: number;
  processedVolume: number;
  error: string | null;
  audioDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  recordingDuration: number;
}

export interface MicrophoneServiceEvents {
  onVolumeUpdate?: (rawVolume: number, processedVolume: number) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: (duration: number) => void;
  onDurationUpdate?: (duration: number) => void;  // ✅ Новое событие
  onError?: (error: string | null) => void;
  onDevicesUpdate?: (devices: MediaDeviceInfo[]) => void;
  onDeviceChange?: (deviceId: string) => void;
}