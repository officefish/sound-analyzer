// src/store/telemetryStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TelemetryEntry {
  id: number;
  timestamp: number;
  type: 'detection' | 'spectrum' | 'metric' | 'event' | 'module_start' | 'module_stop';
  moduleId: string | null;
  moduleName: string | null;
  data: Record<string, any>;
  metrics?: Record<string, any>;
  rawValues?: any;
  tags: string[];
}

export interface ModuleInfo {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  metadata: Record<string, any>;
  isActive: boolean;
  entryCount: number;
  lastEntry?: number;
}

interface TelemetryState {
  // Данные
  entries: TelemetryEntry[];
  activeModules: Map<string, ModuleInfo>;
  entryCounter: number;
  moduleCounter: number;
  startTime: number;
  
  // Настройки
  maxEntries: number;
  
  // Actions
  registerModule: (moduleName: string, metadata?: Record<string, any>) => string;
  unregisterModule: (moduleId: string) => boolean;
  addEntry: (entry: Partial<TelemetryEntry> & { type: TelemetryEntry['type'] }) => number;
  addDetectionEntry: (
    moduleId: string,
    detectionResult: { isDrone: boolean; confidence: number; bestMatch?: string | null; distance?: number },
    features?: { centroid?: number; flux?: number; lowEnergy?: number; stability?: number }
  ) => number;
  addSpectrumEntry: (
    moduleId: string,
    spectrumSummary: {
      peaks?: number[];
      dominant?: number | null;
      centroid?: number | null;
      bandwidth?: number | null;
      lowEnergyPercent?: number | null;
      highEnergyPercent?: number | null;
      rawBins?: number[];
    }
  ) => number;
  addMetricEntry: (moduleId: string, metricName: string, value: number, unit?: string) => number;
  addEventEntry: (moduleId: string, eventName: string, details?: Record<string, any>) => number;
  
  // Геттеры
  getEntriesByModule: (moduleId: string) => TelemetryEntry[];
  getEntriesByType: (type: TelemetryEntry['type']) => TelemetryEntry[];
  getEntriesByTag: (tag: string) => TelemetryEntry[];
  getRecentEntries: (seconds: number) => TelemetryEntry[];
  getDetectionAlerts: (sinceTimestamp?: number) => TelemetryEntry[];
  getModuleStats: (moduleId: string) => { moduleInfo?: ModuleInfo; totalEntries: number; detections: number; droneAlerts: number };
  getGlobalStats: () => {
    totalEntries: number;
    activeModulesCount: number;
    startTime: number;
    uptime: number;
    droneAlerts: number;
    detectionRate: number;
    modules: { name: string; entries: number }[];
  };
  getActiveModules: () => ModuleInfo[];
  
  // Управление
  clear: () => number;
  setMaxEntries: (max: number) => void;
}

export const useTelemetryStore = create<TelemetryState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      entries: [],
      activeModules: new Map(),
      entryCounter: 0,
      moduleCounter: 0,
      startTime: Date.now(),
      maxEntries: 10000,
      
      // ========================================
      // РЕГИСТРАЦИЯ МОДУЛЯ
      // ========================================
      
      registerModule: (moduleName, metadata = {}) => {
        const state = get();
        const moduleId = `mod_${state.moduleCounter}_${Date.now()}`;
        const moduleInfo: ModuleInfo = {
          id: moduleId,
          name: moduleName,
          startTime: Date.now(),
          metadata,
          isActive: true,
          entryCount: 0,
        };
        
        const newActiveModules = new Map(state.activeModules);
        newActiveModules.set(moduleId, moduleInfo);
        
        set({
          activeModules: newActiveModules,
          moduleCounter: state.moduleCounter + 1,
        });
        
        // Добавляем событие запуска
        get().addEntry({
          type: 'module_start',
          moduleId,
          moduleName,
          data: { metadata },
          tags: ['system'],
        });
        
        console.log(`[TelemetryStore] Module "${moduleName}" registered (ID: ${moduleId})`);
        return moduleId;
      },
      
      // ========================================
      // ОСТАНОВКА МОДУЛЯ
      // ========================================
      
      unregisterModule: (moduleId) => {
        const state = get();
        const module = state.activeModules.get(moduleId);
        if (!module) {
          console.warn(`[TelemetryStore] Module ${moduleId} not found`);
          return false;
        }
        
        module.isActive = false;
        module.endTime = Date.now();
        
        const newActiveModules = new Map(state.activeModules);
        newActiveModules.delete(moduleId);
        
        set({ activeModules: newActiveModules });
        
        // Добавляем событие остановки
        get().addEntry({
          type: 'module_stop',
          moduleId,
          moduleName: module.name,
          data: {
            duration: module.endTime - module.startTime,
            totalEntries: module.entryCount,
          },
          tags: ['system'],
        });
        
        console.log(`[TelemetryStore] Module "${module.name}" stopped`);
        return true;
      },
      
      // ========================================
      // ДОБАВЛЕНИЕ ЗАПИСИ
      // ========================================
      
      addEntry: (entry) => {
        const state = get();
        const standardEntry: TelemetryEntry = {
          id: state.entryCounter,
          timestamp: entry.timestamp || Date.now(),
          type: entry.type,
          moduleId: entry.moduleId || null,
          moduleName: entry.moduleName || null,
          data: entry.data || {},
          metrics: entry.metrics,
          rawValues: entry.rawValues,
          tags: entry.tags || [],
        };
        
        // Обновляем счётчик модуля
        if (standardEntry.moduleId && state.activeModules.has(standardEntry.moduleId)) {
          const module = state.activeModules.get(standardEntry.moduleId)!;
          module.entryCount++;
          module.lastEntry = standardEntry.timestamp;
        }
        
        const newEntries = [...state.entries, standardEntry];
        
        // Ограничиваем размер
        let trimmedEntries = newEntries;
        if (newEntries.length > state.maxEntries) {
          trimmedEntries = newEntries.slice(-state.maxEntries);
        }
        
        set({
          entries: trimmedEntries,
          entryCounter: state.entryCounter + 1,
        });
        
        return standardEntry.id;
      },
      
      // ========================================
      // УДОБНЫЕ МЕТОДЫ ДЛЯ РАЗНЫХ ТИПОВ ДАННЫХ
      // ========================================
      
      addDetectionEntry: (moduleId, detectionResult, features) => {
        return get().addEntry({
          type: 'detection',
          moduleId,
          data: {
            isDrone: detectionResult.isDrone,
            confidence: detectionResult.confidence,
            bestMatch: detectionResult.bestMatch || null,
            distance: detectionResult.distance,
          },
          metrics: features,
          tags: detectionResult.isDrone ? ['drone', 'alert'] : ['normal'],
        });
      },
      
      addSpectrumEntry: (moduleId, spectrumSummary) => {
        return get().addEntry({
          type: 'spectrum',
          moduleId,
          data: {
            peakFrequencies: spectrumSummary.peaks || [],
            dominantFrequency: spectrumSummary.dominant || null,
            spectralCentroid: spectrumSummary.centroid || null,
            bandwidth: spectrumSummary.bandwidth || null,
          },
          metrics: {
            lowEnergyPercent: spectrumSummary.lowEnergyPercent || null,
            highEnergyPercent: spectrumSummary.highEnergyPercent || null,
          },
          rawValues: spectrumSummary.rawBins ? spectrumSummary.rawBins.slice(0, 20) : null,
          tags: ['spectrum'],
        });
      },
      
      addMetricEntry: (moduleId, metricName, value, unit) => {
        return get().addEntry({
          type: 'metric',
          moduleId,
          data: { metric: metricName, value, unit: unit || null },
          tags: ['metric', metricName],
        });
      },
      
      addEventEntry: (moduleId, eventName, details = {}) => {
        return get().addEntry({
          type: 'event',
          moduleId,
          data: { event: eventName, details },
          tags: ['event', eventName],
        });
      },
      
      // ========================================
      // ГЕТТЕРЫ
      // ========================================
      
      getEntriesByModule: (moduleId) => {
        return get().entries.filter(e => e.moduleId === moduleId);
      },
      
      getEntriesByType: (type) => {
        return get().entries.filter(e => e.type === type);
      },
      
      getEntriesByTag: (tag) => {
        return get().entries.filter(e => e.tags.includes(tag));
      },
      
      getRecentEntries: (seconds) => {
        const cutoff = Date.now() - seconds * 1000;
        return get().entries.filter(e => e.timestamp >= cutoff);
      },
      
      getDetectionAlerts: (sinceTimestamp = 0) => {
        return get().entries.filter(
          e => e.type === 'detection' && e.data.isDrone === true && e.timestamp >= sinceTimestamp
        );
      },
      
      getModuleStats: (moduleId) => {
        const moduleInfo = get().activeModules.get(moduleId);
        const moduleEntries = get().getEntriesByModule(moduleId);
        return {
          moduleInfo,
          totalEntries: moduleEntries.length,
          detections: moduleEntries.filter(e => e.type === 'detection').length,
          droneAlerts: moduleEntries.filter(e => e.type === 'detection' && e.data.isDrone).length,
        };
      },
      
      getGlobalStats: () => {
        const state = get();
        const droneAlerts = state.entries.filter(e => e.type === 'detection' && e.data.isDrone).length;
        const detections = state.entries.filter(e => e.type === 'detection').length;
        return {
          totalEntries: state.entries.length,
          activeModulesCount: state.activeModules.size,
          startTime: state.startTime,
          uptime: Date.now() - state.startTime,
          droneAlerts,
          detectionRate: detections > 0 ? (droneAlerts / detections) * 100 : 0,
          modules: Array.from(state.activeModules.values()).map(m => ({ name: m.name, entries: m.entryCount })),
        };
      },
      
      getActiveModules: () => {
        return Array.from(get().activeModules.values());
      },
      
      // ========================================
      // УПРАВЛЕНИЕ
      // ========================================
      
      clear: () => {
        const count = get().entries.length;
        set({
          entries: [],
          entryCounter: 0,
        });
        console.log(`[TelemetryStore] Cleared ${count} entries`);
        return count;
      },
      
      setMaxEntries: (max) => {
        const state = get();
        set({ maxEntries: max });
        if (state.entries.length > max) {
          set({ entries: state.entries.slice(-max) });
        }
      },
    }),
    {
      name: 'telemetry-storage',
      partialize: (state) => ({
        entries: state.entries,
        entryCounter: state.entryCounter,
        moduleCounter: state.moduleCounter,
        startTime: state.startTime,
        maxEntries: state.maxEntries,
        // activeModules не сохраняем в localStorage (восстанавливается при регистрации)
      }),
    }
  )
);