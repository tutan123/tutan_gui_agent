"use client";

import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

interface ScrcpyPlayerProps {
  serial: string;
}

export default function ScrcpyPlayer({ serial }: ScrcpyPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Disconnected');
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!serial) return;

    // Connect to Socket.IO (assuming server runs on 3001 or same port)
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('Connecting...');
      socket.emit('start_stream', serial);
    });

    socket.on('video_data', (data: { chunk: string }) => {
      setStatus('Streaming');
      // In a real implementation, you'd use a decoder like Broadway.js 
      // or WebCodecs to render the H.264 data to the canvas.
      // For this prototype, we'll just log receipt.
    });

    return () => {
      socket.disconnect();
    };
  }, [serial]);

  return (
    <div className="relative border rounded-lg overflow-hidden bg-black aspect-[9/16]">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
        {status}: {serial}
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
        {status === 'Streaming' ? "" : "Video Stream Placeholder (H.264 Decoder Required)"}
      </div>
    </div>
  );
}
