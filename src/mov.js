const path = require('path');
const ffmpeg = require('fluent-ffmpeg');


class MovRecorder {
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
            .addOption('-rtsp_transport', `udp`)
            // .addOption('-vf', `fps=${this.fps}`)
            .addOption('-acodec', 'copy')
            .addOption('-vcodec', 'libx264')
            .addOption('-q:v', '1')
            .addOption('-ab', '32k')
            // .addOption('-movflags', '+faststart+frag_keyframe+empty_moov+default_base_moof')
            .format('mov')
            // .addOption('-vf', `fps=${this.fps}`)
            .output(this.filename)
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

        this.ffmpegProcess.on('progress', (progress) => {
            console.log("REC FPS:", progress.currentFps)
            this.fps = progress.currentFps
        })

        this.ffmpegProcess.run();
    }

    async stop_recording() {
        if (this.ffmpegProcess) {
            // Send SIGINT to stop ffmpeg process
            if (process.platform === 'win32') {
                this.ffmpegProcess.ffmpegProc.stdin.write('q')
            }
            // this.ffmpegProcess.kill('SIGINT');

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

module.exports = MovRecorder;
