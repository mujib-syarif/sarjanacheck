const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sarjanaDesktop', {
  version: ipcRenderer.sendSync('app:version'),
  check: () => ipcRenderer.send('update:check'),
  install: () => ipcRenderer.send('update:install'),
  onUpdate: (cb) => ipcRenderer.on('update', (_e, payload) => cb(payload))
});
