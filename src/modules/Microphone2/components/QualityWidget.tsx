import React from 'react';

interface QualityWidgetProps {
  qualityScore: number;
  snr: number;
  noise: number;
}

const QualityWidget: React.FC<QualityWidgetProps> = ({ qualityScore, snr, noise }) => {
  const angle = (qualityScore / 100) * 180;
  const radius = 38;
  const center = 50;
  const startX = center - radius;
  const startY = center;
  
  const radians = (angle * Math.PI) / 180;
  const endX = center + radius * Math.cos(radians - Math.PI / 2);
  const endY = center + radius * Math.sin(radians - Math.PI / 2);
  
  const getColor = () => {
    if (qualityScore < 30) return 'hsl(0, 70%, 50%)';
    if (qualityScore < 70) return 'hsl(48, 96%, 53%)';
    return 'hsl(142, 76%, 36%)';
  };
  
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
          Quality
        </span>
      </div>
      
      <div className="flex justify-center">
        <svg width="100" height="68" viewBox="0 0 100 68">
          <path
            d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
            fill="none"
            stroke="hsl(220, 18%, 20%)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <line
            x1="50"
            y1="55"
            x2={endX}
            y2={endY}
            stroke="hsl(220, 15%, 35%)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transition: '0.3s' }}
          />
          <circle
            cx="50"
            cy="55"
            r="3"
            fill={getColor()}
            style={{ transition: 'fill 0.3s' }}
          />
          <text
            x="50"
            y="43"
            textAnchor="middle"
            fontSize="10"
            fill="hsl(210, 15%, 40%)"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {qualityScore === 0 ? '--' : qualityScore}
          </text>
          <text
            x="50"
            y="52"
            textAnchor="middle"
            fontSize="5.5"
            fill="hsl(210, 15%, 45%)"
            fontFamily="monospace"
          >
            / 100
          </text>
        </svg>
      </div>
      
      <div className="mt-1 grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-xs text-base-content/50">SNR</p>
          <p className="text-sm font-mono font-bold text-base-content/80">
            {snr === 0 ? '--' : snr}
          </p>
        </div>
        <div>
          <p className="text-xs text-base-content/50">Noise</p>
          <p className="text-sm font-mono font-bold text-base-content/80">
            {noise === 0 ? '--' : noise}
          </p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(QualityWidget);