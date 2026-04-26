// src/plugins/microphone2/components/AnalysisReportViewer.tsx

import React from 'react';
import { TrendsAnalysisReport, SOUND_STATES } from '../types';
import { usePatternTemplatesStore } from '../stores/patterns.store';


interface AnalysisReportViewerProps {
  report: TrendsAnalysisReport;
  onExport?: () => void;
}

const AnalysisReportViewer: React.FC<AnalysisReportViewerProps> = ({ report, onExport }) => {
  const templates = usePatternTemplatesStore((state) => state.templates);
  
  const getStateInfo = (stateKey: string) => {
    // Проверяем в системных состояниях
    if (SOUND_STATES[stateKey]) {
      return SOUND_STATES[stateKey];
    }
    
    // Проверяем в пользовательских шаблонах
    const userTemplate = templates.find(t => t.key === stateKey || t.name === stateKey);
    if (userTemplate) {
      return {
        name: userTemplate.name,
        icon: userTemplate.icon,
        color: userTemplate.color,
        description: userTemplate.description,
      };
    }
    
    return {
      name: stateKey,
      icon: '❓',
      color: '#888888',
      description: `Неизвестное состояние: ${stateKey}`,
    };
  };
  
  const primaryStateInfo = getStateInfo(report.detectedState);
  
  return (
    <div className="space-y-4 p-3 bg-base-300/20 rounded-lg">
      {/* Заголовок отчета */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{primaryStateInfo.icon}</span>
          <div>
            <div className="text-sm font-bold" style={{ color: primaryStateInfo.color }}>
              {primaryStateInfo.name}
            </div>
            <div className="text-[9px] text-gray-500">
              {new Date(report.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="text-[10px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-1 rounded"
          >
            📥 Экспорт
          </button>
        )}
      </div>
      
      {/* Основная статистика */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-primary">{report.samplesCount}</div>
          <div className="text-[8px] text-gray-500">Тактов</div>
        </div>
        <div>
          <div className="text-lg font-bold text-primary">{report.intervalMs}мс</div>
          <div className="text-[8px] text-gray-500">Интервал</div>
        </div>
        <div>
          <div className="text-lg font-bold text-primary">
            {(report.summary.activityRatio * 100).toFixed(0)}%
          </div>
          <div className="text-[8px] text-gray-500">Активность</div>
        </div>
      </div>
      
      {/* Детектор */}
      <div className="text-[9px] text-gray-500">
        <div>Детектор: TrendsFFTDetector v2.0.0</div>
        <div>Метод: {report.method || 'Трендовый FFT анализ + временные паттерны'}</div>
      </div>
      
      {/* Спектральный анализ */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-gray-400">📊 Спектральный анализ</div>
        <div className="grid grid-cols-3 gap-2 text-[9px]">
          <div>
            <div className="text-gray-500">Центр масс (Hz)</div>
            <div className="text-primary">
              min: {report.averages.centroidMin.toFixed(1)} | max: {report.averages.centroidMax.toFixed(1)}
            </div>
            <div className="text-gray-500">σ: {report.averages.centroidStd.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-gray-500">Спектр. поток</div>
            <div className="text-primary">
              min: {report.averages.fluxMin.toFixed(3)} | max: {report.averages.fluxMax.toFixed(3)}
            </div>
            <div className="text-gray-500">σ: {report.averages.fluxStd.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-gray-500">Громкость (RMS)</div>
            <div className="text-primary">
              min: {report.averages.rmsMin.toFixed(4)} | max: {report.averages.rmsMax.toFixed(4)}
            </div>
            <div className="text-gray-500">σ: {report.averages.rmsStd.toFixed(4)}</div>
          </div>
        </div>
      </div>
      
      {/* Временные паттерны */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-gray-400">📈 Временные паттерны</div>
        <div className="grid grid-cols-2 gap-2 text-[9px]">
          <div>
            <div className="text-gray-500">Активность</div>
            <div className="text-primary">{(report.trends.activity.activityRatio * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-gray-500">Паузы</div>
            <div className="text-primary">{report.trends.activity.avgSilenceDuration * 1000}ms</div>
          </div>
          <div>
            <div className="text-gray-500">Всплески</div>
            <div className="text-primary">{report.trends.activity.avgBurstDuration * 1000}ms</div>
          </div>
          <div>
            <div className="text-gray-500">Скачки частоты</div>
            <div className="text-primary">
              {report.trends.frequencyJumps.actualJumps} ({report.trends.frequencyJumps.densityPerSecond.toFixed(1)}/с)
            </div>
          </div>
        </div>
      </div>
      
      {/* Тренды */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-gray-400">📉 Выявленные тренды</div>
        <div className="grid grid-cols-2 gap-1 text-[9px]">
          <div>
            <span className="text-gray-500">Громкость</span>
            <span className="text-primary ml-1">
              {report.trends.trends.volumeTrend === 'stable' && '➡️ Стабильна'}
              {report.trends.trends.volumeTrend === 'increasing' && '📈 Возрастает'}
              {report.trends.trends.volumeTrend === 'decreasing' && '📉 Убывает'}
              {report.trends.trends.volumeTrend === 'oscillating' && '🔄 Колеблется'}
              {report.trends.trends.volumeTrend === 'modulated' && '〰️ Модулирована'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Частота</span>
            <span className="text-primary ml-1">
              {report.trends.trends.frequencyTrend === 'stable' && '➡️ Стабильна'}
              {report.trends.trends.frequencyTrend === 'increasing' && '📈 Возрастает'}
              {report.trends.trends.frequencyTrend === 'decreasing' && '📉 Убывает'}
              {report.trends.trends.frequencyTrend === 'oscillating' && '🔄 Колеблется'}
              {report.trends.trends.frequencyTrend === 'modulated' && '〰️ Модулирована'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Стабильность</span>
            <span className="text-primary ml-1">{report.trends.stability.longTermStability}</span>
          </div>
          <div>
            <span className="text-gray-500">Периодичность</span>
            <span className="text-primary ml-1">
              {report.trends.stability.periodicity === 'none' && '❌ Отсутствует'}
              {report.trends.stability.periodicity === 'irregular' && '🔀 Неправильная'}
              {report.trends.stability.periodicity === 'semiRegular' && '🔄 Полурегулярная'}
              {report.trends.stability.periodicity === 'regular' && '✅ Регулярная'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Оценки состояний */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-gray-400">🎯 Оценки состояний</div>
        <div className="space-y-1">
          {report.stateScores.slice(0, 5).map((score, idx) => {
            const stateInfo = getStateInfo(score.state);
            return (
              <div key={idx} className="flex items-center justify-between text-[9px]">
                <div className="flex items-center gap-2">
                  <span>{stateInfo.icon}</span>
                  <span style={{ color: stateInfo.color }}>{stateInfo.name}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-gray-500">Спектр: {score.spectralScore.toFixed(0)}%</span>
                  <span className="text-gray-500">Время: {score.temporalScore.toFixed(0)}%</span>
                  <span className="text-primary font-bold">{score.score.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Теги */}
      {report.tags && report.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {report.tags.map((tag, idx) => (
            <span key={idx} className="text-[8px] bg-gray-700 px-1.5 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalysisReportViewer;