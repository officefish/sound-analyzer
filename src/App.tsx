import React, { lazy, Suspense } from 'react';
import { useAppStore } from './store/app.store';
import { MODULES, ModuleType } from './types/modules';
import Sidebar from './components/Navigation/Sidebar';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Library from './modules/Library';

// Типы для Electron
declare global {
  interface Window {
    electronAPI?: {
      getMediaPath: () => Promise<string>;
      saveAudioFile: (data: ArrayBuffer, filename: string, collectionName?: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      readFile: (path: string) => Promise<ArrayBuffer>;
      deleteFile: (path: string) => Promise<{ success: boolean; error?: string }>;
      listMedia: () => Promise<{ success: boolean; collections?: any[]; error?: string }>;
      createCollection: (name: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      deleteCollection: (path: string) => Promise<{ success: boolean; error?: string }>;
      moveFile: (filePath: string, targetCollectionPath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    };
  }
}

// Ленивая загрузка модулей
const Stopwatch = lazy(() => import('./modules/Stopwatch'));
//const Microphone = lazy(() => import('./modules/Microphone'));
const Microphone = lazy(() => import('./modules/Microphone'));

// Маппинг компонентов
const moduleComponents: Record<ModuleType, React.ComponentType> = {
  stopwatch: Stopwatch,
  microphone: Microphone,
  library: Library,
};

// Обновляем MODULES с реальными компонентами
MODULES[0].component = Stopwatch;
MODULES[1].component = Microphone;
MODULES[2].component = Microphone;

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
