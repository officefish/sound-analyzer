// src/modules/Library/components/FileList.tsx

import React from 'react';
import { AudioFile } from '../../../types/audioLibrary';
import TrackItem from './TrackItem';

interface FileListProps {
  files: AudioFile[];
  collections: { id: string; name: string }[];
  onDeleteFile: (fileId: string) => void;
  onMoveFile: (fileId: string, targetCollectionId: string) => void;
}

const FileList: React.FC<FileListProps> = ({
  files,
  collections,
  onDeleteFile,
  onMoveFile,
}) => {
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
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {files.map((file) => (
            <TrackItem
              key={file.id}
              file={file}
              collections={collections}
              onDeleteFile={onDeleteFile}
              onMoveFile={onMoveFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileList;