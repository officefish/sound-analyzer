import React, { lazy, Suspense } from 'react';
import { useAppStore } from './store/app.store';
import { MODULES, ModuleType } from './types/modules';
import Sidebar from './components/Navigation/Sidebar';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
//import Library from './modules/Library';

// Ленивая загрузка модулей
//const Stopwatch = lazy(() => import('./modules/Stopwatch'));
const Journal = lazy(() => import('./modules/Journal'));
const Microphone = lazy(() => import('./modules/Microphone'));
const Library = lazy(() => import('./modules/Library'));

// Маппинг компонентов
const moduleComponents: Record<ModuleType, React.ComponentType> = {
  microphone: Microphone,
  library: Library,
  journal: Journal,
};

// Обновляем MODULES с реальными компонентами
//MODULES[0].component = Stopwatch;
MODULES[0].component = Microphone;
MODULES[1].component = Library;

const App: React.FC = () => {
  const { currentApp } = useAppStore();
  const CurrentComponent = moduleComponents[currentApp];
  
  return (
    <div data-theme="dark" className="min-h-screen bg-base-300">
      <div className="h-screen flex overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-base-content/50">Загрузка...</div>
              </div>
            }>
              <CurrentComponent />
            </Suspense>
            
            <div className="mt-6 px-6 pb-6">
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
