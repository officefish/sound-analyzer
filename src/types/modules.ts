import { IPluginContext } from './plugins';

export type ModuleType = 'stopwatch' | 'microphone' // | 'library' | 'proccessing';

export interface IModule {
  id: ModuleType;
  name: string;
  icon: string;
  description: string;
  component: React.ComponentType<{ onContextReady?: (context: IPluginContext) => void }>;
}

export const MODULES: IModule[] = [
  {
    id: 'stopwatch',
    name: 'Секундомер',
    icon: '⏱',
    description: 'Измерение времени с кругами',
    component: () => null,
  },
  {
    id: 'microphone',
    name: 'Microphone',
    icon: '🎤',
    description: 'Современный монитор микрофона',
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