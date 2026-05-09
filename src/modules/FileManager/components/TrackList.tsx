import React, { useState } from 'react';
import type { AudioTrack, AudioCollection } from '../../../types/audio';

interface TrackListProps {
  tracks: AudioTrack[];
  collections: AudioCollection[];
  onMoveTrack: (trackId: string, targetCollectionId: string) => Promise<void>;
  onDeleteTrack: (trackId: string, trackName: string) => void;
  onExportTrack: (trackId: string) => void;
  isBufferCollection: (id: string) => boolean;
}

const TrackList: React.FC<TrackListProps> = ({
  tracks,
  collections,
  onMoveTrack,
  onDeleteTrack,
  onExportTrack,
  isBufferCollection,
}) => {
  const [movingTrackId, setMovingTrackId] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string>('');

  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleMove = async (trackId: string) => {
    if (selectedCollection) {
      await onMoveTrack(trackId, selectedCollection);
      setMovingTrackId(null);
      setSelectedCollection('');
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="text-center py-12 text-base-content/50">
        <p>Нет треков в этой коллекции</p>
        <p className="text-sm mt-2">Нажмите "+ Добавить треки" чтобы начать</p>
      </div>
    );
  }

  const getAvailableCollections = (currentCollectionId: string) => {
    return collections.filter((c) =>
      c.id !== currentCollectionId && !isBufferCollection(c.id)
    );
  };

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto">
      {tracks.map((track) => {
        const availableCollections = getAvailableCollections(track.collectionId);
        const isMoving = movingTrackId === track.id;

        return (
          <div key={track.id} className="bg-base-100 rounded-lg p-3 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium truncate" title={track.name}>
                  {track.name}
                </div>
                <div className="text-xs text-base-content/50 flex gap-3 mt-1">
                  <span>⏱ {formatDuration(track.duration)}</span>
                  <span>💾 {formatFileSize(track.fileSize)}</span>
                  <span>📅 {new Date(track.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                {isMoving ? (
                  <div className="flex gap-2">
                    <select
                      className="select select-xs select-bordered"
                      value={selectedCollection}
                      onChange={(e) => setSelectedCollection(e.target.value)}
                      autoFocus
                    >
                      <option value="">Выберите коллекцию...</option>
                      {availableCollections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.trackIds.length} треков)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleMove(track.id)}
                      className="btn btn-xs btn-success"
                      disabled={!selectedCollection}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setMovingTrackId(null);
                        setSelectedCollection('');
                      }}
                      className="btn btn-xs btn-ghost"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    {availableCollections.length > 0 && (
                      <button
                        onClick={() => setMovingTrackId(track.id)}
                        className="btn btn-xs btn-ghost"
                        title="Переместить в другую коллекцию"
                      >
                        📁
                      </button>
                    )}

                    <button
                      onClick={() => onExportTrack(track.id)}
                      className="btn btn-xs btn-ghost"
                      title="Экспортировать файл"
                    >
                      📤
                    </button>

                    <button
                      onClick={() => onDeleteTrack(track.id, track.name)}
                      className="btn btn-xs btn-ghost text-error"
                      title="Удалить трек"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrackList;
