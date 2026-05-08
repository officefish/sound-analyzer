import React, { lazy, Suspense } from 'react';
import { useAppStore } from './store/app.store';
import { MODULES, ModuleType } from './types/modules';
import Sidebar from './components/Navigation/Sidebar';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';

// Ленивая загрузка модулей
const Journal = lazy(() => import('./modules/Journal'));
const Microphone = lazy(() => import('./modules/Microphone'));
const Library = lazy(() => import('./modules/Library'));
const Player = lazy(() => import('./modules/Player'));
const AlternateLibrary = lazy(() => import('./modules/AlternateLibrary'));


// Маппинг компонентов
const moduleComponents: Record<ModuleType, React.ComponentType> = {
  microphone: Microphone,
  library: Library,
  player: Player,
  journal: Journal,
  altLibrary: AlternateLibrary
};

// Обновляем MODULES с реальными компонентами
MODULES[0].component = Microphone;
MODULES[1].component = Library;
MODULES[2].component = Player;
MODULES[3].component = Journal;
MODULES[4].component = AlternateLibrary;

const App: React.FC = () => {
  const { currentApp, activeModules, setCurrentApp } = useAppStore();

  React.useEffect(() => {
    if (activeModules.includes(currentApp)) {
      return;
    }

    if (activeModules.length > 0) {
      setCurrentApp(activeModules[0]);
    }
  }, [activeModules, currentApp, setCurrentApp]);

  const CurrentComponent = activeModules.includes(currentApp)
    ? moduleComponents[currentApp]
    : moduleComponents[activeModules[0] ?? 'microphone'];
  
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
