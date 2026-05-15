'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import UIRaterView from '@/components/UIRaterView';
import SecurityView from '@/components/SecurityView';
import GitHubDeepView from '@/components/GitHubDeepView';
import RepositoriesView from '@/components/RepositoriesView';
import FileEditorView from '@/components/FileEditorView';
import TrackingRecordView from '@/components/TrackingRecordView';
import GuideView from '@/components/GuideView';
import EngineView from '@/components/EngineView';
import {
  GitBranch,
  Activity,
  Code,
  Sparkles,
  Terminal,
  Lock,
  RefreshCw,
  FileText,
  CheckCircle,
  Search,
  Layers,
  Shield,
  ChevronRight,
  Server,
  ExternalLink,
  Cpu,
  User,
  Heart,
  Star,
  FileCode,
  Zap,
  Check,
  AlertCircle,
  X,
  ArrowRight,
  Info,
  ArrowLeft,
  Play,
  Settings,
  Database,
  Link,
  DollarSign,
  Camera,
  Trash2,
  Download,
  AlertTriangle,
  Sun,
  Moon,
  Mail,
  Users,
  Clock,
  FileDown,
  Bell,
  BarChart3,
  Bookmark,
  GitPullRequest,
  Copy,
  Eye,
  EyeOff,
  Send
} from 'lucide-react';

// Custom SVG Logo Component representing code brackets + continuous musical synkron wave
// Custom SVG Logo Component representing minimal synchronized code nodes (SYNKRON)
const SynkronLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="24" fill="#09090b" stroke="#27272a" strokeWidth="2" />
    <path d="M35 35 L25 50 L35 65" stroke="#a855f7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M65 35 L75 50 L65 65" stroke="#a855f7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M40 50 H 60" stroke="#e4e4e7" strokeWidth="6" strokeLinecap="round" />
    <circle cx="40" cy="50" r="6" fill="#a855f7" />
    <circle cx="60" cy="50" r="6" fill="#a855f7" />
  </svg>
);

// Custom inline SVG Github component
const Github = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

interface LogEntry {
  timestamp: string;
  type: 'info' | 'queue' | 'ai' | 'success' | 'webhook' | 'convex';
  message: string;
}

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  category: 'auth' | 'docs' | 'webhook' | 'system';
}

interface CustomAlert {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

interface SessionLog {
  id: string;
  device: string;
  location: string;
  time: string;
  isCurrent: boolean;
}

type ViewType = 'landing' | 'dashboard' | 'about' | 'privacy' | 'terms' | 'pricing' | 'login' | 'signup' | 'ui-rater' | 'security' | 'repositories' | 'editor' | 'profile' | 'teams' | 'changelog' | 'guide' | 'engine' | 'github';

interface HealRecord {
  id: string;
  triggerType: string;
  commitMessage?: string;
  modelUsed?: string;
  status: string;
  durationMs?: number;
  createdAt: string;
}

function HealHistoryCard({ triggerAlert }: { triggerAlert: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void }) {
  const [heals, setHeals] = React.useState<HealRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [repoId, setRepoId] = React.useState('');

  const load = async () => {
    setLoading(true);
    try {
      // Try to get first repo id
      let id = repoId;
      if (!id) {
        const rRes = await fetch('/api/repositories');
        const rData = await rRes.json();
        if (rData.success && rData.repositories?.length) {
          id = rData.repositories[0].id;
          setRepoId(id);
        }
      }
      const url = id ? `/api/repositories/${id}/heals` : null;
      if (!url) {
        triggerAlert('info', 'Heal History', 'Connect a repository to view heal history.');
        return;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setHeals(data.heals);
      else triggerAlert('info', 'Heal History', data.note ?? data.error ?? 'No heal history yet.');
    } catch (err: any) {
      triggerAlert('error', 'Load Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white uppercase">[07_HEAL_HISTORY]</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-[9px] font-bold uppercase cursor-pointer"
        >
          {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          <span>{loading ? 'Loading...' : 'Load History'}</span>
        </button>
      </div>

      {heals.length === 0 ? (
        <p className="text-[10px] text-zinc-500 font-sans">Click "Load History" to fetch heal events for your connected repository.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {heals.map((h) => (
            <div key={h.id} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${h.triggerType === 'webhook' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                    {h.triggerType}
                  </span>
                  <span className="text-[10px] font-bold text-white font-mono truncate max-w-xs">{h.commitMessage ?? 'No message'}</span>
                </div>
                <span className="text-[9px] text-zinc-500 font-sans">{h.modelUsed ?? 'unknown model'} · {h.durationMs ? `${h.durationMs}ms` : '—'} · {new Date(h.createdAt).toLocaleString()}</span>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${h.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                {h.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<ViewType>('landing');
  const [history, setHistory] = useState<ViewType[]>(['landing']);

  // Custom Loading states
  const [isIntroLoading, setIsIntroLoading] = useState(true);
  const [introProgress, setIntroProgress] = useState(0);
  const [introStatus, setIntroStatus] = useState('Booting developer console...');

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Authenticated Profile states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);

  // New feature states
  const [docHealthScore, setDocHealthScore] = useState<number | null>(null);
  const [isTestPinging, setIsTestPinging] = useState(false);
  const [testPingResult, setTestPingResult] = useState<any>(null);
  const [diffViewerOpen, setDiffViewerOpen] = useState(false);
  const [previousDoc, setPreviousDoc] = useState('');
  const [changelogContent, setChangelogContent] = useState('');
  const [isLoadingChangelog, setIsLoadingChangelog] = useState(false);
  const [prDescription, setPrDescription] = useState('');
  const [isGeneratingPR, setIsGeneratingPR] = useState(false);
  const [cronSchedule, setCronSchedule] = useState('every6h');
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [emailNotifyEnabled, setEmailNotifyEnabled] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [staleDocs, setStaleDocs] = useState<Array<{ filePath: string; daysSinceHeal: number; severity: string }>>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Profile Picture File upload base64 state
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password reset fields
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');

  // Active login sessions list state (populated from API after login)
  const [sessions, setSessions] = useState<SessionLog[]>([]);

  // Delete Account Countdown States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteButtonUnlocked, setIsDeleteButtonUnlocked] = useState(false);
  const [deleteTimer, setDeleteTimer] = useState(5);
  const deleteIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Repository connection states
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [isSyncing, setIsSyncing] = useState(false);
  const [customCommitMessage, setCustomCommitMessage] = useState('Refactor token storage lifespan');

  // Interactive API Route Tester states
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [isTestingEndpoint, setIsTestingEndpoint] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Custom Notifications state
  const [alerts, setAlerts] = useState<CustomAlert[]>([]);

  // Discovered API schemas endpoints (all live routes)
  const apiEndpoints: ApiEndpoint[] = [
    { method: 'GET', path: '/api/v1/health', description: 'System health: DB, Groq, OpenAI, webhook status.', category: 'system' },
    { method: 'POST', path: '/api/webhook', description: 'GitHub push webhook — HMAC-SHA256 validated.', category: 'webhook' },
    { method: 'POST', path: '/api/heal', description: 'AI self-healing: AST diff + Groq/OpenAI reconcile.', category: 'auth' },
    { method: 'POST', path: '/api/v1/search', description: 'Semantic search across healed documentation.', category: 'docs' },
    { method: 'GET', path: '/api/v1/docs', description: 'List all healed doc files for a repository.', category: 'docs' },
    { method: 'POST', path: '/api/auth/register', description: 'Register a new developer account.', category: 'auth' },
    { method: 'POST', path: '/api/auth/login', description: 'Authenticate and receive a session cookie.', category: 'auth' },
    { method: 'POST', path: '/api/auth/logout', description: 'Revoke current session token.', category: 'auth' },
  ];

  // Live console logs — seeded with real timestamps, populated by real API calls
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Code definitions
  const files = {
    'session.ts': {
      code: `// src/auth/session.ts
export function createSession(userId: string) {
  // EXPIRE_TIME: 1 Hour
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);
  return { 
    userId, 
    expiresAt, 
    status: "ACTIVE",
    version: "v1.2.0"
  };
}`,
      doc: `# Session Management API

## \`createSession\`
Generates a new secure user session token.

**Expiration Policy**: 1 Hour (Standard duration)
**Returned Session Structure**:
- \`userId\`: Unique identifier of the authenticated user
- \`expiresAt\`: Timestamp of session expiration (1-hour validity)
- \`status\`: Current status of the session (\`"ACTIVE"\`)
- \`version\`: Internal protocol version (\`"v1.2.0"\`)`
    },
    'session_updated.ts': {
      code: `// src/auth/session.ts
export function createSession(userId: string) {
  // EXPIRE_TIME: 24 Hours (Extended validity)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { 
    userId, 
    expiresAt, 
    status: "ACTIVE",
    version: "v1.2.0"
  };
}`,
      doc: `# Session Management API

## \`createSession\`
Generates an extended secure user session token.

**Expiration Policy**: 24 Hours (Extended validity for persistent sessions)
**Returned Session Structure**:
- \`userId\`: Unique identifier of the authenticated user
- \`expiresAt\`: Timestamp of session expiration (24-hour validity)
- \`status\`: Current status of the session (\`"ACTIVE"\`)
- \`version\`: Internal protocol version (\`"v1.2.0"\`)`
    },
    'db.ts': {
      code: `// src/config/database.ts
export async function connectDB() {
  const retryLimit = 5;
  console.log("Connecting to PostgreSQL...");
  return { connected: true, poolSize: 20 };
}`,
      doc: `# Database Config API

## \`connectDB\`
Establishes connection pool with the PostgreSQL server.

- **Pool Size**: 20 connections maximum
- **Retries**: Up to 5 times before failing`
    }
  };

  const [activeFile, setActiveFile] = useState<'session.ts' | 'db.ts'>('session.ts');
  const [editorCode, setEditorCode] = useState(files['session.ts'].code);
  const [docContent, setDocContent] = useState(files['session.ts'].doc);
  const [isHealing, setIsHealing] = useState(false);
  const [healingPulse, setHealingPulse] = useState(false);

  // API Endpoint search state
  const [apiSearch, setApiSearch] = useState('');

  // Helper to add custom alerts (Math.random() + timestamp guarantees unique keys)
  const triggerAlert = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    const id = `${Date.now().toString()}-${Math.floor(Math.random() * 1000000)}`;
    setAlerts(prev => [...prev, { id, type, title, message }]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000);
  };

  // State-driven Wrapper Navigations (preserves back stack)
  const navigateTo = (newView: ViewType) => {
    if (newView === view) return;
    setHistory(prev => [...prev, newView]);
    setView(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateBack = () => {
    if (history.length > 1) {
      const nextHistory = [...history];
      nextHistory.pop(); // Remove current view
      const previousView = nextHistory[nextHistory.length - 1];
      setHistory(nextHistory);
      setView(previousView);
      triggerAlert('info', 'Console Back', `Returned to ${previousView.toUpperCase()}`);
    }
  };

  // Boot sequence: run real health check, then animate out
  useEffect(() => {
    const ts = () => new Date().toTimeString().split(' ')[0];
    let progress = 0;

    const tick = setInterval(() => {
      progress = Math.min(progress + Math.floor(Math.random() * 18) + 6, 100);
      setIntroProgress(progress);

      if (progress < 30) setIntroStatus('Connecting to API routes...');
      else if (progress < 60) setIntroStatus('Verifying AI provider credentials...');
      else if (progress < 85) setIntroStatus('Listening on /api/webhook...');
      else setIntroStatus('System ready.');

      if (progress >= 100) {
        clearInterval(tick);

        // Run real health check
        fetch('/api/v1/health')
          .then((r) => r.json())
          .then((data) => {
            const newLogs: LogEntry[] = [
              { timestamp: ts(), type: 'info', message: 'Synkron console initialised.' },
              { timestamp: ts(), type: 'info', message: 'Listening on /api/webhook' },
            ];
            if (data.services?.database?.status === 'ok') {
              newLogs.push({ timestamp: ts(), type: 'success', message: `Database: connected (${data.services.database.latencyMs ?? '?'}ms)` });
            } else {
              newLogs.push({ timestamp: ts(), type: 'info', message: `Database: ${data.services?.database?.message ?? 'not configured — running in demo mode'}` });
            }
            if (data.services?.groq?.status === 'ok') {
              newLogs.push({ timestamp: ts(), type: 'success', message: 'Groq AI: API key verified.' });
            } else {
              newLogs.push({ timestamp: ts(), type: 'info', message: `Groq AI: ${data.services?.groq?.message ?? 'not configured'}` });
            }
            newLogs.push({ timestamp: ts(), type: 'success', message: `System status: ${data.status}` });
            setLogs(newLogs);
          })
          .catch(() => {
            setLogs([
              { timestamp: ts(), type: 'info', message: 'Synkron console initialised.' },
              { timestamp: ts(), type: 'info', message: 'Health check unavailable — server may be starting.' },
            ]);
          });

        setTimeout(() => {
          gsap.to('.intro-screen', {
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
            onComplete: () => {
              setIsIntroLoading(false);
              triggerAlert('success', 'Console Online', 'API routes active. Configure .env.local to enable all features.');
            }
          });
        }, 200);
      }
    }, 80);

    return () => clearInterval(tick);
  }, []);

  // Theme toggle effect
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.classList.add('theme-light');
    } else {
      html.classList.remove('theme-light');
    }
  }, [theme]);

  // Load saved theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('synkron-theme');
    if (saved === 'light') setTheme('light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('synkron-theme', newTheme);
    triggerAlert('info', 'Theme Changed', `Switched to ${newTheme} mode.`);
  };

  // GitHub OAuth callback handler — picks up params from redirect URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_success') === 'true') {
      // Clean URL first — session cookie is already set by the server
      window.history.replaceState({}, '', '/');
      // Fetch profile securely from /api/auth/me
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(data => {
          if (data.success && data.user) {
            setIsLoggedIn(true);
            setUserId(data.user.id);
            setUsername(data.user.username);
            setFullName(data.user.fullName);
            setUserEmail(data.user.email);
            if (data.user.avatarUrl) setProfilePicUrl(data.user.avatarUrl);
            setSessions([{ id: 'current', device: 'GitHub OAuth', location: 'GitHub', time: 'Active now', isCurrent: true }]);
            navigateTo('dashboard');
            triggerAlert('success', 'GitHub Connected', `Authenticated as @${data.user.username} via GitHub OAuth.`);
          }
        })
        .catch(() => triggerAlert('error', 'Auth Error', 'Failed to load profile after GitHub login.'));
    }

    const authError = params.get('auth_error');
    if (authError) {
      triggerAlert('error', 'GitHub Auth Failed', decodeURIComponent(authError));
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Fetch doc health score periodically  
  const fetchHealthScore = async () => {
    try {
      const res = await fetch('/api/health-score');
      const data = await res.json();
      if (data.success) setDocHealthScore(data.overallScore);
    } catch { /* silent */ }
  };

  // Fetch stale doc alerts
  const fetchStaleDocs = async () => {
    try {
      const res = await fetch('/api/stale-docs?days=3');
      const data = await res.json();
      if (data.success) setStaleDocs(data.alerts);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchHealthScore();
    fetchStaleDocs();
  }, []);

  // New feature handlers
  const handleTestPing = async () => {
    if (isTestPinging) return;
    setIsTestPinging(true);
    setTestPingResult(null);
    const ts = () => new Date().toTimeString().split(' ')[0];
    triggerAlert('info', 'Test Ping', 'Sending test push payload to /api/webhook...');

    try {
      const res = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: repoUrl.replace('github.com/', '') || 'test-user/test-repo',
          branch: branch || 'main',
          commitMessage: customCommitMessage || 'test: automated ping',
          filename: activeFile,
        }),
      });
      const data = await res.json();
      setTestPingResult(data);
      setLogs(prev => [...prev, {
        timestamp: ts(), type: 'webhook',
        message: `Test ping round-trip: ${data.roundTripMs}ms — ${data.success ? 'OK' : 'FAILED'}`,
      }]);
      triggerAlert(data.success ? 'success' : 'error', 'Test Ping Result', `Round-trip: ${data.roundTripMs}ms`);
    } catch (err: any) {
      triggerAlert('error', 'Ping Failed', err.message);
    } finally {
      setIsTestPinging(false);
    }
  };

  const handleExportDocs = async (format: 'html' | 'markdown' | 'json') => {
    setIsExporting(true);
    try {
      const currentDocs = [{ filePath: activeFile, markdown: docContent, code: editorCode }];
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, docs: currentDocs }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'markdown' ? 'zip' : format === 'html' ? 'html' : 'json';
      a.download = `synkron-docs.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      triggerAlert('success', 'Export Complete', `Documentation exported as ${format.toUpperCase()}.`);
    } catch (err: any) {
      triggerAlert('error', 'Export Failed', err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRunCronHeal = async () => {
    setIsRunningCron(true);
    try {
      const res = await fetch('/api/cron/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxAgeHours: cronSchedule === 'every6h' ? 6 : cronSchedule === 'every12h' ? 12 : 24, limit: 10 }),
      });
      const data = await res.json();
      triggerAlert(data.success ? 'success' : 'warning', 'Scheduled Heal', data.message || `Healed ${data.healed || 0} file(s).`);
    } catch (err: any) {
      triggerAlert('error', 'Cron Failed', err.message);
    } finally {
      setIsRunningCron(false);
    }
  };

  const handleLoadChangelog = async () => {
    setIsLoadingChangelog(true);
    try {
      const res = await fetch('/api/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        setChangelogContent(data.changelog);
        triggerAlert('success', 'Changelog', `Generated changelog with ${data.entryCount} entries.`);
      }
    } catch (err: any) {
      triggerAlert('error', 'Changelog Failed', err.message);
    } finally {
      setIsLoadingChangelog(false);
    }
  };

  const handleGeneratePR = async () => {
    setIsGeneratingPR(true);
    try {
      const res = await fetch('/api/webhook/pr-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitMessage: customCommitMessage,
          modifiedFiles: [activeFile],
          branch,
          repoName: repoUrl.replace('github.com/', ''),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPrDescription(data.description);
        triggerAlert('success', 'PR Description', 'Pull request description generated.');
      }
    } catch (err: any) {
      triggerAlert('error', 'PR Gen Failed', err.message);
    } finally {
      setIsGeneratingPR(false);
    }
  };

  const handleSendNotification = async (type: string) => {
    if (!notifyEmail) {
      triggerAlert('warning', 'No Email', 'Enter an email address for notifications.');
      return;
    }
    try {
      await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: notifyEmail,
          subject: `Synkron ${type === 'heal_complete' ? 'Heal Complete' : 'Security Alert'}`,
          type,
          data: { filename: activeFile, modelUsed: 'Groq llama-3.3-70b', durationMs: 1200, triggerType: 'manual' },
        }),
      });
      triggerAlert('success', 'Email Sent', `Notification sent to ${notifyEmail}.`);
    } catch (err: any) {
      triggerAlert('error', 'Email Failed', err.message);
    }
  };

  // Sync editor code on tab click
  useEffect(() => {
    setEditorCode(files[activeFile].code);
    setDocContent(files[activeFile].doc);
  }, [activeFile]);

  // Load real sessions and repositories when user logs in
  useEffect(() => {
    if (!isLoggedIn) return;
    const ts = () => new Date().toTimeString().split(' ')[0];

    // Fetch active sessions
    fetch('/api/auth/sessions')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.sessions?.length) {
          setSessions(data.sessions.map((s: any) => ({
            id: s.id,
            device: s.deviceInfo ?? 'Unknown device',
            location: s.location ?? s.ipAddress ?? 'Unknown location',
            time: s.isCurrent ? 'Active now' : new Date(s.createdAt).toLocaleString(),
            isCurrent: s.isCurrent,
          })));
        }
      })
      .catch(() => { });

    // Fetch connected repositories
    fetch('/api/repositories')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.repositories?.length) {
          const first = data.repositories[0];
          setRepoUrl(`github.com/${first.fullName}`);
          setBranch(first.branch);
          setLogs(prev => [...prev, { timestamp: ts(), type: 'success', message: `Loaded ${data.repositories.length} connected repo(s).` }]);
        }
      })
      .catch(() => { });
  }, [isLoggedIn]);

  // Image Upload base64 parser
  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
        triggerAlert('success', 'Image Uploaded', 'Avatar picture parsed and applied.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteProfilePic = () => {
    setProfilePic(null);
    triggerAlert('info', 'Avatar Deleted', 'Profile picture reset to default monogram.');
  };

  // Real password reset — calls PUT /api/auth/password
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassInput !== confirmPassInput) {
      triggerAlert('error', 'Mismatch', 'New passwords do not match.');
      return;
    }
    if (newPassInput.length < 8) {
      triggerAlert('warning', 'Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPassInput, newPassword: newPassInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Password update failed');
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
      triggerAlert('success', 'Password Updated', data.note ?? 'Your password has been changed.');
    } catch (err: any) {
      triggerAlert('error', 'Password Error', err.message);
    }
  };

  // Real GDPR export — fetches actual repos from API
  const handleDownloadUserData = async () => {
    let repositories: unknown[] = [];
    try {
      const res = await fetch('/api/repositories');
      const data = await res.json();
      if (data.success) repositories = data.repositories;
    } catch { /* best-effort */ }

    const userData = {
      account: { username, fullName, userEmail, userId },
      syncedRepositories: repositories,
      recentLogs: logs,
      activeSessions: sessions,
      exportTimestamp: new Date().toISOString(),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(userData, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `synkron-gdpr-export-${username || 'user'}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    triggerAlert('success', 'Export Complete', 'GDPR/CCPA data package downloaded.');
  };

  // Real session revocation — calls DELETE /api/auth/sessions/:id
  const handleRevokeSession = async (sid: string) => {
    try {
      const res = await fetch(`/api/auth/sessions/${sid}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to revoke session');
      setSessions(prev => prev.filter(s => s.id !== sid));
      triggerAlert('info', 'Session Revoked', 'That device has been signed out.');
    } catch (err: any) {
      triggerAlert('error', 'Revoke Failed', err.message);
    }
  };

  // Real logout all other devices — calls DELETE /api/auth/sessions
  const handleLogoutAllDevices = async () => {
    try {
      const res = await fetch('/api/auth/sessions', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');
      setSessions(prev => prev.filter(s => s.isCurrent));
      triggerAlert('success', 'All Other Sessions Revoked', 'Every other device has been signed out.');
    } catch (err: any) {
      triggerAlert('error', 'Error', err.message);
    }
  };

  // Hard-to-accidentally-click deletion countdown popup modal
  const handleStartDeleteAccount = () => {
    setIsDeleteModalOpen(true);
    setDeleteTimer(5);
    setIsDeleteButtonUnlocked(false);

    if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current);

    deleteIntervalRef.current = setInterval(() => {
      setDeleteTimer(prev => {
        if (prev <= 1) {
          clearInterval(deleteIntervalRef.current!);
          setIsDeleteButtonUnlocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Real account deletion — calls DELETE /api/auth/account
  const handleConfirmDeletePermanently = async () => {
    if (!isDeleteButtonUnlocked) return;
    // Prompt for password to confirm
    const confirmPassword = window.prompt('Enter your password to permanently delete your account:');
    if (!confirmPassword) {
      triggerAlert('info', 'Cancelled', 'Account deletion cancelled.');
      return;
    }
    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Deletion failed');
      setIsDeleteModalOpen(false);
      setIsLoggedIn(false);
      setUserId(null);
      setUsername('');
      setFullName('');
      setUserEmail('');
      setSessions([]);
      navigateTo('landing');
      triggerAlert('error', 'Account Deleted', data.note ?? 'Your account and all data have been permanently removed.');
    } catch (err: any) {
      triggerAlert('error', 'Deletion Failed', err.message);
    }
  };

  const handleCancelDeleteAccount = () => {
    if (deleteIntervalRef.current) {
      clearInterval(deleteIntervalRef.current);
    }
    setIsDeleteModalOpen(false);
    setIsDeleteButtonUnlocked(false);
    triggerAlert('info', 'Deactivation Halted', 'Account deletion canceled.');
  };

  // Real logout — calls /api/auth/logout to revoke the session cookie
  const handleLogoutCurrentDevice = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    setIsLoggedIn(false);
    setUserId(null);
    setUsername('');
    setFullName('');
    setUserEmail('');
    setSessions([]);
    navigateTo('landing');
    triggerAlert('info', 'Logged Out', 'Session revoked. See you next time.');
  };

  // Clean interval on unmount
  useEffect(() => {
    return () => {
      if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current);
    };
  }, []);

  // Dispatch a real push payload to /api/webhook, then immediately call /api/heal
  const handleSimulatePush = async () => {
    if (isSyncing || isHealing) return;
    setIsSyncing(true);
    const ts = () => new Date().toTimeString().split(' ')[0];
    triggerAlert('info', 'Webhook Dispatch', `Sending push payload to /api/webhook...`);

    try {
      const webhookRes = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: `refs/heads/${branch || 'main'}`,
          repository: { full_name: (repoUrl || 'owner/repo').replace('github.com/', '') },
          commits: [{
            id: crypto.randomUUID(),
            message: customCommitMessage || 'Code update',
            author: { username: username || 'developer' },
            modified: [activeFile],
          }],
        }),
      });

      const webhookData = await webhookRes.json();
      if (!webhookData.success) throw new Error(webhookData.error);

      setLogs(prev => [
        ...prev,
        { timestamp: ts(), type: 'webhook', message: `POST /api/webhook → 200 OK [commit: "${webhookData.details.commitMessage}"]` },
        { timestamp: ts(), type: 'info', message: `Modified files: ${webhookData.details.modifiedFiles.join(', ') || activeFile}` },
      ]);

      // Immediately trigger heal with the current editor code
      setLogs(prev => [...prev, { timestamp: ts(), type: 'ai', message: `POST /api/heal → Requesting AI reconciliation for ${activeFile}...` }]);

      const healRes = await fetch('/api/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editorCode, filename: activeFile, existingMarkdown: docContent }),
      });

      const healData = await healRes.json();
      if (healData.success) {
        setDocContent(healData.markdown);
        setLogs(prev => [
          ...prev,
          { timestamp: ts(), type: 'success', message: `Healed ${activeFile} via ${healData.modelUsed} (${healData.durationMs}ms)` },
          ...(healData.changeSummary?.length ? [{ timestamp: ts(), type: 'info' as const, message: `Changes: ${healData.changeSummary.join('; ')}` }] : []),
        ]);
        triggerAlert('success', 'Docs Synced', `Auto-healed ${activeFile} via ${healData.modelUsed}.`);
      } else {
        throw new Error(healData.error);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, { timestamp: ts(), type: 'info', message: `Error: ${err.message}` }]);
      triggerAlert('error', 'Pipeline Error', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Real AI healing — calls /api/heal, no silent fallback to hardcoded docs
  const handleManualHeal = async () => {
    if (isHealing) return;
    setIsHealing(true);
    setPreviousDoc(docContent); // Save for diff viewer
    const ts = () => new Date().toTimeString().split(' ')[0];
    triggerAlert('info', 'AI Reconciling', 'Sending code to /api/heal...');
    setLogs(prev => [...prev, { timestamp: ts(), type: 'ai', message: `POST /api/heal: Requesting reconciliation for ${activeFile}...` }]);

    try {
      const res = await fetch('/api/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editorCode, filename: activeFile, existingMarkdown: docContent }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `Server error ${res.status}`);

      setDocContent(data.markdown);
      setLogs(prev => [
        ...prev,
        { timestamp: ts(), type: 'success', message: `Healed via ${data.modelUsed} (${data.durationMs}ms)` },
        ...(data.changeSummary?.length ? [{ timestamp: ts(), type: 'info' as const, message: `Changes: ${data.changeSummary.join('; ')}` }] : []),
      ]);
      triggerAlert('success', 'Self-Healed', `Documentation updated via ${data.modelUsed}.`);
    } catch (err: any) {
      setLogs(prev => [...prev, { timestamp: ts(), type: 'info', message: `Heal failed: ${err.message}` }]);
      triggerAlert('error', 'Heal Failed', err.message);
    } finally {
      setIsHealing(false);
      setHealingPulse(true);
      setTimeout(() => setHealingPulse(false), 2000);
    }
  };

  // Semantic search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ docFileId: string; filePath: string; similarity: number; excerpt: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch('/api/v1/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 5 }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results);
        if (data.results.length === 0) {
          triggerAlert('info', 'No Results', 'No matching documentation found for that query.');
        }
      } else {
        triggerAlert('error', 'Search Error', data.error || 'Search failed.');
      }
    } catch (err: any) {
      triggerAlert('error', 'Search Error', err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle API Endpoint testing — calls real endpoints
  const handleTestEndpoint = async (ep: ApiEndpoint) => {
    setSelectedEndpoint(ep);
    setIsTestingEndpoint(true);
    setTestResponse(null);

    try {
      let res: Response;
      if (ep.method === 'GET') {
        res = await fetch(ep.path);
      } else {
        // POST endpoints — send a minimal valid payload
        const bodies: Record<string, object> = {
          '/api/webhook': {
            ref: `refs/heads/${branch}`,
            repository: { full_name: repoUrl.replace('github.com/', '') },
            commits: [{ id: 'test-sha', message: 'API Playground test', author: { username }, modified: [activeFile] }],
          },
          '/api/heal': { code: editorCode, filename: activeFile, existingMarkdown: docContent },
          '/api/v1/search': { query: 'authentication session', limit: 3 },
        };
        res = await fetch(ep.path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodies[ep.path] || {}),
        });
      }

      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));
      triggerAlert(res.ok ? 'success' : 'warning', `Response ${res.status}`, `${ep.method} ${ep.path} completed.`);
    } catch (err: any) {
      setTestResponse(JSON.stringify({ error: err.message }, null, 2));
      triggerAlert('error', 'Request Failed', err.message);
    } finally {
      setIsTestingEndpoint(false);
    }
  };

  // Real login — calls /api/auth/login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      triggerAlert('warning', 'Terms Required', 'You must agree to the Terms & Privacy Policy.');
      return;
    }
    if (!userEmail.trim()) {
      triggerAlert('error', 'Email Required', 'Enter your email address.');
      return;
    }
    if (!password) {
      triggerAlert('error', 'Password Required', 'Enter your password.');
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Login failed');
      setIsLoggedIn(true);
      setUserId(data.user.id);
      setUsername(data.user.username);
      setFullName(data.user.fullName ?? '');
      setUserEmail(data.user.email);
      setSessions([{ id: 'current', device: navigator.userAgent.slice(0, 60), location: 'Current device', time: 'Active now', isCurrent: true }]);
      navigateTo('dashboard');
      triggerAlert('success', 'Authenticated', `Welcome back, @${data.user.username}.`);
    } catch (err: any) {
      triggerAlert('error', 'Login Failed', err.message);
    }
  };

  // Real signup — calls /api/auth/register
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      triggerAlert('warning', 'Terms Required', 'You must agree to the Terms & Privacy Policy.');
      return;
    }
    // Client-side validation before hitting the server
    if (!fullName.trim() || fullName.trim().length < 2) {
      triggerAlert('error', 'Full Name Required', 'Enter your full name (at least 2 characters).');
      return;
    }
    if (!userEmail.trim()) {
      triggerAlert('error', 'Email Required', 'Enter a valid email address.');
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      triggerAlert('error', 'Username Required', 'Username must be at least 3 characters (lowercase, no spaces).');
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(username.trim())) {
      triggerAlert('error', 'Invalid Username', 'Username can only contain lowercase letters, numbers, hyphens, and underscores.');
      return;
    }
    if (!password || password.length < 8) {
      triggerAlert('error', 'Password Too Short', 'Password must be at least 8 characters.');
      return;
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail.trim(), password, username: username.trim(), fullName: fullName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // Show specific field errors if available
        if (data.details) {
          const firstError = Object.values(data.details as Record<string, string[]>)[0]?.[0];
          throw new Error(firstError || data.error || 'Registration failed');
        }
        throw new Error(data.error || 'Registration failed');
      }
      setIsLoggedIn(true);
      setUserId(data.user.id);
      setUsername(data.user.username);
      setFullName(data.user.fullName ?? fullName);
      setUserEmail(data.user.email);
      setSessions([{ id: 'current', device: navigator.userAgent.slice(0, 60), location: 'Current device', time: 'Active now', isCurrent: true }]);
      navigateTo('dashboard');
      triggerAlert('success', 'Account Created', `Welcome to Synkron, @${data.user.username}.`);
    } catch (err: any) {
      triggerAlert('error', 'Registration Failed', err.message);
    }
  };

  const filteredApiEndpoints = useMemo(() => {
    return apiEndpoints.filter(ep =>
      ep.path.toLowerCase().includes(apiSearch.toLowerCase()) ||
      ep.description.toLowerCase().includes(apiSearch.toLowerCase()) ||
      ep.method.toLowerCase().includes(apiSearch.toLowerCase())
    );
  }, [apiSearch]);

  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-zinc-100 font-mono relative antialiased selection:bg-purple-500/20">

      {/* ================= REPOSITORY TOP RIBBON ================= */}
      <div className="w-full bg-gradient-to-r from-[#120a24] via-[#09090b] to-[#120a24] border-b border-purple-500/20 py-2 px-4 text-center font-mono relative z-50 flex items-center justify-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-[10px] text-zinc-300 font-bold tracking-wider relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
            <span className="uppercase text-zinc-400">Source Available</span>
          </div>
          <div className="hidden sm:block w-1 h-1 bg-zinc-800 rounded-full"></div>
          <a 
            href="https://github.com/sah-rohit/SYNKRON" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-white hover:text-purple-400 transition-all duration-300 uppercase border border-dashed border-zinc-800 hover:border-purple-500/40 px-3 py-0.5 bg-[#0c0c0e]"
          >
            <Github className="w-3 h-3 text-purple-400 group-hover:scale-110 transition-transform" />
            <span>github.com/sah-rohit/SYNKRON</span>
            <ExternalLink className="w-2.5 h-2.5 text-zinc-600 group-hover:text-purple-400" />
          </a>
          <div className="hidden sm:block w-1 h-1 bg-zinc-800 rounded-full"></div>
          <button 
            onClick={() => navigateTo('github')}
            className="text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer uppercase tracking-widest text-[9px]"
          >
            <span>[View Platform Metrics]</span>
          </button>
        </div>
      </div>

      {/* ================= START UP INTRO LOADING ANIMATION ================= */}
      {isIntroLoading && (
        <div className="intro-screen fixed inset-0 z-50 bg-[#09090b] flex flex-col items-center justify-center p-6 select-none border-b border-zinc-800">
          <div className="max-w-md w-full flex flex-col gap-6 font-mono text-xs">
            <div className="flex items-center gap-2.5 text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>[SYSTEM INITIALIZATION]</span>
            </div>

            <div className="flex flex-col gap-2.5 text-zinc-300">
              <div className="flex items-center gap-3">
                <SynkronLogo className="w-9 h-9" />
                <div>
                  <p className="font-extrabold text-sm tracking-wider uppercase text-white">SYNKRON CONSOLE v1.4.0</p>
                  <p className="text-[10px] text-zinc-500">Sonata Interactive self-healing platform.</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-1.5 text-[10px] text-zinc-400 leading-normal">
              <p>&gt; Checking Convex client connections...</p>
              <p>&gt; Validating Ollama Cloud credentials...</p>
              <p>&gt; {introStatus}</p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-zinc-500 text-[10px]">
                <span>LOADING ASSETS</span>
                <span>{introProgress}%</span>
              </div>
              <div className="w-full h-1 bg-zinc-900 overflow-hidden border border-zinc-800 rounded">
                <div
                  className="h-full bg-purple-500 transition-all duration-100"
                  style={{ width: `${introProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SYNKRON NOTIFICATION TOASTS ================= */}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
        {alerts.map(alert => {
          const cfg = {
            success: { bar: '#10b981', icon: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />, label: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/20' },
            warning: { bar: '#f59e0b', icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />, label: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' },
            error:   { bar: '#f43f5e', icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />, label: 'text-rose-400', bg: 'bg-rose-500/5 border-rose-500/20' },
            info:    { bar: '#a855f7', icon: <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />, label: 'text-purple-400', bg: 'bg-purple-500/5 border-purple-500/20' },
          }[alert.type];
          return (
            <div
              key={alert.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border ${cfg.bg} backdrop-blur-sm shadow-2xl shadow-black/40 animate-in slide-in-from-right-8 fade-in duration-300`}
              style={{ borderLeftWidth: '3px', borderLeftColor: cfg.bar }}
            >
              {cfg.icon}
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-bold font-mono uppercase tracking-wider ${cfg.label}`}>{alert.title}</p>
                <p className="text-[11px] text-zinc-300 font-sans leading-snug mt-0.5 break-words">{alert.message}</p>
              </div>
              <button
                onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
                className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ================= FLOATING NAV PILL ================= */}
      <div className="w-full sticky top-0 z-40 px-4 pointer-events-none">
        <header className="pointer-events-auto flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md max-w-7xl mx-auto mt-4 rounded-lg">
          <div className="flex items-center gap-3">
            {history.length > 1 && view !== 'landing' && (
              <button
                onClick={navigateBack}
                className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigateTo('landing')}>
              <SynkronLogo className="w-7 h-7" />
              <span className="font-extrabold text-sm tracking-wider text-white uppercase font-mono">Synkron</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            <button onClick={() => navigateTo('landing')} className={`hover:text-white transition-colors ${view === 'landing' ? 'text-white' : ''}`}>[overview]</button>
            <button onClick={() => navigateTo('dashboard')} className={`hover:text-white transition-colors ${view === 'dashboard' ? 'text-white' : ''}`}>[dashboard]</button>
            <button onClick={() => navigateTo('repositories')} className={`hover:text-white transition-colors ${view === 'repositories' ? 'text-white' : ''}`}>[repositories]</button>
            <button onClick={() => navigateTo('editor')} className={`hover:text-white transition-colors ${view === 'editor' ? 'text-white' : ''}`}>[editor]</button>
            <button onClick={() => navigateTo('security')} className={`hover:text-white transition-colors ${view === 'security' ? 'text-white' : ''}`}>[security]</button>
            <button onClick={() => navigateTo('engine')} className={`hover:text-zinc-100 transition-colors ${view === 'engine' ? 'text-purple-400 border-b border-purple-500/30 pb-0.5' : 'text-emerald-500/80'}`}>[SYSTEM_ENGINE]</button>
            <button onClick={() => navigateTo('ui-rater')} className={`hover:text-white transition-colors ${view === 'ui-rater' ? 'text-white' : ''}`}>[ui-rater]</button>
            <button onClick={() => navigateTo('pricing')} className={`hover:text-white transition-colors ${view === 'pricing' ? 'text-white' : ''}`}>[pricing]</button>
            <button onClick={() => navigateTo('github')} className={`hover:text-purple-300 hover:border-purple-400/50 transition-all border border-transparent px-1.5 py-0.5 ${view === 'github' ? 'text-purple-400 border-purple-500/40 bg-purple-500/5' : ''}`}>[repository]</button>
          </nav>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-3 text-xs">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateTo('profile')}
                  className={`flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 transition-all font-bold font-mono rounded ${view === 'profile' ? 'border-purple-500/50 text-white' : 'border-zinc-800'}`}
                >
                  {profilePic ? (
                    <img src={profilePic} alt="Avatar" className="w-4 h-4 rounded-full object-cover border border-purple-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-purple-600 text-[9px] text-white flex items-center justify-center font-bold">
                      {username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span>@{username}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigateTo('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <Lock className="w-3 h-3 text-purple-400" />
                <span>[connect-account]</span>
              </button>
            )}
          </div>
        </header>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8">
        <div className="view-container">

          {/* ================= LANDING VIEW ================= */}
          {view === 'landing' && (
            <div className="flex flex-col gap-16 py-6 font-mono">
              <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 pt-6 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-950 border border-zinc-800 text-zinc-400 text-[10px] font-bold tracking-wider">
                  <span>SYSTEM_PROT: SELF_HEALING_DOCUMENTATION_CONSOLE</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-none text-white uppercase">
                  Documentation <br />
                  <span className="text-purple-400">Healed By Ollama & Groq.</span>
                </h1>
                <p className="text-zinc-400 text-xs sm:text-sm max-w-xl leading-relaxed font-light font-sans">
                  Connect live webhook routes, push code changes to `/api/webhook`, and watch **Ollama's gemma4:31b-cloud** (with fallback to **Groq llama-3.1-8b**) analyze differential AST modifications to keep Markdown docs 100% updated.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                  <button
                    onClick={() => navigateTo('dashboard')}
                    className="px-5 py-2.5 bg-purple-600 border border-purple-500 text-white font-bold text-xs hover:bg-purple-500 transition-all cursor-pointer"
                  >
                    Launch Developer Console
                  </button>
                  <button
                    onClick={() => navigateTo('repositories')}
                    className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    Connect Repository
                  </button>
                </div>

                {/* ================= REPOSITORY QUICK PROMO SECTION ================= */}
                <div className="mt-4 w-full max-w-lg p-4 bg-zinc-950 border border-purple-500/15 rounded flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600/10 border border-purple-500/20 rounded">
                      <Github className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-left flex flex-col font-mono">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Main Codebase</span>
                      <span className="text-[11px] text-white font-bold tracking-tight">sah-rohit/SYNKRON</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <button 
                      onClick={() => navigateTo('github')}
                      className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-[9px] hover:bg-zinc-850 text-zinc-300 hover:text-white transition-all font-extrabold uppercase tracking-wider"
                    >
                      View Specs
                    </button>
                    <a 
                      href="https://github.com/sah-rohit/SYNKRON" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[9px] transition-all font-extrabold uppercase tracking-wider flex items-center gap-1"
                    >
                      <span>Star</span>
                      <Star className="w-2.5 h-2.5 fill-white" />
                    </a>
                  </div>
                </div>

              </div>

              {/* Dev Dense Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-3">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">[PILLAR_01: Webhook Router]</span>
                  <h3 className="font-bold text-sm text-white uppercase">Live /api/webhook</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans font-light">
                    Real, deployable API route parses GitHub push notifications, tracks commits, modified files, and dispatches server-side reconciliations securely.
                  </p>
                </div>

                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-3">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">[PILLAR_02: LLM Pipelines]</span>
                  <h3 className="font-bold text-sm text-white uppercase">Ollama + Groq Fallback</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans font-light">
                    Secure server-side calls query Ollama Cloud gemma4:31b-cloud, with transparent fallback to Groq's high-speed llama-3.1-8b-instant.
                  </p>
                </div>

                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-3">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">[PILLAR_03: Persistence]</span>
                  <h3 className="font-bold text-sm text-white uppercase">Convex Real-time DB</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans font-light">
                    WebSocket persistent storage maintains connected repo metadata, commits list, logs history, and generated markdown routes reactively.
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* ================= BENTO DASHBOARD VIEW ================= */}
          {view === 'dashboard' && (
            <div className="flex flex-col gap-6 py-4 font-mono text-xs">


              {/* Developer Action Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-zinc-800">
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-bold uppercase text-white tracking-tight">Synkron Developer Console</h1>
                  <span className="text-[10px] text-zinc-500">Live webhook routes, API schema tests, and Ollama self-healing integration.</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="px-3.5 py-1.5 bg-zinc-950 border border-zinc-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-zinc-300 font-mono uppercase">WEBHOOK: LISTENING</span>
                  </div>
                  <button
                    onClick={handleSimulatePush}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white font-bold transition-all disabled:opacity-50 cursor-pointer text-xs"
                  >
                    {isSyncing ? 'Processing...' : 'Dispatch Webhook + Heal'}
                  </button>
                </div>
              </div>

              {/* Dev Dense Bento Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* CARD 1: Repository Details with Custom Commit Message Input */}
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col justify-between gap-5 relative overflow-hidden">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase font-mono">[01_SOURCE_CONFIG]</span>
                      <Github className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-white uppercase font-mono">{repoUrl.replace('github.com/', '')}</span>
                      </div>

                      {/* Interactive Repo input */}
                      <input
                        type="text"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 focus:text-white focus:outline-none"
                        placeholder="github.com/your-username/repo"
                      />
                    </div>

                    {/* Commit Message Input */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase">Custom Commit Message</label>
                      <input
                        type="text"
                        value={customCommitMessage}
                        onChange={(e) => setCustomCommitMessage(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-[11px] text-zinc-300 focus:outline-none"
                        placeholder="e.g. Modify authorization timer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase">Branch</label>
                        <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300">
                          <GitBranch className="w-3 h-3 text-purple-400" />
                          <span>{branch}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase">Sync State</label>
                        <div className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-emerald-400 font-bold uppercase">
                          Listening
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>LIVE ROUTER:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 font-bold">POST /api/webhook</span>
                      <button
                        onClick={async () => {
                          if (!repoUrl.includes('/')) { triggerAlert('warning', 'Invalid Repo', 'Enter a valid repo in owner/repo format.'); return; }
                          try {
                            const res = await fetch('/api/repositories', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ fullName: repoUrl.replace('github.com/', ''), branch }),
                            });
                            const data = await res.json();
                            if (!res.ok || !data.success) throw new Error(data.error || 'Failed');
                            triggerAlert('success', 'Repository Connected', `Webhook URL: ${data.repository.webhookUrl} — Secret shown once, save it now.`);
                            setLogs(prev => [...prev, { timestamp: new Date().toTimeString().split(' ')[0], type: 'success', message: `Repo connected: ${data.repository.fullName} — webhook secret generated.` }]);
                          } catch (err: any) {
                            triggerAlert('error', 'Connect Failed', err.message);
                          }
                        }}
                        className="px-2 py-0.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase hover:bg-emerald-600/40 cursor-pointer"
                      >
                        + Connect
                      </button>
                    </div>
                  </div>
                </div>

                {/* CARD 2: Webhook console logging */}
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4 lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white uppercase">[02_CONSOLE_FEED]</span>
                    </div>
                    <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Convex WebSocket Active</span>
                    </span>
                  </div>

                  <div className="flex-1 min-h-[160px] max-h-[160px] overflow-y-auto bg-zinc-900/40 rounded border border-zinc-800 p-3 font-mono text-[10px] flex flex-col gap-1.5">
                    {logs.map((log, index) => {
                      let typeColor = 'text-zinc-400';
                      if (log.type === 'queue') typeColor = 'text-cyan-400';
                      if (log.type === 'ai') typeColor = 'text-purple-400';
                      if (log.type === 'success') typeColor = 'text-emerald-400';
                      if (log.type === 'webhook') typeColor = 'text-yellow-400';
                      if (log.type === 'convex') typeColor = 'text-blue-400';

                      return (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                          <span className={`${typeColor} font-bold uppercase text-[8px] bg-zinc-900 border border-zinc-800 px-1`}>
                            {log.type}
                          </span>
                          <span className="text-zinc-300 leading-normal">{log.message}</span>
                        </div>
                      );
                    })}
                    <div ref={logEndRef} />
                  </div>
                </div>

                {/* CARD 3: Dependency Node Graph */}
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4 lg:row-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase">[03_DEPENDENCY_TREE]</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-bold">GRAPH_MAP</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                    Click file nodes to load them directly into the active editor on the right.
                  </p>

                  <div className="flex-1 min-h-[290px] flex items-center justify-center bg-zinc-900/20 rounded border border-zinc-800 relative p-4">
                    <svg className="w-full h-full max-h-[260px]" viewBox="0 0 200 200">
                      <line x1="100" y1="40" x2="60" y2="100" stroke={hoveredNode === 'server' || hoveredNode === 'db' ? '#06b6d4' : 'rgba(255,255,255,0.06)'} strokeWidth={hoveredNode === 'server' || hoveredNode === 'db' ? '1.5' : '1'} className="transition-all duration-300" />
                      <line x1="100" y1="40" x2="140" y2="100" stroke={hoveredNode === 'server' || hoveredNode === 'session' ? '#a855f7' : 'rgba(255,255,255,0.06)'} strokeWidth={hoveredNode === 'server' || hoveredNode === 'session' ? '1.5' : '1'} className="transition-all duration-300" />
                      <line x1="140" y1="100" x2="100" y2="160" stroke={hoveredNode === 'session' || hoveredNode === 'ai' ? '#a855f7' : 'rgba(255,255,255,0.06)'} strokeWidth={hoveredNode === 'session' || hoveredNode === 'ai' ? '1.5' : '1'} className="transition-all duration-300" />
                      <line x1="60" y1="100" x2="100" y2="160" stroke={hoveredNode === 'db' || hoveredNode === 'ai' ? '#10b981' : 'rgba(255,255,255,0.06)'} strokeWidth={hoveredNode === 'db' || hoveredNode === 'ai' ? '1.5' : '1'} className="transition-all duration-300" />

                      <g className="cursor-pointer" onMouseEnter={() => setHoveredNode('server')} onMouseLeave={() => setHoveredNode(null)}>
                        <circle cx="100" cy="40" r="13" fill="#18181b" stroke={hoveredNode === 'server' ? '#a855f7' : '#27272a'} strokeWidth="1" />
                        <text x="100" y="43" fill="#a1a1aa" fontSize="5" fontWeight="bold" textAnchor="middle">server.ts</text>
                      </g>

                      <g className="cursor-pointer" onMouseEnter={() => setHoveredNode('db')} onMouseLeave={() => setHoveredNode(null)} onClick={() => setActiveFile('db.ts')}>
                        <circle cx="60" cy="100" r="13" fill="#18181b" stroke={hoveredNode === 'db' ? '#10b981' : '#27272a'} strokeWidth="1" />
                        <text x="60" y="103" fill="#a1a1aa" fontSize="5" fontWeight="bold" textAnchor="middle">db.ts</text>
                      </g>

                      <g className="cursor-pointer" onMouseEnter={() => setHoveredNode('session')} onMouseLeave={() => setHoveredNode(null)} onClick={() => setActiveFile('session.ts')}>
                        <circle cx="140" cy="100" r="13" fill="#18181b" stroke={hoveredNode === 'session' ? '#06b6d4' : '#27272a'} strokeWidth="1" />
                        <text x="140" y="103" fill="#a1a1aa" fontSize="5" fontWeight="bold" textAnchor="middle">session.ts</text>
                      </g>

                      <g className="cursor-pointer" onMouseEnter={() => setHoveredNode('ai')} onMouseLeave={() => setHoveredNode(null)}>
                        <circle cx="100" cy="160" r="13" fill="#18181b" stroke={hoveredNode === 'ai' ? '#f43f5e' : '#27272a'} strokeWidth="1" />
                        <text x="100" y="163" fill="#a1a1aa" fontSize="5" fontWeight="bold" textAnchor="middle">ai.ts</text>
                      </g>
                    </svg>

                    <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-[9px] text-zinc-500 font-mono text-center">
                      {hoveredNode === 'server' && 'server.ts: Imports auth and database pools.'}
                      {hoveredNode === 'db' && 'db.ts (Click to load): Database pool boundaries.'}
                      {hoveredNode === 'session' && 'session.ts (Click to load): Expiration timers.'}
                      {hoveredNode === 'ai' && 'ai.ts: Parses and reconciles changed files.'}
                      {!hoveredNode && 'Click db.ts or session.ts nodes to open in editor.'}
                    </div>
                  </div>
                </div>

                {/* CARD 4: Discovered Endpoint Directory with Integrated API Request Tester Drawer */}
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4 lg:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase">[04_REST_ENDPOINTS]</span>
                    </div>

                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2" />
                      <input
                        type="text"
                        placeholder="Search REST schema path..."
                        value={apiSearch}
                        onChange={(e) => setApiSearch(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 pl-8 pr-3 py-1 text-[11px] focus:outline-none focus:text-white text-zinc-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[120px] overflow-y-auto pr-1">
                    {filteredApiEndpoints.map((ep, idx) => {
                      const methodColor = ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                      return (
                        <div
                          key={idx}
                          onClick={() => handleTestEndpoint(ep)}
                          className={`p-2 rounded border flex items-start gap-2.5 cursor-pointer transition-all ${selectedEndpoint?.path === ep.path ? 'bg-purple-600/10 border-purple-500/30' : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900'}`}
                        >
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${methodColor} shrink-0`}>
                            {ep.method}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-mono font-bold text-white leading-tight">{ep.path}</span>
                            <span className="text-[9px] text-zinc-400 leading-normal mt-0.5 font-sans font-light">{ep.description}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* API Response sandbox drawer */}
                  {selectedEndpoint && (
                    <div className="bg-zinc-900/60 p-3 rounded border border-zinc-800 animate-in slide-in-from-bottom-4 duration-300 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] border-b border-zinc-800 pb-1.5 font-mono">
                        <span className="font-bold text-purple-400">REST TESTER: {selectedEndpoint.method} {selectedEndpoint.path}</span>
                        <button onClick={() => setSelectedEndpoint(null)} className="text-zinc-500 hover:text-white"><X className="w-3 h-3" /></button>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleTestEndpoint(selectedEndpoint)}
                          disabled={isTestingEndpoint}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white font-bold font-mono text-[9px] rounded flex items-center gap-1 cursor-pointer"
                        >
                          {isTestingEndpoint ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                          <span>{isTestingEndpoint ? 'FETCHING...' : 'SEND REQUEST'}</span>
                        </button>
                        <span className="text-[9px] text-zinc-500 font-mono">Query dispatch through Convex backend</span>
                      </div>

                      {testResponse && (
                        <pre className="p-2.5 bg-zinc-950 rounded text-[9px] font-mono text-emerald-400 overflow-x-auto max-h-[100px] leading-relaxed border border-zinc-800">
                          {testResponse}
                        </pre>
                      )}
                    </div>
                  )}
                </div>

                {/* CARD 5: Self-Healing Glassmorphic Editor & Markdown sync (REAL INTEGRATION VIA SECURE ROUTE) */}
                <div className={`p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4 lg:col-span-3 bento-transition ${healingPulse ? 'border-emerald-500/30' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Code className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white uppercase block">[05_WORKSPACE_IDE]</span>
                        <span className="text-[10px] text-zinc-500 block leading-tight font-light mt-0.5 font-sans">Edit variables inside TypeScript source. Click "HEAL NOW" to run server-side LLM reconciliation.</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded border border-zinc-800">
                      <button
                        onClick={() => setActiveFile('session.ts')}
                        className={`text-[10px] px-3 py-1 rounded transition-all font-mono font-bold flex items-center gap-1 ${activeFile === 'session.ts' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>session.ts</span>
                      </button>
                      <button
                        onClick={() => setActiveFile('db.ts')}
                        className={`text-[10px] px-3 py-1 rounded transition-all font-mono font-bold flex items-center gap-1 ${activeFile === 'db.ts' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>database.ts</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Source Code input */}
                    <div className="flex flex-col gap-2 bg-zinc-900/50 p-4 rounded border border-zinc-800 font-mono text-xs">
                      <div className="flex items-center justify-between text-zinc-500 border-b border-zinc-800 pb-2">
                        <span className="flex items-center gap-1.5 font-bold text-[9px] uppercase tracking-wider">
                          <Terminal className="w-3.5 h-3.5 text-purple-500" />
                          <span>Code Input</span>
                        </span>
                        <span className="text-[9px] text-purple-400">TS</span>
                      </div>

                      <textarea
                        value={editorCode}
                        onChange={(e) => setEditorCode(e.target.value)}
                        className="w-full h-48 bg-transparent text-zinc-300 font-mono text-[11px] p-2 focus:outline-none resize-none leading-relaxed"
                        spellCheck="false"
                      />

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800 mt-1">
                        <span className="text-[9px] text-zinc-500">Edit parameters inside variables to evaluate results.</span>
                        <button
                          onClick={handleManualHeal}
                          disabled={isHealing}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 border border-purple-500 text-white text-[10px] font-bold hover:bg-purple-500 transition-all cursor-pointer"
                        >
                          {isHealing ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>ANALYZING CODE...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>HEAL NOW</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Output documentation markdown */}
                    <div className="flex flex-col gap-2 bg-zinc-900/20 p-4 rounded border border-zinc-800 font-sans text-xs relative overflow-hidden">
                      <div className="flex items-center justify-between text-zinc-500 border-b border-zinc-800 pb-2 font-mono">
                        <span className="flex items-center gap-1.5 font-bold text-[9px] uppercase tracking-wider">
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Self-Healed Output</span>
                        </span>
                        <span className="text-[9px] text-cyan-400">MD</span>
                      </div>

                      <div className="flex-1 h-48 overflow-y-auto p-2 leading-relaxed text-zinc-300 flex flex-col gap-3 font-sans relative">
                        {healingPulse && (
                          <div className="absolute inset-0 bg-emerald-500/5 border border-emerald-500/20 rounded animate-pulse pointer-events-none" />
                        )}

                        <div className="flex flex-col gap-2.5">
                          {docContent.split('\n').map((line, lidx) => {
                            if (line.startsWith('# ')) {
                              return <h1 key={lidx} className="text-base font-extrabold text-white tracking-tight mt-1 border-b border-zinc-800 pb-1 uppercase font-mono">{line.replace('# ', '')}</h1>;
                            }
                            if (line.startsWith('## ')) {
                              return <h2 key={lidx} className="text-xs font-extrabold text-zinc-200 mt-2 flex items-center gap-1.5 font-mono"><span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />{line.replace('## ', '').replace(/`/g, '')}</h2>;
                            }
                            if (line.startsWith('**')) {
                              return <p key={lidx} className="text-xs text-zinc-300 font-light" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code class="font-mono bg-zinc-800 border border-zinc-700 px-1 py-0.5 rounded text-cyan-400">$1</code>') }} />;
                            }
                            if (line.startsWith('- ')) {
                              return <li key={lidx} className="text-xs text-zinc-400 list-disc ml-4 font-light" dangerouslySetInnerHTML={{ __html: line.replace('- ', '').replace(/`(.*?)`/g, '<code class="font-mono bg-zinc-800 border border-zinc-700 px-1 py-0.5 rounded text-cyan-400">$1</code>') }} />;
                            }
                            return <p key={lidx} className="text-xs text-zinc-400 font-light" dangerouslySetInnerHTML={{ __html: line.replace(/`(.*?)`/g, '<code class="font-mono bg-zinc-800 border border-zinc-700 px-1 py-0.5 rounded text-cyan-400">$1</code>') }} />;
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800 mt-1 font-mono text-[9px] text-zinc-500">
                        <span>Reconciliation State: {isHealing ? 'Synthesizing...' : 'Up-to-date'}</span>
                        <span className="flex items-center gap-1 text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/25">
                          <Check className="w-2.5 h-2.5" />
                          <span>Synced</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ─── CARD 6: Semantic Search ─────────────────────────────────────── */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase">[06_SEMANTIC_SEARCH]</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-bold">NL → VECTOR SIMILARITY</span>
                </div>

                <form onSubmit={handleSemanticSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='e.g. "How do I handle authentication in a multi-tenant setup?"'
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-3 py-2 text-[11px] text-zinc-300 focus:outline-none focus:border-purple-500/50 placeholder:text-zinc-600"
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white font-bold text-[10px] uppercase disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSearching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    <span>{isSearching ? 'Searching...' : 'Search'}</span>
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {searchResults.map((r) => (
                      <div key={r.docFileId} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-purple-400 font-mono">{r.filePath}</span>
                          <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            {Math.round(r.similarity * 100)}% match
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-sans leading-relaxed line-clamp-2">{r.excerpt}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── CARD 7: Heal History ─────────────────────────────────────────── */}
              <HealHistoryCard triggerAlert={triggerAlert} />

              {/* ═══════════ NEW FEATURE CARDS ═══════════ */}

              {/* CARD 8: Doc Health Score */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase">[08_DOC_HEALTH_SCORE]</span>
                  </div>
                  <button onClick={fetchHealthScore} className="text-[9px] text-zinc-500 hover:text-white uppercase font-bold cursor-pointer">Refresh</button>
                </div>
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                      <circle cx="50" cy="50" r="40" stroke={docHealthScore !== null && docHealthScore >= 80 ? '#10b981' : docHealthScore !== null && docHealthScore >= 50 ? '#f59e0b' : '#f43f5e'} strokeWidth="8" fill="none" strokeDasharray={`${(docHealthScore ?? 87) * 2.51} 251`} strokeLinecap="round" className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-extrabold text-white">{docHealthScore ?? 87}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-white">Documentation Sync Health</span>
                    <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                      Percentage showing how in-sync your docs are with the codebase, based on AST diff staleness and heal freshness.
                    </p>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border w-fit uppercase ${(docHealthScore ?? 87) >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : (docHealthScore ?? 87) >= 50 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                      {(docHealthScore ?? 87) >= 80 ? 'HEALTHY' : (docHealthScore ?? 87) >= 50 ? 'NEEDS ATTENTION' : 'CRITICAL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 9: Live Webhook Test Ping */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold text-white uppercase">[09_TEST_PING]</span>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 font-sans">Fires a real GitHub-style push payload to /api/webhook and shows the full round-trip result.</p>
                <button
                  onClick={handleTestPing}
                  disabled={isTestPinging}
                  className="flex items-center gap-1.5 px-4 py-2 bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 font-bold text-[10px] uppercase hover:bg-yellow-600/40 cursor-pointer disabled:opacity-50 w-fit"
                >
                  {isTestPinging ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>{isTestPinging ? 'Pinging...' : 'Send Test Ping'}</span>
                </button>
                {testPingResult && (
                  <pre className="p-2.5 bg-zinc-900/60 rounded text-[9px] font-mono text-emerald-400 overflow-x-auto max-h-[100px] leading-relaxed border border-zinc-800">
                    {JSON.stringify(testPingResult, null, 2)}
                  </pre>
                )}
              </div>

              {/* CARD 10: Doc Export */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileDown className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase">[10_DOC_EXPORT]</span>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 font-sans">Export healed documentation as a static HTML site, Markdown ZIP bundle, or JSON.</p>
                <div className="flex flex-wrap gap-2">
                  {(['html', 'markdown', 'json'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => handleExportDocs(fmt)}
                      disabled={isExporting}
                      className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-[9px] font-bold uppercase cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3 h-3" />
                      <span>{fmt === 'markdown' ? 'MD ZIP' : fmt.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* CARD 11: Diff Viewer */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4 lg:col-span-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white uppercase">[11_DIFF_VIEWER]</span>
                  </div>
                  <button
                    onClick={() => setDiffViewerOpen(!diffViewerOpen)}
                    className="text-[9px] text-zinc-500 hover:text-white uppercase font-bold cursor-pointer"
                  >
                    {diffViewerOpen ? 'Hide' : 'Show'} Diff
                  </button>
                </div>
                {diffViewerOpen && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] text-rose-400 font-bold uppercase flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Before (Previous)
                      </span>
                      <div className="p-3 bg-zinc-900/40 border border-rose-900/20 rounded font-mono text-[10px] text-zinc-400 max-h-[200px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {previousDoc || '(No previous version available. Trigger a heal to see the diff.)'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                        <Eye className="w-3 h-3" /> After (Current)
                      </span>
                      <div className="p-3 bg-zinc-900/40 border border-emerald-900/20 rounded font-mono text-[10px] text-zinc-300 max-h-[200px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {docContent || '(No healed documentation yet.)'}
                      </div>
                    </div>
                  </div>
                )}
                {!diffViewerOpen && (
                  <p className="text-[10px] text-zinc-500 font-sans">Side-by-side before/after view showing exactly what changed when a heal runs. Click "Show Diff" above.</p>
                )}
              </div>

              {/* CARD 12: Scheduled Healing */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white uppercase">[12_SCHEDULED_HEALING]</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase">Cron Schedule</label>
                    <select
                      value={cronSchedule}
                      onChange={(e) => setCronSchedule(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none cursor-pointer"
                    >
                      <option value="every6h">Every 6 Hours</option>
                      <option value="every12h">Every 12 Hours</option>
                      <option value="every24h">Every 24 Hours</option>
                    </select>
                  </div>
                  <button
                    onClick={handleRunCronHeal}
                    disabled={isRunningCron}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-[10px] uppercase hover:bg-blue-600/40 cursor-pointer disabled:opacity-50 w-fit"
                  >
                    {isRunningCron ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                    <span>{isRunningCron ? 'Running...' : 'Run Heal Cycle Now'}</span>
                  </button>
                  <p className="text-[9px] text-zinc-500 font-sans">Vercel Cron runs automatically at the selected interval. Manual trigger above for testing.</p>
                </div>
              </div>

              {/* CARD 13: Email Notifications */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase">[13_NOTIFICATIONS]</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase">Notification Email</label>
                    <input
                      type="email"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="dev@example.com"
                      className="bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendNotification('heal_complete')}
                      className="flex items-center gap-1 px-2 py-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase hover:bg-emerald-600/40 cursor-pointer"
                    >
                      <Mail className="w-3 h-3" /> Test Heal Email
                    </button>
                    <button
                      onClick={() => handleSendNotification('security_alert')}
                      className="flex items-center gap-1 px-2 py-1 bg-rose-600/20 border border-rose-500/30 text-rose-400 text-[9px] font-bold uppercase hover:bg-rose-600/40 cursor-pointer"
                    >
                      <Shield className="w-3 h-3" /> Test Alert Email
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD 14: Stale Doc Alerts */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-white uppercase">[14_STALE_DOC_ALERTS]</span>
                  </div>
                  <button onClick={fetchStaleDocs} className="text-[9px] text-zinc-500 hover:text-white uppercase font-bold cursor-pointer">Refresh</button>
                </div>
                {staleDocs.length === 0 ? (
                  <p className="text-[10px] text-zinc-500 font-sans">No stale documentation detected. All docs are up to date, or connect a database to enable detection.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                    {staleDocs.map((doc, i) => (
                      <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-800 rounded flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-300 truncate">{doc.filePath}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${doc.severity === 'critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                          {doc.daysSinceHeal}d stale
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CARD 15: PR Description Generator */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4 lg:col-span-2">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white uppercase">[15_PR_DESCRIPTION]</span>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 font-sans">Auto-generate a GitHub PR description summarizing code changes and documentation heals.</p>
                <button
                  onClick={handleGeneratePR}
                  disabled={isGeneratingPR}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 font-bold text-[10px] uppercase hover:bg-purple-600/40 cursor-pointer disabled:opacity-50 w-fit"
                >
                  {isGeneratingPR ? <RefreshCw className="w-3 h-3 animate-spin" /> : <GitPullRequest className="w-3 h-3" />}
                  <span>{isGeneratingPR ? 'Generating...' : 'Generate PR Description'}</span>
                </button>
                {prDescription && (
                  <div className="relative">
                    <button
                      onClick={() => { navigator.clipboard.writeText(prDescription); triggerAlert('success', 'Copied', 'PR description copied to clipboard.'); }}
                      className="absolute top-2 right-2 p-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <pre className="p-3 bg-zinc-900/60 rounded text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-[200px] leading-relaxed border border-zinc-800 whitespace-pre-wrap">
                      {prDescription}
                    </pre>
                  </div>
                )}
              </div>

              {/* CARD 16: Team Workspaces */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white uppercase">[16_TEAM_WORKSPACES]</span>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 font-sans">Multiple users sharing one repository, with role-based access (owner/editor/viewer).</p>
                <div className="flex flex-col gap-2">
                  <div className="p-2 bg-zinc-900/40 border border-zinc-800 rounded flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-600 text-[8px] text-white flex items-center justify-center font-bold">
                        {username ? username.substring(0, 2).toUpperCase() : 'YO'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white">@{username || 'you'}</span>
                        <span className="text-[8px] text-zinc-500">OWNER</span>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/20 uppercase">Owner</span>
                  </div>
                </div>
                <button
                  onClick={() => { if (!isLoggedIn) { triggerAlert('warning', 'Login Required', 'Sign in to manage team workspaces.'); return; } navigateTo('teams'); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-[9px] font-bold uppercase hover:bg-indigo-600/40 cursor-pointer w-fit"
                >
                  <Users className="w-3 h-3" /> Manage Teams
                </button>
              </div>

              {/* CARD 17: Changelog Generator */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4 lg:col-span-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold text-white uppercase">[17_CHANGELOG]</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleLoadChangelog}
                      disabled={isLoadingChangelog}
                      className="flex items-center gap-1 px-2 py-1 bg-teal-600/20 border border-teal-500/30 text-teal-400 text-[9px] font-bold uppercase hover:bg-teal-600/40 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingChangelog ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Bookmark className="w-3 h-3" />}
                      <span>Generate</span>
                    </button>
                    {changelogContent && (
                      <button
                        onClick={() => { navigator.clipboard.writeText(changelogContent); triggerAlert('success', 'Copied', 'Changelog copied to clipboard.'); }}
                        className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-bold uppercase hover:text-white cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    )}
                  </div>
                </div>
                {changelogContent ? (
                  <pre className="p-3 bg-zinc-900/40 rounded text-[10px] font-mono text-zinc-300 overflow-y-auto max-h-[240px] leading-relaxed border border-zinc-800 whitespace-pre-wrap">
                    {changelogContent}
                  </pre>
                ) : (
                  <p className="text-[10px] text-zinc-500 font-sans">Auto-generate a CHANGELOG.md from heal events and commit messages. Click "Generate" to build from your heal history.</p>
                )}
              </div>

            </div>
          )}
          {view === 'profile' && (
            <div className="max-w-3xl mx-auto py-6 flex flex-col gap-6 font-mono text-xs">


              <div className="flex flex-col gap-1 border-b border-zinc-800 pb-4">
                <h1 className="text-2xl font-bold uppercase text-white font-mono">Developer Settings</h1>
                <span className="text-[10px] text-zinc-500">Manage profile details, credentials, session logs, and GDPR backup keys.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Profile Picture Upload panel */}
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col items-center gap-4 text-center">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase self-start">[AVATAR_IMAGE]</span>

                  <div className="relative group cursor-pointer mt-2" onClick={() => fileInputRef.current?.click()}>
                    {profilePic ? (
                      <img src={profilePic} alt="Uploaded Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-purple-500" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 text-lg text-white font-extrabold flex items-center justify-center">
                        {username.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProfilePicUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-white uppercase">@{username}</span>
                    <span className="text-[9px] text-emerald-400 font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                      [Verified Dev Account]
                    </span>
                  </div>

                  <div className="flex gap-2 w-full mt-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-white font-bold border border-zinc-800 text-[9px] uppercase cursor-pointer"
                    >
                      Upload
                    </button>
                    {profilePic && (
                      <button
                        onClick={handleDeleteProfilePic}
                        className="py-1.5 px-2 bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-800 rounded flex items-center justify-center cursor-pointer"
                        title="Delete Picture"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Basic Info input form */}
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded md:col-span-2 flex flex-col gap-4">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">[01_BASIC_INFO]</span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase">Developer Handle</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase">Primary Email Address</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 pl-3 pr-20 py-1.5 text-xs text-white focus:outline-none"
                        />
                        <span className="absolute right-2 top-1.5 text-[8px] font-bold bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 border border-emerald-500/25 uppercase">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/auth/profile', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ fullName, username }),
                        });
                        if (res.ok) {
                          triggerAlert('success', 'Profile Saved', 'Your profile has been updated.');
                        } else {
                          const d = await res.json();
                          triggerAlert('info', 'Profile Update', d.note || d.error || 'Configure DATABASE_URL to persist changes.');
                        }
                      } catch {
                        triggerAlert('info', 'Profile Update', 'Configure DATABASE_URL to persist profile changes.');
                      }
                    }}
                    className="py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase cursor-pointer self-end px-4"
                  >
                    Save Changes
                  </button>
                </div>

                {/* Password Reset Section */}
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded md:col-span-3 flex flex-col gap-4">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">[02_PASSWORD_RESET]</span>

                  <form onSubmit={handlePasswordReset} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase">Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={currentPassInput}
                        onChange={(e) => setCurrentPassInput(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase">New Secure Password</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={newPassInput}
                        onChange={(e) => setNewPassInput(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={confirmPassInput}
                        onChange={(e) => setConfirmPassInput(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-white text-zinc-300 font-bold text-[10px] uppercase cursor-pointer sm:col-span-3 self-end"
                    >
                      Update Password Credentials
                    </button>
                  </form>
                </div>

                {/* Tracking Record Section */}
                <div className="md:col-span-3">
                  <TrackingRecordView />
                </div>

                {/* Login History / Active Sessions list */}
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded md:col-span-3 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">[03_ACTIVE_LOGIN_SESSIONS]</span>
                    <button
                      onClick={handleLogoutAllDevices}
                      className="text-[9px] text-rose-400 hover:text-rose-300 underline font-bold uppercase cursor-pointer"
                    >
                      Logout from all other devices
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {sessions.map((sess) => (
                      <div key={sess.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{sess.device}</span>
                              {sess.isCurrent && (
                                <span className="text-[8px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 rounded-full uppercase">
                                  Current Device
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-light font-sans leading-normal mt-0.5">
                              Location: {sess.location} • Connected: {sess.time}
                            </span>
                          </div>
                        </div>

                        {sess.isCurrent ? (
                          <button
                            onClick={handleLogoutCurrentDevice}
                            className="px-2.5 py-1 bg-rose-950/20 hover:bg-rose-950 border border-rose-900 text-rose-400 font-bold text-[9px] uppercase cursor-pointer animate-pulse"
                          >
                            Logout
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevokeSession(sess.id)}
                            className="px-2.5 py-1 bg-rose-950/20 hover:bg-rose-950 border border-rose-900 text-rose-400 font-bold text-[9px] uppercase cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Download backup and GDPR compliance data */}
                <div className="p-5 bg-zinc-950 border border-zinc-800 rounded md:col-span-3 flex flex-col gap-4">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">[04_GDPR_DATA_EXPORT]</span>
                  <div className="p-4 bg-zinc-900 rounded border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 max-w-lg">
                      <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-purple-400" />
                        <span>Export GDPR Backup Package</span>
                      </span>
                      <p className="text-[11px] text-zinc-500 font-sans font-light leading-relaxed">
                        Under GDPR and CCPA regulations, you are entitled to export a complete copy of your workspace data, synced branch logs, and Convex schema metadata.
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadUserData}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download JSON</span>
                    </button>
                  </div>
                </div>

                {/* Hard-to-accidentally-click deletion countdown */}
                <div className="p-5 bg-zinc-950 border border-rose-900/30 rounded md:col-span-3 flex flex-col gap-4">
                  <span className="text-[9px] font-bold text-rose-400 uppercase">[05_DANGER_DELETION_ZONE]</span>

                  <div className="p-4 bg-rose-950/10 border border-rose-900/20 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 max-w-lg">
                      <span className="text-xs font-bold text-rose-400 uppercase flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span>Permanently Delete Developer Account</span>
                      </span>
                      <p className="text-[11px] text-zinc-500 font-sans font-light leading-relaxed">
                        This action will permanently delete all metadata inside Convex Cloud and purge your active session logs. This action cannot be undone.
                      </p>
                    </div>

                    <button
                      onClick={handleStartDeleteAccount}
                      className="px-4 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-400 font-bold text-[10px] uppercase cursor-pointer"
                    >
                      Delete Account
                    </button>
                  </div>

                  {/* SYNKRON Account Deletion Confirmation Modal */}
                  {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
                      <div className="bg-[#0a0a0f] border border-rose-900/40 rounded-xl shadow-2xl shadow-rose-950/30 max-w-md w-full flex flex-col overflow-hidden">
                        {/* Header bar */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-rose-900/30 bg-rose-950/10">
                          <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-rose-300 font-mono uppercase tracking-wider">Permanent Account Deletion</p>
                            <p className="text-[9px] text-rose-500/70 font-mono">[WARNING_PROTOCOL_ACTIVATED]</p>
                          </div>
                        </div>

                        <div className="p-5 flex flex-col gap-4">
                          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                            You are about to permanently delete <span className="text-white font-bold font-mono">@{username}</span>. This will immediately:
                          </p>
                          <div className="flex flex-col gap-2">
                            {[
                              'Sever all connected repository webhook routers',
                              'Wipe all session tokens across every device',
                              'Delete all heal history, doc files, and AST caches',
                              'Remove all team memberships and access tokens',
                            ].map((item, i) => (
                              <div key={i} className="flex items-start gap-2 text-[10px] text-zinc-400 font-sans">
                                <span className="text-rose-500 font-mono shrink-0 mt-0.5">✕</span>
                                {item}
                              </div>
                            ))}
                          </div>

                          <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-lg">
                            <p className="text-[10px] text-rose-400 font-sans leading-relaxed">
                              <span className="font-bold font-mono">IRREVERSIBLE.</span> This cannot be undone. There is no recovery path.
                            </p>
                          </div>

                          {/* Countdown progress */}
                          {!isDeleteButtonUnlocked && (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                                <span>SAFETY LOCK</span>
                                <span>RELEASES IN {deleteTimer}s</span>
                              </div>
                              <div className="w-full h-1 bg-zinc-900 rounded overflow-hidden">
                                <div
                                  className="h-full bg-rose-600 transition-all duration-1000"
                                  style={{ width: `${((5 - deleteTimer) / 5) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3 pt-1">
                            <button
                              onClick={handleCancelDeleteAccount}
                              className="flex-1 py-2.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-bold text-[10px] uppercase font-mono transition-colors cursor-pointer rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleConfirmDeletePermanently}
                              disabled={!isDeleteButtonUnlocked}
                              className={`flex-1 py-2.5 font-bold text-[10px] uppercase font-mono transition-all rounded-lg ${
                                isDeleteButtonUnlocked
                                  ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 cursor-pointer'
                                  : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                              }`}
                            >
                              {isDeleteButtonUnlocked ? '⚠ Delete Forever' : `Locked (${deleteTimer}s)`}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}


          {/* ================= UI RATER VIEW ================= */}
          {view === 'ui-rater' && <UIRaterView navigateBack={navigateBack} triggerAlert={triggerAlert} />}

          {/* ================= SECURITY VIEW ================= */}
          {view === 'security' && <SecurityView navigateBack={navigateBack} triggerAlert={triggerAlert} />}

          {/* ================= REPOSITORIES VIEW ================= */}
          {view === 'repositories' && <RepositoriesView navigateBack={navigateBack} triggerAlert={triggerAlert} isLoggedIn={isLoggedIn} navigateTo={navigateTo} />}

          {/* ================= FILE EDITOR VIEW ================= */}
          {view === 'editor' && <FileEditorView navigateBack={navigateBack} triggerAlert={triggerAlert} isLoggedIn={isLoggedIn} navigateTo={navigateTo} />}

          {/* ================= GUIDE VIEW ================= */}
          {view === 'guide' && <GuideView navigateBack={navigateBack} />}
          {view === 'pricing' && (
            <div className="max-w-3xl mx-auto py-8 flex flex-col gap-8 font-mono text-xs">


              <div className="flex flex-col gap-2 border-b border-zinc-800 pb-4 text-center">
                <h1 className="text-3xl font-extrabold uppercase text-white font-mono">Transparent Pricing</h1>
                <p className="text-xs text-zinc-500">100% Free Forever under the open-source MIT License.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
                <div className="p-6 bg-zinc-950 border-2 border-purple-500/40 rounded flex flex-col justify-between gap-6 relative">
                  <div className="absolute -top-3 right-4 px-2 py-0.5 bg-purple-500 text-white font-bold text-[8px] uppercase tracking-widest rounded">
                    ACTIVE PLAN
                  </div>

                  <div className="flex flex-col gap-4">
                    <span className="text-[9px] text-purple-400 font-bold uppercase">[DEVELOPER_MIT]</span>
                    <h3 className="font-extrabold text-lg text-white uppercase">Synkron Open Source</h3>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      Self-host or run locally. Complete access to Ollama Cloud, Groq fallbacks, and real-time webhook parsing.
                    </p>

                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-extrabold text-white">$0</span>
                      <span className="text-zinc-500 text-[10px] uppercase">/ FREE FOREVER</span>
                    </div>

                    <ul className="flex flex-col gap-2.5 pt-4 border-t border-zinc-900 text-[10px] text-zinc-300">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-purple-400" />
                        <span>Unlimited self-healing files</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-purple-400" />
                        <span>Ollama gemma4 & Groq endpoints</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-purple-400" />
                        <span>Convex Reactive DB synchronization</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-purple-400" />
                        <span>Commercial Use Permitted</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => navigateTo('dashboard')}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase"
                  >
                    Deploy Locally Now
                  </button>
                </div>

                <div className="p-6 bg-zinc-950 border border-zinc-800 rounded flex flex-col justify-between gap-6">
                  <div className="flex flex-col gap-4">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">[ENTERPRISE_MIT]</span>
                    <h3 className="font-extrabold text-lg text-zinc-400 uppercase">Self-Hosted Teams</h3>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      Deploy inside private Virtual Private Clouds (VPC) with high-availability custom cluster scaling.
                    </p>

                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-extrabold text-zinc-400">$0</span>
                      <span className="text-zinc-500 text-[10px] uppercase">/ 100% FREE</span>
                    </div>

                    <ul className="flex flex-col gap-2.5 pt-4 border-t border-zinc-900 text-[10px] text-zinc-400">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-zinc-600" />
                        <span>Everything in Developer Plan</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-zinc-600" />
                        <span>Custom model fine-tuning support</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-zinc-600" />
                        <span>Multi-tenant organizational routing</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => navigateTo('about')}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-bold text-xs uppercase"
                  >
                    Read Setup Instructions
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* ================= ABOUT ENGINE VIEW ================= */}
          {view === 'about' && (
            <div className="max-w-4xl mx-auto py-8 flex flex-col gap-8 font-mono text-xs">

              {/* Dev Notice Banner */}
              <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-amber-400 font-mono uppercase tracking-wider">Development Mode Notice</p>
                  <p className="text-[10px] text-zinc-400 font-sans mt-0.5 leading-relaxed">SYNKRON is currently in active development. Some features may be incomplete, unstable, or require additional configuration. See the README for setup instructions.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold uppercase text-white tracking-tight">About SYNKRON Engine</h1>
                    <p className="text-[10px] text-zinc-500 font-sans">Self-Healing AI Documentation Platform — Full Technical Specification</p>
                  </div>
                </div>
              </div>

              {/* What is SYNKRON */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-4">
                <span className="text-[9px] font-bold text-purple-400 font-mono uppercase tracking-widest">[01] — WHAT IS SYNKRON</span>
                <p className="text-sm text-zinc-300 font-sans leading-relaxed font-light">
                  <strong className="text-white font-bold">SYNKRON</strong> is an open-source, AI-powered documentation engine that treats documentation as a <em>living artifact</em> — one that automatically stays in sync with your source code. Built for high-velocity engineering teams where documentation rot is a constant problem, SYNKRON connects to your GitHub repositories via secure webhooks, detects structural code changes using AST (Abstract Syntax Tree) analysis, and uses large language models to reconcile and regenerate documentation in real time.
                </p>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  Traditional documentation workflows break down the moment a developer renames a function, changes a parameter, or refactors a module. SYNKRON eliminates this problem entirely by making documentation self-healing — it detects the change, understands the intent, and updates the docs automatically, without any manual intervention.
                </p>
              </div>

              {/* How It Works — Full Pipeline */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-5">
                <span className="text-[9px] font-bold text-cyan-400 font-mono uppercase tracking-widest">[02] — HOW IT WORKS: THE FULL HEALING PIPELINE</span>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">Every heal cycle follows a deterministic 8-step pipeline from webhook receipt to documentation update:</p>
                <div className="flex flex-col gap-3">
                  {[
                    { n:'01', title:'GitHub Push Event', color:'text-purple-400', desc:'A developer pushes a commit to the tracked branch. GitHub sends a POST request to your SYNKRON webhook endpoint (/api/webhook) containing the full push payload including commit SHA, author, and list of modified files.' },
                    { n:'02', title:'HMAC-SHA256 Signature Verification', color:'text-cyan-400', desc:'Before processing anything, SYNKRON cryptographically verifies the webhook signature using your GITHUB_WEBHOOK_SECRET. Requests with invalid or missing signatures are rejected with HTTP 401. This prevents spoofed payloads from triggering heals.' },
                    { n:'03', title:'File Filtering', color:'text-emerald-400', desc:'The payload is parsed and only TypeScript, JavaScript, JSX, TSX, MJS, and CJS files are selected for healing. Binary files, images, config files, and lock files are ignored automatically.' },
                    { n:'04', title:'AST Snapshot Analysis', color:'text-yellow-400', desc:'Each modified file is parsed using a TypeScript-aware regex extractor that builds an AstSnapshot — a structured representation of all exported functions, classes, parameters, return types, and imports. A djb2 hash of the full source is computed for change detection.' },
                    { n:'05', title:'Differential Comparison', color:'text-orange-400', desc:'The new AstSnapshot is compared against the previously stored snapshot. If the hash matches, healing is skipped entirely (no AI call, no quota consumed). If structural changes are detected, a human-readable diff summary is generated: "Added function: processPayment()", "Changed return type of getUser(): User → User | null", etc.' },
                    { n:'06', title:'AI Reconciliation', color:'text-rose-400', desc:'The diff summary and existing documentation are sent to the AI pipeline. Primary: Ollama Cloud (gemma4:31b-cloud) with a hard 2000ms timeout. Fallback: Groq llama-3.1-8b-instant. The AI receives only the delta — not the full codebase — keeping prompts focused and costs minimal.' },
                    { n:'07', title:'Documentation Update', color:'text-purple-400', desc:'The AI returns updated Markdown documentation. SYNKRON stores it in the database alongside the new AstSnapshot, updates the heal count, records the model used and duration, and logs a HealEvent with trigger type (webhook/manual/scheduled).' },
                    { n:'08', title:'Embedding Generation', color:'text-cyan-400', desc:'If OpenAI is configured, a text-embedding-3-small vector is generated from the healed documentation and stored for semantic search. This enables natural language queries like "how does authentication work?" to return the exact relevant code block.' },
                  ].map(step => (
                    <div key={step.n} className="flex gap-4 p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                      <span className={`text-[10px] font-bold font-mono ${step.color} shrink-0 w-6 mt-0.5`}>{step.n}</span>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-white font-mono">{step.title}</span>
                        <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech Stack */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-4">
                <span className="text-[9px] font-bold text-emerald-400 font-mono uppercase tracking-widest">[03] — TECHNOLOGY STACK</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { layer:'Framework', tech:'Next.js 16 (App Router)', note:'All API routes run on Node.js runtime' },
                    { layer:'Database', tech:'Neon Serverless Postgres + Drizzle ORM', note:'Falls back to in-memory store without DATABASE_URL' },
                    { layer:'AI Primary', tech:'Groq llama-3.3-70b-versatile', note:'Fast inference, free tier available' },
                    { layer:'AI Fallback', tech:'OpenAI gpt-4o-mini', note:'Also used for vision (UI Rater) and embeddings' },
                    { layer:'Embeddings', tech:'OpenAI text-embedding-3-small', note:'Required for semantic search feature' },
                    { layer:'Real-time', tech:'Convex', note:'Activity logs, webhook queue, auth' },
                    { layer:'Auth', tech:'PBKDF2 + httpOnly session cookies', note:'100,000 iterations, SHA-256, 32-byte key' },
                    { layer:'Sidecars', tech:'Python, Rust, C#', note:'VM engine, AST analysis, shadow branching' },
                  ].map(row => (
                    <div key={row.layer} className="p-3 bg-zinc-900 border border-zinc-800 rounded flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase">{row.layer}</span>
                      <span className="text-[11px] font-bold text-white font-sans">{row.tech}</span>
                      <span className="text-[9px] text-zinc-500 font-sans">{row.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Models */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-4">
                <span className="text-[9px] font-bold text-yellow-400 font-mono uppercase tracking-widest">[04] — AI MODELS & CIRCUIT BREAKER</span>
                <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">SYNKRON uses a circuit-breaker pattern for AI calls. The primary model is attempted first with a hard timeout. On failure or timeout, the system immediately falls back to the secondary model — no user-visible delay.</p>
                <div className="flex flex-col gap-2">
                  <div className="p-3 bg-zinc-900 border border-emerald-500/20 rounded flex items-start gap-3">
                    <span className="text-[8px] font-bold text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0 mt-0.5">PRIMARY</span>
                    <div>
                      <p className="text-[11px] font-bold text-white">Groq — llama-3.3-70b-versatile</p>
                      <p className="text-[10px] text-zinc-400 font-sans">Used for documentation healing, PR descriptions, changelog generation, and security fix suggestions. Free tier available at console.groq.com.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-900 border border-zinc-700/30 rounded flex items-start gap-3">
                    <span className="text-[8px] font-bold text-zinc-400 font-mono bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded shrink-0 mt-0.5">FALLBACK</span>
                    <div>
                      <p className="text-[11px] font-bold text-white">OpenAI — gpt-4o-mini + gpt-4o (vision)</p>
                      <p className="text-[10px] text-zinc-400 font-sans">Fallback for text generation. gpt-4o is used exclusively for the UI Rater when screenshots are provided (vision capability required).</p>
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-900 border border-blue-500/20 rounded flex items-start gap-3">
                    <span className="text-[8px] font-bold text-blue-400 font-mono bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded shrink-0 mt-0.5">EMBEDDINGS</span>
                    <div>
                      <p className="text-[11px] font-bold text-white">OpenAI — text-embedding-3-small</p>
                      <p className="text-[10px] text-zinc-400 font-sans">Generates 1536-dimension vectors for semantic search. Stored as JSON-serialized float32 arrays. Cosine similarity used for ranking.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-4">
                <span className="text-[9px] font-bold text-rose-400 font-mono uppercase tracking-widest">[05] — FULL FEATURE LIST</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Continuous self-healing via GitHub webhooks',
                    'HMAC-SHA256 webhook signature validation',
                    'AST-based structural diff detection',
                    'AI quota system (7/week free, 50 pro, 500 enterprise)',
                    'Device fingerprint-based rate limiting',
                    'Semantic search with vector embeddings',
                    'Doc health scoring (0–100) with staleness tracking',
                    'Stale doc alerts with configurable threshold',
                    'Auto-generated CHANGELOG.md from heal events',
                    'UI/UX rating engine (6 dimensions, vision AI)',
                    'Security scanner (secrets, SQL injection, XSS)',
                    'AI-powered security fix suggestions',
                    'Shadow branching for safe fix application (C#)',
                    'In-browser file editor with GitHub commit',
                    'PR description auto-generation',
                    'Scheduled healing (cron, configurable interval)',
                    'Team workspaces with role-based access',
                    'Repository branch management',
                    'Access token management (hashed, scoped)',
                    'Session management (list, revoke per-device)',
                    'GDPR/CCPA data export (one-click JSON)',
                    'Email notifications (SMTP, heal/security/stale)',
                    'GitHub OAuth + email/password auth',
                    'Dark/light theme toggle',
                    'Live API playground (test every endpoint)',
                    'VM execution engine (register-based bytecode)',
                    'Assembly conversion sidecar (Python)',
                    'Native code analysis (Python AST engine)',
                    'Rust JIT compiler CLI',
                    'Doc export (HTML, Markdown ZIP, JSON)',
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-400 font-sans">
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Setup */}
              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-4">
                <span className="text-[9px] font-bold text-purple-400 font-mono uppercase tracking-widest">[06] — QUICK SETUP</span>
                <div className="flex flex-col gap-2">
                  {[
                    { cmd:'npm install', desc:'Install all dependencies' },
                    { cmd:'npx convex dev', desc:'Initialize Convex auth and real-time DB' },
                    { cmd:'npm run db:push', desc:'Sync Drizzle schema to Neon Postgres' },
                    { cmd:'npm run dev', desc:'Start the development server on :3000' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-zinc-900 border border-zinc-800 rounded">
                      <span className="text-[9px] text-zinc-600 font-mono w-4 shrink-0">{i+1}.</span>
                      <code className="text-[10px] text-cyan-300 font-mono flex-1">{s.cmd}</code>
                      <span className="text-[9px] text-zinc-500 font-sans">{s.desc}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                  Required env vars: <code className="text-zinc-300 font-mono">DATABASE_URL</code>, <code className="text-zinc-300 font-mono">GROQ_API_KEY</code>, <code className="text-zinc-300 font-mono">GITHUB_WEBHOOK_SECRET</code>. Optional: <code className="text-zinc-300 font-mono">OPENAI_API_KEY</code> (semantic search + UI rater), <code className="text-zinc-300 font-mono">GITHUB_CLIENT_ID/SECRET</code> (OAuth).
                </p>
              </div>

            </div>
          )}
{/* ================= PRIVACY POLICY VIEW ================= */}
          {view === 'privacy' && (
            <div className="max-w-4xl mx-auto py-8 flex flex-col gap-8 font-mono text-xs">

              <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold uppercase text-white tracking-tight">Privacy Policy</h1>
                    <p className="text-[10px] text-zinc-500 font-sans">Effective: May 8, 2026 · SYNKRON by Sonata Interactive</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">This policy applies to all users of SYNKRON, whether using the hosted version or self-hosting. By using SYNKRON, you agree to the data practices described here. If you disagree, please do not use the service.</p>
              </div>

              {[
                {
                  id:'01', color:'text-purple-400',
                  title:'What Data We Collect',
                  items:[
                    { h:'Account Information', b:'When you register, we collect your email address, username, full name, and a PBKDF2-hashed password (100,000 iterations, SHA-256). We never store plaintext passwords. If you sign in via GitHub OAuth, we collect your GitHub username, primary verified email, and avatar URL.' },
                    { h:'Repository Metadata', b:'When you connect a GitHub repository, we store the repository full name (owner/repo), the tracked branch, a generated webhook secret (stored in plaintext — treat it like a password), and timestamps of connection and last sync.' },
                    { h:'Source Code (Transient)', b:'When a webhook fires or you manually trigger a heal, the source code of modified files is sent to our API. This code is processed in-memory for AST analysis and passed to the AI provider. It is NOT permanently stored in our database. Only the generated documentation (Markdown) and AST snapshot are persisted.' },
                    { h:'Heal Events & Logs', b:'We store metadata about each heal operation: which file was healed, which AI model was used, how long it took, the trigger type (webhook/manual/scheduled), and the commit message. We do not store the raw source code in heal event logs.' },
                    { h:'Session Data', b:'We store session tokens (random UUIDs), device info (User-Agent string), IP address, and expiration time. Sessions expire after 24 hours. You can view and revoke all sessions from your Profile page.' },
                    { h:'AI Quota', b:'We track AI usage per device fingerprint (SHA-256 hash of IP + User-Agent + Accept-Language + optional canvas hash). This is used to enforce weekly limits. The raw IP is never stored — only the hash.' },
                    { h:'Activity Logs (Convex)', b:'If Convex is configured, we log user actions (login, profile update, doc view) with optional IP and device info. These logs are visible to you in the Tracking view and are used for security monitoring.' },
                  ]
                },
                {
                  id:'02', color:'text-cyan-400',
                  title:'How We Use Your Data',
                  items:[
                    { h:'Providing the Service', b:'Account data is used to authenticate you and associate repositories, heal events, and settings with your account. Session tokens are used to maintain your login state across requests.' },
                    { h:'AI Processing', b:'Source code sent to /api/heal or /api/webhook is forwarded to Groq or OpenAI for documentation generation. These providers have their own privacy policies. We send only the minimum necessary context (the diff, not the full codebase).' },
                    { h:'Security', b:'IP addresses and device info are used for rate limiting, session management, and detecting suspicious activity. We do not use this data for advertising or profiling.' },
                    { h:'Service Improvement', b:'Aggregated, anonymized usage statistics (number of heals, models used, error rates) may be used to improve the service. No individual user data is used for this purpose.' },
                  ]
                },
                {
                  id:'03', color:'text-emerald-400',
                  title:'Data Retention',
                  items:[
                    { h:'Account Data', b:'Retained until you delete your account. Deletion is permanent and immediate — all associated repositories, heal events, sessions, and doc files are cascade-deleted from the database.' },
                    { h:'Session Tokens', b:'Automatically expire after 24 hours. Expired sessions are not actively purged but are ignored by the validation logic. You can manually revoke all sessions from your Profile.' },
                    { h:'Heal Events & Doc Files', b:'Retained indefinitely while your account exists. Deleted when you disconnect a repository or delete your account.' },
                    { h:'AI Quota Records', b:'Reset every Monday at 00:00 UTC. Old quota records are not deleted but are ignored once the week rolls over.' },
                    { h:'Source Code', b:'Never persisted. Processed in-memory and discarded immediately after the heal operation completes.' },
                  ]
                },
                {
                  id:'04', color:'text-yellow-400',
                  title:'Third-Party Services',
                  items:[
                    { h:'Groq', b:'Your code diffs and documentation context are sent to Groq\'s API for AI processing. Groq\'s privacy policy applies: groq.com/privacy. We use the llama-3.3-70b-versatile model.' },
                    { h:'OpenAI', b:'Used for embeddings (text-embedding-3-small) and vision analysis (gpt-4o). OpenAI\'s privacy policy applies: openai.com/privacy. Screenshots uploaded to the UI Rater are sent to OpenAI.' },
                    { h:'Neon (Database)', b:'Your account data, repositories, and heal history are stored in a Neon Serverless Postgres database. Neon\'s privacy policy applies: neon.tech/privacy. Data is encrypted at rest and in transit.' },
                    { h:'Convex', b:'Activity logs and webhook queue data are stored in Convex. Convex\'s privacy policy applies: convex.dev/privacy.' },
                    { h:'GitHub', b:'When you connect a repository, SYNKRON interacts with the GitHub API to fetch file trees and validate repositories. GitHub\'s privacy policy applies: docs.github.com/site-policy/privacy-policies.' },
                  ]
                },
                {
                  id:'05', color:'text-rose-400',
                  title:'Your Rights (GDPR / CCPA)',
                  items:[
                    { h:'Right to Access', b:'You can export all your data at any time from Profile → Export Data. This generates a JSON file containing your account info, repositories, heal events, and session history.' },
                    { h:'Right to Deletion', b:'You can permanently delete your account from Profile → Danger Zone. This immediately and irreversibly deletes all your data from our systems.' },
                    { h:'Right to Rectification', b:'You can update your username and full name from Profile → Edit Profile at any time.' },
                    { h:'Right to Portability', b:'The data export (JSON) is machine-readable and can be imported into other systems.' },
                    { h:'Do Not Sell', b:'We do not sell, rent, or share your personal data with third parties for advertising or marketing purposes. Period.' },
                    { h:'Cookies', b:'We use a single httpOnly session cookie (synkron_session) for authentication. No tracking cookies, no analytics cookies, no third-party cookies.' },
                  ]
                },
                {
                  id:'06', color:'text-orange-400',
                  title:'Security Measures',
                  items:[
                    { h:'Password Hashing', b:'PBKDF2-HMAC-SHA256 with 100,000 iterations and a random 16-byte salt. Timing-safe comparison prevents timing attacks.' },
                    { h:'Session Tokens', b:'Cryptographically random UUIDs (two concatenated, 72 hex chars). Stored as httpOnly, Secure, SameSite=Lax cookies.' },
                    { h:'Webhook Validation', b:'HMAC-SHA256 signature verification using the Web Crypto API. Timing-safe comparison. Requests without valid signatures are rejected.' },
                    { h:'Transport Security', b:'All API communication uses HTTPS/TLS. Database connections use SSL. Convex uses TLS for all WebSocket connections.' },
                    { h:'Access Tokens', b:'Repository access tokens are hashed using PBKDF2 before storage. Only the first 12 characters (prefix) are stored in plaintext for display. The full token is shown only once at creation.' },
                  ]
                },
              ].map(section => (
                <div key={section.id} className="p-5 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-4">
                  <span className={`text-[9px] font-bold font-mono uppercase tracking-widest ${section.color}`}>[{section.id}] — {section.title}</span>
                  <div className="flex flex-col gap-3">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-white font-sans">{item.h}</span>
                        <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">{item.b}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] text-zinc-500 font-sans leading-relaxed">
                Questions about this policy? Open an issue on GitHub or contact us through the repository. This policy was last updated May 8, 2026 and applies to SYNKRON v1.0.0+.
              </div>

            </div>
          )}
{/* ================= TERMS & CONDITIONS VIEW ================= */}
          {view === 'terms' && (
            <div className="max-w-4xl mx-auto py-8 flex flex-col gap-8 font-mono text-xs">

              <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold uppercase text-white tracking-tight">Terms &amp; Conditions</h1>
                    <p className="text-[10px] text-zinc-500 font-sans">Last Updated: May 8, 2026 · SYNKRON by Sonata Interactive</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">By accessing or using SYNKRON — whether the hosted version, a self-hosted instance, or the source code — you agree to be bound by these Terms. If you do not agree, do not use the software.</p>
              </div>

              {[
                {
                  id:'01', color:'text-purple-400',
                  title:'License & Open Source',
                  items:[
                    { h:'MIT License', b:'SYNKRON is distributed under the MIT License. You are free to use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software for any purpose — commercial or non-commercial — provided the original copyright notice and this permission notice are included in all copies or substantial portions of the software.' },
                    { h:'Attribution', b:'You are not required to credit Sonata Interactive in your end product, but we appreciate it. If you fork or redistribute SYNKRON, you must retain the MIT license header in the source files.' },
                    { h:'No Trademark License', b:'The MIT License does not grant you rights to use the SYNKRON name, logo, or branding in a way that implies endorsement by Sonata Interactive. You may not use "SYNKRON" as the name of a competing product.' },
                    { h:'Contributions', b:'By submitting a pull request or contribution to the SYNKRON repository, you agree that your contribution is licensed under the same MIT License and that you have the right to grant this license.' },
                  ]
                },
                {
                  id:'02', color:'text-cyan-400',
                  title:'Acceptable Use',
                  items:[
                    { h:'Permitted Uses', b:'Using SYNKRON to document your own or your organization\'s codebase. Integrating SYNKRON into CI/CD pipelines. Self-hosting SYNKRON on your own infrastructure. Building products or services on top of SYNKRON\'s API.' },
                    { h:'Prohibited Uses', b:'You may not use SYNKRON to process code that you do not have the legal right to access. You may not use SYNKRON to generate documentation for malicious software, exploits, or illegal content. You may not attempt to reverse-engineer, circumvent, or abuse the AI quota system.' },
                    { h:'API Rate Limits', b:'The hosted SYNKRON service enforces weekly AI quotas: 7 calls/week (free), 50/week (pro), 500/week (enterprise). These limits exist to prevent abuse and ensure fair access. Attempting to circumvent these limits (e.g., by rotating device fingerprints) is a violation of these Terms.' },
                    { h:'Automated Abuse', b:'You may not deploy automated scripts that spam the /api/heal, /api/webhook, or /api/security/scan endpoints. Reasonable automation (e.g., CI/CD integration) is permitted. Unreasonable automation that degrades service for other users is not.' },
                  ]
                },
                {
                  id:'03', color:'text-emerald-400',
                  title:'AI-Generated Content',
                  items:[
                    { h:'No Accuracy Guarantee', b:'Documentation generated by SYNKRON\'s AI pipeline is provided as-is. The AI may make mistakes, misinterpret code intent, or generate inaccurate descriptions. You are responsible for reviewing and validating all AI-generated documentation before publishing or relying on it.' },
                    { h:'Not Professional Advice', b:'AI-generated content from SYNKRON does not constitute legal, security, financial, or professional advice. Security scan results and fix suggestions are informational only and should be reviewed by a qualified security professional.' },
                    { h:'Intellectual Property', b:'You retain full ownership of your source code and the documentation generated from it. SYNKRON does not claim any rights to your code or generated documentation. The AI models used (Groq, OpenAI) are subject to their respective providers\' terms regarding generated content.' },
                    { h:'Third-Party AI Terms', b:'By using SYNKRON, you also agree to the terms of the AI providers used: Groq (groq.com/terms) and OpenAI (openai.com/terms). SYNKRON sends your code diffs to these providers for processing.' },
                  ]
                },
                {
                  id:'04', color:'text-yellow-400',
                  title:'GitHub Integration',
                  items:[
                    { h:'Webhook Security', b:'You are responsible for keeping your GITHUB_WEBHOOK_SECRET secure. If your secret is compromised, rotate it immediately from the repository settings page. SYNKRON is not responsible for unauthorized webhook deliveries resulting from a leaked secret.' },
                    { h:'Repository Access', b:'SYNKRON only accesses repositories you explicitly connect. We do not scan, index, or access any repository you have not connected. File tree fetching uses the GitHub API with your provided Personal Access Token or anonymously for public repos.' },
                    { h:'GitHub API Rate Limits', b:'Unauthenticated GitHub API calls are limited to 60 requests/hour. Authenticated calls (with a PAT) are limited to 5,000/hour. SYNKRON proxies GitHub API calls server-side to protect your token. Excessive use may result in temporary GitHub API rate limiting.' },
                    { h:'GitHub Terms', b:'Your use of GitHub features through SYNKRON is also subject to GitHub\'s Terms of Service (docs.github.com/site-policy/github-terms/github-terms-of-service).' },
                  ]
                },
                {
                  id:'05', color:'text-rose-400',
                  title:'Disclaimers & Liability',
                  items:[
                    { h:'No Warranty', b:'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.' },
                    { h:'Limitation of Liability', b:'IN NO EVENT SHALL SONATA INTERACTIVE, THE AUTHORS, OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.' },
                    { h:'Development Status', b:'SYNKRON is currently in active development. Features may be incomplete, change without notice, or be removed entirely. The API surface is not yet stable. Do not use SYNKRON as the sole documentation system for mission-critical production systems without maintaining independent backups.' },
                    { h:'Data Loss', b:'While we take reasonable precautions, we cannot guarantee against data loss. You are responsible for maintaining backups of your documentation. SYNKRON\'s heal events and doc files are stored in your configured database — if the database is lost, the data is lost.' },
                    { h:'Downtime', b:'The hosted SYNKRON service may experience downtime for maintenance, updates, or unexpected failures. We do not guarantee any specific uptime SLA for the free tier.' },
                  ]
                },
                {
                  id:'06', color:'text-orange-400',
                  title:'Account & Termination',
                  items:[
                    { h:'Account Responsibility', b:'You are responsible for all activity that occurs under your account. Keep your password and session tokens secure. Log out of shared devices. Report any unauthorized access immediately.' },
                    { h:'Account Termination by You', b:'You may delete your account at any time from Profile → Danger Zone. Deletion is immediate and permanent. All your data is deleted from our systems within the same request.' },
                    { h:'Account Termination by Us', b:'We reserve the right to suspend or terminate accounts that violate these Terms, engage in abuse, or pose a security risk to other users. We will make reasonable efforts to notify you before termination unless the violation is severe.' },
                    { h:'Effect of Termination', b:'Upon termination, your right to use the service ceases immediately. All your data is deleted. Webhook secrets are invalidated. Any connected GitHub webhooks will continue to fire but will receive 401 responses.' },
                  ]
                },
                {
                  id:'07', color:'text-blue-400',
                  title:'Changes to These Terms',
                  items:[
                    { h:'Updates', b:'We may update these Terms from time to time. The "Last Updated" date at the top of this page will reflect the most recent revision. Continued use of SYNKRON after changes constitutes acceptance of the new Terms.' },
                    { h:'Notification', b:'For significant changes, we will make reasonable efforts to notify users (e.g., via a notice in the dashboard). However, it is your responsibility to review these Terms periodically.' },
                    { h:'Governing Law', b:'These Terms are governed by the laws of the jurisdiction in which Sonata Interactive operates, without regard to conflict of law principles. Any disputes shall be resolved through good-faith negotiation before resorting to formal legal proceedings.' },
                  ]
                },
              ].map(section => (
                <div key={section.id} className="p-5 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-4">
                  <span className={`text-[9px] font-bold font-mono uppercase tracking-widest ${section.color}`}>[{section.id}] — {section.title}</span>
                  <div className="flex flex-col gap-3">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-white font-sans">{item.h}</span>
                        <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">{item.b}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] text-zinc-500 font-sans leading-relaxed">
                These Terms were last updated May 8, 2026 and apply to SYNKRON v1.0.0+. For questions, open an issue on the GitHub repository. By using SYNKRON, you acknowledge that you have read, understood, and agree to be bound by these Terms.
              </div>

            </div>
          )}


          {/* ================= LOGIN VIEW ================= */}
          {view === 'login' && (
            <div className="max-w-md mx-auto py-8 flex flex-col gap-6 font-mono text-xs">


              <div className="text-center flex flex-col items-center gap-1">
                <h1 className="text-2xl font-bold uppercase text-white tracking-tight">Connect Account</h1>
                <p className="text-xs text-zinc-500">Log in via Convex secure database to manage connected repositories.</p>
              </div>

              <div className="p-6 bg-zinc-950 border border-zinc-800 rounded">
                <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Email Address</label>
                    <input
                      type="email"
                      placeholder="developer@example.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex items-start gap-2.5 p-2 bg-zinc-900 border border-zinc-800 rounded mt-1">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded border-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[10px] text-zinc-400 leading-normal font-sans font-light">
                      I agree to the simple <span onClick={() => navigateTo('terms')} className="text-purple-400 underline cursor-pointer font-bold">Terms of Use</span> and secure <span onClick={() => navigateTo('privacy')} className="text-purple-400 underline cursor-pointer font-bold">Privacy Policy</span>.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white font-bold text-xs transition-all mt-2 cursor-pointer uppercase"
                  >
                    Authenticate with Convex
                  </button>

                  <div className="relative flex items-center justify-center my-1.5">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800" /></div>
                    <span className="relative px-3 text-[9px] text-zinc-500 font-mono font-bold uppercase bg-zinc-950">Or Sync via GitHub</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.location.href = '/api/auth/github'}
                    className="w-full py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer uppercase hover:text-white"
                  >
                    <Github className="w-4 h-4" />
                    <span>Sign in with GitHub</span>
                  </button>
                </form>

                <p className="text-center text-[10px] text-zinc-500 mt-4 font-sans font-light">
                  Don't have an account? <span onClick={() => navigateTo('signup')} className="text-purple-400 underline cursor-pointer font-semibold">Sign Up here</span>.
                </p>
              </div>
            </div>
          )}


          {/* ================= SIGNUP VIEW ================= */}
          {view === 'signup' && (
            <div className="max-w-md mx-auto py-8 flex flex-col gap-6 font-mono text-xs">


              <div className="text-center flex flex-col items-center gap-1">
                <h1 className="text-2xl font-bold uppercase text-white tracking-tight">Register Connect</h1>
                <p className="text-xs text-zinc-500">Create a free local account synced with Convex Cloud.</p>
              </div>

              <div className="p-6 bg-zinc-950 border border-zinc-800 rounded">
                <form onSubmit={handleSignupSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Jane Developer"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Email Address</label>
                    <input
                      type="email"
                      placeholder="developer@example.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Developer Username</label>
                    <input
                      type="text"
                      placeholder="e.g. jane-dev (lowercase, no spaces)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Password (min 8 chars)</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-white focus:outline-none"
                      required
                    />
                  </div>

                  {/* Agree Checkbox */}
                  <div className="flex items-start gap-2.5 p-2 bg-zinc-900 border border-zinc-800 rounded mt-1">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded border-zinc-800 text-purple-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[10px] text-zinc-400 leading-normal font-sans font-light">
                      I agree to the simple <span onClick={() => navigateTo('terms')} className="text-purple-400 underline cursor-pointer font-bold">Terms of Use</span> and secure <span onClick={() => navigateTo('privacy')} className="text-purple-400 underline cursor-pointer font-bold">Privacy Policy</span>.
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white font-bold text-xs transition-all mt-2 cursor-pointer uppercase"
                  >
                    Register via Convex
                  </button>
                </form>

                <p className="text-center text-[10px] text-zinc-500 mt-4 font-sans font-light">
                  Already have an account? <span onClick={() => navigateTo('login')} className="text-purple-400 underline cursor-pointer font-semibold">Login here</span>.
                </p>
              </div>
            </div>
          )}

          {/* ================= TEAMS VIEW ================= */}
          {view === 'teams' && (
            <div className="max-w-3xl mx-auto py-6 flex flex-col gap-6 font-mono text-xs">

              <div className="flex flex-col gap-1 border-b border-zinc-800 pb-4">
                <h1 className="text-2xl font-bold uppercase text-white font-mono">Team Workspaces</h1>
                <span className="text-[10px] text-zinc-500">Collaborate on repositories with role-based access control.</span>
              </div>

              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                <span className="text-[9px] font-bold text-zinc-500 uppercase">[CREATE_TEAM]</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Team name (e.g. Frontend Squad)"
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none"
                    id="team-name-input"
                  />
                  <button
                    onClick={async () => {
                      const input = document.getElementById('team-name-input') as HTMLInputElement;
                      const name = input?.value?.trim();
                      if (!name) { triggerAlert('warning', 'Name Required', 'Enter a team name.'); return; }
                      try {
                        const res = await fetch('/api/teams', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          triggerAlert('success', 'Team Created', `Team "${name}" has been created.`);
                          input.value = '';
                        } else {
                          triggerAlert('error', 'Failed', data.error || 'Could not create team.');
                        }
                      } catch (err: any) {
                        triggerAlert('error', 'Error', err.message);
                      }
                    }}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase cursor-pointer"
                  >
                    Create Team
                  </button>
                </div>
              </div>

              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                <span className="text-[9px] font-bold text-zinc-500 uppercase">[TEAM_ROLES]</span>
                <div className="grid grid-cols-3 gap-3">
                  {['owner', 'editor', 'viewer'].map(role => (
                    <div key={role} className="p-3 bg-zinc-900/40 border border-zinc-800 rounded flex flex-col gap-1.5 text-center">
                      <span className={`text-[10px] font-bold uppercase ${role === 'owner' ? 'text-purple-400' : role === 'editor' ? 'text-cyan-400' : 'text-zinc-400'}`}>{role}</span>
                      <p className="text-[9px] text-zinc-500 font-sans">
                        {role === 'owner' ? 'Full access, manage members, delete team' :
                          role === 'editor' ? 'Edit code, trigger heals, manage docs' :
                            'View docs and heal history only'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= CHANGELOG VIEW ================= */}
          {view === 'changelog' && (
            <div className="max-w-3xl mx-auto py-6 flex flex-col gap-6 font-mono text-xs">

              <div className="flex flex-col gap-1 border-b border-zinc-800 pb-4">
                <h1 className="text-2xl font-bold uppercase text-white font-mono">Changelog</h1>
                <span className="text-[10px] text-zinc-500">Auto-generated from heal events and commit messages.</span>
              </div>

              <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
                <button
                  onClick={handleLoadChangelog}
                  disabled={isLoadingChangelog}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600/20 border border-teal-500/30 text-teal-400 font-bold text-[10px] uppercase hover:bg-teal-600/40 cursor-pointer disabled:opacity-50 w-fit"
                >
                  {isLoadingChangelog ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Bookmark className="w-3 h-3" />}
                  <span>{isLoadingChangelog ? 'Generating...' : 'Generate Changelog'}</span>
                </button>

                {changelogContent ? (
                  <pre className="p-4 bg-zinc-900/40 rounded text-[11px] font-mono text-zinc-300 overflow-y-auto max-h-[500px] leading-relaxed border border-zinc-800 whitespace-pre-wrap">
                    {changelogContent}
                  </pre>
                ) : (
                  <p className="text-[10px] text-zinc-500 font-sans">Click "Generate Changelog" to build from your heal history.</p>
                )}
              </div>
            </div>
          )}

          {/* ================= CORE ENGINE VIEW (SYN-CORE JIT RUNTIME) ================= */}
          {view === 'engine' && (
            <div className="flex flex-col gap-4 py-4 animate-in slide-in-from-bottom-8 duration-500 max-w-7xl mx-auto w-full">
              <div className="flex flex-col gap-1 border-b border-zinc-800 pb-6 mb-2">
                <h1 className="text-2xl font-extrabold uppercase tracking-widest text-white font-mono">SYN-KRONOS CORE</h1>
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block animate-pulse"/> 
                  Proprietary High-Performance JIT Optimization Workspace
                </p>
              </div>
              <EngineView />
            </div>
          )}

          {/* ================= GITHUB DEEP VIEW PAGE ================= */}
          {view === 'github' && (
            <div className="flex flex-col gap-4 py-4 animate-in slide-in-from-bottom-8 duration-500 max-w-7xl mx-auto w-full">
              <GitHubDeepView triggerAlert={triggerAlert} />
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-10 px-6 text-center text-xs text-zinc-500 bg-zinc-950 mt-12 relative z-10 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5 text-[10px] flex-wrap justify-center">
            <span className="font-bold text-zinc-400 uppercase">Synkron Dev console</span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            <span onClick={() => navigateTo('guide')} className="hover:text-white cursor-pointer transition-colors text-purple-400 font-semibold">[How It Works]</span>
            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span onClick={() => navigateTo('about')} className="hover:text-white cursor-pointer transition-colors">About Engine</span>
            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span onClick={() => navigateTo('pricing')} className="hover:text-white cursor-pointer transition-colors">Pricing</span>
            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span onClick={() => navigateTo('privacy')} className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
            <span onClick={() => navigateTo('terms')} className="hover:text-white cursor-pointer transition-colors">Terms & Conditions</span>
          </div>
          <p className="flex items-center gap-1 font-sans font-light">
            Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" /> by Sonata Interactive. Open-source & Free.
          </p>
        </div>
      </footer>
    </div>
  );
}
