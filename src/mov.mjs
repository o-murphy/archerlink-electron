import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { outputDir } from "./media-dir.mjs";


export default class MovRecorder {
    constructor(rtsp_uri, on_error) {
        this.filename = null;
        this.rtspUri = rtsp_uri;
        this.recording = false;
        this.on_error = on_error;
        this.ffmpegProcess = null;
        this.fps = 50;
    }

    async start_async_recording(filename) {
        this.filename = path.join(filename + '.mov');
        this.recording = true;
        this.ffmpegProcess = ffmpeg(this.rtspUri)
            .addOption('-acodec', 'copy')
            .addOption('-vcodec', 'libx264')
            .output(this.filename)
            .format('mov')
            .on('error', (err, stdout, stderr) => {
                console.error('Error:', err.message);
                console.error('ffmpeg stdout:', stdout);
                console.error('ffmpeg stderr:', stderr);
                this.recording = false;
                this.ffmpegProcess = null;
                if (this.on_error && typeof this.on_error === 'function') {
                    this.on_error(err);
                }
            })
            .on('end', () => {
                console.log('ffmpeg recording finished');
                this.recording = false;
                this.ffmpegProcess = null;
            })

        this.ffmpegProcess.run();
    }

    async stop_recording() {
        if (this.ffmpegProcess) {
            // Send SIGINT to stop ffmpeg process
            // this.ffmpegProcess.write('q')
            this.ffmpegProcess.kill('SIGINT');

            // // For Windows: Force kill the process
            // if (process.platform === 'win32') {
            //     await execPromise(`taskkill /pid ${this.ffmpegProcess.pid} /T /F`);
            // }

            // Wait for the process to close
            await new Promise((resolve) => {
                this.ffmpegProcess.on('close', (code) => {
                    console.log(`ffmpeg process exited with code ${code}`);
                    resolve();
                });
            });

            this.recording = false;
            this.ffmpegProcess = null;
        }

        return this.filename;
    }
}
