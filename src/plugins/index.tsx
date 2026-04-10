import { LapHistoryPlugin } from '../modules/Stopwatch/plugins/LapHistoryPlugin';
import { SoundEffectPlugin } from '../modules/Stopwatch/plugins/SoundEffectPlugin';
import { NoiseGatePlugin } from '../modules/Microphone/plugins/NoiseGatePlugin';
import { RecorderPlugin } from '../modules/Microphone/plugins/RecorderPlugin';
import { setPluginRegistry } from '../store/plugins.store';
// src/plugins/index.ts

import { IPlugin } from '../types/plugins';

// ✅ Явно указываем тип массива
export const ALL_PLUGINS: IPlugin[] = [
  LapHistoryPlugin,
  SoundEffectPlugin,
  NoiseGatePlugin,
  RecorderPlugin,
];

// Сохраняем плагины в глобальный реестр для восстановления
setPluginRegistry(ALL_PLUGINS);

// ✅ Теперь TypeScript знает, что у plugin есть свойства
ALL_PLUGINS.forEach((plugin: IPlugin) => {
  console.log(`📋 Plugin ${plugin.id}: moduleId = "${plugin.moduleId}", type = ${typeof plugin.moduleId}`);
  if (!plugin.moduleId) {
    console.error(`❌ Plugin ${plugin.id} has no moduleId!`);
  }
});

// Функция для регистрации всех плагинов в store
export const registerAllPlugins = (store: any) => {
  const state = store.getState();
  
  console.log('🔌 Registering all plugins...');
  console.log(`📦 Current plugins count: ${state.plugins.length}`);
  
  // Если плагинов нет или их меньше чем должно быть, регистрируем
  if (state.plugins.length < ALL_PLUGINS.length) {
    console.log('  Registering missing plugins...');
    ALL_PLUGINS.forEach((plugin: IPlugin) => {
      const existing = state.plugins.find((p: IPlugin) => p.id === plugin.id);
      if (!existing) {
        console.log(`    ➕ Registering: ${plugin.id}`);
        store.getState().registerPlugin(plugin);
      }
    });
  } else {
    console.log('  All plugins already registered');
  }
  
  // Проверяем результат
  const newState = store.getState();
  console.log('✅ Registration complete!');
  console.log(`📊 Stopwatch plugins: ${newState.getPluginsByModule('stopwatch').map((p: IPlugin) => p.id).join(', ')}`);
  console.log(`📊 Microphone plugins: ${newState.getPluginsByModule('microphone').map((p: IPlugin) => p.id).join(', ')}`);
};

export {
  LapHistoryPlugin,
  SoundEffectPlugin,
  NoiseGatePlugin,
  RecorderPlugin,
};