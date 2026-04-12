import React, { useState, useEffect } from 'react';
import { IPlugin, IPluginContext, IPluginWidget } from '../../../types/plugins';
import VolumeWidget from '../components/VolumeWidget';
import QualityWidget from '../components/QualityWidget';
import WaveformWidget from '../components/WaveformWidget';
import SpectrumWidget from '../components/SpectrumWidget';
import WidgetControls from '../components/WidgetControls';

//import { IPlugin, IPluginContext, IPluginWidget } from '../../types/plugins';
//import React from 'react';

// Компонент виджета
const TuneMonitorWidget: React.FC<{
  plugin: IPlugin;
  context?: any;
  onAction: (action: string, data?: any) => void;
  isActive: boolean;
}> = ({ plugin, context, onAction, isActive }) => {
  if (!isActive) return null;
  
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400">🎵 Tune Monitor</div>
      <div className="text-xs text-gray-500">
        Volume: {Math.round((context?.volume || 0) * 100)}%
      </div>
    </div>
  );
};

// Виджет
const tuneMonitorWidget: IPluginWidget = {
  id: 'tune-monitor-widget',
  pluginId: 'microphone2-tune-monitor',
  title: 'Tune Monitor',
  icon: '🎵',
  position: 'bottom',
  order: 1,
  width: 'full',
  component: TuneMonitorWidget,
};

class TuneMonitorPluginClass implements IPlugin {
  id = 'microphone2-tune-monitor';
  name = 'Tune Monitor';
  version = '1.0.0';
  description = 'Визуализация звука: громкость, качество, волна и спектр';
  icon = '🎵';
  moduleId = 'microphone2' as const;
  enabled = false;
  
  availableActions = ['setWidgetState', 'getWidgetState', 'resetWidgets'];
  
  settings = {
    showVolume: true,
    showQuality: true,
    showWaveform: true,
    showSpectrum: true,
  };
  
  widget = tuneMonitorWidget;
  
  // ✅ Добавляем метод execute
  execute(action: string, data?: any
    //, context?: IPluginContext
  ): any {
    console.log(`🎵 TuneMonitor execute: ${action}`, data);
    
    switch (action) {
      case 'setWidgetState':
        // Обновляем состояние виджета
        if (data) {
          Object.assign(this.settings, data);
        }
        return true;
        
      case 'getWidgetState':
        // Возвращаем текущее состояние
        return { ...this.settings };
        
      case 'resetWidgets':
        // Сбрасываем настройки
        this.settings = {
          showVolume: true,
          showQuality: true,
          showWaveform: true,
          showSpectrum: true,
        };
        return true;
        
      default:
        return null;
    }
  }
  
  onActivate(context?: IPluginContext): void {
    console.log('🎵 Tune Monitor Plugin activated');
  }
  
  onDeactivate(context?: IPluginContext): void {
    console.log('🎵 Tune Monitor Plugin deactivated');
  }
  
  onModuleEvent(event: string, data: any, context?: IPluginContext): void {
    console.log(`🎵 Tune Monitor event: ${event}`, data);
  }
}

export const TuneMonitorPlugin = new TuneMonitorPluginClass();

// // Главный компонент виджета TuneMonitor
// const TuneMonitorWidgetComponent: React.FC<{ 
//   context?: IPluginContext; 
//   plugin: IPlugin; 
//   onAction: (action: string, data?: any) => void; 
//   isActive: boolean;
// }> = ({ context, plugin, onAction, isActive }) => {
//   const [widgetStates, setWidgetStates] = useState({
//     volume: true,
//     quality: true,
//     waveform: true,
//     spectrum: true,
//   });
  
//   // Загружаем настройки из плагина
//   useEffect(() => {
//     if (plugin.settings) {
//       setWidgetStates({
//         volume: plugin.settings.showVolume !== false,
//         quality: plugin.settings.showQuality !== false,
//         waveform: plugin.settings.showWaveform !== false,
//         spectrum: plugin.settings.showSpectrum !== false,
//       });
//     }
//   }, [plugin.settings]);
  
//   const handleToggleWidget = (widget: keyof typeof widgetStates) => {
//     const newState = { ...widgetStates, [widget]: !widgetStates[widget] };
//     setWidgetStates(newState);
//     onAction('setWidgetState', { widget, enabled: newState[widget] });
//   };
  
//   if (!isActive) return null;
  
//   // Получаем данные из контекста
//   const volume = (context as any)?.volume || 0;
//   const qualityScore = (context as any)?.qualityScore || 0;
//   const snr = (context as any)?.snr || 0;
//   const noise = (context as any)?.noise || 0;
//   const waveformData = (context as any)?.waveformData || [];
//   const spectrumData = (context as any)?.spectrumData || [];
  
//   return (
//     <div className="space-y-4">
//       {/* Панель управления виджетами */}
//       <WidgetControls widgetStates={widgetStates} onToggle={handleToggleWidget} />
      
//       {/* Виджеты */}
//       {widgetStates.volume && <VolumeWidget volume={volume} />}
      
//       <div className="grid grid-cols-2 gap-4">
//         {widgetStates.quality && <QualityWidget qualityScore={qualityScore} snr={snr} noise={noise} />}
//       </div>
      
//       {widgetStates.waveform && <WaveformWidget waveformData={waveformData} />}
//       {widgetStates.spectrum && <SpectrumWidget spectrumData={spectrumData} />}
//     </div>
//   );
// };

// // Виджет для плагина
// const tuneMonitorWidget: IPluginWidget = {
//   id: 'tune-monitor-widget',
//   pluginId: 'microphone2-tune-monitor',
//   title: 'Tune Monitor',
//   icon: '🎵',
//   position: 'bottom',
//   order: 1,
//   width: 'full',
//   component: TuneMonitorWidgetComponent,
// };

// class TuneMonitorPluginClass implements IPlugin {
//   id = 'microphone2-tune-monitor';
//   name = 'Tune Monitor';
//   version = '1.0.0';
//   description = 'Визуализация звука: громкость, качество, волна и спектр';
//   icon = '🎵';
//   moduleId = 'microphone2' as const;  // ✅ Важно: moduleId = 'microphone2'
//   enabled = true;
  
//   availableActions = ['setWidgetState', 'getWidgetState', 'resetWidgets'];
  
//   settings = {
//     showVolume: true,
//     showQuality: true,
//     showWaveform: true,
//     showSpectrum: true,
//   };
  
//   widget = tuneMonitorWidget;
  
//   onActivate(
//     //context?: IPluginContext
// ): void {
//     console.log('🎵 Tune Monitor Plugin activated for Microphone2');
//   }
  
//   onDeactivate(
//     //context?: IPluginContext
//   ): void {
//     console.log('🎵 Tune Monitor Plugin deactivated');
//   }
  
//   execute(action: string, data?: any
//     //, context?: IPluginContext
//   ): any {
//     switch (action) {
//       case 'setWidgetState':
//         if (data?.widget && this.settings) {
//           const settingKey = `show${data.widget.charAt(0).toUpperCase()}${data.widget.slice(1)}`;
//           (this.settings as any)[settingKey] = data.enabled;
//         }
//         return true;
//       case 'getWidgetState':
//         if (data?.widget && this.settings) {
//           const settingKey = `show${data.widget.charAt(0).toUpperCase()}${data.widget.slice(1)}`;
//           return (this.settings as any)[settingKey];
//         }
//         return null;
//       case 'resetWidgets':
//         if (this.settings) {
//           this.settings.showVolume = true;
//           this.settings.showQuality = true;
//           this.settings.showWaveform = true;
//           this.settings.showSpectrum = true;
//         }
//         return true;
//       default:
//         return null;
//     }
//   }
// }

// export const TuneMonitorPlugin = new TuneMonitorPluginClass();