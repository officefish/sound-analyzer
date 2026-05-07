export interface AudioTrack {
  id: string;
  name: string;
  originalName: string;
  path: string;
  collectionId: string;
  duration: number;
  fileSize: number;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  blob?: Blob;
  tags?: {
    artist?: string;
    album?: string;
    genre?: string;
    year?: number;
  };
}

export interface AudioCollection {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  createdAt: Date;
  updatedAt: Date;
  coverArt?: string;
}

export interface AudioLibraryState {
  collections: AudioCollection[];
  tracks: AudioTrack[];
  activeCollectionId: string | null;
  isElectron: boolean;
  mediaPath: string | null;
  isLoading: boolean;
  error: string | null;
}