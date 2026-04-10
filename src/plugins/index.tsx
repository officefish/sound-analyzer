import { LapHistoryPlugin } from '../modules/Stopwatch/plugins/LapHistoryPlugin';
import { SoundEffectPlugin } from '../modules/Stopwatch/plugins/SoundEffectPlugin';
import { NoiseGatePlugin } from '../modules/Microphone/plugins/NoiseGatePlugin';
import { RecorderPlugin } from '../modules/Microphone/plugins/RecorderPlugin';
import { setPluginRegistry } from '../store/plugins.store';
// src/plugins/index.ts

import { IPlugin } from '../types/plugins';

// Список всех оригинальных плагинов
export const ALL_PLUGINS: IPlugin[] = [
  LapHistoryPlugin,
  SoundEffectPlugin,
  NoiseGatePlugin,
  RecorderPlugin,
];

// Сохраняем оригинальные плагины в глобальный реестр
setPluginRegistry(ALL_PLUGINS);

// Логируем для отладки
ALL_PLUGINS.forEach((plugin: IPlugin) => {
  console.log(`📋 Plugin registered: ${plugin.id} (${plugin.moduleId})`);
});

// Функция для инициализации (ничего не делает, просто для совместимости)
export const registerAllPlugins = () => {
  console.log('✅ Plugin registry ready, plugins available:', ALL_PLUGINS.length);
};

export {
  LapHistoryPlugin,
  SoundEffectPlugin,
  NoiseGatePlugin,
  RecorderPlugin,
};