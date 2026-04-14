import React from 'react';
import { AudioFile } from '../../../types/audioLibrary';
import AudioPlayer from './AudioPlayer';
import FileActionsMenu from './FileActionsMenu';

interface FileListProps {
  files: AudioFile[];
  collections: { id: string; name: string }[];
  onDeleteFile: (fileId: string) => void;
  onMoveFile: (fileId: string, targetCollectionId: string) => void;
  onPlayFile: (file: AudioFile) => void;
  playingFileId: string | null;
  audioUrl: string | null;
  onStopPlayback: () => void;
}

const FileList: React.FC<FileListProps> = ({
  files,
  collections,
  onDeleteFile,
  onMoveFile,
  onPlayFile,
  playingFileId,
  audioUrl,
  onStopPlayback,
}) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-base-200 rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-base-content/70 uppercase tracking-wider mb-3">
        🎵 Файлы
      </h3>
      {files.length === 0 ? (
        <div className="text-center text-base-content/50 py-8">
          Нет файлов в этой коллекции
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-base-300 rounded-xl p-3 transition-all hover:bg-base-300/80"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{file.name}</div>
                  <div className="text-xs text-base-content/50 flex gap-3 mt-1">
                    <span>{formatSize(file.size)}</span>
                    <span>
                      {new Date(file.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPlayFile(file)}
                    className="btn btn-sm btn-circle btn-ghost"
                    title="Воспроизвести"
                  >
                    {playingFileId === file.id ? '⏸' : '▶'}
                  </button>
                  <FileActionsMenu
                    file={file}
                    collections={collections}
                    onDelete={() => onDeleteFile(file.id)}
                    onMove={(targetId) => onMoveFile(file.id, targetId)}
                  />
                </div>
              </div>
              {playingFileId === file.id && audioUrl && (
                <div className="mt-2">
                  <AudioPlayer url={audioUrl} onStop={onStopPlayback} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileList;