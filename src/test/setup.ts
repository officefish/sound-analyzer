// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, beforeAll } from 'vitest';
import 'fake-indexeddb/auto';

afterEach(() => {
  cleanup();
});

// Мок для URL
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mocked-url');
globalThis.URL.revokeObjectURL = vi.fn();

// ✅ Исправленный мок для Audio - используем class вместо стрелочной функции
class MockAudio {
  src: string = '';
  duration: number = 120;
  currentTime: number = 0;
  paused: boolean = true;
  volume: number = 0.8;
  private _listeners: Map<string, Function[]> = new Map();

  constructor() {
    setTimeout(() => {
      const event = new Event('loadedmetadata');
      this.dispatchEvent(event);
    }, 10);
  }

  load() {}
  
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  
  pause() {
    this.paused = true;
  }
  
  addEventListener(event: string, callback: Function) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event)!.push(callback);
  }
  
  removeEventListener(event: string, callback: Function) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }
  }
  
  private dispatchEvent(event: Event) {
    const listeners = this._listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }
}

globalThis.Audio = MockAudio as any;

// Мок для localStorage
class LocalStorageMock {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

globalThis.localStorage = new LocalStorageMock() as any;

// Мок для fetch
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  blob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'audio/mpeg' })),
  json: vi.fn().mockResolvedValue({}),
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
});

// Мок для window.electron
globalThis.window = {
  electron: {
    readFile: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
    writeFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(true),
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue(['file1.mp3', 'file2.mp3']),
    copyFile: vi.fn().mockResolvedValue(undefined),
    getAppPath: vi.fn().mockResolvedValue('/test-app'),
  },
} as any;

// Очистка перед каждым тестом
beforeAll(() => {
  if (typeof indexedDB === 'undefined') {
    console.warn('IndexedDB is not available');
  }
});