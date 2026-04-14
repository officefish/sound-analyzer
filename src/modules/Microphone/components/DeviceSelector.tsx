// src/modules/Microphone2/components/DeviceSelector.tsx

import React, { useState, useRef, useEffect } from 'react';

interface DeviceSelectorProps {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  onStartMonitoring: () => void;
  onStopMonitoring: () => void;
  isRecording: boolean;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedDeviceId,
  onDeviceChange,
  onStartMonitoring,
  onStopMonitoring,
  isRecording,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className={`
      rounded-2xl border p-6 transition-all duration-500
      ${isRecording 
        ? 'bg-gradient-to-br bg-gradient-to-b from-emerald-800 to-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/30' 
        : 'border-gray-700'
      }
    `}>
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Input Device
        </label>
        
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`
              w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
              ${isRecording 
                ? 'bg-gray-900 border-2 border-emerald-700' 
                : 'bg-gray-900 border border-gray-700 hover:border-emerald-700'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                w-2.5 h-2.5 rounded-full transition-all duration-300
                ${isRecording 
                  ? 'bg-green-500 animate-pulse' 
                  : 'bg-indigo-500'
                }
              `} />
              <span className="text-sm font-medium text-gray-200 truncate max-w-[280px]">
                {selectedDevice?.label || (devices.length === 0 ? 'Загрузка устройств...' : 'Выберите устройство')}
              </span>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          
          {isOpen && devices.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-gray-900 border border-gray-700 shadow-xl z-50 max-h-60 overflow-y-auto">
              {devices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => {
                    onDeviceChange(device.deviceId);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150
                    ${selectedDeviceId === device.deviceId 
                      ? 'bg-indigo-500/10 text-indigo-400' 
                      : 'text-gray-300 hover:bg-gray-800'
                    }
                  `}
                >
                  <div className={`
                    w-2 h-2 rounded-full
                    ${selectedDeviceId === device.deviceId ? 'bg-indigo-500' : 'bg-gray-600'}
                  `} />
                  <span className="text-sm truncate">
                    {device.label || `Микрофон ${device.deviceId.slice(0, 8)}...`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {!isRecording ? (
        <button
          onClick={onStartMonitoring}
          disabled={devices.length === 0}
          className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M12 19v3" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <rect x="9" y="2" width="6" height="13" rx="3" />
          </svg>
          Start Monitoring
        </button>
      ) : (
        <button
          onClick={onStopMonitoring}
          className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M12 19v3" />
            <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
            <path d="M16.95 16.95A7 7 0 0 1 5 12v-2" />
            <path d="M18.89 13.23A7 7 0 0 0 19 12v-2" />
            <path d="m2 2 20 20" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
          </svg>
          Stop Monitoring
        </button>
      )}
    </div>
  );
};

export default React.memo(DeviceSelector);