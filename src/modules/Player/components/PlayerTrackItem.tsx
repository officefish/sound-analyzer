// src/modules/Player/components/PlayerTrackItem.tsx
import React, { useState, useRef, useEffect } from 'react';
import { PlayerTrack } from '../types';

interface PlayerTrackItemProps {
  track: PlayerTrack;
  isPlaying: boolean;
  onPlay: (track: PlayerTrack) => void;
  onDelete: (trackId: string) => void;
  onExport: (track: PlayerTrack) => void;
}

const PlayerTrackItem: React.FC<PlayerTrackItemProps> = ({
  track,
  isPlaying,
  onPlay,
  onDelete,
  onExport
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`relative flex items-center justify-between p-3 rounded-lg transition-all ${
      isPlaying ? 'bg-primary/20 border border-primary/30' : 'hover:bg-base-300'
    }`}>
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={() => onPlay(track)}
          className="btn btn-sm btn-circle btn-ghost text-lg"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <div className="flex-1">
          <div className="font-medium text-sm truncate">{track.name}</div>
          <div className="text-xs text-base-content/50 flex gap-3">
            <span>⏱ {formatDuration(track.duration)}</span>
            <span>💾 {formatFileSize(track.fileSize)}</span>
            <span>📅 {track.createdAt.toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowMenu(!showMenu)}
        className="btn btn-sm btn-ghost btn-circle"
      >
        ⋯
      </button>

      {/* Контекстное меню */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-48 bg-base-100 rounded-lg shadow-lg border border-base-300 z-10 py-1"
        >
          <button
            onClick={() => {
              onExport(track);
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-base-200 transition-colors flex items-center gap-2"
          >
            📤 Экспортировать
          </button>
          
          <button
            onClick={() => {
              if (confirm(`Удалить "${track.name}"?`)) {
                onDelete(track.id);
              }
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-error hover:bg-base-200 transition-colors flex items-center gap-2"
          >
            🗑 Удалить
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerTrackItem;