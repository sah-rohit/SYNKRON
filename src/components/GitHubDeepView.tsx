'use client';
import React, { useState, useEffect } from 'react';
import { Star, GitFork, ExternalLink, GitPullRequest, Eye, Code, BookOpen, Terminal, Sparkles, Zap, Layers } from 'lucide-react';

// Custom inline SVG Github component
const Github = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

export default function GitHubDeepView({ triggerAlert }: {
  triggerAlert: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}) {
  const [repoData, setRepoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRepoData = async () => {
      try {
        // Fetch live data from GitHub public API
        const response = await fetch('https://api.github.com/repos/sah-rohit/SYNKRON');
        if (response.ok) {
          const data = await response.json();
          setRepoData(data);
        }
      } catch (error) {
        console.error('Failed to fetch GitHub stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRepoData();
  }, []);

  const stats = [
    { label: 'STARS', value: repoData?.stargazers_count ?? '24', icon: Star, color: 'text-yellow-400' },
    { label: 'FORKS', value: repoData?.forks_count ?? '7', icon: GitFork, color: 'text-blue-400' },
    { label: 'WATCHERS', value: repoData?.watchers_count ?? '12', icon: Eye, color: 'text-emerald-400' },
    { label: 'OPEN ISSUES', value: repoData?.open_issues_count ?? '1', icon: GitPullRequest, color: 'text-purple-400' },
  ];

  const features = [
    {
      title: 'Self-Healing Documentation',
      desc: 'Hooks directly into GitHub webhooks to automatically heal and sync code docs in real-time using LLMs.',
      icon: Sparkles,
      status: 'OPERATIONAL'
    },
    {
      title: 'Tauri Integration',
      desc: 'Ultra-lightweight rust-based hybrid desktop layer for secure high-performance analysis tools.',
      icon: Terminal,
      status: 'COMPILED'
    },
    {
      title: 'Convex Reactive Backend',
      desc: '100% live and fully transactional reactive backend infrastructure for instant dashboard synchronization.',
      icon: Zap,
      status: 'ONLINE'
    },
    {
      title: 'Cyberpunk Dev Console',
      desc: 'Immersive 90s hacker aesthetics meets cutting edge Next.js React 19 frontend capabilities.',
      icon: Layers,
      status: 'ACTIVE'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto py-6 flex flex-col gap-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-600/10 border border-purple-500/30 rounded-lg">
            <Github className="w-10 h-10 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono tracking-widest">
              <span>REPOSITORY</span>
              <span className="w-1 h-1 bg-purple-500 rounded-full animate-pulse"></span>
              <span className="text-purple-400">OFFICIAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
              sah-rohit/SYNKRON
            </h1>
            <p className="text-[10px] text-zinc-400 font-sans mt-1 leading-relaxed max-w-lg">
              Reactive self-healing documentation synchronizer powered by LLMs, Rust, and Next.js.
            </p>
          </div>
        </div>
        <a
          href="https://github.com/sah-rohit/SYNKRON"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase flex items-center gap-2 self-start sm:self-center transition-all cursor-pointer rounded-none border border-white"
          onClick={() => triggerAlert('info', 'GitHub Launch', 'Redirecting to SYNKRON repository...')}
        >
          <Github className="w-3.5 h-3.5" />
          <span>View On Github</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-4 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
              {loading ? (
                <div className="h-6 w-12 bg-zinc-900 animate-pulse mt-1" />
              ) : (
                <span className="text-2xl font-black text-white tracking-tight">{stat.value}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: System Features */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="p-4 bg-zinc-950 border border-zinc-800 flex items-center gap-2">
            <Code className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-bold uppercase text-white tracking-wider">[REPOSITORY_CORE_INFRASTRUCTURE]</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.title} className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 text-[7px] font-bold text-zinc-800 uppercase tracking-widest rotate-90 translate-x-4 translate-y-6 font-mono select-none opacity-20">
                    SYNKRON_SYS
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-zinc-900 border border-zinc-800 group-hover:border-purple-500/40 transition-colors rounded">
                      <Icon className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 uppercase">
                      {feat.status}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">{feat.title}</h3>
                    <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: System Specs / Terminal Output */}
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-zinc-950 border border-zinc-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-bold uppercase text-white tracking-wider">[TECH_COMPILATION]</span>
          </div>

          <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4 font-mono">
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[10px] border-b border-zinc-850 pb-2">
                <span className="text-zinc-500">LICENSE</span>
                <span className="text-zinc-300 uppercase">{repoData?.license?.spdx_id ?? 'MIT'}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] border-b border-zinc-850 pb-2">
                <span className="text-zinc-500">LANGUAGE</span>
                <span className="text-emerald-400">TypeScript / Rust</span>
              </div>
              <div className="flex justify-between items-center text-[10px] border-b border-zinc-850 pb-2">
                <span className="text-zinc-500">NEXT.JS</span>
                <span className="text-zinc-300">v16.2.6</span>
              </div>
              <div className="flex justify-between items-center text-[10px] border-b border-zinc-850 pb-2">
                <span className="text-zinc-500">REACT</span>
                <span className="text-zinc-300">v19.2.4</span>
              </div>
              <div className="flex justify-between items-center text-[10px] border-b border-zinc-850 pb-2">
                <span className="text-zinc-500">TAILWIND</span>
                <span className="text-zinc-300">v4.0.0</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-zinc-500">RUNTIME</span>
                <span className="text-purple-400 font-bold">TAURI V2</span>
              </div>
            </div>

            <div className="mt-2 p-4 bg-black/40 border border-zinc-900 rounded flex flex-col gap-2 text-[9px] leading-relaxed">
              <div className="text-zinc-500 flex gap-2">
                <span className="text-purple-500">$</span> git clone https://github.com/sah-rohit/SYNKRON.git
              </div>
              <div className="text-zinc-600">Cloning into 'SYNKRON'...</div>
              <div className="text-zinc-500 flex gap-2">
                <span className="text-purple-500">$</span> npm clean-install --legacy-peer-deps
              </div>
              <div className="text-zinc-500 flex gap-2">
                <span className="text-purple-500">$</span> npm run dev
              </div>
              <div className="text-emerald-400 flex gap-2 font-bold mt-1 items-center">
                <Zap className="w-2.5 h-2.5 animate-pulse" /> SYSTEM OPERATIONAL - PORT:3000
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Promotion Ribbon */}
      <div className="p-6 bg-gradient-to-r from-purple-900/20 via-zinc-900/40 to-zinc-950 border border-purple-500/20 flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="flex flex-col gap-1 relative z-10">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-purple-400" /> Support the Open Source Initiative
          </h4>
          <p className="text-[10px] text-zinc-400 font-sans max-w-md">
            Star the repository to show support, fork to contribute, or open issues to help improve the self-healing compiler engine!
          </p>
        </div>
        <a
          href="https://github.com/sah-rohit/SYNKRON"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer font-bold text-[10px] uppercase tracking-wider z-10 flex items-center gap-2 shrink-0"
        >
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span>Star Repository</span>
        </a>
      </div>
    </div>
  );
}