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
            .addOptions(['-acodec copy', '-vcodec copy'])
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
            });

        this.ffmpegProcess.run();
    }

    async stop_recording() {
        if (this.ffmpegProcess) {
            this.ffmpegProcess.kill('SIGINT'); // Send SIGINT to stop ffmpeg process
            await execPromise(`taskkill /pid ${this.ffmpegProcess.pid} /T /F`); // Force kill the process on Windows
            this.recording = false;
            this.ffmpegProcess = null;
        }
        return this.filename;
    }
}
