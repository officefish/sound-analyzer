import React from 'react';
import { TelemetryEntry } from '../../../store/telemetry.store';
import DetectionReportViewer from './DetectionReportViewer';
import ErrorBoundary from '../../../components/ui/ErrorBoundary';
import FFTTrendsReportViewer from './FFTTrendsReportViewer';

interface JournalEntryProps {
  entry: TelemetryEntry;
}

// Регистр типов анализов и соответствующих вьюверов
const analysisViewers: Record<string, React.ComponentType<{ report: any }>> = {
  'FFTDetector': DetectionReportViewer,
  'TrendsFFTDetector': FFTTrendsReportViewer,
  // Иные отчеты
};

const JournalEntry: React.FC<JournalEntryProps> = ({ entry }) => {
  // Защита от отсутствующей записи
  if (!entry) {
    return (
      <div className="p-3 rounded-lg border-l-4 border-gray-500 bg-gray-500/5 mb-2">
        <div className="text-sm text-gray-500">Некорректная запись</div>
      </div>
    );
  }
  
  // Специальный рендер для analysis типа
  if (entry.type === 'analysis' && entry.data) {
    // Проверяем, что data не пустая
    if (!entry.data || Object.keys(entry.data).length === 0) {
      return (
        <div className="p-3 rounded-lg border-l-4 border-yellow-500 bg-yellow-500/5 mb-2">
          <div className="text-sm text-yellow-400">⚠️ Пустой отчёт анализа</div>
        </div>
      );
    }
    
    // Получаем имя модуля из записи
    const moduleName = entry.moduleName || entry.data.moduleName || 'unknown';
    
    // Ищем вьювер для этого модуля
    const ViewerComponent = analysisViewers[moduleName];
    
    // Получаем теги из отчёта или используем стандартные
    const reportTags = entry.data.tags || ['analysis', moduleName.toLowerCase()];
    
    if (!ViewerComponent) {
      // Если вьювер не найден, показываем стандартное сообщение
      return (
        <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden mb-3">
          <div className="p-4 border-b border-base-300 bg-yellow-500/10">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-lg">📋</span>
              <span className="text-xs text-gray-500 font-mono">#{entry.id}</span>
              <span className="text-xs text-gray-500">[{moduleName}]</span>
              {/* ✅ Теги из отчёта */}
              {reportTags.map((tag: string) => (
                <span key={tag} className="text-[9px] bg-base-300 px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-yellow-400">
                  Отчёт от незарегистрированного модуля
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>🕐 {new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm mb-2">⚠️ Нет визуализатора для отчётов модуля "{moduleName}"</p>
            <button
              onClick={() => {
                const jsonStr = JSON.stringify(entry.data, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `report_${moduleName}_${entry.id}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1.5 rounded-lg transition-colors"
            >
              📥 Скачать JSON
            </button>
          </div>
        </div>
      );
    }
    
    // Отображаем соответствующий вьювер
    return (
      <ErrorBoundary
        key={entry.id}
        fallback={
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <div className="text-red-400 text-sm">⚠️ Ошибка при отображении отчёта</div>
            <div className="text-xs text-gray-500 mt-1">Модуль: {moduleName}</div>
          </div>
        }
      >
        <ViewerComponent report={entry.data} />
      </ErrorBoundary>
    );
  }
  
  const getIcon = () => {
    switch (entry.type) {
      case 'event':
        return '⚡';
      case 'module_start':
        return '▶️';
      case 'module_stop':
        return '⏹️';
      default:
        return '📝';
    }
  };

  const getColor = () => {
    switch (entry.type) {
      case 'event':
        return 'border-l-yellow-500 bg-yellow-500/5';
      default:
        return 'border-l-gray-500 bg-gray-500/5';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', { hour12: false });
  };

  const renderContent = () => {

    console.log('entry.type: ' + entry.type)

    switch (entry.type) {
      
      case 'event':
        return (
          <div>
            <span className="font-semibold">{entry.data?.event || 'event'}</span>
            {entry.data?.details && Object.keys(entry.data.details).length > 0 && (
              <span className="text-xs text-gray-500 ml-2">
                {JSON.stringify(entry.data.details).slice(0, 100)}
              </span>
            )}
          </div>
        );
      
      case 'module_start':
        return (
          <div>
            <span className="font-semibold text-green-400">Модуль запущен</span>
            <span className="text-xs text-gray-500 ml-2">{entry.moduleName}</span>
          </div>
        );
      
      case 'module_stop':
        const duration = entry.data?.duration ? `${(entry.data.duration / 1000).toFixed(1)}с` : '';
        return (
          <div>
            <span className="font-semibold text-red-400">Модуль остановлен</span>
            <span className="text-xs text-gray-500 ml-2">{entry.moduleName}</span>
            {duration && <span className="text-xs text-gray-500 ml-2">(работал {duration})</span>}
          </div>
        );
      
      default:
        return <span>{JSON.stringify(entry.data)}</span>;
    }
  };

  // Определяем основной тег для сортировки
  const getPrimaryTag = () => {
    if (entry.type === 'analysis' && entry.data?.tags) {
      if (entry.data.tags.includes('drone')) return 'drone';
      if (entry.data.tags.includes('calm')) return 'calm';
      return 'analysis';
    }
    if (entry.type === 'module_start' || entry.type === 'module_stop') return 'system';
    if (entry.type === 'event') return 'event';
    return 'other';
  };

  return (
    <div className={`p-3 rounded-lg border-l-4 ${getColor()} hover:bg-base-300/50 transition-colors mb-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{getIcon()}</span>
            {/* <span className="text-xs text-gray-500 font-mono">#{entry.id}</span> */}
            <span className="text-xs text-gray-500">[{entry.moduleName || 'system'}]</span>
            {/* Теги из записи или из отчёта */}
            {entry.type === 'analysis' && entry.data?.tags ? (
              entry.data.tags.map((tag: string) => (
                <span key={tag} className="text-[9px] bg-base-300 px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))
            ) : (
              entry.tags?.map(tag => (
                <span key={tag} className="text-[9px] bg-base-300 px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))
            )}
            {/* Добавляем тег сортировки если его нет */}
            {entry.type !== 'analysis' && (
              <span className="text-[9px] bg-base-300 px-1.5 py-0.5 rounded-full">
                {getPrimaryTag()}
              </span>
            )}
          </div>
          <div className="mt-1 text-sm">{renderContent()}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs font-mono text-gray-500">{formatTime(entry.timestamp)}</div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(JournalEntry);