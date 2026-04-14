import React, { useRef, useEffect } from 'react';

interface AudioPlayerProps {
  url: string;
  onStop: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ url, onStop }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.play();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [url]);

  const handleEnded = () => {
    onStop();
  };

  return (
    <div className="mt-2">
      <audio
        ref={audioRef}
        src={url}
        controls
        className="w-full h-8"
        onEnded={handleEnded}
      />
    </div>
  );
};

export default AudioPlayer;