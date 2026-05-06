// src/modules/Library/components/TrackItem.tsx

import React, { useState, useEffect } from 'react';
import { AudioFile } from '../../../../types/audioLibrary';
import FileActionsMenu from './FileActionsMenu';
import { audioPlayback } from '../../../../services/AudioPlaybackService';

interface TrackItemProps {
  file: AudioFile;
  collections: { id: string; name: string }[];
  onPlayFile: (file: AudioFile) => void;
  onDeleteFile: (fileId: string) => void;
  onMoveFile: (fileId: string, targetCollectionId: string) => void;
}

const TrackItem: React.FC<TrackItemProps> = ({
  file,
  collections,
  onPlayFile,
  onDeleteFile,
  onMoveFile,

}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState<number>(0);

  const handleLoadedMetadata = ({ duration: dur }: { duration: number }) => {
    setDuration(dur);
  };

  // Подписка на события воспроизведения
  useEffect(() => {
    const handlePlay = () => {
      const currentFile = audioPlayback.getCurrentFile();
      if (currentFile?.id === file.id) {
        setIsPlaying(true);
      }
    };

    const handlePause = () => {
      const currentFile = audioPlayback.getCurrentFile();
      if (currentFile?.id === file.id) {
        setIsPlaying(false);
      }
    };

    const handleStop = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handleTimeUpdate = ({ currentTime }: { currentTime: number }) => {
      const currentFile = audioPlayback.getCurrentFile();
      if (currentFile?.id === file.id) {
        const duration = audioPlayback.getDuration();
        if (duration > 0) {
          const newProgress = (currentTime / duration) * 100;
          setProgress(Math.min(100, Math.max(0, newProgress)));
        }
      }
    };

    // Начальное состояние
    const currentFile = audioPlayback.getCurrentFile();
    if (currentFile?.id === file.id) {
      setIsPlaying(audioPlayback.isPlaying());
      const duration = audioPlayback.getDuration();
      const currentTime = audioPlayback.getCurrentTime();
      if (duration > 0) {
        const newProgress = (currentTime / duration) * 100;
        setProgress(Math.min(100, Math.max(0, newProgress)));
      }
    }

    audioPlayback.on('play', handlePlay);
    audioPlayback.on('pause', handlePause);
    audioPlayback.on('stop', handleStop);
    audioPlayback.on('timeupdate', handleTimeUpdate);
    audioPlayback.on('loadedmetadata', handleLoadedMetadata);

    return () => {
      audioPlayback.off('play', handlePlay);
      audioPlayback.off('pause', handlePause);
      audioPlayback.off('stop', handleStop);
      audioPlayback.off('timeupdate', handleTimeUpdate);
      audioPlayback.off('loadedmetadata', handleLoadedMetadata);
    };
  }, [file.id]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0 || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        className="absolute top-0 bottom-0 bg-primary/20 transition-all duration-100 pointer-events-none"
        style={{ width: `${progress}%`, left: 0 }}
      />
      
      <div className="relative p-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate text-base-content">{file.name}</div>
            <div className="text-xs text-base-content/50 flex gap-3 mt-1">
              <span>{formatSize(file.size)}</span>
              <span>{new Date(file.createdAt).toLocaleDateString()}</span>
              <span className="font-mono">{formatDuration(duration)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                isCurrentlyPlaying 
                  ? 'bg-primary text-primary-content' 
                  : 'bg-base-100/20 text-base-content hover:bg-base-100/30'
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
                onPlay={(file) => onPlayFile(file)}
              />
            </div>
          </div>
        </div>
        
        {isCurrentlyPlaying && progress > 0 && progress < 99 && (
          <div className="mt-2 h-1 bg-base-100/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-100"
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