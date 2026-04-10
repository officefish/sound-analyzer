import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Типы приложений
export type AppType = 'stopwatch' | 'microphone';

// Интерфейс состояния
interface AppState {
  currentApp: AppType;
  setCurrentApp: (app: AppType) => void;
  
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
  };
  incrementNavigationCount: (app: AppType) => void;
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
