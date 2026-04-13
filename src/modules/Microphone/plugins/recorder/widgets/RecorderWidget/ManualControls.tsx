// src/plugins/microphone2/widgets/RecorderWidget/ManualControls.tsx

import React from 'react';

interface ManualControlsProps {
  isRecording: boolean;
  isMicActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

const ManualControls: React.FC<ManualControlsProps> = ({ 
  isRecording, 
  isMicActive, 
  onStart, 
  onStop 
}) => {
  const canStart = !isRecording && isMicActive;
  const canStop = isRecording;
  
  return (
    <div className="flex gap-2">
      <button
        onClick={onStart}
        disabled={!canStart}
        className="flex-1 text-[11px] bg-success/20 hover:bg-success/30 text-success py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ▶ Начать запись
      </button>
      <button
        onClick={onStop}
        disabled={!canStop}
        className="flex-1 text-[11px] bg-error/20 hover:bg-error/30 text-error py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ⏹ Остановить
      </button>
    </div>
  );
};

export default React.memo(ManualControls);