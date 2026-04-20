
import { RecorderPlugin } from '../modules/Microphone/plugins/recorder/RecorderPlugin';
import { setPluginRegistry } from '../store/plugins.store';
import { TuneMonitorPlugin } from '../modules/Microphone/plugins/TuneMonitorPlugin'; // ✅ Добавляем
import { DetectorFFTPlugin } from '../modules/Microphone/plugins/fft/DetectorFFTPlugin';
import { TrendsFFTDetectorPlugin } from '../modules/Microphone/plugins/trendsFFT/TrendsFFTDetectorPlugin';

import { IPlugin } from '../types/plugins';

import { SoundQualityAnalyzerPlugin } from '../modules/Microphone/plugins/quality/SoundQualityAnalyzerPlugin';

// Список всех оригинальных плагинов
export const ALL_PLUGINS: IPlugin[] = [
  //LapHistoryPlugin,
  //SoundEffectPlugin,
  RecorderPlugin,
  DetectorFFTPlugin,
  TuneMonitorPlugin, 
  TrendsFFTDetectorPlugin,
  SoundQualityAnalyzerPlugin
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
  //LapHistoryPlugin,
  //SoundEffectPlugin,
  DetectorFFTPlugin,
  RecorderPlugin,
  TuneMonitorPlugin,
  TrendsFFTDetectorPlugin
};