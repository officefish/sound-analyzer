import React from 'react';
import { Progress } from 'react-daisyui';

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
  // Если не в записи, показываем нулевой уровень
  const displayRawVolume = isRecording ? rawVolume : 0;
  const displayProcessedVolume = isRecording ? processedVolume : 0;
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getProgressColor = (volume: number) => {
    if (volume < 0.3) return 'success';
    if (volume < 0.6) return 'warning';
    return 'error';
  };
  
  const showNoiseGateEffect = isRecording && processedVolume !== rawVolume;
  
  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body p-6">
        {/* Анимация микрофона */}
        <div className="flex justify-center">
          <div className="relative">
            <div className={`text-7xl transition-all duration-300 ${isRecording ? 'scale-110 text-primary' : 'opacity-50'}`}>
              🎤
            </div>
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-full animate-ping bg-primary/30 -z-10"></div>
                <div className="absolute inset-0 rounded-full animate-pulse bg-primary/20 -z-10"></div>
              </>
            )}
          </div>
        </div>
        
        {/* Raw уровень */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-base-content/70">🎧 Входной сигнал</span>
            <span className={`font-mono ${!isRecording && 'text-base-content/30'}`}>
              {Math.round(displayRawVolume * 100)}%
            </span>
          </div>
          <Progress
            value={displayRawVolume * 100}
            max={100}
            color={getProgressColor(displayRawVolume)}
            className="transition-all duration-300"
          />
        </div>
        
        {/* Обработанный уровень */}
        {showNoiseGateEffect && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-base-content/70">🔧 После обработки</span>
              <span className="font-mono">{Math.round(displayProcessedVolume * 100)}%</span>
            </div>
            <Progress
              value={displayProcessedVolume * 100}
              max={100}
              color={getProgressColor(displayProcessedVolume)}
              className="transition-all duration-300"
            />
          </div>
        )}
        
        {/* Текущий уровень */}
        {isRecording && (
          <div className="text-center mt-2">
            <div className="text-2xl font-mono text-primary font-bold animate-pulse">
              {Math.round((showNoiseGateEffect ? displayProcessedVolume : displayRawVolume) * 100)}%
            </div>
            <div className="text-xs text-base-content/50 mt-1">
              {showNoiseGateEffect ? 'уровень после фильтрации' : 'уровень сигнала'}
            </div>
            <div className="text-xs text-base-content/40 mt-1">
              ⏱ {formatDuration(recordingDuration)}
            </div>
          </div>
        )}
        
        {/* Сообщение о выключении */}
        {!isRecording && (
          <div className="text-center mt-2">
            <div className="text-sm text-base-content/50">Микрофон выключен</div>
            <div className="text-xs text-base-content/30 mt-1">Нажмите "Включить" для начала</div>
          </div>
        )}
      </div>
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
//   // Если не в записи, показываем нулевой уровень с прозрачностью
//   const displayRawVolume = isRecording ? rawVolume : 0;
//   const displayProcessedVolume = isRecording ? processedVolume : 0;
  
//   const getVolumeColor = (volume: number, isActive: boolean) => {
//     if (!isActive) return 'bg-gray-600';
//     if (volume < 0.3) return 'bg-green-500';
//     if (volume < 0.6) return 'bg-yellow-500';
//     return 'bg-red-500';
//   };
  
//   const formatDuration = (seconds: number): string => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   };
  
//   const showNoiseGateEffect = isRecording && processedVolume !== rawVolume;
  
//   return (
//     <div className="flex flex-col items-center justify-center gap-6">
//       {/* Анимация микрофона */}
//       <div className="relative">
//         <div className={`text-8xl transition-all duration-300 ${isRecording ? 'scale-110' : 'scale-100 opacity-50'}`}>
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
//           <span className={!isRecording ? 'text-gray-600' : ''}>
//             {Math.round(displayRawVolume * 100)}%
//           </span>
//         </div>
//         <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
//           <div
//             className={`h-full transition-all duration-300 ${getVolumeColor(displayRawVolume, isRecording)}`}
//             style={{ width: `${displayRawVolume * 100}%` }}
//           />
//         </div>
//       </div>
      
//       {/* Обработанный уровень */}
//       {showNoiseGateEffect && (
//         <div className="w-64">
//           <div className="flex justify-between text-gray-400 text-xs mb-1">
//             <span>🔧 После обработки</span>
//             <span>{Math.round(displayProcessedVolume * 100)}%</span>
//           </div>
//           <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
//             <div
//               className={`h-full transition-all duration-300 ${getVolumeColor(displayProcessedVolume, isRecording)}`}
//               style={{ width: `${displayProcessedVolume * 100}%` }}
//             />
//           </div>
//         </div>
//       )}
      
//       {/* Текущий уровень */}
//       {isRecording && (
//         <div className="text-center animate-pulse">
//           <div className="text-3xl font-mono text-green-400">
//             {Math.round((showNoiseGateEffect ? displayProcessedVolume : displayRawVolume) * 100)}%
//           </div>
//           <div className="text-gray-500 text-xs mt-1">
//             {showNoiseGateEffect ? 'уровень после фильтрации' : 'уровень сигнала'}
//           </div>
//           <div className="text-gray-600 text-xs mt-1">
//             ⏱ {formatDuration(recordingDuration)}
//           </div>
//         </div>
//       )}
      
//       {/* Сообщение о выключении */}
//       {!isRecording && (
//         <div className="text-center">
//           <div className="text-gray-500 text-sm">Микрофон выключен</div>
//           <div className="text-gray-600 text-xs mt-1">Нажмите "Включить" для начала</div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default React.memo(VolumeWidget);

// // import React from 'react';

// // interface VolumeWidgetProps {
// //   rawVolume: number;
// //   processedVolume: number;
// //   isRecording: boolean;
// //   recordingDuration: number;
// // }

// // const VolumeWidget: React.FC<VolumeWidgetProps> = ({
// //   rawVolume,
// //   processedVolume,
// //   isRecording,
// //   recordingDuration,
// // }) => {
// //   const getVolumeColor = (volume: number) => {
// //     if (volume < 0.3) return 'bg-green-500';
// //     if (volume < 0.6) return 'bg-yellow-500';
// //     return 'bg-red-500';
// //   };
  
// //   const formatDuration = (seconds: number): string => {
// //     const mins = Math.floor(seconds / 60);
// //     const secs = seconds % 60;
// //     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
// //   };
  
// //   const showNoiseGateEffect = processedVolume !== rawVolume;
  
// //   return (
// //     <div className="flex flex-col items-center justify-center gap-6">
// //       {/* Анимация микрофона */}
// //       <div className="relative">
// //         <div className={`text-8xl transition-all duration-100 ${isRecording ? 'scale-110' : 'scale-100'}`}>
// //           🎤
// //         </div>
// //         {isRecording && (
// //           <>
// //             <div className="absolute inset-0 rounded-full animate-ping bg-indigo-500/30 -z-10"></div>
// //             <div className="absolute inset-0 rounded-full animate-pulse bg-indigo-500/20 -z-10"></div>
// //           </>
// //         )}
// //       </div>
      
// //       {/* Raw уровень */}
// //       <div className="w-64">
// //         <div className="flex justify-between text-gray-400 text-xs mb-1">
// //           <span>🎧 Входной сигнал</span>
// //           <span>{Math.round(rawVolume * 100)}%</span>
// //         </div>
// //         <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
// //           <div
// //             className={`h-full transition-all duration-75 ${getVolumeColor(rawVolume)}`}
// //             style={{ width: `${rawVolume * 100}%` }}
// //           />
// //         </div>
// //       </div>
      
// //       {/* Обработанный уровень */}
// //       {showNoiseGateEffect && (
// //         <div className="w-64">
// //           <div className="flex justify-between text-gray-400 text-xs mb-1">
// //             <span>🔧 После обработки</span>
// //             <span>{Math.round(processedVolume * 100)}%</span>
// //           </div>
// //           <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
// //             <div
// //               className={`h-full transition-all duration-75 ${getVolumeColor(processedVolume)}`}
// //               style={{ width: `${processedVolume * 100}%` }}
// //             />
// //           </div>
// //         </div>
// //       )}
      
// //       {/* Текущий уровень */}
// //       {isRecording && (
// //         <div className="text-center">
// //           <div className="text-3xl font-mono text-green-400">
// //             {Math.round((showNoiseGateEffect ? processedVolume : rawVolume) * 100)}%
// //           </div>
// //           <div className="text-gray-500 text-xs mt-1">
// //             {showNoiseGateEffect ? 'уровень после фильтрации' : 'уровень сигнала'}
// //           </div>
// //           <div className="text-gray-600 text-xs mt-1">
// //             ⏱ {formatDuration(recordingDuration)}
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default React.memo(VolumeWidget);