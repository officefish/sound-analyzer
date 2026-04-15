// types.ts
export interface Track {
  id: string;
  file: File;
  name: string;
  url: string;
  duration: number;
  amplitudes: number[];
}

export interface PlaybackState {
  currentTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
}

export interface PlaybackService {
  playTrack: (trackId: string) => void;
  pauseTrack: () => void;
  togglePlayPause: (trackId: string) => void;
  seekTo: (trackId: string, time: number) => void;
  setVolume: (volume: number) => void;
  getState: () => PlaybackState;
  subscribe: (listener: () => void) => () => void;
}