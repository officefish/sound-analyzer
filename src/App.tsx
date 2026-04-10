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
      {/* Sidebar - фиксированная ширина, независимая прокрутка */}
      <Sidebar />
      
      {/* Основная область - занимает всё остальное пространство */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header - фиксированная высота */}
        <Header />
        
        {/* Main - занимает всё доступное пространство с прокруткой */}
        <main className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className="max-w-2xl mx-auto h-full flex flex-col">
            {/* Контейнер модуля - фиксированная структура, не растягивается от содержимого */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-6">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-400">Загрузка...</div>
                  </div>
                }>
                  <CurrentComponent />
                </Suspense>
              </div>
            </div>
            
            {/* Footer - фиксированная высота */}
            <div className="flex-shrink-0 mt-4">
              <Footer />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;