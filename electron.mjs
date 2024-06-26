import { app, BrowserWindow, protocol, Menu } from 'electron';
import path from 'path';
import url, { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import RTSPClient from './rtsp.mjs'; // Adjust the path as necessary
import fs from 'fs-extra';
import sharp from 'sharp';

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

  Menu.setApplicationMenu(null);

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(app.getAppPath(), 'pwa', 'index.html')}`;
  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

io.on('connection', (socket) => {
  console.log('New client connected');

  try {
    const frameEmitter = async () => {
      const frame = rtspClient.frame

      const jpegFrame = async (frameBuffer) => {
        return await sharp(frameBuffer)
          .jpeg({ quality: 100 }) // Встановити високу якість JPEG
          .toBuffer()
      };

      let frameBase64 = null;
      if (frame && rtspClient.status === 'Running') {
        const jpegBuffer = await jpegFrame(frame);
        frameBase64 = jpegBuffer.toString('base64');
      }

      socket.emit('frame', {
        "wifi": true,
        "stream": {
            "frame": frameBase64,
            "state": rtspClient.status,
            "error": rtspClient.error
        },
        "recording": {
            "state": false,
        }
      });
    };

    const interval = setInterval(frameEmitter, 1000 / rtspClient.fps);
    // const interval = setInterval(frameEmitter, 1000 / 1);


    socket.on('makeShot', (data) => {
        console.log("received makeShot event")
    });

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
  protocol.interceptFileProtocol('file', async (request, callback) => {

    let filePath = request.url

    if (filePath.startsWith("file:///C:/_expo") || filePath.startsWith("file:///C:/assets")) {
      let fileUrl = `file://${path.join(app.getAppPath(), 'pwa', request.url.slice("file:///C:/".length))}`
      if (fs.pathExists(url.fileURLToPath(fileUrl))) {
        filePath = fileUrl
      }
    }
    filePath = url.fileURLToPath(filePath)
    // Resolve the file path correctly
    callback({ path: path.normalize(filePath) });
  })
  createWindow()
});

app.on('window-all-closed', function () {
  rtspClient.stop()
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
