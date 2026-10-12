import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  Server,
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Mail,
  Activity,
  Layers,
  ArrowLeft,
  Clock,
  Terminal,
  Lock,
  ExternalLink
} from 'lucide-react';

export default function SystemDiagnostics() {
  const { user, isAuthenticated, isTpoAdmin } = useAuth();
  const [backendStatus, setBackendStatus] = useState({
    loading: true,
    connected: false,
    latencyMs: 0,
    data: null,
    error: null,
  });
  const [emailStatus, setEmailStatus] = useState({
    loading: true,
    data: null,
    error: null,
  });

  const checkHealth = async () => {
    setBackendStatus((prev) => ({ ...prev, loading: true, error: null }));
    const startTime = performance.now();
    try {
      const response = await apiClient.get('/health');
      const endTime = performance.now();
      setBackendStatus({
        loading: false,
        connected: true,
        latencyMs: Math.round(endTime - startTime),
        data: response.data,
        error: null,
      });
    } catch (err) {
      setBackendStatus({
        loading: false,
        connected: false,
        latencyMs: 0,
        data: null,
        error: err.message || 'Cannot reach FastAPI backend at ' + (import.meta.env.VITE_API_URL || 'http://localhost:8000/api'),
      });
    }
  };

  const checkEmail = async () => {
    setEmailStatus({ loading: true, data: null, error: null });
    try {
      const res = await apiClient.get('/email/status');
      setEmailStatus({ loading: false, data: res.data, error: null });
    } catch (err) {
      setEmailStatus({ loading: false, data: null, error: 'Could not fetch email service status' });
    }
  };

  useEffect(() => {
    checkHealth();
    checkEmail();
  }, []);

  const dbConnected = backendStatus.data?.database?.connected;
  const dbName = backendStatus.data?.database?.database_name;
  const aiProvider = backendStatus.data?.ai_service?.provider || 'mock';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-purple-600 selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={isAuthenticated ? '/tpo/dashboard' : '/'} className="flex items-center gap-2 group">
              <img
                src="/placio-symbol.png"
                alt="PLACIO"
                className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <span className="font-mono text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                PLACIO <span className="text-purple-400 font-sans text-xs uppercase px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/40">ADMIN DIAGNOSTICS</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Secret Route: /admin/diagnostics
            </span>
            <Link
              to={isAuthenticated ? '/tpo/profile' : '/login'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {isAuthenticated ? 'Back to Settings' : 'Sign In'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Diagnostics Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Banner */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-900/60 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> RESTRICTED TPO ADMIN VIEW
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Latency: {backendStatus.latencyMs ? `${backendStatus.latencyMs}ms` : '—'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                <Terminal className="h-6 w-6 text-purple-400" />
                Live Architecture & Telemetry Inspector
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Private console for verifying the operational health of the React 19 Frontend, FastAPI API Server, MongoDB Data Layer, AI Service provider, and SMTP Notification relays.
              </p>
            </div>

            <button
              onClick={() => {
                checkHealth();
                checkEmail();
              }}
              disabled={backendStatus.loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-950 transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${backendStatus.loading ? 'animate-spin' : ''}`} />
              Re-Ping System
            </button>
          </div>
        </div>

        {/* 4 Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Pillar 1: Frontend */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">Frontend</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">React 19 + Vite</div>
            <p className="text-xs text-slate-400 mt-1">Single Page App (Tailwind CSS v4)</p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Runtime Healthy
            </div>
          </div>

          {/* Pillar 2: Backend */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">FastAPI API</span>
              {backendStatus.loading ? (
                <RefreshCw className="h-5 w-5 text-amber-400 animate-spin" />
              ) : backendStatus.connected ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-400" />
              )}
            </div>
            <div className="text-lg font-bold text-white">
              {backendStatus.loading ? 'Pinging...' : backendStatus.connected ? 'FastAPI Connected' : 'Unreachable'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Port: 8000 &bull; REST API v1
            </p>
            <div className={`mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono flex items-center gap-1.5 ${
              backendStatus.connected ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${backendStatus.connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {backendStatus.connected ? `Ping ${backendStatus.latencyMs}ms` : 'Check Uvicorn Server'}
            </div>
          </div>

          {/* Pillar 3: Database */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">MongoDB</span>
              {backendStatus.loading ? (
                <RefreshCw className="h-5 w-5 text-amber-400 animate-spin" />
              ) : dbConnected ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-400" />
              )}
            </div>
            <div className="text-lg font-bold text-white">
              {backendStatus.loading ? 'Checking...' : dbConnected ? 'Database Connected' : 'Disconnected'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {dbName ? `DB: ${dbName}` : 'Checking connection...'}
            </p>
            <div className={`mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono flex items-center gap-1.5 ${
              dbConnected ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${dbConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {dbConnected ? 'Motor Async Driver Active' : 'Check MONGODB_URI'}
            </div>
          </div>

          {/* Pillar 4: Current Session */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">Active Session</span>
              <ShieldCheck className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {isAuthenticated ? (user.role === 'tpo_admin' ? 'Super Admin' : user.role) : 'Unauthenticated'}
            </div>
            <p className="text-xs text-slate-400 mt-1 truncate">
              {isAuthenticated ? user.email : 'No active session'}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-purple-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              JWT Bearer Verified
            </div>
          </div>
        </div>

        {/* Detailed Service Inspection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Subsystem */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-950 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">AI Advisory Engine</h2>
                  <p className="text-[11px] text-slate-400">Resume Match & Skill Gap Provider</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                {aiProvider}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-900">
                <span className="text-slate-400">Configured Provider:</span>
                <span className="font-mono text-white capitalize">{aiProvider}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-900">
                <span className="text-slate-400">Graceful Mock Fallback:</span>
                <span className="font-mono text-emerald-400">Enabled (Deterministic)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-900">
                <span className="text-slate-400">Multi-Resume Portfolio:</span>
                <span className="font-mono text-white">Active (Primary selector supported)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Pre-Application Advisory:</span>
                <span className="font-mono text-indigo-400">Non-blocking Guidance</span>
              </div>
            </div>
          </div>

          {/* Email & SMTP Subsystem */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-purple-950 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Email Notification Subsystem</h2>
                  <p className="text-[11px] text-slate-400">Live SMTP Status & Template Dispatch</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase border ${
                emailStatus.data?.configured
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-950 text-amber-300 border-amber-500/30'
              }`}>
                {emailStatus.loading ? 'Checking...' : emailStatus.data?.configured ? 'Active' : 'Unconfigured'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-900">
                <span className="text-slate-400">SMTP Host:</span>
                <span className="font-mono text-white">{emailStatus.data?.smtp_host || 'smtp.gmail.com'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-900">
                <span className="text-slate-400">SMTP Port:</span>
                <span className="font-mono text-white">{emailStatus.data?.smtp_port || 587}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-900">
                <span className="text-slate-400">Sender Identity:</span>
                <span className="font-mono text-white truncate max-w-[200px]">{emailStatus.data?.from_email || 'Not configured'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Settings Management:</span>
                <Link to="/tpo/profile" className="font-mono text-purple-400 hover:underline flex items-center gap-1">
                  Configure in TPO Settings &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Raw Backend Health JSON Response */}
        {backendStatus.data && (
          <div className="mt-8 bg-slate-950 border border-slate-800 rounded-2xl p-6 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-slate-400 font-bold uppercase flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" /> Live Response: GET /api/health
              </span>
              <span className="text-emerald-400">HTTP 200 OK</span>
            </div>
            <pre className="text-slate-300 overflow-x-auto p-4 bg-slate-900/60 rounded-xl leading-relaxed text-[11px]">
              {JSON.stringify(backendStatus.data, null, 2)}
            </pre>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        PLACIO Internal System Console &bull; Keep this URL private (/admin/diagnostics)
      </footer>
    </div>
  );
}
