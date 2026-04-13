import React from 'react';

interface WidgetControlsProps {
  widgetStates: {
    volume: boolean;
    quality: boolean;
    waveform: boolean;
    spectrum: boolean;
  };
  onToggle: (widget: keyof WidgetControlsProps['widgetStates']) => void;
}

const WidgetControls: React.FC<WidgetControlsProps> = ({ widgetStates, onToggle }) => {
  const widgets = [
    { id: 'volume' as const, label: 'Volume Meter', icon: '📊', color: 'text-green-500' },
    { id: 'quality' as const, label: 'Quality Meter', icon: '🎯', color: 'text-purple-500' },
    { id: 'waveform' as const, label: 'Waveform', icon: '〰️', color: 'text-cyan-400' },
    { id: 'spectrum' as const, label: 'Spectrum', icon: '📈', color: 'text-indigo-400' },
  ];
  
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {widgets.map((widget) => (
        <label
          key={widget.id}
          className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-base-300/50 transition-colors"
        >
          <input
            type="checkbox"
            checked={widgetStates[widget.id]}
            onChange={() => onToggle(widget.id)}
            className="checkbox checkbox-xs checkbox-primary"
          />
          <span className={`${widget.color}`}>{widget.icon}</span>
          <span className="text-gray-400">{widget.label}</span>
        </label>
      ))}
    </div>
  );
};

export default React.memo(WidgetControls);