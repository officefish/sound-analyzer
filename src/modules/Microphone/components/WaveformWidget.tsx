import React from 'react';

interface WaveformWidgetProps {
  waveformData: number[];
}

const WaveformWidget: React.FC<WaveformWidgetProps> = ({ waveformData }) => {
  const points = waveformData.map((value, index) => {
    const x = (index / waveformData.length) * 560;
    const y = 40 + value * 30;
    return `${x},${y}`;
  }).join(' L ');
  
  const pathData = points.length ? `M ${points}` : '';
  
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
          Waveform
        </span>
      </div>
      
      <div className="w-full overflow-hidden rounded-lg bg-base-300/50 border border-base-300">
        <svg viewBox="0 0 560 80" width="100%" height="80" preserveAspectRatio="none" className="block">
          <defs>
            <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.5" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          <line x1="0" y1="40" x2="560" y2="40" stroke="hsl(220, 15%, 22%)" strokeWidth="1" strokeDasharray="4,4" />
          
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke="url(#waveGrad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}
        </svg>
      </div>
    </div>
  );
};

export default React.memo(WaveformWidget);