// src/plugins/microphone2/widgets/RecorderWidget/ChunkManager.tsx

import React, { useState } from 'react';

interface ChunkManagerProps {
  isElectronAvailable: boolean;
  maxChunkSize: number;
  onMaxChunkSizeChange: (mb: number) => void;
  chunksCount: number;
  chunksSize: number;
  onClearChunks: () => void;
  totalStorageLimit?: number; // Лимит хранилища в MB (для Electron)
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const ChunkManager: React.FC<ChunkManagerProps> = ({
  isElectronAvailable,
  maxChunkSize,
  onMaxChunkSizeChange,
  chunksCount,
  chunksSize,
  onClearChunks,
  totalStorageLimit = 500, // Максимальный лимит хранилища в MB
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Расчёт процента использованного места (относительно maxChunkSize)
  const usedPercent = (chunksSize / (maxChunkSize * 1024 * 1024)) * 100;
  const isNearLimit = usedPercent > 80;
  const isOverLimit = usedPercent >= 100;
  
  const handleSizeChange = (mb: number) => {
    const newValue = Math.max(10, Math.min(totalStorageLimit, mb));
    onMaxChunkSizeChange(newValue);
  };

   // Форматируем использованное место для отображения в кнопке
  const formattedUsed = formatBytes(chunksSize);
  const formattedTotal = `${maxChunkSize} MB`;
  
  return (
    <div className="pt-1 border-t border-base-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1"
      >
        <span>{isOpen ? '▲' : '▼'}</span>
        <span>📦 Управление данными</span>
        {chunksCount > 0 && (
          <span className="ml-1 text-[9px] text-primary">
            ({formattedUsed} / {formattedTotal})
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="mt-2 space-y-2">
          {/* Информация о хранилище */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Использовано:</span>
              <span className={`font-mono ${isOverLimit ? 'text-error' : isNearLimit ? 'text-warning' : 'text-primary'}`}>
                {formatBytes(chunksSize)} / {maxChunkSize} MB
              </span>
            </div>
            
            <div className="relative h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${
                  isOverLimit ? 'bg-error' : isNearLimit ? 'bg-warning' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, usedPercent)}%` }}
              />
            </div>
            
            <div className="text-[9px] text-gray-500 text-center">
              {isOverLimit 
                ? '⚠️ Лимит превышен! Очистите данные или увеличьте лимит'
                : isNearLimit 
                  ? '⚠️ Приближаетесь к лимиту'
                  : `${usedPercent.toFixed(1)}% от лимита ${maxChunkSize} MB`}
            </div>
          </div>
          
          {/* Настройка размера чанка (только для браузера) */}
          {!isElectronAvailable && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">📦 Макс. размер хранилища:</span>
                <span className="text-primary font-mono">{maxChunkSize} MB</span>
              </div>
              <input
                type="range"
                min={10}
                max={totalStorageLimit}
                step={10}
                value={maxChunkSize}
                onChange={(e) => handleSizeChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-3 
                  [&::-webkit-slider-thumb]:h-3 
                  [&::-webkit-slider-thumb]:rounded-full 
                  [&::-webkit-slider-thumb]:bg-primary 
                  [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-gray-500">
                <span>10 MB</span>
                <span>250 MB</span>
                <span>{totalStorageLimit} MB</span>
              </div>
            </div>
          )}
          
          {/* Для Electron — показываем информацию о файловой системе */}
          {isElectronAvailable && (
            <div className="text-[9px] text-gray-500 text-center">
              💾 Файлы сохраняются в папку /media
            </div>
          )}
          
          {/* Список чанков/файлов */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">
                {isElectronAvailable ? 'Файлов:' : 'Чанков:'} {chunksCount}
              </span>
              {chunksCount > 0 && (
                <button
                  onClick={onClearChunks}
                  className="text-error/70 hover:text-error text-[10px] transition-colors"
                >
                  🗑️ Очистить всё
                </button>
              )}
            </div>
            {chunksCount === 0 && (
              <div className="text-[9px] text-gray-600 text-center py-1">
                Нет сохранённых данных
              </div>
            )}
            {chunksCount > 0 && !isElectronAvailable && (
              <div className="text-[9px] text-gray-500 text-center">
                💡 Старые данные автоматически удаляются при превышении лимита
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ChunkManager);