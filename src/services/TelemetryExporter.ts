// src/services/TelemetryExporter.ts

import { useTelemetryStore } from '../store/telemetry.store';

export interface ExportOptions {
  format: 'json' | 'csv';
  startDate?: Date;
  endDate?: Date;
  moduleName?: string;
  type?: string;
}

class TelemetryExporter {
  async export(options: ExportOptions): Promise<void> {
    const { entries } = useTelemetryStore.getState();
    
    let filteredEntries = [...entries];
    
    // Фильтр по дате
    if (options.startDate) {
      filteredEntries = filteredEntries.filter(e => e.timestamp >= options.startDate!.getTime());
    }
    if (options.endDate) {
      filteredEntries = filteredEntries.filter(e => e.timestamp <= options.endDate!.getTime());
    }
    
    // Фильтр по модулю
    if (options.moduleName) {
      filteredEntries = filteredEntries.filter(e => e.moduleName === options.moduleName);
    }
    
    // Фильтр по типу
    if (options.type) {
      filteredEntries = filteredEntries.filter(e => e.type === options.type);
    }
    
    if (options.format === 'json') {
      this.exportToJSON(filteredEntries);
    } else if (options.format === 'csv') {
      this.exportToCSV(filteredEntries);
    }
  }
  
  private exportToJSON(entries: any[]): void {
    const data = JSON.stringify(entries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  private exportToCSV(entries: any[]): void {
    const headers = ['ID', 'Timestamp', 'Type', 'Module', 'Tags', 'Data'];
    const rows = entries.map(entry => [
      entry.id,
      new Date(entry.timestamp).toLocaleString(),
      entry.type,
      entry.moduleName || 'system',
      entry.tags.join('; '),
      JSON.stringify(entry.data).slice(0, 500)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const telemetryExporter = new TelemetryExporter();