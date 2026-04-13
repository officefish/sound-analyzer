import React from 'react';

interface VolumeWidgetProps {
  volume: number;
}

const VolumeWidget: React.FC<VolumeWidgetProps> = ({ volume }) => {
  const percent = Math.min(100, Math.max(0, Math.round(volume * 100)));
  
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
          Volume
        </span>
      </div>
      
      <div className="flex items-end justify-center gap-0.5 h-24">
        {Array.from({ length: 20 }).map((_, i) => {
          const barHeight = ((i + 1) * 5);
          const isActive = percent >= barHeight;
          const getColor = () => {
            if (barHeight < 30) return isActive ? 'bg-green-500' : 'bg-base-300';
            if (barHeight < 60) return isActive ? 'bg-yellow-500' : 'bg-base-300';
            return isActive ? 'bg-red-500' : 'bg-base-300';
          };
          
          return (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-all duration-75 ${getColor()}`}
              style={{ height: `${barHeight}%` }}
            />
          );
        })}
      </div>
      
      <div className="mt-3 text-center">
        <span className="text-2xl font-mono font-bold text-base-content">
          {percent === 0 ? '--' : percent}
        </span>
        <span className="text-xs text-base-content/50 ml-1">%</span>
      </div>
    </div>
  );
};

export default React.memo(VolumeWidget);