import { LapHistoryPlugin } from '../modules/Stopwatch/plugins/LapHistoryPlugin';
import { SoundEffectPlugin } from '../modules/Stopwatch/plugins/SoundEffectPlugin';
import { NoiseGatePlugin } from '../modules/Microphone/plugins/NoiseGatePlugin';
import { RecorderPlugin } from '../modules/Microphone/plugins/recorder/RecorderPlugin';
import { setPluginRegistry } from '../store/plugins.store';
// src/plugins/index.ts

import { TuneMonitorPlugin } from '../modules/Microphone/plugins/TuneMonitorPlugin'; // ✅ Добавляем
import { IPlugin } from '../types/plugins';

// Список всех оригинальных плагинов
export const ALL_PLUGINS: IPlugin[] = [
  LapHistoryPlugin,
  SoundEffectPlugin,
  RecorderPlugin,
  NoiseGatePlugin,
  TuneMonitorPlugin, 
];

// Сохраняем оригинальные плагины в глобальный реестр
setPluginRegistry(ALL_PLUGINS);

// Логируем для отладки
ALL_PLUGINS.forEach((plugin: IPlugin) => {
  console.log(`📋 Plugin registered: ${plugin.id} (${plugin.moduleId})`);
});

// Функция для инициализации
export const registerAllPlugins = () => {
  console.log('✅ Plugin registry ready, plugins available:', ALL_PLUGINS.length);
};

export {
  LapHistoryPlugin,
  SoundEffectPlugin,
  NoiseGatePlugin,
  RecorderPlugin,
  TuneMonitorPlugin,
};