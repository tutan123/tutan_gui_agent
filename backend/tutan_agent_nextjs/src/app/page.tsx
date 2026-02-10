"use client";

import DeviceManager from '@/components/DeviceManager';
import AgentConsole from '@/components/AgentConsole';
import ScrcpyPlayer from '@/components/ScrcpyPlayer';
import { useState } from 'react';
import { LayoutDashboard, Settings, History, Info, Cpu, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';

export default function Home() {
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - AutoGLM Style */}
      <aside className="w-16 lg:w-64 bg-white border-r flex flex-col transition-all duration-300 ease-in-out shadow-sm z-20">
        <div className="p-4 lg:p-6 flex items-center gap-3 border-b">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
            <Cpu className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight hidden lg:block text-slate-800">TUTAN_AGENT</span>
        </div>
        
        <nav className="flex-1 p-2 lg:p-4 space-y-1 overflow-y-auto">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="控制面板" active />
          <SidebarItem icon={<History size={20} />} label="执行历史" />
          <SidebarItem icon={<Settings size={20} />} label="系统设置" />
        </nav>

        <div className="p-4 border-t space-y-4">
          <div className="hidden lg:block p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <ShieldCheck size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">System Secure</span>
            </div>
            <p className="text-[10px] text-blue-600/80 leading-relaxed">
              ADB 链路已加密，Ref 系统运行正常
            </p>
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
            <div className="hidden lg:block overflow-hidden">
              <p className="text-xs font-bold text-slate-700 truncate">Admin User</p>
              <p className="text-[10px] text-slate-400 truncate">v0.1.0-alpha</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Workspace</h2>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-600">ADB Server: Online</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
              <Info size={20} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Device Management */}
              <div className="xl:col-span-3 space-y-6">
                <DeviceManager onSelectDevice={(serial) => setSelectedSerial(serial)} />
                
                {selectedSerial && (
                  <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-200 text-white space-y-4 transform transition-all hover:scale-[1.02]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Active Device</span>
                      <button 
                        onClick={() => setSelectedSerial(null)}
                        className="p-1 hover:bg-white/20 rounded-md transition-colors"
                      >
                        <Square size={14} />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-mono font-bold tracking-tight">{selectedSerial}</p>
                      <p className="text-xs opacity-70 flex items-center gap-1">
                        <CheckCircle2 size={12} /> 已建立安全隧道
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Agent & Stream */}
              <div className="xl:col-span-9">
                {selectedSerial ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Live Stream</h3>
                        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">60 FPS</span>
                      </div>
                      <div className="rounded-3xl border-8 border-slate-900 shadow-2xl overflow-hidden bg-black aspect-[9/19.5] relative group">
                        <ScrcpyPlayer serial={selectedSerial} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                    </div>
                    
                    <div className="space-y-4 h-full flex flex-col">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Agent Intelligence</h3>
                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">GPT-4o</span>
                      </div>
                      <div className="flex-1 min-h-[600px]">
                        <AgentConsole serial={selectedSerial} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[700px] flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-[2rem] text-slate-400 space-y-6">
                    <div className="relative">
                      <div className="absolute -inset-4 bg-blue-100 rounded-full blur-2xl opacity-50 animate-pulse" />
                      <div className="relative p-8 bg-slate-50 rounded-full border border-slate-100">
                        <SmartphoneIcon className="w-16 h-16 text-slate-300" />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-xl font-bold text-slate-600">等待设备连接</p>
                      <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                        请从左侧面板选择一个已连接的 Android 设备以开启智能 Agent 协作
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={clsx(
      "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
      active ? "bg-blue-50 text-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
    )}>
      <div className={clsx("shrink-0 transition-transform group-hover:scale-110", active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")}>
        {icon}
      </div>
      <span className="text-sm font-bold hidden lg:block">{label}</span>
    </button>
  );
}

function SmartphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
