'use client';
import React, { useState } from 'react';
import { ArrowLeft, Shield, RefreshCw, AlertTriangle, AlertCircle, Info, CheckCircle, Wrench, ChevronDown, ChevronRight } from 'lucide-react';

interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: string;
  file: string;
  line: number;
  column: number;
  match: string;
  rule: string;
  description: string;
  remediation: string;
}

interface ScanSummary {
  critical: number; high: number; medium: number; low: number; info: number;
  files_scanned: number; scan_duration_ms: number;
}

interface ScanResult {
  findings: Finding[];
  summary: ScanSummary;
}

const SEV_CONFIG = {
  critical: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: AlertTriangle },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertCircle },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertCircle },
  low:      { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info },
  info:     { color: 'text-zinc-400', bg: 'bg-zinc-800/50', border: 'border-zinc-700', icon: Info },
};

export default function SecurityView({ navigateBack, triggerAlert }: {
  navigateBack: () => void;
  triggerAlert: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [minSeverity, setMinSeverity] = useState<'critical' | 'high' | 'medium' | 'low' | 'info'>('low');
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixes, setFixes] = useState<Record<string, any>>({});
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const runScan = async () => {
    setIsScanning(true);
    setResult(null);
    try {
      const res = await fetch('/api/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'src', minSeverity }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Scan failed');
      setResult(data.scanner);
      const s = data.scanner.summary;
      const total = s.critical + s.high + s.medium + s.low + s.info;
      triggerAlert(s.critical > 0 ? 'error' : s.high > 0 ? 'warning' : 'success',
        'Scan Complete',
        `${total} finding(s) in ${s.files_scanned} files (${s.scan_duration_ms}ms)`);
    } catch (err: any) {
      triggerAlert('error', 'Scan Failed', err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const requestFix = async (finding: Finding, idx: number) => {
    const key = `${finding.file}:${finding.line}:${finding.rule}`;
    setFixingId(key);
    try {
      const res = await fetch('/api/security/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding,
          codeContext: `Line ${finding.line}: ${finding.match}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Fix generation failed');
      setFixes(prev => ({ ...prev, [key]: data }));
      triggerAlert('success', 'Fix Generated', `Confidence: ${Math.round((data.confidence ?? 0) * 100)}%`);
    } catch (err: any) {
      triggerAlert('error', 'Fix Failed', err.message);
    } finally {
      setFixingId(null);
    }
  };

  const filtered = result?.findings.filter(f => activeFilter === 'all' || f.severity === activeFilter) ?? [];

  return (
    <div className="max-w-5xl mx-auto py-6 flex flex-col gap-6 font-mono text-xs">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold uppercase text-white">Security Scanner</h1>
          <span className="text-[10px] text-zinc-500 font-sans">Scans source code for secrets, vulnerabilities, and sensitive data leaks. Powered by Python + AI fix engine.</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={minSeverity}
            onChange={e => setMinSeverity(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none"
          >
            <option value="critical">Critical only</option>
            <option value="high">High+</option>
            <option value="medium">Medium+</option>
            <option value="low">Low+</option>
            <option value="info">All</option>
          </select>
          <button
            onClick={runScan}
            disabled={isScanning}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 border border-rose-500 text-white font-bold text-xs uppercase flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isScanning ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Scanning...</span></> : <><Shield className="w-3.5 h-3.5" /><span>Run Scan</span></>}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(['critical', 'high', 'medium', 'low', 'info'] as const).map(sev => {
              const cfg = SEV_CONFIG[sev];
              const count = result.summary[sev];
              return (
                <button
                  key={sev}
                  onClick={() => setActiveFilter(activeFilter === sev ? 'all' : sev)}
                  className={`p-3 rounded border flex flex-col gap-1 cursor-pointer transition-all ${activeFilter === sev ? `${cfg.bg} ${cfg.border}` : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                >
                  <span className={`text-[8px] font-bold uppercase ${cfg.color}`}>{sev}</span>
                  <span className={`text-xl font-black ${count > 0 ? cfg.color : 'text-zinc-600'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[9px] text-zinc-500">
            <span>{result.summary.files_scanned} files scanned · {result.summary.scan_duration_ms}ms</span>
            <button onClick={() => setActiveFilter('all')} className={`hover:text-white transition-colors ${activeFilter === 'all' ? 'text-white' : ''}`}>Show all ({result.findings.length})</button>
          </div>

          {/* Findings List */}
          {filtered.length === 0 ? (
            <div className="p-8 bg-zinc-950 border border-zinc-800 rounded flex flex-col items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <p className="text-sm font-bold text-white">No findings at this severity level</p>
              <p className="text-[10px] text-zinc-500 font-sans">Your code looks clean for the selected filter.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((f, i) => {
                const key = `${f.file}:${f.line}:${f.rule}`;
                const cfg = SEV_CONFIG[f.severity];
                const Icon = cfg.icon;
                const fix = fixes[key];
                const isExpanded = expandedFinding === key;

                return (
                  <div key={key} className={`rounded border ${cfg.border} overflow-hidden`}>
                    <div
                      className={`p-3 flex items-start gap-3 cursor-pointer ${cfg.bg} hover:opacity-90 transition-opacity`}
                      onClick={() => setExpandedFinding(isExpanded ? null : key)}
                    >
                      <Icon className={`w-4 h-4 ${cfg.color} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.border} ${cfg.color}`}>{f.severity}</span>
                          <span className="text-[8px] font-bold text-zinc-500 uppercase">{f.type}</span>
                          <span className="text-[9px] font-bold text-white font-mono truncate">{f.file}:{f.line}</span>
                        </div>
                        <p className="text-[10px] text-zinc-300 font-sans mt-1 leading-relaxed">{f.description}</p>
                        <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Match: <span className="text-zinc-400">{f.match}</span></p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); requestFix(f, i); }}
                          disabled={fixingId === key}
                          className="px-2 py-1 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white text-[8px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                        >
                          {fixingId === key ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Wrench className="w-2.5 h-2.5" />}
                          <span>AI Fix</span>
                        </button>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase">Remediation</span>
                          <p className="text-[10px] text-zinc-300 font-sans leading-relaxed">{f.remediation}</p>
                        </div>
                        <div className="flex gap-4 text-[9px] text-zinc-500">
                          <span>Rule: <span className="text-zinc-400 font-mono">{f.rule}</span></span>
                          <span>Col: <span className="text-zinc-400">{f.column}</span></span>
                        </div>

                        {fix && (
                          <div className="flex flex-col gap-3 pt-3 border-t border-zinc-800">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-bold text-purple-400 uppercase">AI Fix · {fix.modelUsed}</span>
                              <span className="text-[8px] text-zinc-500">Confidence: {Math.round((fix.confidence ?? 0) * 100)}%</span>
                            </div>
                            <p className="text-[10px] text-zinc-300 font-sans leading-relaxed">{fix.explanation}</p>
                            {fix.fixedCode && (
                              <pre className="p-3 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-emerald-400 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{fix.fixedCode}</pre>
                            )}
                            {fix.additionalSteps?.length > 0 && (
                              <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-yellow-400 uppercase">Additional Steps</span>
                                {fix.additionalSteps.map((s: string, i: number) => <p key={i} className="text-[9px] text-zinc-400 font-sans pl-2 border-l border-yellow-500/30">{s}</p>)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {!result && !isScanning && (
        <div className="p-12 bg-zinc-950 border border-zinc-800 rounded flex flex-col items-center gap-4 text-center">
          <Shield className="w-10 h-10 text-zinc-600" />
          <p className="text-sm font-bold text-white">Run a security scan</p>
          <p className="text-[10px] text-zinc-500 font-sans max-w-sm">Scans your <code className="font-mono bg-zinc-900 px-1 rounded">src/</code> directory for hardcoded secrets, API keys, vulnerability patterns, and sensitive data. Powered by <code className="font-mono bg-zinc-900 px-1 rounded">scripts/scanner.py</code>.</p>
        </div>
      )}
    </div>
  );
}
