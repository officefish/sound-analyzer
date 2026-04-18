// src/modules/Journal/index.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { useTelemetryStore, TelemetryEntry } from '../../store/telemetry.store';
import FFTTrendsReportViewer from './components/FFTTrendsReportViewer';
import DetectionReportViewer from './components/DetectionReportViewer';
import { JournalFilters as JournalFiltersType } from './types';
import JournalFilters from './components/JournalFilters';
import JournalExport from './components/JournalExport';
import JournalStats from './components/JournalStats';
import ModuleHeader from '../../components/ui/ModuleHeader';


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
  const telemetryStore = useTelemetryStore();

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
  
  const renderEntry = (entry: TelemetryEntry) => {
    try {
      // Проверяем наличие данных
      if (!entry || !entry.data) {
        return (
          <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden mb-3 p-4">
            <div className="text-center text-gray-500">
              ⚠️ Некорректная запись
            </div>
          </div>
        );
      }
      
      // Для отчётов TrendsFFTDetector
      if (entry.moduleName === 'TrendsFFTDetector' && entry.type === 'analysis') {
        return <FFTTrendsReportViewer report={entry.data} />;
      }
      
      // Для отчётов FFTDetector
      if (entry.moduleName === 'FFTDetector' && entry.type === 'analysis') {
        return <DetectionReportViewer report={entry.data} />;
      }
      
      // Стандартное отображение для других типов записей
      return (
        <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden mb-3 p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-mono text-primary">[{entry.moduleName}]</span>
            <span className="text-xs text-gray-500">{entry.type}</span>
            <span className="text-xs text-gray-500">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
            {entry.tags?.map((tag: string) => (
              <span key={tag} className="text-[9px] bg-base-300 px-1.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <pre className="text-xs overflow-auto max-h-96">
            {JSON.stringify(entry.data, null, 2)}
          </pre>
        </div>
      );
    } catch (error) {
      console.error('[Journal] Error rendering entry:', error);
      return (
        <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden mb-3 p-4">
          <div className="text-center text-red-500">
            ❌ Ошибка отображения записи
          </div>
        </div>
      );
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


      
          {entries.length === 0 ? (
            <div className="text-center text-base-content/70 py-8 bg-base-200 rounded-xl">
              <div className="text-4xl mb-2">📭</div>
              <p>Нет записей в журнале</p>
              <p className="text-sm">Запустите анализ для появления отчётов</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id}>
                  {renderEntry(entry)}
                </div>
              ))}
            </div>
          )}
        </div>

    </div>
  );
};

export default Journal;