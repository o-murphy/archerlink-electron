import http from 'http';
import { Server } from 'socket.io';
import RTSPClient from './rtsp.mjs'; // Assuming both files are in the same directory

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
rtspClient.runAsync();

io.on('connection', async (socket) => {
  console.log('New client connected');

  try {
    // await rtspClient.runAsync(); // Start RTSP client asynchronously

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
      rtspClient.stop(); // Stop the RTSP client when client disconnects
    });
  } catch (error) {
    console.error('Error starting RTSP client:', error);
  }
});

server.listen(8000, () => {
  console.log('Server is listening on port 8000');
});
