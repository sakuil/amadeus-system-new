import { app, BrowserWindow, Menu, Tray, globalShortcut, protocol } from 'electron';
import path from 'path';
import { fork, exec } from 'child_process';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import logPkg from 'electron-log';
const log = logPkg.default || logPkg;
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 获取 __dirname 等效
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray;
let isAlwaysOnTop = false;
let previewProcess; // 存储预览服务进程

// 加载环境变量 (.env)
dotenv.config({ path: path.resolve(__dirname, '../service/.env') });

// 日志重定向到文件，方便排查自动更新问题
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

function loadEnv() {
  const cfgDir = path.join(app.getPath('userData'), 'config');
  const userEnv = path.join(cfgDir, '.env');
  const defaultEnv = path.resolve(__dirname, '../service/.env');

  if (!fs.existsSync(cfgDir)) fs.mkdirSync(cfgDir, { recursive: true });
  if (!fs.existsSync(userEnv) && fs.existsSync(defaultEnv)) {
    fs.copyFileSync(defaultEnv, userEnv);
  }
  dotenv.config({ path: userEnv });
}

function setupAutoUpdater(win) {
  autoUpdater.on('checking-for-update', () => {
    log.info('正在检查更新...');
  });
  autoUpdater.on('update-available', (info) => {
    log.info('发现新版本:', info.version);
    win.webContents.send('update-available', info);
  });
  autoUpdater.on('update-not-available', () => {
    log.info('当前已是最新版本');
  });
  autoUpdater.on('error', (err) => {
    log.error('更新检查出错:', err == null ? 'unknown' : (err.stack || err.toString()));
    win.webContents.send('update-error', err ? (err.stack || err.toString()) : 'unknown');
  });
  autoUpdater.on('download-progress', (progressObj) => {
    log.info('下载进度:', progressObj.percent + '%');
    win.webContents.send('download-progress', progressObj);
  });
  autoUpdater.on('update-downloaded', (info) => {
    log.info('新版本已下载，准备安装...');
    win.webContents.send('update-downloaded', info);
    autoUpdater.quitAndInstall();
  });
}

function getIconPath() {
  // 优先使用 build 目录下的 icon
  const iconCandidates = [
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, 'assets/icon.png'),
    path.join(__dirname, 'icon.png'),
  ];
  for (const iconPath of iconCandidates) {
    if (fs.existsSync(iconPath)) return iconPath;
  }
  return undefined;
}

// 启动预览服务器
function startPreviewServer() {
  return new Promise((resolve, reject) => {
    log.info('正在启动preview服务器...');
    
    // 在项目根目录执行pnpm preview
    previewProcess = exec('pnpm preview', {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'production' } // 设置环境变量
    });
    
    previewProcess.stdout.on('data', (data) => {
      log.info(`预览服务器输出: ${data}`);
      // 检测实际的端口号
      if (data.includes('http://localhost:') || data.includes('Local:   http://localhost:')) {
        // 从输出中提取端口号
        const portMatch = data.match(/localhost:(\d+)/);
        if (portMatch && portMatch[1]) {
          const port = portMatch[1];
          log.info(`预览服务器实际端口: ${port}`);
          global.previewPort = port; // 保存端口号到全局变量
          resolve(port);
        }
      }
    });
    
    previewProcess.stderr.on('data', (data) => {
      log.error(`预览服务器错误: ${data}`);
    });
    
    // 设置超时，避免无限等待，默认使用4173端口
    setTimeout(() => {
      log.info('预览服务器可能已启动，使用默认端口4173');
      if (!global.previewPort) {
        global.previewPort = '4173';
      }
      resolve(global.previewPort);
    }, 8000); // 增加超时时间
    
    previewProcess.on('error', (err) => {
      log.error(`无法启动预览服务器: ${err}`);
      reject(err);
    });
  });
}

function createWindow() {
  const windowOptions = {
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 500,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: fs.existsSync(path.join(__dirname, 'preload.mjs')) ? path.join(__dirname, 'preload.mjs') : undefined
    }
  };
  const iconPath = getIconPath();
  if (iconPath) windowOptions.icon = iconPath;

  mainWindow = new BrowserWindow(windowOptions);

  // 使用实际检测到的端口，默认为3002或4173
  const port = global.previewPort || '3002';
  mainWindow.loadURL(`http://127.0.0.1:${port}`);
  
  // 处理加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error(`页面加载失败: ${errorDescription} (${errorCode})`);
    
    // 如果连接被拒绝，可能是端口错误，尝试其他常见端口
    if (errorCode === -102) { // ERR_CONNECTION_REFUSED
      const fallbackPorts = ['4173', '5173', '8080'];
      if (!fallbackPorts.includes(port)) {
        fallbackPorts.unshift(port);
      }
      
      const currentIndex = fallbackPorts.indexOf(port);
      const nextIndex = (currentIndex + 1) % fallbackPorts.length;
      const nextPort = fallbackPorts[nextIndex];
      
      log.info(`尝试连接到备用端口: ${nextPort}`);
      global.previewPort = nextPort;
      mainWindow.loadURL(`http://127.0.0.1:${nextPort}`);
    }
  });

  // 自动更新监听
  setupAutoUpdater(mainWindow);
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (e) {
    log.error('自动更新检查异常:', e.stack || e.toString());
    mainWindow.webContents.send('update-error', e.stack || e.toString());
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = getIconPath();
  if (!iconPath) {
    log.warn('未找到托盘图标，跳过托盘创建');
    return;
  }
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主界面', click: () => { if (mainWindow) mainWindow.show(); } },
    { type: 'separator' },
    { label: '退出', click: () => { app.quit(); } }
  ]);
  tray.setToolTip(app.name);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// 启动 node 中间层（service/build/index.mjs）
const nodeServerPath = path.join(__dirname, '../service/build/index.mjs');
// 确保可以正确fork ESM模块
const nodeProcess = fork(nodeServerPath, [], { 
  stdio: 'inherit',
  // ESM兼容性选项
  execArgv: ['--experimental-specifier-resolution=node'],
  cwd: path.resolve(__dirname, '../service'), // 设置工作目录为 service
  env: { ...process.env },
});

// 添加全局错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  log.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  log.error('未处理的Promise拒绝:', reason);
});

app.whenReady().then(async () => {
  loadEnv();
  // 注册协议处理程序
  if (app.isPackaged) {
    // 在打包应用中处理file协议
    app.on('web-contents-created', (e, contents) => {
      contents.on('will-navigate', (event, url) => {
        if (url.startsWith('file:')) {
          event.preventDefault();
        }
      });
    });
  } else {
    // 开发模式下允许加载本地资源
    protocol.registerFileProtocol('file', (request, callback) => {
      const pathname = decodeURI(request.url.replace('file:///', ''));
      callback(pathname);
    });
  }

  try {
    // 先启动preview服务器
    const port = await startPreviewServer();
    log.info(`预览服务器已启动在端口 ${port}，准备创建窗口`);
  } catch (err) {
    log.error('启动预览服务器失败:', err);
    global.previewPort = '3002'; // 使用默认端口
  }

  createWindow();
  createTray();

  // 注册全局快捷键
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow) {
      isAlwaysOnTop = !isAlwaysOnTop;
      mainWindow.setAlwaysOnTop(isAlwaysOnTop);
      mainWindow.setVisibleOnAllWorkspaces(isAlwaysOnTop);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(err => {
  console.error('应用启动错误:', err);
  log.error('应用启动错误:', err);
});

// 退出时注销所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
  
  // 关闭所有子进程
  if (nodeProcess) nodeProcess.kill();
  
  // 关闭预览服务器
  if (previewProcess) {
    previewProcess.kill();
    log.info('预览服务器已关闭');
  }
});
