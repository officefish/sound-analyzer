export interface PlayerTrack {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  createdAt: Date;
  fileSize: number;
}

export interface PlayerState {
  tracks: PlayerTrack[];
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
}