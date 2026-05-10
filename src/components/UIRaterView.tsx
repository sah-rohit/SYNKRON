'use client';
import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Link, X, Sparkles, RefreshCw, Star, AlertCircle, CheckCircle, Zap, ChevronRight } from 'lucide-react';

interface Dimension {
  name: string;
  score: number;
  grade: string;
  summary: string;
  issues: string[];
  suggestions: string[];
}

interface RatingResult {
  overallScore: number;
  overallGrade: string;
  headline: string;
  dimensions: Dimension[];
  topStrengths: string[];
  criticalIssues: string[];
  quickWins: string[];
  modelUsed: string;
  analyzedAt: string;
}

function GradeColor(grade: string) {
  if (grade.startsWith('A')) return 'text-emerald-400';
  if (grade.startsWith('B')) return 'text-cyan-400';
  if (grade.startsWith('C')) return 'text-yellow-400';
  return 'text-rose-400';
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-cyan-500' : score >= 40 ? 'bg-yellow-500' : 'bg-rose-500';
  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
    </div>
  );
}

export default function UIRaterView({ navigateBack, triggerAlert }: {
  navigateBack: () => void;
  triggerAlert: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}) {
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<RatingResult | null>(null);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const FOCUS_OPTIONS = ['Accessibility', 'Mobile', 'Dark Mode', 'Typography', 'Color Contrast', 'Navigation'];

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 5 - screenshots.length;
    const toAdd = Array.from(files).slice(0, remaining);
    toAdd.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) { triggerAlert('warning', 'File Too Large', `${file.name} exceeds 5MB.`); return; }
      const reader = new FileReader();
      reader.onloadend = () => setScreenshots(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (!screenshots.length && !url && !description) {
      triggerAlert('warning', 'Nothing to Analyze', 'Add screenshots, a URL, or a description first.');
      return;
    }
    setIsAnalyzing(true);
    setResult(null);
    try {
      const res = await fetch('/api/ui-rater', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshots, url: url || undefined, description: description || undefined, focusAreas }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Analysis failed');
      setResult(data.rating);
      triggerAlert('success', 'Analysis Complete', `Overall score: ${data.rating.overallScore}/100 (${data.rating.overallGrade})`);
    } catch (err: any) {
      triggerAlert('error', 'Analysis Failed', err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 flex flex-col gap-6 font-mono text-xs">

      <div className="flex flex-col gap-1 border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold uppercase text-white">UI Rater</h1>
        <span className="text-[10px] text-zinc-500 font-sans">Upload screenshots or provide a URL. AI rates your UI across 6 dimensions with actionable feedback.</span>
      </div>

      {/* Input Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Screenshot Upload */}
        <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
          <span className="text-[9px] font-bold text-zinc-500 uppercase">[01_SCREENSHOTS] {screenshots.length}/5</span>

          <div
            className="border-2 border-dashed border-zinc-700 rounded p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-purple-500/50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          >
            <Upload className="w-6 h-6 text-zinc-500" />
            <p className="text-[10px] text-zinc-400 text-center font-sans">Drop screenshots here or click to upload<br /><span className="text-zinc-600">PNG, JPG, WebP · max 5MB each · up to 5 files</span></p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />

          {screenshots.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {screenshots.map((s, i) => (
                <div key={i} className="relative group">
                  <img src={s} alt={`Screenshot ${i + 1}`} className="w-full h-16 object-cover rounded border border-zinc-800" />
                  <button
                    onClick={() => setScreenshots(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 p-0.5 bg-zinc-900/90 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-rose-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* URL + Description */}
        <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
          <span className="text-[9px] font-bold text-zinc-500 uppercase">[02_CONTEXT]</span>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-zinc-500 font-bold uppercase">Website URL (optional)</label>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-2">
              <Link className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="url"
                placeholder="https://your-website.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white focus:outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-zinc-500 font-bold uppercase">Description (optional)</label>
            <textarea
              placeholder="What does this website do? Who is the target audience? Any specific concerns?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none resize-none placeholder:text-zinc-600 font-sans"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] text-zinc-500 font-bold uppercase">Focus Areas</label>
            <div className="flex flex-wrap gap-1.5">
              {FOCUS_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setFocusAreas(prev => prev.includes(opt) ? prev.filter(f => f !== opt) : [...prev, opt])}
                  className={`px-2 py-0.5 text-[9px] font-bold border rounded transition-all cursor-pointer ${focusAreas.includes(opt) ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-white'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="mt-auto py-2.5 bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Analyzing UI...</span></> : <><Sparkles className="w-3.5 h-3.5" /><span>Analyze UI</span></>}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-6">
          {/* Overall Score */}
          <div className="p-6 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase">[OVERALL RATING]</span>
                <p className="text-sm text-zinc-300 font-sans leading-relaxed max-w-xl">{result.headline}</p>
                <span className="text-[9px] text-zinc-600 font-sans mt-1">Analyzed by {result.modelUsed} · {new Date(result.analyzedAt).toLocaleString()}</span>
              </div>
              <div className="flex flex-col items-center shrink-0">
                <span className={`text-5xl font-black ${GradeColor(result.overallGrade)}`}>{result.overallGrade}</span>
                <span className="text-[10px] text-zinc-500">{result.overallScore}/100</span>
              </div>
            </div>
            <ScoreBar score={result.overallScore} />
          </div>

          {/* Dimensions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.dimensions.map(dim => (
              <div
                key={dim.name}
                className="p-4 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-3 cursor-pointer hover:border-zinc-700 transition-colors"
                onClick={() => setExpandedDim(expandedDim === dim.name ? null : dim.name)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">{dim.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-black ${GradeColor(dim.grade)}`}>{dim.grade}</span>
                    <ChevronRight className={`w-3 h-3 text-zinc-600 transition-transform ${expandedDim === dim.name ? 'rotate-90' : ''}`} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{dim.score}</span>
                  <span className="text-[9px] text-zinc-600">/100</span>
                </div>
                <ScoreBar score={dim.score} />
                <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">{dim.summary}</p>

                {expandedDim === dim.name && (
                  <div className="flex flex-col gap-3 pt-3 border-t border-zinc-800">
                    {dim.issues.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-bold text-rose-400 uppercase flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" />Issues</span>
                        {dim.issues.map((issue, i) => <p key={i} className="text-[9px] text-zinc-400 font-sans leading-relaxed pl-3 border-l border-rose-500/30">{issue}</p>)}
                      </div>
                    )}
                    {dim.suggestions.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-bold text-emerald-400 uppercase flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5" />Suggestions</span>
                        {dim.suggestions.map((s, i) => <p key={i} className="text-[9px] text-zinc-400 font-sans leading-relaxed pl-3 border-l border-emerald-500/30">{s}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Strengths / Issues / Quick Wins */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-950 border border-emerald-500/20 rounded flex flex-col gap-3">
              <span className="text-[9px] font-bold text-emerald-400 uppercase flex items-center gap-1.5"><Star className="w-3 h-3" />Top Strengths</span>
              {result.topStrengths.map((s, i) => <p key={i} className="text-[10px] text-zinc-300 font-sans leading-relaxed pl-2 border-l-2 border-emerald-500/40">{s}</p>)}
            </div>
            <div className="p-4 bg-zinc-950 border border-rose-500/20 rounded flex flex-col gap-3">
              <span className="text-[9px] font-bold text-rose-400 uppercase flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />Critical Issues</span>
              {result.criticalIssues.length ? result.criticalIssues.map((s, i) => <p key={i} className="text-[10px] text-zinc-300 font-sans leading-relaxed pl-2 border-l-2 border-rose-500/40">{s}</p>) : <p className="text-[10px] text-zinc-500 font-sans">No critical issues found.</p>}
            </div>
            <div className="p-4 bg-zinc-950 border border-cyan-500/20 rounded flex flex-col gap-3">
              <span className="text-[9px] font-bold text-cyan-400 uppercase flex items-center gap-1.5"><Zap className="w-3 h-3" />Quick Wins</span>
              {result.quickWins.map((s, i) => <p key={i} className="text-[10px] text-zinc-300 font-sans leading-relaxed pl-2 border-l-2 border-cyan-500/40">{s}</p>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
