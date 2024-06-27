import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { Server } from 'socket.io';
import express from 'express';
import RTSPClient from './src/rtsp.mjs'; // Adjust the path as necessary
import checkWifiConnection from './src/check-wifi.mjs';
import { createOutputDir, openOutputDir, saveFrameToFile } from './src/media-dir.mjs';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

console.log("App path", app.getAppPath())

const __dirname = path.resolve()
console.log("dirname", __dirname)


await createOutputDir()


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

// Endpoint to handle POST requests
exp.post('/api/media', async (req, res) => {
  // const data = req.body; // Assuming JSON data is sent in the request body

  // Process the data received
  // console.log("Received POST data:", data);
  await openOutputDir()

  // Send a response
  res.status(200).json({ message: 'Data received successfully' });
});


exp.post('/api/photo', async (req, res) => {
  try {
    if (rtspClient.frame) {
      const filePath = await saveFrameToFile(rtspClient.frame); // Save the current frame
      res.status(200).json({filename: filePath});
    } else {
      res.status(400).json({ message: 'No frame available' });
    }
  } catch (err) {
    console.error('Error in POST /api/photo:', err);
    res.status(500).json({ message: 'Internal server error' });
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

let wifiStatus = false; // Initial state


// Periodically check Wi-Fi connection every 30 seconds
const wifiCheckInterval = setInterval(async () => {
  const currentWifi = await checkWifiConnection();
  
  // Update wifiStatus only if it has changed
  if (wifiStatus !== currentWifi) {
    wifiStatus = currentWifi;
    console.log(`Wi-Fi status updated: ${wifiStatus}`);
  }
}, 1000); // Check every 1 seconds


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

io.on('connection', (socket) => {
  console.log('New client connected');

  const frameEmitter = async () => {
    const frame = rtspClient.frame;
    socket.emit('frame', {
      wifi: wifiStatus,
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
