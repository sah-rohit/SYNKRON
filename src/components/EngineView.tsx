'use client';

import React, { useState } from 'react';
import { 
  Cpu, Play, Terminal, Box, RefreshCw, Zap, 
  ChevronRight, Gauge, Copy, Check, Monitor, Activity
} from 'lucide-react';

export default function EngineView() {
  // Global UI Feedback State for Copying
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const triggerCopy = async (text: string, id: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(id);
      setTimeout(() => setCopiedState(null), 2000);
    } catch (err) {
      console.error("Failed to copy text.");
    }
  };

  // ============================================================================
  // VM STATE & HANDLERS (SYN-CORE VM)
  // ============================================================================
  const [vmCode, setVmCode] = useState(`// SYN-CORE Vector Add Benchmark
let i = 0;
let limit = 75000; // Triggers Hot Loop JIT
let increment = 1;

while i < limit {
    i = i + increment;
}

return i;`);
  const [vmLoading, setVmLoading] = useState(false);
  const [vmResult, setVmResult] = useState<any>(null);

  const runVm = async () => {
    setVmLoading(true);
    setVmResult(null);
    try {
      const r = await fetch('/api/vm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: vmCode }),
      });
      const d = await r.json();
      setVmResult(d);
    } catch (e) {
      setVmResult({ error: 'Failed to reach SYNKRON Host runtime.' });
    } finally {
      setVmLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Controls for VM exclusively */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full border-b border-zinc-800 pb-6 mb-2">
        <div className="flex flex-col gap-1">
            <h2 className="text-lg font-extrabold tracking-wider text-white font-mono uppercase flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              SYN-KRONOS RUNTIME ENVIRONMENT
            </h2>
            <p className="text-[10px] text-zinc-500 font-sans tracking-wide">Execute Rust-backed bytecode operations with autonomous JIT hot-loop triggering.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <span className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-extrabold tracking-widest rounded-md flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"/>
             SYSTEM ACTIVE
          </span>
        </div>
      </div>

      {/* SYNKRON VM VIEW (NOW FULL WIDTH & ONLY MODULE) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[600px]">
        
        {/* EDITOR COLUMN (LEFT) */}
        <div className="xl:col-span-7 flex flex-col bg-[#0c0c0e] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl transition-all hover:border-purple-500/30 group">
          
          {/* Top Control Bar for Editor */}
          <div className="flex items-center justify-between px-5 py-4 bg-zinc-900/30 border-b border-zinc-800 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/30 border border-rose-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/30 border border-amber-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border border-emerald-500/50" />
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase ml-2 font-mono">Source Buffer</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={runVm}
                disabled={vmLoading}
                className="group relative flex items-center gap-2.5 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-extrabold uppercase tracking-wider shadow-lg hover:shadow-purple-500/25 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {vmLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {vmLoading ? "Executing..." : "Run Core Logic"}
              </button>
            </div>
          </div>

          {/* Editor Content */}
          <div className="relative flex-1 flex min-h-[480px]">
             <div className="bg-zinc-950/80 border-r border-zinc-900 w-12 py-5 flex flex-col items-center text-[10px] text-zinc-700 font-mono select-none leading-[1.6rem]">
                {Array.from({length: 25}).map((_, i) => <span key={i}>{i + 1}</span>)}
             </div>
             <textarea 
                value={vmCode}
                onChange={(e) => setVmCode(e.target.value)}
                spellCheck="false"
                className="flex-1 p-5 bg-transparent text-zinc-300 font-mono text-[13px] leading-relaxed resize-none outline-none border-none focus:ring-0 selection:bg-purple-500/30"
                placeholder="// Enter runtime directives..."
             />
          </div>
          
          <div className="px-5 py-2 bg-zinc-900/20 border-t border-zinc-800 flex items-center justify-between text-[9px] text-zinc-500 uppercase font-mono">
            <span>Core V1.0-Beta</span>
            <span className="flex items-center gap-1"><Gauge className="w-3 h-3 text-emerald-500"/> JIT Status: Latent Ready</span>
          </div>
        </div>

        {/* RESULTS & TELEMETRY COLUMN (RIGHT) */}
        <div className="xl:col-span-5 flex flex-col gap-5">
          
          {/* Output Display */}
          <div className="p-5 bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-purple-500/10 transition-all duration-700" />
             <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                  vmResult?.output ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-purple-950/30 border-purple-500/30 text-purple-400'
                }`}>
                  {vmLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] font-extrabold text-zinc-500 tracking-widest uppercase">Execution Result</span>
                   <h4 className="text-xl font-bold font-mono text-white mt-0.5">
                     {vmResult?.output ? vmResult.output : <span className="text-zinc-600 animate-pulse">---</span>}
                   </h4>
                </div>
             </div>
             {vmResult?.output && (
                <button 
                  onClick={() => triggerCopy(vmResult.output, 'vmOut')}
                  className="relative z-20 p-2 hover:bg-zinc-800 rounded border border-zinc-800 text-zinc-400 hover:text-white transition-all"
                  title="Copy output"
                >
                  {copiedState === 'vmOut' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
             )}
          </div>

          {/* Telemetry Buffer */}
          <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-zinc-900/40 border-b border-zinc-800 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] font-extrabold tracking-[0.15em] text-zinc-300 uppercase">Telemetry Buffer</span>
            </div>
            
            <div className="p-4 flex-1 min-h-[180px] overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col gap-2 text-zinc-400">
               {!vmResult && !vmLoading && (
                 <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-600 py-10 font-sans">
                    <Terminal className="w-8 h-8 opacity-20 mb-1" />
                    <p className="text-xs">Awaiting kernel ignition.</p>
                 </div>
               )}
               {vmResult?.logs?.map((log: string, i: number) => (
                  <div key={i} className={`px-3 py-1.5 rounded border flex items-start gap-2.5 ${
                    log.includes('[JIT]') ? 'bg-amber-500/5 border-amber-500/20 text-amber-300/90' : 
                    'bg-zinc-900/40 border-zinc-800/50'
                  }`}>
                    <ChevronRight className="w-3 h-3 mt-0.5 opacity-40 shrink-0" />
                    <span>{log}</span>
                  </div>
               ))}
               {vmResult?.error && <div className="px-3 py-2 bg-rose-950/30 border border-rose-900/50 text-rose-400 rounded font-bold">FAULT: {vmResult.error}</div>}
            </div>
          </div>

          {/* Bytecode Instruction View */}
          <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl h-[240px]">
            <div className="px-4 py-2.5 bg-zinc-900/40 border-b border-zinc-800 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] font-extrabold tracking-widest text-zinc-400 uppercase">Linear Opcode Sequence</span>
               </div>
               {vmResult?.bytecode && (
                 <button 
                  onClick={() => triggerCopy(vmResult.bytecode.join('\n'), 'vmBc')}
                  className="text-zinc-500 hover:text-zinc-200 p-1"
                 >
                   {copiedState === 'vmBc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                 </button>
               )}
            </div>
            <div className="p-3 flex-1 overflow-y-auto font-mono text-[11px] text-purple-300/60 flex flex-col gap-0.5">
               {!vmResult && <span className="text-zinc-700 italic text-[10px]">Instruction set inactive.</span>}
               {vmResult?.bytecode?.map((b: string, i: number) => (
                  <div key={i} className="px-2 py-0.5 rounded hover:bg-purple-900/10 hover:border-purple-900/20 transition-colors">{b}</div>
               ))}
            </div>
          </div>

        </div>
      </div>
      
      <div className="mt-4 py-3 px-5 bg-zinc-900/40 border border-zinc-800 rounded-xl flex items-center justify-between text-[9px] font-mono text-zinc-500 uppercase">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><div className="w-1 h-1 bg-emerald-500 rounded-full"/> KERNEL: Rustc_Native</span>
          <span className="flex items-center gap-1"><div className="w-1 h-1 bg-emerald-500 rounded-full"/> JIT: Enabled</span>
        </div>
        <span>SYNKRON CORE ACTIVE</span>
      </div>
    </div>
  );
}
