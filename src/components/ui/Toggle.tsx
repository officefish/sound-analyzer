import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  enabled,
  onChange,
  disabled = false,
  size = 'md',
  label,
}) => {
  // Размеры
  const trackSizes = {
    sm: 'w-7 h-4',
    md: 'w-9 h-5',
    lg: 'w-11 h-6',
  };
  
  const thumbSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  
//   const thumbTranslate = {
//     sm: enabled ? 'translate-x-3.5' : 'translate-x-0.5',
//     md: enabled ? 'translate-x-4.5' : 'translate-x-0.5',
//     lg: enabled ? 'translate-x-5.5' : 'translate-x-0.5',
//   };
  
  // Для translate-x-4.5 и translate-x-5.5 добавляем кастомные классы
  const getTranslateClass = () => {
    if (size === 'sm') return enabled ? 'translate-x-3.5' : 'translate-x-0.5';
    if (size === 'md') return enabled ? 'translate-x-4' : 'translate-x-0.5';
    return enabled ? 'translate-x-5' : 'translate-x-0.5';
  };
  
  const toggleContent = (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        relative inline-flex rounded-full transition-colors duration-200
        ${trackSizes[size]}
        ${enabled ? 'bg-indigo-500' : 'bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block transform rounded-full bg-white transition-transform duration-200
          ${thumbSizes[size]}
          ${getTranslateClass()}
          absolute top-0.5
        `}
      />
    </button>
  );
  
  if (label) {
    return (
      <label className="flex items-center gap-3 cursor-pointer">
        {toggleContent}
        <span className="text-gray-300 text-sm">{label}</span>
      </label>
    );
  }
  
  return toggleContent;
};

export default Toggle;