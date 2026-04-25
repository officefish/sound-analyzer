// src/plugins/microphone2/components/SoundTemplateEditor.tsx

import React, { useState, useEffect } from 'react';
import { 
  PatternTemplate, 
  UserPatternTemplate,
  TemplateFormData, 
  DEFAULT_TEMPLATE_FORM_DATA,
  SoundTemplateEditorProps,
  isUserPattern,
  isSystemPattern
} from '../types';
import { usePatternTemplatesStore } from '../stores/patterns.store';
import { audioFileAnalyzer } from '../services/AnalizerFFT.service';

const SoundTemplateEditor: React.FC<SoundTemplateEditorProps> = ({ 
  template, 
  onSave, 
  onCancel,
  onDelete 
}) => {
  const { addTemplate, updateTemplate, deleteTemplate } = usePatternTemplatesStore();
  
  const [formData, setFormData] = useState<TemplateFormData>(DEFAULT_TEMPLATE_FORM_DATA);
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [analysisReport, setAnalysisReport] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'spectral' | 'temporal' | 'advanced'>('basic');

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        icon: template.icon,
        color: template.color,
        description: template.description,
        thresholds: template.thresholds,
        temporalPatterns: {
          volumeTrend: template.temporalPatterns.volumeTrend,
          frequencyTrend: template.temporalPatterns.frequencyTrend,
          longTermStability: template.temporalPatterns.longTermStability,
          periodicity: template.temporalPatterns.periodicity,
          envelopeShape: template.temporalPatterns.envelopeShape,
          centroidStd: template.temporalPatterns.centroidStd || { min: 50, max: 500 },
          fluxStd: template.temporalPatterns.fluxStd || { min: 0.1, max: 0.8 },
          rmsStd: template.temporalPatterns.rmsStd || { min: 0.01, max: 0.1 },
          activityRatio: template.temporalPatterns.activityRatio || { min: 0.4, max: 0.9 },
          avgSilenceDuration: template.temporalPatterns.avgSilenceDuration || { min: 0.05, max: 0.5 },
          avgBurstDuration: template.temporalPatterns.avgBurstDuration || { min: 0.1, max: 1.0 },
          frequencyJumps: template.temporalPatterns.frequencyJumps || {
            enabled: false,
            minJumpsRequired: 5,
            densityPerSecond: { max: 20 }
          },
          peakToAverageRatio: template.temporalPatterns.peakToAverageRatio || { min: 1.5, max: 5.0 },
        },
      });
    }
  }, [template]);

  const handleAudioFileUpload = async (file: File) => {
    setAudioFile(file);
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisStatus('Загрузка файла...');
    
    try {
      const analysisConfig = {
        intervalMs: 30,
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
      
      setFormData({
        name: file.name.replace(/\.[^/.]+$/, ''),
        icon: '🎵',
        color: '#6bcf7f',
        description: `Анализ из файла: ${file.name}\nДлительность: ${result.duration.toFixed(1)}с\nАктивность: ${(result.temporalPatterns.activityRatio * 100).toFixed(0)}%\nЧастотных скачков: ${result.temporalPatterns.frequencyJumps?.actualJumps || 0}`,
        thresholds: recommendations.thresholds || DEFAULT_TEMPLATE_FORM_DATA.thresholds,
        temporalPatterns: {
          volumeTrend: recommendations.temporalPatterns?.volumeTrend || ['stable'],
          frequencyTrend: recommendations.temporalPatterns?.frequencyTrend || ['stable'],
          longTermStability: recommendations.temporalPatterns?.longTermStability || ['medium'],
          periodicity: recommendations.temporalPatterns?.periodicity || ['irregular'],
          envelopeShape: recommendations.temporalPatterns?.envelopeShape || ['sustained'],
          centroidStd: { 
            min: result.statistics.centroid.std * 0.5, 
            max: result.statistics.centroid.std * 1.5 
          },
          fluxStd: { 
            min: result.statistics.flux.std * 0.5, 
            max: result.statistics.flux.std * 1.5 
          },
          rmsStd: { 
            min: result.statistics.rms.std * 0.5, 
            max: result.statistics.rms.std * 1.5 
          },
          activityRatio: { 
            min: Math.max(0, result.temporalPatterns.activityRatio - 0.2), 
            max: Math.min(1, result.temporalPatterns.activityRatio + 0.2) 
          },
          avgSilenceDuration: { 
            min: result.temporalPatterns.avgSilenceDuration * 0.5, 
            max: result.temporalPatterns.avgSilenceDuration * 1.5 
          },
          avgBurstDuration: { 
            min: result.temporalPatterns.avgBurstDuration * 0.5, 
            max: result.temporalPatterns.avgBurstDuration * 1.5 
          },
          frequencyJumps: {
            enabled: (result.temporalPatterns.frequencyJumps?.actualJumps || 0) > 3,
            minJumpsRequired: Math.max(3, Math.floor((result.temporalPatterns.frequencyJumps?.actualJumps || 0) * 0.7)),
            densityPerSecond: { 
              max: (result.temporalPatterns.frequencyJumps?.densityPerSecond || 10) * 1.5 
            }
          },
          peakToAverageRatio: { 
            min: result.temporalPatterns.peakToAverageRatio * 0.7, 
            max: result.temporalPatterns.peakToAverageRatio * 1.3 
          },
        },
      });
      
      // Получаем полный отчет для экспорта
      const { report } = await audioFileAnalyzer.analyzeAudioFileWithReport(
        file, 
        analysisConfig,
        (progress, status) => {
          setAnalysisProgress(progress);
          setAnalysisStatus(status);
        }
      );
      setAnalysisReport(report);
      
      setAnalysisStatus('Готово!');
      
      setTimeout(() => {
        setIsAnalyzing(false);
        setIsAudioMode(false);
      }, 1000);
      
    } catch (error) {
      console.error('[SoundTemplateEditor] Analysis failed:', error);
      setAnalysisStatus(`Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 2000);
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Введите название шаблона');
      return;
    }
    
    const templateData: Omit<UserPatternTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      key: template?.key || `user_${Date.now()}`,
      name: formData.name,
      icon: formData.icon,
      color: formData.color,
      description: formData.description,
      isSystem: false,
      isEnabled: true,
      source: audioFile ? 'audio_file' : 'manual',
      thresholds: formData.thresholds,
      temporalPatterns: formData.temporalPatterns,
    };
    
    if (template && isUserPattern(template)) {
      updateTemplate(template.id, templateData);
    } else {
      addTemplate(templateData);
    }
    
    if (onSave) onSave();
  };

  const handleDelete = () => {
    if (template && confirm(`Удалить шаблон "${template.name}"?`)) {
      deleteTemplate(template.id);
      if (onDelete) onDelete(template.id);
      if (onCancel) onCancel();
    }
  };

  const exportReportAsText = () => {
    if (analysisReport) {
      const text = audioFileAnalyzer.exportLastReportAsText();
      if (text) {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `template_analysis_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const exportReportAsJson = () => {
    if (analysisReport) {
      const json = audioFileAnalyzer.exportLastReportAsJson();
      if (json) {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `template_analysis_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const trendOptions = {
    volumeTrend: ['stable', 'increasing', 'decreasing', 'fluctuating', 'modulated', 'oscillating'],
    frequencyTrend: ['stable', 'increasing', 'decreasing', 'oscillating', 'modulated'],
    longTermStability: ['veryLow', 'low', 'medium', 'high', 'veryHigh'],
    periodicity: ['none', 'irregular', 'semiRegular', 'regular'],
    envelopeShape: ['impulsive', 'attackDecay', 'sustained', 'pluck', 'complex'],
  };

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm font-semibold">
            {template ? '✏️ Редактирование шаблона' : '✨ Создание шаблона'}
          </div>
          {template && (
            <div className="text-[9px] text-gray-500">
              {isSystemPattern(template) ? 'Системный шаблон (только копирование)' : 'Пользовательский шаблон'}
            </div>
          )}
        </div>
        
        {(!template || isUserPattern(template)) && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsAudioMode(true)}
              className="text-[10px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-1 rounded transition-colors"
            >
              🎵 Из аудио
            </button>
          </div>
        )}
      </div>

      {/* Навигация по секциям */}
      <div className="flex gap-1 border-b border-gray-700 overflow-x-auto">
        {(['basic', 'spectral', 'temporal', 'advanced'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-3 py-1 text-xs transition-colors whitespace-nowrap ${
              activeSection === section 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {section === 'basic' && '📝 Основное'}
            {section === 'spectral' && '🎛 Спектр'}
            {section === 'temporal' && '⏱ Временные'}
            {section === 'advanced' && '🔬 Расширенные'}
          </button>
        ))}
      </div>

      {/* Форма */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
        {/* Основная информация */}
        {activeSection === 'basic' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Название *</label>
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
                  className="w-full bg-base-300 rounded px-3 py-2 text-sm mt-1 text-center text-xl"
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
                rows={3}
                placeholder="Краткое описание звука..."
              />
            </div>
          </div>
        )}

        {/* Спектральные характеристики */}
        {activeSection === 'spectral' && (
          <div className="space-y-4">
            <div className="text-xs text-gray-400 mb-2">🎛 Спектральные пороги</div>
            
            <div>
              <label className="text-[10px] text-gray-500">Спектральный центр (Гц)</label>
              <div className="flex gap-2 mt-1">
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
                  className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  placeholder="min"
                />
                <span className="text-gray-500 text-xs">-</span>
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
                  className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  placeholder="max"
                />
              </div>
              <div className="text-[8px] text-gray-500 mt-0.5">
                Низкие частоты (50-500 Гц) - ударные, средние (500-2000 Гц) - голос, высокие (2000-5000 Гц) - металл
              </div>
            </div>
            
            <div>
              <label className="text-[10px] text-gray-500">Спектральный поток</label>
              <div className="flex gap-2 mt-1">
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
                  className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                />
                <span className="text-gray-500 text-xs">-</span>
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
                  className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="text-[8px] text-gray-500 mt-0.5">
                Низкий поток (&lt;0.5) - стабильный звук, высокий (&gt;1.5) - изменчивый
              </div>
            </div>
            
            <div>
              <label className="text-[10px] text-gray-500">Громкость (RMS)</label>
              <div className="flex gap-2 mt-1">
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
                  className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                />
                <span className="text-gray-500 text-xs">-</span>
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
                  className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="text-[8px] text-gray-500 mt-0.5">
                Тихие звуки (&lt;0.1), нормальные (0.1-0.3), громкие (&gt;0.3)
              </div>
            </div>
          </div>
        )}

        {/* Временные паттерны */}
        {activeSection === 'temporal' && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 mb-2">⏱ Временные характеристики</div>
            
            {Object.entries({
              volumeTrend: formData.temporalPatterns.volumeTrend,
              frequencyTrend: formData.temporalPatterns.frequencyTrend,
              longTermStability: formData.temporalPatterns.longTermStability,
              periodicity: formData.temporalPatterns.periodicity,
              envelopeShape: formData.temporalPatterns.envelopeShape,
            }).map(([key, value]) => (
              <div key={key}>
                <label className="text-[10px] text-gray-500">
                  {key === 'volumeTrend' && '📊 Тренд громкости'}
                  {key === 'frequencyTrend' && '🎵 Тренд частоты'}
                  {key === 'longTermStability' && '🔒 Долгосрочная стабильность'}
                  {key === 'periodicity' && '🔄 Периодичность'}
                  {key === 'envelopeShape' && '📈 Форма огибающей'}
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
                  size={Math.min(3, (trendOptions[key as keyof typeof trendOptions] || []).length)}
                >
                  {(trendOptions[key as keyof typeof trendOptions] || []).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="text-[8px] text-gray-500 mt-0.5">
                  Ctrl+клик для выбора нескольких
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Расширенные параметры */}
        {activeSection === 'advanced' && (
          <div className="space-y-4">
            <div className="text-xs text-gray-400 mb-2">🔬 Статистические параметры</div>
            
            {/* Стандартные отклонения */}
            <div className="space-y-3 p-3 rounded-lg bg-base-300/30">
              <div className="text-[10px] font-semibold text-gray-400">Стандартные отклонения</div>
              
              <div>
                <label className="text-[9px] text-gray-500">Станд. отклонение спектрального центра</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    step="1"
                    value={formData.temporalPatterns.centroidStd.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        centroidStd: { ...formData.temporalPatterns.centroidStd, min: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                  <span className="text-gray-500 text-xs">-</span>
                  <input
                    type="number"
                    step="1"
                    value={formData.temporalPatterns.centroidStd.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        centroidStd: { ...formData.temporalPatterns.centroidStd, max: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[9px] text-gray-500">Станд. отклонение спектрального потока</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temporalPatterns.fluxStd.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        fluxStd: { ...formData.temporalPatterns.fluxStd, min: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                  <span className="text-gray-500 text-xs">-</span>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temporalPatterns.fluxStd.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        fluxStd: { ...formData.temporalPatterns.fluxStd, max: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[9px] text-gray-500">Станд. отклонение громкости</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.temporalPatterns.rmsStd.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        rmsStd: { ...formData.temporalPatterns.rmsStd, min: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                  <span className="text-gray-500 text-xs">-</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.temporalPatterns.rmsStd.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        rmsStd: { ...formData.temporalPatterns.rmsStd, max: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
            
            {/* Активность и длительности */}
            <div className="space-y-3 p-3 rounded-lg bg-base-300/30">
              <div className="text-[10px] font-semibold text-gray-400">Активность и длительности</div>
              
              <div>
                <label className="text-[9px] text-gray-500">Коэффициент активности</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={formData.temporalPatterns.activityRatio.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        activityRatio: { ...formData.temporalPatterns.activityRatio, min: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                  <span className="text-gray-500 text-xs">-</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={formData.temporalPatterns.activityRatio.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        activityRatio: { ...formData.temporalPatterns.activityRatio, max: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[9px] text-gray-500">Средняя длительность тишины (сек)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.temporalPatterns.avgSilenceDuration.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        avgSilenceDuration: { ...formData.temporalPatterns.avgSilenceDuration, min: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                  <span className="text-gray-500 text-xs">-</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.temporalPatterns.avgSilenceDuration.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        avgSilenceDuration: { ...formData.temporalPatterns.avgSilenceDuration, max: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[9px] text-gray-500">Средняя длительность звука (сек)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.temporalPatterns.avgBurstDuration.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        avgBurstDuration: { ...formData.temporalPatterns.avgBurstDuration, min: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                  <span className="text-gray-500 text-xs">-</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.temporalPatterns.avgBurstDuration.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        avgBurstDuration: { ...formData.temporalPatterns.avgBurstDuration, max: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[9px] text-gray-500">Пик/Среднее отношение</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temporalPatterns.peakToAverageRatio.min}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        peakToAverageRatio: { ...formData.temporalPatterns.peakToAverageRatio, min: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                  <span className="text-gray-500 text-xs">-</span>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temporalPatterns.peakToAverageRatio.max}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        peakToAverageRatio: { ...formData.temporalPatterns.peakToAverageRatio, max: parseFloat(e.target.value) }
                      }
                    })}
                    className="flex-1 bg-base-300 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>
            
            {/* Частотные скачки */}
            <div className="space-y-3 p-3 rounded-lg bg-base-300/30">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-gray-400">📈 Частотные скачки</label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={formData.temporalPatterns.frequencyJumps.enabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      temporalPatterns: {
                        ...formData.temporalPatterns,
                        frequencyJumps: {
                          ...formData.temporalPatterns.frequencyJumps,
                          enabled: e.target.checked
                        }
                      }
                    })}
                    className="checkbox checkbox-xs checkbox-primary"
                  />
                  <span className="text-[9px] text-gray-500">Включить</span>
                </label>
              </div>
              
              {formData.temporalPatterns.frequencyJumps.enabled && (
                <>
                  <div>
                    <label className="text-[9px] text-gray-500">Мин. кол-во скачков</label>
                    <input
                      type="number"
                      value={formData.temporalPatterns.frequencyJumps.minJumpsRequired}
                      onChange={(e) => setFormData({
                        ...formData,
                        temporalPatterns: {
                          ...formData.temporalPatterns,
                          frequencyJumps: {
                            ...formData.temporalPatterns.frequencyJumps,
                            minJumpsRequired: parseInt(e.target.value)
                          }
                        }
                      })}
                      className="w-full bg-base-300 rounded px-2 py-1 text-xs mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[9px] text-gray-500">Макс. плотность (скачков/сек)</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.temporalPatterns.frequencyJumps.densityPerSecond.max}
                      onChange={(e) => setFormData({
                        ...formData,
                        temporalPatterns: {
                          ...formData.temporalPatterns,
                          frequencyJumps: {
                            ...formData.temporalPatterns.frequencyJumps,
                            densityPerSecond: { max: parseFloat(e.target.value) }
                          }
                        }
                      })}
                      className="w-full bg-base-300 rounded px-2 py-1 text-xs mt-1"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Отчет об анализе (если есть) */}
      {analysisReport && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={exportReportAsText}
              className="text-[10px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-1 rounded transition-colors"
            >
              📄 Экспорт TXT
            </button>
            <button
              onClick={exportReportAsJson}
              className="text-[10px] bg-green-500/20 hover:bg-green-500/30 text-green-400 px-2 py-1 rounded transition-colors"
            >
              📋 Экспорт JSON
            </button>
            <button
              onClick={() => setShowReport(!showReport)}
              className="text-[10px] bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 px-2 py-1 rounded transition-colors"
            >
              {showReport ? '📊 Скрыть отчет' : '📊 Показать отчет'}
            </button>
          </div>
          
          {showReport && (
            <div className="text-[9px] text-gray-400 max-h-48 overflow-y-auto p-2 bg-base-300/30 rounded">
              <pre className="whitespace-pre-wrap">{JSON.stringify(analysisReport, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!formData.name.trim()}
          className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary py-2 rounded text-sm disabled:opacity-50 transition-colors"
        >
          {template ? '💾 Сохранить изменения' : '✨ Создать шаблон'}
        </button>
        
        {(!template || isUserPattern(template)) && onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded text-sm transition-colors"
          >
            Отмена
          </button>
        )}
        
        {template && isUserPattern(template) && onDelete && (
          <button
            onClick={handleDelete}
            className="px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 rounded text-sm transition-colors"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Модальное окно загрузки аудио */}
      {isAudioMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-200 rounded-xl p-6 w-96 max-w-[90%]">
            <div className="text-lg mb-4">🎵 Анализ аудиофайла</div>
            
            {!isAnalyzing ? (
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
                setIsAudioMode(false);
                setIsAnalyzing(false);
              }}
              className="mt-4 w-full text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoundTemplateEditor;