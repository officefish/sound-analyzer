import React, { useState } from 'react';
import { useAppStore } from '../../store/app.store';
import { usePluginsStore } from '../../store/plugins.store';
import { ModuleType } from '../../types/modules';
import { Slider, Toggle, Card, Badge, Button } from '../ui';

const PluginList: React.FC = () => {
  const { currentApp } = useAppStore();
  const { 
    getPluginsByModule, 
    togglePlugin, 
    updatePluginSettings,
    //isPluginActive 
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
        <Card className="text-center py-8 px-4">
          <div className="text-3xl mb-2">🔌</div>
          <p className="text-gray-500 text-xs">Нет плагинов для этого модуля</p>
          <p className="text-gray-600 text-xs mt-1">Плагины появятся позже</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="text-gray-400 text-xs uppercase tracking-wider mb-3 px-3 flex justify-between items-center">
        <span>🔌 Плагины ({plugins.length})</span>
        <Badge variant="info" size="sm">
          {activeCount} активны
        </Badge>
      </div>
      
      {plugins.map((plugin) => {
        const isActive = plugin.enabled;
        
        return (
          <Card
            key={plugin.id}
            variant={isActive ? 'active' : 'default'}
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
                      <Badge variant="success" size="sm">
                        активен
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">
                    {plugin.description}
                  </p>
                </div>
                
                {/* Toggle Switch - кнопка активации плагина */}
                <Toggle
                  enabled={isActive}
                  onChange={() => togglePlugin(plugin.id)}
                  size="md"
                />
              </div>
              
              {/* Кнопка раскрытия настроек (если есть настройки) */}
              {plugin.settings && Object.keys(plugin.settings).length > 0 && (
                <Button
                  onClick={() => setExpandedPlugin(expandedPlugin === plugin.id ? null : plugin.id)}
                  variant="secondary"
                  size="sm"
                  className="w-full mt-2"
                >
                  {expandedPlugin === plugin.id ? '▲ Скрыть настройки' : '▼ Настройки плагина'}
                </Button>
              )}
            </div>
            
            {/* Панель настроек (расширенная) */}
            {expandedPlugin === plugin.id && plugin.settings && (
              <div className="px-3 pb-3 pt-0 border-t border-white/10 mt-1">
                <div className="text-xs text-gray-400 mb-3 pt-2">⚙️ Настройки:</div>
                <div className="space-y-3">
                  {Object.entries(plugin.settings).map(([key, value]) => {
                    // Форматируем название ключа для отображения
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    
                    // Определяем единицу измерения
                    let unit: 'percent' | 'ms' | 'db' | 'hz' = 'percent';
                    if (key.includes('Time') || key.includes('Delay')) unit = 'ms';
                    if (key.includes('Freq') || key.includes('Frequency')) unit = 'hz';
                    if (key.includes('Gain') || key.includes('Volume')) unit = 'db';
                    
                    return (
                      <div key={key}>
                        {typeof value === 'boolean' ? (
                          <Toggle
                            enabled={value}
                            onChange={(newValue) => updatePluginSettings(plugin.id, { [key]: newValue })}
                            label={label}
                            size="sm"
                          />
                        ) : typeof value === 'number' ? (
                          <Slider
                            value={value}
                            onChange={(newValue) => updatePluginSettings(plugin.id, { [key]: newValue })}
                            label={label}
                            unit={unit}
                            min={key.includes('threshold') || key.includes('sensitivity') || key.includes('reduction') ? 0 : 0}
                            max={key.includes('threshold') || key.includes('sensitivity') || key.includes('reduction') ? 1 : 100}
                            step={key.includes('threshold') || key.includes('sensitivity') || key.includes('reduction') ? 0.01 : 1}
                            size="md"
                          />
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-xs">{label}:</span>
                            <input
                              type="text"
                              value={String(value)}
                              onChange={(e) => {
                                let newValue: any = e.target.value;
                                if (typeof value === 'number') newValue = parseFloat(newValue) || 0;
                                if (typeof value === 'boolean') newValue = newValue === 'true';
                                updatePluginSettings(plugin.id, { [key]: newValue });
                              }}
                              className="w-32 bg-slate-800 text-white text-xs rounded px-2 py-1 border border-white/10 focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Информация о статусе плагина */}
                <div className="mt-3 pt-2 border-t border-white/5">
                  <div className="text-[10px] text-gray-500 flex justify-between">
                    <span>🆔 {plugin.id}</span>
                    {isActive ? (
                      <Badge variant="success" size="sm">● активен</Badge>
                    ) : (
                      <Badge variant="default" size="sm">○ неактивен</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}
      
      {/* Подсказка */}
      <Card variant="default" className="p-3 bg-indigo-500/10 border-indigo-500/20">
        <div className="text-indigo-300 text-xs font-medium mb-1">💡 О плагинах</div>
        <div className="text-gray-400 text-xs">
          Включайте плагины, чтобы расширить функциональность текущего модуля. 
          Каждый плагин добавляет новые возможности и настройки.
        </div>
      </Card>
    </div>
  );
};

export default PluginList;