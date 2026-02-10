"use client";

import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

interface UINode {
  ref_id: string;
  role: string;
  bounds: { left: number; top: number; right: number; bottom: number };
  text: string;
}

interface ScrcpyPlayerProps {
  serial: string;
}

export default function ScrcpyPlayer({ serial }: ScrcpyPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Disconnected');
  const [nodes, setNodes] = useState<Record<string, UINode>>({});
  const [activeRef, setActiveRef] = useState<string | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!serial) return;

    const socket = io('http://localhost:18888'); // Backend port
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('Connected');
    });

    socket.on('screen_data', (data: { serial: string, data: string }) => {
      if (data.serial === serial) {
        setStatus('Streaming');
        // Decoder logic would go here
      }
    });

    socket.on('agent_event', (event: { serial: string, type: string, data: any }) => {
      if (event.serial !== serial) return;

      if (event.type === 'ui_update') {
        setNodes(event.data.nodes);
      } else if (event.type === 'step') {
        setActiveRef(event.data.params?.ref_id || null);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [serial]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Ref Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {Object.values(nodes).map((node) => (
          <div
            key={node.ref_id}
            className={`absolute border ${
              activeRef === node.ref_id 
                ? 'border-red-500 bg-red-500/20 z-20' 
                : 'border-blue-400/30 bg-blue-400/5 z-10'
            } transition-all duration-300`}
            style={{
              left: `${(node.bounds.left / 1080) * 100}%`,
              top: `${(node.bounds.top / 2400) * 100}%`,
              width: `${((node.bounds.right - node.bounds.left) / 1080) * 100}%`,
              height: `${((node.bounds.bottom - node.bounds.top) / 2400) * 100}%`,
            }}
          >
            <span className={`absolute -top-4 left-0 text-[8px] px-1 rounded font-bold ${
              activeRef === node.ref_id ? 'bg-red-500 text-white' : 'bg-blue-500/80 text-white'
            }`}>
              {node.ref_id}
            </span>
          </div>
        ))}
      </div>

      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${status === 'Streaming' ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
        <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest bg-black/40 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
          {status}: {serial}
        </span>
      </div>
    </div>
  );
}
