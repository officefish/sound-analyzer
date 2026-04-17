import { IPluginContext } from './plugins';

export type ModuleType = 'microphone' | 'library'  | 'journal' // | 'proccessing';

export interface IModule {
  id: ModuleType;
  name: string;
  icon: string;
  description: string;
  component: React.ComponentType<{ onContextReady?: (context: IPluginContext) => void }>;
}

export const MODULES: IModule[] = [
  {
    id: 'microphone',
    name: 'Microphone',
    icon: '🎤',
    description: 'Современный монитор микрофона',
    component: () => null,
  },
  {
    id: 'library',
    name: 'Библиотека',
    icon: '📚',
    description: 'Управление аудиофайлами и коллекциями',
    component: () => null,
  },
  {
    id: 'journal',
    name: 'Журнал',
    icon: '📋',
    description: 'Журнал со всеми аналитическими операциями',
    component: () => null,
  },
  // {
  //   id: 'proccessing',
  //   name: 'Proccessing',
  //   icon: '🎧',
  //   description: 'Последующая обработка звука с микрофона',
  //   component: () => null,
  // },
  // {
  //   id: 'microphone',
  //   name: 'Микрофон',
  //   icon: '🎤',
  //   description: 'Анализ звука с микрофона',
  //   component: () => null,
  // },
];