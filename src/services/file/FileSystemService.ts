class FileSystemService {
    private basePath: string = '';
    private isElectron: boolean = false;

    constructor() {
        this.isElectron = !!window.electronAPI;
        this.initBasePath();
    }

    private async initBasePath() {
        if (this.isElectron && window.electronAPI) {
        try {
            const appPath = await window.electronAPI.getAppPath();
            this.basePath = `${appPath}/media`;
            await this.ensureDir(this.basePath);
            await this.ensureDir(`${this.basePath}/buffer`);
            await this.ensureDir(`${this.basePath}/collections`);
        } catch (error) {
            console.error('Failed to init base path:', error);
        }
        } else {
        // Для веб-версии используем IndexedDB
        this.basePath = 'virtual';
        }
    }

    private async ensureDir(path: string): Promise<void> {
        if (!this.isElectron) return;
    
        try {
            const exists = await window.electronAPI!.exists(path);
            if (!exists) {
                await window.electronAPI!.mkdir(path);
            }
        } catch (error) {
            console.error(`Failed to create directory ${path}:`, error);
        }
    }

    // Сохранение файла
    async saveFile(fileName: string, data: Blob, directory: string = 'buffer'): Promise<string> {
        const filePath = `${this.basePath}/${directory}/${fileName}`;
    
        if (this.isElectron && window.electronAPI) {
            const arrayBuffer = await data.arrayBuffer();
            await window.electronAPI.writeFile(filePath, arrayBuffer);
            return filePath;
        } else {
            // Для веба сохраняем в IndexedDB
            await this.saveToIndexedDB(filePath, data);
            return filePath;
        }
    }

    // Чтение файла
    async readFile(filePath: string): Promise<Blob> {
        if (this.isElectron && window.electronAPI) {
            const arrayBuffer = await window.electronAPI.readFile(filePath);
            return new Blob([arrayBuffer]);
        } else {
            return await this.readFromIndexedDB(filePath);
        }
    }

    // Удаление файла
    async deleteFile(filePath: string): Promise<void> {
        if (this.isElectron && window.electronAPI) {
        await window.electronAPI.deleteFile(filePath);
        } else {
        await this.deleteFromIndexedDB(filePath);
        }
    }

    // Копирование файла
    async copyFile(fromPath: string, toPath: string): Promise<void> {
        if (this.isElectron && window.electronAPI) {
            await window.electronAPI.copyFile(fromPath, toPath);
        } else {
            const blob = await this.readFromIndexedDB(fromPath);
            await this.saveToIndexedDB(toPath, blob);
        }
    }

    // Исправленный метод saveToIndexedDB
private async saveToIndexedDB(key: string, data: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open('AudioLibraryDB', 1);
    
    request.onerror = () => {
      reject(request.error);
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      // ✅ Сохраняем оригинальный Blob без изменений
      const putRequest = store.put(data, key);
      
      putRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      
      putRequest.onerror = () => {
        db.close();
        reject(putRequest.error);
      };
    };
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files');
      }
    };
  });
}

// Исправленный метод readFromIndexedDB
private async readFromIndexedDB(key: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open('AudioLibraryDB', 1);
    
    request.onerror = () => {
      reject(request.error);
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        db.close();
        const result = getRequest.result;
        if (result) {
          // ✅ Убеждаемся что возвращаем оригинальный Blob
          if (result instanceof Blob) {
            resolve(result);
          } else if (result instanceof ArrayBuffer) {
            resolve(new Blob([result], { type: 'audio/mpeg' }));
          } else {
            // Конвертируем в Blob если это что-то другое
            resolve(new Blob([result], { type: 'audio/mpeg' }));
          }
        } else {
          reject(new Error(`File not found: ${key}`));
        }
      };
      
      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    };
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files');
      }
    };
  });
}

    private async deleteFromIndexedDB(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AudioLibraryDB', 1);
      
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['files'], 'readwrite');
                const store = transaction.objectStore('files');
                const deleteRequest = store.delete(key);
        
                deleteRequest.onsuccess = () => {
                    db.close();
                    resolve();
                };
        
                deleteRequest.onerror = () => {
                    db.close();
                    reject(deleteRequest.error);
                };
            };
      
            request.onerror = () => reject(request.error);
        });
    }

    getBasePath(): string {
        return this.basePath;
    }

    isElectronEnv(): boolean {
        return this.isElectron;
    }
}

export const fileSystemService = new FileSystemService();