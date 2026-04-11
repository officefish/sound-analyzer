import React from 'react';

interface VolumeWidgetProps {
  rawVolume: number;
  processedVolume: number;
  isRecording: boolean;
  recordingDuration: number;
}

const VolumeWidget: React.FC<VolumeWidgetProps> = ({
  rawVolume,
  processedVolume,
  isRecording,
  recordingDuration,
}) => {
  // Если не в записи, показываем нулевой уровень с прозрачностью
  const displayRawVolume = isRecording ? rawVolume : 0;
  const displayProcessedVolume = isRecording ? processedVolume : 0;
  
  const getVolumeColor = (volume: number, isActive: boolean) => {
    if (!isActive) return 'bg-gray-600';
    if (volume < 0.3) return 'bg-green-500';
    if (volume < 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const showNoiseGateEffect = isRecording && processedVolume !== rawVolume;
  
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Анимация микрофона */}
      <div className="relative">
        <div className={`text-8xl transition-all duration-300 ${isRecording ? 'scale-110' : 'scale-100 opacity-50'}`}>
          🎤
        </div>
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500/30 -z-10"></div>
            <div className="absolute inset-0 rounded-full animate-pulse bg-indigo-500/20 -z-10"></div>
          </>
        )}
      </div>
      
      {/* Raw уровень */}
      <div className="w-64">
        <div className="flex justify-between text-gray-400 text-xs mb-1">
          <span>🎧 Входной сигнал</span>
          <span className={!isRecording ? 'text-gray-600' : ''}>
            {Math.round(displayRawVolume * 100)}%
          </span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getVolumeColor(displayRawVolume, isRecording)}`}
            style={{ width: `${displayRawVolume * 100}%` }}
          />
        </div>
      </div>
      
      {/* Обработанный уровень */}
      {showNoiseGateEffect && (
        <div className="w-64">
          <div className="flex justify-between text-gray-400 text-xs mb-1">
            <span>🔧 После обработки</span>
            <span>{Math.round(displayProcessedVolume * 100)}%</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getVolumeColor(displayProcessedVolume, isRecording)}`}
              style={{ width: `${displayProcessedVolume * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Текущий уровень */}
      {isRecording && (
        <div className="text-center animate-pulse">
          <div className="text-3xl font-mono text-green-400">
            {Math.round((showNoiseGateEffect ? displayProcessedVolume : displayRawVolume) * 100)}%
          </div>
          <div className="text-gray-500 text-xs mt-1">
            {showNoiseGateEffect ? 'уровень после фильтрации' : 'уровень сигнала'}
          </div>
          <div className="text-gray-600 text-xs mt-1">
            ⏱ {formatDuration(recordingDuration)}
          </div>
        </div>
      )}
      
      {/* Сообщение о выключении */}
      {!isRecording && (
        <div className="text-center">
          <div className="text-gray-500 text-sm">Микрофон выключен</div>
          <div className="text-gray-600 text-xs mt-1">Нажмите "Включить" для начала</div>
        </div>
      )}
    </div>
  );
};

export default React.memo(VolumeWidget);

// import React from 'react';

// interface VolumeWidgetProps {
//   rawVolume: number;
//   processedVolume: number;
//   isRecording: boolean;
//   recordingDuration: number;
// }

// const VolumeWidget: React.FC<VolumeWidgetProps> = ({
//   rawVolume,
//   processedVolume,
//   isRecording,
//   recordingDuration,
// }) => {
//   const getVolumeColor = (volume: number) => {
//     if (volume < 0.3) return 'bg-green-500';
//     if (volume < 0.6) return 'bg-yellow-500';
//     return 'bg-red-500';
//   };
  
//   const formatDuration = (seconds: number): string => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   };
  
//   const showNoiseGateEffect = processedVolume !== rawVolume;
  
//   return (
//     <div className="flex flex-col items-center justify-center gap-6">
//       {/* Анимация микрофона */}
//       <div className="relative">
//         <div className={`text-8xl transition-all duration-100 ${isRecording ? 'scale-110' : 'scale-100'}`}>
//           🎤
//         </div>
//         {isRecording && (
//           <>
//             <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500/30 -z-10"></div>
//             <div className="absolute inset-0 rounded-full animate-pulse bg-indigo-500/20 -z-10"></div>
//           </>
//         )}
//       </div>
      
//       {/* Raw уровень */}
//       <div className="w-64">
//         <div className="flex justify-between text-gray-400 text-xs mb-1">
//           <span>🎧 Входной сигнал</span>
//           <span>{Math.round(rawVolume * 100)}%</span>
//         </div>
//         <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
//           <div
//             className={`h-full transition-all duration-75 ${getVolumeColor(rawVolume)}`}
//             style={{ width: `${rawVolume * 100}%` }}
//           />
//         </div>
//       </div>
      
//       {/* Обработанный уровень */}
//       {showNoiseGateEffect && (
//         <div className="w-64">
//           <div className="flex justify-between text-gray-400 text-xs mb-1">
//             <span>🔧 После обработки</span>
//             <span>{Math.round(processedVolume * 100)}%</span>
//           </div>
//           <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
//             <div
//               className={`h-full transition-all duration-75 ${getVolumeColor(processedVolume)}`}
//               style={{ width: `${processedVolume * 100}%` }}
//             />
//           </div>
//         </div>
//       )}
      
//       {/* Текущий уровень */}
//       {isRecording && (
//         <div className="text-center">
//           <div className="text-3xl font-mono text-green-400">
//             {Math.round((showNoiseGateEffect ? processedVolume : rawVolume) * 100)}%
//           </div>
//           <div className="text-gray-500 text-xs mt-1">
//             {showNoiseGateEffect ? 'уровень после фильтрации' : 'уровень сигнала'}
//           </div>
//           <div className="text-gray-600 text-xs mt-1">
//             ⏱ {formatDuration(recordingDuration)}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default React.memo(VolumeWidget);