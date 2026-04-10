import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { usePluginsStore } from './store/plugins.store';
import { registerAllPlugins, ALL_PLUGINS } from './plugins';

// Полная очистка при первом запуске после фикса
const cleanStart = localStorage.getItem('plugins-v2') !== 'true';
if (cleanStart) {
  console.log('🧹 Performing clean start - clearing all stored data');
  localStorage.clear();
  localStorage.setItem('plugins-v2', 'true');
}

// Регистрируем все плагины при старте приложения
const initPlugins = async () => {
  const store = usePluginsStore;
  
  console.log('🔍 Initializing plugins...');
  console.log('📦 Current plugins in store before registration:', store.getState().plugins.length);
  
  // Небольшая задержка для реидратации
  await new Promise(resolve => setTimeout(resolve, 100));
  
  registerAllPlugins(store);
  
  console.log('📦 Plugins in store after registration:', store.getState().plugins.length);
  
  // Проверяем результат
  const state = store.getState();
  console.log('📋 Stopwatch plugins:', state.getPluginsByModule('stopwatch').map(p => p.id));
  console.log('📋 Microphone plugins:', state.getPluginsByModule('microphone').map(p => p.id));
  
  // Принудительно активируем плагины, которые были включены
  ALL_PLUGINS.forEach(plugin => {
    if (plugin.enabled) {
      console.log(`🔌 Plugin ${plugin.id} should be active`);
    }
  });
};

initPlugins();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);