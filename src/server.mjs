import express from 'express';
import { Server } from 'socket.io';
import checkWifiConnection from './check-wifi.mjs';
import { createOutputDir, openOutputDir, saveFrameToFile, getOutputFilename } from './media-dir.mjs';


await createOutputDir()

let wifiStatus = false; // Initial state

// Periodically check Wi-Fi connection every 30 seconds
export const wifiCheckInterval = setInterval(async () => {
  const currentWifi = await checkWifiConnection();
  
  // Update wifiStatus only if it has changed
  if (wifiStatus !== currentWifi) {
    wifiStatus = currentWifi;
    console.log(`Wi-Fi status updated: ${wifiStatus}`);
  }
}, 1000); // Check every 1 seconds


const createServer = async ({publicPath, rtspClient, movRecorder}) => {
    const exp = express();
    exp.use(express.static(publicPath));
    // Start the Express server
    const server = exp.listen(0, () => {
        console.log(`Express server is running on http://localhost:${server.address().port}`);
    });
    
    const io = new Server(server, {
        cors: {
            origin: "*",
        }
    });
    
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
                    state: movRecorder.recording,  // TODO: recorder
                }
            });
        };
    
        const interval = setInterval(frameEmitter, 1000 / rtspClient.fps);
    
        socket.on('makeShot', async (data) => {
            console.log("received makeShot event");

            try {
                if (rtspClient.frame) {
                    const filePath = await saveFrameToFile(rtspClient.frame); // Save the current frame
                    io.emit('photo', { filename: filePath });
                } else {
                    io.emit('photo', { error: 'No frame available' });
                }
            } catch (err) {
                io.emit('photo', { error: 'Internal server error' });
            }

        });

        socket.on('openMedia', async (data) => {
            console.log("received openMedia event");
            await openOutputDir()
        });

        socket.on('toggleRecord', async (data) => {

            const onRecError = (error) => {
                socket.emit('record', {error: error})
            }
            movRecorder.on_error = onRecError

            console.log("received toggleRecord event");
            try {
                if (rtspClient.frame && rtspClient.status === 'Running' && !movRecorder.recording) {
                    const outputFile = await getOutputFilename(); // Get the output filename
                    movRecorder.start_async_recording(outputFile)
                    io.emit('record', { msg: "Recording started" });
                } else if (movRecorder.recording) {
                    const outputFile = await movRecorder.stop_recording()
                    io.emit('record', { filename: outputFile })
                }
            } catch (error) {
                io.emit('record', { error: `${error}` });
            }
        });
    
        socket.on('disconnect', () => {
            console.log('Client disconnected');
            clearInterval(interval); // Clear the interval on disconnect
        });
    });

    return server
}




export default createServer