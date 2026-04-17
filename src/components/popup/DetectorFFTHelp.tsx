import React from 'react';
import { Modal, Button } from 'react-daisyui';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const DetectorFFTHelp: React.FC<HelpModalProps> = ({ isOpen, onClose, title = 'Справка по параметрам анализа' }) => {
  return (
    <Modal open={isOpen}>
      <Modal.Header>❓ {title}</Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          <div className="border-l-4 border-primary pl-3">
            <h4 className="font-semibold text-primary">Центр масс (Center of Mass)</h4>
            <p className="text-sm text-base-content/70 mt-1">
              Средневзвешенная частота спектра. Показывает, где сосредоточена основная энергия сигнала.
              Для дронов характерны частоты в диапазоне 200-800 Гц.
            </p>
            <div className="text-xs text-base-content/50 mt-2">
              Единица измерения: Герцы (Hz)
            </div>
          </div>
          
          <div className="border-l-4 border-secondary pl-3">
            <h4 className="font-semibold text-secondary">Спектральный поток (Spectral Flux)</h4>
            <p className="text-sm text-base-content/70 mt-1">
              Скорость изменения спектра между последовательными кадрами. 
              Характеризует резкость и импульсность звука. Дроны создают характерный пульсирующий спектр.
            </p>
            <div className="text-xs text-base-content/50 mt-2">
              Единица измерения: относительная (0-∞)
            </div>
          </div>
          
          <div className="border-l-4 border-accent pl-3">
            <h4 className="font-semibold text-accent">Громкость (Loudness / RMS)</h4>
            <p className="text-sm text-base-content/70 mt-1">
              Среднеквадратичная амплитуда сигнала. Отражает общую энергию звука.
              Дроны обычно имеют стабильный уровень громкости выше фонового шума.
            </p>
            <div className="text-xs text-base-content/50 mt-2">
              Единица измерения: относительная (0-1)
            </div>
          </div>
          
          <div className="bg-base-300 rounded-lg p-3 mt-2">
            <div className="text-xs text-base-content/50">💡 Как интерпретировать результаты</div>
            <ul className="text-xs text-base-content/70 mt-2 space-y-1 list-disc list-inside">
              <li><span className="text-green-400">✅ Норма</span> — значение в пределах допустимого порога</li>
              <li><span className="text-red-400">🚁 Дрон</span> — значение превышает порог, характерно для дрона</li>
              <li>Итоговое решение принимается по большинству параметров (2 из 3)</li>
              <li>Уровень строгости влияет на требования к количеству подтверждающих тактов</li>
            </ul>
          </div>
        </div>
      </Modal.Body>
      <Modal.Actions>
        <Button onClick={onClose} color="primary">
          Понятно
        </Button>
      </Modal.Actions>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </Modal>
  );
};

export default DetectorFFTHelp;