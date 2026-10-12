import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Building2,
  Sparkles,
  ShieldCheck,
  Calendar,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  ArrowRight,
  LogIn,
  UserPlus,
  LayoutDashboard,
  Briefcase,
  Layers,
  Award,
  Terminal
} from 'lucide-react';

export default function Home() {
  const { user, isAuthenticated, isTpoAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src="/placio-symbol.png"
                alt="PLACIO"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg text-slate-900 tracking-tight">
                  PLACIO
                </span>
                <span className="text-[9px] font-bold tracking-wider text-purple-600 bg-purple-50 px-1 py-0.5 rounded border border-purple-200/60 uppercase">
                  Portal
                </span>
                <span className="hidden sm:block text-[9px] text-slate-400 font-medium tracking-tight ml-1">
                  • TRAIN • APPLY • GET PLACED
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <Link
                to={isTpoAdmin ? '/tpo/dashboard' : '/student/dashboard'}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Go to {isTpoAdmin ? 'TPO' : 'Student'} Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Student Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 w-full flex-1">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            Centralized Campus Placement & Training Intelligence
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-5">
            Train &bull; Apply &bull; Get Placed With{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600">
              PLACIO
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-8 max-w-2xl mx-auto">
            A centralized digital recruitment ecosystem for universities and colleges. Automate eligibility verification, schedule multi-round interviews with email alerts, provide AI resume feedback, and manage candidate progression seamlessly.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isAuthenticated ? (
              <Link
                to={isTpoAdmin ? '/tpo/dashboard' : '/student/dashboard'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all cursor-pointer"
              >
                <LayoutDashboard className="h-4 w-4" />
                Open My Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In to Portal
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs transition-all cursor-pointer"
                >
                  <UserPlus className="h-4 w-4 text-indigo-600" />
                  Register as Student
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Card 1: Students */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">For Students</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Explore active placement opportunities, check transparent eligibility with one click, manage multiple resume versions, and receive scheduled interview email reminders.
            </p>
            <ul className="text-xs text-slate-500 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Transparent eligibility criteria explanation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                AI-assisted resume relevance scoring
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Real-time interview alerts & schedule view
              </li>
            </ul>
          </div>

          {/* Card 2: TPO Officers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-purple-300 hover:shadow-md transition-all">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">For Placement Officers</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Configure multi-batch eligible drives, perform bulk applicant status updates, schedule interviews with automated candidate emails, and export clean Excel reports.
            </p>
            <ul className="text-xs text-slate-500 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Multi-batch passing year recruitment drives
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Bulk status progression mode
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                One-click interview email dispatch
              </li>
            </ul>
          </div>

          {/* Card 3: Placement Directors & Administration */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Super Admin Governance</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Complete oversight with staff management, custom officer designations, dynamic department & course catalogs, student bulk Excel imports, and real-time placement analytics.
            </p>
            <ul className="text-xs text-slate-500 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Placement cell team & role delegation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Official academic course catalog management
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Recharts funnel & placement rate insights
              </li>
            </ul>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs mb-12">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Enterprise Recruitment Architecture
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Built with industry best practices, deterministic business logic, and high security.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-2xl font-black text-indigo-600 mb-1">100%</div>
              <div className="text-xs font-bold text-slate-800">Rule-Based</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Zero bias eligibility engine</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-2xl font-black text-purple-600 mb-1">AI</div>
              <div className="text-xs font-bold text-slate-800">Advisory Review</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Resume feedback & match score</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-2xl font-black text-emerald-600 mb-1">.xlsx</div>
              <div className="text-xs font-bold text-slate-800">Excel Export</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Production OpenPyXL rosters</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-2xl font-black text-amber-600 mb-1">SMTP</div>
              <div className="text-xs font-bold text-slate-800">Email System</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Automated interview notifications</p>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">PLACIO</span>
            <span>&bull;</span>
            <span>Centralized Campus Placement & Training Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Department of Computer Science & Engineering</span>
            {/* Discreet Admin Diagnostics shortcut */}
            <Link
              to="/admin/diagnostics"
              className="text-slate-400 hover:text-slate-600 font-mono text-[11px] flex items-center gap-1 transition-colors"
              title="Restricted Admin Diagnostics"
            >
              <Terminal className="h-3 w-3" />
              v1.0
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
