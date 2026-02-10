"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Smartphone, RefreshCw, Play, Circle, AlertCircle, CheckCircle2, Cpu } from 'lucide-react';
import { clsx } from 'clsx';
import { withBaseUrl } from '@/lib/client-url';

interface DeviceManagerProps {
  onSelectDevice: (serial: string) => void;
}

export default function DeviceManager({ onSelectDevice }: DeviceManagerProps) {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSerial, setActiveSerial] = useState<string | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/devices');
      if (res.data.success) {
        setDevices(res.data.devices);
      } else {
        setError(res.data.error || "获取设备失败");
      }
    } catch (err: any) {
      console.error("Failed to fetch devices", err);
      const apiError = err.response?.data?.error;
      const status = err.response?.status;
      const msg = apiError || err.message || "连接后端失败";
      setError(`${msg}${status ? ` (HTTP ${status})` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const timer = setInterval(fetchDevices, 10000); // Poll every 10s
    return () => clearInterval(timer);
  }, []);

  const handleSelect = (serial: string) => {
    setActiveSerial(serial);
    onSelectDevice(serial);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-50/50 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
            <Smartphone size={18} />
          </div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">设备管理</h2>
        </div>
        <button 
          onClick={fetchDevices}
          disabled={loading}
          className="p-2 hover:bg-slate-200/50 rounded-full transition-all active:rotate-180 duration-500"
        >
          <RefreshCw size={16} className={clsx("text-slate-500", loading && "animate-spin")} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {error && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 text-amber-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider">ADB Notice</p>
              <p className="text-[11px] leading-relaxed opacity-80">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {!loading && !error && devices.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-300 space-y-3">
              <div className="p-4 bg-slate-50 rounded-full border border-slate-100/50">
                <Cpu size={32} strokeWidth={1} />
              </div>
              <p className="text-xs font-medium uppercase tracking-widest">No Devices Found</p>
            </div>
          ) : (
            devices.map((d) => (
              <div 
                key={d.serial} 
                onClick={() => handleSelect(d.serial)}
                className={clsx(
                  "group relative flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300",
                  activeSerial === d.serial 
                    ? "border-blue-500 bg-blue-50/30 shadow-md shadow-blue-100" 
                    : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    activeSerial === d.serial ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                  )}>
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <p className={clsx(
                      "text-sm font-bold tracking-tight",
                      activeSerial === d.serial ? "text-blue-700" : "text-slate-700"
                    )}>{d.model}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">{d.serial}</span>
                      <span className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        d.status === 'device' ? "bg-green-500" : "bg-amber-500"
                      )} />
                    </div>
                  </div>
                </div>
                
                <div className={clsx(
                  "transition-all duration-300",
                  activeSerial === d.serial ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                )}>
                  <CheckCircle2 size={20} className="text-blue-500" />
                </div>
              </div>
            ))
          )}
          
          {loading && (
            <div className="flex items-center justify-center py-4 gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 bg-slate-50/30 border-t flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <span>Devices: {devices.length}</span>
        <span className="flex items-center gap-1">
          <Circle size={8} fill="currentColor" className="text-green-500" /> 
          ADB Ready
        </span>
      </div>
    </div>
  );
}
