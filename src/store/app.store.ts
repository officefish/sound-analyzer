import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Типы приложений
import { ModuleType } from '../types/modules';

// Интерфейс состояния
interface AppState {
  currentApp: ModuleType;
  setCurrentApp: (app: ModuleType) => void;
  
  // Настройки (будут сохраняться)
  settings: {
    theme: 'dark' | 'light';
    notificationsEnabled: boolean;
  };
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  
  // Счётчик переходов для статистики
  navigationCount: {
    stopwatch: number;
    microphone: number;
    library: number;
  };
  incrementNavigationCount: (app: ModuleType) => void;
}

// Создаём store с persist (сохранение в localStorage)
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Текущее приложение
      currentApp: 'stopwatch',
      setCurrentApp: (app) => 
        set((state) => {
          // Увеличиваем счётчик при смене приложения
          const newCount = { ...state.navigationCount };
          newCount[app] = (newCount[app] || 0) + 1;
          
          return {
            currentApp: app,
            navigationCount: newCount,
          };
        }),
      
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
      navigationCount: {
        stopwatch: 0,
        microphone: 0,
        library: 0,
      },
      incrementNavigationCount: (app) =>
        set((state) => ({
          navigationCount: {
            ...state.navigationCount,
            [app]: (state.navigationCount[app] || 0) + 1,
          },
        })),
    }),
    {
      name: 'stopwatch-app-storage', // ключ в localStorage
      partialize: (state) => ({
        settings: state.settings,
        navigationCount: state.navigationCount,
      }), // сохраняем только нужные поля
    }
  )
);
