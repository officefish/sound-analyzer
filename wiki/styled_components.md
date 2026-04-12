# 🎨 Руководство по визуальному оформлению модулей и плагинов

## 📋 Содержание

1. [Введение](#введение)
2. [Базовая архитектура стилей](#базовая-архитектура-стилей)
3. [DaisyUI компоненты](#daisyui-компоненты)
4. [Tailwind CSS утилиты](#tailwind-css-утилиты)
5. [Кастомизация компонентов](#кастомизация-компонентов)
6. [Виджеты модулей](#виджеты-модулей)
7. [Виджеты плагинов](#виджеты-плагинов)
8. [Темы и цветовая схема](#темы-и-цветовая-схема)
9. [Адаптивность](#адаптивность)
10. [Анимации и переходы](#анимации-и-переходы)
11. [Примеры](#примеры)
12. [Чек-лист](#чек-лист)

---

## Введение

В SoundLab используется **двухуровневая система стилей**:

- **DaisyUI** — для готовых компонентов (кнопки, карточки, модальные окна)
- **Tailwind CSS** — для кастомных утилит и доработок

Это позволяет быстро разрабатывать интерфейсы, сохраняя возможность тонкой настройки.

### Почему DaisyUI + Tailwind?

| DaisyUI | Tailwind CSS |
|---------|--------------|
| Готовые компоненты | Кастомные стили |
| Встроенные темы | Гибкие утилиты |
| Минимум кода | Максимум контроля |
| Адаптивность из коробки | Атомарный подход |

---

## Базовая архитектура стилей

### Структура стилей в проекте
src/
├── index.css # Глобальные стили + Tailwind директивы
├── components/
│ └── ui/ # UI-компоненты с кастомными стилями
│ ├── Slider.tsx
│ ├── Toggle.tsx
│ └── Button.tsx
└── modules/
└── ModuleName/
└── components/ # Специфичные компоненты модуля
└── Widget.tsx

text

### Глобальный файл стилей `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Тёмная тема по умолчанию */
:root {
  color-scheme: dark;
}

/* Кастомные слои */
@layer components {
  .btn-custom {
    @apply px-4 py-2 rounded-lg font-medium transition-all duration-200;
  }
  
  .card-custom {
    @apply rounded-2xl bg-base-200 border border-base-300 p-4;
  }
}

@layer utilities {
  /* Кастомные анимации */
  .animate-glow {
    animation: glow 1.5s ease-in-out infinite;
  }
  
  @keyframes glow {
    0%, 100% { text-shadow: 0 0 10px rgba(34, 211, 238, 0.5); }
    50% { text-shadow: 0 0 20px rgba(34, 211, 238, 0.8); }
  }
}
```

## DaisyUI компоненты

### Основные компоненты для использования

Компонент	Использование	Пример
Button	Кнопки действий	<Button color="primary">Click</Button>
Card	Карточки с контентом	<Card className="bg-base-200">...</Card>
Select	Выпадающие списки	<Select> <Select.Option>...</Select.Option> </Select>
Progress	Прогресс-бары	<Progress value={50} max={100} color="primary" />
Badge	Статусы и метки	<Badge color="success">Active</Badge>
Divider	Разделители	<Divider>Section</Divider>
Alert	Уведомления	<Alert status="error">Error message</Alert>
Modal	Модальные окна	<Modal open={isOpen}>...</Modal>

### Пример использования DaisyUI
```tsx
import { Button, Card, Progress, Badge, Divider } from 'react-daisyui';

const MyWidget = () => {
  return (
    <Card className="bg-base-200 shadow-xl">
      <Card.Body>
        <div className="flex justify-between items-center">
          <h2 className="card-title">Volume Meter</h2>
          <Badge color="primary">Active</Badge>
        </div>
        
        <Progress value={75} max={100} color="primary" />
        
        <Divider />
        
        <div className="card-actions justify-end">
          <Button color="primary" size="sm">
            Apply
          </Button>
          <Button color="ghost" size="sm">
            Cancel
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};
```

## Tailwind CSS утилиты

### Основные утилиты

```tsx
// Цвета (с использованием DaisyUI тем)
<div className="bg-base-100 text-base-content" />
<div className="bg-primary text-primary-content" />
<div className="bg-secondary text-secondary-content" />

// Отступы
<div className="p-4 m-2 gap-4 space-y-4" />

// Flexbox и Grid
<div className="flex items-center justify-between" />
<div className="grid grid-cols-2 gap-4" />

// Размеры
<div className="w-full h-auto max-w-2xl min-h-0" />

// Скругления
<div className="rounded-lg rounded-2xl rounded-full" />

// Тени
<div className="shadow-lg shadow-primary/20" />

// Переходы
<div className="transition-all duration-200 hover:scale-105" />
Комбинация с DaisyUI
tsx
// DaisyUI для структуры, Tailwind для деталей
<Card className="bg-base-200 border border-primary/20 shadow-xl">
  <Card.Body className="p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
        <span className="text-primary">🎤</span>
      </div>
      <h3 className="text-lg font-semibold text-base-content">
        Microphone Input
      </h3>
    </div>
    
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-base-content/70">Volume</span>
        <span className="font-mono text-primary">75%</span>
      </div>
      <Progress value={75} max={100} color="primary" className="h-2" />
    </div>
  </Card.Body>
</Card>
```

## Кастомизация компонентов

### Правила кастомизации

- Предпочитайте DaisyUI для базовой структуры
- Используйте Tailwind для точной настройки
- Не пишите кастомный CSS без крайней необходимости
- Следуйте цветовой схеме через CSS переменные DaisyUI

### Пример кастомного слайдера

```tsx
// components/ui/CustomSlider.tsx
import React from 'react';

interface CustomSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export const CustomSlider: React.FC<CustomSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
}) => {
  const percent = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-base-content/70">{label}</span>
          <span className="text-primary font-mono">{value}</span>
        </div>
      )}
      
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-base-300
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:transition-transform"
          style={{
            background: `linear-gradient(to right, 
              hsl(var(--p)) 0%, 
              hsl(var(--p)) ${percent}%, 
              hsl(var(--b3)) ${percent}%, 
              hsl(var(--b3)) 100%)`
          }}
        />
      </div>
    </div>
  );
};
```

## Виджеты модулей

### Общая структура виджета модуля

```tsx
// src/modules/Microphone2/components/VolumeWidget.tsx
import React from 'react';
import { Card, Progress } from 'react-daisyui';

interface VolumeWidgetProps {
  volume: number;
  isActive?: boolean;
}

const VolumeWidget: React.FC<VolumeWidgetProps> = ({ volume, isActive = true }) => {
  const percent = Math.min(100, Math.max(0, Math.round(volume * 100)));
  
  // Определяем цвет в зависимости от значения
  const getColor = () => {
    if (percent < 30) return 'success';
    if (percent < 70) return 'warning';
    return 'error';
  };
  
  return (
    <Card className="bg-base-200 border border-base-300 shadow-lg">
      <Card.Body className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎧</span>
            <h3 className="text-sm font-semibold text-base-content/80 uppercase tracking-wider">
              Volume Level
            </h3>
          </div>
          {isActive && (
            <div className="badge badge-success badge-sm gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Active
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-base-content/60">Input Signal</span>
            <span className="font-mono text-primary font-bold">{percent}%</span>
          </div>
          <Progress
            value={percent}
            max={100}
            color={getColor()}
            className="h-2.5 rounded-full transition-all duration-300"
          />
        </div>
        
        <div className="mt-3 text-center">
          <div className="text-3xl font-mono font-bold text-base-content">
            {percent === 0 ? '--' : percent}
          </div>
          <div className="text-xs text-base-content/50 mt-0.5">
            decibels
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default React.memo(VolumeWidget);
```

## Виджет с кастомной визуализацией

```tsx
// src/modules/Microphone2/components/SpectrumWidget.tsx
import React from 'react';
import { Card } from 'react-daisyui';

interface SpectrumWidgetProps {
  spectrumData: number[];
}

const SpectrumWidget: React.FC<SpectrumWidgetProps> = ({ spectrumData }) => {
  const frequencies = [20, 80, 200, 500, '1k', '2k', '4k', '8k', '16k', '20k'];
  
  const getBarColor = (value: number, index: number) => {
    // Низкие частоты
    if (index < 8) return 'bg-green-500';
    // Средние частоты
    if (index < 20) return 'bg-cyan-400';
    // Высокие частоты
    return 'bg-indigo-400';
  };
  
  const getBarHeight = (value: number) => {
    return `${Math.max(4, Math.min(100, value * 100))}%`;
  };
  
  return (
    <Card className="bg-base-200 border border-base-300 shadow-lg">
      <Card.Body className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h3 className="text-sm font-semibold text-base-content/80 uppercase tracking-wider">
              Frequency Spectrum
            </h3>
          </div>
          <span className="text-xs text-base-content/40 font-mono">Hz</span>
        </div>
        
        <div className="bg-base-300/50 rounded-xl border border-base-300 p-4">
          <div className="flex items-end justify-center gap-0.5 h-24">
            {spectrumData.map((value, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-md transition-all duration-75 ${getBarColor(value, i)}`}
                style={{
                  height: getBarHeight(value),
                  transition: 'height 0.08s ease-out',
                }}
              />
            ))}
          </div>
          
          <div className="flex justify-between mt-3 px-1">
            {frequencies.map((freq, i) => (
              <span key={i} className="text-[9px] text-base-content/40 font-mono">
                {freq}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-4 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-base-content/50">Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs text-base-content/50">Mid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-400" />
            <span className="text-xs text-base-content/50">High</span>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default React.memo(SpectrumWidget);
```

## Виджеты плагинов

### Структура виджета плагина

```tsx
// src/plugins/microphone2/widgets/VolumeWidget.tsx
import React from 'react';
import { Card, Progress, Button } from 'react-daisyui';

interface VolumeWidgetProps {
  volume: number;
  isActive: boolean;
  onAction: (action: string, data?: any) => void;
}

const VolumeWidget: React.FC<VolumeWidgetProps> = ({ volume, isActive, onAction }) => {
  const percent = Math.min(100, Math.max(0, Math.round(volume * 100)));
  
  if (!isActive) return null;
  
  return (
    <Card className="bg-base-200 border border-base-300 shadow-lg transition-all duration-300 hover:shadow-primary/10">
      <Card.Body className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h3 className="text-xs font-semibold text-base-content/70 uppercase tracking-wider">
              Volume Monitor
            </h3>
          </div>
          <Button
            size="xs"
            color="ghost"
            onClick={() => onAction('configure')}
            className="btn-ghost"
          >
            ⚙️
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-base-content/60">Level</span>
            <span className="font-mono text-primary font-bold">{percent}%</span>
          </div>
          <Progress
            value={percent}
            max={100}
            color={percent < 30 ? 'success' : percent < 70 ? 'warning' : 'error'}
            className="h-2 rounded-full"
          />
        </div>
        
        <div className="mt-3 flex gap-2">
          <Button
            size="xs"
            color="primary"
            className="flex-1"
            onClick={() => onAction('calibrate')}
          >
            Calibrate
          </Button>
          <Button
            size="xs"
            color="ghost"
            className="flex-1"
            onClick={() => onAction('reset')}
          >
            Reset
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default React.memo(VolumeWidget);
```

### Виджет с настройками внутри

```tsx
// src/plugins/microphone2/components/WidgetControls.tsx
import React, { useState } from 'react';
import { Card, Button, Switch } from 'react-daisyui';

interface WidgetControlsProps {
  widgetStates: {
    volume: boolean;
    quality: boolean;
    waveform: boolean;
    spectrum: boolean;
  };
  onToggle: (widget: keyof WidgetControlsProps['widgetStates']) => void;
}

const WidgetControls: React.FC<WidgetControlsProps> = ({ widgetStates, onToggle }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const widgets = [
    { id: 'volume' as const, label: 'Volume Meter', icon: '📊', color: 'text-green-500' },
    { id: 'quality' as const, label: 'Quality Meter', icon: '🎯', color: 'text-purple-500' },
    { id: 'waveform' as const, label: 'Waveform', icon: '〰️', color: 'text-cyan-400' },
    { id: 'spectrum' as const, label: 'Spectrum', icon: '📈', color: 'text-indigo-400' },
  ];
  
  return (
    <Card className="bg-base-200 border border-base-300 shadow-lg">
      <Card.Body className="p-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-sm font-medium text-base-content/70"
        >
          <span className="flex items-center gap-2">
            <span>🔧</span>
            <span>Widget Settings</span>
          </span>
          <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-base-300">
            <div className="grid grid-cols-2 gap-2">
              {widgets.map((widget) => (
                <label
                  key={widget.id}
                  className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-base-300/50 transition-colors"
                >
                  <Switch
                    checked={widgetStates[widget.id]}
                    onChange={() => onToggle(widget.id)}
                    color="primary"
                    size="xs"
                  />
                  <span className={`text-sm ${widget.color}`}>{widget.icon}</span>
                  <span className="text-xs text-base-content/60">{widget.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default React.memo(WidgetControls);
```

## Темы и цветовая схема

### Доступные цвета DaisyUI в тёмной теме

Переменная	Использование	Tailwind класс
--p	Primary акцент	bg-primary, text-primary
--s	Secondary акцент	bg-secondary, text-secondary
--a	Accent акцент	bg-accent, text-accent
--n	Neutral	bg-neutral, text-neutral
--b1	Base-100 (светлый фон)	bg-base-100
--b2	Base-200 (средний фон)	bg-base-200
--b3	Base-300 (тёмный фон)	bg-base-300
--bc	Base-content (текст)	text-base-content

### Смена темы в приложении

```tsx
// src/App.tsx
import React, { useState, useEffect } from 'react';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });
  
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  return (
    <div data-theme={theme} className="min-h-screen">
      {/* ... */}
    </div>
  );
};
```

### Переключение темы в компоненте

```tsx
// src/components/Layout/ThemeSwitcher.tsx
import React from 'react';
import { Button } from 'react-daisyui';

interface ThemeSwitcherProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ theme, onToggle }) => {
  return (
    <Button
      onClick={onToggle}
      color="ghost"
      shape="circle"
      className="btn-ghost"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </Button>
  );
};
```

### Использование CSS переменных для кастомных цветов

```css
/* В src/index.css */
:root {
  --custom-primary: #22d3ee;
  --custom-secondary: #7c3aed;
}

.bg-custom-primary {
  background-color: var(--custom-primary);
}

.text-custom-secondary {
  color: var(--custom-secondary);
}
```

## Адаптивность

### Медиа-запросы Tailwind

```tsx
// Адаптивная сетка
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Контент */}
</div>

// Адаптивные отступы
<div className="p-4 sm:p-6 lg:p-8">
  {/* Контент */}
</div>

// Адаптивные размеры текста
<h1 className="text-xl sm:text-2xl lg:text-3xl">
  Заголовок
</h1>
```

### Адаптивный виджет

```tsx
// Адаптивный виджет с разным поведением на мобильных
const AdaptiveWidget = () => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        {/* Контент для мобильных */}
      </div>
      <div className="flex-1">
        {/* Контент для десктопа */}
      </div>
    </div>
  );
};
```

## Анимации и переходы

### Встроенные анимации Tailwind

```tsx
// Базовые переходы
<div className="transition-all duration-200 hover:scale-105" />

// Появление/исчезновение
<div className="transition-opacity duration-300 opacity-0 hover:opacity-100" />

// Цветовые переходы
<div className="transition-colors duration-200 bg-primary hover:bg-secondary" />
```

## Кастомные анимации

```css
/* В src/index.css */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(34, 211, 238, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(34, 211, 238, 0.8);
  }
}

.animate-pulse-glow {
  animation: pulse-glow 1.5s ease-in-out infinite;
}

@keyframes slide-in {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
```

### Использование кастомных анимаций

```tsx
const AnimatedWidget = ({ isVisible }) => {
  return (
    <div className={`transition-all duration-300 ${isVisible ? 'animate-slide-in' : 'opacity-0'}`}>
      {/* Контент */}
    </div>
  );
};
```

## Примеры

### Пример 1: Полноценный виджет модуля

```tsx
// src/modules/Microphone2/components/VolumeWidget.tsx
import React from 'react';
import { Card, Progress, Badge } from 'react-daisyui';

interface VolumeWidgetProps {
  volume: number;
  isRecording: boolean;
}

const VolumeWidget: React.FC<VolumeWidgetProps> = ({ volume, isRecording }) => {
  const percent = Math.min(100, Math.max(0, Math.round(volume * 100)));
  
  const getColor = () => {
    if (percent < 30) return 'success';
    if (percent < 70) return 'warning';
    return 'error';
  };
  
  return (
    <Card className="bg-base-200 border border-base-300 shadow-xl transition-all duration-300 hover:shadow-primary/10">
      <Card.Body className="p-5">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-lg">🎤</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-base-content">Input Volume</h3>
              <p className="text-xs text-base-content/50">Real-time microphone level</p>
            </div>
          </div>
          
          {isRecording && (
            <Badge color="success" size="sm" className="gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              LIVE
            </Badge>
          )}
        </div>
        
        {/* Прогресс-бар */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-base-content/60">Signal Level</span>
            <span className={`font-mono font-bold ${percent > 70 ? 'text-error' : 'text-primary'}`}>
              {percent}%
            </span>
          </div>
          <Progress
            value={percent}
            max={100}
            color={getColor()}
            className="h-2.5 rounded-full transition-all duration-300"
          />
        </div>
        
        {/* Цифровое значение */}
        <div className="mt-4 text-center">
          <div className="text-4xl font-mono font-bold text-base-content">
            {percent === 0 ? '--' : percent}
          </div>
          <div className="text-xs text-base-content/40 mt-0.5">
            decibels (dB)
          </div>
        </div>
        
        {/* Дополнительная информация */}
        <div className="mt-3 pt-3 border-t border-base-300 flex justify-between text-xs text-base-content/50">
          <span>🎧 Input: Microphone</span>
          <span>📊 Range: 0-100%</span>
        </div>
      </Card.Body>
    </Card>
  );
};

export default React.memo(VolumeWidget);
```

### Пример 2: Виджет плагина с настройками

```tsx
// src/plugins/microphone2/widgets/VolumeWidget.tsx
import React, { useState } from 'react';
import { Card, Button, Progress, Range, Divider } from 'react-daisyui';

interface VolumeWidgetProps {
  volume: number;
  isActive: boolean;
  onAction: (action: string, data?: any) => void;
}

const VolumeWidget: React.FC<VolumeWidgetProps> = ({ volume, isActive, onAction }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [threshold, setThreshold] = useState(0.15);
  
  const percent = Math.min(100, Math.max(0, Math.round(volume * 100)));
  
  if (!isActive) return null;
  
  return (
    <Card className="bg-base-200 border border-base-300 shadow-lg">
      <Card.Body className="p-4">
        {/* Заголовок с кнопками */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h3 className="text-sm font-semibold text-base-content/80">
              Volume Monitor
            </h3>
          </div>
          <div className="flex gap-1">
            <Button
              size="xs"
              color="ghost"
              onClick={() => setShowSettings(!showSettings)}
              className="btn-square"
            >
              ⚙️
            </Button>
            <Button
              size="xs"
              color="ghost"
              onClick={() => onAction('refresh')}
              className="btn-square"
            >
              🔄
            </Button>
          </div>
        </div>
        
        {/* Основной контент */}
        <div className="mt-2 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-base-content/60">Current Level</span>
            <span className="font-mono text-primary font-bold">{percent}%</span>
          </div>
          <Progress
            value={percent}
            max={100}
            color={percent < 30 ? 'success' : percent < 70 ? 'warning' : 'error'}
            className="h-2 rounded-full"
          />
        </div>
        
        {/* Панель настроек */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-base-300">
            <Divider className="my-2">Settings</Divider>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-base-content/60 block mb-1">
                  Noise Gate Threshold
                </label>
                <Range
                  value={threshold}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="range range-primary range-xs"
                />
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-base-content/40">0%</span>
                  <span className="text-primary">{Math.round(threshold * 100)}%</span>
                  <span className="text-base-content/40">100%</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="xs"
                  color="primary"
                  className="flex-1"
                  onClick={() => onAction('applySettings', { threshold })}
                >
                  Apply
                </Button>
                <Button
                  size="xs"
                  color="ghost"
                  className="flex-1"
                  onClick={() => onAction('resetSettings')}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Кнопки действий */}
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            color="primary"
            className="flex-1"
            onClick={() => onAction('calibrate')}
          >
            Calibrate
          </Button>
          <Button
            size="sm"
            color="ghost"
            className="flex-1"
            onClick={() => onAction('export')}
          >
            Export Data
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default React.memo(VolumeWidget);
```

## Чек-лист

- [x] При создании виджета модуля
- [x] Использован Card из DaisyUI для обёртки
- [x] Заголовок имеет иконку и понятное название
- [x] Использованы цвета темы (bg-base-200, text-base-content, border-base-300)
- [x] Добавлены отступы через Tailwind (p-4, gap-2, space-y-3)
- [x] Использован Progress для индикации
- [x] Добавлен Badge для статусов
- [x] Реализована адаптивность (sm:, md:, lg:)
- [x] Добавлены анимации/переходы (transition-all, hover:)

### При создании виджета плагина

- [x] Виджет проверяет isActive и возвращает null если не активен
- [x] Использован Card из DaisyUI
- [x] Есть кнопки действий с onAction
- [x] Настройки вынесены в отдельную секцию
- [x] Использованы компоненты DaisyUI (Button, Progress, Range, Divider)
- [x] Добавлен React.memo для оптимизации

### При кастомизации

- [x] Предпочтение отдано DaisyUI компонентам
- [x] Tailwind используется для точной настройки
- [x] Кастомный CSS только в крайних случаях
- [x] Использованы CSS переменные темы
- [x] Анимации не мешают производительности

📝 Резюме

Уровень	Инструмент	Назначение
Базовый	DaisyUI	Готовые компоненты (кнопки, карточки, прогресс)
Детальный	Tailwind	Кастомные утилиты (отступы, цвета, размеры)
Анимации	Tailwind + CSS	Переходы, появление, пульсация
Темы	DaisyUI + CSS vars	Смена цветовой схемы

Ключевой принцип: DaisyUI для структуры, Tailwind для деталей. Это обеспечивает быстроту разработки, консистентность и возможность кастомизации.