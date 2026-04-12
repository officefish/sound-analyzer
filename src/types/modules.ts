import { IPluginContext } from './plugins';

export type ModuleType = 'stopwatch' | 'microphone' | 'microphone2';

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
    name: 'Микрофон',
    icon: '🎤',
    description: 'Анализ звука с микрофона',
    component: () => null,
  },
  {
    id: 'microphone2',
    name: 'MicMonitor',
    icon: '🎧',
    description: 'Современный монитор микрофона',
    component: () => null,
  },
];