import React from 'react';
import { useAppStore } from '../../store/app.store';
import { MODULES } from '../../types/modules';

const ModuleList: React.FC = () => {
  const { currentApp, setCurrentApp, navigationCount } = useAppStore();
  
  return (
    <div className="space-y-2">
      <div className="text-gray-400 text-xs uppercase tracking-wider mb-3 px-3">
        📦 Модули ({MODULES.length})
      </div>
      
      {MODULES.map((module) => (
        <button
          key={module.id}
          onClick={() => setCurrentApp(module.id)}
          className={`
            w-full text-left p-3 rounded-xl transition-all duration-200
            ${currentApp === module.id 
              ? 'bg-gradient-to-r from-indigo-600/50 to-purple-600/50 border border-indigo-500/50 shadow-lg shadow-indigo-900/20' 
              : 'hover:bg-white/5 border border-transparent'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{module.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-sm truncate">
                {module.name}
              </div>
              <div className="text-gray-400 text-xs mt-0.5 truncate">
                {module.description}
              </div>
            </div>
            {navigationCount[module.id] > 0 && (
              <span className="flex-shrink-0 text-xs text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                {navigationCount[module.id]}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default ModuleList;