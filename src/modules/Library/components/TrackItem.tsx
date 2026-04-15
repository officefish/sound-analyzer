// src/modules/Library/components/TrackItem.tsx

import React, { useState, useEffect } from 'react';
import { AudioFile } from '../../../types/audioLibrary';
import FileActionsMenu from './FileActionsMenu';
import { audioPlayback } from '../../../services/AudioPlaybackService';

interface TrackItemProps {
  file: AudioFile;
  collections: { id: string; name: string }[];
  onDeleteFile: (fileId: string) => void;
  onMoveFile: (fileId: string, targetCollectionId: string) => void;
}

const TrackItem: React.FC<TrackItemProps> = ({
  file,
  collections,
  onDeleteFile,
  onMoveFile,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Подписка на изменения состояния воспроизведения
  useEffect(() => {
    const handleStateChange = (state: any) => {
      // Безопасная проверка
      if (state && state.currentFile) {
        const isThisPlaying = state.currentFile.id === file.id && state.isPlaying;
        setIsPlaying(isThisPlaying);
        setProgress(isThisPlaying ? state.progress : 0);
      } else {
        // Если нет текущего файла, сбрасываем состояние для этого трека
        setIsPlaying(false);
        setProgress(0);
      }
    };

    // Начальное состояние
    const initialState = audioPlayback.getState();
    if (initialState.currentFile) {
      const isThisPlaying = initialState.currentFile.id === file.id && initialState.isPlaying;
      setIsPlaying(isThisPlaying);
      setProgress(isThisPlaying ? initialState.progress : 0);
    }

    audioPlayback.on('statechange', handleStateChange);
    audioPlayback.on('stop', () => {
      setIsPlaying(false);
      setProgress(0);
    });
    audioPlayback.on('ended', () => {
      setIsPlaying(false);
      setProgress(0);
    });

    return () => {
      audioPlayback.off('statechange', handleStateChange);
      audioPlayback.off('stop', () => {});
      audioPlayback.off('ended', () => {});
    };
  }, [file.id]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentFile = audioPlayback.getCurrentFile();
    
    if (currentFile?.id === file.id && audioPlayback.isPlaying()) {
      audioPlayback.pause();
    } else if (currentFile?.id === file.id && !audioPlayback.isPlaying()) {
      audioPlayback.resume();
    } else {
      audioPlayback.play(file);
    }
  };

  const handleActionMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const isCurrentlyPlaying = isPlaying && progress < 99;
  const isCompleted = isPlaying && progress >= 99;

  return (
    <div className="bg-base-300 rounded-xl transition-all overflow-hidden relative">
      {/* Прогресс-бар фона */}
      <div 
        className="absolute inset-0 bg-primary/20 transition-all duration-300 pointer-events-none"
        style={{ width: `${progress}%` }}
      />
      
      <div className="relative p-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{file.name}</div>
            <div className="text-xs text-base-content/50 flex gap-3 mt-1">
              <span>{formatSize(file.size)}</span>
              <span>{new Date(file.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              className={`btn btn-sm btn-circle transition-all ${
                isCurrentlyPlaying 
                  ? 'bg-primary text-primary-content hover:bg-primary/90' 
                  : 'btn-ghost'
              }`}
              title={isCurrentlyPlaying ? 'Пауза' : 'Воспроизвести'}
            >
              {isCurrentlyPlaying ? '⏸' : '▶'}
            </button>
            
            <div onClick={handleActionMenu}>
              <FileActionsMenu
                file={file}
                collections={collections}
                onDelete={() => onDeleteFile(file.id)}
                onMove={(targetId) => onMoveFile(file.id, targetId)}
              />
            </div>
          </div>
        </div>
        
        {isCurrentlyPlaying && progress > 0 && progress < 99 && (
          <div className="mt-2 h-1 bg-base-100/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
        {isCompleted && (
          <div className="mt-2 text-[10px] text-primary text-center">
            ✓ Воспроизведение завершено
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(TrackItem);