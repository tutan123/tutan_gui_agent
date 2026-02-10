"use client";

import DeviceManager from '@/components/DeviceManager';
import AgentConsole from '@/components/AgentConsole';
import ScrcpyPlayer from '@/components/ScrcpyPlayer';
import { useState } from 'react';

export default function Home() {
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">TUTAN_AGENT</h1>
            <p className="text-slate-500">Industrial-grade Android GUI Agent</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border text-sm font-medium">
              Status: <span className="text-green-600">Online</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Device Management */}
          <div className="lg:col-span-4 space-y-8">
            <DeviceManager onSelectDevice={(serial) => setSelectedSerial(serial)} />
            
            {selectedSerial && (
              <div className="p-4 bg-white border rounded-lg shadow-sm space-y-2">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">当前选定设备</h3>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-medium text-blue-600">{selectedSerial}</span>
                  <button 
                    onClick={() => setSelectedSerial(null)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    取消选择
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Agent Control & Stream */}
          <div className="lg:col-span-8 space-y-8">
            {selectedSerial ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">实时画面</h3>
                  <ScrcpyPlayer serial={selectedSerial} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Agent 控制</h3>
                  <AgentConsole serial={selectedSerial} />
                </div>
              </div>
            ) : (
              <div className="h-[600px] flex flex-col items-center justify-center bg-white border-2 border-dashed rounded-xl text-slate-400 space-y-4">
                <div className="p-4 bg-slate-50 rounded-full">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium">请先从左侧选择一个 Android 设备</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
