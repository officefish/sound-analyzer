import React, { useEffect, useRef, useState } from 'react';

interface WaveformRendererProps {
  amplitudes: number[]; // Массив амплитуд от 0 до 1
  isPlaying: boolean;
  playedBarsCount: number;
  onSeek?: (index: number) => void;
  height?: number;
  barWidth?: number;
  barGap?: number;
  useCanvas?: boolean; // Выбор способа отрисовки
  centerLine?: boolean; // Зеркальное отображение
  colorPlayed?: string;
  colorUnplayed?: string;
  className?: string;
}

const WaveformRenderer: React.FC<WaveformRendererProps> = ({
  amplitudes,
  isPlaying,
  playedBarsCount,
  onSeek,
  height = 160,
  barWidth = 3,
  barGap = 1,
  useCanvas = true,
  centerLine = true,
  colorPlayed = '#3b82f6',
  colorUnplayed = '#3b82f620',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Расчет общего количества баров
  const totalBars = amplitudes.length;
  const effectiveBarWidth = barWidth + barGap;
  const totalWidth = totalBars * effectiveBarWidth;

  // Отрисовка через Canvas (более производительно)
  const drawCanvas = () => {
    if (!canvasRef.current || amplitudes.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Устанавливаем размеры canvas
    const canvasHeight = centerLine ? height : height / 2;
    canvas.width = totalWidth;
    canvas.height = height;
    
    // Очищаем canvas
    ctx.clearRect(0, 0, totalWidth, height);
    
    // Рисуем центральную линию если нужно
    if (centerLine) {
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff30';
      ctx.lineWidth = 1;
      ctx.moveTo(0, height / 2);
      ctx.lineTo(totalWidth, height / 2);
      ctx.stroke();
    }

    for (let i = 0; i < totalBars; i++) {
      const amplitude = Math.min(1, Math.max(0, amplitudes[i]));
      const isPlayed = i < playedBarsCount;
      const barColor = isPlayed ? colorPlayed : colorUnplayed;
      const x = i * effectiveBarWidth;
      
      if (centerLine) {
        // Зеркальное отображение (вверх и вниз)
        const barHeight = (amplitude * (height / 2)) - 2;
        const yCenter = height / 2;
        
        ctx.fillStyle = barColor;
        // Верхняя часть
        ctx.fillRect(x, yCenter - barHeight, barWidth, barHeight);
        // Нижняя часть (зеркально)
        ctx.fillRect(x, yCenter, barWidth, barHeight);
      } else {
        // Обычное отображение (столбики вверх)
        const barHeight = Math.max(2, amplitude * height);
        ctx.fillStyle = barColor;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      }
    }

    // Рисуем hover-эффект
    if (hoveredBar !== null && hoveredBar < totalBars) {
      const x = hoveredBar * effectiveBarWidth;
      ctx.fillStyle = '#ffffff40';
      ctx.fillRect(x, 0, barWidth, height);
    }
  };

  // Отрисовка через DOM (более гибко для стилизации)
  const renderDOMWaveform = () => {
    return (
      <div 
        className={`relative flex items-end ${centerLine ? 'items-center' : ''} gap-[${barGap}px]`}
        style={{ height: `${height}px` }}
      >
        {amplitudes.map((amp, idx) => {
          const barHeight = centerLine 
            ? (amp * (height / 2)) - 2
            : Math.max(2, amp * height);
          
          const isPlayed = idx < playedBarsCount;
          
          if (centerLine) {
            return (
              <div
                key={idx}
                className="relative flex flex-col items-center justify-center"
                style={{ width: `${barWidth}px` }}
              >
                <div
                  className="transition-all duration-75 cursor-pointer hover:brightness-110"
                  style={{
                    height: `${barHeight}px`,
                    width: `${barWidth}px`,
                    backgroundColor: isPlayed ? colorPlayed : colorUnplayed,
                    borderRadius: '2px 2px 0 0',
                  }}
                  onClick={() => onSeek?.(idx)}
                  onMouseEnter={(e) => {
                    setHoveredBar(idx);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltipPosition({ x: rect.left, y: rect.top });
                  }}
                  onMouseLeave={() => {
                    setHoveredBar(null);
                    setTooltipPosition(null);
                  }}
                />
                <div
                  className="transition-all duration-75 cursor-pointer hover:brightness-110"
                  style={{
                    height: `${barHeight}px`,
                    width: `${barWidth}px`,
                    backgroundColor: isPlayed ? colorPlayed : colorUnplayed,
                    borderRadius: '0 0 2px 2px',
                  }}
                  onClick={() => onSeek?.(idx)}
                />
              </div>
            );
          }
          
          return (
            <div
              key={idx}
              className="transition-all duration-75 cursor-pointer hover:brightness-110"
              style={{
                height: `${barHeight}px`,
                width: `${barWidth}px`,
                backgroundColor: isPlayed ? colorPlayed : colorUnplayed,
                borderRadius: '2px',
              }}
              onClick={() => onSeek?.(idx)}
            />
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (useCanvas && canvasRef.current) {
      drawCanvas();
    }
  }, [amplitudes, playedBarsCount, hoveredBar, useCanvas, centerLine, height]);

  // Перерисовка при ресайзе
  useEffect(() => {
    const handleResize = () => {
      if (useCanvas && canvasRef.current) {
        drawCanvas();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [useCanvas, amplitudes, playedBarsCount]);

  if (useCanvas) {
    return (
      <div className={`relative ${className}`} ref={containerRef}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: `${height}px` }}
          className="cursor-pointer"
          onClick={(e) => {
            if (!canvasRef.current || !onSeek) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const ratio = Math.min(0.999, Math.max(0, x / rect.width));
            const index = Math.floor(ratio * totalBars);
            onSeek(index);
          }}
          onMouseMove={(e) => {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const ratio = Math.min(0.999, Math.max(0, x / rect.width));
            const index = Math.floor(ratio * totalBars);
            setHoveredBar(index);
            setTooltipPosition({ x: e.clientX, y: e.clientY });
          }}
          onMouseLeave={() => {
            setHoveredBar(null);
            setTooltipPosition(null);
          }}
        />
        {hoveredBar !== null && tooltipPosition && (
          <div
            className="fixed bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none z-10"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y - 30,
            }}
          >
            {Math.floor((hoveredBar / totalBars) * 100)}%
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {renderDOMWaveform()}
    </div>
  );
};

export default WaveformRenderer;