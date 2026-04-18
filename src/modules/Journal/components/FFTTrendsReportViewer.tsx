// src/plugins/microphone2/components/TrendsReportViewer.tsx

import React, { useState } from 'react';
import ReactJson from 'react-json-view';

interface TrendsReportViewerProps {
  report: any;
}

const FFTTrendsReportViewer: React.FC<TrendsReportViewerProps> = ({ report }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Защита от отсутствующего отчёта
  if (!report || typeof report !== 'object') {
    return (
      <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden mb-3 p-4 text-center text-gray-500">
        ⚠️ Некорректный формат отчёта
      </div>
    );
  }
  
  // Безопасное получение значений с дефолтами
  const detectionNumber = report.detectionNumber || report.id || '?';
  const strictness = report.strictness || 'normal';
  const samplesCount = report.samplesCount || report.tactData?.length || 0;
  const validSamples = report.validSamples || 0;
  const isDetected = report.isDetected || false;
  const detectedState = report.detectedState || 'UNKNOWN';
  const detectedStateName = report.detectedStateName || 'Неизвестно';
  const detectedStateIcon = report.detectedStateIcon || '❓';
  const confidence = report.confidence || 0;
  const timestamp = report.timestamp || Date.now();
  const intervalMs = report.intervalMs || 30;
  const totalAnalysisTimeMs = report.totalAnalysisTimeMs || (intervalMs * samplesCount);
  const tactData = report.tactData || [];
  const stateScores = report.stateScores || [];
  const summary = report.summary || {
    primaryState: 'UNKNOWN',
    primaryStateName: 'Неизвестно',
    primaryStateIcon: '❓',
    confidence: 0,
    alternativeStates: [],
    stabilityScore: 0,
    activityRatio: 0,
  };
  const averages = report.averages || {
    centroidMin: 0, centroidMax: 0, centroidStd: 0,
    fluxMin: 0, fluxMax: 0, fluxStd: 0,
    rmsMin: 0, rmsMax: 0, rmsStd: 0,
  };
  const trends = report.trends || {
    statistics: {},
    activity: {},
    frequencyJumps: {},
    trends: {},
    stability: {},
    envelope: {},
  };
  const reportTags = report.tags || ['analysis', 'trends-fft', strictness, isDetected ? detectedState.toLowerCase() : 'unknown'];
  
  const totalTimeSec = (totalAnalysisTimeMs / 1000).toFixed(1);
  const successRate = samplesCount > 0 ? ((validSamples / samplesCount) * 100).toFixed(1) : '0';
  
  const getStatusColor = () => {
    if (isDetected) return 'text-primary bg-primary/10 border-primary/30';
    return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-400';
    if (confidence >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  // Экспорт в TXT
  const exportToTxt = () => {
    const lines = [];
    lines.push('='.repeat(80));
    lines.push(`TRENDS FFT DETECTOR ANALYSIS REPORT #${detectionNumber}`);
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Detector: TrendsFFTDetector v2.0.0`);
    lines.push(`Result: ${isDetected ? `${detectedStateIcon} ${detectedStateName} DETECTED` : '❌ NO MATCHING STATE'}`);
    lines.push(`Confidence: ${confidence.toFixed(1)}%`);
    lines.push(`Strictness: ${strictness}`);
    lines.push(`Tags: ${reportTags.join(', ')}`);
    lines.push(`Timestamp: ${new Date(timestamp).toLocaleString()}`);
    lines.push(`Analysis time: ${totalTimeSec}s (${intervalMs}ms × ${samplesCount} samples)`);
    lines.push(`Valid samples: ${validSamples}/${samplesCount} (${successRate}%)`);
    lines.push('');
    lines.push('SPECTRAL ANALYSIS:');
    lines.push(`  Center of Mass: min=${averages.centroidMin.toFixed(1)} max=${averages.centroidMax.toFixed(1)} Hz (σ: ${averages.centroidStd.toFixed(1)})`);
    lines.push(`  Spectral Flux: min=${averages.fluxMin.toFixed(3)} max=${averages.fluxMax.toFixed(3)} (σ: ${averages.fluxStd.toFixed(3)})`);
    lines.push(`  Loudness: min=${averages.rmsMin.toFixed(4)} max=${averages.rmsMax.toFixed(4)} (σ: ${averages.rmsStd.toFixed(4)})`);
    lines.push('');
    lines.push('TEMPORAL PATTERNS:');
    lines.push(`  Activity Ratio: ${((trends.activity?.activityRatio || 0) * 100).toFixed(1)}%`);
    lines.push(`  Avg Silence: ${((trends.activity?.avgSilenceDuration || 0) * 1000).toFixed(0)}ms`);
    lines.push(`  Avg Burst: ${((trends.activity?.avgBurstDuration || 0) * 1000).toFixed(0)}ms`);
    lines.push(`  Frequency Jumps: ${trends.frequencyJumps?.actualJumps || 0} (${(trends.frequencyJumps?.densityPerSecond || 0).toFixed(1)}/s, avg: ${(trends.frequencyJumps?.avgMagnitude || 0).toFixed(0)}Hz)`);
    lines.push('');
    lines.push('TRENDS:');
    lines.push(`  Volume Trend: ${trends.trends?.volumeTrend || 'unknown'}`);
    lines.push(`  Frequency Trend: ${trends.trends?.frequencyTrend || 'unknown'}`);
    lines.push(`  Long-term Stability: ${trends.stability?.longTermStability || 'unknown'}`);
    lines.push(`  Periodicity: ${trends.stability?.periodicity || 'unknown'}`);
    lines.push(`  Envelope Shape: ${trends.envelope?.shape || 'unknown'}`);
    lines.push(`  Peak/Average Ratio: ${(trends.envelope?.peakToAverageRatio || 0).toFixed(2)}`);
    lines.push('');
    lines.push('STATE SCORES:');
    lines.push('  # | State | Score');
    lines.push('  ' + '-'.repeat(50));
    stateScores.slice(0, 7).forEach((score: any, idx: number) => {
      lines.push(`  ${String(idx + 1).padStart(2)} | ${score.stateName.padEnd(20)} | ${score.score.toFixed(1)}%`);
    });
    lines.push('');
    lines.push('TACT DATA (first 20):');
    lines.push('  # | Center Mass | Spectral Flux | Loudness');
    lines.push('  ' + '-'.repeat(50));
    tactData.slice(0, 20).forEach((tact: any) => {
      const tactNum = tact.tact;
      lines.push(`  ${String(tactNum).padStart(2)} | ${(tact.centroid || 0).toFixed(1).padStart(8)} Hz | ${(tact.flux || 0).toFixed(3).padStart(12)} | ${(tact.rms || 0).toFixed(4).padStart(8)}`);
    });
    if (tactData.length > 20) {
      lines.push(`  ... and ${tactData.length - 20} more tacts`);
    }
    lines.push('');
    lines.push('SUMMARY:');
    lines.push(`  Primary State: ${summary.primaryStateIcon} ${summary.primaryStateName} (${summary.confidence.toFixed(1)}%)`);
    lines.push(`  Stability Score: ${summary.stabilityScore.toFixed(1)}%`);
    lines.push(`  Activity Ratio: ${(summary.activityRatio * 100).toFixed(1)}%`);
    if (summary.alternativeStates && summary.alternativeStates.length > 0) {
      lines.push(`  Alternative States:`);
      summary.alternativeStates.forEach((alt: any) => {
        lines.push(`    - ${alt.stateName} (${alt.score.toFixed(1)}%)`);
      });
    }
    lines.push('');
    lines.push('='.repeat(80));
    
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trends_fft_report_${detectionNumber}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };
  
  // Экспорт в JSON
  const exportToJson = () => {
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trends_fft_report_${detectionNumber}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };
  
  return (
    <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden mb-3 relative">
      {/* Заголовок отчёта */}
      <div 
        className={`p-4 cursor-pointer transition-all duration-200 ${getStatusColor()} border-b border-base-300`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Верхняя строка с иконкой, номером и именем модуля */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-lg">📊</span>
          <span className="text-xs text-gray-500 font-mono">#{detectionNumber}</span>
          <span className="text-xs text-gray-500">[TrendsFFTDetector]</span>
          {reportTags.map((tag: string) => (
            <span key={tag} className="text-[9px] bg-base-300 px-1.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        
        {/* Основной статус и метрики */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isDetected ? 'bg-primary animate-pulse' : 'bg-gray-500'}`} />
            <span className="font-bold">
              {isDetected ? `ВЕРОЯТНЫЙ ПАТТЕРН: ${detectedStateName}` : '❌ ПАТТЕРН НЕ ОПРЕДЕЛЁН'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span>📊 {strictness}</span>
            <span>⏱️ {totalTimeSec}с</span>
            <span>🎯 {validSamples}/{samplesCount}</span>
            <span className={`font-bold ${getConfidenceColor(confidence)}`}>
              {confidence.toFixed(1)}%
            </span>
            <span className="text-xs">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>
        
        {/* Дополнительная информация */}
        <div className="text-xs text-gray-500 mt-1">
          {new Date(timestamp).toLocaleString()}
        </div>
      </div>
      
      {/* Краткая статистика (всегда видна) */}
      <div className="p-4 border-b border-base-300 bg-base-300/30">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-xs text-base-content/50">Тактов</div>
            <div className="text-xl font-bold text-primary">{samplesCount}</div>
          </div>
          {/* <div>
            <div className="text-xs text-base-content/50">Успешных</div>
            <div className="text-xl font-bold text-success">{validSamples}</div>
          </div>
          <div>
            <div className="text-xs text-base-content/50">Успешность</div>
            <div className="text-xl font-bold text-info">{successRate}%</div>
          </div> */}
          <div>
            <div className="text-xs text-base-content/50">Интервал</div>
            <div className="text-xl font-bold text-primary">{intervalMs}мс</div>
          </div>
          <div>
            <div className="text-xs text-base-content/50">Активность</div>
            <div className="text-xl font-bold text-primary">
              {((trends.activity?.activityRatio || 0) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
      
      {/* Развёрнутая информация */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Кнопки экспорта */}
          <div className="flex justify-end">
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                📥 Экспорт
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-36 bg-base-200 rounded-lg shadow-xl border border-base-300 z-10 overflow-hidden">
                  <button
                    onClick={exportToTxt}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-base-300 transition-colors flex items-center gap-2"
                  >
                    📄 TXT формат
                  </button>
                  <button
                    onClick={exportToJson}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-base-300 transition-colors flex items-center gap-2"
                  >
                    📋 JSON формат
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Информация о детекторе */}
          <div className="bg-base-300 rounded-lg p-2 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-base-content/50">Детектор:</span>
              <span className="text-primary font-mono">TrendsFFTDetector v2.0.0</span>
              <span className="text-base-content/50">Метод:</span>
              <span className="text-primary">Трендовый FFT анализ + временные паттерны</span>
            </div>
          </div>
          
          {/* Спектральный анализ */}
          <div>
            <h4 className="text-sm font-semibold text-base-content/70 mb-2">📊 Спектральный анализ</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Центр масс (Hz)</div>
                <div className="font-mono text-primary">
                  min: {averages.centroidMin.toFixed(1)} | max: {averages.centroidMax.toFixed(1)}
                </div>
                <div className="text-xs text-base-content/50">σ: {averages.centroidStd.toFixed(1)}</div>
              </div>
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Спектр. поток</div>
                <div className="font-mono text-primary">
                  min: {averages.fluxMin.toFixed(3)} | max: {averages.fluxMax.toFixed(3)}
                </div>
                <div className="text-xs text-base-content/50">σ: {averages.fluxStd.toFixed(3)}</div>
              </div>
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Громкость (RMS)</div>
                <div className="font-mono text-primary">
                  min: {averages.rmsMin.toFixed(4)} | max: {averages.rmsMax.toFixed(4)}
                </div>
                <div className="text-xs text-base-content/50">σ: {averages.rmsStd.toFixed(4)}</div>
              </div>
            </div>
          </div>
          
          {/* Временные паттерны */}
          <div>
            <h4 className="text-sm font-semibold text-base-content/70 mb-2">📈 Временные паттерны</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Активность</div>
                <div className="font-mono text-primary">
                  {((trends.activity?.activityRatio || 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Паузы</div>
                <div className="font-mono text-primary">
                  {((trends.activity?.avgSilenceDuration || 0) * 1000).toFixed(0)}ms
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Всплески</div>
                <div className="font-mono text-primary">
                  {((trends.activity?.avgBurstDuration || 0) * 1000).toFixed(0)}ms
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Скачки частоты</div>
                <div className="font-mono text-primary">
                  {trends.frequencyJumps?.actualJumps || 0} ({(trends.frequencyJumps?.densityPerSecond || 0).toFixed(1)}/с)
                </div>
              </div>
            </div>
          </div>
          
          {/* Тренды */}
          <div>
            <h4 className="text-sm font-semibold text-base-content/70 mb-2">📉 Выявленные тренды</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Громкость</div>
                <div className="font-mono text-primary">
                  {trends.trends?.volumeTrend === 'increasing' && '📈 Возрастает'}
                  {trends.trends?.volumeTrend === 'decreasing' && '📉 Убывает'}
                  {trends.trends?.volumeTrend === 'stable' && '➡️ Стабильна'}
                  {trends.trends?.volumeTrend === 'oscillating' && '🔄 Колеблется'}
                  {!trends.trends?.volumeTrend && '—'}
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Частота</div>
                <div className="font-mono text-primary">
                  {trends.trends?.frequencyTrend === 'increasing' && '📈 Возрастает'}
                  {trends.trends?.frequencyTrend === 'decreasing' && '📉 Убывает'}
                  {trends.trends?.frequencyTrend === 'stable' && '➡️ Стабильна'}
                  {trends.trends?.frequencyTrend === 'oscillating' && '🔄 Колеблется'}
                  {!trends.trends?.frequencyTrend && '—'}
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Стабильность</div>
                <div className="font-mono text-primary">
                  {trends.stability?.longTermStability || '—'}
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Периодичность</div>
                <div className="font-mono text-primary">
                  {trends.stability?.periodicity === 'regular' && '🔁 Регулярная'}
                  {trends.stability?.periodicity === 'semiRegular' && '🔄 Полурегулярная'}
                  {trends.stability?.periodicity === 'irregular' && '🎲 Нерегулярная'}
                  {trends.stability?.periodicity === 'random' && '🎯 Случайная'}
                  {trends.stability?.periodicity === 'none' && '❌ Отсутствует'}
                  {!trends.stability?.periodicity && '—'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Оценки состояний */}
          {stateScores.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-base-content/70 mb-2">🎯 Оценки состояний</h4>
              <div className="space-y-1">
                {stateScores.slice(0, 5).map((score: any, idx: number) => (
                  <div key={idx} className="bg-base-300 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{score.stateIcon}</span>
                        <span className="font-medium">{score.stateName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-base-content/50">
                          Спектр: {score.spectralScore.toFixed(0)}%
                        </span>
                        <span className="text-xs text-base-content/50">
                          Время: {score.temporalScore.toFixed(0)}%
                        </span>
                        <span className={`font-bold ${getConfidenceColor(score.score)}`}>
                          {score.score.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <progress 
                      className="progress progress-primary w-full h-1 mt-1" 
                      value={score.score} 
                      max="100"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Данные по тактам (первые 10) */}
          {tactData.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-base-content/70 mb-2">📋 Данные по тактам (первые 10)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-base-content/50 border-b border-base-300">
                    <tr>
                      <th className="text-left py-2">Такт</th>
                      <th className="text-left">Центр масс (Hz)</th>
                      <th className="text-left">Спектр. поток</th>
                      <th className="text-left">Громкость</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tactData.slice(0, 10).map((tact: any, idx: number) => (
                      <tr key={idx} className="border-b border-base-300/50">
                        <td className="py-2 font-mono">#{tact.tact}</td>
                        <td className="font-mono text-primary">{tact.centroid.toFixed(1)}</td>
                        <td className="font-mono text-primary">{tact.flux.toFixed(3)}</td>
                        <td className="font-mono text-primary">{tact.rms.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tactData.length > 10 && (
                  <div className="text-center text-xs text-base-content/50 mt-2">
                    ... и ещё {tactData.length - 10} тактов
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Итоги */}
          <div>
            <h4 className="text-sm font-semibold text-base-content/70 mb-2">📈 Итоги</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Основное состояние</div>
                <div className="font-mono text-primary">
                  {summary.primaryStateIcon} {summary.primaryStateName}
                </div>
                <div className={`font-bold ${getConfidenceColor(summary.confidence)}`}>
                  {summary.confidence.toFixed(1)}%
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Стабильность</div>
                <div className="font-mono text-primary">
                  {summary.stabilityScore.toFixed(1)}%
                </div>
              </div>
              {summary.alternativeStates && summary.alternativeStates.length > 0 && (
                <div className="col-span-2 bg-base-300 rounded-lg p-2">
                  <div className="text-base-content/50 mb-1">Альтернативные состояния</div>
                  <div className="flex gap-2 flex-wrap">
                    {summary.alternativeStates.map((alt: any, idx: number) => (
                      <span key={idx} className="text-xs bg-base-200 px-2 py-1 rounded">
                        {alt.stateName} ({alt.score.toFixed(0)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* JSON вывод */}
          <div>
            <h4 className="text-sm font-semibold text-base-content/70 mb-2">📄 Полный JSON отчёт</h4>
            <div className="bg-base-300 rounded-lg overflow-hidden">
              <ReactJson
                src={report}
                theme="monokai"
                collapsed={true}
                displayDataTypes={false}
                displayObjectSize={true}
                enableClipboard={true}
                style={{
                  backgroundColor: 'transparent',
                  fontSize: '11px',
                  padding: '12px',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FFTTrendsReportViewer;