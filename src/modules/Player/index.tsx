// src/modules/Player/index.tsx
import React, { useState } from 'react';
import { usePlayer } from './hooks/usePlayer';
import PlayerControls from './components/PlayerControls';
import PlayerTrackList from './components/PlayerTrackList';
import ModuleHeader from '../../components/ui/ModuleHeader';

const Player: React.FC = () => {
  const {
    tracks,
    currentTrack,
    isPlaying,
    currentTime,
    volume,
    addTrack,
    removeTrack,
    playTrack,
    pause,
    resume,
    stop,
    seek,
    changeVolume
  } = usePlayer();

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else if (currentTrack) {
      resume();
    }
  };

  const handlePlayTrack = (track: any) => {
    if (currentTrack?.id === track.id && isPlaying) {
      pause();
    } else {
      playTrack(track);
    }
  };

  const handleExport = async (track: any) => {
    try {
      const url = URL.createObjectURL(track.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = track.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Не удалось экспортировать файл');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <ModuleHeader
        icon="🎵"
        title="Аудиоплеер"
        description="Управление треками из буфера"
      />

      <PlayerControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={currentTrack?.duration || 0}
        volume={volume}
        onPlayPause={handlePlayPause}
        onSeek={seek}
        onVolumeChange={changeVolume}
        onStop={stop}
      />

      <div className="mt-6">
        <PlayerTrackList
          tracks={tracks}
          currentTrackId={currentTrack?.id || null}
          isPlaying={isPlaying}
          onPlay={handlePlayTrack}
          onDelete={removeTrack}
          onExport={handleExport}
          onAddTrack={addTrack}
        />
      </div>
    </div>
  );
};

export default Player;