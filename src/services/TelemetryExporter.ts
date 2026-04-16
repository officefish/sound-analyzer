// src/services/TelemetryExporter.ts

import { TelemetryEntry, useTelemetryStore } from '../store/telemetry.store';

export class TelemetryExporter {
  static exportToJSON(pretty: boolean = true): string {
    const state = useTelemetryStore.getState();
    const exportData = {
      exportTime: Date.now(),
      exportDate: new Date().toISOString(),
      version: '1.0',
      stats: state.getGlobalStats(),
      entries: state.entries,
    };
    return pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
  }

  static exportToText(): string {
    const state = useTelemetryStore.getState();
    const entries = state.entries;
    const stats = state.getGlobalStats();

    const lines: string[] = [];

    // Заголовок
    lines.push('='.repeat(80));
    lines.push(`MEMBRANA TELEMETRY LOG`);
    lines.push(`Export time: ${new Date().toISOString()}`);
    lines.push(`Total entries: ${entries.length}`);
    lines.push(`Active modules: ${stats.activeModulesCount}`);
    lines.push('='.repeat(80));
    lines.push('');

    // Группируем по модулям
    const byModule = new Map<string, TelemetryEntry[]>();
    for (const entry of entries) {
      const key = entry.moduleName || 'system';
      if (!byModule.has(key)) byModule.set(key, []);
      byModule.get(key)!.push(entry);
    }

    for (const [moduleName, moduleEntries] of byModule) {
      lines.push(`\n[${moduleName.toUpperCase()}]`);
      lines.push('-'.repeat(60));

      for (const entry of moduleEntries) {
        const time = new Date(entry.timestamp).toLocaleTimeString('ru-RU', { hour12: false });

        switch (entry.type) {
          case 'detection':
            const status = entry.data.isDrone ? '🚁 DRONE' : '✅ SAFE';
            const confidence = Math.round(entry.data.confidence * 100);
            lines.push(`[${time}] ${status} | conf:${confidence}% | match:${entry.data.bestMatch || 'none'}`);
            if (entry.metrics) {
              lines.push(
                `         metrics: C=${entry.metrics.centroid?.toFixed(0) || '?'}Hz ` +
                `F=${entry.metrics.flux?.toFixed(2) || '?'} ` +
                `L=${entry.metrics.lowEnergy?.toFixed(0) || '?'}% ` +
                `S=${entry.metrics.stability?.toFixed(0) || '?'}%`
              );
            }
            break;

          case 'spectrum':
            lines.push(`[${time}] SPECTRUM | dominant:${entry.data.dominantFrequency?.toFixed(0) || '?'}Hz | peaks:${entry.data.peakFrequencies?.slice(0, 3).join(',') || 'none'}`);
            break;

          case 'metric':
            lines.push(`[${time}] METRIC | ${entry.data.metric}: ${entry.data.value} ${entry.data.unit || ''}`);
            break;

          case 'event':
            lines.push(`[${time}] EVENT | ${entry.data.event} ${JSON.stringify(entry.data.details)}`);
            break;

          case 'module_start':
            lines.push(`[${time}] START | Module started`);
            break;

          case 'module_stop':
            const durationSec = (entry.data.duration / 1000).toFixed(1);
            lines.push(`[${time}] STOP | Module stopped (duration: ${durationSec}s, entries: ${entry.data.totalEntries})`);
            break;

          default:
            lines.push(`[${time}] ${entry.type} | ${JSON.stringify(entry.data).slice(0, 100)}`);
        }
      }
    }

    // Футер со статистикой
    lines.push('');
    lines.push('='.repeat(80));
    lines.push('SUMMARY STATISTICS');
    lines.push(`Total detections: ${entries.filter(e => e.type === 'detection').length}`);
    lines.push(`Drone alerts: ${entries.filter(e => e.type === 'detection' && e.data.isDrone).length}`);
    lines.push(`Spectrum records: ${entries.filter(e => e.type === 'spectrum').length}`);
    lines.push(`Events: ${entries.filter(e => e.type === 'event').length}`);
    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  static downloadAsJSON(filename: string = `telemetry_${Date.now()}.json`): void {
    const json = this.exportToJSON(true);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, filename);
  }

  static downloadAsText(filename: string = `telemetry_${Date.now()}.txt`): void {
    const text = this.exportToText();
    const blob = new Blob([text], { type: 'text/plain' });
    this.downloadBlob(blob, filename);
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}