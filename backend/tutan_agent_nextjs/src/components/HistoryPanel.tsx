"use client";

import { useState, useEffect } from 'react';
import { History, Smartphone, Clock, ChevronRight, BrainCircuit, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface Session {
  id: string;
  device_serial: string;
  task: string;
  status: string;
  start_time: number;
  end_time?: number;
}

interface Step {
  id: number;
  step_number: number;
  thinking: string;
  action: string;
  params: string;
  result: string;
  timestamp: number;
}

export default function HistoryPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:18888/api/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  const fetchSteps = async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:18888/api/sessions/${sessionId}/steps`);
      const data = await res.json();
      if (data.success) {
        setSteps(data.steps);
      }
    } catch (err) {
      console.error("Failed to fetch steps", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    fetchSteps(session.id);
  };

  return (
    <div className="flex h-full gap-6 animate-in fade-in duration-500">
      {/* Session List */}
      <div className="w-1/3 flex flex-col bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-200 text-slate-600 rounded-xl">
              <History size={18} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">执行历史</h2>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">
            {sessions.length} Sessions
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSessionClick(session)}
              className={clsx(
                "w-full text-left p-4 rounded-2xl border transition-all duration-200 group",
                selectedSession?.id === session.id 
                  ? "bg-blue-50 border-blue-200 shadow-sm" 
                  : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Smartphone size={12} className={selectedSession?.id === session.id ? "text-blue-500" : "text-slate-400"} />
                  <span className="text-[10px] font-mono font-bold text-slate-500">{session.device_serial}</span>
                </div>
                <StatusBadge status={session.status} />
              </div>
              <p className="text-xs font-bold text-slate-700 line-clamp-2 mb-3 leading-relaxed">
                {session.task}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                <Clock size={10} />
                {new Date(session.start_time * 1000).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step Details */}
      <div className="flex-1 bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm flex flex-col">
        {selectedSession ? (
          <>
            <div className="p-6 border-b bg-slate-50/50">
              <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">
                <span className="bg-blue-100 px-2 py-0.5 rounded-full">Session Details</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-400">{selectedSession.id.slice(0, 8)}...</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">
                {selectedSession.task}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {loading ? (
                <div className="h-full flex items-center justify-center text-slate-400 gap-3">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">加载步骤数据...</span>
                </div>
              ) : (
                steps.map((step) => (
                  <div key={step.id} className="flex gap-6">
                    <div className="flex flex-col items-center">
                      <div className={clsx(
                        "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold border-2 shrink-0 shadow-sm",
                        step.result === 'success' ? "bg-green-50 border-green-100 text-green-600" : "bg-red-50 border-red-100 text-red-600"
                      )}>
                        {step.step_number}
                      </div>
                      <div className="w-0.5 flex-1 bg-slate-100 my-2" />
                    </div>
                    
                    <div className="flex-1 space-y-4 pb-8">
                      <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <BrainCircuit size={14} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thinking Process</span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                          {step.thinking}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                          <ChevronRight size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Action</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-700 font-mono">{step.action}</span>
                            <span className="text-[10px] text-indigo-500/60 font-mono truncate max-w-md">{step.params}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-6">
            <div className="relative">
              <div className="absolute -inset-4 bg-slate-100 rounded-full blur-2xl opacity-50" />
              <div className="relative p-10 bg-slate-50 rounded-full border border-slate-100">
                <History size={64} strokeWidth={1} />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-bold text-slate-400">选择一个会话以查看详情</p>
              <p className="text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
                点击左侧列表中的会话记录，查看 Agent 的思考过程与执行步骤
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    completed: "bg-green-100 text-green-700 border-green-200",
    failed: "bg-red-100 text-red-700 border-red-200",
    running: "bg-blue-100 text-blue-700 border-blue-200 animate-pulse",
    aborted: "bg-slate-100 text-slate-700 border-slate-200",
    timeout: "bg-orange-100 text-orange-700 border-orange-200",
  }[status] || "bg-slate-100 text-slate-500 border-slate-200";

  const Icon = {
    completed: CheckCircle2,
    failed: XCircle,
    running: BrainCircuit,
    aborted: AlertCircle,
    timeout: Clock,
  }[status] || AlertCircle;

  return (
    <div className={clsx("flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border", styles)}>
      <Icon size={10} />
      {status}
    </div>
  );
}
