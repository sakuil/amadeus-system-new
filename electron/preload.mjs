import { contextBridge, ipcRenderer } from 'electron';

// 这里可以安全地暴露主进程能力给渲染进程（前端页面）
contextBridge.exposeInMainWorld('electron', {
  // 目前没有暴露方法，如后续需要主进程与前端通信可在此扩展
  // 示例：
  // onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  // send: (channel, data) => ipcRenderer.send(channel, data)
});
