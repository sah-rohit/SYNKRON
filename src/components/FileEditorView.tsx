'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Save, Sparkles, RefreshCw, FileCode, FolderOpen,
  Plus, Trash2, Copy, Download, Upload, GitBranch, CheckCircle,
  AlertCircle, Search, ChevronRight, ChevronDown, File, X, Zap, Cpu
} from 'lucide-react';

interface FileNode {
  filePath: string;
  updatedAt: string;
  status: 'draft' | 'committed';
}

interface EditorTab {
  path: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', c: 'c', h: 'c', cpp: 'cpp', json: 'json',
    md: 'markdown', css: 'css', html: 'html', sh: 'bash', yaml: 'yaml', yml: 'yaml',
  };
  return map[ext] ?? 'text';
}

function syntaxHighlight(code: string, lang: string): string {
  // Simple token-based highlighter — no external deps
  if (!['typescript', 'javascript', 'python', 'c', 'cpp'].includes(lang)) return escapeHtml(code);

  const keywords = lang === 'python'
    ? ['def', 'class', 'import', 'from', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'with', 'as', 'pass', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'lambda', 'yield', 'async', 'await']
    : ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'throw', 'new', 'typeof', 'interface', 'type', 'enum', 'extends', 'implements', 'public', 'private', 'protected', 'static', 'readonly', 'void', 'null', 'undefined', 'true', 'false', 'from', 'of', 'in'];

  let result = escapeHtml(code);

  // Strings
  result = result.replace(/(&quot;|&#39;|`)(.*?)\1/g, '<span class="text-emerald-400">$1$2$1</span>');
  // Comments
  result = result.replace(/(\/\/[^\n]*)/g, '<span class="text-zinc-500 italic">$1</span>');
  result = result.replace(/(#[^\n]*)/g, '<span class="text-zinc-500 italic">$1</span>');
  // Numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-yellow-400">$1</span>');
  // Keywords
  const kwRe = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  result = result.replace(kwRe, '<span class="text-purple-400 font-semibold">$1</span>');
  // Function calls
  result = result.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="text-cyan-400">$1</span>');

  return result;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default function FileEditorView({ navigateBack, triggerAlert, isLoggedIn, navigateTo }: {
  navigateBack: () => void;
  triggerAlert: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
  isLoggedIn: boolean;
  navigateTo: (v: any) => void;
}) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [repoId, setRepoId] = useState('');
  const [repos, setRepos] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [isMining, setIsMining] = useState(false);
  const [minedData, setMinedData] = useState<any>(null);
  const [showMined, setShowMined] = useState(false);
  const [healedDoc, setHealedDoc] = useState('');
  const [showDoc, setShowDoc] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [showNewFile, setShowNewFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [quota, setQuota] = useState<{ used: number; limit: number; resetsAt: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const activeTabData = tabs.find(t => t.path === activeTab);

  useEffect(() => {
    if (isLoggedIn) { 
      loadRepos(); 
      loadQuota(); 
      const savedToken = localStorage.getItem('synkron_github_pat');
      if (savedToken) setGithubToken(savedToken);
    }
  }, [isLoggedIn]);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGithubToken(val);
    localStorage.setItem('synkron_github_pat', val);
  };

  useEffect(() => {
    if (repoId) loadFiles();
  }, [repoId]);

  const loadQuota = async () => {
    try {
      const res = await fetch('/api/ai-quota');
      const data = await res.json();
      if (data.success) setQuota({ used: data.used, limit: data.limit, resetsAt: data.resetsAt });
    } catch {}
  };

  const loadRepos = async () => {
    try {
      const res = await fetch('/api/repositories');
      const data = await res.json();
      if (data.success && data.repositories.length) {
        setRepos(data.repositories);
        setRepoId(data.repositories[0].id);
      }
    } catch {}
  };

  const loadFiles = async () => {
    try {
      const res = await fetch(`/api/repositories/${repoId}/tree`);
      const data = await res.json();
      if (data.success && data.tree) {
        const fileNodes = data.tree
          .filter((f: any) => f.type === 'blob')
          .map((f: any) => ({
            filePath: f.path,
            updatedAt: new Date().toISOString(),
            status: 'committed'
          }));
        setFiles(fileNodes);
      }
    } catch {}
  };

  const openFile = async (path: string) => {
    // Check if already open
    if (tabs.find(t => t.path === path)) { setActiveTab(path); return; }

    try {
      const repo = repos.find(r => r.id === repoId);
      if (!repo) return;
      const branch = repo.branch || 'main';

      const res = await fetch(`https://raw.githubusercontent.com/${repo.fullName}/${branch}/${path}`);
      if (!res.ok) throw new Error('Failed to load file from GitHub');
      const content = await res.text();
      
      setTabs(prev => [...prev, { path, content, originalContent: content, isDirty: false, language: detectLanguage(path) }]);
      setActiveTab(path);
      setHealedDoc('');
      setShowDoc(false);
    } catch (err: any) { triggerAlert('error', 'Open Failed', err.message); }
  };

  const createNewFile = async () => {
    if (!newFilePath.trim()) return;
    const path = newFilePath.trim();
    const content = getTemplate(path);
    setTabs(prev => [...prev, { path, content, originalContent: '', isDirty: true, language: detectLanguage(path) }]);
    setActiveTab(path);
    setNewFilePath('');
    setShowNewFile(false);
  };

  const getTemplate = (path: string): string => {
    const lang = detectLanguage(path);
    if (lang === 'typescript') return `// ${path}\n\nexport function example() {\n  // TODO: implement\n}\n`;
    if (lang === 'python') return `# ${path}\n\ndef example():\n    pass\n`;
    if (lang === 'c') return `/* ${path} */\n#include <stdio.h>\n\nint main() {\n    return 0;\n}\n`;
    if (lang === 'markdown') return `# ${path.split('/').pop()?.replace(/\.\w+$/, '')}\n\n`;
    return '';
  };

  const updateTabContent = (path: string, content: string) => {
    setTabs(prev => prev.map(t => t.path === path ? { ...t, content, isDirty: content !== t.originalContent } : t));
  };

  const closeTab = (path: string) => {
    const tab = tabs.find(t => t.path === path);
    if (tab?.isDirty && !confirm('Unsaved changes will be lost. Close anyway?')) return;
    setTabs(prev => prev.filter(t => t.path !== path));
    if (activeTab === path) setActiveTab(tabs.find(t => t.path !== path)?.path ?? null);
  };

  const saveFile = async () => {
    if (!activeTabData || !repoId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/repositories/${repoId}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filePath: activeTabData.path, 
          content: activeTabData.content, 
          commitMessage: commitMessage || `Update ${activeTabData.path} via SYNKRON`,
          githubToken
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Commit failed');
      
      setTabs(prev => prev.map(t => t.path === activeTabData.path ? { ...t, originalContent: t.content, isDirty: false } : t));
      triggerAlert('success', 'Committed to GitHub', data.message ? `Saved: ${data.message}` : `Directly committed ${activeTabData.path} to repository.`);
      setCommitMessage('');
      loadFiles();
    } catch (err: any) { triggerAlert('error', 'Commit Failed', err.message); }
    finally { setIsSaving(false); }
  };

  const healCurrentFile = async () => {
    if (!activeTabData) return;
    setIsHealing(true);
    setShowDoc(true);
    try {
      const res = await fetch('/api/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeTabData.content, filename: activeTabData.path, existingMarkdown: healedDoc }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Heal failed');
      setHealedDoc(data.markdown);
      loadQuota();
      triggerAlert('success', 'Healed', `Docs updated via ${data.modelUsed}.`);
    } catch (err: any) { triggerAlert('error', 'Heal Failed', err.message); }
    finally { setIsHealing(false); }
  };

  const runNativeMiner = async () => {
    if (!activeTabData) return;
    setIsMining(true);
    setShowMined(true);
    try {
      const res = await fetch('/api/parse-native', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeTabData.content, filename: activeTabData.path }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Parsing failed');
      setMinedData(data);
      triggerAlert('success', 'Native Miner', `Successfully parsed using native Python ${data.language} AST engine.`);
    } catch (err: any) { triggerAlert('error', 'Miner Failed', err.message); }
    finally { setIsMining(false); }
  };

  const copyContent = () => {
    if (!activeTabData) return;
    navigator.clipboard.writeText(activeTabData.content);
    triggerAlert('info', 'Copied', 'File content copied to clipboard.');
  };

  const downloadFile = () => {
    if (!activeTabData) return;
    const blob = new Blob([activeTabData.content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = activeTabData.path.split('/').pop() ?? 'file.txt';
    a.click();
  };

  const uploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const path = file.name;
      setTabs(prev => {
        const existing = prev.find(t => t.path === path);
        if (existing) return prev.map(t => t.path === path ? { ...t, content, isDirty: true } : t);
        return [...prev, { path, content, originalContent: '', isDirty: true, language: detectLanguage(path) }];
      });
      setActiveTab(path);
    };
    reader.readAsText(file);
  };

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Tab key support
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
      updateTabContent(activeTab!, newContent);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); }
  };

  const filteredFiles = files.filter(f => !searchQuery || f.filePath.toLowerCase().includes(searchQuery.toLowerCase()));
  const lineCount = activeTabData ? activeTabData.content.split('\n').length : 0;

  if (!isLoggedIn) {
    return (
      <div className="max-w-5xl mx-auto py-6 flex flex-col gap-6 font-mono text-xs">
        <div className="p-12 bg-zinc-950 border border-zinc-800 rounded flex flex-col items-center gap-4">
          <FileCode className="w-10 h-10 text-zinc-600" />
          <p className="text-sm font-bold text-white">Sign in to use the file editor</p>
          <button onClick={() => navigateTo('login')} className="px-4 py-2 bg-purple-600 text-white font-bold text-xs uppercase cursor-pointer">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4 font-mono text-xs h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-zinc-700">|</span>
          <h1 className="text-sm font-bold uppercase text-white">File Editor</h1>
          {repos.length > 0 && (
            <select value={repoId} onChange={e => setRepoId(e.target.value)} className="bg-zinc-900 border border-zinc-800 px-2 py-1 text-[10px] text-zinc-300 focus:outline-none">
              {repos.map(r => <option key={r.id} value={r.id}>{r.fullName}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {quota && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold ${quota.used >= quota.limit ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
              <Zap className="w-2.5 h-2.5" />
              <span>AI: {quota.used}/{quota.limit} this week</span>
            </div>
          )}
          <input 
            type="password" 
            placeholder="GitHub Token (PAT)" 
            value={githubToken} 
            onChange={handleTokenChange}
            title="Required to commit files directly to GitHub"
            className="w-32 bg-zinc-900 border border-zinc-800 px-2 py-1 text-[10px] text-zinc-300 focus:outline-none placeholder:text-zinc-600 focus:border-purple-500/50 transition-colors" 
          />
          <label className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer text-[9px] font-bold uppercase">
            <Upload className="w-3 h-3" /><span>Upload</span>
            <input type="file" className="hidden" onChange={uploadFile} accept=".ts,.tsx,.js,.jsx,.py,.c,.h,.cpp,.json,.md,.css,.html,.sh,.yaml,.yml" />
          </label>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Sidebar: File Tree */}
        <div className="w-56 shrink-0 flex flex-col gap-2 bg-zinc-950 border border-zinc-800 rounded p-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-500 uppercase">Files</span>
            <button onClick={() => setShowNewFile(!showNewFile)} className="p-0.5 text-zinc-500 hover:text-white cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
          </div>

          {showNewFile && (
            <div className="flex gap-1">
              <input autoFocus type="text" placeholder="src/new-file.ts" value={newFilePath} onChange={e => setNewFilePath(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createNewFile(); if (e.key === 'Escape') setShowNewFile(false); }}
                className="flex-1 bg-zinc-900 border border-zinc-700 px-2 py-1 text-[10px] text-white focus:outline-none" />
              <button onClick={createNewFile} className="p-1 bg-emerald-600 text-white cursor-pointer"><CheckCircle className="w-3 h-3" /></button>
            </div>
          )}

          <div className="relative">
            <Search className="w-3 h-3 text-zinc-600 absolute left-2 top-1.5" />
            <input type="text" placeholder="Search files..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 pl-6 pr-2 py-1 text-[10px] text-zinc-300 focus:outline-none placeholder:text-zinc-600" />
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
            {filteredFiles.length === 0 && repos.length === 0 && (
              <p className="text-[9px] text-zinc-600 font-sans p-1">Connect a repository first, then create files.</p>
            )}
            {filteredFiles.length === 0 && repos.length > 0 && (
              <p className="text-[9px] text-zinc-600 font-sans p-1">No files yet. Click + to create one.</p>
            )}
            {filteredFiles.map(f => (
              <button key={f.filePath} onClick={() => openFile(f.filePath)}
                className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${activeTab === f.filePath ? 'bg-purple-600/20 text-purple-300' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}>
                <File className="w-3 h-3 shrink-0" />
                <span className="text-[9px] truncate">{f.filePath.split('/').pop()}</span>
                {f.status === 'draft' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col gap-0 bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
          {/* Tab Bar */}
          {tabs.length > 0 && (
            <div className="flex items-center gap-0 border-b border-zinc-800 overflow-x-auto bg-zinc-900/50">
              {tabs.map(tab => (
                <div key={tab.path} onClick={() => setActiveTab(tab.path)}
                  className={`flex items-center gap-1.5 px-3 py-2 border-r border-zinc-800 cursor-pointer shrink-0 transition-colors ${activeTab === tab.path ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  <FileCode className="w-3 h-3" />
                  <span className="text-[10px]">{tab.path.split('/').pop()}</span>
                  {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                  <button onClick={e => { e.stopPropagation(); closeTab(tab.path); }} className="ml-1 text-zinc-600 hover:text-white">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTabData ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/30">
                <span className="text-[9px] text-zinc-500 font-mono flex-1 truncate">{activeTabData.path}</span>
                <span className="text-[8px] text-zinc-600 uppercase">{activeTabData.language}</span>
                <span className="text-[8px] text-zinc-600">{lineCount} lines</span>
                <div className="flex items-center gap-1 ml-2">
                  <input type="text" placeholder="Commit message..." value={commitMessage} onChange={e => setCommitMessage(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[9px] text-zinc-300 focus:outline-none w-40 placeholder:text-zinc-600" />
                  <button onClick={saveFile} disabled={isSaving || !activeTabData.isDirty} title="Save (Ctrl+S)"
                    className="p-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40 disabled:opacity-40 cursor-pointer transition-colors">
                    {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  </button>
                  <button onClick={async () => {
                    if (!confirm(`Are you sure you want to permanently delete ${activeTabData.path} from GitHub?`)) return;
                    setIsSaving(true);
                    try {
                      const res = await fetch(`/api/repositories/${repoId}/commit?filePath=${encodeURIComponent(activeTabData.path)}&commitMessage=Delete+${encodeURIComponent(activeTabData.path)}`, {
                        method: 'DELETE',
                        headers: githubToken ? { 'Authorization': `Bearer ${githubToken}` } : {}
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Failed to delete');
                      closeTab(activeTabData.path);
                      loadFiles();
                      triggerAlert('info', 'Deleted', `Deleted ${activeTabData.path} from GitHub`);
                    } catch(err: any) { triggerAlert('error', 'Delete Failed', err.message); }
                    finally { setIsSaving(false); }
                  }} title="Delete File" className="p-1.5 bg-rose-900/20 border border-rose-900/30 text-rose-400 hover:bg-rose-900/40 transition-colors cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                  <button onClick={healCurrentFile} disabled={isHealing} title="AI Heal Docs"
                    className="p-1.5 bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/40 disabled:opacity-40 cursor-pointer transition-colors">
                    {isHealing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  </button>
                  <button onClick={runNativeMiner} disabled={isMining} title="Run Python AST Code Miner"
                    className="p-1.5 bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-600/40 disabled:opacity-40 cursor-pointer transition-colors">
                    {isMining ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Cpu className="w-3 h-3" />}
                  </button>
                  <button onClick={copyContent} title="Copy" className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white cursor-pointer transition-colors"><Copy className="w-3 h-3" /></button>
                  <button onClick={downloadFile} title="Download" className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white cursor-pointer transition-colors"><Download className="w-3 h-3" /></button>
                </div>
              </div>

              {/* Editor + Doc Panel */}
              <div className="flex flex-1 overflow-hidden">
                {/* Code Editor */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Line Numbers */}
                  <div ref={lineNumbersRef} className="w-10 bg-zinc-900/50 border-r border-zinc-800 overflow-hidden select-none shrink-0">
                    <div className="pt-3 pb-3">
                      {Array.from({ length: lineCount }, (_, i) => (
                        <div key={i} className="text-[10px] text-zinc-600 text-right pr-2 leading-5">{i + 1}</div>
                      ))}
                    </div>
                  </div>
                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={activeTabData.content}
                    onChange={e => updateTabContent(activeTabData.path, e.target.value)}
                    onKeyDown={handleKeyDown}
                    onScroll={handleScroll}
                    spellCheck={false}
                    className="flex-1 bg-transparent text-zinc-300 font-mono text-[11px] leading-5 p-3 focus:outline-none resize-none overflow-auto"
                    style={{ tabSize: 2 }}
                  />
                </div>

                {/* Healed Doc Panel */}
                {showDoc && (
                  <div className="w-80 border-l border-zinc-800 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/30">
                      <span className="text-[9px] font-bold text-cyan-400 uppercase">Healed Docs</span>
                      <button onClick={() => setShowDoc(false)} className="text-zinc-600 hover:text-white"><X className="w-3 h-3" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 text-[10px] text-zinc-300 font-sans leading-relaxed">
                      {isHealing ? (
                        <div className="flex items-center gap-2 text-purple-400"><RefreshCw className="w-3 h-3 animate-spin" /><span>Generating docs...</span></div>
                      ) : healedDoc ? (
                        healedDoc.split('\n').map((line, i) => {
                          if (line.startsWith('# ')) return <h1 key={i} className="text-sm font-bold text-white mt-2 mb-1">{line.slice(2)}</h1>;
                          if (line.startsWith('## ')) return <h2 key={i} className="text-xs font-bold text-zinc-200 mt-2 mb-0.5">{line.slice(3)}</h2>;
                          if (line.startsWith('- ')) return <li key={i} className="ml-3 text-zinc-400 list-disc">{line.slice(2)}</li>;
                          if (line.startsWith('```')) return <div key={i} className="text-[8px] text-zinc-600">{line}</div>;
                          return <p key={i} className="text-zinc-400">{line}</p>;
                        })
                      ) : (
                        <p className="text-zinc-600">Click the ✦ button to generate documentation for this file.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Native Python AST Miner Panel */}
                {showMined && (
                  <div className="w-80 border-l border-zinc-800 flex flex-col overflow-hidden bg-zinc-950">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/30">
                      <span className="text-[9px] font-bold text-cyan-400 uppercase">Native Python AST Miner</span>
                      <button onClick={() => setShowMined(false)} className="text-zinc-600 hover:text-white"><X className="w-3 h-3" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 text-[10px] text-zinc-300 font-mono leading-relaxed flex flex-col gap-3">
                      {isMining ? (
                        <div className="flex items-center gap-2 text-cyan-400"><RefreshCw className="w-3 h-3 animate-spin" /><span>Mining source AST...</span></div>
                      ) : minedData ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                            <span className="text-zinc-500 font-bold uppercase text-[8px]">Language Engine:</span>
                            <span className="text-emerald-400 uppercase text-[9px] font-bold">{minedData.language}</span>
                          </div>
                          
                          {minedData.functions?.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <span className="text-[8px] font-bold text-zinc-500 uppercase">[EXTRACTED_FUNCTIONS]</span>
                              {minedData.functions.map((fn: any, idx: number) => (
                                <div key={idx} className="p-2 bg-zinc-900 border border-zinc-800/80 rounded flex flex-col gap-1">
                                  <span className="text-white font-bold">{fn.name}()</span>
                                  {fn.returnType && <span className="text-[8px] text-zinc-500">Returns: <span className="text-cyan-400">{fn.returnType}</span></span>}
                                  {fn.params?.length > 0 && (
                                    <div className="flex flex-col gap-0.5 mt-1 border-t border-zinc-800 pt-1">
                                      <span className="text-[7px] text-zinc-600 uppercase font-bold">Params:</span>
                                      {fn.params.map((p: any, pIdx: number) => (
                                        <span key={pIdx} className="text-[8px] text-zinc-400">{p.name}: <span className="text-purple-400">{p.type}</span></span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {minedData.classes?.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <span className="text-[8px] font-bold text-zinc-500 uppercase">[EXTRACTED_CLASSES_STRUCTS]</span>
                              {minedData.classes.map((cls: any, idx: number) => (
                                <div key={idx} className="p-2 bg-zinc-900 border border-zinc-800/80 rounded flex flex-col gap-1">
                                  <span className="text-white font-bold">{cls.name}</span>
                                  {cls.methodsCount !== undefined && <span className="text-[8px] text-zinc-500">Methods: <span className="text-purple-400">{cls.methodsCount}</span></span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {!minedData.functions?.length && !minedData.classes?.length && (
                            <p className="text-zinc-600">No functions or classes detected by the static compiler analyzer.</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-zinc-600">Click the Cpu icon in the toolbar to run high-speed native AST parsing.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <FileCode className="w-12 h-12 text-zinc-700" />
              <p className="text-sm font-bold text-white">No file open</p>
              <p className="text-[10px] text-zinc-500 font-sans">Select a file from the sidebar or create a new one with the + button.</p>
              <div className="flex gap-2 text-[9px] text-zinc-600 font-sans">
                <span>Ctrl+S to save</span>
                <span>·</span>
                <span>Tab for indent</span>
                <span>·</span>
                <span>✦ for AI docs</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
