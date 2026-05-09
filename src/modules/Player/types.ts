import { AudioTrack } from '../../../types/audio';

export interface PlayerTrack {
  id: string;
  name: string;
  duration: number;
  createdAt: Date;
  fileSize: number;
  source: AudioTrack;
}

export interface PlayerState {
  tracks: PlayerTrack[];
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
}