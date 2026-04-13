import React from 'react';

interface SpectrumWidgetProps {
  spectrumData: number[];
}

const SpectrumWidget: React.FC<SpectrumWidgetProps> = ({ spectrumData }) => {
  const frequencies = [20, 80, 200, 500, '1k', '2k', '4k', '8k', '16k', '20k'];
  
  const getBarColor = (value: number) => {
    if (value < 0.3) return 'hsl(152, 76%, 52%)';
    if (value < 0.6) return 'hsl(34, 100%, 52%)';
    return 'hsl(0, 72%, 51%)';
  };
  
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
          Frequency Spectrum
        </span>
        <span className="text-xs text-base-content/40 font-mono">Hz</span>
      </div>
      
      <div className="bg-base-300/50 rounded-lg border border-base-300 p-3 pb-0">
        <div className="flex items-end gap-0.5 h-20">
          {spectrumData.map((value, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all duration-75"
              style={{
                height: `${Math.max(2, value * 100)}%`,
                backgroundColor: getBarColor(value),
                transition: 'height 0.08s ease-out, background-color 0.3s',
              }}
            />
          ))}
        </div>
        
        <div className="flex justify-between pt-1.5 pb-2">
          {frequencies.map((freq, i) => (
            <span key={i} className="text-[9px] text-base-content/40 font-mono">
              {freq}
            </span>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-base-content/50">Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs text-base-content/50">Mid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          <span className="text-xs text-base-content/50">High</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SpectrumWidget);