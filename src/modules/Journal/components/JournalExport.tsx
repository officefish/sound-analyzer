import React from 'react';
import { TelemetryEntry } from '../../../store/telemetry.store';

interface JournalExportProps {
  entries: TelemetryEntry[];
}

const JournalExport: React.FC<JournalExportProps> = ({ entries }) => {
  const exportToJSON = () => {
    const data = JSON.stringify(entries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Timestamp', 'Type', 'Module', 'Tags', 'Data'];
    const rows = entries.map(entry => [
      entry.id,
      new Date(entry.timestamp).toLocaleString(),
      entry.type,
      entry.moduleName || 'system',
      entry.tags.join('; '),
      JSON.stringify(entry.data).slice(0, 200)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 cursor-pointer">
        <span>📥</span><span>Экспорт</span>
      </label>

      <ul tabIndex={0} className="dropdown-content menu bg-base-200 rounded-xl z-10 w-40 shadow-lg border border-base-300">
        <li><button onClick={exportToJSON} className="text-sm">📋 JSON</button></li>
        <li><button onClick={exportToCSV} className="text-sm">📊 CSV</button></li>
      </ul>
    </div>
  );
};

export default JournalExport;