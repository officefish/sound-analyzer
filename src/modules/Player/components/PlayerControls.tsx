import React from 'react';

interface PlayerControlsProps {
  currentTrackName?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onStop: () => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentTrackName,
  isPlaying,
  currentTime,
  duration,
  volume,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onStop
}) => {
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * duration;
    onSeek(time);
  };

  return (
    <div className="bg-base-200 rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm text-base-content/50">Сейчас играет</div>
          <div className="font-medium text-base-content truncate">
            🎵 {currentTrackName || 'Нет трека'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value) / 100)}
            className="w-24 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
        
        <div className="flex justify-between text-xs text-base-content/50">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={() => onSeek(Math.max(0, currentTime - 10))}
          className="w-10 h-10 rounded-full bg-base-300 hover:bg-base-400 transition-colors"
          title="Назад 10 сек"
        >
          ⏪
        </button>
        
        <button
          onClick={onPlayPause}
          className="w-14 h-14 rounded-full bg-primary text-primary-content hover:bg-primary/90 transition-colors text-2xl"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <button
          onClick={() => onSeek(Math.min(duration, currentTime + 10))}
          className="w-10 h-10 rounded-full bg-base-300 hover:bg-base-400 transition-colors"
          title="Вперёд 10 сек"
        >
          ⏩
        </button>
        
        <button
          onClick={onStop}
          className="w-10 h-10 rounded-full bg-base-300 hover:bg-base-400 transition-colors"
          title="Стоп"
        >
          ⏹
        </button>
      </div>
    </div>
  );
};

export default PlayerControls;