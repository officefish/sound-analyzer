import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { usePluginsStore } from './store/plugins.store';
import { registerAllPlugins } from './plugins';

// Регистрируем все плагины при старте приложения
const initPlugins = () => {
  const store = usePluginsStore;
  registerAllPlugins(store);
  console.log('✅ All plugins registered');
};

initPlugins();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);