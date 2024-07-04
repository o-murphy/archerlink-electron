const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const RTSPClient = require('./src/rtsp.js');
const { createServer, wifiCheckInterval } = require('./src/server.js');
const MovRecorder = require('./src/mov.js');

const appDir = path.resolve();
console.log("dirname", appDir);

// RTSP stream configuration
const rtspConfig = {
  host: "192.168.100.1",
  port: 8888,
  uri: 'rtsp://192.168.100.1/stream0'
};

// Create a global RTSPClient instance
const rtspClient = new RTSPClient(rtspConfig.host, rtspConfig.port, rtspConfig.uri);
rtspClient.runAsync();

// Create recorder
const movRecorder = new MovRecorder(rtspConfig.uri, (err) => console.error(err));

// Start server
async function startServer() {
  const server = await createServer({
    publicPath: path.join(appDir, 'public'),
    rtspClient: rtspClient,
    movRecorder: movRecorder
  });

  let mainWindow;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 720,
      height: 480,
      minWidth: 720,
      minHeight: 480,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      autoHideMenuBar: true,
    });

    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
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
    movRecorder.stop_recording();
    clearInterval(wifiCheckInterval);
    if (process.platform !== 'darwin') {
      if (server) {
        server.close(() => {
          console.log('Express server closed');
        });
      }
      app.quit();
    }
  });

  app.on('activate', function () {
    if (mainWindow === null) {
      createWindow();
    }
  });
}

startServer();
