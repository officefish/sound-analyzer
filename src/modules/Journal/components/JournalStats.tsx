import React from 'react';

interface JournalStatsProps {
  totalCount: number;
  filteredCount: number;
  droneCount: number;
  calmCount: number;
}

const JournalStats: React.FC<JournalStatsProps> = ({
  totalCount,
  filteredCount,
  droneCount,
  calmCount,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-base-content/50">
      <div className="flex items-start gap-2">
        <span className="text-primary">📊 Всего:</span>
        <span className="text-primary font-mono">{totalCount}</span>
      </div>
      {filteredCount !== totalCount && (
        <div className="flex items-center gap-2">
          <span className="text-primary">🔍 Отфильтровано:</span>
          <span className="font-mono text-primary">{filteredCount}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-primary">🚁 Дрон:</span>
        <span className="font-mono text-primary">{droneCount}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-primary">✅ Нет тревоги:</span>
        <span className="font-mono text-primary">{calmCount}</span>
      </div>
    </div>
  );
};

export default JournalStats;