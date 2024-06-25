import { app, BrowserWindow, net, protocol } from 'electron';
import path from 'path';
import url, { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import RTSPClient from './rtsp.mjs'; // Adjust the path as necessary
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// RTSP stream configuration
const rtspConfig = {
  host: "192.168.100.1",
  port: 8888,
  // uri: 'rtsp://localhost:8554/test'
  uri: 'rtsp://192.168.100.1/stream0'
};

// Create a global RTSPClient instance
const rtspClient = new RTSPClient(rtspConfig.host, rtspConfig.port, rtspConfig.uri);
rtspClient.runAsync()

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'pwa/index.html')}`;
  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

io.on('connection', async (socket) => {
  console.log('New client connected');

  try {
    const frameEmitter = () => {
      if (rtspClient.status === 'Running' && rtspClient.frame) {
        console.log("Emit frame")
        const frame = rtspClient.frame.toString('base64');
        socket.emit('frame', frame);
      }
    };

    const interval = setInterval(frameEmitter, 1000 / rtspClient.fps);

    socket.on('disconnect', () => {
      console.log('Client disconnected');
      clearInterval(interval); // Clear the interval on disconnect
    });
  } catch (error) {
    console.error('Error starting RTSP client:', error);
  }
});

server.listen(8000, () => {
  console.log('Server is listening on port 8000');
});

app.on('ready', () => {
  // protocol.handle('file', async (request, callback) => {
  //   const pathname = decodeURIComponent(request.url.replace('file:///', ''));
  //   if (path.isAbsolute(pathname) ? await fs.pathExists(pathname) : await fs.pathExists(`/${pathname}`)) {
  //     console.log(pathname)
  //     callback(pathname);
  //   } else {
  //     const filePath = path.join(app.getAppPath(), '.webpack/renderer', pathname);
  //     console.log(pathname)
  //     callback(filePath);
  //   }
  // });

  protocol.handle('file', async (request) => {
    console.log(request.url)
    // const fileUrl = request.url.replace('static://', '');
    // console.log(fileUrl)
    // const filePath = path.join(app.getAppPath(), fileUrl);
    return net.fetch(request.url)
    re
  });

  createWindow()
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    rtspClient.stop()
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
