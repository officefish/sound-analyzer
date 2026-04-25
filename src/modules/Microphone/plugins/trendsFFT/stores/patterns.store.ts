// src/store/patternTemplates.store.ts - исправленная версия

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  PatternTemplate, 
  UserPatternTemplate, 
  SystemPatternTemplate,
  SOUND_STATES, 
  isUserPattern,
  isSystemPattern
} from '../types';

interface PatternTemplatesState {
  templates: PatternTemplate[];
  initialized: boolean;
  
  // Actions
  initializeTemplates: () => void;
  addTemplate: (template: Omit<UserPatternTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, updates: Partial<Omit<UserPatternTemplate, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteTemplate: (id: string) => void;
  toggleTemplate: (id: string, enabled: boolean) => void;
  toggleAllTemplates: (enabled: boolean) => void;
  getEnabledTemplates: () => PatternTemplate[];
  getTemplatesForDetector: () => Record<string, any>;
  resetToSystemTemplates: () => void;
  exportTemplates: () => string;
  importTemplates: (jsonData: string) => void;
  getTemplateStats: () => { total: number; enabled: number; system: number; user: number; enabledSystem: number; enabledUser: number };
}

// Конвертируем SOUND_STATES в системные шаблоны с уникальными ID
const convertSoundStateToSystemTemplate = (key: string, value: any, index: number): SystemPatternTemplate => ({
  id: `system_${key}_${index}`,
  key,
  name: value.name,
  icon: value.icon,
  color: value.color,
  description: value.description,
  isSystem: true,
  isEnabled: true,
  thresholds: value.thresholds,
  temporalPatterns: value.temporalPatterns,
});

const systemTemplatesList: SystemPatternTemplate[] = Object.entries(SOUND_STATES).map(([key, value], index) => 
  convertSoundStateToSystemTemplate(key, value, index)
);

export const usePatternTemplatesStore = create<PatternTemplatesState>()(
  persist(
    (set, get) => ({
      templates: [],
      initialized: false,

      initializeTemplates: () => {
        const { templates, initialized } = get();
        
        if (initialized) return;
        
        if (templates.length === 0) {
          set({ 
            templates: systemTemplatesList,
            initialized: true 
          });
          console.log('[PatternTemplatesStore] Initialized with system templates:', systemTemplatesList.length);
        } else {
          // Проверяем наличие всех системных шаблонов
          const existingSystemKeys = new Set(templates.filter(t => t.isSystem).map(t => t.key));
          const missingSystemTemplates = systemTemplatesList.filter(t => !existingSystemKeys.has(t.key));
          
          if (missingSystemTemplates.length > 0) {
            console.log('[PatternTemplatesStore] Adding missing system templates:', missingSystemTemplates.length);
            set((state) => ({ 
              templates: [...state.templates, ...missingSystemTemplates],
              initialized: true 
            }));
          } else {
            set({ initialized: true });
          }
        }
      },

      addTemplate: (template) => {
        const newTemplate: UserPatternTemplate = {
          ...template,
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          templates: [...state.templates, newTemplate],
        }));
        
        console.log('[PatternTemplatesStore] Added template:', newTemplate.name);
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((template) => {
            if (template.id === id && isUserPattern(template)) {
              // Обновляем только пользовательские шаблоны
              return {
                ...template,
                ...updates,
                updatedAt: Date.now(),
              } as UserPatternTemplate;
            }
            return template;
          }),
        }));
        
        console.log('[PatternTemplatesStore] Updated template:', id);
      },

      deleteTemplate: (id) => {
        set((state) => {
          const templateToDelete = state.templates.find(t => t.id === id);
          
          if (!templateToDelete) return state;
          
          // Не даем удалить системный шаблон
          if (isSystemPattern(templateToDelete)) {
            console.warn('[PatternTemplatesStore] Cannot delete system template');
            return state;
          }
          
          const newTemplates = state.templates.filter((t) => t.id !== id);
          
          // Если после удаления не осталось ни одного шаблона - восстанавливаем системные
          if (newTemplates.length === 0) {
            console.log('[PatternTemplatesStore] No templates left, restoring system templates');
            return { templates: systemTemplatesList };
          }
          
          console.log('[PatternTemplatesStore] Deleted template:', templateToDelete.name);
          return { templates: newTemplates };
        });
      },

      toggleTemplate: (id, enabled) => {
        set((state) => ({
          templates: state.templates.map((template) =>
            template.id === id ? { ...template, isEnabled: enabled } : template
          ),
        }));
        
        const template = get().templates.find(t => t.id === id);
        console.log('[PatternTemplatesStore] Toggled template:', template?.name, enabled ? 'ON' : 'OFF');
      },

      toggleAllTemplates: (enabled) => {
        set((state) => ({
          templates: state.templates.map((template) => ({ ...template, isEnabled: enabled })),
        }));
        
        console.log('[PatternTemplatesStore] Toggled all templates:', enabled ? 'ON' : 'OFF');
      },

      getEnabledTemplates: () => {
        return get().templates.filter((t) => t.isEnabled);
      },

      getTemplatesForDetector: () => {
        const enabledTemplates = get().templates.filter((t) => t.isEnabled);
        
        const result: Record<string, any> = {};
        enabledTemplates.forEach((template) => {
          result[template.key] = {
            key: template.key,
            name: template.name,
            icon: template.icon,
            color: template.color,
            description: template.description,
            thresholds: template.thresholds,
            temporalPatterns: template.temporalPatterns,
          };
        });
        
        return result;
      },

      resetToSystemTemplates: () => {
        if (confirm('Сбросить все шаблоны до системных? Все пользовательские шаблоны будут удалены.')) {
          set({ templates: systemTemplatesList });
          console.log('[PatternTemplatesStore] Reset to system templates');
        }
      },

      exportTemplates: () => {
        const { templates } = get();
        const exportData = {
          version: '1.0',
          exportDate: Date.now(),
          templates: templates.map(t => ({
            key: t.key,
            name: t.name,
            icon: t.icon,
            color: t.color,
            description: t.description,
            isSystem: t.isSystem,
            thresholds: t.thresholds,
            temporalPatterns: t.temporalPatterns,
            source: isUserPattern(t) ? t.source : undefined,
            confidence: isUserPattern(t) ? t.confidence : undefined,
          })),
        };
        return JSON.stringify(exportData, null, 2);
      },

      importTemplates: (jsonData: string) => {
        try {
          const data = JSON.parse(jsonData);
          if (data.templates && Array.isArray(data.templates)) {
            const importedTemplates: UserPatternTemplate[] = data.templates
              .filter((template: any) => !template.isSystem)
              .map((template: any) => ({
                key: template.key,
                name: template.name,
                icon: template.icon,
                color: template.color,
                description: template.description,
                isSystem: false,
                isEnabled: true,
                source: template.source || 'manual',
                confidence: template.confidence,
                thresholds: template.thresholds,
                temporalPatterns: template.temporalPatterns,
                id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }));
            
            if (importedTemplates.length > 0) {
              set((state) => ({
                templates: [...state.templates, ...importedTemplates],
              }));
              
              console.log('[PatternTemplatesStore] Imported templates:', importedTemplates.length);
              alert(`Импортировано ${importedTemplates.length} шаблонов`);
            } else {
              alert('Нет пользовательских шаблонов для импорта');
            }
          }
        } catch (error) {
          console.error('[PatternTemplatesStore] Failed to import templates:', error);
          alert('Ошибка импорта шаблонов');
        }
      },

      getTemplateStats: () => {
        const { templates } = get();
        const systemTemplates = templates.filter(t => isSystemPattern(t));
        const userTemplates = templates.filter(t => isUserPattern(t));
        const enabledTemplates = templates.filter(t => t.isEnabled);
        
        return {
          total: templates.length,
          enabled: enabledTemplates.length,
          system: systemTemplates.length,
          user: userTemplates.length,
          enabledSystem: systemTemplates.filter(t => t.isEnabled).length,
          enabledUser: userTemplates.filter(t => t.isEnabled).length,
        };
      },
    }),
    {
      name: 'pattern-templates-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        templates: state.templates,
        initialized: state.initialized,
      }),
      onRehydrateStorage: () => {
        console.log('[PatternTemplatesStore] Hydrating from localStorage');
        return (state, error) => {
          if (error) {
            console.error('[PatternTemplatesStore] Hydration error:', error);
          } else if (state) {
            console.log('[PatternTemplatesStore] Hydrated successfully, templates:', state.templates.length);
          }
        };
      },
    }
  )
);