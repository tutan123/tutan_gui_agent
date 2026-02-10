import { Server } from 'socket.io';
import { createServer } from 'http';
import { ADB } from './adb';
import { spawn } from 'child_process';
import path from 'path';

export class ScrcpyManager {
  private static io: Server;
  private static activeStreams: Map<string, any> = new Map();

  static init(server: any) {
    this.io = new Server(server, {
      cors: { origin: "*" }
    });

    this.io.on('connection', (socket) => {
      console.log('[Scrcpy] Client connected:', socket.id);
      
      socket.on('start_stream', async (serial: string) => {
        await this.startStream(serial, socket);
      });

      socket.on('disconnect', () => {
        console.log('[Scrcpy] Client disconnected');
      });
    });
  }

  static async startStream(serial: string, socket: any) {
    if (this.activeStreams.has(serial)) {
      console.log(`[Scrcpy] Stream already active for ${serial}`);
      return;
    }

    console.log(`[Scrcpy] Starting stream for ${serial}...`);

    // 1. Push server (simplified for now, assume it's in project root or path)
    const serverJar = 'scrcpy-server-v3.3.3'; 
    
    try {
      // 2. Setup port forward
      const localPort = 27183 + this.activeStreams.size;
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      await execAsync(`adb -s ${serial} forward tcp:${localPort} localabstract:scrcpy`);

      // 3. Start scrcpy-server on device
      const scrcpyProcess = spawn('adb', [
        '-s', serial, 'shell', 
        'CLASSPATH=/data/local/tmp/scrcpy-server.jar', 
        'app_process', '/', 'com.genymobile.scrcpy.Server', 
        '3.3.3', 'max_size=1024', 'video_bit_rate=2000000', 'tunnel_forward=true', 'control=true'
      ]);

      scrcpyProcess.stderr.on('data', (data) => {
        console.error(`[Scrcpy Server Error]: ${data}`);
      });

      // 4. Connect to the socket and pipe to Socket.IO
      // This is a simplified placeholder. Real implementation needs net.connect
      const net = require('net');
      setTimeout(() => {
        const client = net.connect(localPort, '127.0.0.1', () => {
          console.log(`[Scrcpy] Connected to socket for ${serial}`);
        });

        client.on('data', (data: Buffer) => {
          // Send raw video chunks to frontend
          socket.emit('video_data', { serial, chunk: data.toString('base64') });
        });

        this.activeStreams.set(serial, { process: scrcpyProcess, socket: client });
      }, 2000);

    } catch (err) {
      console.error('[Scrcpy Start Error]', err);
    }
  }

  static stopStream(serial: string) {
    const stream = this.activeStreams.get(serial);
    if (stream) {
      stream.process.kill();
      stream.socket.destroy();
      this.activeStreams.delete(serial);
    }
  }
}
