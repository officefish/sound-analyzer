/**
 * Полноценная реализация FFT на основе алгоритма Кули-Тьюки
 * Полностью совместима с логикой fft-js
 */
export class FFTService {
  private size: number;
  private roots: Array<{ cos: number; sin: number }>;
  
  constructor(size: number = 2048) {
    this.size = size;
    this.roots = this.generateRoots(size);
  }

  /**
   * Прямое преобразование FFT (алиас для realTransform для совместимости)
   */
  forward(data: Float32Array): Float64Array {
    const out = this.createComplexArray();
    this.realTransform(out, data);
    return out;
  }
  
  /**
   * Генерация таблицы корней для FFT
   */
  private generateRoots(n: number): Array<{ cos: number; sin: number }> {
    const roots = new Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      const angle = -2 * Math.PI * i / n;
      roots[i] = {
        cos: Math.cos(angle),
        sin: Math.sin(angle)
      };
    }
    return roots;
  }
  
  /**
   * Создание массива комплексных чисел (чередование real, imag)
   */
  createComplexArray(): Float64Array {
    return new Float64Array(this.size * 2);
  }
  
  /**
   * Прямое преобразование FFT (как в fft-js)
   * @param out - выходной массив комплексных чисел (чередование real, imag)
   * @param data - входной массив действительных чисел
   */
  realTransform(out: Float64Array, data: Float32Array): void {
    if (data.length !== this.size) {
      throw new Error(`Input data length ${data.length} does not match FFT size ${this.size}`);
    }
    
    // Копируем данные в комплексный массив (мнимая часть = 0)
    for (let i = 0; i < this.size; i++) {
      out[2 * i] = data[i];
      out[2 * i + 1] = 0;
    }
    
    // Выполняем FFT
    this.transform(out);
  }
  
  /**
   * Основной FFT алгоритм
   */
  private transform(data: Float64Array): void {
    const n = this.size;
    let m = 0;
    
    // Вычисляем количество уровней
    let n1 = n - 1;
    while (n1 > 0) {
      m++;
      n1 >>= 1;
    }
    
    // Битовая перестановка
    let index = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < index) {
        // Swap real
        let temp = data[2 * i];
        data[2 * i] = data[2 * index];
        data[2 * index] = temp;
        // Swap imag
        temp = data[2 * i + 1];
        data[2 * i + 1] = data[2 * index + 1];
        data[2 * index + 1] = temp;
      }
      
      let bit = n >> 1;
      while (bit <= index) {
        index -= bit;
        bit >>= 1;
      }
      index += bit;
    }
    
    // Выполнение бабочек FFT
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const step = this.size / len;
      
      for (let i = 0; i < n; i += len) {
        for (let j = 0; j < halfLen; j++) {
          const rootIndex = j * step;
          const root = this.roots[rootIndex];
          
          const uReal = data[2 * (i + j)];
          const uImag = data[2 * (i + j) + 1];
          const vReal = data[2 * (i + j + halfLen)];
          const vImag = data[2 * (i + j + halfLen) + 1];
          
          const tReal = vReal * root.cos - vImag * root.sin;
          const tImag = vReal * root.sin + vImag * root.cos;
          
          data[2 * (i + j)] = uReal + tReal;
          data[2 * (i + j) + 1] = uImag + tImag;
          data[2 * (i + j + halfLen)] = uReal - tReal;
          data[2 * (i + j + halfLen) + 1] = uImag - tImag;
        }
      }
    }
  }
  
  /**
   * Получение амплитуд из комплексного спектра
   * @param complexSpectrum - комплексный спектр (чередование real, imag)
   * @returns массив амплитуд размером n/2
   */
  getMagnitudes(complexSpectrum: Float64Array): Float32Array {
    const n = this.size / 2;
    const magnitudes = new Float32Array(n);
    
    for (let i = 0; i < n; i++) {
      const re = complexSpectrum[2 * i];
      const im = complexSpectrum[2 * i + 1];
      magnitudes[i] = Math.sqrt(re * re + im * im);
    }
    
    return magnitudes;
  }
  
  /**
   * Получение амплитуд в децибелах
   */
  getMagnitudesDB(complexSpectrum: Float64Array): Float32Array {
    const magnitudes = this.getMagnitudes(complexSpectrum);
    const db = new Float32Array(magnitudes.length);
    
    for (let i = 0; i < magnitudes.length; i++) {
      db[i] = 20 * Math.log10(magnitudes[i] + 1e-10);
    }
    
    return db;
  }
  
  /**
   * Получение мощности спектра
   */
  getPowerSpectrum(complexSpectrum: Float64Array): Float32Array {
    const n = this.size / 2;
    const power = new Float32Array(n);
    
    for (let i = 0; i < n; i++) {
      const re = complexSpectrum[2 * i];
      const im = complexSpectrum[2 * i + 1];
      power[i] = re * re + im * im;
    }
    
    return power;
  }
  
  /**
   * Обратное преобразование FFT
   */
  inverseTransform(data: Float64Array): void {
    // Сопрягаем комплексные числа
    for (let i = 0; i < this.size; i++) {
      data[2 * i + 1] = -data[2 * i + 1];
    }
    
    // Выполняем FFT
    this.transform(data);
    
    // Нормализуем и возвращаем сопряжение
    const n = this.size;
    for (let i = 0; i < n; i++) {
      data[2 * i] /= n;
      data[2 * i + 1] = -data[2 * i + 1] / n;
    }
  }
  
  /**
   * Получение действительной части после обратного преобразования
   */
  getRealData(complexData: Float64Array): Float32Array {
    const real = new Float32Array(this.size);
    for (let i = 0; i < this.size; i++) {
      real[i] = complexData[2 * i];
    }
    return real;
  }
  
  /**
   * Получение частот для каждого бина
   */
  getFrequencies(sampleRate: number): Float32Array {
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / (this.size / 2 - 1);
    const frequencies = new Float32Array(this.size / 2);
    
    for (let i = 0; i < frequencies.length; i++) {
      frequencies[i] = i * binWidth;
    }
    
    return frequencies;
  }
}

// Экспортируем совместимый API как в fft-js
export const FFT = {
  /**
   * Создание массива комплексных чисел
   */
  createComplexArray(size: number): Float64Array {
    return new Float64Array(size * 2);
  },
  
  /**
   * Прямое преобразование FFT
   */
  realTransform(fft: FFTService, out: Float64Array, data: Float32Array): void {
    fft.realTransform(out, data);
  },
  
  /**
   * Получение амплитуд
   */
  fftMag(complexSpectrum: Float64Array): Float32Array {
    const n = complexSpectrum.length / 2;
    const magnitudes = new Float32Array(n);
    
    for (let i = 0; i < n; i++) {
      const re = complexSpectrum[2 * i];
      const im = complexSpectrum[2 * i + 1];
      magnitudes[i] = Math.sqrt(re * re + im * im);
    }
    
    return magnitudes;
  },
  
  /**
   * Получение фаз
   */
  fftPhase(complexSpectrum: Float64Array): Float32Array {
    const n = complexSpectrum.length / 2;
    const phases = new Float32Array(n);
    
    for (let i = 0; i < n; i++) {
      const re = complexSpectrum[2 * i];
      const im = complexSpectrum[2 * i + 1];
      phases[i] = Math.atan2(im, re);
    }
    
    return phases;
  }
};

// Создаем экземпляр по умолчанию
export const defaultFFT = new FFTService(2048);