export interface AudioFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  blob?: Blob;           // для браузера
  path?: string;         // для Electron
  createdAt: number;
  collectionId: string;
  duration?: number;
}

export interface AudioCollection {
  id: string;
  name: string;
  createdAt: number;
  fileIds: string[];
}

export interface AudioLibraryState {
  collections: AudioCollection[];
  files: AudioFile[];
  activeCollectionId: string | null;
  isElectron: boolean;
  mediaPath: string | null;
}

export interface AudioLibraryActions {
  init: () => Promise<void>;
  loadFromFileSystem: () => Promise<void>;
  saveAudioFile: (blob: Blob, fileName: string, collectionId?: string) => Promise<AudioFile | null>;
  getFilesByCollection: (collectionId: string) => AudioFile[];
  deleteFile: (fileId: string) => Promise<boolean>;
  deleteCollection: (collectionId: string) => Promise<boolean>;
  createCollection: (name: string) => Promise<AudioCollection | null>;  // ✅ Исправлено
  updateCollection: (id: string, newName: string) => Promise<boolean>;
  moveFileToCollection: (fileId: string, targetCollectionId: string) => Promise<boolean>;
  getFileUrl: (file: AudioFile) => Promise<string>;
  revokeUrl: (url: string) => void;
  setActiveCollectionId: (id: string | null) => void;
}