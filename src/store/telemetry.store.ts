// src/store/telemetry.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TelemetryEntry {
  id: string;
  timestamp: number;
  type: 'analysis' | 'event' | 'module_start' | 'module_stop';
  moduleId: string;
  moduleName: string;
  data: any;
  tags: string[];
}

interface TelemetryState {
  modules: Record<string, any>;
  entries: TelemetryEntry[];
  registerModule: (name: string, data?: any) => string;
  unregisterModule: (moduleId: string) => void;
  addEntry: (entry: Omit<TelemetryEntry, 'id' | 'timestamp'>) => string;
  addReportEntry: (entry: Omit<TelemetryEntry, 'id' | 'timestamp'>) => string | null;
  getEntries: () => TelemetryEntry[];
  getEntriesByModule: (moduleId: string) => TelemetryEntry[];
  getEntriesByType: (type: TelemetryEntry['type']) => TelemetryEntry[];
  clearEntries: () => void;
  clearOldEntries: (maxAgeMs: number) => void;
  // Статистика
  getStats: () => {
    total: number;
    analysis: number;
    drone: number;
    calm: number;
    events: number;
    system: number;
  };
}

// Хранилище ID уже добавленных отчётов
const addedReportIds = new Set<string>();

export const useTelemetryStore = create<TelemetryState>()(
  persist(
    (set, get) => ({
      modules: {},
      entries: [],
      
      registerModule: (name, data = {}) => {
        const moduleId = `mod_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const moduleData = {
          name,
          registeredAt: Date.now(),
          ...data,
        };
        
        set((state) => ({
          modules: { ...state.modules, [moduleId]: moduleData }
        }));
        
        // Добавляем событие запуска модуля
        get().addEntry({
          type: 'module_start',
          moduleId,
          moduleName: name,
          data: moduleData,
          tags: ['module', 'start', name.toLowerCase()],
        });
        
        return moduleId;
      },
      
      unregisterModule: (moduleId) => {
        const module = get().modules[moduleId];
        if (module) {
          get().addEntry({
            type: 'module_stop',
            moduleId,
            moduleName: module.name,
            data: { stoppedAt: Date.now() },
            tags: ['module', 'stop', module.name.toLowerCase()],
          });
        }
        
        set((state) => {
          const { [moduleId]: _, ...rest } = state.modules;
          return { modules: rest };
        });
      },
      
      addEntry: (entry) => {
        const newEntry: TelemetryEntry = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          timestamp: Date.now(),
          ...entry,
        };
        
        set((state) => {
          const newEntries = [newEntry, ...state.entries];
          if (newEntries.length > 1000) {
            newEntries.pop();
          }
          return { entries: newEntries };
        });
        
        console.log(`[TelemetryStore] ✅ Entry added: ${newEntry.id} (${entry.moduleName} - ${entry.type})`);
        return newEntry.id;
      },
      
      // Специализированный метод для добавления отчётов с защитой от дублирования
      addReportEntry: (entry) => {
        // Извлекаем уникальный ID отчёта из данных
        const reportUniqueId = entry.data?.reportUniqueId || entry.data?.id;
        
        if (!reportUniqueId) {
          console.error('[TelemetryStore] ❌ Report entry missing reportUniqueId!');
          return null;
        }
        
        // Проверяем, не было ли уже такого отчёта
        if (addedReportIds.has(reportUniqueId)) {
          console.warn(`[TelemetryStore] ⚠️ Duplicate report detected! Report with ID ${reportUniqueId} already exists. Skipping...`);
          console.warn(`[TelemetryStore] Duplicate details:`, {
            moduleId: entry.moduleId,
            moduleName: entry.moduleName,
            type: entry.type,
            reportUniqueId,
          });
          return null;
        }
        
        // Добавляем ID в Set
        addedReportIds.add(reportUniqueId);
        
        // Очищаем старые ID (оставляем последние 1000)
        if (addedReportIds.size > 1000) {
          const toDelete = Array.from(addedReportIds).slice(0, addedReportIds.size - 1000);
          toDelete.forEach(id => addedReportIds.delete(id));
        }
        
        // Создаём запись
        const newEntry: TelemetryEntry = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          timestamp: Date.now(),
          ...entry,
        };
        
        set((state) => {
          const newEntries = [newEntry, ...state.entries];
          if (newEntries.length > 1000) {
            newEntries.pop();
          }
          return { entries: newEntries };
        });
        
        console.log(`[TelemetryStore] ✅ Report entry added: ${newEntry.id} (${entry.moduleName} - report: ${reportUniqueId})`);
        return newEntry.id;
      },
      
      getEntries: () => {
        const entries = get().entries;
        return [...entries].sort((a, b) => b.timestamp - a.timestamp);
      },
      
      getEntriesByModule: (moduleId) => {
        const entries = get().entries;
        return entries
          .filter(entry => entry.moduleId === moduleId)
          .sort((a, b) => b.timestamp - a.timestamp);
      },
      
      getEntriesByType: (type) => {
        const entries = get().entries;
        return entries
          .filter(entry => entry.type === type)
          .sort((a, b) => b.timestamp - a.timestamp);
      },
      
      clearEntries: () => {
        set({ entries: [] });
        addedReportIds.clear();
        console.log('[TelemetryStore] All entries cleared');
      },
      
      clearOldEntries: (maxAgeMs) => {
        const cutoffTime = Date.now() - maxAgeMs;
        set((state) => {
          const newEntries = state.entries.filter(entry => entry.timestamp > cutoffTime);
          console.log(`[TelemetryStore] Cleared ${state.entries.length - newEntries.length} old entries`);
          return { entries: newEntries };
        });
      },

      getStats: () => {
        const entries = get().entries;
        const analysisEntries = entries.filter(e => e.type === 'analysis');
        
        return {
          total: entries.length,
          analysis: analysisEntries.length,
          drone: analysisEntries.filter(e => e.data?.tags?.includes('drone')).length,
          calm: analysisEntries.filter(e => e.data?.tags?.includes('calm')).length,
          events: entries.filter(e => e.type === 'event').length,
          system: entries.filter(e => e.type === 'module_start' || e.type === 'module_stop').length,
        };
      },

      

      
    }),
    {
      name: 'telemetry-storage',
      partialize: (state) => ({
        modules: state.modules,
        entries: state.entries,
      }),
    }
  )
);