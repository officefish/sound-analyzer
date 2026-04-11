import React from 'react';
import { Select } from 'react-daisyui';

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
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body p-4">
        <h3 className="card-title text-sm font-semibold text-base-content">
          🎛️ Аудиоустройства
        </h3>
        
        <Select
          value={selectedDeviceId}
          onChange={(e) => onDeviceChange(e.target.value)}
          disabled={disabled}
          className="w-full"
          size="sm"
        >
          <Select.Option value="" disabled>
            {devices.length === 0 ? 'Загрузка устройств...' : 'Выберите устройство'}
          </Select.Option>
          {devices.map((device) => (
            <Select.Option key={device.deviceId} value={device.deviceId}>
              {device.label || `Микрофон ${device.deviceId.slice(0, 8)}...`}
            </Select.Option>
          ))}
        </Select>
        
        <p className="text-xs text-base-content/50 mt-2">
          ℹ️ Выберите устройство для захвата звука
        </p>
      </div>
    </div>
  );
};

export default React.memo(DeviceSelector);

// import React from 'react';

// interface DeviceSelectorProps {
//   devices: MediaDeviceInfo[];
//   selectedDeviceId: string;
//   onDeviceChange: (deviceId: string) => void;
//   disabled?: boolean;
// }

// const DeviceSelector: React.FC<DeviceSelectorProps> = ({
//   devices,
//   selectedDeviceId,
//   onDeviceChange,
//   disabled,
// }) => {
//   return (
//     <div className="bg-black/30 rounded-xl p-4">
//       <h3 className="text-white text-sm font-semibold mb-2">🎛️ Аудиоустройства</h3>
//       <select
//         value={selectedDeviceId}
//         onChange={(e) => onDeviceChange(e.target.value)}
//         disabled={disabled}
//         className="w-full bg-slate-800 text-white text-sm rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
//       >
//         {devices.map((device) => (
//           <option key={device.deviceId} value={device.deviceId}>
//             {device.label || `Микрофон ${device.deviceId.slice(0, 8)}...`}
//           </option>
//         ))}
//         {devices.length === 0 && (
//           <option disabled>Нет доступных микрофонов</option>
//         )}
//       </select>
//       <p className="text-gray-500 text-xs mt-2">
//         ℹ️ Выберите устройство для захвата звука
//       </p>
//     </div>
//   );
// };

// export default React.memo(DeviceSelector);