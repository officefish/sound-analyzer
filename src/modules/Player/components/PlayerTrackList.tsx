// src/modules/Player/components/PlayerTrackList.tsx
import React, { useRef } from 'react';
import { PlayerTrack } from '../types';
import PlayerTrackItem from './PlayerTrackItem';

interface PlayerTrackListProps {
  tracks: PlayerTrack[];
  currentTrackId: string | null;
  isPlaying: boolean;
  onPlay: (track: PlayerTrack) => void;
  onDelete: (trackId: string) => void;
  onExport: (track: PlayerTrack) => void;
  onAddTrack: (file: File) => void;
}

const PlayerTrackList: React.FC<PlayerTrackListProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPlay,
  onDelete,
  onExport,
  onAddTrack
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('audio/')) {
          onAddTrack(file);
        } else {
          alert(`Файл "${file.name}" не является аудио`);
        }
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-base-200 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🎵</span>
          <span className="text-xs font-medium text-primary uppercase tracking-wide">
            Треки ({tracks.length})
          </span>
        </div>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-sm btn-primary"
        >
          + Добавить трек
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {tracks.length === 0 ? (
        <div className="text-center text-base-content/50 py-12">
          <div className="text-6xl mb-4">🎧</div>
          <p>Нет треков в буфере</p>
          <p className="text-sm mt-2">Нажмите "+ Добавить трек" чтобы начать</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {tracks.map(track => (
            <PlayerTrackItem
              key={track.id}
              track={track}
              isPlaying={currentTrackId === track.id && isPlaying}
              onPlay={onPlay}
              onDelete={onDelete}
              onExport={onExport}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerTrackList;