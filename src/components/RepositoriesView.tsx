'use client';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, GitBranch, Plus, Trash2, RefreshCw, Key, Settings, RotateCcw, Shield, CheckCircle, AlertCircle, Copy, Eye, EyeOff, Folder, File as FileIcon, FileText, Lock } from 'lucide-react';

interface Repo {
  id: string;
  fullName: string;
  branch: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
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

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cs: 'csharp',
    rs: 'rust', go: 'go', java: 'java', rb: 'ruby', php: 'php', swift: 'swift',
    json: 'json', md: 'markdown', css: 'css', html: 'html', sh: 'bash', yaml: 'yaml', yml: 'yaml',
    sql: 'sql', xml: 'xml', toml: 'toml', ini: 'ini'
  };
  return map[ext] ?? 'text';
}

function syntaxHighlight(code: string, lang: string): string {
  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  
  if (['text', 'markdown', 'txt'].includes(lang)) return escaped;

  // Comprehensive keywords for High Processing & Cloud languages
  const kwMap: Record<string, string[]> = {
    python: ['def', 'class', 'import', 'from', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'with', 'as', 'pass', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'lambda', 'yield', 'async', 'await'],
    rust: ['fn', 'let', 'mut', 'impl', 'struct', 'enum', 'pub', 'use', 'mod', 'match', 'if', 'else', 'for', 'while', 'loop', 'return', 'break', 'continue', 'true', 'false', 'async', 'await', 'trait', 'type', 'const', 'static', 'ref', 'unsafe'],
    go: ['func', 'var', 'const', 'type', 'struct', 'interface', 'package', 'import', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'select', 'go', 'defer', 'chan', 'map', 'true', 'false', 'nil'],
    java: ['class', 'public', 'private', 'protected', 'static', 'final', 'void', 'int', 'boolean', 'double', 'float', 'char', 'byte', 'short', 'long', 'new', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'import', 'package', 'extends', 'implements', 'interface', 'enum', 'this', 'super', 'true', 'false', 'null'],
    c: ['int', 'void', 'char', 'float', 'double', 'long', 'short', 'unsigned', 'signed', 'struct', 'union', 'enum', 'typedef', 'sizeof', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'goto', 'static', 'extern', 'const', 'volatile', 'register', 'auto'],
    cpp: ['class', 'public', 'private', 'protected', 'virtual', 'override', 'template', 'typename', 'constexpr', 'inline', 'friend', 'namespace', 'using', 'new', 'delete', 'true', 'false', 'nullptr', 'this'],
    csharp: ['class', 'public', 'private', 'protected', 'internal', 'static', 'readonly', 'void', 'int', 'string', 'bool', 'var', 'new', 'return', 'if', 'else', 'for', 'foreach', 'in', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'using', 'namespace', 'get', 'set', 'true', 'false', 'null', 'async', 'await'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'throw', 'new', 'typeof', 'interface', 'type', 'enum', 'extends', 'implements', 'public', 'private', 'protected', 'static', 'readonly', 'void', 'null', 'undefined', 'true', 'false', 'from', 'of', 'in'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'throw', 'new', 'typeof', 'null', 'undefined', 'true', 'false', 'from', 'of', 'in']
  };

  // Merge C++ keywords with C
  kwMap.cpp = [...(kwMap.c || []), ...(kwMap.cpp || [])];

  const keywords = kwMap[lang] || kwMap.javascript; // Fallback to JS keywords

  let result = escaped;

  // Strings (Single, Double, Backtick)
  result = result.replace(/(&quot;|&#39;|`)(.*?)\1/g, '<span class="text-emerald-400">$1$2$1</span>');
  // Comments (// and # and /* */)
  result = result.replace(/(\/\/[^\n]*)/g, '<span class="text-zinc-500 italic">$1</span>');
  result = result.replace(/(#[^\n]*)/g, '<span class="text-zinc-500 italic">$1</span>');
  result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-zinc-500 italic">$1</span>');
  // Numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-yellow-400">$1</span>');
  // Keywords
  const kwRe = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  result = result.replace(kwRe, '<span class="text-purple-400 font-semibold">$1</span>');
  // Function calls / Decorators / Macros
  result = result.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="text-cyan-400">$1</span>');
  result = result.replace(/(@[a-zA-Z_]\w*)/g, '<span class="text-pink-400">$1</span>'); // Decorators
  result = result.replace(/(!\s*[a-zA-Z_]\w*)/g, '<span class="text-orange-400">$1</span>'); // Rust macros

  return result;
}

export default function RepositoriesView({ navigateBack, triggerAlert, isLoggedIn, navigateTo }: {
  navigateBack: () => void;
  triggerAlert: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  isLoggedIn: boolean;
  navigateTo: (v: any) => void;
}) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRepo, setNewRepo] = useState('');
  const [newBranch, setNewBranch] = useState('main');
  const [adding, setAdding] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [newTokenLabel, setNewTokenLabel] = useState('');
  const [newTokenScopes, setNewTokenScopes] = useState<string[]>(['read']);
  const [newTokenExpiry, setNewTokenExpiry] = useState('');
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'branches' | 'tokens' | 'settings'>('files');
  const [repoSettings, setRepoSettings] = useState<any>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [repoFiles, setRepoFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [viewingFile, setViewingFile] = useState<any>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [myGithubRepos, setMyGithubRepos] = useState<any[]>([]);
  const [fetchingGithub, setFetchingGithub] = useState(false);

  useEffect(() => { 
    if (isLoggedIn) {
      loadRepos(); 
      const savedToken = localStorage.getItem('ostinato_github_pat');
      if (savedToken) setGithubToken(savedToken);
    }
  }, [isLoggedIn]);
  
  useEffect(() => { if (selectedRepo) { loadBranches(); loadTokens(); loadSettings(); loadFiles(); setViewingFile(null); setFileContent(null); } }, [selectedRepo]);

  const fetchMyRepos = async () => {
    if (!githubToken) {
      triggerAlert('warning', 'Token Missing', 'Add a GitHub Token in the Editor tab or below to fetch your repositories.');
      return;
    }
    setFetchingGithub(true);
    try {
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=20', {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' }
      });
      if (!res.ok) throw new Error('Failed to fetch from GitHub');
      const data = await res.json();
      setMyGithubRepos(data);
    } catch (err: any) { triggerAlert('error', 'GitHub Fetch Failed', err.message); }
    finally { setFetchingGithub(false); }
  };

  const loadRepos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/repositories');
      const data = await res.json();
      if (data.success) setRepos(data.repositories);
    } catch { } finally { setLoading(false); }
  };

  const loadBranches = async () => {
    if (!selectedRepo) return;
    try {
      const res = await fetch(`/api/repositories/${selectedRepo.id}/branches`);
      const data = await res.json();
      if (data.success) setBranches(data.branches);
    } catch { }
  };

  const loadTokens = async () => {
    if (!selectedRepo) return;
    try {
      const res = await fetch(`/api/repositories/${selectedRepo.id}/tokens`);
      const data = await res.json();
      if (data.success) setTokens(data.tokens);
    } catch { }
  };

  const loadSettings = async () => {
    if (!selectedRepo) return;
    try {
      const res = await fetch(`/api/repositories/${selectedRepo.id}/settings`);
      const data = await res.json();
      if (data.success) setRepoSettings(data.settings);
    } catch { }
  };

  const loadFiles = async () => {
    if (!selectedRepo) return;
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/repositories/${selectedRepo.id}/tree`);
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

  const addRepo = async () => {
    let trimmed = newRepo.trim();
    // Auto-parse full GitHub URLs if provided
    trimmed = trimmed.replace(/^https?:\/\/(www\.)?github\.com\//i, '');
    trimmed = trimmed.replace(/^github\.com\//i, '');
    trimmed = trimmed.replace(/\.git$/i, '');
    
    if (!trimmed.includes('/') || trimmed.split('/').length !== 2 || trimmed.startsWith('/') || trimmed.endsWith('/')) {
      triggerAlert('warning', 'Invalid Format', 'Enter in owner/repo format — e.g. facebook/react');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: trimmed, branch: newBranch || 'main' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      setRevealedSecret(data.repository.webhookSecret);
      triggerAlert('success', 'Repository Connected', `Webhook URL copied — configure it in GitHub Settings → Webhooks`);
      setNewRepo(''); setNewBranch('main');
      loadRepos();
    } catch (err: any) { triggerAlert('error', 'Connect Failed', err.message); }
    finally { setAdding(false); }
  };

  const connectGithubRepo = async (repo: any) => {
    setNewRepo(repo.full_name);
    setNewBranch(repo.default_branch || 'main');
    // We auto-trigger addRepo logic by spoofing the states and calling it:
    setAdding(true);
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: repo.full_name, branch: repo.default_branch || 'main' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      setRevealedSecret(data.repository.webhookSecret);
      triggerAlert('success', 'Repository Connected', `Webhook URL copied for ${repo.full_name}`);
      setNewRepo(''); setNewBranch('main');
      loadRepos();
    } catch (err: any) { triggerAlert('error', 'Connect Failed', err.message); }
    finally { setAdding(false); }
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

  const rotateSecret = async () => {
    if (!selectedRepo) return;
    if (!confirm('Rotate webhook secret? You must update GitHub immediately after.')) return;
    try {
      const res = await fetch(`/api/repositories/${selectedRepo.id}/webhook-secret`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');
      setRevealedSecret(data.webhookSecret);
      triggerAlert('warning', 'Secret Rotated', 'Update your GitHub webhook secret NOW. Old secret is invalid.');
    } catch (err: any) { triggerAlert('error', 'Rotation Failed', err.message); }
  };

  const createToken = async () => {
    if (!selectedRepo || !newTokenLabel) { triggerAlert('warning', 'Label Required', 'Enter a label for this token.'); return; }
    try {
      const res = await fetch(`/api/repositories/${selectedRepo.id}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newTokenLabel, scopes: newTokenScopes, expiresInDays: newTokenExpiry ? parseInt(newTokenExpiry) : undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');
      setRevealedSecret(data.token);
      setNewTokenLabel(''); setNewTokenExpiry('');
      loadTokens();
      triggerAlert('warning', 'Token Created', 'Copy this token now — it will not be shown again.');
    } catch (err: any) { triggerAlert('error', 'Token Creation Failed', err.message); }
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

  return (
    <div className="max-w-5xl mx-auto py-6 flex flex-col gap-6 font-mono text-xs">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold uppercase text-white">Repositories</h1>
          <span className="text-[10px] text-zinc-500 font-sans">Connect GitHub repositories, manage branches, access tokens, and webhook secrets.</span>
        </div>
        <button onClick={loadRepos} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-[9px] font-bold uppercase cursor-pointer">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /><span>Refresh</span>
        </button>
      </div>

      {!isLoggedIn && (
        <div className="p-6 bg-zinc-950 border border-zinc-800 rounded flex flex-col items-center gap-3">
          <p className="text-sm font-bold text-white">Sign in to manage repositories</p>
          <button onClick={() => navigateTo('login')} className="px-4 py-2 bg-purple-600 text-white font-bold text-xs uppercase cursor-pointer">Sign In</button>
        </div>
      )}

      {isLoggedIn && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Repo List + Add */}
          <div className="flex flex-col gap-4">
            {/* Add Repo */}
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-3">
              <span className="text-[9px] font-bold text-zinc-500 uppercase">[CONNECT REPO]</span>
              <input
                type="text"
                placeholder="owner/repository"
                value={newRepo}
                onChange={e => setNewRepo(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50 placeholder:text-zinc-600"
              />
              <input
                type="text"
                placeholder="Branch (default: main)"
                value={newBranch}
                onChange={e => setNewBranch(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none placeholder:text-zinc-600"
              />
              <button
                onClick={addRepo}
                disabled={adding || !newRepo}
                className="py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {adding ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                <span>{adding ? 'Connecting...' : 'Connect'}</span>
              </button>

              <div className="mt-2 border-t border-zinc-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">Your GitHub Repos</span>
                  <button onClick={fetchMyRepos} disabled={fetchingGithub} className="text-[9px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer">
                    <RefreshCw className={`w-2.5 h-2.5 ${fetchingGithub ? 'animate-spin' : ''}`} />Fetch
                  </button>
                </div>
                {!githubToken && (
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      placeholder="Paste GitHub PAT..." 
                      value={githubToken} 
                      onChange={e => { setGithubToken(e.target.value); localStorage.setItem('ostinato_github_pat', e.target.value); }}
                      className="flex-1 bg-zinc-900 border border-zinc-800 px-2 py-1 text-[10px] text-zinc-300 focus:outline-none placeholder:text-zinc-600" 
                    />
                  </div>
                )}
                {myGithubRepos.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {myGithubRepos.map(repo => (
                      <div key={repo.id} className="flex items-center justify-between p-2 bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 rounded transition-colors group">
                        <div className="flex items-center gap-2 truncate">
                          {repo.private ? <Lock className="w-3 h-3 text-zinc-500" /> : <Folder className="w-3 h-3 text-zinc-500" />}
                          <span className="text-[10px] font-bold text-white truncate">{repo.full_name}</span>
                        </div>
                        <button onClick={() => connectGithubRepo(repo)} disabled={adding} className="px-2 py-0.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 border border-purple-500/30 text-[9px] uppercase font-bold rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                          Import
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Repo List */}
            <div className="flex flex-col gap-2">
              {repos.length === 0 && !loading && (
                <p className="text-[10px] text-zinc-500 font-sans p-3">No repositories connected yet.</p>
              )}
              {repos.map(repo => (
                <div
                  key={repo.id}
                  onClick={() => setSelectedRepo(repo)}
                  className={`p-3 rounded border cursor-pointer transition-all flex items-start justify-between gap-2 ${selectedRepo?.id === repo.id ? 'bg-purple-600/10 border-purple-500/40' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${repo.isActive ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
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
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{selectedRepo.fullName}</p>
                  <p className="text-[9px] text-zinc-500">Connected {new Date(selectedRepo.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  {(['files', 'branches', 'tokens', 'settings'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-2.5 py-1 text-[9px] font-bold uppercase border transition-all cursor-pointer ${activeTab === tab ? 'bg-purple-600/20 border-purple-500/40 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Revealed Secret Banner */}
              {revealedSecret && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/40 rounded flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-yellow-400 uppercase flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />Copy this now — shown once only</span>
                    <button onClick={() => setRevealedSecret(null)} className="text-zinc-500 hover:text-white"><AlertCircle className="w-3 h-3" /></button>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded">
                    <code className="flex-1 text-[10px] text-yellow-300 font-mono break-all">{revealedSecret}</code>
                    <button onClick={() => { navigator.clipboard.writeText(revealedSecret); triggerAlert('success', 'Copied', 'Secret copied to clipboard.'); }} className="shrink-0 p-1 text-zinc-500 hover:text-white">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Files Tab */}
              {activeTab === 'files' && (
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">[REPOSITORY_TREE]</span>
                    <button onClick={loadFiles} disabled={loadingFiles} className="text-[9px] text-zinc-500 hover:text-white flex items-center gap-1 cursor-pointer">
                      <RefreshCw className={`w-2.5 h-2.5 ${loadingFiles ? 'animate-spin' : ''}`} />Refresh
                    </button>
                  </div>
                  {loadingFiles ? (
                    <p className="text-[10px] text-zinc-500 font-sans">Fetching file tree from GitHub...</p>
                  ) : repoFiles.length === 0 ? (
                    <p className="text-[10px] text-zinc-500 font-sans">No files found or repository is empty.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {repoFiles.map((file, i) => (
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
                            <span className="text-[8px] px-1.5 bg-zinc-800 text-zinc-400 rounded uppercase flex items-center">
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
                    </div>
                  )}

                  {/* File Content Viewer */}
                  {viewingFile && (
                    <div className="mt-2 border border-zinc-800 bg-zinc-900/50 rounded flex flex-col overflow-hidden animate-in fade-in duration-200">
                      <div className="flex items-center justify-between p-2 border-b border-zinc-800 bg-zinc-900">
                        <span className="text-[10px] font-bold text-white font-mono flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-purple-400" />
                          {viewingFile.path}
                        </span>
                        <button onClick={() => setViewingFile(null)} className="text-zinc-500 hover:text-white cursor-pointer p-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-3 max-h-[500px] overflow-auto custom-scrollbar relative">
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
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">[BRANCHES]</span>
                    <button onClick={loadBranches} className="text-[9px] text-zinc-500 hover:text-white flex items-center gap-1 cursor-pointer"><RefreshCw className="w-2.5 h-2.5" />Refresh</button>
                  </div>
                  {branches.length === 0 ? (
                    <p className="text-[10px] text-zinc-500 font-sans">No branches tracked yet. Branches are added automatically when webhooks are received.</p>
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
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">[ACCESS TOKENS]</span>

                  {/* Create Token */}
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded flex flex-col gap-3">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">Create New Token</span>
                    <input type="text" placeholder="Token label (e.g. CI/CD pipeline)" value={newTokenLabel} onChange={e => setNewTokenLabel(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none placeholder:text-zinc-600" />
                    <div className="flex flex-wrap gap-1.5">
                      {['read', 'write', 'webhook', 'admin'].map(scope => (
                        <button key={scope} onClick={() => setNewTokenScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope])}
                          className={`px-2 py-0.5 text-[9px] font-bold border rounded cursor-pointer transition-all ${newTokenScopes.includes(scope) ? 'bg-purple-600/20 border-purple-500/40 text-purple-300' : 'bg-zinc-950 border-zinc-700 text-zinc-500 hover:text-white'}`}>
                          {scope}
                        </button>
                      ))}
                    </div>
                    <input type="number" placeholder="Expires in days (optional)" value={newTokenExpiry} onChange={e => setNewTokenExpiry(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none placeholder:text-zinc-600" />
                    <button onClick={createToken} className="py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[9px] uppercase flex items-center justify-center gap-1.5 cursor-pointer">
                      <Key className="w-3 h-3" /><span>Generate Token</span>
                    </button>
                  </div>

                  {/* Token List */}
                  {tokens.length === 0 ? (
                    <p className="text-[10px] text-zinc-500 font-sans">No access tokens created yet.</p>
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
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">[SETTINGS]</span>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase">Default Branch</label>
                      <input type="text" value={repoSettings.branch ?? ''} onChange={e => setRepoSettings((p: any) => ({ ...p, branch: e.target.value }))}
                        className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none" />
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
                      className="py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer">
                      {savingSettings ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                  </div>

                  {/* Danger Zone */}
                  <div className="p-4 bg-rose-950/10 border border-rose-900/30 rounded flex flex-col gap-3 mt-2">
                    <span className="text-[9px] font-bold text-rose-400 uppercase">Danger Zone</span>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-white">Rotate Webhook Secret</p>
                        <p className="text-[9px] text-zinc-500 font-sans">Invalidates the current secret immediately</p>
                      </div>
                      <button onClick={rotateSecret} className="px-3 py-1.5 bg-rose-950/30 border border-rose-900 text-rose-400 font-bold text-[9px] uppercase flex items-center gap-1.5 cursor-pointer hover:bg-rose-950/60">
                        <RotateCcw className="w-3 h-3" /><span>Rotate</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="lg:col-span-2 p-12 bg-zinc-950 border border-zinc-800 rounded flex flex-col items-center gap-3 text-center">
              <GitBranch className="w-8 h-8 text-zinc-600" />
              <p className="text-sm font-bold text-white">Select a repository</p>
              <p className="text-[10px] text-zinc-500 font-sans">Choose a repository from the left to manage branches, access tokens, and settings.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
