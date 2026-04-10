import React, { lazy, Suspense } from 'react';
import { useAppStore } from './store/app.store';
import { MODULES, ModuleType } from './types/modules';
import Sidebar from './components/Navigation/Sidebar';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';

// Ленивая загрузка модулей
const Stopwatch = lazy(() => import('./modules/Stopwatch'));
const Microphone = lazy(() => import('./modules/Microphone'));

// Маппинг компонентов
const moduleComponents: Record<ModuleType, React.ComponentType> = {
  stopwatch: Stopwatch,
  microphone: Microphone,
};

// Обновляем MODULES с реальными компонентами
MODULES[0].component = Stopwatch;
MODULES[1].component = Microphone;

const App: React.FC = () => {
  const { currentApp } = useAppStore();
  const CurrentComponent = moduleComponents[currentApp];
  
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
                <CurrentComponent />
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