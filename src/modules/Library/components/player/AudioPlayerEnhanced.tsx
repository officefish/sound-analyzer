import React, { useState, useRef, useEffect } from 'react';
import AudioWaveform from './AudioWaveform';

interface AudioPlayerEnhancedProps {
  url: string;
  onStop: () => void;
}

const AudioPlayerEnhanced: React.FC<AudioPlayerEnhancedProps> = ({ url, onStop }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      onStop();
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    audio.play();

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [url, onStop]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-2 p-3 bg-base-300 rounded-xl">
      <audio ref={audioRef} src={url} preload="metadata" />

      <AudioWaveform
        audioUrl={url}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
      />

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="btn btn-sm btn-circle btn-primary"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <span className="text-xs font-mono text-base-content/70">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        <button
          onClick={onStop}
          className="btn btn-sm btn-ghost btn-circle"
          title="Закрыть плеер"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default AudioPlayerEnhanced;