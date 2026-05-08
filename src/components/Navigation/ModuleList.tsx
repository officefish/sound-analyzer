import React from 'react';
import { useAppStore } from '../../store/app.store';
import { MODULES } from '../../types/modules';

type ModuleFilter = 'all' | 'active';

const ModuleList: React.FC = () => {
  const [filter, setFilter] = React.useState<ModuleFilter>('all');
  const {
    currentApp,
    setCurrentApp,
    activeModules,
    toggleModuleActive,
    //, navigationCount 
  } = useAppStore();

  const modulesToShow = React.useMemo(() => {
    if (filter === 'active') {
      return MODULES.filter((module) => activeModules.includes(module.id));
    }

    return MODULES;
  }, [activeModules, filter]);
  
  return (
    <div className="space-y-2">
      <div className="px-3 space-y-3">
        <div className="text-gray-400 text-xs uppercase tracking-wider">
          📦 Модули ({modulesToShow.length})
        </div>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1.5 rounded-md text-xs transition-colors ${
              filter === 'all'
                ? 'bg-indigo-500/30 text-indigo-200'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-2 py-1.5 rounded-md text-xs transition-colors ${
              filter === 'active'
                ? 'bg-indigo-500/30 text-indigo-200'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Активные
          </button>
        </div>
      </div>
      
      {modulesToShow.map((module) => {
        const isActive = activeModules.includes(module.id);
        const canDeactivate = activeModules.length > 1;

        return (
        <button
          key={module.id}
          onClick={() => {
            if (isActive) {
              setCurrentApp(module.id);
            }
          }}
          disabled={!isActive}
          className={`
            w-full text-left p-3 rounded-xl transition-all duration-200
            ${!isActive ? 'opacity-40 cursor-not-allowed' : ''}
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
            <label
              className={`relative inline-flex items-center ${isActive || canDeactivate ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              onClick={(event) => event.stopPropagation()}
            >
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isActive}
                onChange={() => {
                  if (isActive && !canDeactivate) {
                    return;
                  }
                  toggleModuleActive(module.id);
                }}
              />
              <div className="w-9 h-5 bg-gray-600/70 rounded-full peer peer-checked:bg-emerald-500/70 transition-colors" />
              <div
                className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </label>
            {/* {navigationCount[module.id] > 0 && (
              <span className="flex-shrink-0 text-xs text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                {navigationCount[module.id]}
              </span>
            )} */}
          </div>
        </button>
      )})}

      {modulesToShow.length === 0 && (
        <div className="px-3 py-4 text-center text-xs text-gray-400">
          Нет активных модулей для отображения
        </div>
      )}
    </div>
  );
};

export default ModuleList;