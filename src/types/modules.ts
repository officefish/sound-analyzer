export type ModuleType = 'stopwatch' | 'microphone';

// Интерфейс модуля
export interface IModule {
  id: ModuleType;
  name: string;
  icon: string;
  description: string;
  component: React.ComponentType;
}

// Список доступных модулей (будет заполнен позже, чтобы избежать циклических зависимостей)
export const MODULES: IModule[] = [
  {
    id: 'stopwatch',
    name: 'Секундомер',
    icon: '⏱',
    description: 'Измерение времени с кругами',
    component: () => null, // Заглушка, реальный компонент подставится в App.tsx
  },
  {
    id: 'microphone',
    name: 'Микрофон',
    icon: '🎤',
    description: 'Анализ звука с микрофона',
    component: () => null, // Заглушка
  },
];
