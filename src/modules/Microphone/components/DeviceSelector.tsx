import React from 'react';

interface DeviceSelectorProps {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  disabled?: boolean;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedDeviceId,
  onDeviceChange,
  disabled,
}) => {
  return (
    <div className="bg-black/30 rounded-xl p-4">
      <h3 className="text-white text-sm font-semibold mb-2">🎛️ Аудиоустройства</h3>
      <select
        value={selectedDeviceId}
        onChange={(e) => onDeviceChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-slate-800 text-white text-sm rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Микрофон ${device.deviceId.slice(0, 8)}...`}
          </option>
        ))}
        {devices.length === 0 && (
          <option disabled>Нет доступных микрофонов</option>
        )}
      </select>
      <p className="text-gray-500 text-xs mt-2">
        ℹ️ Выберите устройство для захвата звука
      </p>
    </div>
  );
};

export default React.memo(DeviceSelector);