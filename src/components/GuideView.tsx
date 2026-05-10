'use client';

import React from 'react';
import { ArrowLeft, BookOpen, GitBranch, Sparkles, Shield, Database, Cpu, Zap, Mail, Layers } from 'lucide-react';

export default function GuideView({ navigateBack }: { navigateBack: () => void }) {
  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-8 font-mono text-xs text-zinc-300">
      

      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6 relative overflow-hidden p-6 bg-zinc-950 rounded">
        <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
        <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">[ENTERPRISE GUIDE]</span>
        <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-purple-500" /> SYNKRON Architecture
        </h1>
        <p className="text-xs text-zinc-500 font-sans max-w-xl">
          Deep-dive into the self-healing mechanics, automated code audits, real-time sync systems, and offline resilience of SYNKRON.
        </p>
      </div>

      {/* Section 1: Core Flow Diagrams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card: GitHub Sync */}
        <div className="p-6 bg-zinc-950 border border-zinc-800 hover:border-purple-500/40 rounded transition-all flex flex-col justify-between gap-6 group">
          <div className="flex flex-col gap-3">
            <span className="text-[9px] text-purple-400 font-bold uppercase">[SYSTEM_01: GITHUB PIPELINE]</span>
            <h3 className="font-extrabold text-sm text-white uppercase flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-400" /> Continuous Tree & Sync
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              SYNKRON connects live with the GitHub API. It scans directories recursively, dynamically detects branches (`main` vs `master` fallback), and streams raw content securely. When saving edits, it resolves file SHAs, converts assets to Base64, and commits changes directly back to your branch.
            </p>
          </div>
          <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800/80 font-sans text-[10px] text-zinc-500">
            <strong>Endpoint:</strong> <code>POST /api/repositories/[id]/commit</code>
          </div>
        </div>

        {/* Card: AI Healing Engine */}
        <div className="p-6 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/40 rounded transition-all flex flex-col justify-between gap-6 group">
          <div className="flex flex-col gap-3">
            <span className="text-[9px] text-emerald-400 font-bold uppercase">[SYSTEM_02: AI HEALER]</span>
            <h3 className="font-extrabold text-sm text-white uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" /> Self-Healing Docs
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              When code updates or doc stales are detected, SYNKRON routes files to our Llama-3/Groq AI engine. The AI performs an AST structure analysis, finds outdated signatures, and automatically generates modern Markdown. These docs are committed instantly to save developer maintenance costs.
            </p>
          </div>
          <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800/80 font-sans text-[10px] text-zinc-500">
            <strong>Endpoint:</strong> <code>POST /api/heal</code>
          </div>
        </div>

        {/* Card: UI Rater Metrics */}
        <div className="p-6 bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 rounded transition-all flex flex-col justify-between gap-6 group">
          <div className="flex flex-col gap-3">
            <span className="text-[9px] text-amber-400 font-bold uppercase">[SYSTEM_03: DESIGN AUDITOR]</span>
            <h3 className="font-extrabold text-sm text-white uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" /> UI / UX Vision Rater
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              The UI Rater accepts base64 layout screenshots and scores them instantly. Using strict design heuristics (Gestalt Grouping, Nielsen Usability Rules, WCAG 2.2 accessibility metrics, min 44x44pt touch-target guidelines), it identifies spacing, typography, and contrast flaws with complete precision.
            </p>
          </div>
          <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800/80 font-sans text-[10px] text-zinc-500">
            <strong>Endpoint:</strong> <code>POST /api/ui-rater</code>
          </div>
        </div>

        {/* Card: Database & Offline Resilience */}
        <div className="p-6 bg-zinc-950 border border-zinc-800 hover:border-cyan-500/40 rounded transition-all flex flex-col justify-between gap-6 group">
          <div className="flex flex-col gap-3">
            <span className="text-[9px] text-cyan-400 font-bold uppercase">[SYSTEM_04: SYNC & RESILIENCE]</span>
            <h3 className="font-extrabold text-sm text-white uppercase flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" /> Hybrid Sync & Failover
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              SYNKRON uses Drizzle & Neon Postgres for workspace tables, and Convex for account activity logs. If databases are offline, the app switches to an active **LocalStorage/In-Memory fallback**, persisting security logs and team configs directly in the sandbox without breaking.
            </p>
          </div>
          <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800/80 font-sans text-[10px] text-zinc-500">
            <strong>State:</strong> <code>Local Fallback / Cloud Promoted</code>
          </div>
        </div>

      </div>

      {/* Interactive System Pipeline */}
      <div className="p-6 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4 relative overflow-hidden">
        <span className="text-[9px] text-zinc-500 font-bold uppercase">[SYSTEM_PIPELINE]</span>
        <h3 className="text-sm font-extrabold text-white uppercase">Self-Healing Feedback Loop</h3>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-y border-zinc-900 text-center font-sans text-[11px]">
          <div className="flex flex-col items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded w-full sm:w-1/4">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="font-bold text-white">1. Git Commit</span>
            <span className="text-zinc-500 text-[10px]">Webhook triggers on repo change</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-700 hidden sm:block shrink-0" />
          <div className="flex flex-col items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded w-full sm:w-1/4">
            <Shield className="w-5 h-5 text-rose-400" />
            <span className="font-bold text-white">2. Audit Scan</span>
            <span className="text-zinc-500 text-[10px]">Detect stale documentation</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-700 hidden sm:block shrink-0" />
          <div className="flex flex-col items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded w-full sm:w-1/4">
            <Cpu className="w-5 h-5 text-purple-400 animate-pulse" />
            <span className="font-bold text-white">3. AI Healing</span>
            <span className="text-zinc-500 text-[10px]">Groq updates content</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-700 hidden sm:block shrink-0" />
          <div className="flex flex-col items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded w-full sm:w-1/4">
            <Mail className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-white">4. Notify & Push</span>
            <span className="text-zinc-500 text-[10px]">Email sent & live commit live</span>
          </div>
        </div>
      </div>

    </div>
  );
}

const ChevronRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);
