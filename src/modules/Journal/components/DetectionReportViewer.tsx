import React, { useState } from 'react';
import ReactJson from 'react-json-view';

interface DetectionReportViewerProps {
  report: any;
}

const DetectionReportViewer: React.FC<DetectionReportViewerProps> = ({ report }) => {
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
  const strictness = report.strictness || report.mode || 'normal';
  const samplesCount = report.samplesCount || report.tactData?.length || 0;
  const validSamples = report.validSamples || 0;
  const isDrone = report.isDrone || report.result === 'drone' || false;
  const timestamp = report.timestamp || Date.now();
  const intervalMs = report.intervalMs || 500;
  const totalAnalysisTimeMs = report.totalAnalysisTimeMs || (intervalMs * samplesCount);
  const tactData = report.tactData || [];
  const summary = report.summary || {
    totalDetections: 0,
    detectionRate: '0%',
    centerOfMassDetectionRate: '0%',
    spectralFluxDetectionRate: '0%',
    loudnessDetectionRate: '0%',
  };
  const parameters = report.parameters || {
    centerOfMass: { threshold: [0, 0] },
    spectralFlux: { threshold: [0, 0] },
    loudness: { threshold: [0, 0] },
  };
  const averages = report.averages || {
    centerOfMass: 0,
    spectralFlux: 0,
    loudness: 0,
  };
  const reportTags = report.tags || ['analysis', 'fft', strictness, isDrone ? 'drone' : 'calm'];
  
  const totalTimeSec = (totalAnalysisTimeMs / 1000).toFixed(1);
  const successRate = samplesCount > 0 ? ((validSamples / samplesCount) * 100).toFixed(1) : '0';
  
  const getStatusColor = () => {
    if (isDrone) return 'text-red-400 bg-red-500/10 border-red-500/30';
    return 'text-green-400 bg-green-500/10 border-green-500/30';
  };
  
  const getDetectionRateColor = (rate: string) => {
    const percent = parseInt(rate);
    if (isNaN(percent)) return 'text-gray-400';
    if (percent >= 80) return 'text-green-400';
    if (percent >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  // Экспорт в TXT
  const exportToTxt = () => {
    const lines = [];
    lines.push('='.repeat(80));
    lines.push(`FFT DETECTOR ANALYSIS REPORT #${detectionNumber}`);
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Detector: FFTDetector v1.0.0`);
    lines.push(`Result: ${isDrone ? '🚁 DRONE DETECTED' : '✅ NO DRONE'}`);
    lines.push(`Strictness: ${strictness}`);
    lines.push(`Tags: ${reportTags.join(', ')}`);
    lines.push(`Timestamp: ${new Date(timestamp).toLocaleString()}`);
    lines.push(`Analysis time: ${totalTimeSec}s (${intervalMs}ms × ${samplesCount} samples)`);
    lines.push(`Valid samples: ${validSamples}/${samplesCount} (${successRate}%)`);
    lines.push('');
    lines.push('AVERAGE VALUES:');
    lines.push(`  Center of Mass: ${averages.centerOfMass.toFixed(1)} Hz`);
    lines.push(`  Spectral Flux: ${averages.spectralFlux.toFixed(3)}`);
    lines.push(`  Loudness: ${averages.loudness.toFixed(3)}`);
    lines.push('');
    lines.push('PARAMETERS:');
    lines.push(`  Center of Mass threshold: ${parameters.centerOfMass?.threshold?.[0] || 0} - ${parameters.centerOfMass?.threshold?.[1] || 0} Hz`);
    lines.push(`  Spectral Flux threshold: ${parameters.spectralFlux?.threshold?.[0] || 0} - ${parameters.spectralFlux?.threshold?.[1] || 0}`);
    lines.push(`  Loudness threshold: ${parameters.loudness?.threshold?.[0] || 0} - ${parameters.loudness?.threshold?.[1] || 0}`);
    lines.push('');
    lines.push('TACT DATA:');
    lines.push('  # | Center Mass | Spectral Flux | Loudness | Result');
    lines.push('  ' + '-'.repeat(60));
    if (tactData.length > 0) {
      tactData.forEach((tact: any, idx: number) => {
        const status = tact.overallDetected ? 'DRONE' : 'NORMAL';
        const tactNum = tact.tact || idx + 1;
        lines.push(`  ${String(tactNum).padStart(2)} | ${(tact.centerOfMass || 0).toFixed(1).padStart(8)} Hz | ${(tact.spectralFlux || 0).toFixed(3).padStart(12)} | ${(tact.loudness || 0).toFixed(3).padStart(8)} | ${status}`);
      });
    } else {
      lines.push('  No tact data available');
    }
    lines.push('');
    lines.push('SUMMARY:');
    lines.push(`  Total detections: ${summary.totalDetections || 0}/${tactData.length} (${summary.detectionRate || '0%'})`);
    lines.push(`  Center of Mass detection rate: ${summary.centerOfMassDetectionRate || '0%'}`);
    lines.push(`  Spectral Flux detection rate: ${summary.spectralFluxDetectionRate || '0%'}`);
    lines.push(`  Loudness detection rate: ${summary.loudnessDetectionRate || '0%'}`);
    lines.push('');
    lines.push('='.repeat(80));
    
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fft_detector_report_${detectionNumber}_${Date.now()}.txt`;
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
    a.download = `fft_detector_report_${detectionNumber}_${Date.now()}.json`;
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
          <span className="text-lg">{isDrone ? '🚁' : '✅'}</span>
          <span className="text-xs text-gray-500 font-mono">#{detectionNumber}</span>
          <span className="text-xs text-gray-500">[FFTDetector]</span>
          {/* ✅ Теги из отчёта */}
          {reportTags.map((tag: string) => (
            <span key={tag} className="text-[9px] bg-base-300 px-1.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        
        {/* Основной статус и метрики */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isDrone ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="font-bold">
              {isDrone ? '🚁 ДРОН ОБНАРУЖЕН' : '✅ ДРОН НЕ ОБНАРУЖЕН'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span>📊 {strictness}</span>
            <span>⏱️ {totalTimeSec}с</span>
            <span>🎯 {validSamples}/{samplesCount}</span>
            <span className="text-xs">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>
        
        {/* Дополнительная информация (время) */}
        <div className="text-xs text-gray-500 mt-1">
          {new Date(timestamp).toLocaleString()}
        </div>
      </div>
      
      {/* Краткая статистика (всегда видна) */}
      <div className="p-4 border-b border-base-300 bg-base-300/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xs text-base-content/50">Тактов</div>
            <div className="text-xl font-bold text-primary">{samplesCount}</div>
          </div>
          <div>
            <div className="text-xs text-base-content/50">Детекций</div>
            <div className="text-xl font-bold text-success">{validSamples}</div>
          </div>
          <div>
            <div className="text-xs text-base-content/50">Вероятность угрозы</div>
            <div className="text-xl font-bold text-info">{successRate}%</div>
          </div>
          <div>
            <div className="text-xs text-base-content/50">Интервал</div>
            <div className="text-xl font-bold text-primary">{intervalMs}мс</div>
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
              <span className="text-primary font-mono">FFTDetector v1.0.0</span>
              <span className="text-base-content/50">Метод:</span>
              <span className="text-primary">Быстрое преобразование Фурье</span>
            </div>
          </div>
          
          {/* Пороговые значения */}
          {parameters.centerOfMass?.threshold && (
            <div>
              <h4 className="text-sm font-semibold text-base-content/70 mb-2">📐 Пороговые значения</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-base-300 rounded-lg p-2">
                  <div className="text-base-content/50">Центр масс</div>
                  <div className="font-mono text-primary">
                    {parameters.centerOfMass.threshold[0]} - {parameters.centerOfMass.threshold[1]} Hz
                  </div>
                </div>
                <div className="bg-base-300 rounded-lg p-2">
                  <div className="text-base-content/50">Спектр. поток</div>
                  <div className="font-mono text-primary">
                    {parameters.spectralFlux?.threshold?.[0] || 0} - {parameters.spectralFlux?.threshold?.[1] || 0}
                  </div>
                </div>
                <div className="bg-base-300 rounded-lg p-2">
                  <div className="text-base-content/50">Громкость</div>
                  <div className="font-mono text-primary">
                    {parameters.loudness?.threshold?.[0] || 0} - {parameters.loudness?.threshold?.[1] || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Данные по тактам */}
          {tactData.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-base-content/70 mb-2">📋 Данные по тактам</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-base-content/50 border-b border-base-300">
                    <tr>
                      <th className="text-left py-2">Такт</th>
                      <th className="text-left">Центр масс (Hz)</th>
                      <th className="text-left">Спектр. поток</th>
                      <th className="text-left">Громкость</th>
                      <th className="text-left">Результат</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tactData.map((tact: any, idx: number) => (
                      <tr key={idx} className="border-b border-base-300/50">
                        <td className="py-2 font-mono">#{tact.tact || idx + 1}</td>
                        <td className={`font-mono ${tact.centerOfMassDetected ? 'text-green-400' : 'text-red-400'}`}>
                          {(tact.centerOfMass || 0).toFixed(1)}
                        </td>
                        <td className={`font-mono ${tact.spectralFluxDetected ? 'text-green-400' : 'text-red-400'}`}>
                          {(tact.spectralFlux || 0).toFixed(3)}
                        </td>
                        <td className={`font-mono ${tact.loudnessDetected ? 'text-green-400' : 'text-red-400'}`}>
                          {(tact.loudness || 0).toFixed(3)}
                        </td>
                        <td>
                          {tact.overallDetected ? (
                            <span className="text-red-400">🚁 Дрон</span>
                          ) : (
                            <span className="text-green-400">✅ Норма</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Итоги */}
          <div>
            <h4 className="text-sm font-semibold text-base-content/70 mb-2">📈 Итоги</h4>
            
            {/* Средние значения параметров */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-base-300 rounded-lg p-2 text-center">
                <div className="text-xs text-base-content/50">Средний центр масс</div>
                <div className="text-sm font-mono text-primary">
                  {averages.centerOfMass.toFixed(1)} Hz
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-2 text-center">
                <div className="text-xs text-base-content/50">Средний спектр. поток</div>
                <div className="text-sm font-mono text-primary">
                  {averages.spectralFlux.toFixed(3)}
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-2 text-center">
                <div className="text-xs text-base-content/50">Средняя громкость</div>
                <div className="text-sm font-mono text-primary">
                  {averages.loudness.toFixed(3)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Обнаружений</div>
                <div className="font-mono text-primary">
                  {summary.totalDetections || 0}/{tactData.length} ({summary.detectionRate || '0%'})
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Центр масс</div>
                <div className={`font-mono ${getDetectionRateColor(summary.centerOfMassDetectionRate || '0%')}`}>
                  {summary.centerOfMassDetectionRate || '0%'}
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Спектр. поток</div>
                <div className={`font-mono ${getDetectionRateColor(summary.spectralFluxDetectionRate || '0%')}`}>
                  {summary.spectralFluxDetectionRate || '0%'}
                </div>
              </div>
              <div className="bg-base-300 rounded-lg p-2">
                <div className="text-base-content/50">Громкость</div>
                <div className={`font-mono ${getDetectionRateColor(summary.loudnessDetectionRate || '0%')}`}>
                  {summary.loudnessDetectionRate || '0%'}
                </div>
              </div>
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

export default DetectionReportViewer;