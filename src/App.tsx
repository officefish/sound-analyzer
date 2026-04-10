import React from 'react';
import { useAppStore } from './store/app.store';
import Sidebar from './components/Navigation/Sidebar';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Stopwatch from './pages/Stopwatch';
import Microphone from './pages/Microphone';

const App: React.FC = () => {
  const { currentApp } = useAppStore();
  
  const renderCurrentApp = () => {
    switch (currentApp) {
      case 'stopwatch':
        return <Stopwatch />;
      case 'microphone':
        return <Microphone />;
      default:
        return <Stopwatch />;
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar - навигация */}
      <Sidebar />
      
      {/* Основная область */}
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-2xl mx-auto h-full flex flex-col">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/10 flex-1">
              {renderCurrentApp()}
            </div>
            
            {/* Footer */}
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;