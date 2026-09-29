const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { getGalenConnectorStatus, publishGalenSnapshot, readGalenResearchFeedback } = require('./galen-connector.cjs');

let backend = null;
let mainWindow = null;
const backendPort = 8000;
const connectorChannel = 'galen-connector:publish';
let connectorWriteQueue = Promise.resolve();

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function backendPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'rehab-backend', 'rehab-backend.exe')
    : path.join(__dirname, '..', 'backend', 'dist', 'rehab-backend', 'rehab-backend.exe');
}

ipcMain.handle(connectorChannel, (_event, snapshot) => {
  connectorWriteQueue = connectorWriteQueue
    .catch(() => undefined)
    .then(() => publishGalenSnapshot(snapshot));
  return connectorWriteQueue;
});
ipcMain.handle('galen-connector:status', () => getGalenConnectorStatus());
ipcMain.handle('galen-connector:feedback', () => readGalenResearchFeedback());

function probeBackend(timeoutMs = 1000) {
  return new Promise(resolve => {
    const req = http.get(`http://127.0.0.1:${backendPort}/health`, res => {
      res.resume();
      resolve(Boolean(res.statusCode && res.statusCode < 500));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend(timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    if (await probeBackend()) return;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error('本地服务启动超时，请查看应用日志。');
}

async function createWindow() {
  const existingService = await probeBackend();
  if (existingService) {
    dialog.showErrorBox(
      'Rehab-main 启动失败',
      '本地端口 8000 已被占用。请关闭其他 Rehab-main 实例或占用该端口的程序后重试。'
    );
    app.quit();
    return;
  }

  const userDataRoot = app.getPath('userData');
  const dataRoot = path.join(userDataRoot, 'data');
  const logRoot = path.join(userDataRoot, 'logs');
  fs.mkdirSync(dataRoot, { recursive: true });
  fs.mkdirSync(logRoot, { recursive: true });

  const logPath = path.join(logRoot, 'backend.log');
  const logFd = fs.openSync(logPath, 'a');
  const executable = backendPath();
  backend = spawn(executable, [], {
    windowsHide: true,
    cwd: path.dirname(executable),
    stdio: ['ignore', logFd, logFd],
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(backendPort),
      REHAB_DB_PATH: path.join(dataRoot, 'rehab_integration.db'),
      REHAB_SEED_DEMO_DATA: 'false',
      DEBUG_LOGS: 'false',
    },
  });

  backend.once('error', error => {
    dialog.showErrorBox('Rehab-main 启动失败', `无法启动本地服务：${error.message}`);
  });

  try {
    await waitForBackend();
  } catch (error) {
    dialog.showErrorBox('Rehab-main 启动失败', `${error.message}\n日志位置：${logPath}`);
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    title: 'Rehab-main 康复工作台（内测版）',
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    icon: path.join(__dirname, 'assets', 'qingyue-logo-v1.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const webRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'web')
    : path.join(__dirname, '..', 'dist');
  await mainWindow.loadFile(path.join(webRoot, 'index.html'));
}

function stopBackend() {
  if (backend && !backend.killed) backend.kill();
  backend = null;
}

if (singleInstanceLock) {
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', stopBackend);
}
