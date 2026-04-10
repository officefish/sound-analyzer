import { IPlugin, IPluginContext } from '../../../types/plugins';

class LapHistoryPluginClass implements IPlugin {
  id = 'stopwatch-lap-history';
  name = 'История кругов';
  version = '1.0.0';
  description = 'Сохраняет историю всех кругов и позволяет экспортировать';
  icon = '📊';
  moduleId = 'stopwatch' as const;
  enabled = false;
  
  availableActions = ['export', 'clear', 'getHistory', 'getCount'];
  
  settings = {
    maxLaps: 100,
    autoExport: false,
  };
  
  private getStorageKey(): string {
    return 'lap-history';
  }
  
  private getHistory(): any[] {
    const saved = localStorage.getItem(this.getStorageKey());
    return saved ? JSON.parse(saved) : [];
  }
  
  private saveHistory(history: any[]): void {
    const maxLaps = this.settings.maxLaps || 100;
    const limitedHistory = history.slice(-maxLaps);
    localStorage.setItem(this.getStorageKey(), JSON.stringify(limitedHistory));
  }
  
  private addLap(lap: any): void {
    const history = this.getHistory();
    history.push({
      ...lap,
      timestamp: Date.now(),
    });
    this.saveHistory(history);
  }
  
  private exportHistory(): any[] {
    const history = this.getHistory();
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lap-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return history;
  }
  
  private clearHistory(): any[] {
    localStorage.setItem(this.getStorageKey(), '[]');
    return [];
  }
  
  private getCount(): number {
    return this.getHistory().length;
  }
  
  onModuleEvent(event: string, data: any, context?: IPluginContext): void {
    switch (event) {
      case 'lap':
        if (data?.lap) {
          this.addLap(data.lap);
        }
        break;
      case 'reset':
        if (this.settings.autoExport) {
          this.exportHistory();
        }
        break;
    }
  }
  
  onActivate(): void {
    console.log('📊 Lap History Plugin activated');
  }
  
  onDeactivate(): void {
    console.log('📊 Lap History Plugin deactivated');
  }
  
  execute(action: string, data?: any, context?: IPluginContext): any {
    switch (action) {
      case 'export':
        return this.exportHistory();
      case 'clear':
        return this.clearHistory();
      case 'getHistory':
        return this.getHistory();
      case 'getCount':
        return this.getCount();
      default:
        return null;
    }
  }
}

// Экспортируем экземпляр (один singleton на всё приложение)
export const LapHistoryPlugin = new LapHistoryPluginClass();