// electron/main.ts

/*
// electron/main.ts






// ... остальной код без изменений
*/

import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const rename = promisify(fs.rename);
const stat = promisify(fs.stat);

// Имя приложения (используем productName из package.json)
const APP_NAME = 'Membrana';

const userDataPath = app.getPath('userData');
const mediaPath = path.join(userDataPath, 'media');
const logsPath = path.join(userDataPath, 'logs');

// Инициализация папок
async function initDirectories() {
  try {
    console.log(`📁 User data path: ${userDataPath}`);
    console.log(`📁 Media path: ${mediaPath}`);
    console.log(`📁 Logs path: ${logsPath}`);
    
    if (!fs.existsSync(mediaPath)) {
      await mkdir(mediaPath, { recursive: true });
      console.log(`📁 Created media directory: ${mediaPath}`);
    }
    
    const bufferPath = path.join(mediaPath, 'buffer');
    if (!fs.existsSync(bufferPath)) {
      await mkdir(bufferPath, { recursive: true });
      console.log(`📁 Created buffer directory: ${bufferPath}`);
    }
    
    if (!fs.existsSync(logsPath)) {
      await mkdir(logsPath, { recursive: true });
      console.log(`📁 Created logs directory: ${logsPath}`);
    }
  } catch (error) {
    console.error('Failed to create directories:', error);
  }
}


// Функция для записи логов
function logToFile(message: string, level: 'info' | 'error' | 'warn' = 'info') {
  if (!logsPath) return;
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  const logFile = path.join(logsPath, `app-${new Date().toISOString().slice(0, 10)}.log`);
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
  console.log(logMessage);
}

// Перехват необработанных ошибок
process.on('uncaughtException', (error) => {
  logToFile(`Uncaught Exception: ${error.message}\n${error.stack}`, 'error');
});

process.on('unhandledRejection', (reason) => {
  logToFile(`Unhandled Rejection: ${reason}`, 'error');
});

// Функция создания окна
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../build/icon.ico'),
    show: false,
  });

  // Отключаем меню по умолчанию
  Menu.setApplicationMenu(null);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Добавляем возможность открыть DevTools по F12 в production
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      event.preventDefault();
      mainWindow?.webContents.openDevTools();
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers

// Получить путь к медиа
ipcMain.handle('get-media-path', async () => {
  try {
    return mediaPath;
  } catch (error) {
    logToFile(`Error in get-media-path: ${error}`, 'error');
    throw error;
  }
});

// Создать коллекцию (папку)
ipcMain.handle('create-collection', async (event, collectionName: string) => {
  try {
    const safeName = collectionName.replace(/[^a-zA-Z0-9-_]/g, '-');
    const collectionPath = path.join(mediaPath, safeName);
    
    if (!fs.existsSync(collectionPath)) {
      await mkdir(collectionPath, { recursive: true });
      console.log(`📁 Created collection: ${collectionPath}`);
      logToFile(`Created collection: ${collectionPath}`, 'info');
      return { success: true, path: collectionPath };
    }
    return { success: true, path: collectionPath, exists: true };
  } catch (error) {
    logToFile(`Failed to create collection: ${error}`, 'error');
    return { success: false, error: (error as Error).message };
  }
});

// Получить список коллекций и файлов
ipcMain.handle('list-media', async () => {
  try {
    const collections: { name: string; path: string; files: { name: string; path: string; size: number; modified: number }[] }[] = [];
    
    const items = await readdir(mediaPath, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const collectionPath = path.join(mediaPath, item.name);
        const files = await readdir(collectionPath);
        const fileInfos = [];
        
        for (const file of files) {
          const filePath = path.join(collectionPath, file);
          const fileStat = await stat(filePath);
          fileInfos.push({
            name: file,
            path: filePath,
            size: fileStat.size,
            modified: fileStat.mtimeMs,
          });
        }
        
        collections.push({
          name: item.name,
          path: collectionPath,
          files: fileInfos,
        });
      }
    }
    
    return { success: true, collections };
  } catch (error) {
    logToFile(`Failed to list media: ${error}`, 'error');
    return { success: false, error: (error as Error).message };
  }
});

// Сохранить аудиофайл
ipcMain.handle('save-audio-file', async (event, data: ArrayBuffer, filename: string, collectionName: string = 'buffer') => {
  try {
    const safeName = collectionName.replace(/[^a-zA-Z0-9-_]/g, '-');
    const collectionPath = path.join(mediaPath, safeName);
    
    if (!fs.existsSync(collectionPath)) {
      await mkdir(collectionPath, { recursive: true });
    }
    
    const filePath = path.join(collectionPath, filename);
    const buffer = Buffer.from(data);
    await writeFile(filePath, buffer);
    
    logToFile(`Audio saved: ${filePath}`, 'info');
    return { success: true, path: filePath };
  } catch (error) {
    logToFile(`Error saving audio file: ${error}`, 'error');
    return { success: false, error: (error as Error).message };
  }
});

// Удалить файл
ipcMain.handle('delete-file', async (event, filePath: string) => {
  try {
    await unlink(filePath);
    logToFile(`File deleted: ${filePath}`, 'info');
    return { success: true };
  } catch (error) {
    logToFile(`Failed to delete file: ${error}`, 'error');
    return { success: false, error: (error as Error).message };
  }
});

// Удалить коллекцию
ipcMain.handle('delete-collection', async (event, collectionPath: string) => {
  try {
    const files = await readdir(collectionPath);
    for (const file of files) {
      await unlink(path.join(collectionPath, file));
    }
    await fs.promises.rmdir(collectionPath);
    logToFile(`Collection deleted: ${collectionPath}`, 'info');
    return { success: true };
  } catch (error) {
    logToFile(`Failed to delete collection: ${error}`, 'error');
    return { success: false, error: (error as Error).message };
  }
});

// Переместить файл
ipcMain.handle('move-file', async (event, filePath: string, targetCollectionPath: string) => {
  try {
    const fileName = path.basename(filePath);
    const targetPath = path.join(targetCollectionPath, fileName);
    await rename(filePath, targetPath);
    logToFile(`File moved: ${filePath} -> ${targetPath}`, 'info');
    return { success: true, path: targetPath };
  } catch (error) {
    logToFile(`Failed to move file: ${error}`, 'error');
    return { success: false, error: (error as Error).message };
  }
});

// Переименовать коллекцию
ipcMain.handle('rename-collection', async (event, oldPath: string, newPath: string) => {
  try {
    await rename(oldPath, newPath);
    logToFile(`Collection renamed: ${oldPath} -> ${newPath}`, 'info');
    return { success: true };
  } catch (error) {
    logToFile(`Failed to rename collection: ${error}`, 'error');
    return { success: false, error: (error as Error).message };
  }
});

// Читать файл
ipcMain.handle('read-file', async (event, filePath: string) => {
  try {
    const buffer = await readFile(filePath);
    return buffer;
  } catch (error) {
    logToFile(`Failed to read file: ${error}`, 'error');
    return null;
  }
});

// Проверить существование файла
ipcMain.handle('file-exists', async (event, filePath: string) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
});

// Получить пути для отладки
ipcMain.handle('get-app-paths', async () => {
  return {
    userData: app.getPath('userData'),
    mediaPath: mediaPath,
    logsPath: logsPath,
  };
});

// Логирование ошибок из рендера
ipcMain.on('log-error', (event, message: string) => {
  logToFile(message, 'error');
});

// Жизненный цикл приложения
app.whenReady().then(async () => {
  await initDirectories();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});