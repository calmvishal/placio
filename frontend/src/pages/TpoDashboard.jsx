import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import {
  GraduationCap,
  LogOut,
  ShieldCheck,
  Building2,
  Users,
  FileCheck2,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
  RefreshCw,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sliders
} from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

const STATUS_COLORS = {
  'Selected': '#10b981',           // Emerald
  'Shortlisted': '#6366f1',        // Indigo
  'Interview Scheduled': '#8b5cf6',// Purple
  'Assessment': '#3b82f6',         // Blue
  'Under Review': '#f59e0b',       // Amber
  'Applied': '#06b6d4',            // Cyan
  'Rejected': '#ef4444',           // Rose
  'Withdrawn': '#64748b'           // Slate
};

export default function TpoDashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchOverview = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      setError(null);
      const res = await apiClient.get('/analytics/overview');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load placement analytics:', err);
      setError('Could not fetch placement analytics. Please try again.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Format data for Recharts Pie Chart
  const pieData = data?.status_distribution
    ? Object.entries(data.status_distribution)
        .filter(([_, count]) => count > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Universal Role-Aware Navbar */}
      <Navbar />

      {/* Main TPO Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md mb-8 overflow-hidden">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Placement Cell Executive Dashboard
              </h1>
              <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                Centralized recruitment intelligence, deterministic eligibility tracking, Recharts visual funnel telemetry, and automated candidate progression.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => fetchOverview(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
              </button>
              <Link
                to="/tpo/students"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/20 transition-all"
              >
                <Users className="h-3.5 w-3.5" />
                Students Roster
              </Link>
              {user?.role === 'tpo_admin' && (
                <Link
                  to="/tpo/staff"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-600/70 hover:bg-purple-600 text-white backdrop-blur border border-purple-400/40 transition-all shadow-sm"
                  title="Super Admin: Manage TPO Staff, Designations & Permissions"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-200" />
                  Staff & Access
                </Link>
              )}
              <Link
                to="/tpo/profile"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/20 transition-all"
                title="TPO Account, Profile & Email System Settings"
              >
                <Sliders className="h-3.5 w-3.5 text-indigo-200" />
                Settings & Email
              </Link>
              <Link
                to="/tpo/jobs"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
              >
                + Post Drive
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchOverview(true)}
              className="font-bold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Executive Metric Cards (6 Clickable KPI Tiles) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8">
          {/* Tile 1: Registered Students */}
          <Link
            to="/tpo/students"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all group cursor-pointer block"
            title="Click to view and manage students directory"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Students</span>
              <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : (data?.total_students ?? 0)}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[11px] text-slate-500">Registered candidates</p>
              <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-indigo-600 transition-colors" />
            </div>
          </Link>

          {/* Tile 2: Active Drives */}
          <Link
            to="/tpo/jobs"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all group cursor-pointer block"
            title="Click to view and manage placement drives"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Active Drives</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : (data?.active_jobs ?? 0)}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[11px] text-slate-500">of {data?.total_jobs ?? 0} total drives</p>
              <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-emerald-600 transition-colors" />
            </div>
          </Link>

          {/* Tile 3: Total Applications */}
          <Link
            to="/tpo/applicants"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group cursor-pointer block"
            title="Click to review drive applicants"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-amber-600 transition-colors">Applications</span>
              <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center">
                <FileCheck2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : (data?.total_applications ?? 0)}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[11px] text-slate-500">Drive submissions</p>
              <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-amber-600 transition-colors" />
            </div>
          </Link>

          {/* Tile 4: Placement Rate */}
          <Link
            to="/tpo/students?placement_status=placed"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all group cursor-pointer block"
            title="Click to view placed students"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Placement Rate</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 tracking-tight">
              {loading ? '...' : `${data?.placement_rate_percent ?? 0}%`}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[11px] text-slate-500">{data?.total_placed ?? 0} distinct placed</p>
              <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-emerald-600 transition-colors" />
            </div>
          </Link>

          {/* Tile 5: Highest CTC */}
          <Link
            to="/tpo/jobs"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-purple-400 hover:shadow-md transition-all group cursor-pointer block"
            title="Click to view high package opportunities"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-purple-600 transition-colors">Top Package</span>
              <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors flex items-center justify-center">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-700 tracking-tight">
              {loading ? '...' : data?.highest_ctc_lpa ? `₹${data.highest_ctc_lpa}L` : '₹0L'}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[11px] text-slate-500">Avg: ₹{data?.average_ctc_lpa ?? 0} LPA</p>
              <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-purple-600 transition-colors" />
            </div>
          </Link>

          {/* Tile 6: Interviews Conducted */}
          <Link
            to="/tpo/interviews"
            className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all group cursor-pointer block"
            title="Click to view scheduled interview sessions"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Interviews</span>
              <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : (data?.total_interviews ?? 0)}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[11px] text-slate-500">Rounds scheduled</p>
              <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-indigo-600 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Visual Charts Grid with Recharts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Chart 1: Department Placement Performance (BarChart) - Takes 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  Branch-wise Registered vs. Placed Students
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Academic cohort distribution across engineering departments
                </p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                Departmental Performance
              </span>
            </div>

            <div className="h-68 w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Loading departmental statistics...
                </div>
              ) : data?.department_stats?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.department_stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val, name) => [val, name === 'total_students' ? 'Total Registered' : 'Candidates Placed']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={(val) => val === 'total_students' ? 'Registered' : 'Placed'} />
                    <Bar dataKey="total_students" name="total_students" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="placed_students" name="placed_students" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400">
                  <BarChart3 className="h-8 w-8 text-slate-300 mb-2" />
                  <span>No student departmental data recorded yet</span>
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Application Pipeline Distribution (Donut PieChart) - Takes 1 col */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-emerald-600" />
                  Application Stage Ratio
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live status across all drive submissions
                </p>
              </div>
            </div>

            <div className="h-68 w-full flex flex-col items-center justify-center">
              {loading ? (
                <div className="text-xs text-slate-400">Loading stage breakdown...</div>
              ) : pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.name] || '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(val, name) => [`${val} Candidates`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} layout="horizontal" align="center" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400">
                  <PieIcon className="h-8 w-8 text-slate-300 mb-2" />
                  <span>No application submissions to display</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Funnel Pipeline & Top Recruiters Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Funnel Conversion Progression (AreaChart) - Takes 2 cols */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-600" />
                  Recruitment Conversion Funnel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Progression drop-off from Application to Final Selection
                </p>
              </div>
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                Pipeline Funnel
              </span>
            </div>

            <div className="h-60 w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Loading funnel telemetry...
                </div>
              ) : data?.funnel?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.funnel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(val, name, item) => [`${val} (${item.payload.percentage}%)`, 'Candidates']}
                    />
                    <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400">
                  <Layers className="h-8 w-8 text-slate-300 mb-2" />
                  <span>No funnel data available yet</span>
                </div>
              )}
            </div>
          </div>

          {/* Top Recruiting Companies Leaderboard - Takes 1 col */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Top Recruiting Partners
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Offers Made</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Corporate recruiters engaging with students
              </p>

              <div className="space-y-2.5">
                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading partners...</div>
                ) : data?.top_recruiters?.length > 0 ? (
                  data.top_recruiters.map((recruiter, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-indigo-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {recruiter.company_name?.charAt(0) || 'C'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {recruiter.company_name}
                          </p>
                          <span className="text-[11px] text-slate-500">
                            {recruiter.applications_count} applicants &bull; {recruiter.drives_count} drive{recruiter.drives_count > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        {recruiter.offers_count} Selected
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No partner offers recorded yet.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <Link
                to="/tpo/applicants"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
              >
                View all candidates in pipeline &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Administration Quick Action Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/tpo/jobs"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex items-start gap-3.5 group"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                <span>Placement Drives</span>
                <span className="text-xs">&rarr;</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Post drives, configure branch & CGPA rules, close/reopen opportunities.
              </p>
            </div>
          </Link>

          <Link
            to="/tpo/applicants"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex items-start gap-3.5 group"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                <span>Review Applicants</span>
                <span className="text-xs">&rarr;</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Filter candidates, export to Excel (.xlsx), transition pipeline stages.
              </p>
            </div>
          </Link>

          <Link
            to="/tpo/interviews"
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex items-start gap-3.5 group"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                <span>Manage Interviews</span>
                <span className="text-xs">&rarr;</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Schedule video/campus rounds, record evaluation outcomes & send notifications.
              </p>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        AI-Assisted Placement & Training Portal &bull; TPO Administrator Session Active
      </footer>
    </div>
  );
}
