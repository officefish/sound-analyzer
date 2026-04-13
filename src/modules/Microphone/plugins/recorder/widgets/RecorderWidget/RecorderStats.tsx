// src/plugins/microphone2/widgets/RecorderWidget/RecorderStats.tsx

import React, { useState } from 'react';

interface RecorderStatsProps {
  totalRecordings: number;
  savedFiles: string[];
  isElectronAvailable: boolean;
  pluginVersion: string;
  isMicActive: boolean;
  chunksCount: number;
  chunksSize: number;
  onClearChunks: () => void;
  onDownloadChunk?: (chunkId: string) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const RecorderStats: React.FC<RecorderStatsProps> = ({
  totalRecordings,
  savedFiles,
  isElectronAvailable,
  pluginVersion,
  isMicActive,
  chunksCount,
  chunksSize,
  onClearChunks,
  onDownloadChunk,
}) => {
  const [showFiles, setShowFiles] = useState(false);
  
  const hasData = totalRecordings > 0 || chunksCount > 0 || savedFiles.length > 0;
  
  return (
    <>
      <div className="text-[10px] text-gray-500 flex justify-between pt-1 border-t border-base-300">
        <span>📊 Записей: {totalRecordings}</span>
        <span>{isElectronAvailable ? '💾 Сохраняется в /media' : '📦 Хранится в чанках'}</span>
      </div>
      
      {hasData && (
        <button
          onClick={() => setShowFiles(!showFiles)}
          className="w-full text-[9px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          {showFiles ? '▲ Скрыть файлы' : '▼ Показать файлы'}
        </button>
      )}
      
      {showFiles && (
        <div className="space-y-2 p-2 rounded-lg bg-base-300/30">
          {isElectronAvailable ? (
            // Electron: показываем файлы из папки media
            <>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500">Файлов: {savedFiles.length}</span>
                {savedFiles.length > 0 && (
                  <button
                    onClick={onClearChunks}
                    className="text-error/70 hover:text-error text-[10px]"
                  >
                    🗑️ Очистить все
                  </button>
                )}
              </div>
              {savedFiles.length === 0 ? (
                <div className="text-[9px] text-gray-600 text-center py-1">
                  Нет сохранённых файлов
                </div>
              ) : (
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {savedFiles.slice(0, 5).map((file, idx) => (
                    <div key={idx} className="text-[9px] text-gray-500 truncate">
                      📄 {file}
                    </div>
                  ))}
                  {savedFiles.length > 5 && (
                    <div className="text-[8px] text-gray-600">
                      + ещё {savedFiles.length - 5} файлов
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            // Браузер: показываем чанки в памяти
            <>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500">Чанков: {chunksCount}</span>
                <span className="text-gray-500">Объём: {formatBytes(chunksSize)}</span>
                {chunksCount > 0 && (
                  <button
                    onClick={onClearChunks}
                    className="text-error/70 hover:text-error text-[10px]"
                  >
                    🗑️ Очистить
                  </button>
                )}
              </div>
              {chunksCount === 0 ? (
                <div className="text-[9px] text-gray-600 text-center py-1">
                  Нет сохранённых чанков
                </div>
              ) : (
                <div className="text-[9px] text-gray-500 text-center">
                  💡 Чанки автоматически удаляются при превышении лимита
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      <div className="text-[10px] text-gray-500 flex justify-between">
        <span className={isMicActive ? 'text-success' : 'text-gray-500'}>
          {isMicActive ? '🎤 Микрофон активен' : '⏸ Микрофон выключен'}
        </span>
        <span>🎛️ v{pluginVersion}</span>
      </div>
    </>
  );
};

export default React.memo(RecorderStats);