import React, { useState, useEffect, useMemo } from 'react';
import { useTelemetryStore, TelemetryEntry } from '../../store/telemetry.store';
import ModuleHeader from '../../components/ui/ModuleHeader';
import JournalEntry from './components/JournalEntry';
import JournalFilters from './components/JournalFilters';
import JournalStats from './components/JournalStats';
import JournalExport from './components/JournalExport';
import { JournalFilters as JournalFiltersType } from './types';

const getTagPriority = (entry: TelemetryEntry): number => {
  if (entry.type === 'analysis' && entry.data?.tags) {
    if (entry.data.tags.includes('drone')) return 1;
    if (entry.data.tags.includes('calm')) return 2;
    if (entry.data.tags.includes('analysis')) return 3;
  }
  if (entry.type === 'module_start' || entry.type === 'module_stop') return 4;
  if (entry.type === 'event') return 5;
  return 6;
};

const Journal: React.FC = () => {
  const { entries, clearEntries, getStats } = useTelemetryStore();
  const [filters, setFilters] = useState<JournalFiltersType>({
    type: 'all',
    sortOrder: 'desc',
  });
  const [displayEntries, setDisplayEntries] = useState<TelemetryEntry[]>([]);
  const [stats, setStats] = useState(getStats());

  useEffect(() => {
    setStats(getStats());
  }, [entries, getStats]);

  const availableModules = useMemo(() => {
    const modules = new Set<string>();
    entries.forEach(e => {
      if (e.moduleName) modules.add(e.moduleName);
    });
    return Array.from(modules).sort();
  }, [entries]);

  useEffect(() => {
    let filtered = [...entries];

    if (filters.type !== 'all') {
      filtered = filtered.filter(e => {
        switch (filters.type) {
          case 'analysis':
            return e.type === 'analysis';
          case 'drone':
            return e.type === 'analysis' && e.data?.tags?.includes('drone');
          case 'calm':
            return e.type === 'analysis' && e.data?.tags?.includes('calm');
          case 'event':
            return e.type === 'event';
          case 'system':
            return e.type === 'module_start' || e.type === 'module_stop';
          default:
            return true;
        }
      });
    }

    if (filters.moduleName) {
      filtered = filtered.filter(e => e.moduleName === filters.moduleName);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(e => 
        JSON.stringify(e.data).toLowerCase().includes(searchLower) ||
        e.moduleName?.toLowerCase().includes(searchLower) ||
        e.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    filtered.sort((a, b) => {
      const priorityA = getTagPriority(a);
      const priorityB = getTagPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return filters.sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
    });

    setDisplayEntries(filtered);
  }, [entries, filters]);

  const handleFilterChange = (newFilters: Partial<JournalFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearJournal = () => {
    if (confirm('Вы уверены, что хотите очистить весь журнал? Это действие необратимо.')) {
      clearEntries();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <ModuleHeader
        icon="📋"
        title="Журнал телеметрии"
        description="Просмотр и экспорт записей детектора"
      />

      <div className="mt-6 space-y-3">
        {/* Первая строка: статистика слева, кнопки справа */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <JournalStats
            totalCount={stats.total}
            filteredCount={displayEntries.length}
            droneCount={stats.drone}
            calmCount={stats.calm}
          />
          
          <div className="flex items-center gap-2">
            <JournalExport entries={displayEntries} />
            <button
              onClick={handleClearJournal}
              className="text-xs text-primary/60 hover:text-primary transition-colors flex items-center gap-1"
            >
              🗑️ Очистить
            </button>
          </div>
        </div>

        {/* Вторая строка: теги слева, поиск справа */}
        <JournalFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          availableModules={availableModules}
        />


        {/* Список записей */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto mt-4">
          {displayEntries.length === 0 ? (
            <div className="text-center text-base-content/40 py-8 text-sm">
              📭 Нет записей, соответствующих фильтрам
            </div>
          ) : (
            displayEntries.map((entry) => (
              <JournalEntry key={entry.id} entry={entry} />
            ))
          )}
        </div>

        <div className="text-center text-xs text-base-content/40 pt-2">
          Показано {displayEntries.length} из {entries.length} записей
        </div>
      </div>
    </div>
  );
};

export default Journal;