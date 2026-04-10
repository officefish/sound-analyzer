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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-2xl mx-auto h-full flex flex-col">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/10 flex-1">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-400">Загрузка...</div>
                </div>
              }>
                <CurrentComponent />
              </Suspense>
            </div>
            
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;