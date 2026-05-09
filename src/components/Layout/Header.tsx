import React from 'react';
import { useAppStore } from '../../store/app.store';
import { audioLibraryService } from '../../services/audio/AudioLibraryService';

const Header: React.FC = () => {
  const { currentApp, settings, updateSettings } = useAppStore();
  const isElectron = audioLibraryService.isElectron();
  const storageLabel = isElectron ? 'Electron FS' : 'Web local storage';
  const storageDescription = isElectron
    ? 'Файлы хранятся в файловой системе'
    : 'Файлы хранятся в локальном dev-хранилище';
  
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
            {storageDescription}
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
            <span className="text-gray-400">{storageLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;