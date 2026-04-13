// src/plugins/microphone2/widgets/RecorderWidget/AutoControls.tsx

import React from 'react';

interface AutoControlsProps {
  isRecording: boolean;
  isMicActive: boolean;
}

const AutoControls: React.FC<AutoControlsProps> = ({ 
  isRecording, 
  isMicActive 
}) => {
  if (!isMicActive) {
    return (
      <div className="text-center text-[11px] text-gray-500 py-2 bg-base-300/30 rounded-lg">
        ⏸ Микрофон не активен. Начните мониторинг для автозаписи.
      </div>
    );
  }
  
  if (!isRecording) {
    return (
      <div className="text-center text-[11px] text-green-500/70 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
        🔁 Автозапись активна и начнётся автоматически при старте микрофона
      </div>
    );
  }
  
  return null;
};

export default React.memo(AutoControls);