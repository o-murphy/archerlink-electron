class MovRecorder {
    constructor(rtsp, on_error) {
        this.filename = null;
        this.rtsp = rtsp;
        this.recording = false;
        this.on_error = on_error;
        this.ffmpegProcess = null;
    }

    async start_async_recording(filename) {
        this.filename = path.join(OUTPUT_DIR, filename + '.mov');
        this.recording = true;

        this.ffmpegProcess = ffmpeg(this.rtsp.uri)
            .inputOptions('-rtsp_transport', 'tcp')
            .outputOptions('-c:v', 'libx264')
            .output(this.filename)
            .on('error', (err, stdout, stderr) => {
                console.error('Error:', err.message);
                console.error('ffmpeg stdout:', stdout);
                console.error('ffmpeg stderr:', stderr);
                this._error = err;
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
