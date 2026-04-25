// src/plugins/microphone2/components/SoundTemplateList.tsx

import React, { useState, useEffect } from 'react';
import { 
  PatternTemplate, 
  SoundTemplateListProps,
  isUserPattern,
  isSystemPattern
} from '../types';
import { usePatternTemplatesStore } from '../stores/patterns.store';

const SoundTemplateList: React.FC<SoundTemplateListProps> = ({ 
  onTemplateToggle, 
  onTemplateSelect,
  compact = false 
}) => {
  const {
    templates,
    initializeTemplates,
    toggleTemplate,
    toggleAllTemplates,
    resetToSystemTemplates,
  } = usePatternTemplatesStore();

  const [filter, setFilter] = useState<'all' | 'system' | 'user'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByType, setGroupByType] = useState(false);

  useEffect(() => {
    initializeTemplates();
  }, [initializeTemplates]);

  const filteredTemplates = templates.filter(template => {
    if (filter === 'system' && isUserPattern(template)) return false;
    if (filter === 'user' && isSystemPattern(template)) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return template.name.toLowerCase().includes(query) || 
             template.description.toLowerCase().includes(query);
    }
    
    return true;
  });

  const systemTemplates = filteredTemplates.filter(t => isSystemPattern(t));
  const userTemplates = filteredTemplates.filter(t => isUserPattern(t));
  
  const enabledCount = templates.filter(t => t.isEnabled).length;
  const totalCount = templates.length;
  const enabledSystemCount = systemTemplates.filter(t => t.isEnabled).length;
  const enabledUserCount = userTemplates.filter(t => t.isEnabled).length;

  const handleToggleTemplate = (id: string, enabled: boolean) => {
    toggleTemplate(id, enabled);
    if (onTemplateToggle) {
      onTemplateToggle(id, enabled);
    }
  };

  const handleToggleAll = () => {
    const allEnabled = enabledCount === totalCount;
    toggleAllTemplates(!allEnabled);
  };

  const renderTemplateItem = (template: PatternTemplate) => (
    <div
      key={template.id}
      className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 cursor-pointer ${
        template.isEnabled 
          ? 'bg-base-300/50 hover:bg-base-300/70 border-l-2 border-primary' 
          : 'bg-base-300/20 hover:bg-base-300/40 opacity-60 border-l-2 border-transparent'
      }`}
      onClick={() => onTemplateSelect && onTemplateSelect(template)}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <input
          type="checkbox"
          checked={template.isEnabled}
          onChange={(e) => {
            e.stopPropagation();
            handleToggleTemplate(template.id, e.target.checked);
          }}
          className="checkbox checkbox-sm checkbox-primary flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl flex-shrink-0">{template.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs font-semibold truncate">{template.name}</span>
              {isSystemPattern(template) && (
                <span className="text-[8px] bg-gray-500/30 px-1 rounded flex-shrink-0">system</span>
              )}
              {isUserPattern(template) && template.source === 'audio_file' && (
                <span className="text-[8px] bg-blue-500/30 px-1 rounded flex-shrink-0">🎵</span>
              )}
              {isUserPattern(template) && template.confidence && (
                <span className="text-[8px] bg-primary/30 px-1 rounded flex-shrink-0">
                  {template.confidence}%
                </span>
              )}
            </div>
            {!compact && (
              <div className="text-[9px] text-gray-500 truncate">
                {template.description}
              </div>
            )}
          </div>
        </div>
      </div>
      {!compact && (
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${template.isEnabled ? 'bg-green-500' : 'bg-gray-500'}`} />
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-1">
        {filteredTemplates.slice(0, 5).map(renderTemplateItem)}
        {filteredTemplates.length > 5 && (
          <div className="text-[9px] text-gray-500 text-center pt-1">
            + еще {filteredTemplates.length - 5} шаблонов
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Статистика и управление */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-gray-400">
            📋 Участие в анализе
          </div>
          <div className="flex gap-2 text-[9px]">
            <span className="text-green-400">✓ {enabledCount}</span>
            <span className="text-gray-500">/ {totalCount}</span>
            {systemTemplates.length > 0 && (
              <span className="text-gray-500">
                (систем: {enabledSystemCount}/{systemTemplates.length})
              </span>
            )}
            {userTemplates.length > 0 && (
              <span className="text-gray-500">
                польз: {enabledUserCount}/{userTemplates.length}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleToggleAll}
            className="text-[10px] bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 px-2 py-1 rounded transition-colors"
            title={enabledCount === totalCount ? "Отключить все шаблоны" : "Включить все шаблоны"}
          >
            {enabledCount === totalCount ? '🔘 Отключить все' : '✅ Включить все'}
          </button>
          <button
            onClick={resetToSystemTemplates}
            className="text-[10px] bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded transition-colors"
            title="Сбросить к системным шаблонам (пользовательские будут удалены)"
          >
            🔄 Сброс
          </button>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск шаблонов..."
            className="w-full bg-base-300 rounded pl-7 pr-2 py-1 text-xs"
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
            🔍
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              filter === 'all' 
                ? 'bg-primary/30 text-primary' 
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setFilter('system')}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              filter === 'system' 
                ? 'bg-primary/30 text-primary' 
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Системные
          </button>
          <button
            onClick={() => setFilter('user')}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              filter === 'user' 
                ? 'bg-primary/30 text-primary' 
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Пользовательские
          </button>
        </div>
      </div>

      {/* Кнопка группировки */}
      <div className="flex justify-end">
        <button
          onClick={() => setGroupByType(!groupByType)}
          className="text-[9px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          {groupByType ? '📋 Показать списком' : '📁 Группировать по типу'}
        </button>
      </div>

      {/* Список шаблонов с группировкой */}
      {groupByType && systemTemplates.length > 0 && userTemplates.length > 0 ? (
        <div className="space-y-3">
          {userTemplates.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                <span>👤 Пользовательские</span>
                <span className="text-[8px]">({userTemplates.length})</span>
              </div>
              <div className="space-y-1">
                {userTemplates.map(renderTemplateItem)}
              </div>
            </div>
          )}
          
          {systemTemplates.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                <span>⚙️ Системные</span>
                <span className="text-[8px]">({systemTemplates.length})</span>
              </div>
              <div className="space-y-1">
                {systemTemplates.map(renderTemplateItem)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {filteredTemplates.map(renderTemplateItem)}
          
          {filteredTemplates.length === 0 && (
            <div className="text-center text-gray-500 text-[10px] py-8">
              {searchQuery 
                ? 'Шаблоны не найдены' 
                : filter === 'user' 
                  ? 'Нет пользовательских шаблонов. Используйте редактор для создания!'
                  : 'Нет доступных шаблонов'}
            </div>
          )}
        </div>
      )}

      {/* Легенда */}
      <div className="flex justify-center gap-3 text-[8px] text-gray-500 pt-1 border-t border-gray-700 flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Участвует</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <span>Исключен</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px]">🎵</span>
          <span>Из аудио</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px]">⚙️</span>
          <span>Системный</span>
        </div>
      </div>
    </div>
  );
};

export default SoundTemplateList;