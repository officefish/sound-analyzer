import React from 'react';
import { useAppStore } from '../../store/app.store';

const Header: React.FC = () => {
  const { currentApp, settings, updateSettings } = useAppStore();
  
  const getAppTitle = () => {
    switch (currentApp) {
      // case 'stopwatch':
      //   return '⏱ Секундомер';
      case 'microphone':
        return '🎤 Микрофон';
      default:
        return 'Приложение';
    }
  };
  
  return (
    <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-semibold">
            {getAppTitle()}
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Electron + React + Tailwind + Zustand
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Переключатель темы (будет работать в следующих версиях) */}
          <button
            onClick={() => updateSettings({ 
              theme: settings.theme === 'dark' ? 'light' : 'dark' 
            })}
            className="text-gray-400 hover:text-white transition-colors text-xl"
          >
            {settings.theme === 'dark' ? '🌙' : '☀️'}
          </button>
          
          {/* Статус */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-400">Активно</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;