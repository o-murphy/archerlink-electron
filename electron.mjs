import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { Server } from 'socket.io';
import RTSPClient from './rtsp.mjs'; // Adjust the path as necessary
import express from 'express';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

console.log("App path", app.getAppPath())

const __dirname = path.resolve()
console.log("dirname", __dirname)


const exp = express();
exp.use(express.static(path.join(__dirname, 'pwa')));
// Start the Express server
const server = exp.listen(0, () => {
  console.log(`Express server is running on http://localhost:${server.address().port}`);
});

const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// RTSP stream configuration
const rtspConfig = {
  host: "192.168.100.1",
  port: 8888,
  uri: 'rtsp://192.168.100.1/stream0'
};

// Create a global RTSPClient instance
const rtspClient = new RTSPClient(rtspConfig.host, rtspConfig.port, rtspConfig.uri);
rtspClient.runAsync();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
  });

  // Menu.setApplicationMenu(null)
  mainWindow.loadURL(`http://localhost:${server.address().port}/index.html`);


  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

io.on('connection', (socket) => {
  console.log('New client connected');

  const frameEmitter = async () => {
    const frame = rtspClient.frame;

    socket.emit('frame', {
      wifi: true,
      stream: {
        frame: frame ? frame.toString('base64') : null,
        state: rtspClient.status,
        error: rtspClient.error,
      },
      recording: {
        state: false,
      }
    });
  };

  const interval = setInterval(frameEmitter, 1000 / rtspClient.fps);

  socket.on('makeShot', (data) => {
    console.log("received makeShot event");
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    clearInterval(interval); // Clear the interval on disconnect
  });
});

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  rtspClient.stop();
  if (process.platform !== 'darwin') {
    if (server) {
      server.close(() => {
        console.log('Express server closed');
        app.quit(); // Quit the Electron app after closing the server
      });
    } else {
      app.quit(); // Quit the Electron app if server is not defined
    }
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
