import React from 'react';
import { JournalFilters as JournalFiltersType, JournalFilterType } from '../types';

interface JournalFiltersProps {
  filters: JournalFiltersType;
  onFilterChange: (filters: Partial<JournalFiltersType>) => void;
  availableModules: string[];
}

const JournalFilters: React.FC<JournalFiltersProps> = ({
  filters,
  onFilterChange,
  availableModules,
}) => {
  const filterTypes: { value: JournalFilterType; label: string; icon: string }[] = [
    { value: 'all', label: 'Все', icon: '📋' },
    { value: 'analysis', label: 'Анализ', icon: '📊' },
    { value: 'drone', label: 'Дрон', icon: '🚁' },
    { value: 'calm', label: 'Нет тревоги', icon: '✅' },
    { value: 'event', label: 'События', icon: '⚡' },
    { value: 'system', label: 'Система', icon: '🔧' },
  ];

  const handleTypeChange = (type: JournalFilterType) => {
    onFilterChange({ type });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Теги слева */}
      <div className="flex flex-wrap gap-1.5">
        {filterTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => handleTypeChange(type.value)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center gap-1.5 ${
              filters.type === type.value
                ? 'border border-primary text-primary'
                : 'text-primary border border-base-300'
            }`}
          >
            <span className="text-sm">{type.icon}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      {/* Правая часть */}
      <div className="flex items-center gap-3">
       

        {/* Фильтр по модулю */}
        {availableModules.length > 0 && (
          <select
            value={filters.moduleName || ''}
            onChange={(e) => onFilterChange({ moduleName: e.target.value || undefined })}
            className="select select-bordered select-xs bg-base-300/50 border-base-300 text-sm text-primary min-w-[120px] focus:outline-none focus:border-primary/50"
          >
            <option value="">Все модули</option>
            {availableModules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>
        )}

        {/* Поиск */}
        {/* <div className="relative">
          <input
            type="text"
            placeholder="Поиск..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
            className="input input-bordered input-xs bg-base-300/50 border-base-300 pl-7 text-sm w-40 focus:outline-none focus:border-primary/50"
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-base-content/40 text-xs">
            🔍
          </span>
        </div> */}
      </div>
    </div>
  );
};

export default JournalFilters;