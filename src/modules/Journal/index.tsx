// // src/modules/Journal/index.tsx

// import React, { useEffect, useMemo, useState } from 'react';
// import { useTelemetryStore, TelemetryEntry } from '../../store/telemetry.store';
// import FFTTrendsReportViewer from './components/FFTTrendsReportViewer';
// import DetectionReportViewer from './components/DetectionReportViewer';
// import { JournalFilters as JournalFiltersType } from './types';
// import JournalFilters from './components/JournalFilters';
// import JournalExport from './components/JournalExport';
// import JournalStats from './components/JournalStats';
// import ModuleHeader from '../../components/ui/ModuleHeader';
// import JournalEntry from './components/JournalEntry';

import React, { useEffect, useMemo, useState } from 'react';
import { useTelemetryStore, TelemetryEntry } from '../../store/telemetry.store';
import FFTTrendsReportViewer from './components/FFTTrendsReportViewer';
import DetectionReportViewer from './components/DetectionReportViewer';
import { JournalFilters as JournalFiltersType } from './types';
import JournalFilters from './components/JournalFilters';
import JournalExport from './components/JournalExport';
import JournalStats from './components/JournalStats';
import ModuleHeader from '../../components/ui/ModuleHeader';
import JournalEntry from './components/JournalEntry';

const Journal: React.FC = () => {
  const telemetryStore = useTelemetryStore();
  
  const [entries, setEntries] = useState<TelemetryEntry[]>([]);
  const [filters, setFilters] = useState<JournalFiltersType>({
    type: 'all',
    sortOrder: 'desc', // 'desc' - новые сверху (самые поздние), 'asc' - старые сверху (самые ранние)
  });
  const [displayEntries, setDisplayEntries] = useState<TelemetryEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, drone: 0, calm: 0 });

  // Функция обновления записей из store
  const updateEntries = () => {
    try {
      if (telemetryStore && typeof telemetryStore.getEntries === 'function') {
        const freshEntries = telemetryStore.getEntries();
        setEntries(freshEntries);
        
        // Обновляем статистику
        const total = freshEntries.length;
        let drone = 0;
        let calm = 0;
        
        freshEntries.forEach(entry => {
          if (entry.type === 'analysis' && entry.data?.tags) {
            const tags = entry.data.tags;
            if (tags.includes('drone')) drone++;
            if (tags.includes('calm')) calm++;
            if (tags.includes('drone') || tags.includes('birds') || tags.includes('traffic')) drone++;
            if (tags.includes('quiet') || tags.includes('calm')) calm++;
          }
        });
        
        setStats({ total, drone, calm });
      }
    } catch (error) {
      console.error('[Journal] Error updating entries:', error);
      setEntries([]);
    }
  };

  // Подписка на изменения store
  useEffect(() => {
    updateEntries();
    
    const unsubscribe = useTelemetryStore.subscribe(() => {
      updateEntries();
    });
    
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [telemetryStore]);

  const availableModules = useMemo(() => {
    const modules = new Set<string>();
    entries.forEach(e => {
      if (e.moduleName) modules.add(e.moduleName);
    });
    return Array.from(modules).sort();
  }, [entries]);

  useEffect(() => {
    let filtered = [...entries];

    // Фильтрация по типу
    if (filters.type !== 'all') {
      filtered = filtered.filter(e => {
        switch (filters.type) {
          case 'analysis':
            return e.type === 'analysis';
          case 'drone':
            return e.type === 'analysis' && (
              e.data?.tags?.includes('drone') || 
              e.data?.detectedState === 'DRONE'
            );
          case 'calm':
            return e.type === 'analysis' && (
              e.data?.tags?.includes('calm') || 
              e.data?.tags?.includes('quiet') ||
              e.data?.detectedState === 'QUIET'
            );
          case 'event':
            return e.type === 'event';
          case 'system':
            return e.type === 'module_start' || e.type === 'module_stop';
          default:
            return true;
        }
      });
    }

    // Фильтрация по модулю
    if (filters.moduleName) {
      filtered = filtered.filter(e => e.moduleName === filters.moduleName);
    }

    // Фильтрация по поиску
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(e => 
        JSON.stringify(e.data).toLowerCase().includes(searchLower) ||
        e.moduleName?.toLowerCase().includes(searchLower) ||
        (e.tags && e.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }

    // Сортировка только по времени
    // sortOrder: 'desc' - новые сверху (самые поздние)
    // sortOrder: 'asc' - старые сверху (самые ранние)
    filtered.sort((a, b) => {
      return filters.sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
    });

    setDisplayEntries(filtered);
  }, [entries, filters]);

  const handleFilterChange = (newFilters: Partial<JournalFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearJournal = () => {
    if (confirm('Вы уверены, что хотите очистить весь журнал? Это действие необратимо.')) {
      telemetryStore.clearEntries();
      updateEntries();
    }
  };
  
  const renderEntry = (entry: TelemetryEntry) => {
    try {
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
      return <JournalEntry entry={entry} />;
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
          
          <div className="flex items-center gap-4">
            <JournalExport entries={displayEntries} />
            <button
              onClick={handleClearJournal}
              className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
            >
              🗑️ Очистить
            </button>
          </div>
        </div>

        {/* Вторая строка: фильтры */}
        <JournalFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          availableModules={availableModules}
        />

        {/* Список записей */}
        {displayEntries.length === 0 ? (
          <div className="text-center text-base-content/70 py-8 bg-base-200 rounded-xl">
            <div className="text-4xl mb-2">📭</div>
            <p>Нет записей в журнале</p>
            <p className="text-sm">Запустите анализ для появления отчётов</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayEntries.map((entry) => (
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

// // Обновлённая функция приоритетов тегов
// const getTagPriority = (entry: TelemetryEntry): number => {
//   if (entry.type === 'analysis' && entry.data?.tags) {
//     const tags = entry.data.tags;
//     // Приоритет для обнаружения дрона (для обратной совместимости)
//     if (tags.includes('drone')) return 1;
//     // Приоритет для обнаружения других состояний
//     if (tags.includes('birds') || tags.includes('drone')) return 1;
//     if (tags.includes('calm') || tags.includes('quiet')) return 2;
//     if (tags.includes('analysis')) return 3;
//   }
//   if (entry.type === 'module_start' || entry.type === 'module_stop') return 4;
//   if (entry.type === 'event') return 5;
//   return 6;
// };

// const Journal: React.FC = () => {
//   const telemetryStore = useTelemetryStore();
  
//   // Используем getEntries() для получения отсортированных записей
//   const [entries, setEntries] = useState<TelemetryEntry[]>([]);
//   const [filters, setFilters] = useState<JournalFiltersType>({
//     type: 'all',
//     sortOrder: 'desc',
//   });
//   const [displayEntries, setDisplayEntries] = useState<TelemetryEntry[]>([]);
//   const [stats, setStats] = useState({ total: 0, drone: 0, calm: 0 });

//   // Функция обновления записей из store
//   const updateEntries = () => {
//     try {
//       if (telemetryStore && typeof telemetryStore.getEntries === 'function') {
//         const freshEntries = telemetryStore.getEntries();
//         setEntries(freshEntries);
        
//         // Обновляем статистику
//         const total = freshEntries.length;
//         let drone = 0;
//         let calm = 0;
        
//         freshEntries.forEach(entry => {
//           if (entry.type === 'analysis' && entry.data?.tags) {
//             const tags = entry.data.tags;
//             // Для обратной совместимости с старыми отчётами
//             if (tags.includes('drone')) drone++;
//             if (tags.includes('calm')) calm++;
//             // Для новых отчётов TrendsFFTDetector
//             if (tags.includes('drone') || tags.includes('birds') || tags.includes('traffic')) drone++;
//             if (tags.includes('quiet') || tags.includes('calm')) calm++;
//           }
//         });
        
//         setStats({ total, drone, calm });
//       }
//     } catch (error) {
//       console.error('[Journal] Error updating entries:', error);
//       setEntries([]);
//     }
//   };

//   // Подписка на изменения store
//   useEffect(() => {
//     // Начальная загрузка
//     updateEntries();
    
//     // Подписываемся на изменения
//     const unsubscribe = useTelemetryStore.subscribe(() => {
//       updateEntries();
//     });
    
//     return () => {
//       if (unsubscribe && typeof unsubscribe === 'function') {
//         unsubscribe();
//       }
//     };
//   }, [telemetryStore]);

//   const availableModules = useMemo(() => {
//     const modules = new Set<string>();
//     entries.forEach(e => {
//       if (e.moduleName) modules.add(e.moduleName);
//     });
//     return Array.from(modules).sort();
//   }, [entries]);

//   useEffect(() => {
//     let filtered = [...entries];

//     if (filters.type !== 'all') {
//       filtered = filtered.filter(e => {
//         switch (filters.type) {
//           case 'analysis':
//             return e.type === 'analysis';
//           case 'drone':
//             // Обновлённая проверка для дронов
//             return e.type === 'analysis' && (
//               e.data?.tags?.includes('drone') || 
//               e.data?.detectedState === 'DRONE'
//             );
//           case 'calm':
//             // Обновлённая проверка для тишины
//             return e.type === 'analysis' && (
//               e.data?.tags?.includes('calm') || 
//               e.data?.tags?.includes('quiet') ||
//               e.data?.detectedState === 'QUIET'
//             );
//           case 'event':
//             return e.type === 'event';
//           case 'system':
//             return e.type === 'module_start' || e.type === 'module_stop';
//           default:
//             return true;
//         }
//       });
//     }

//     if (filters.moduleName) {
//       filtered = filtered.filter(e => e.moduleName === filters.moduleName);
//     }

//     if (filters.search) {
//       const searchLower = filters.search.toLowerCase();
//       filtered = filtered.filter(e => 
//         JSON.stringify(e.data).toLowerCase().includes(searchLower) ||
//         e.moduleName?.toLowerCase().includes(searchLower) ||
//         (e.tags && e.tags.some(tag => tag.toLowerCase().includes(searchLower)))
//       );
//     }

//     filtered.sort((a, b) => {
//       const priorityA = getTagPriority(a);
//       const priorityB = getTagPriority(b);
//       if (priorityA !== priorityB) return priorityA - priorityB;
//       return filters.sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
//     });

//     setDisplayEntries(filtered);
//   }, [entries, filters]);

//   const handleFilterChange = (newFilters: Partial<JournalFiltersType>) => {
//     setFilters(prev => ({ ...prev, ...newFilters }));
//   };

//   const handleClearJournal = () => {
//     if (confirm('Вы уверены, что хотите очистить весь журнал? Это действие необратимо.')) {
//       telemetryStore.clearEntries();
//       updateEntries();
//     }
//   };
  
//   const renderEntry = (entry: TelemetryEntry) => {
//     try {
//       if (!entry || !entry.data) {
//         return (
//           <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden mb-3 p-4">
//             <div className="text-center text-gray-500">
//               ⚠️ Некорректная запись
//             </div>
//           </div>
//         );
//       }
      
//       // Для отчётов TrendsFFTDetector
//       if (entry.moduleName === 'TrendsFFTDetector' && entry.type === 'analysis') {
//         return <FFTTrendsReportViewer report={entry.data} />;
//       }
      
//       // Для отчётов FFTDetector
//       if (entry.moduleName === 'FFTDetector' && entry.type === 'analysis') {
//         return <DetectionReportViewer report={entry.data} />;
//       }

//       // Стандартное отображение для других типов записей
//       return <JournalEntry entry={entry} />;
//     } catch (error) {
//       console.error('[Journal] Error rendering entry:', error);
//       return (
//         <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden mb-3 p-4">
//           <div className="text-center text-red-500">
//             ❌ Ошибка отображения записи
//           </div>
//         </div>
//       );
//     }
//   };
  
//   return (
//     <div className="p-6 max-w-7xl mx-auto">
//       <ModuleHeader
//         icon="📋"
//         title="Журнал телеметрии"
//         description="Просмотр и экспорт записей детектора"
//       />

//       <div className="mt-6 space-y-3">
//         {/* Первая строка: статистика слева, кнопки справа */}
//         <div className="flex flex-wrap items-center justify-between gap-3">
//           <JournalStats
//             totalCount={stats.total}
//             filteredCount={displayEntries.length}
//             droneCount={stats.drone}
//             calmCount={stats.calm}
//           />
          
//           <div className="flex items-center gap-4">
//             <JournalExport entries={displayEntries} />
//             <button
//               onClick={handleClearJournal}
//               className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
//             >
//               🗑️ Очистить
//             </button>
//           </div>
//         </div>

//         {/* Вторая строка: фильтры */}
//         <JournalFilters
//           filters={filters}
//           onFilterChange={handleFilterChange}
//           availableModules={availableModules}
//         />

//         {/* Список записей */}
//         {displayEntries.length === 0 ? (
//           <div className="text-center text-base-content/70 py-8 bg-base-200 rounded-xl">
//             <div className="text-4xl mb-2">📭</div>
//             <p>Нет записей в журнале</p>
//             <p className="text-sm">Запустите анализ для появления отчётов</p>
//           </div>
//         ) : (
//           <div className="space-y-3">
//             {displayEntries.map((entry) => (
//               <div key={entry.id}>
//                 {renderEntry(entry)}
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Journal;