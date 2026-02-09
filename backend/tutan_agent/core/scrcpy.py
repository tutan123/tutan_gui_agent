import asyncio
import socket
import struct
import subprocess
import threading
from typing import Optional, Dict, Any
from loguru import logger

class ScrcpyStreamer:
    """
    Manages scrcpy-server on the device and streams video data.
    Aligns with the ya-webadb / openclaw protocol for frame parsing.
    """
    def __init__(self, serial: str, sio_server, local_port: int = 27183):
        self.serial = serial
        self.sio = sio_server
        self.local_port = local_port
        self.process: Optional[subprocess.Popen] = None
        self.socket: Optional[socket.socket] = None
        self._stop_event = asyncio.Event()
        self.server_path = self._find_server_jar()

    def _find_server_jar(self) -> str:
        """Locate the scrcpy-server.jar file."""
        # For now, assume it's in a known location or project root
        candidates = [
            "scrcpy-server-v3.3.3",
            "../scrcpy-server-v3.3.3",
            "backend/scrcpy-server-v3.3.3"
        ]
        for c in candidates:
            if os.path.exists(c):
                return os.path.abspath(c)
        return "scrcpy-server.jar" # Fallback

    async def start(self):
        self._stop_event.clear()
        logger.info(f"Starting Scrcpy for {self.serial} on port {self.local_port}")

        try:
            # 1. Push server to device
            from tutan_agent.adb.manager import ADBManager
            adb = ADBManager()
            adb._execute(["-s", self.serial, "push", self.server_path, "/data/local/tmp/scrcpy-server.jar"])

            # 2. Setup port forward
            adb._execute(["-s", self.serial, "forward", f"tcp:{self.local_port}", "localabstract:scrcpy"])

            # 3. Start server on device
            # Note: Version 3.3.3 arguments
            server_cmd = [
                adb.adb_path, "-s", self.serial, "shell",
                "CLASSPATH=/data/local/tmp/scrcpy-server.jar",
                "app_process", "/", "com.genymobile.scrcpy.Server",
                "3.3.3", "max_size=1024", "video_bit_rate=2000000", "max_fps=30",
                "tunnel_forward=true", "audio=false", "control=true", "cleanup=true"
            ]
            self.process = subprocess.Popen(server_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            # 4. Wait for server to initialize and connect socket
            await asyncio.sleep(1)
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect(("127.0.0.1", self.local_port))
            self.socket.setblocking(False)

            # 5. Start streaming loop
            asyncio.create_task(self._stream_loop())
            logger.info(f"Scrcpy stream connected for {self.serial}")

        except Exception as e:
            logger.error(f"Failed to start scrcpy: {e}")
            self.stop()

    async def _stream_loop(self):
        """
        Read raw video packets from the socket and emit via Socket.IO.
        This is a simplified version; a full implementation would parse H.264 NAL units.
        """
        loop = asyncio.get_running_loop()
        try:
            # Skip dummy byte and metadata if sent by server
            # (Simplified: just read and forward chunks)
            while not self._stop_event.is_set():
                data = await loop.sock_recv(self.socket, 1024 * 16)
                if not data:
                    break
                
                # Emit raw video data to the frontend
                # The frontend would use a decoder (like Broadway.js or WebCodecs)
                await self.sio.emit("screen_data", {"serial": self.serial, "data": data.hex()})
                
        except Exception as e:
            logger.error(f"Stream loop error: {e}")
        finally:
            self.stop()

    def stop(self):
        self._stop_event.set()
        if self.socket:
            self.socket.close()
        if self.process:
            self.process.terminate()
        logger.info(f"Scrcpy stream stopped for {self.serial}")
import os
