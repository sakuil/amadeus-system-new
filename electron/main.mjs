import { app, BrowserWindow, Menu, Tray, globalShortcut, protocol } from 'electron';
import path from 'path';
import { fork, exec } from 'child_process';
import logPkg from 'electron-log';
const log = logPkg.default || logPkg;
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// 引入创建静态服务器所需的模块
import http from 'http';
import { createReadStream } from 'fs';
import mime from 'mime-types';

// 获取 __dirname 等效
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 根据是否打包使用不同的根目录
const rootPath = app.isPackaged ? process.resourcesPath : __dirname;

let mainWindow;
let tray;
let isAlwaysOnTop = false;
let staticServer; // 静态服务器实例

// 加载环境变量（注意：打包后 .env 文件应放置在 extraResources 中的 service 目录内）
function loadEnv() {
  const cfgDir = path.join(app.getPath('userData'), 'config');
  const userEnv = path.join(cfgDir, '.env');
  let defaultEnv;
  if (app.isPackaged) {
    // 打包后，我们把 service 目录作为 extraResources 打包到 resources 目录
    defaultEnv = path.join(process.resourcesPath, 'service', '.env');
  } else {
    defaultEnv = path.resolve(__dirname, '../service/.env');
  }
  
  if (!fs.existsSync(cfgDir)) fs.mkdirSync(cfgDir, { recursive: true });
  if (!fs.existsSync(userEnv) && fs.existsSync(defaultEnv)) {
    fs.copyFileSync(defaultEnv, userEnv);
  }
  dotenv.config({ path: userEnv });
}

// 获取图标路径时使用正确的根路径
function getIconPath() {
  const iconCandidates = [
    path.join(__dirname, './build/icon.png'),
    path.join(__dirname, './build/icon.ico'),
    path.join(__dirname, 'assets/icon.png'),
    path.join(__dirname, 'icon.png'),
  ];
  for (const iconPath of iconCandidates) {
    if (fs.existsSync(iconPath)) return iconPath;
  }
  return undefined;
}

// 启动静态文件服务器
function startStaticServer() {
  return new Promise((resolve, reject) => {
    log.info('正在启动静态服务器...');
    
    // 确定静态文件目录路径
    const distPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'dist') 
      : path.join(__dirname, '../dist');
    
    // 默认端口
    const PORT = 4173;
    
    // 创建HTTP服务器
    staticServer = http.createServer((req, res) => {
      // 解析请求URL路径
      let urlPath = req.url;
      
      // 如果URL是根路径或者不存在，默认提供index.html
      if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
      }
      
      // 构建文件的完整路径
      const filePath = path.join(distPath, urlPath);
      
      // 检查文件是否存在
      fs.access(filePath, fs.constants.R_OK, (err) => {
        if (err) {
          // 如果文件不存在，提供index.html（支持单页应用的路由）
          if (err.code === 'ENOENT') {
            const indexPath = path.join(distPath, 'index.html');
            
            // 再次检查index.html是否存在
            fs.access(indexPath, fs.constants.R_OK, (err) => {
              if (err) {
                res.writeHead(404);
                res.end('Not found');
                return;
              }
              
              // 设置内容类型
              res.setHeader('Content-Type', 'text/html');
              
              // 流式传输文件内容
              const fileStream = createReadStream(indexPath);
              fileStream.pipe(res);
              
              fileStream.on('error', (error) => {
                log.error(`文件读取错误: ${error}`);
                res.writeHead(500);
                res.end('Internal server error');
              });
            });
            return;
          }
          
          // 其他错误
          res.writeHead(500);
          res.end('Internal server error');
          return;
        }
        
        // 确定文件的MIME类型
        const contentType = mime.lookup(filePath) || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        
        // 流式传输文件内容
        const fileStream = createReadStream(filePath);
        fileStream.pipe(res);
        
        fileStream.on('error', (error) => {
          log.error(`文件读取错误: ${error}`);
          res.writeHead(500);
          res.end('Internal server error');
        });
      });
    });
    
    // 监听错误
    staticServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        log.warn(`端口 ${PORT} 已被占用，尝试其他端口`);
        // 端口被占用，可以在这里尝试使用其他端口
        const alternativePorts = [5173, 8080, 8000, 3000];
        tryAlternativePorts(alternativePorts, 0, distPath, resolve, reject);
      } else {
        log.error(`静态服务器错误: ${err}`);
        reject(err);
      }
    });
    
    // 启动服务器
    staticServer.listen(PORT, '127.0.0.1', () => {
      global.previewPort = PORT.toString();
      log.info(`静态服务器已启动在端口 ${PORT}，为目录 ${distPath} 提供服务`);
      resolve(PORT.toString());
    });
  });
}

// 尝试备用端口
function tryAlternativePorts(ports, index, distPath, resolve, reject) {
  if (index >= ports.length) {
    reject(new Error('所有备用端口都被占用'));
    return;
  }
  
  const PORT = ports[index];
  
  // 关闭之前的服务器实例
  if (staticServer) {
    staticServer.close();
  }
  
  // 创建新的服务器实例
  staticServer = http.createServer((req, res) => {
    // 解析请求URL路径
    let urlPath = req.url;
    
    // 如果URL是根路径或者不存在，默认提供index.html
    if (urlPath === '/' || urlPath === '') {
      urlPath = '/index.html';
    }
    
    // 构建文件的完整路径
    const filePath = path.join(distPath, urlPath);
    
    // 检查文件是否存在
    fs.access(filePath, fs.constants.R_OK, (err) => {
      if (err) {
        // 如果文件不存在，提供index.html（支持单页应用的路由）
        if (err.code === 'ENOENT') {
          const indexPath = path.join(distPath, 'index.html');
          
          // 再次检查index.html是否存在
          fs.access(indexPath, fs.constants.R_OK, (err) => {
            if (err) {
              res.writeHead(404);
              res.end('Not found');
              return;
            }
            
            // 设置内容类型
            res.setHeader('Content-Type', 'text/html');
            
            // 流式传输文件内容
            const fileStream = createReadStream(indexPath);
            fileStream.pipe(res);
            
            fileStream.on('error', (error) => {
              log.error(`文件读取错误: ${error}`);
              res.writeHead(500);
              res.end('Internal server error');
            });
          });
          return;
        }
        
        // 其他错误
        res.writeHead(500);
        res.end('Internal server error');
        return;
      }
      
      // 确定文件的MIME类型
      const contentType = mime.lookup(filePath) || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      
      // 流式传输文件内容
      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        log.error(`文件读取错误: ${error}`);
        res.writeHead(500);
        res.end('Internal server error');
      });
    });
  });
  
  staticServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log.warn(`备用端口 ${PORT} 也被占用，尝试下一个端口`);
      tryAlternativePorts(ports, index + 1, distPath, resolve, reject);
    } else {
      reject(err);
    }
  });
  
  staticServer.listen(PORT, '127.0.0.1', () => {
    global.previewPort = PORT.toString();
    log.info(`静态服务器已启动在备用端口 ${PORT}，为目录 ${distPath} 提供服务`);
    resolve(PORT.toString());
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
      preload: fs.existsSync(path.join(rootPath, 'preload.mjs'))
        ? path.join(rootPath, 'preload.mjs')
        : undefined
    }
  };
  const iconPath = getIconPath();
  if (iconPath) windowOptions.icon = iconPath;

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadURL(`http://127.0.0.1:3002`);
  
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
// 根据是否打包选择正确路径
const nodeServerPath = app.isPackaged 
  ? path.join(process.resourcesPath, 'service', 'build', 'index.mjs')
  : path.join(__dirname, '../service/build/index.mjs');

// 确保可以正确fork ESM模块
const nodeProcess = fork(nodeServerPath, [], { 
  stdio: 'inherit',
  // ESM兼容性选项
  execArgv: ['--experimental-specifier-resolution=node'],
  cwd: app.isPackaged 
    ? path.join(process.resourcesPath, 'service')
    : path.resolve(__dirname, '../service'),
  env: { ...process.env, NODE_ENV: 'production' },
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

// 优雅关闭所有子进程
function cleanupProcesses() {
  log.info('开始清理子进程...');
  
  // 关闭 Node 服务进程
  if (nodeProcess) {
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${nodeProcess.pid} /T /F`, (error) => {
          if (error) log.error(`终止Node服务进程失败: ${error}`);
          else log.info(`成功终止Node服务进程: ${nodeProcess.pid}`);
        });
      } else {
        nodeProcess.kill('SIGKILL');
      }
    } catch (err) {
      log.error(`终止Node服务进程时出错: ${err}`);
    }
  }
  
  // 关闭静态服务器
  if (staticServer) {
    try {
      staticServer.close();
      log.info('静态服务器已关闭');
    } catch (err) {
      log.error(`关闭静态服务器时出错: ${err}`);
    }
  }
}

app.whenReady().then(async () => {
  loadEnv();
  // 注册协议处理程序
  if (app.isPackaged) {
    app.on('web-contents-created', (e, contents) => {
      contents.on('will-navigate', (event, url) => {
        if (url.startsWith('file:')) {
          event.preventDefault();
        }
      });
    });
  } else {
    protocol.registerFileProtocol('file', (request, callback) => {
      const pathname = decodeURI(request.url.replace('file:///', ''));
      callback(pathname);
    });
  }

  try {
    const port = await startStaticServer();
    log.info(`静态服务器已启动在端口 ${port}，准备创建窗口`);
  } catch (err) {
    log.error('启动静态服务器失败:', err);
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

app.on('will-quit', () => {
  log.info('应用即将退出，开始清理资源...');
  globalShortcut.unregisterAll();
  cleanupProcesses();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupProcesses();
    app.quit();
  }
});

app.on('before-quit', () => {
  log.info('应用退出前，确保清理所有进程');
  cleanupProcesses();
});
