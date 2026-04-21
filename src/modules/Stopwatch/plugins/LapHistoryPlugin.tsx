// // src/plugins/stopwatch/LapHistoryPlugin.ts

// import React, { useState, useEffect } from 'react';
// import { IPlugin, IPluginContext, IPluginWidget } from '../../../types/plugins';

// // Компонент виджета
// const LapHistoryWidget: React.FC<{
//   plugin: IPlugin;
//   context?: IPluginContext;
//   onAction: (action: string, data?: any) => void;
//   isActive: boolean;
// }> = ({ 
//   //plugin, context, 
//   onAction, isActive }) => {
//   const [history, setHistory] = useState<any[]>([]);
//   const [showAll, setShowAll] = useState(false);
  
//   useEffect(() => {
//     if (isActive) {
//       const saved = localStorage.getItem('lap-history');
//       if (saved) {
//         setHistory(JSON.parse(saved));
//       }
      
//       // Слушаем изменения
//       const handleStorage = () => {
//         const updated = localStorage.getItem('lap-history');
//         if (updated) setHistory(JSON.parse(updated));
//       };
      
//       window.addEventListener('storage', handleStorage);
//       return () => window.removeEventListener('storage', handleStorage);
//     }
//   }, [isActive]);
  
//   if (!isActive) return null;
  
//   const displayHistory = showAll ? history : history.slice(-3);
  
//   return (
//     <div className="space-y-2">
//       <div className="flex justify-between items-center">
//         <span className="text-gray-400 text-xs">
//           📊 Последние круги ({history.length})
//         </span>
//         <div className="flex gap-1">
//           <button
//             onClick={() => onAction('export')}
//             className="text-[10px] bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-300 px-2 py-0.5 rounded transition-colors"
//           >
//             📥 Экспорт
//           </button>
//           <button
//             onClick={() => onAction('clear')}
//             className="text-[10px] bg-red-500/30 hover:bg-red-500/50 text-red-300 px-2 py-0.5 rounded transition-colors"
//           >
//             🗑️ Очистить
//           </button>
//         </div>
//       </div>
      
//       {displayHistory.length === 0 ? (
//         <div className="text-gray-500 text-xs text-center py-2">
//           Нет сохранённых кругов
//         </div>
//       ) : (
//         <div className="space-y-1">
//           {displayHistory.slice().reverse().map((lap, idx) => (
//             <div key={idx} className="bg-white/5 rounded p-1.5 text-xs">
//               <div className="flex justify-between">
//                 <span className="text-indigo-300">Круг {lap.number}</span>
//                 <span className="text-green-400 font-mono">{lap.time}</span>
//               </div>
//               <div className="text-gray-500 text-[10px]">
//                 {new Date(lap.timestamp).toLocaleTimeString()}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
      
//       {history.length > 3 && (
//         <button
//           onClick={() => setShowAll(!showAll)}
//           className="w-full text-center text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
//         >
//           {showAll ? '▲ Показать меньше' : '▼ Показать все'}
//         </button>
//       )}
//     </div>
//   );
// };

// // Виджет для плагина
// const lapHistoryWidget: IPluginWidget = {
//   id: 'lap-history-widget',
//   pluginId: 'stopwatch-lap-history',
//   title: 'История кругов',
//   icon: '📊',
//   position: 'bottom',
//   order: 1,
//   width: 'full',
//   component: LapHistoryWidget,
// };

// class LapHistoryPluginClass implements IPlugin {
//   id = 'stopwatch-lap-history';
//   name = 'История кругов';
//   version = '1.0.0';
//   description = 'Сохраняет историю всех кругов и позволяет экспортировать';
//   icon = '📊';
//   moduleId = 'unknown' as const;
//   enabled = false;
  
//   availableActions = ['export', 'clear', 'getHistory', 'getCount'];
  
//   settings = {
//     maxLaps: 100,
//     autoExport: false,
//   };
  
//   // ✅ Добавляем виджет
//   widget = lapHistoryWidget;
  
//   private getStorageKey(): string {
//     return 'lap-history';
//   }
  
//   private getHistory(): any[] {
//     const saved = localStorage.getItem(this.getStorageKey());
//     return saved ? JSON.parse(saved) : [];
//   }
  
//   private saveHistory(history: any[]): void {
//     const maxLaps = this.settings.maxLaps || 100;
//     const limitedHistory = history.slice(-maxLaps);
//     localStorage.setItem(this.getStorageKey(), JSON.stringify(limitedHistory));
//   }
  
//   private addLap(lap: any): void {
//     const history = this.getHistory();
//     history.push({
//       ...lap,
//       timestamp: Date.now(),
//     });
//     this.saveHistory(history);
//   }
  
//   private exportHistory(): any[] {
//     const history = this.getHistory();
//     const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `lap-history-${Date.now()}.json`;
//     a.click();
//     URL.revokeObjectURL(url);
//     return history;
//   }
  
//   private clearHistory(): any[] {
//     localStorage.setItem(this.getStorageKey(), '[]');
//     return [];
//   }
  
//   private getCount(): number {
//     return this.getHistory().length;
//   }
  
//   onModuleEvent(event: string, data: any
//     //, context?: IPluginContext
//   ): void {
//     switch (event) {
//       case 'lap':
//         if (data?.lap) {
//           this.addLap(data.lap);
//         }
//         break;
//       case 'reset':
//         if (this.settings.autoExport) {
//           this.exportHistory();
//         }
//         break;
//     }
//   }
  
//   onActivate(
//     //context?: IPluginContext
//   ): void {
//     console.log('📊 Lap History Plugin activated');
//   }
  
//   onDeactivate(
//     //context?: IPluginContext
//   ): void {
//     console.log('📊 Lap History Plugin deactivated');
//   }
  
//   execute(action: string
//     //, data?: any, context?: IPluginContext
//   ): any {
//     switch (action) {
//       case 'export':
//         return this.exportHistory();
//       case 'clear':
//         return this.clearHistory();
//       case 'getHistory':
//         return this.getHistory();
//       case 'getCount':
//         return this.getCount();
//       default:
//         return null;
//     }
//   }
// }

// export const LapHistoryPlugin = new LapHistoryPluginClass();