import http from 'http';
import { Server } from 'socket.io';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// Вкажіть шлях до ffmpeg.exe в кореневій директорії проекту
const ffmpegPath = path.resolve('ffmpeg.exe');
ffmpeg.setFfmpegPath(ffmpegPath);

io.on('connection', (socket) => {
  console.log('New client connected');

  const stream = ffmpeg('rtsp://localhost:8554/test')
    .addOption('-f', 'image2pipe')
    .addOption('-vf', 'fps=25')
    .format('image2pipe')
    .pipe();

  stream.on('data', (chunk) => {
    const frame = chunk.toString('base64');
    socket.emit('frame', frame);
  });

  stream.on('error', (err) => {
    console.error('Stream error:', err);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    stream.kill('SIGINT');
  });
});

server.listen(8080, () => {
  console.log('Server is listening on port 8080');
});
