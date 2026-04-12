export interface MicrophoneState {
  isRecording: boolean;
  volume: number;
  rawVolume: number;
  processedVolume: number;
  error: string | null;
  audioDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  recordingDuration: number;
  qualityScore: number;
  snr: number;
  noise: number;
}

export interface MicrophoneServiceEvents {
  onVolumeUpdate?: (rawVolume: number, processedVolume: number) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: (duration: number) => void;
  onDurationUpdate?: (duration: number) => void;
  onError?: (error: string | null) => void;
  onDevicesUpdate?: (devices: MediaDeviceInfo[]) => void;
  onDeviceChange?: (deviceId: string) => void;
  onQualityUpdate?: (quality: number, snr: number, noise: number) => void;
}