"use client";

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { Activity, Shield, Clock, Monitor, AlertTriangle } from 'lucide-react';

interface LocalLog {
  action: string;
  _creationTime: number;
  ipAddress?: string;
  deviceInfo?: string;
}

class ConvexErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <LocalTrackingFallback />;
    }
    return this.props.children;
  }
}

function LocalTrackingFallback() {
  const [logs, setLogs] = useState<LocalLog[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('ostinato_local_logs');
    if (saved) {
      setLogs(JSON.parse(saved));
    } else {
      const initialLogs = [
        { action: "fallback_offline_audit_active", _creationTime: Date.now() - 5000, ipAddress: "127.0.0.1", deviceInfo: navigator.userAgent },
        { action: "convex_sync_uninitialized", _creationTime: Date.now() - 15000, ipAddress: "127.0.0.1", deviceInfo: "Ostinato Sandbox" }
      ];
      setLogs(initialLogs);
      localStorage.setItem('ostinato_local_logs', JSON.stringify(initialLogs));
    }
  }, []);

  const addLocalLog = (action: string) => {
    const newLog: LocalLog = {
      action,
      _creationTime: Date.now(),
      ipAddress: "127.0.0.1",
      deviceInfo: navigator.userAgent
    };
    const updated = [newLog, ...logs].slice(0, 50);
    setLogs(updated);
    localStorage.setItem('ostinato_local_logs', JSON.stringify(updated));
  };

  return (
    <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-white uppercase">[OFFLINE_TRACKING_RECORD]</span>
        </div>
        <span className="text-[9px] text-amber-500 font-bold uppercase flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Offline Fallback
        </span>
      </div>
      <p className="text-[10px] text-zinc-400 font-sans">
        Convex DB is offline or not yet synchronized (`npx convex dev` required). Displaying persistent offline activity log via LocalStorage.
      </p>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
        {logs.map((log, i) => (
          <div key={i} className="p-3 bg-zinc-900/40 border border-zinc-800 rounded flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500/20 group-hover:bg-amber-500/50 transition-colors" />
            <div className="flex items-center justify-between ml-2">
              <span className="text-[10px] font-bold text-white uppercase font-mono flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-amber-400" />
                {log.action.replace(/_/g, ' ')}
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">
                {new Date(log._creationTime).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3 ml-2 text-[9px] text-zinc-400 font-mono">
              {log.ipAddress && (
                <span className="flex items-center gap-1 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">
                  <Monitor className="w-2.5 h-2.5" />
                  {log.ipAddress}
                </span>
              )}
              {log.deviceInfo && (
                <span className="truncate max-w-[200px]" title={log.deviceInfo}>
                  {log.deviceInfo}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => addLocalLog("manual_offline_security_audit")}
        className="mt-2 flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-400 font-bold text-[10px] uppercase hover:bg-amber-600/40 cursor-pointer transition-all"
      >
        <Activity className="w-3 h-3" />
        <span>Trigger Offline Audit Check</span>
      </button>
    </div>
  );
}

function ConvexTrackingRecordView() {
  const logs = useQuery("tracking:getUserLogs" as any);
  const logActivity = useMutation("tracking:logActivity" as any);

  useEffect(() => {
    logActivity({
      action: "viewed_tracking_records",
      metadata: { page: "profile_tracking" },
      deviceInfo: navigator.userAgent,
    }).catch(() => {});
  }, [logActivity]);

  return (
    <div className="p-5 bg-zinc-950 border border-zinc-800 rounded flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white uppercase">[CONVEX_TRACKING_RECORD]</span>
        </div>
        <span className="text-[9px] text-zinc-500 font-bold uppercase">Real-Time Sync</span>
      </div>
      <p className="text-[10px] text-zinc-400 font-sans">
        Real-time account activity tracking via Convex DB. Provides comprehensive audit trails for security and account handling.
      </p>

      {logs === undefined ? (
        <div className="flex items-center gap-2 p-3 bg-zinc-900/60 border border-zinc-800 rounded animate-pulse">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] text-zinc-400 font-mono">Syncing records...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 p-3 bg-zinc-900/60 border border-zinc-800 rounded">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] text-zinc-400 font-mono">No tracking records found yet.</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {logs.map((log: any, i: number) => (
            <div key={i} className="p-3 bg-zinc-900/40 border border-zinc-800 rounded flex flex-col gap-2 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500/20 group-hover:bg-purple-500/50 transition-colors" />
              <div className="flex items-center justify-between ml-2">
                <span className="text-[10px] font-bold text-white uppercase font-mono flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  {log.action.replace(/_/g, ' ')}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">
                  {new Date(log._creationTime).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3 ml-2 text-[9px] text-zinc-400 font-mono">
                {log.ipAddress && (
                  <span className="flex items-center gap-1 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">
                    <Monitor className="w-2.5 h-2.5" />
                    {log.ipAddress}
                  </span>
                )}
                {log.deviceInfo && (
                  <span className="truncate max-w-[200px]" title={log.deviceInfo}>
                    {log.deviceInfo}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => {
          logActivity({
            action: "manual_security_audit_check",
            metadata: { trigger: "user_button" },
            deviceInfo: navigator.userAgent,
          }).catch(() => {});
        }}
        className="mt-2 flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 font-bold text-[10px] uppercase hover:bg-purple-600/40 cursor-pointer transition-all"
      >
        <Activity className="w-3 h-3" />
        <span>Trigger Manual Audit Sync</span>
      </button>
    </div>
  );
}

export default function TrackingRecordView() {
  return (
    <ConvexErrorBoundary>
      <ConvexTrackingRecordView />
    </ConvexErrorBoundary>
  );
}
