// ModeToggle.tsx
import React from 'react';

type DetectionMode = 'auto' | 'manual';

interface AutoModeToggleProps {
  detectionMode: DetectionMode;
  onModeChange: (mode: DetectionMode) => void;
}

const AutoModeToggle: React.FC<AutoModeToggleProps> = ({ detectionMode, onModeChange }) => {
  const handleModeChange = (mode: DetectionMode) => {
    onModeChange(mode);
  };

  return (
    <div className="flex gap-1 p-0.5 rounded-lg bg-base-300/50">
      <button
        onClick={() => handleModeChange('auto')}
        className={`flex-1 py-1.5 text-xs rounded-md transition-all duration-200 ${
          detectionMode === 'auto' 
            ? 'bg-primary text-primary-content shadow-sm' 
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        🔁 Авторежим
      </button>
      <button
        onClick={() => handleModeChange('manual')}
        className={`flex-1 py-1.5 text-xs rounded-md transition-all duration-200 ${
          detectionMode === 'manual' 
            ? 'bg-primary text-primary-content shadow-sm' 
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        ✋ Ручной режим
      </button>
    </div>
  );
};

export default AutoModeToggle;
export type { DetectionMode };