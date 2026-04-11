import React, { useState } from 'react';
import { useAppStore } from '../../store/app.store';
import ModuleList from './ModuleList';
import PluginList from './PluginList';

type SidebarSection = 'modules' | 'plugins';

const Sidebar: React.FC = () => {
  const { navigationCount } = useAppStore();
  const [activeSection, setActiveSection] = useState<SidebarSection>('modules');
  
  return (
    <div className="w-72 bg-black/30 backdrop-blur-sm border-r border-white/10 flex flex-col h-screen">
      {/* Логотип - фиксированная высота */}
      <div className="flex-shrink-0 p-6 border-b border-white/10">
        <h1 className="text-white text-xl font-bold flex items-center gap-2">
          <span>🎵</span>
          <span>Membrana</span>
        </h1>
        <p className="text-gray-500 text-xs mt-1">v2.0.0</p>
      </div>
      
      {/* Переключатель разделов - фиксированная высота */}
      <div className="flex-shrink-0 flex border-b border-white/10">
        <button
          onClick={() => setActiveSection('modules')}
          className={`
            flex-1 py-3 text-sm font-medium transition-all duration-200 relative
            ${activeSection === 'modules' 
              ? 'text-indigo-400' 
              : 'text-gray-500 hover:text-gray-300'
            }
          `}
        >
          📦 Модули
          {activeSection === 'modules' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
          )}
        </button>
        <button
          onClick={() => setActiveSection('plugins')}
          className={`
            flex-1 py-3 text-sm font-medium transition-all duration-200 relative
            ${activeSection === 'plugins' 
              ? 'text-indigo-400' 
              : 'text-gray-500 hover:text-gray-300'
            }
          `}
        >
          🔌 Плагины
          {activeSection === 'plugins' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
          )}
        </button>
      </div>
      
      {/* Контент с прокруткой - занимает всё доступное пространство */}
      <div className="flex-1 overflow-y-auto scrollbar-custom min-h-0">
        <div className="p-4">
          {activeSection === 'modules' ? <ModuleList /> : <PluginList />}
        </div>
      </div>
      
      {/* Статистика внизу - фиксированная высота */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <div className="text-gray-500 text-xs space-y-1">
          <div className="flex justify-between">
            <span>📊 Статистика:</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>⏱ Секундомер:</span>
            <span>{navigationCount.stopwatch} раз</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>🎤 Микрофон:</span>
            <span>{navigationCount.microphone} раз</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;