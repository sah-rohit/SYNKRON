'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GitBranch, Plus, Trash2, RefreshCw, Key, Settings, RotateCcw, Shield,
  CheckCircle, AlertCircle, Copy, Folder, FileText, Lock, Search, ExternalLink,
  Star, Globe, ChevronRight, X, Info, Zap, ArrowRight, Eye, EyeOff, File as FileIcon,
  GitCommit, Clock, Code, Terminal
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Repo {
  id: string;
  fullName: string;
  branch: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
}

interface GHRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
  html_url: string;
}

interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
  isProtected: boolean;
  lastCommitSha: string | null;
  lastCommitMessage: string | null;
}

interface Token {
  id: string;
  label: string;
  tokenPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface RepoValidation {
  loading: boolean;
  valid: boolean | null;
  data: GHRepo | null;
  error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', c: 'c', h: 'c', cpp: 'cpp', cs: 'csharp',
    rs: 'rust', go: 'go', java: 'java', rb: 'ruby', php: 'php',
    json: 'json', md: 'markdown', css: 'css', html: 'html', sh: 'bash',
    yaml: 'yaml', yml: 'yaml', sql: 'sql', toml: 'toml',
  };
  return map[ext] ?? 'text';
}

function syntaxHighlight(code: string, lang: string): string {
  const escaped = code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  if (['text', 'markdown'].includes(lang)) return escaped;
  const kwMap: Record<string, string[]> = {
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'throw', 'new', 'typeof', 'interface', 'type', 'enum', 'extends', 'implements', 'public', 'private', 'protected', 'static', 'readonly', 'void', 'null', 'undefined', 'true', 'false', 'from', 'of', 'in'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'throw', 'new', 'typeof', 'null', 'undefined', 'true', 'false', 'from', 'of', 'in'],
    python: ['def', 'class', 'import', 'from', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'with', 'as', 'pass', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'lambda', 'yield', 'async', 'await'],
    rust: ['fn', 'let', 'mut', 'impl', 'struct', 'enum', 'pub', 'use', 'mod', 'match', 'if', 'else', 'for', 'while', 'loop', 'return', 'break', 'continue', 'true', 'false', 'async', 'await', 'trait', 'type', 'const', 'static'],
  };
  const keywords = kwMap[lang] ?? kwMap.javascript;
  let result = escaped;
  result = result.replace(/(&quot;|&#39;|`)(.*?)\1/g, '<span class="text-emerald-400">$1$2$1</span>');
  result = result.replace(/(\/\/[^\n]*)/g, '<span class="text-zinc-500 italic">$1</span>');
  result = result.replace(/(#[^\n]*)/g, '<span class="text-zinc-500 italic">$1</span>');
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-yellow-400">$1</span>');
  const kwRe = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  result = result.replace(kwRe, '<span class="text-purple-400 font-semibold">$1</span>');
  result = result.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="text-cyan-400">$1</span>');
  return result;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Webhook Setup Guide ──────────────────────────────────────────────────────

function WebhookGuide({ repo, webhookSecret, webhookUrl, onDismiss }: {
  repo: Repo;
  webhookSecret: string;
  webhookUrl: string;
  onDismiss: () => void;
}) {
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [step, setStep] = useState(1);

  const copy = async (text: string, which: 'secret' | 'url') => {
    await navigator.clipboard.writeText(text);
    if (which === 'secret') { setCopiedSecret(true); setTimeout(() => setCopiedSecret(false), 2000); }
    else { setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000); }
  };

  return (
    <div className="p-5 bg-zinc-950 border border-emerald-500/30 rounded-lg flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Repository Connected!</p>
            <p className="text-[10px] text-zinc-500 font-sans">Now configure the GitHub webhook to enable auto-healing.</p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <button
              onClick={() => setStep(s)}
              className={`w-6 h-6 rounded-full text-[9px] font-bold border transition-all cursor-pointer ${step === s ? 'bg-purple-600 border-purple-500 text-white' : step > s ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}
            >
              {step > s ? '✓' : s}
            </button>
            {s < 3 && <div className={`flex-1 h-px ${step > s ? 'bg-emerald-500/40' : 'bg-zinc-800'}`} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold text-white">Step 1 — Open GitHub Webhook Settings</p>
          <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
            Go to your repository on GitHub, then navigate to{' '}
            <span className="text-white font-mono">Settings → Webhooks → Add webhook</span>.
          </p>
          <a
            href={`https://github.com/${repo.fullName}/settings/hooks/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white text-[11px] font-bold uppercase transition-colors rounded"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open GitHub Webhook Settings
          </a>
          <button onClick={() => setStep(2)} className="flex items-center justify-center gap-1.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase rounded transition-colors cursor-pointer">
            Next <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold text-white">Step 2 — Configure the Webhook</p>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-zinc-500 uppercase font-bold">Payload URL</label>
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
                <code className="flex-1 text-[10px] text-cyan-300 font-mono break-all">{webhookUrl}</code>
                <button onClick={() => copy(webhookUrl, 'url')} className="shrink-0 p-1 text-zinc-500 hover:text-white transition-colors">
                  {copiedUrl ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-zinc-500 uppercase font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-yellow-400" />
                Webhook Secret — copy now, shown once
              </label>
              <div className="flex items-center gap-2 bg-zinc-900 border border-yellow-500/30 px-3 py-2 rounded">
                <code className="flex-1 text-[10px] text-yellow-300 font-mono break-all">{webhookSecret}</code>
                <button onClick={() => copy(webhookSecret, 'secret')} className="shrink-0 p-1 text-zinc-500 hover:text-white transition-colors">
                  {copiedSecret ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-400 font-sans leading-relaxed">
              Set <span className="text-white font-mono">Content type</span> to{' '}
              <span className="text-cyan-300 font-mono">application/json</span> and select{' '}
              <span className="text-white font-mono">Just the push event</span>.
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded cursor-pointer hover:text-white transition-colors">Back</button>
            <button onClick={() => setStep(3)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold uppercase rounded transition-colors cursor-pointer">
              Next <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold text-white">Step 3 — Verify & Done</p>
          <div className="flex flex-col gap-2">
            {[
              { icon: CheckCircle, color: 'text-emerald-400', text: 'Payload URL set to your SYNKRON endpoint' },
              { icon: CheckCircle, color: 'text-emerald-400', text: 'Content type: application/json' },
              { icon: CheckCircle, color: 'text-emerald-400', text: 'Secret copied and pasted into GitHub' },
              { icon: CheckCircle, color: 'text-emerald-400', text: '"Just the push event" selected' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-400 font-sans">
                <item.icon className={`w-3.5 h-3.5 ${item.color} shrink-0`} />
                {item.text}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
            After saving the webhook in GitHub, push any commit to <span className="text-white font-mono">{repo.branch}</span> and SYNKRON will automatically heal the documentation.
          </p>
          <button onClick={onDismiss} className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase rounded transition-colors cursor-pointer">
            All Done — Start Healing
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Connect Panel ────────────────────────────────────────────────────────────

function ConnectPanel({ onConnected, triggerAlert }: {
  onConnected: (repo: Repo, secret: string, webhookUrl: string) => void;
  triggerAlert: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}) {
  const [tab, setTab] = useState<'manual' | 'browse'>('manual');
  const [input, setInput] = useState('');
  const [branch, setBranch] = useState('');
  const [validation, setValidation] = useState<RepoValidation>({ loading: false, valid: null, data: null, error: null });
  const [connecting, setConnecting] = useState(false);

  // Browse tab state
  const [pat, setPat] = useState(() => {
    try { return sessionStorage.getItem('synkron_gh_pat') ?? ''; } catch { return ''; }
  });
  const [showPat, setShowPat] = useState(false);
  const [ghRepos, setGhRepos] = useState<GHRepo[]>([]);
  const [ghSearch, setGhSearch] = useState('');
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState('');
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const validateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-validate as user types
  useEffect(() => {
    if (validateTimer.current) clearTimeout(validateTimer.current);
    const cleaned = input.trim()
      .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/\/$/, '');

    if (!cleaned || !cleaned.includes('/')) {
      setValidation({ loading: false, valid: null, data: null, error: null });
      return;
    }
    setValidation(v => ({ ...v, loading: true, valid: null, error: null }));
    validateTimer.current = setTimeout(async () => {
      try {
        const headers: Record<string, string> = {};
        if (pat) headers['x-github-token'] = pat;
        const res = await fetch(`/api/github/validate?repo=${encodeURIComponent(cleaned)}`, { headers });
        const data = await res.json();
        if (data.success) {
          setValidation({ loading: false, valid: true, data: data.repo, error: null });
          if (!branch) setBranch(data.repo.default_branch);
        } else {
          setValidation({ loading: false, valid: false, data: null, error: data.error });
        }
      } catch {
        setValidation({ loading: false, valid: false, data: null, error: 'Network error' });
      }
    }, 600);
  }, [input, pat]);

  const savePat = (value: string) => {
    setPat(value);
    try { sessionStorage.setItem('synkron_gh_pat', value); } catch {}
  };

  const fetchGhRepos = async () => {
    if (!pat) { setGhError('Enter a GitHub Personal Access Token first.'); return; }
    setGhLoading(true); setGhError('');
    try {
      const res = await fetch(`/api/github/repos?per_page=50`, {
        headers: { 'x-github-token': pat },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setGhRepos(data.repos);
    } catch (err: any) {
      setGhError(err.message);
    } finally { setGhLoading(false); }
  };

  const searchGhRepos = async () => {
    if (!pat || !ghSearch.trim()) return;
    setGhLoading(true); setGhError('');
    try {
      const res = await fetch(`/api/github/repos?q=${encodeURIComponent(ghSearch)}&per_page=20`, {
        headers: { 'x-github-token': pat },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setGhRepos(data.repos);
    } catch (err: any) {
      setGhError(err.message);
    } finally { setGhLoading(false); }
  };

  const doConnect = async (fullName: string, defaultBranch: string) => {
    setConnecting(true);
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, branch: defaultBranch }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      onConnected(data.repository, data.repository.webhookSecret, data.repository.webhookUrl);
    } catch (err: any) {
      triggerAlert('error', 'Connect Failed', err.message);
    } finally { setConnecting(false); setConnectingId(null); }
  };

  const handleManualConnect = async () => {
    const cleaned = input.trim()
      .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/\/$/, '');
    await doConnect(cleaned, branch || validation.data?.default_branch || 'main');
  };

  const handleBrowseConnect = async (repo: GHRepo) => {
    setConnectingId(repo.id);
    await doConnect(repo.full_name, repo.default_branch);
  };

  const filteredRepos = ghSearch
    ? ghRepos.filter(r => r.full_name.toLowerCase().includes(ghSearch.toLowerCase()) || (r.description ?? '').toLowerCase().includes(ghSearch.toLowerCase()))
    : ghRepos;

  return (
    <div className="flex flex-col gap-0 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800">
        {(['manual', 'browse'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-[10px] font-bold uppercase transition-colors cursor-pointer ${tab === t ? 'bg-zinc-900 text-white border-b-2 border-purple-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {t === 'manual' ? '⌨ Manual' : '🔍 Browse GitHub'}
          </button>
        ))}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {tab === 'manual' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-zinc-500 uppercase font-bold">Repository</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="owner/repo  or  paste a GitHub URL"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && validation.valid && !connecting && handleManualConnect()}
                  className={`w-full bg-zinc-900 border px-3 py-2 text-xs text-white focus:outline-none placeholder:text-zinc-600 pr-8 transition-colors ${
                    validation.valid === true ? 'border-emerald-500/50' :
                    validation.valid === false ? 'border-rose-500/50' :
                    'border-zinc-800 focus:border-purple-500/50'
                  }`}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {validation.loading && <RefreshCw className="w-3.5 h-3.5 text-zinc-500 animate-spin" />}
                  {validation.valid === true && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  {validation.valid === false && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                </div>
              </div>
              {validation.error && (
                <p className="text-[10px] text-rose-400 font-sans">{validation.error}</p>
              )}
            </div>

            {/* Repo preview card */}
            {validation.valid && validation.data && (
              <div className="p-3 bg-zinc-900 border border-emerald-500/20 rounded flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {validation.data.private ? <Lock className="w-3 h-3 text-zinc-500" /> : <Globe className="w-3 h-3 text-zinc-500" />}
                    <span className="text-[11px] font-bold text-white">{validation.data.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {validation.data.language && (
                      <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{validation.data.language}</span>
                    )}
                    {validation.data.stargazers_count > 0 && (
                      <span className="text-[8px] text-zinc-500 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" />{validation.data.stargazers_count.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                {validation.data.description && (
                  <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">{validation.data.description}</p>
                )}
                <div className="flex items-center gap-1 text-[9px] text-zinc-500">
                  <GitBranch className="w-2.5 h-2.5" />
                  Default branch: <span className="text-zinc-300 font-mono ml-0.5">{validation.data.default_branch}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-zinc-500 uppercase font-bold">Branch to track</label>
              <input
                type="text"
                placeholder={validation.data?.default_branch ?? 'main'}
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 placeholder:text-zinc-600"
              />
            </div>

            <button
              onClick={handleManualConnect}
              disabled={connecting || !input.trim() || validation.loading}
              className="py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer rounded"
            >
              {connecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              {connecting ? 'Connecting...' : 'Connect Repository'}
            </button>
          </>
        )}

        {tab === 'browse' && (
          <>
            {/* PAT input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-zinc-500 uppercase font-bold flex items-center gap-1">
                GitHub Personal Access Token
                <a href="https://github.com/settings/tokens/new?scopes=repo&description=SYNKRON" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </label>
              <div className="relative">
                <input
                  type={showPat ? 'text' : 'password'}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={pat}
                  onChange={e => savePat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchGhRepos()}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 placeholder:text-zinc-600 pr-8"
                />
                <button onClick={() => setShowPat(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                  {showPat ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[9px] text-zinc-600 font-sans">
                Needs <span className="text-zinc-400 font-mono">repo</span> scope. Stored in session only — never sent to third parties.
              </p>
            </div>

            <button
              onClick={fetchGhRepos}
              disabled={ghLoading || !pat}
              className="py-2 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 disabled:opacity-40 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer rounded"
            >
              {ghLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {ghLoading ? 'Fetching...' : ghRepos.length ? 'Refresh' : 'Fetch My Repos'}
            </button>

            {ghError && (
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded text-[10px] text-rose-400 font-sans">{ghError}</div>
            )}

            {ghRepos.length > 0 && (
              <>
                {/* Search within fetched repos */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Filter repositories..."
                    value={ghSearch}
                    onChange={e => setGhSearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50 placeholder:text-zinc-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {filteredRepos.map(repo => (
                    <div key={repo.id} className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded transition-colors group">
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {repo.private ? <Lock className="w-3 h-3 text-zinc-500 shrink-0" /> : <Globe className="w-3 h-3 text-zinc-500 shrink-0" />}
                          <span className="text-[10px] font-bold text-white truncate">{repo.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2 pl-4">
                          {repo.language && <span className="text-[8px] text-zinc-500">{repo.language}</span>}
                          <span className="text-[8px] text-zinc-600 flex items-center gap-0.5">
                            <GitBranch className="w-2 h-2" />{repo.default_branch}
                          </span>
                          <span className="text-[8px] text-zinc-600">{timeAgo(repo.updated_at)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleBrowseConnect(repo)}
                        disabled={connectingId === repo.id || connecting}
                        className="ml-2 px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 text-[9px] uppercase font-bold rounded cursor-pointer transition-colors disabled:opacity-50 shrink-0"
                      >
                        {connectingId === repo.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Connect'}
                      </button>
                    </div>
                  ))}
                  {filteredRepos.length === 0 && (
                    <p className="text-[10px] text-zinc-500 font-sans text-center py-4">No repositories match your filter.</p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RepositoriesView({ navigateBack, triggerAlert, isLoggedIn, navigateTo }: {
  navigateBack: () => void;
  triggerAlert: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  isLoggedIn: boolean;
  navigateTo: (v: any) => void;
}) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [showWebhookGuide, setShowWebhookGuide] = useState<{ repo: Repo; secret: string; url: string } | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Tabs for selected repo
  const [activeTab, setActiveTab] = useState<'files' | 'branches' | 'tokens' | 'settings'>('files');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [repoSettings, setRepoSettings] = useState<any>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [repoFiles, setRepoFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [viewingFile, setViewingFile] = useState<any>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // GitHub PAT for authenticated API calls
  const [pat, setPat] = useState(() => {
    try { return sessionStorage.getItem('synkron_gh_pat') ?? ''; } catch { return ''; }
  });

  useEffect(() => {
    if (isLoggedIn) loadRepos();
  }, [isLoggedIn]);

  useEffect(() => {
    if (selectedRepo) {
      loadBranches();
      loadTokens();
      loadSettings();
      if (activeTab === 'files') loadFiles();
      setViewingFile(null);
      setFileContent(null);
    }
  }, [selectedRepo, activeTab]);

  const loadRepos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/repositories');
      const data = await res.json();
      if (data.success) setRepos(data.repositories);
    } catch {} finally { setLoading(false); }
  };

  const loadBranches = async () => {
    if (!selectedRepo) return;
    try {
      const res = await fetch(`/api/repositories/${selectedRepo.id}/branches`);
      const data = await res.json();
      if (data.success) setBranches(data.branches);
    } catch {}
  };

  const loadTokens = async () => {
    if (!selectedRepo) return;
    try {
      const res = await fetch(`/api/repositories/${selectedRepo.id}/tokens`);
      const data = await res.json();
      if (data.success) setTokens(data.tokens);
    } catch {}
  };

  const loadSettings = async () => {
    if (!selectedRepo) return;
    try {
      const res = await fetch(`/api/repositories/${selectedRepo.id}/settings`);
      const data = await res.json();
      if (data.success) setRepoSettings(data.settings);
    } catch {}
  };

  const loadFiles = async () => {
    if (!selectedRepo) return;
    setLoadingFiles(true);
    try {
      const headers: Record<string, string> = {};
      if (pat) headers['x-github-token'] = pat;
      const res = await fetch(`/api/repositories/${selectedRepo.id}/tree`, { headers });
      const data = await res.json();
      if (data.success && data.tree) setRepoFiles(data.tree);
      else throw new Error(data.error || 'Failed to load files');
    } catch (err: any) {
      triggerAlert('error', 'Fetch Failed', err.message);
    } finally { setLoadingFiles(false); }
  };

  const viewFile = async (file: any) => {
    if (file.type !== 'blob') return;
    setViewingFile(file);
    setLoadingContent(true);
    setFileContent(null);
    try {
      const isImage = file.path.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i);
      if (isImage) {
        setFileContent('IMAGE');
        setLoadingContent(false);
        return;
      }
      const res = await fetch(`https://raw.githubusercontent.com/${selectedRepo?.fullName}/${selectedRepo?.branch}/${file.path}`);
      if (!res.ok) throw new Error('Failed to load file content');
      const text = await res.text();
      setFileContent(text);
    } catch (err: any) {
      triggerAlert('error', 'Load Failed', err.message);
      setFileContent('Error loading file content.');
    } finally {
      setLoadingContent(false);
    }
  };

  const deleteRepo = async (id: string) => {
    if (!confirm('Disconnect this repository? All heal history and doc files will be deleted.')) return;
    try {
      const res = await fetch(`/api/repositories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(typeof data.error === 'string' ? data.error : 'Delete failed');
      setRepos(prev => prev.filter(r => r.id !== id));
      if (selectedRepo?.id === id) setSelectedRepo(null);
      triggerAlert('info', 'Repository Removed', 'Repository disconnected.');
    } catch (err: any) { triggerAlert('error', 'Delete Failed', err.message); }
  };

  const saveSettings = async () => {
    if (!selectedRepo) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/repositories/${selectedRepo.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: repoSettings.branch, isActive: repoSettings.isActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');
      triggerAlert('success', 'Settings Saved', 'Repository settings updated.');
      loadRepos();
    } catch (err: any) { triggerAlert('error', 'Save Failed', err.message); }
    finally { setSavingSettings(false); }
  };

  const filteredRepos = repos.filter(r =>
    r.fullName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-6 flex flex-col gap-6 font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold uppercase text-white flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-purple-400" />
            Repositories
          </h1>
          <span className="text-[10px] text-zinc-500 font-sans">Connect GitHub repositories and configure webhooks for auto-healing.</span>
        </div>
        <button onClick={loadRepos} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-[9px] font-bold uppercase cursor-pointer transition-colors rounded">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /><span>Refresh</span>
        </button>
      </div>

      {!isLoggedIn && (
        <div className="p-8 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col items-center gap-4">
          <Lock className="w-12 h-12 text-zinc-600" />
          <div className="text-center">
            <p className="text-sm font-bold text-white mb-1">Sign in to manage repositories</p>
            <p className="text-[10px] text-zinc-500 font-sans">Connect your GitHub repos and enable self-healing documentation.</p>
          </div>
          <button onClick={() => navigateTo('login')} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase cursor-pointer transition-colors rounded">Sign In</button>
        </div>
      )}

      {isLoggedIn && (
        <>
          {/* Webhook setup guide banner */}
          {showWebhookGuide && (
            <WebhookGuide
              repo={showWebhookGuide.repo}
              webhookSecret={showWebhookGuide.secret}
              webhookUrl={showWebhookGuide.url}
              onDismiss={() => setShowWebhookGuide(null)}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Connect + Repo List */}
            <div className="flex flex-col gap-4">
              <ConnectPanel
                onConnected={(repo, secret, url) => {
                  setRepos(prev => [...prev, repo]);
                  setShowWebhookGuide({ repo, secret, url });
                  setSelectedRepo(repo);
                }}
                triggerAlert={triggerAlert}
              />

              {/* Search */}
              {repos.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Filter repositories..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50 placeholder:text-zinc-600 rounded"
                  />
                </div>
              )}

              {/* Repo List */}
              <div className="flex flex-col gap-2">
                {filteredRepos.length === 0 && !loading && repos.length === 0 && (
                  <p className="text-[10px] text-zinc-500 font-sans p-3 text-center">No repositories connected yet.</p>
                )}
                {filteredRepos.length === 0 && searchFilter && repos.length > 0 && (
                  <p className="text-[10px] text-zinc-500 font-sans p-3 text-center">No repositories match "{searchFilter}".</p>
                )}
                {filteredRepos.map(repo => (
                  <div
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo)}
                    className={`p-3 rounded border cursor-pointer transition-all flex items-start justify-between gap-2 ${selectedRepo?.id === repo.id ? 'bg-purple-600/10 border-purple-500/40 shadow-lg shadow-purple-500/10' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${repo.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                        <span className="text-[10px] font-bold text-white truncate">{repo.fullName}</span>
                      </div>
                      <span className="text-[9px] text-zinc-500 flex items-center gap-1 pl-3">
                        <GitBranch className="w-2.5 h-2.5" />{repo.branch}
                      </span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteRepo(repo.id); }}
                      className="p-1 text-zinc-600 hover:text-rose-400 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Repo Detail */}
            {selectedRepo ? (
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{selectedRepo.fullName}</p>
                    <p className="text-[9px] text-zinc-500">Connected {timeAgo(selectedRepo.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    {(['files', 'branches', 'tokens', 'settings'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-2.5 py-1 text-[9px] font-bold uppercase border transition-all cursor-pointer rounded ${activeTab === tab ? 'bg-purple-600/20 border-purple-500/40 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Files Tab */}
                {activeTab === 'files' && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">[REPOSITORY_TREE]</span>
                      <button onClick={loadFiles} disabled={loadingFiles} className="text-[9px] text-zinc-500 hover:text-white flex items-center gap-1 cursor-pointer transition-colors">
                        <RefreshCw className={`w-2.5 h-2.5 ${loadingFiles ? 'animate-spin' : ''}`} />Refresh
                      </button>
                    </div>
                    {loadingFiles ? (
                      <div className="flex items-center justify-center p-8 gap-2">
                        <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                        <span className="text-[10px] text-zinc-500">Fetching file tree from GitHub...</span>
                      </div>
                    ) : repoFiles.length === 0 ? (
                      <p className="text-[10px] text-zinc-500 font-sans text-center py-4">No files found or repository is empty.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                        {repoFiles.slice(0, 100).map((file, i) => (
                          <div key={i} className="flex items-center justify-between p-2 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded transition-colors group">
                            <div className="flex items-center gap-2 truncate">
                              {file.type === 'tree' ? (
                                <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              ) : file.path.match(/\.(png|jpg|jpeg|gif|svg)$/i) ? (
                                <FileIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              )}
                              <span className="text-[10px] text-zinc-300 font-mono truncate">{file.path}</span>
                            </div>
                            <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[8px] px-1.5 bg-zinc-800 text-zinc-400 rounded uppercase">
                                {file.type === 'tree' ? 'Folder' : file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'File'}
                              </span>
                              {file.type === 'blob' && (
                                <button onClick={() => viewFile(file)} className="px-2 py-0.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-400 text-[8px] uppercase font-bold rounded cursor-pointer transition-colors">
                                  View
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {repoFiles.length > 100 && (
                          <p className="text-[9px] text-zinc-600 text-center py-2">Showing first 100 files</p>
                        )}
                      </div>
                    )}

                    {/* File Content Viewer */}
                    {viewingFile && (
                      <div className="mt-2 border border-zinc-800 bg-zinc-900/50 rounded-lg flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-2 border-b border-zinc-800 bg-zinc-900">
                          <span className="text-[10px] font-bold text-white font-mono flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-purple-400" />
                            {viewingFile.path}
                          </span>
                          <button onClick={() => setViewingFile(null)} className="text-zinc-500 hover:text-white cursor-pointer p-1 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-3 max-h-[500px] overflow-auto relative" style={{ scrollbarWidth: 'thin' }}>
                          {loadingContent ? (
                            <div className="flex items-center justify-center p-8 gap-2">
                              <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                              <span className="text-[10px] text-zinc-500 font-mono">Loading content...</span>
                            </div>
                          ) : fileContent === 'IMAGE' ? (
                            <div className="flex justify-center p-4">
                              <img src={`https://raw.githubusercontent.com/${selectedRepo?.fullName}/${selectedRepo?.branch}/${viewingFile.path}`} alt={viewingFile.path} className="max-w-full max-h-[400px] object-contain border border-zinc-800 rounded" />
                            </div>
                          ) : (
                            <pre
                              className="text-[10px] text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap selection:bg-purple-500/30"
                              dangerouslySetInnerHTML={{
                                __html: fileContent ? syntaxHighlight(fileContent, detectLanguage(viewingFile.path)) : ''
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Branches Tab */}
                {activeTab === 'branches' && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">[BRANCHES]</span>
                      <button onClick={loadBranches} className="text-[9px] text-zinc-500 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"><RefreshCw className="w-2.5 h-2.5" />Refresh</button>
                    </div>
                    {branches.length === 0 ? (
                      <p className="text-[10px] text-zinc-500 font-sans text-center py-4">No branches tracked yet. Branches are added automatically when webhooks are received.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {branches.map(b => (
                          <div key={b.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                              <span className="text-[10px] font-bold text-white">{b.name}</span>
                              {b.isDefault && <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 rounded">default</span>}
                              {b.isProtected && <span className="text-[8px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-1.5 rounded flex items-center gap-0.5"><Shield className="w-2 h-2" />protected</span>}
                            </div>
                            {b.lastCommitMessage && <span className="text-[9px] text-zinc-500 truncate max-w-xs font-sans">{b.lastCommitMessage}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tokens Tab */}
                {activeTab === 'tokens' && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-4">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">[ACCESS TOKENS]</span>
                    <p className="text-[10px] text-zinc-500 font-sans">Access tokens allow external services to interact with this repository's documentation API.</p>
                    {tokens.length === 0 ? (
                      <p className="text-[10px] text-zinc-500 font-sans text-center py-4">No access tokens created yet.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {tokens.map(t => (
                          <div key={t.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-between gap-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-white">{t.label}</span>
                              <span className="text-[9px] text-zinc-500 font-mono">{t.tokenPrefix}••••••••</span>
                              <div className="flex gap-1 mt-0.5">
                                {(t.scopes as string[]).map(s => <span key={s} className="text-[7px] bg-zinc-800 text-zinc-400 px-1 rounded">{s}</span>)}
                              </div>
                            </div>
                            <div className="text-right flex flex-col gap-0.5">
                              {t.expiresAt && <span className="text-[8px] text-zinc-500">Expires {new Date(t.expiresAt).toLocaleDateString()}</span>}
                              {t.lastUsedAt && <span className="text-[8px] text-zinc-500">Last used {new Date(t.lastUsedAt).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-4">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">[SETTINGS]</span>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase">Default Branch</label>
                        <input type="text" value={repoSettings.branch ?? ''} onChange={e => setRepoSettings((p: any) => ({ ...p, branch: e.target.value }))}
                          className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50 rounded" />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded">
                        <div>
                          <p className="text-[10px] font-bold text-white">Active</p>
                          <p className="text-[9px] text-zinc-500 font-sans">Receive and process webhook events</p>
                        </div>
                        <button
                          onClick={() => setRepoSettings((p: any) => ({ ...p, isActive: !p.isActive }))}
                          className={`w-10 h-5 rounded-full transition-colors relative ${repoSettings.isActive ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${repoSettings.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      <button onClick={saveSettings} disabled={savingSettings}
                        className="py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors rounded">
                        {savingSettings ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="lg:col-span-2 p-12 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col items-center gap-3 text-center">
                <GitBranch className="w-12 h-12 text-zinc-600" />
                <p className="text-sm font-bold text-white">Select a repository</p>
                <p className="text-[10px] text-zinc-500 font-sans max-w-sm">Choose a repository from the left to view files, manage branches, and configure settings.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
