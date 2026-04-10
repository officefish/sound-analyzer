const display = document.getElementById('display') as HTMLDivElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const lapBtn = document.getElementById('lapBtn') as HTMLButtonElement;
const lapList = document.getElementById('lapList') as HTMLUListElement;

// Тип для круга
interface Lap {
  number: number;
  time: string;
  timestamp: number;
}

// Состояние секундомера
let startTime: number = 0;
let elapsedTime: number = 0;
let timerInterval: number | null = null;
let isRunning: boolean = false;
let lapCounter: number = 0;

/**
 * Форматирование времени из миллисекунд в строку ЧЧ:ММ:СС.мс
 */
function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor((ms % 1000) / 10);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

/**
 * Обновление дисплея
 */
function updateDisplay(): void {
  display.textContent = formatTime(elapsedTime);
}

/**
 * Тик таймера (вызывается каждые 10 мс)
 */
function tick(): void {
  const currentTime = Date.now();
  elapsedTime = currentTime - startTime;
  updateDisplay();
}

/**
 * Запуск секундомера
 */
function start(): void {
  if (isRunning) return;
  
  startTime = Date.now() - elapsedTime;
  timerInterval = window.setInterval(tick, 10);
  isRunning = true;
}

/**
 * Пауза
 */
function pause(): void {
  if (!isRunning) return;
  
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isRunning = false;
}

/**
 * Сброс
 */
function reset(): void {
  pause();
  elapsedTime = 0;
  lapCounter = 0;
  updateDisplay();
  clearLaps();
}

/**
 * Добавление круга
 */
function addLap(): void {
  if (!isRunning) return;
  
  lapCounter++;
  const currentTime = formatTime(elapsedTime);
  
  const lapItem = document.createElement('li');
  lapItem.textContent = `Круг ${lapCounter}: ${currentTime}`;
  
  // Удаляем сообщение "Нет кругов", если оно есть
  if (lapList.children.length === 1 && lapList.children[0].classList.contains('empty-message')) {
    lapList.innerHTML = '';
  }
  
  lapList.appendChild(lapItem);
  lapItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Очистка списка кругов
 */
function clearLaps(): void {
  lapList.innerHTML = '<li class="empty-message">Нет кругов</li>';
}

/**
 * Обработка клавиш
 */
function handleKeyPress(event: KeyboardEvent): void {
  switch (event.code) {
    case 'Space':
      event.preventDefault();
      if (isRunning) {
        pause();
      } else if (elapsedTime > 0) {
        start();
      } else {
        start();
      }
      break;
    case 'KeyR':
      reset();
      break;
    case 'KeyL':
      addLap();
      break;
  }
}

// Регистрация обработчиков событий
startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', pause);
resetBtn.addEventListener('click', reset);
lapBtn.addEventListener('click', addLap);
window.addEventListener('keydown', handleKeyPress);

// Инициализация
updateDisplay();
console.log('⏱ Секундомер инициализирован');
