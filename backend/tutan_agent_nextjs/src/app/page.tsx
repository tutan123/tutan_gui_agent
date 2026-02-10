"use client";

import { useState } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  History, 
  Cpu, 
  ShieldCheck, 
  Info, 
  Smartphone as SmartphoneIcon,
  Square,
  CheckCircle2,
  Menu,
  X
} from 'lucide-react';
import { clsx } from 'clsx';
import DeviceManager from '@/components/DeviceManager';
import AgentConsole from '@/components/AgentConsole';
import ScrcpyPlayer from '@/components/ScrcpyPlayer';
import SettingsPanel from '@/components/SettingsPanel';

export default function Home() {
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div data-tutan-root className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - AutoGLM Style */}
      <aside className={clsx(
        "bg-white border-r flex flex-col transition-all duration-300 ease-in-out shadow-sm z-30",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-4 flex items-center gap-3 border-b h-16 shrink-0">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
            <Cpu className="text-white" size={24} />
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-xl tracking-tight text-slate-800 animate-in fade-in duration-500">
              TUTAN
            </span>
          )}
        </div>
        
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          <SidebarItem 
            icon={<LayoutDashboard size={22} />} 
            label="控制面板" 
            active={activeTab === 'dashboard'} 
            collapsed={!isSidebarOpen}
            onClick={() => setActiveTab('dashboard')}
          />
          <SidebarItem 
            icon={<History size={22} />} 
            label="执行历史" 
            active={activeTab === 'history'} 
            collapsed={!isSidebarOpen}
            onClick={() => setActiveTab('history')}
          />
          <SidebarItem 
            icon={<Settings size={22} />} 
            label="系统设置" 
            active={activeTab === 'settings'} 
            collapsed={!isSidebarOpen}
            onClick={() => setActiveTab('settings')}
          />
        </nav>

        <div className="p-4 border-t space-y-4">
          {isSidebarOpen && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in duration-500">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">System Secure</span>
              </div>
              <p className="text-[10px] text-blue-600/80 leading-relaxed">
                ADB 链路已加密，Ref 系统运行正常
              </p>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
              {activeTab === 'dashboard' ? 'Control Center' : activeTab === 'settings' ? 'Settings' : 'History'}
            </h2>
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

        {/* Dynamic Content */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'dashboard' && (
            <div className="absolute inset-0 flex">
              {/* Left Panel: Device & Agent Console */}
              <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl w-full mx-auto space-y-6">
                  <DeviceManager onSelectDevice={(serial) => setSelectedSerial(serial)} />
                  
                  {selectedSerial ? (
                    <div className="flex-1 min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <AgentConsole serial={selectedSerial} />
                    </div>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-[2rem] text-slate-400 space-y-6 shadow-sm">
                      <div className="relative">
                        <div className="absolute -inset-4 bg-blue-100 rounded-full blur-2xl opacity-50 animate-pulse" />
                        <div className="relative p-8 bg-slate-50 rounded-full border border-slate-100">
                          <SmartphoneIcon className="w-16 h-16 text-slate-300" />
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-xl font-bold text-slate-600">等待设备连接</p>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                          请从上方列表选择一个已连接的 Android 设备以开启智能 Agent 协作
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Device Stream (Fixed Width) */}
              <div className="w-[450px] bg-slate-900 border-l border-slate-800 flex flex-col p-6 shrink-0 relative">
                <div className="flex items-center justify-between mb-6 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Live Stream</h3>
                  </div>
                  {selectedSerial && (
                    <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      {selectedSerial}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 flex items-center justify-center">
                  {selectedSerial ? (
                    <div className="w-full max-w-[360px] aspect-[9/19.5] rounded-[3rem] border-[12px] border-slate-800 shadow-2xl overflow-hidden bg-black relative group ring-1 ring-white/10">
                      <ScrcpyPlayer serial={selectedSerial} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  ) : (
                    <div className="text-center space-y-4 opacity-30">
                      <SmartphoneIcon size={64} className="mx-auto text-slate-500" />
                      <p className="text-sm font-medium text-slate-500">无活跃视频流</p>
                    </div>
                  )}
                </div>

                {/* Device Info Overlay */}
                {selectedSerial && (
                  <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connection Status</span>
                      <CheckCircle2 size={14} className="text-green-500" />
                    </div>
                    <p className="text-xs text-slate-300 font-mono">Encrypted Tunnel Active</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="absolute inset-0 overflow-y-auto p-8 custom-scrollbar">
              <div className="max-w-4xl mx-auto">
                <SettingsPanel />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              <div className="text-center space-y-4">
                <History size={64} className="mx-auto opacity-20" />
                <p className="text-lg font-medium">执行历史模块正在开发中</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ 
  icon, 
  label, 
  active = false, 
  collapsed = false,
  onClick 
}: { 
  icon: React.ReactNode, 
  label: string, 
  active?: boolean,
  collapsed?: boolean,
  onClick: () => void
}) {
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
        active ? "bg-blue-50 text-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      )}
    >
      <div className={clsx(
        "shrink-0 transition-transform group-hover:scale-110", 
        active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
      )}>
        {icon}
      </div>
      {!collapsed && (
        <span className="text-sm font-bold animate-in fade-in slide-in-from-left-2 duration-300">
          {label}
        </span>
      )}
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
      )}
    </button>
  );
}
