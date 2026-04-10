import React from 'react';
import { useAppStore, AppType } from '../../store/app.store';

const Sidebar: React.FC = () => {
  const { currentApp, setCurrentApp, navigationCount } = useAppStore();
  
  const menuItems: { id: AppType; name: string; icon: string; description: string }[] = [
    {
      id: 'stopwatch',
      name: 'Секундомер',
      icon: '⏱',
      description: 'Измерение времени с кругами',
    },
    {
      id: 'microphone',
      name: 'Микрофон',
      icon: '🎤',
      description: 'Анализ звука с микрофона',
    },
  ];
  
  return (
    <div className="w-64 bg-black/30 backdrop-blur-sm border-r border-white/10 flex flex-col">
      {/* Логотип */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-white text-xl font-bold flex items-center gap-2">
          <span>🎵</span>
          <span>SoundLab</span>
        </h1>
        <p className="text-gray-500 text-xs mt-1">v1.0.0</p>
      </div>
      
      {/* Навигация */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentApp(item.id)}
              className={`
                w-full text-left p-3 rounded-xl transition-all duration-200
                ${currentApp === item.id 
                  ? 'bg-gradient-to-r from-indigo-600/50 to-purple-600/50 border border-indigo-500/50 shadow-lg shadow-indigo-900/20' 
                  : 'hover:bg-white/5 border border-transparent'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">
                    {item.name}
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5">
                    {item.description}
                  </div>
                </div>
                {navigationCount[item.id] > 0 && (
                  <span className="text-xs text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                    {navigationCount[item.id]}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </nav>
      
      {/* Статистика внизу */}
      <div className="p-4 border-t border-white/10">
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