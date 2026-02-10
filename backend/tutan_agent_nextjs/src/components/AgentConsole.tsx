"use client";

import { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, AlertCircle, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
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
      const decoder = new TextEncoder().encode(); // Actually we need TextDecoder
      const textDecoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = textDecoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const event = JSON.parse(line.replace('data: ', ''));
            handleEvent(event);
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
    <div className="flex flex-col h-full bg-slate-50 border rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-3 bg-white border-b flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2 text-slate-700">
          <Terminal size={16} /> Agent 控制台
        </h2>
        <div className="flex items-center gap-2">
          <span className={clsx(
            "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
            isRunning ? "bg-blue-100 text-blue-700 animate-pulse" : "bg-slate-100 text-slate-500"
          )}>
            {status}
          </span>
        </div>
      </div>

      {/* Task Input */}
      <div className="p-4 bg-white border-b">
        <div className="flex gap-2">
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            disabled={isRunning}
            placeholder="输入任务指令 (例如: 打开微信并搜索...)"
            className="flex-1 text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          />
          <button
            onClick={runTask}
            disabled={isRunning || !task}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center gap-2"
          >
            {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            执行
          </button>
        </div>
      </div>

      {/* Log Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs"
      >
        {steps.length === 0 && !isRunning && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Terminal size={32} strokeWidth={1} />
            <p>等待指令下发...</p>
          </div>
        )}

        {steps.map((step, index) => (
          <div key={index} className="bg-white border rounded-md p-3 shadow-sm space-y-2">
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <span className="font-bold text-blue-600">Step {step.step}</span>
              <span className="text-[10px] text-slate-400">{step.action}</span>
            </div>
            <div className="text-slate-700 leading-relaxed">
              <span className="text-slate-400 mr-2">THINKING:</span>
              {step.thinking}
            </div>
            <div className="bg-slate-50 p-2 rounded border flex items-center gap-2 text-slate-600">
              <ChevronRight size={14} className="text-blue-500" />
              <span>{step.action}({JSON.stringify(step.params)})</span>
            </div>
          </div>
        ))}

        {isRunning && (
          <div className="flex items-center gap-2 text-blue-600 animate-pulse">
            <Loader2 size={14} className="animate-spin" />
            <span>Agent 正在思考中...</span>
          </div>
        )}
      </div>
    </div>
  );
}
