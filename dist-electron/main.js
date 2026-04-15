"use strict";
// electron/main.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
// electron/main.ts






// ... остальной код без изменений
*/
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
const readdir = (0, util_1.promisify)(fs_1.default.readdir);
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const unlink = (0, util_1.promisify)(fs_1.default.unlink);
const rename = (0, util_1.promisify)(fs_1.default.rename);
const stat = (0, util_1.promisify)(fs_1.default.stat);
// Имя приложения (используем productName из package.json)
const APP_NAME = 'Membrana';
const userDataPath = electron_1.app.getPath('userData');
const mediaPath = path_1.default.join(userDataPath, 'media');
const logsPath = path_1.default.join(userDataPath, 'logs');
// Инициализация папок
async function initDirectories() {
    try {
        console.log(`📁 User data path: ${userDataPath}`);
        console.log(`📁 Media path: ${mediaPath}`);
        console.log(`📁 Logs path: ${logsPath}`);
        if (!fs_1.default.existsSync(mediaPath)) {
            await mkdir(mediaPath, { recursive: true });
            console.log(`📁 Created media directory: ${mediaPath}`);
        }
        const bufferPath = path_1.default.join(mediaPath, 'buffer');
        if (!fs_1.default.existsSync(bufferPath)) {
            await mkdir(bufferPath, { recursive: true });
            console.log(`📁 Created buffer directory: ${bufferPath}`);
        }
        if (!fs_1.default.existsSync(logsPath)) {
            await mkdir(logsPath, { recursive: true });
            console.log(`📁 Created logs directory: ${logsPath}`);
        }
    }
    catch (error) {
        console.error('Failed to create directories:', error);
    }
}
// Функция для записи логов
function logToFile(message, level = 'info') {
    if (!logsPath)
        return;
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    const logFile = path_1.default.join(logsPath, `app-${new Date().toISOString().slice(0, 10)}.log`);
    try {
        fs_1.default.appendFileSync(logFile, logMessage);
    }
    catch (error) {
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
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path_1.default.join(__dirname, '../build/icon.ico'),
        show: false,
    });
    // Отключаем меню по умолчанию
    electron_1.Menu.setApplicationMenu(null);
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
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
electron_1.ipcMain.handle('get-media-path', async () => {
    try {
        return mediaPath;
    }
    catch (error) {
        logToFile(`Error in get-media-path: ${error}`, 'error');
        throw error;
    }
});
// Создать коллекцию (папку)
electron_1.ipcMain.handle('create-collection', async (event, collectionName) => {
    try {
        const safeName = collectionName.replace(/[^a-zA-Z0-9-_]/g, '-');
        const collectionPath = path_1.default.join(mediaPath, safeName);
        if (!fs_1.default.existsSync(collectionPath)) {
            await mkdir(collectionPath, { recursive: true });
            console.log(`📁 Created collection: ${collectionPath}`);
            logToFile(`Created collection: ${collectionPath}`, 'info');
            return { success: true, path: collectionPath };
        }
        return { success: true, path: collectionPath, exists: true };
    }
    catch (error) {
        logToFile(`Failed to create collection: ${error}`, 'error');
        return { success: false, error: error.message };
    }
});
// Получить список коллекций и файлов
electron_1.ipcMain.handle('list-media', async () => {
    try {
        const collections = [];
        const items = await readdir(mediaPath, { withFileTypes: true });
        for (const item of items) {
            if (item.isDirectory()) {
                const collectionPath = path_1.default.join(mediaPath, item.name);
                const files = await readdir(collectionPath);
                const fileInfos = [];
                for (const file of files) {
                    const filePath = path_1.default.join(collectionPath, file);
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
    }
    catch (error) {
        logToFile(`Failed to list media: ${error}`, 'error');
        return { success: false, error: error.message };
    }
});
// Сохранить аудиофайл
electron_1.ipcMain.handle('save-audio-file', async (event, data, filename, collectionName = 'buffer') => {
    try {
        const safeName = collectionName.replace(/[^a-zA-Z0-9-_]/g, '-');
        const collectionPath = path_1.default.join(mediaPath, safeName);
        if (!fs_1.default.existsSync(collectionPath)) {
            await mkdir(collectionPath, { recursive: true });
        }
        const filePath = path_1.default.join(collectionPath, filename);
        const buffer = Buffer.from(data);
        await writeFile(filePath, buffer);
        logToFile(`Audio saved: ${filePath}`, 'info');
        return { success: true, path: filePath };
    }
    catch (error) {
        logToFile(`Error saving audio file: ${error}`, 'error');
        return { success: false, error: error.message };
    }
});
// Удалить файл
electron_1.ipcMain.handle('delete-file', async (event, filePath) => {
    try {
        await unlink(filePath);
        logToFile(`File deleted: ${filePath}`, 'info');
        return { success: true };
    }
    catch (error) {
        logToFile(`Failed to delete file: ${error}`, 'error');
        return { success: false, error: error.message };
    }
});
// Удалить коллекцию
electron_1.ipcMain.handle('delete-collection', async (event, collectionPath) => {
    try {
        const files = await readdir(collectionPath);
        for (const file of files) {
            await unlink(path_1.default.join(collectionPath, file));
        }
        await fs_1.default.promises.rmdir(collectionPath);
        logToFile(`Collection deleted: ${collectionPath}`, 'info');
        return { success: true };
    }
    catch (error) {
        logToFile(`Failed to delete collection: ${error}`, 'error');
        return { success: false, error: error.message };
    }
});
// Переместить файл
electron_1.ipcMain.handle('move-file', async (event, filePath, targetCollectionPath) => {
    try {
        const fileName = path_1.default.basename(filePath);
        const targetPath = path_1.default.join(targetCollectionPath, fileName);
        await rename(filePath, targetPath);
        logToFile(`File moved: ${filePath} -> ${targetPath}`, 'info');
        return { success: true, path: targetPath };
    }
    catch (error) {
        logToFile(`Failed to move file: ${error}`, 'error');
        return { success: false, error: error.message };
    }
});
// Переименовать коллекцию
electron_1.ipcMain.handle('rename-collection', async (event, oldPath, newPath) => {
    try {
        await rename(oldPath, newPath);
        logToFile(`Collection renamed: ${oldPath} -> ${newPath}`, 'info');
        return { success: true };
    }
    catch (error) {
        logToFile(`Failed to rename collection: ${error}`, 'error');
        return { success: false, error: error.message };
    }
});
// Читать файл
electron_1.ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const buffer = await readFile(filePath);
        return buffer;
    }
    catch (error) {
        logToFile(`Failed to read file: ${error}`, 'error');
        return null;
    }
});
// Проверить существование файла
electron_1.ipcMain.handle('file-exists', async (event, filePath) => {
    try {
        return fs_1.default.existsSync(filePath);
    }
    catch {
        return false;
    }
});
// Получить пути для отладки
electron_1.ipcMain.handle('get-app-paths', async () => {
    return {
        userData: electron_1.app.getPath('userData'),
        mediaPath: mediaPath,
        logsPath: logsPath,
    };
});
// Логирование ошибок из рендера
electron_1.ipcMain.on('log-error', (event, message) => {
    logToFile(message, 'error');
});
// Жизненный цикл приложения
electron_1.app.whenReady().then(async () => {
    await initDirectories();
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
