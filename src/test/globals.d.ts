import 'vitest/globals';

declare global {
  var window: any;
  var indexedDB: IDBFactory;
  var localStorage: Storage;
  
  interface Window {
    electron?: {
      readFile: (path: string) => Promise<ArrayBuffer>;
      writeFile: (path: string, data: ArrayBuffer) => Promise<void>;
      deleteFile: (path: string) => Promise<void>;
      exists: (path: string) => Promise<boolean>;
      mkdir: (path: string) => Promise<void>;
      readdir: (path: string) => Promise<string[]>;
      copyFile: (from: string, to: string) => Promise<void>;
      getAppPath: () => Promise<string>;
    };
  }
}

export {};
