import React, { useState } from 'react';
import { useAppStore } from '../../store/app.store';
import { usePluginsStore } from '../../store/plugins.store';
import { ModuleType } from '../../types/modules';

const PluginList: React.FC = () => {
  const { currentApp } = useAppStore();
  const { 
    getPluginsByModule, 
    togglePlugin, 
    updatePluginSettings,
  } = usePluginsStore();
  
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  
  const plugins = getPluginsByModule(currentApp as ModuleType);
  const activeCount = plugins.filter(p => p.enabled).length;
  
  if (plugins.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-gray-400 text-xs uppercase tracking-wider mb-3 px-3">
          🔌 Плагины
        </div>
        <div className="text-center text-gray-500 text-xs py-8 px-4">
          <div className="text-3xl mb-2">🔌</div>
          <p>Нет плагинов для этого модуля</p>
          <p className="text-gray-600 mt-1">Плагины появятся позже</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="text-gray-400 text-xs uppercase tracking-wider mb-3 px-3 flex justify-between items-center">
        <span>🔌 Плагины ({plugins.length})</span>
        <span className="flex-shrink-0 text-[10px] text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full">
          {activeCount} активны
        </span>
      </div>
      
      {plugins.map((plugin) => {
        const isActive = plugin.enabled;
        
        return (
          <div
            key={plugin.id}
            className={`
              rounded-xl transition-all duration-200 overflow-hidden
              ${isActive 
                ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/40' 
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }
            `}
          >
            {/* Основная карточка плагина */}
            <div className="p-3">
              <div className="flex items-center gap-3">
                <div className={`
                  flex-shrink-0 text-2xl transition-all duration-200
                  ${isActive ? 'scale-110' : 'scale-100'}
                `}>
                  {plugin.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white text-sm truncate">
                      {plugin.name}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-gray-500">
                      v{plugin.version}
                    </span>
                    {isActive && (
                      <span className="flex-shrink-0 text-[10px] text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded-full">
                        активен
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">
                    {plugin.description}
                  </p>
                </div>
                
                {/* Toggle Switch */}
               <button
                    onClick={() => {
                        console.log(`📌 Toggling plugin: ${plugin.id}, current: ${plugin.enabled}`);
                        togglePlugin(plugin.id);
                    }}
                    className={`
                        flex-shrink-0 relative inline-flex h-5 w-9 rounded-full transition-colors duration-200
                        ${isActive ? 'bg-indigo-500' : 'bg-gray-600'}
                    `}
                    ></button>
              </div>
              
              {/* Кнопка настроек (если есть) */}
              {plugin.settings && Object.keys(plugin.settings).length > 0 && (
                <button
                  onClick={() => setExpandedPlugin(expandedPlugin === plugin.id ? null : plugin.id)}
                  className="w-full mt-2 text-center text-gray-500 text-xs py-1 hover:text-gray-300 transition-colors"
                >
                  {expandedPlugin === plugin.id ? '▲ Скрыть настройки' : '▼ Настройки плагина'}
                </button>
              )}
            </div>
            
            {/* Панель настроек (расширенная) */}
            {expandedPlugin === plugin.id && plugin.settings && (
              <div className="px-3 pb-3 pt-0 border-t border-white/10 mt-1">
                <div className="text-xs text-gray-400 mb-2 pt-2">⚙️ Настройки:</div>
                <div className="space-y-2">
                  {Object.entries(plugin.settings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      
                      {typeof value === 'boolean' ? (
                        <button
                          onClick={() => updatePluginSettings(plugin.id, { [key]: !value })}
                          className={`
                            px-2 py-0.5 rounded text-xs transition-colors
                            ${value ? 'bg-indigo-500/30 text-indigo-300' : 'bg-gray-600/50 text-gray-400'}
                          `}
                        >
                          {value ? 'Вкл' : 'Выкл'}
                        </button>
                      ) : typeof value === 'number' && (key.includes('threshold') || key.includes('sensitivity')) ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={key === 'threshold' ? '0' : '0'}
                            max={key === 'threshold' ? '1' : '100'}
                            step="0.01"
                            value={value}
                            onChange={(e) => updatePluginSettings(plugin.id, { 
                              [key]: key === 'threshold' ? parseFloat(e.target.value) : parseInt(e.target.value) 
                            })}
                            className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-gray-300 w-8 text-right">
                            {typeof value === 'number' && value < 1 ? `${Math.round(value * 100)}%` : value}
                          </span>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={String(value)}
                          onChange={(e) => {
                            let newValue: any = e.target.value;
                            if (typeof value === 'number') newValue = parseFloat(newValue) || 0;
                            if (typeof value === 'boolean') newValue = newValue === 'true';
                            updatePluginSettings(plugin.id, { [key]: newValue });
                          }}
                          className="bg-slate-800 text-white text-xs rounded px-2 py-1 w-24 text-right"
                        />
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Информация о статусе плагина */}
                <div className="mt-3 pt-2 border-t border-white/5">
                  <div className="text-[10px] text-gray-500 flex justify-between">
                    <span>🆔 {plugin.id}</span>
                    {isActive ? (
                      <span className="text-green-500">● активен</span>
                    ) : (
                      <span className="text-gray-500">○ неактивен</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Подсказка */}
      <div className="mt-4 p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
        <div className="text-indigo-300 text-xs font-medium mb-1">💡 О плагинах</div>
        <div className="text-gray-400 text-xs">
          Включайте плагины, чтобы расширить функциональность текущего модуля. 
          Каждый плагин добавляет новые возможности и настройки.
        </div>
      </div>
    </div>
  );
};

export default PluginList;