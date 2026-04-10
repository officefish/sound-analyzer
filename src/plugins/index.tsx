import { LapHistoryPlugin } from '../modules/Stopwatch/plugins/LapHistoryPlugin';
import { SoundEffectPlugin } from '../modules/Stopwatch/plugins/SoundEffectPlugin';
import { NoiseGatePlugin } from '../modules/Microphone/plugins/NoiseGatePlugin';
import { RecorderPlugin } from '../modules/Microphone/plugins/RecorderPlugin';

// Список всех плагинов для регистрации
export const ALL_PLUGINS = [
  LapHistoryPlugin,
  SoundEffectPlugin,
  NoiseGatePlugin,
  RecorderPlugin,
];

// Функция для регистрации всех плагинов в store
export const registerAllPlugins = (store: any) => {
  ALL_PLUGINS.forEach(plugin => {
    // Проверяем, не зарегистрирован ли уже плагин
    const existing = store.getState().plugins.find((p: any) => p.id === plugin.id);
    if (!existing) {
      store.getState().registerPlugin(plugin);
    } else {
      // Восстанавливаем enabled и settings из сохранённого состояния
      if (existing.enabled !== undefined) {
        plugin.enabled = existing.enabled;
      }
      if (existing.settings) {
        plugin.settings = { ...plugin.settings, ...existing.settings };
      }
    }
  });
};

// Экспорт отдельных плагинов для lazy registration
export {
  LapHistoryPlugin,
  SoundEffectPlugin,
  NoiseGatePlugin,
  RecorderPlugin,
};