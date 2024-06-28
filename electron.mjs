import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import RTSPClient from './src/rtsp.mjs'; // Adjust the path as necessary
import createServer, { wifiCheckInterval } from './src/server.mjs';

console.log("App path", app.getAppPath())

const __dirname = path.resolve()
console.log("dirname", __dirname)


// RTSP stream configuration
const rtspConfig = {
  host: "192.168.100.1",
  port: 8888,
  uri: 'rtsp://192.168.100.1/stream0'
};

// Create a global RTSPClient instance
const rtspClient = new RTSPClient(rtspConfig.host, rtspConfig.port, rtspConfig.uri);
rtspClient.runAsync();

const server = await createServer(
  {
    publicPath: path.join(__dirname, 'public'),
    rtspClient: rtspClient
  }
)


let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 540,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show(); // Show the window when content is ready
  });

  // Menu.setApplicationMenu(null)
  mainWindow.loadURL(`http://localhost:${server.address().port}/index.html`);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  rtspClient.stop();
  clearInterval(wifiCheckInterval);
  if (process.platform !== 'darwin') {
    if (server) {
      server.close(() => {
        console.log('Express server closed');
      });
    }
    app.quit(); // Quit the Electron app after closing the server
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
