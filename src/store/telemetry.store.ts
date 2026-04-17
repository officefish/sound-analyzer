// src/store/telemetry.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TelemetryEntry {
  id: number;
  timestamp: number;
  type: 'analysis' | 'event' | 'module_start' | 'module_stop';
  moduleId: string;
  moduleName: string;
  data: any;
  tags: string[];
}

export interface TelemetryModule {
  id: string;
  name: string;
  version: string;
  startedAt: number;
  stoppedAt?: number;
  metadata: Record<string, any>;
}

interface TelemetryState {
  entries: TelemetryEntry[];
  modules: TelemetryModule[];
  nextId: number;
  
  // Управление модулями
  registerModule: (name: string, metadata?: Record<string, any>) => string;
  unregisterModule: (moduleId: string) => void;
  getModule: (moduleId: string) => TelemetryModule | undefined;
  
  // Добавление записей
  addEntry: (entry: Omit<TelemetryEntry, 'id' | 'timestamp'>) => void;
  addEventEntry: (moduleId: string, event: string, details?: any) => void;
  
  // Управление
  clearEntries: () => void;
  getEntriesByModule: (moduleId: string) => TelemetryEntry[];
  getEntriesByTag: (tag: string) => TelemetryEntry[];  // ✅ исправлено
  getEntriesByType: (type: TelemetryEntry['type']) => TelemetryEntry[];  // ✅ исправлено
  
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

export const useTelemetryStore = create<TelemetryState>()(
  persist(
    (set, get) => ({
      entries: [],
      modules: [],
      nextId: 1,
      
      registerModule: (name, metadata = {}) => {
        const moduleId = `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newModule: TelemetryModule = {
          id: moduleId,
          name,
          version: metadata.version || '1.0.0',
          startedAt: Date.now(),
          metadata,
        };
        
        set((state) => ({
          modules: [...state.modules, newModule],
        }));
        
        get().addEntry({
          type: 'module_start',
          moduleId,
          moduleName: name,
          data: { version: metadata.version, mode: metadata.mode },
          tags: ['system', 'module_start', name],
        });
        
        return moduleId;
      },
      
      unregisterModule: (moduleId) => {
        const module = get().modules.find(m => m.id === moduleId);
        if (module) {
          get().addEntry({
            type: 'module_stop',
            moduleId,
            moduleName: module.name,
            data: { duration: Date.now() - module.startedAt },
            tags: ['system', 'module_stop', module.name],
          });
        }
        
        set((state) => ({
          modules: state.modules.filter(m => m.id !== moduleId),
        }));
      },
      
      getModule: (moduleId) => {
        return get().modules.find(m => m.id === moduleId);
      },
      
      addEntry: (entry) => {
        const newEntry: TelemetryEntry = {
          ...entry,
          id: get().nextId,
          timestamp: Date.now(),
        };
        
        set((state) => ({
          entries: [...state.entries, newEntry],
          nextId: state.nextId + 1,
        }));
        
        return newEntry;
      },
      
      addEventEntry: (moduleId, event, details = {}) => {
        const module = get().getModule(moduleId);
        get().addEntry({
          type: 'event',
          moduleId,
          moduleName: module?.name || moduleId,
          data: { event, details },
          tags: ['event', event],
        });
      },
      
      clearEntries: () => set({ entries: [], nextId: 1 }),
      
      getEntriesByModule: (moduleId) => {
        return get().entries.filter(e => e.moduleId === moduleId);
      },
      
      getEntriesByTag: (tag) => {
        return get().entries.filter(e => e.tags.includes(tag));
      },
      
      getEntriesByType: (type) => {
        return get().entries.filter(e => e.type === type);
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
        entries: state.entries,
        modules: state.modules,
        nextId: state.nextId,
      }),
    }
  )
);