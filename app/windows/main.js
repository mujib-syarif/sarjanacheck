const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let win;

function send(payload) {
  if (win && !win.isDestroyed()) win.webContents.send('update', payload);
}

function setupUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', (i) => send({ type: 'available', version: i.version }));
  autoUpdater.on('update-not-available', () => send({ type: 'none' }));
  autoUpdater.on('download-progress', (p) => send({ type: 'progress', percent: p.percent }));
  autoUpdater.on('update-downloaded', (i) => send({ type: 'downloaded', version: i.version }));
  autoUpdater.on('error', (e) => send({ type: 'error', message: String((e && e.message) || e) }));
}

function check() {
  if (!app.isPackaged) return send({ type: 'none' });
  autoUpdater.checkForUpdates().catch((e) => send({ type: 'error', message: String(e.message || e) }));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 420,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#10131a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // Worker API hanya mengizinkan origin github.io; app membuka dari file://, jadi
  // izinkan CORS untuk respons dari API sendiri.
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['https://sarjana-checker-api.mujib.workers.dev/*'] },
    (details, cb) => {
      const h = Object.assign({}, details.responseHeaders);
      Object.keys(h).forEach((k) => { if (k.toLowerCase().startsWith('access-control-allow-origin')) delete h[k]; });
      h['Access-Control-Allow-Origin'] = ['*'];
      cb({ responseHeaders: h });
    }
  );

  setupUpdater();
  createWindow();
  ipcMain.on('app:version', (e) => { e.returnValue = app.getVersion(); });
  ipcMain.on('update:check', check);
  ipcMain.on('update:install', () => autoUpdater.quitAndInstall());
  win.webContents.once('did-finish-load', () => setTimeout(check, 3000));
});

app.on('window-all-closed', () => app.quit());
