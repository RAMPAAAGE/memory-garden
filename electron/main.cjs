const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: '#fff4ec',
    title: 'Для тебя ♥',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.setMenu(null);
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
    if (input.type === 'keyDown' && input.key === 'Escape' && win.isFullScreen()) win.setFullScreen(false);
  });

  const dev = process.env.GIFT_DEV_URL;
  if (dev) win.loadURL(dev);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
