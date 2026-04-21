// src/plugins/microphone2/widgets/PatternManager.tsx

import React, { useState, useEffect } from 'react';
import { UserPattern, PatternCreationFormData, DEFAULT_PATTERN_FORM } from '../types/patterns';
import { audioFileAnalyzer, 
    //AudioFileAnalysisConfig
} from '../services/AnalizerFFT.service';

//import { SOUND_STATES } from '../types';

interface PatternManagerProps {
  onPatternsChange: (patterns: Record<string, any>) => void;
  existingPatterns: Record<string, any>;
  onAction: (action: string, data?: any) => any;
}

const PatternManager: React.FC<PatternManagerProps> = ({ 
    onPatternsChange, 
    existingPatterns,
    onAction
}) => {
  const [patterns, setPatterns] = useState<UserPattern[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [showAudioLoader, setShowAudioLoader] = useState(false);
  const [editingPattern, setEditingPattern] = useState<UserPattern | null>(null);
  const [formData, setFormData] = useState<PatternCreationFormData>(DEFAULT_PATTERN_FORM);
  const [
    //audioFile
    , setAudioFile] = useState<File | null>(null);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  //const [audioAnalysisProgress, setAudioAnalysisProgress] = useState(0);

  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');

  const [analysisReport, setAnalysisReport] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);

  // Загрузка сохраненных паттернов
  useEffect(() => {
    const savedPatterns = localStorage.getItem('user_sound_patterns');
    if (savedPatterns) {
      const parsed = JSON.parse(savedPatterns);
      setPatterns(parsed);
      
      // Конвертируем в формат SOUND_STATES для детектора
      const patternsMap: Record<string, any> = {};
      parsed.forEach((pattern: UserPattern) => {
        patternsMap[pattern.id] = {
          key: pattern.id,
          name: pattern.name,
          icon: pattern.icon,
          color: pattern.color,
          description: pattern.description,
          thresholds: pattern.thresholds,
          temporalPatterns: pattern.temporalPatterns,
        };
      });
      
      onPatternsChange({ ...existingPatterns, ...patternsMap });
    }
  }, []);

  const savePatterns = (updatedPatterns: UserPattern[]) => {
    setPatterns(updatedPatterns);
    localStorage.setItem('user_sound_patterns', JSON.stringify(updatedPatterns));
    
    // Обновляем детектор
    const patternsMap: Record<string, any> = {};
    updatedPatterns.forEach((pattern) => {
      patternsMap[pattern.id] = {
        key: pattern.id,
        name: pattern.name,
        icon: pattern.icon,
        color: pattern.color,
        description: pattern.description,
        thresholds: pattern.thresholds,
        temporalPatterns: pattern.temporalPatterns,
      };
    });
    
    onPatternsChange({ ...existingPatterns, ...patternsMap });
  };

  const handleCreatePattern = () => {
    const newPattern: UserPattern = {
      id: `custom_${Date.now()}`,
      name: formData.name,
      icon: formData.icon,
      color: formData.color,
      description: formData.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isCustom: true,
      source: 'manual',
      thresholds: formData.thresholds,
      temporalPatterns: {
        centroidStd: { min: 50, max: 500 },
        fluxStd: { min: 0.1, max: 0.8 },
        rmsStd: { min: 0.01, max: 0.1 },
        activityRatio: { min: 0.4, max: 0.9 },
        avgSilenceDuration: { min: 0.05, max: 0.5 },
        avgBurstDuration: { min: 0.1, max: 1.0 },
        frequencyJumps: { 
          enabled: formData.temporalPatterns.volumeTrend.includes('oscillating'),
          minJumpsRequired: 5,
          densityPerSecond: { max: 20 }
        },
        volumeTrend: formData.temporalPatterns.volumeTrend,
        frequencyTrend: formData.temporalPatterns.frequencyTrend,
        longTermStability: formData.temporalPatterns.longTermStability,
        periodicity: formData.temporalPatterns.periodicity,
        envelopeShape: formData.temporalPatterns.envelopeShape,
        peakToAverageRatio: { min: 1.5, max: 5.0 },
      },
    };
    
    savePatterns([...patterns, newPattern]);
    setShowCreator(false);
    setFormData(DEFAULT_PATTERN_FORM);
  };

  const handleDeletePattern = (id: string) => {
    if (confirm('Удалить этот паттерн?')) {
      const updated = patterns.filter(p => p.id !== id);
      savePatterns(updated);
    }
  };

  const handleEditPattern = (pattern: UserPattern) => {
    setEditingPattern(pattern);
    setFormData({
      name: pattern.name,
      icon: pattern.icon,
      color: pattern.color,
      description: pattern.description,
      thresholds: pattern.thresholds,
      temporalPatterns: {
        volumeTrend: pattern.temporalPatterns.volumeTrend,
        frequencyTrend: pattern.temporalPatterns.frequencyTrend,
        longTermStability: pattern.temporalPatterns.longTermStability,
        periodicity: pattern.temporalPatterns.periodicity,
        envelopeShape: pattern.temporalPatterns.envelopeShape,
      },
    });
    setShowCreator(true);
  };

  const handleUpdatePattern = () => {
    if (!editingPattern) return;
    
    const updatedPattern: UserPattern = {
      ...editingPattern,
      name: formData.name,
      icon: formData.icon,
      color: formData.color,
      description: formData.description,
      updatedAt: Date.now(),
      thresholds: formData.thresholds,
      temporalPatterns: {
        ...editingPattern.temporalPatterns,
        volumeTrend: formData.temporalPatterns.volumeTrend,
        frequencyTrend: formData.temporalPatterns.frequencyTrend,
        longTermStability: formData.temporalPatterns.longTermStability,
        periodicity: formData.temporalPatterns.periodicity,
        envelopeShape: formData.temporalPatterns.envelopeShape,
      },
    };
    
    const updated = patterns.map(p => p.id === editingPattern.id ? updatedPattern : p);
    savePatterns(updated);
    setShowCreator(false);
    setEditingPattern(null);
    setFormData(DEFAULT_PATTERN_FORM);
  };

  const handleAudioFileUpload = async (file: File) => {
    setAudioFile(file);
    setIsAnalyzingAudio(true);
    setAnalysisProgress(0);
    setAnalysisStatus('Загрузка файла...');
    
    try {
        const detectorConfig = onAction('getConfig');
        
        const analysisConfig = {
        intervalMs: detectorConfig?.intervalMs || 30,
        fftSize: 2048,
        smoothingTimeConstant: 0.8,
        };
        
        setAnalysisStatus('Анализ аудио...');
        
        const result = await audioFileAnalyzer.analyzeAudioFile(
        file, 
        analysisConfig,
        (progress, status) => {
            setAnalysisProgress(progress);
            setAnalysisStatus(status);
        }
        );
        
        setAnalysisStatus('Генерация рекомендаций...');
        
        const recommendations = audioFileAnalyzer.generatePatternRecommendations(result);
        
        // Безопасно получаем значения из frequencyJumps
        const frequencyJumpsCount = result.temporalPatterns.frequencyJumps?.actualJumps || 0;
        
        setFormData({
        name: file.name.replace(/\.[^/.]+$/, ''),
        icon: '🎵',
        color: '#6bcf7f',
        description: `Анализ из файла: ${file.name}\nДлительность: ${result.duration.toFixed(1)}с\nФреймов: ${result.totalFrames}\nАктивность: ${(result.temporalPatterns.activityRatio * 100).toFixed(0)}%\nЧастотных скачков: ${frequencyJumpsCount}`,
        thresholds: recommendations.thresholds || {
            centroid: { min: 500, max: 3000 },
            flux: { min: 0.3, max: 2.0 },
            rms: { min: 0.05, max: 0.3 },
        },
        temporalPatterns: {
            volumeTrend: recommendations.temporalPatterns?.volumeTrend || ['stable'],
            frequencyTrend: recommendations.temporalPatterns?.frequencyTrend || ['stable'],
            longTermStability: recommendations.temporalPatterns?.longTermStability || ['medium'],
            periodicity: recommendations.temporalPatterns?.periodicity || ['irregular'],
            envelopeShape: recommendations.temporalPatterns?.envelopeShape || ['sustained'],
        },
        });
        
        console.log('[PatternManager] Analysis results:', {
        duration: result.duration,
        frames: result.totalFrames,
        statistics: {
            centroid: result.statistics.centroid,
            flux: result.statistics.flux,
            rms: result.statistics.rms,
        },
        temporalPatterns: {
            volumeTrend: result.temporalPatterns.volumeTrend,
            frequencyTrend: result.temporalPatterns.frequencyTrend,
            activityRatio: result.temporalPatterns.activityRatio,
            periodicity: result.temporalPatterns.periodicity,
            envelopeShape: result.temporalPatterns.envelopeShape,
            frequencyJumpsCount: result.temporalPatterns.frequencyJumps?.actualJumps || 0,
            frequencyJumpsDensity: result.temporalPatterns.frequencyJumps?.densityPerSecond || 0
        }
        });

        const { report } = await audioFileAnalyzer.analyzeAudioFileWithReport(
        file, 
        analysisConfig,
        (progress, status) => {
            setAnalysisProgress(progress);
            setAnalysisStatus(status);
        });
        setAnalysisReport(report);
        
        setAnalysisStatus('Готово!');
        
        setTimeout(() => {
        setIsAnalyzingAudio(false);
        setShowAudioLoader(false);
        setShowCreator(true);
        }, 1000);
        
    } catch (error) {
        console.error('[PatternManager] Analysis failed:', error);
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
        errorMessage = error.message;
        }
        setAnalysisStatus(`Ошибка: ${errorMessage}`);
        setTimeout(() => {
        setIsAnalyzingAudio(false);
        }, 2000);
    }
  };

  const getTrendOptions = () => ({
    volumeTrend: ['stable', 'increasing', 'decreasing', 'fluctuating', 'modulated', 'oscillating'],
    frequencyTrend: ['stable', 'increasing', 'decreasing', 'oscillating', 'modulated'],
    longTermStability: ['veryLow', 'low', 'medium', 'high', 'veryHigh'],
    periodicity: ['none', 'irregular', 'semiRegular', 'regular'],
    envelopeShape: ['impulsive', 'attackDecay', 'sustained', 'pluck', 'complex'],
  });

  const options = getTrendOptions();

  return (
    <div className="space-y-4">
      {/* Заголовок и кнопки */}
      <div className="flex justify-between items-center">
        <div className="text-xs font-semibold text-gray-400">🎨 Пользовательские паттерны</div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAudioLoader(true)}
            className="text-[10px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-1 rounded"
          >
            📁 Из файла
          </button>
          <button
            onClick={() => setShowCreator(true)}
            className="text-[10px] bg-success/20 hover:bg-success/30 text-success px-2 py-1 rounded"
          >
            + Создать
          </button>
        </div>
      </div>

      {/* Список паттернов */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {patterns.map(pattern => (
          <div
            key={pattern.id}
            className="flex items-center justify-between p-2 rounded-lg bg-base-300/30 hover:bg-base-300/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{pattern.icon}</span>
              <div>
                <div className="text-xs font-semibold">{pattern.name}</div>
                <div className="text-[9px] text-gray-500">
                  {pattern.source === 'audio_file' ? '🎵 Из аудио' : '✏️ Ручной'}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleEditPattern(pattern)}
                className="text-[10px] text-gray-400 hover:text-gray-300 px-1"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDeletePattern(pattern.id)}
                className="text-[10px] text-error/70 hover:text-error px-1"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        
        {patterns.length === 0 && (
          <div className="text-center text-gray-500 text-[10px] py-4">
            Нет пользовательских паттернов<br/>
            Создайте свой первый паттерн
          </div>
        )}
      </div>

      {/* Модальное окно загрузки аудио */}
      {showAudioLoader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-200 rounded-xl p-6 w-96 max-w-[90%]">
            <div className="text-lg mb-4">🎵 Загрузка аудио</div>
            
            {!isAnalyzingAudio ? (
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => e.target.files && handleAudioFileUpload(e.target.files[0])}
                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
              />
            ) : (
                <div className="space-y-3">
                    <div className="text-xs text-gray-400">{analysisStatus}</div>
                    <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                        className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${analysisProgress}%` }}
                    />
                    </div>
                    <div className="text-center text-[10px] text-gray-500">{analysisProgress}%</div>
                </div>
            )}
            
            <button
              onClick={() => {
                setShowAudioLoader(false);
                setIsAnalyzingAudio(false);
              }}
              className="mt-4 w-full text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно создания/редактирования паттерна */}
      {showCreator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-base-200 rounded-xl p-6 w-[500px] max-w-[90%] max-h-[90vh] overflow-y-auto">
            <div className="text-lg mb-4">
              {editingPattern ? '✏️ Редактирование паттерна' : '✨ Создание паттерна'}
            </div>
            
            <div className="space-y-4">
              {/* Основная информация */}
              <div>
                <label className="text-xs text-gray-400">Название</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-base-300 rounded px-3 py-2 text-sm mt-1"
                  placeholder="Например: Мой звук"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Иконка</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full bg-base-300 rounded px-3 py-2 text-sm mt-1"
                    placeholder="🎵"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Цвет</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 bg-base-300 rounded mt-1"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-base-300 rounded px-3 py-2 text-sm mt-1"
                  rows={2}
                  placeholder="Краткое описание звука..."
                />
              </div>
              
              {/* Спектральные пороги */}
              <div className="border-t border-gray-700 pt-3">
                <div className="text-xs font-semibold text-gray-400 mb-2">🎛 Спектральные характеристики</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500">Центр (Гц)</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={formData.thresholds.centroid.min}
                        onChange={(e) => setFormData({
                          ...formData,
                          thresholds: {
                            ...formData.thresholds,
                            centroid: { ...formData.thresholds.centroid, min: parseInt(e.target.value) }
                          }
                        })}
                        className="w-1/2 bg-base-300 rounded px-2 py-1 text-xs"
                        placeholder="min"
                      />
                      <input
                        type="number"
                        value={formData.thresholds.centroid.max}
                        onChange={(e) => setFormData({
                          ...formData,
                          thresholds: {
                            ...formData.thresholds,
                            centroid: { ...formData.thresholds.centroid, max: parseInt(e.target.value) }
                          }
                        })}
                        className="w-1/2 bg-base-300 rounded px-2 py-1 text-xs"
                        placeholder="max"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Поток</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.thresholds.flux.min}
                        onChange={(e) => setFormData({
                          ...formData,
                          thresholds: {
                            ...formData.thresholds,
                            flux: { ...formData.thresholds.flux, min: parseFloat(e.target.value) }
                          }
                        })}
                        className="w-1/2 bg-base-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={formData.thresholds.flux.max}
                        onChange={(e) => setFormData({
                          ...formData,
                          thresholds: {
                            ...formData.thresholds,
                            flux: { ...formData.thresholds.flux, max: parseFloat(e.target.value) }
                          }
                        })}
                        className="w-1/2 bg-base-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Громкость</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.thresholds.rms.min}
                        onChange={(e) => setFormData({
                          ...formData,
                          thresholds: {
                            ...formData.thresholds,
                            rms: { ...formData.thresholds.rms, min: parseFloat(e.target.value) }
                          }
                        })}
                        className="w-1/2 bg-base-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={formData.thresholds.rms.max}
                        onChange={(e) => setFormData({
                          ...formData,
                          thresholds: {
                            ...formData.thresholds,
                            rms: { ...formData.thresholds.rms, max: parseFloat(e.target.value) }
                          }
                        })}
                        className="w-1/2 bg-base-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Временные паттерны */}
              <div className="border-t border-gray-700 pt-3">
                <div className="text-xs font-semibold text-gray-400 mb-2">⏱ Временные паттерны</div>
                
                <div className="space-y-2">
                  {Object.entries(formData.temporalPatterns).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-[10px] text-gray-500">
                        {key === 'volumeTrend' && '📊 Тренд громкости'}
                        {key === 'frequencyTrend' && '🎵 Тренд частоты'}
                        {key === 'longTermStability' && '🔒 Стабильность'}
                        {key === 'periodicity' && '🔄 Периодичность'}
                        {key === 'envelopeShape' && '📈 Форма сигнала'}
                      </label>
                      <select
                        multiple
                        value={value as string[]}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                          setFormData({
                            ...formData,
                            temporalPatterns: {
                              ...formData.temporalPatterns,
                              [key]: selected
                            }
                          });
                        }}
                        className="w-full bg-base-300 rounded px-2 py-1 text-xs mt-1 min-h-[60px]"
                        size={Math.min(3, (options[key as keyof typeof options] || []).length)}
                      >
                        {(options[key as keyof typeof options] || []).map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div className="text-[8px] text-gray-500 mt-0.5">
                        Ctrl+клик для выбора нескольких
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={editingPattern ? handleUpdatePattern : handleCreatePattern}
                disabled={!formData.name}
                className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary py-2 rounded text-sm disabled:opacity-50"
              >
                {editingPattern ? '💾 Сохранить' : '✨ Создать'}
              </button>
              <button
                onClick={() => {
                  setShowCreator(false);
                  setEditingPattern(null);
                  setFormData(DEFAULT_PATTERN_FORM);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded text-sm"
              >
                Отмена
              </button>
            </div>

            {/* Экспорт отчета */}
        {analysisReport && (
  <div className="mt-4 space-y-2">
    <div className="flex gap-2">
      <button
        onClick={() => {
          const text = audioFileAnalyzer.exportLastReportAsText();
          if (text) {
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analysis_report_${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }}
        className="text-[10px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-1 rounded"
      >
        📄 Экспорт TXT
      </button>
      <button
        onClick={() => {
          const json = audioFileAnalyzer.exportLastReportAsJson();
          if (json) {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analysis_report_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }}
        className="text-[10px] bg-green-500/20 hover:bg-green-500/30 text-green-400 px-2 py-1 rounded"
      >
        📋 Экспорт JSON
      </button>
      <button
        onClick={() => setShowReport(!showReport)}
        className="text-[10px] bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 px-2 py-1 rounded"
      >
        {showReport ? '📊 Скрыть отчет' : '📊 Показать отчет'}
      </button>
    </div>
    </div>
    )}

    </div>
        </div>)}
    </div>
  );};

export default PatternManager;