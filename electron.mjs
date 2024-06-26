import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import RTSPClient from './rtsp.mjs'; // Adjust the path as necessary
import sharp from 'sharp';
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

  // Menu.setApplicationMenu(null);

  // const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(app.getAppPath(), 'pwa', 'index.html')}`;

  mainWindow.loadURL(`http://localhost:${server.address().port}/index.html`);


  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

io.on('connection', (socket) => {
  console.log('New client connected');

  const frameEmitter = async () => {
    const frame = rtspClient.frame;

    const jpegFrame = async (frameBuffer) => {
      return await sharp(frameBuffer)
        .jpeg({ quality: 100 }) // Set high JPEG quality
        .toBuffer();
    };

    let frameBase64 = null;
    if (frame && rtspClient.status === 'Running') {
      const jpegBuffer = await jpegFrame(frame);
      frameBase64 = jpegBuffer.toString('base64');
    }

    socket.emit('frame', {
      wifi: true,
      stream: {
        frame: frameBase64,
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


// app.on('ready', () => {
//   protocol.handle('file', async (request) => {
//     let filePath = request.url;

//     if (filePath.startsWith("file:///C:/_expo") || filePath.startsWith("file:///C:/assets")) {
//       let fileUrl = `file://${path.join(app.getAppPath(), 'pwa', request.url.slice("file:///C:/".length))}`;
//       if (await fs.pathExists(url.fileURLToPath(fileUrl))) {
//         filePath = fileUrl;
//       }
//     }

//     console.log(`Handling file request: ${filePath}`);
//     return net.fetch(filePath, { bypassCustomProtocolHandlers: true });
//   });

//   protocol.handle('http', async (request) => {
//     let newPath = request.url;
//     const { host, pathname } = url.parse(request.url);

//     if (host === 'file' && pathname.startsWith('/socket.io/')) {
//       // newPath = `http://127.0.0.1:${server.address().port}${pathname}`;
//       // newPath = `http://127.0.0.1:${server.address().port}` + newPath.slice("http://file".length);
//       const customRequest = net.request({
//         protocol: 'http',
//         method: 'GET',
//         hostname: '127.0.0.1',
//         port: server.address().port,
//         path: newPath.slice("http://file".length)
//       });
//       console.log("Handling http request:", customRequest);

//       return net.fetch(customRequest)
//     }

//     return net.fetch(request)
//   });

//   createWindow();
// });
