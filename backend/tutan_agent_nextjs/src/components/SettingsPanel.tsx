"use client";

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Key, 
  Cpu, 
  Globe, 
  Save, 
  RefreshCw,
  Shield,
  Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import { normalizeTutanBaseUrl } from '@/lib/client-url';

export default function SettingsPanel() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [adbPath, setAdbPath] = useState('adb');
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const savedKey = localStorage.getItem('TUTAN_API_KEY') || 'sk-vP6XdXWgDHA9IpF7XqsTT0Laov8xb7XqPiIMW42NSWBExA1a';
    const savedModel = localStorage.getItem('TUTAN_MODEL') || 'kimi-k2.5';
    const savedLlmBaseUrl = localStorage.getItem('TUTAN_LLM_BASE_URL') || 'https://api.moonshot.cn/v1';
    
    setApiKey(savedKey);
    setModel(savedModel);
    setLlmBaseUrl(savedLlmBaseUrl);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('TUTAN_API_KEY', apiKey);
    localStorage.setItem('TUTAN_MODEL', model);
    localStorage.setItem('TUTAN_LLM_BASE_URL', llmBaseUrl.trim());
    
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">系统设置</h1>
          <p className="text-sm text-slate-500">配置 Agent 的核心参数与外部服务对接</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:bg-slate-300"
        >
          {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          {isSaving ? '保存中...' : '保存配置'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LLM Configuration */}
        <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Zap size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">模型配置</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Key size={12} /> Moonshot API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
              <p className="text-[10px] text-slate-400">密钥将仅保存在本地浏览器缓存中</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Globe size={12} /> 模型选择
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none"
              >
                <option value="kimi-k2.5">Kimi k2.5 (默认)</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
              </select>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Globe size={12} /> LLM Base URL
                </label>
                <input
                  type="text"
                  value={llmBaseUrl}
                  onChange={(e) => setLlmBaseUrl(e.target.value)}
                  placeholder="默认: https://api.moonshot.cn/v1"
                  className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
                <p className="text-[10px] text-slate-400">
                  用于请求 Kimi/OpenAI 的 API 地址。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ADB & System Configuration */}
        <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Cpu size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">ADB 环境</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Shield size={12} /> ADB 路径
              </label>
              <input
                type="text"
                value={adbPath}
                disabled
                className="w-full bg-slate-100 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-blue-600 font-medium">系统已自动检测到 ADB 路径，无需手动配置</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Shield size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">安全提示</span>
              </div>
              <p className="text-[11px] text-blue-600/80 leading-relaxed">
                TUTAN_AGENT 采用 child_process 直接调用系统 ADB，确保了最低的指令延迟与最高的执行权限。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
