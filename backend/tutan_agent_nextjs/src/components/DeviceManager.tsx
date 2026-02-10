"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Smartphone, RefreshCw, Play, Circle } from 'lucide-react';

interface DeviceManagerProps {
  onSelectDevice: (serial: string) => void;
}

export default function DeviceManager({ onSelectDevice }: DeviceManagerProps) {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/devices');
      if (res.data.success) {
        setDevices(res.data.devices);
      }
    } catch (err) {
      console.error("Failed to fetch devices", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Smartphone size={20} /> 设备管理
        </h2>
        <button 
          onClick={fetchDevices}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="space-y-2">
        {devices.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">未检测到设备</p>
        ) : (
          devices.map((d) => (
            <div key={d.serial} className="flex items-center justify-between p-3 border rounded-md hover:border-blue-400 transition-colors">
              <div>
                <p className="text-sm font-medium">{d.model}</p>
                <p className="text-xs text-gray-400">{d.serial} · {d.status}</p>
              </div>
              <button 
                onClick={() => onSelectDevice(d.serial)}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <Play size={12} /> 选择
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
