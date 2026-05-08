import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Типы приложений
import { MODULES, ModuleType } from '../types/modules';

const ALL_MODULE_IDS = MODULES.map((module) => module.id);

// Интерфейс состояния
interface AppState {
  currentApp: ModuleType;
  setCurrentApp: (app: ModuleType) => void;
  activeModules: ModuleType[];
  toggleModuleActive: (module: ModuleType) => void;
  isModuleActive: (module: ModuleType) => boolean;
  
  // Настройки (будут сохраняться)
  settings: {
    theme: 'dark' | 'light';
    notificationsEnabled: boolean;
  };
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  
  // Счётчик переходов для статистики
  //navigationCount: {
  //  journal: number;
  //  microphone: number;
  //  library: number;
  //};
  //incrementNavigationCount: (app: ModuleType) => void;
}

// Создаём store с persist (сохранение в localStorage)
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Текущее приложение
      currentApp: 'microphone',
      activeModules: ALL_MODULE_IDS,
      setCurrentApp: (app) => 
        set((state) => {
          if (!state.activeModules.includes(app)) {
            return state;
          }

          // Увеличиваем счётчик при смене приложения
          //const newCount = { ...state.navigationCount };
          //newCount[app] = (newCount[app] || 0) + 1;
          
          return {
            currentApp: app,
            //navigationCount: newCount,
          };
        }),
      toggleModuleActive: (module) =>
        set((state) => {
          const isActive = state.activeModules.includes(module);

          // Минимум один модуль должен оставаться активным
          if (isActive && state.activeModules.length === 1) {
            return state;
          }

          const nextActiveModules = isActive
            ? state.activeModules.filter((moduleId) => moduleId !== module)
            : [...state.activeModules, module];

          const nextCurrentApp = nextActiveModules.includes(state.currentApp)
            ? state.currentApp
            : nextActiveModules[0];

          return {
            activeModules: nextActiveModules,
            currentApp: nextCurrentApp,
          };
        }),
      isModuleActive: (module) => get().activeModules.includes(module),
      
      // Настройки
      settings: {
        theme: 'dark',
        notificationsEnabled: true,
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      
      // Статистика навигации
      // navigationCount: {
      //   journal: 0,
      //   microphone: 0,
      //   library: 0,
      // },
      // incrementNavigationCount: (app) =>
      //   set((state) => ({
      //     navigationCount: {
      //       ...state.navigationCount,
      //       [app]: (state.navigationCount[app] || 0) + 1,
      //     },
      //   })),
    }),
    {
      name: 'stopwatch-app-storage', // ключ в localStorage
      partialize: (state) => ({
        currentApp: state.currentApp,
        activeModules: state.activeModules,
        settings: state.settings,
        //navigationCount: state.navigationCount,
      }), // сохраняем только нужные поля
    }
  )
);
