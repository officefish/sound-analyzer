// ModeToggle.tsx
import React from 'react';

interface StatsProps {
  totalAnalyses: number;
  detectionCount: number;
}

const PluginAnalysesStats: React.FC<StatsProps> = ({ 
    totalAnalyses, detectionCount
}) => {

  return (
    <div className="bg-base-300/30 rounded-lg p-2">
        <div className="text-[9px] text-gray-500 text-center mb-1">📊 Статистика анализов</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{totalAnalyses}</div>
              <div className="text-[8px] text-gray-500">Всего</div>
            </div>
            <div>
              <div className="text-lg font-bold text-warning">{detectionCount}</div>
              <div className="text-[8px] text-gray-500">Обнаружений</div>
            </div>
            <div>
              <div className="text-lg font-bold text-success">{totalAnalyses ? (detectionCount / totalAnalyses * 100).toFixed(0) : 0}%</div>
              <div className="text-[8px] text-gray-500">Успешность</div>
            </div>
          </div>
        </div>
  );
};

export default PluginAnalysesStats;
