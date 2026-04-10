import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { useAppStore } from './store/app.store';
import { MODULES, ModuleType } from './types/modules';
import Sidebar from './components/Navigation/Sidebar';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import { setGlobalContextProvider, usePluginsStore } from './store/plugins.store';
import { IPluginContext } from './types/plugins';

// Ленивая загрузка модулей
const Stopwatch = lazy(() => import('./modules/Stopwatch'));
const Microphone = lazy(() => import('./modules/Microphone'));

// Маппинг компонентов
const moduleComponents: Record<ModuleType, React.ComponentType<{ onContextReady?: (context: IPluginContext) => void }>> = {
  stopwatch: Stopwatch,
  microphone: Microphone,
};

// Обновляем MODULES с реальными компонентами
MODULES[0].component = Stopwatch;
MODULES[1].component = Microphone;

// Создаём ref для хранения текущих контекстов модулей
const moduleContexts = new Map<string, IPluginContext>();

// Функция для получения контекста по ID плагина
const getContextForPlugin = (pluginId: string): IPluginContext | undefined => {
  // Определяем, к какому модулю относится плагин
  if (pluginId.includes('stopwatch')) {
    return moduleContexts.get('stopwatch');
  }
  if (pluginId.includes('microphone')) {
    return moduleContexts.get('microphone');
  }
  return undefined;
};

// Устанавливаем глобальный провайдер контекста
setGlobalContextProvider(getContextForPlugin);

const App: React.FC = () => {
  const { currentApp } = useAppStore();
  const { restoreActivePluginContexts } = usePluginsStore();
  const isRestored = useRef(false);
  
  const CurrentComponent = moduleComponents[currentApp];
  
  // Восстанавливаем контексты после монтирования
  useEffect(() => {
    if (!isRestored.current) {
      isRestored.current = true;
      restoreActivePluginContexts();
    }
  }, [restoreActivePluginContexts]);
  
  // Функция для регистрации контекста модуля
  const registerModuleContext = (moduleId: string, context: IPluginContext) => {
    moduleContexts.set(moduleId, context);
    console.log(`📦 Module context registered: ${moduleId}`);
  };
  
  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-6 px-6">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
              <Suspense fallback={
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400">Загрузка...</div>
                </div>
              }>
                <CurrentComponent 
                  onContextReady={(context: IPluginContext) => {
                    registerModuleContext(currentApp, context);
                  }} 
                />
              </Suspense>
            </div>
            
            <div className="mt-6">
              <Footer />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;