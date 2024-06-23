import ffmpeg from 'fluent-ffmpeg';
import net from 'net';
import sharp from 'sharp';
import fs from 'fs';
import { exec } from 'child_process';

class RTSPClient {
    constructor(host, port, uri, options = {}) {
        this.host = host;
        this.port = port;
        this.rtspUri = uri;
        this.options = options;
        this.fps = 50; // default
        this.frame = null;
        this.status = 'Stopped';
        this._stopEvent = false;
        this._reconnectInterval = null;
        this._socket = null;
        this._ffmpegProcess = null;
        this._stream = null;
    }

    async _getStreamFps() {
        // Custom implementation might be needed
        this.fps = this.fps; // Placeholder
        console.info(`Stream FPS: ${this.fps}`);
    }

    async _open() {
        while (!this._stopEvent) {
            try {
                if (this.host && this.port) {
                    await this._initSocket(this.host, this.port);
                }
                this._ffmpegProcess = ffmpeg(this.rtspUri)
                    .inputOptions('-rtsp_transport tcp')
                    .outputOptions('-f image2pipe', '-vcodec mjpeg', '-')
                    .on('error', (err) => {
                        console.error(`FFmpeg error: ${err.message}`);
                        this._reconnect();
                    });

                this._stream = this._ffmpegProcess.pipe();
                await this._getStreamFps();
                console.info("Connected to stream");
                break;
            } catch (e) {
                console.error(`Failed to connect: ${e.message}`);
                await this._sleep(1000);
            }
        }
    }

    async _close() {
        if (this._ffmpegProcess) {
            this._ffmpegProcess.kill();
            this._ffmpegProcess = null;
        }
        this.status = 'Stopped';
        this.frame = null;
        if (this._socket) {
            this._socket.destroy();
            this._socket = null;
        }
    }

    async _reconnect() {
        if (!this._ffmpegProcess) {
            console.info("Connecting...");
        } else {
            console.info("Connection lost, reconnecting...");
        }
        await this._close();
        await this._open();
    }

    async _readFrame() {
        return new Promise((resolve, reject) => {
            this._stream.once('data', (chunk) => {
                resolve(chunk);
            });
            this._stream.once('error', (err) => {
                reject(new Error("Failed to read frame"));
            });
        });
    }

    async runAsync() {
        try {
            console.info("Running RTSP client");
            await this._reconnect();
            while (!this._stopEvent) {
                try {
                    if (this._ffmpegProcess) {
                        const frame = await this._readFrame();
                        this.status = 'Running';
                        this.frame = frame;
                        await this._sleep(1000 / (this.fps * 2));
                    } else {
                        throw new Error("FFmpeg process not running");
                    }
                } catch (e) {
                    this.status = 'Error';
                    console.error(`${e.message}`);
                    await this._reconnect();
                }
            }
        } catch (e) {
            console.error(`RTSP client error: ${e.message}`);
        } finally {
            await this._close();
            console.info("RTSP client finalized");
        }
    }

    async stop() {
        console.info("RTSP client stop event set: True");
        this._stopEvent = true;
        if (this._reconnectInterval) {
            clearInterval(this._reconnectInterval);
        }
        await this._close();
    }

    async _initSocket(host, port) {
        try {
            if (!(await this._ping(host))) {
                throw new Error("Host is not reachable");
            }

            this._socket = new net.Socket();
            this._socket.connect(port, host, () => {
                const initCommand = "CMD_RTSP_TRANS_START";
                this._socket.write(initCommand);
                this._socket.once('data', (data) => {
                    const response = data.toString();
                    console.info(`Response: ${response}`);
                    if (!response.includes("CMD_ACK_START_RTSP_LIVE")) {
                        throw new Error("Socket error");
                    }
                });
            });

            this._socket.on('error', (err) => {
                throw new Error(`Socket error: ${err.message}`);
            });
        } catch (error) {
            throw error;
        }
    }

    async shot(filename) {
        if (this.frame) {
            fs.writeFileSync(`${filename}.jpg`, this.frame);
            return `${filename}.jpg`;
        }
        return null;
    }

    async resizeFrame(frame, width, height) {
        const metadata = await sharp(frame).metadata();
        const aspectRatio = metadata.width / metadata.height;

        let newWidth, newHeight;
        if (width / height > aspectRatio) {
            newHeight = height;
            newWidth = Math.round(height * aspectRatio);
        } else {
            newWidth = width;
            newHeight = Math.round(width / aspectRatio);
        }

        return sharp(frame).resize(newWidth, newHeight).toBuffer();
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async _ping(host) {
        return new Promise((resolve, reject) => {
            const pingCommand = process.platform === 'win32' ? `ping -n 1 ${host}` : `ping -c 1 ${host}`;
            exec(pingCommand, (error, stdout, stderr) => {
                if (error) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }
}

export default RTSPClient;
