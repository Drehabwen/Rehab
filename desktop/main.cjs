const { app, BrowserWindow, dialog, ipcMain, screen } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { getGalenConnectorStatus, publishGalenSnapshot, readGalenResearchFeedback } = require('./galen-connector.cjs');
const { listResearchBatches, writeResearchPackage } = require('./galen-research-export.cjs');

let backend = null;
let mainWindow = null;
let desktopLogPath = null;
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

function writeDesktopLog(message) {
  if (!desktopLogPath) return;
  try {
    fs.appendFileSync(desktopLogPath, `${new Date().toISOString()} ${message}\n`, 'utf8');
  } catch {
    // Diagnostics must never prevent the recovery dialog from being shown.
  }
}

async function waitForRenderer(timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    try {
      const mounted = await mainWindow.webContents.executeJavaScript(
        "Boolean(document.querySelector('#root')?.childElementCount)",
        true
      );
      if (mounted) return;
    } catch (error) {
      writeDesktopLog(`renderer-probe-error ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('界面资源未能加载。');
}

ipcMain.handle(connectorChannel, (_event, snapshot) => {
  connectorWriteQueue = connectorWriteQueue
    .catch(() => undefined)
    .then(() => publishGalenSnapshot(snapshot));
  return connectorWriteQueue;
});
ipcMain.handle('galen-connector:status', () => getGalenConnectorStatus());
ipcMain.handle('galen-connector:feedback', () => readGalenResearchFeedback());

// 研究数据批次：写 %LOCALAPPDATA%\Rehab\GalenConnector\exports\<batchId>/
let researchWriteQueue = Promise.resolve();
ipcMain.handle('galen-research:export', (_event, pkg) => {
  researchWriteQueue = researchWriteQueue
    .catch(() => undefined)
    .then(() => writeResearchPackage(pkg));
  return researchWriteQueue;
});
ipcMain.handle('galen-research:batches', () => listResearchBatches());

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
      '青跃智衡康复工作台启动失败',
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
  desktopLogPath = path.join(logRoot, 'desktop.log');
  writeDesktopLog(`launch packaged=${app.isPackaged} resources=${process.resourcesPath}`);

  const logPath = path.join(logRoot, 'backend.log');
  const logFd = fs.openSync(logPath, 'a');
  const executable = backendPath();
  if (!fs.existsSync(executable)) {
    throw new Error(`本地服务文件不存在：${executable}`);
  }
  writeDesktopLog(`backend-start ${executable}`);
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
    writeDesktopLog(`backend-error ${error.stack || error.message}`);
    dialog.showErrorBox('青跃智衡康复工作台启动失败', `无法启动本地服务：${error.message}`);
  });
  backend.once('exit', (code, signal) => {
    writeDesktopLog(`backend-exit code=${code} signal=${signal}`);
  });

  try {
    await waitForBackend();
    writeDesktopLog('backend-ready');
  } catch (error) {
    writeDesktopLog(`backend-timeout ${error.stack || error.message}`);
    dialog.showErrorBox('青跃智衡康复工作台启动失败', `${error.message}\n日志位置：${logPath}`);
    app.quit();
    return;
  }

  // 按屏幕可用区域自适应，避免 150%/200% 缩放时窗口超出屏幕、页面被裁切
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = Math.min(1600, Math.round(workArea.width * 0.97));
  const windowHeight = Math.min(1000, Math.round(workArea.height * 0.97));
  const fitZoom = 1;
  mainWindow = new BrowserWindow({
    title: '青跃智衡康复工作台',
    width: windowWidth,
    height: windowHeight,
    minWidth: Math.min(1000, windowWidth),
    minHeight: Math.min(680, windowHeight),
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'qingyue-logo-v1.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setZoomFactor(fitZoom);
  writeDesktopLog(`window size=${windowWidth}x${windowHeight} workArea=${workArea.width}x${workArea.height} zoom=${fitZoom.toFixed(2)}`);
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    writeDesktopLog(`renderer-load-failed code=${code} main=${isMainFrame} url=${url} ${description}`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    writeDesktopLog(`renderer-gone reason=${details.reason} code=${details.exitCode}`);
  });

  const webRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'web')
    : path.join(__dirname, '..', 'dist');
  const indexPath = path.join(webRoot, 'index.html');
  writeDesktopLog(`renderer-load ${indexPath}`);
  await mainWindow.loadFile(indexPath);
  await waitForRenderer();
  writeDesktopLog('renderer-ready');
}

function stopBackend() {
  if (backend && !backend.killed) backend.kill();
  backend = null;
}

if (singleInstanceLock) {
  app.whenReady().then(createWindow).catch(error => {
    writeDesktopLog(`fatal ${error.stack || error.message}`);
    dialog.showErrorBox(
      '青跃智衡康复工作台启动失败',
      `${error.message}\n日志位置：${desktopLogPath || '应用数据目录'}`
    );
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', stopBackend);
}
