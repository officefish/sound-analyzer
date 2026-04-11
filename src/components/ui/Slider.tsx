import React from 'react';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: 'percent' | 'ms' | 'db' | 'hz';
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  unit = 'percent',
  disabled = false,
  size = 'md',
}) => {
  // Форматирование значения для отображения
  const formatValue = (val: number): string => {
    switch (unit) {
      case 'percent':
        return `${Math.round(val * 100)}%`;
      case 'ms':
        return `${val} мс`;
      case 'db':
        return `${val} dB`;
      case 'hz':
        return `${val} Hz`;
      default:
        return String(val);
    }
  };
  
  // Размеры
  const heightClasses = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  };
  
  const thumbSizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };
  
  return (
    <div className="flex-1">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-400 text-xs">{label}</span>
          <span className="text-gray-300 text-xs font-mono">
            {formatValue(value)}
          </span>
        </div>
      )}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className={`
            w-full rounded-full appearance-none cursor-pointer
            bg-gray-600
            ${heightClasses[size]}
            disabled:opacity-50 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-indigo-500
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:hover:bg-indigo-400
            [&::-webkit-slider-thumb]:active:scale-125
            ${thumbSizeClasses[size]}
            [&::-moz-range-thumb]:appearance-none
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-indigo-500
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:transition-all
            [&::-moz-range-thumb]:hover:bg-indigo-400
            [&::-moz-range-thumb]:active:scale-125
            ${thumbSizeClasses[size]}
          `}
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(value - min) / (max - min) * 100}%, #4a5568 ${(value - min) / (max - min) * 100}%, #4a5568 100%)`,
          }}
        />
      </div>
    </div>
  );
};

export default Slider;