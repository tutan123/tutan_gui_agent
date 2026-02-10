"use client";

import { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, AlertCircle, CheckCircle2, Loader2, ChevronRight, BrainCircuit, Command, History } from 'lucide-react';
import { clsx } from 'clsx';

interface Step {
  step: number;
  thinking: string;
  action: string;
  params: any;
  status?: 'success' | 'failed' | 'running';
}

interface AgentConsoleProps {
  serial: string;
}

export default function AgentConsole({ serial }: AgentConsoleProps) {
  const [task, setTask] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [status, setStatus] = useState('Ready');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps, status]);

  const runTask = async () => {
    if (!task || !serial) return;

    setIsRunning(true);
    setSteps([]);
    setStatus('Starting...');

    try {
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial, task }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const textDecoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = textDecoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.replace('data: ', ''));
              handleEvent(event);
            } catch (e) {
              console.error("Failed to parse event JSON", e);
            }
          }
        }
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleEvent = (event: any) => {
    switch (event.type) {
      case 'status':
        setStatus(event.data.message);
        break;
      case 'step':
        setSteps(prev => [...prev, { ...event.data, status: 'running' }]);
        break;
      case 'done':
        setStatus('Completed');
        setSteps(prev => {
          const last = prev[prev.length - 1];
          if (last) last.status = 'success';
          return [...prev];
        });
        break;
      case 'error':
        setStatus(`Error: ${event.data.message}`);
        setIsRunning(false);
        break;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50">
      {/* Header - AutoGLM/OpenClaw Hybrid Style */}
      <div className="px-6 py-4 bg-slate-50/50 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
            <BrainCircuit size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">AI 助手</h2>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{serial}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={clsx(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
            isRunning ? "bg-blue-100 text-blue-700 animate-pulse" : "bg-slate-100 text-slate-500"
          )}>
            <div className={clsx("w-1.5 h-1.5 rounded-full", isRunning ? "bg-blue-600" : "bg-slate-400")} />
            {status}
          </div>
        </div>
      </div>

      {/* Log Area - Scrollable */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white"
      >
        {steps.length === 0 && !isRunning && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
            <div className="p-6 bg-slate-50 rounded-full border border-slate-100/50">
              <Command size={40} strokeWidth={1} />
            </div>
            <p className="text-sm font-medium">等待指令下发以开启自动化任务</p>
          </div>
        )}

        {steps.map((step, index) => (
          <div key={index} className="group animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-colors",
                  step.status === 'success' ? "bg-green-50 border-green-200 text-green-600" : "bg-blue-50 border-blue-200 text-blue-600"
                )}>
                  {step.step}
                </div>
                {index !== steps.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-1" />}
              </div>
              
              <div className="flex-1 space-y-3 pb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Step {step.step}: 发送指令给 Phone Agent</span>
                  {step.status === 'success' && <CheckCircle2 size={14} className="text-green-500" />}
                </div>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed shadow-sm group-hover:shadow-md transition-shadow">
                  <p className="font-medium mb-2 text-slate-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                    <BrainCircuit size={12} /> Thinking
                  </p>
                  {step.thinking}
                </div>

                <div className="flex items-center gap-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-indigo-700 font-mono text-[11px]">
                  <ChevronRight size={14} className="text-indigo-400" />
                  <span className="font-bold">{step.action}</span>
                  <span className="opacity-60">{JSON.stringify(step.params)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isRunning && (
          <div className="flex items-center gap-3 text-blue-600 font-medium text-sm animate-pulse pl-12">
            <Loader2 size={18} className="animate-spin" />
            <span>Agent 正在分析当前屏幕并规划下一步...</span>
          </div>
        )}
      </div>

      {/* Task Input - Bottom Fixed */}
      <div className="p-6 bg-slate-50/80 backdrop-blur-sm border-t">
        <div className="relative flex items-center group">
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runTask()}
            disabled={isRunning}
            placeholder="描述你想完成的任务... (Enter 发送)"
            className="w-full bg-white text-sm border-2 border-slate-200 rounded-2xl pl-5 pr-14 py-4 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 transition-all shadow-inner"
          />
          <button
            onClick={runTask}
            disabled={isRunning || !task}
            className="absolute right-2 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            {isRunning ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] text-slate-400 font-medium uppercase tracking-widest">
          Powered by Tutan Ref System & GPT-4o
        </p>
      </div>
    </div>
  );
}
